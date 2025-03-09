// File: app/api/leaderboard/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Pusher from 'pusher';
import { getServerAuthSession } from '@/app/lib/auth';
import { prisma } from '@/prisma/prismaClient';

// Initialize Pusher
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID || '',
  key: process.env.PUSHER_KEY || '',
  secret: process.env.PUSHER_SECRET || '',
  cluster: process.env.PUSHER_CLUSTER || 'eu',
  useTLS: true
});

// Define a type for the raw rank query result
type RankResult = { higherCount: string }[];

// Helper: Calculate current rank for a given average rating and ratings count
async function getUserRank(averageRating: number, ratingsCount: number): Promise<number> {
  const rankResult = await prisma.$queryRaw<RankResult>`
    SELECT COUNT(*) as "higherCount"
    FROM (
      SELECT 
        u.id,
        COALESCE(AVG(r.value)::FLOAT, 0) as rating,
        COUNT(r.id) as "ratingsCount"
      FROM "User" u
      LEFT JOIN "Rating" r ON u.id = r."ratedUserId"
      GROUP BY u.id
    ) as leaderboard
    WHERE leaderboard.rating > ${averageRating}
      OR (leaderboard.rating = ${averageRating} AND leaderboard."ratingsCount" > ${ratingsCount})
  `;
  // Convert the count (returned as string) to a number, then add 1 for the rank
  return parseInt(rankResult[0].higherCount) + 1;
}

// GET: Fetch leaderboard data
export async function GET(req: NextRequest) {
  try {
    // Get query parameters for filtering
    const searchParams = req.nextUrl.searchParams;
    const searchTerm = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    // Fetch users with their average rating
    const users = await prisma.$queryRaw<any[]>`
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.image,
        COALESCE(AVG(r.value)::FLOAT, 0) as rating,
        COUNT(r.id) as "ratingsCount",
        u."createdAt"
      FROM "User" u
      LEFT JOIN "Rating" r ON u.id = r."ratedUserId"
      WHERE 
        u.name ILIKE ${`%${searchTerm}%`} OR 
        u.email ILIKE ${`%${searchTerm}%`}
      GROUP BY u.id
      ORDER BY rating DESC, "ratingsCount" DESC
      LIMIT ${limit} OFFSET ${skip}
    `;

    // Get the previous leaderboard (cached or from DB) to calculate changes
    const previousRankings = await prisma.$queryRaw<any[]>`
      SELECT 
        u.id, 
        COALESCE(AVG(r.value)::FLOAT, 0) as rating,
        COUNT(r.id) as "ratingsCount"
      FROM "User" u
      LEFT JOIN "Rating" r ON u.id = r."ratedUserId"
      WHERE r."createdAt" < NOW() - INTERVAL '24 HOURS'
      GROUP BY u.id
      ORDER BY rating DESC, "ratingsCount" DESC
    `;

    // Map previous rankings to a lookup object
    const prevRankingsMap = new Map<string, number>();
    previousRankings.forEach((user, index) => {
      prevRankingsMap.set(user.id, index + 1);
    });

    // Format the response with change indicators and current rank for this page
    const leaderboard = users.map((user, index) => {
      const currentRank = index + 1;
      const previousRank = prevRankingsMap.get(user.id) || currentRank;
      
      let change: "up" | "down" | "same" = "same";
      if (previousRank < currentRank) change = "down";
      if (previousRank > currentRank) change = "up";

      return {
        id: user.id,
        name: user.name,
        username: user.email.split('@')[0],
        rating: parseFloat(user.rating.toFixed(1)),
        ratings: parseInt(user.ratingsCount),
        change,
        image: user.image,
        rank: currentRank
      };
    });

    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
  }
}

// POST: Create or update a rating
export async function POST(req: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const currentUser = session.user; // Now safely assigned

    const body = await req.json();
    const { ratedUserId, value } = body;
    
    if (!ratedUserId || typeof value !== 'number' || value < 1 || value > 5) {
      return NextResponse.json({ error: "Invalid rating data" }, { status: 400 });
    }
    
    // Prevent users from rating themselves
    if (currentUser.id === ratedUserId) {
      return NextResponse.json({ error: "You cannot rate yourself" }, { status: 400 });
    }
    
    // Create or update rating using upsert
    const rating = await prisma.rating.upsert({
      where: {
        userId_ratedUserId: {
          userId: currentUser.id,
          ratedUserId
        }
      },
      update: { value },
      create: {
        userId: currentUser.id,
        ratedUserId,
        value
      }
    });
    
    // Calculate new average rating for the rated user
    const userRatings = await prisma.rating.findMany({
      where: { ratedUserId }
    });
    
    const totalRating = userRatings.reduce((sum, r) => sum + r.value, 0);
    const averageRating = totalRating / userRatings.length;
    const averageRatingRounded = parseFloat(averageRating.toFixed(1));
    
    // Compute current rank for the rated user
    const rank = await getUserRank(averageRating, userRatings.length);
    
    // Trigger Pusher event for real-time updates
    await pusher.trigger('leaderboard', 'rating-updated', {
      userId: ratedUserId,
      averageRating: averageRatingRounded,
      ratingsCount: userRatings.length,
      rank
    });
    
    return NextResponse.json({ 
      success: true, 
      rating,
      averageRating: averageRatingRounded,
      ratingsCount: userRatings.length,
      rank
    });
  } catch (error) {
    console.error("Error creating/updating rating:", error);
    return NextResponse.json({ error: "Failed to save rating" }, { status: 500 });
  }
}

// PATCH: Update multiple ratings in a transaction (batch update)
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const currentUser = session.user;

    const body = await req.json();
    const { ratings } = body;
    
    if (!Array.isArray(ratings) || ratings.length === 0) {
      return NextResponse.json({ error: "Invalid ratings data" }, { status: 400 });
    }
    
    // Validate all ratings
    for (const rating of ratings) {
      if (
        !rating.ratedUserId ||
        typeof rating.value !== 'number' ||
        rating.value < 1 ||
        rating.value > 5 ||
        rating.ratedUserId === currentUser.id
      ) {
        return NextResponse.json({ 
          error: "Invalid rating data or attempt to rate yourself" 
        }, { status: 400 });
      }
    }
    
    // Use a transaction to update all ratings
    const updatedRatings = await prisma.$transaction(async (tx) => {
      const results = [];
      
      for (const rating of ratings) {
        const result = await tx.rating.upsert({
          where: {
            userId_ratedUserId: {
              userId: currentUser.id,
              ratedUserId: rating.ratedUserId
            }
          },
          update: { value: rating.value },
          create: {
            userId: currentUser.id,
            ratedUserId: rating.ratedUserId,
            value: rating.value
          }
        });
        results.push(result);
      }
      
      return results;
    });
    
    // Calculate and broadcast updates for each affected user
    const affectedUserIds = [...new Set(ratings.map(r => r.ratedUserId))];
    
    const updates = await Promise.all(
      affectedUserIds.map(async (userId) => {
        const userRatings = await prisma.rating.findMany({
          where: { ratedUserId: userId }
        });
        
        const totalRating = userRatings.reduce((sum, r) => sum + r.value, 0);
        const averageRating = userRatings.length > 0 ? totalRating / userRatings.length : 0;
        const averageRatingRounded = parseFloat(averageRating.toFixed(1));
        const rank = await getUserRank(averageRating, userRatings.length);
        
        // Trigger Pusher event for each updated user
        await pusher.trigger('leaderboard', 'rating-updated', {
          userId,
          averageRating: averageRatingRounded,
          ratingsCount: userRatings.length,
          rank
        });
        
        return {
          userId,
          averageRating: averageRatingRounded,
          ratingsCount: userRatings.length,
          rank
        };
      })
    );
    
    return NextResponse.json({ 
      success: true, 
      updatedRatings,
      updates
    });
  } catch (error) {
    console.error("Error updating multiple ratings:", error);
    return NextResponse.json({ error: "Failed to update ratings" }, { status: 500 });
  }
}
