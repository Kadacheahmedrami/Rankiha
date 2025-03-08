// File: app/api/leaderboard/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import Pusher from 'pusher';
import { getServerAuthSession } from '@/app/lib/auth';

const prisma = new PrismaClient();

// Initialize Pusher
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID || '',
  key: process.env.PUSHER_KEY || '',
  secret: process.env.PUSHER_SECRET || '',
  cluster: process.env.PUSHER_CLUSTER || 'eu',
  useTLS: true
});

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
    const users = await prisma.$queryRaw`
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.image,
        COALESCE(AVG(r.value)::FLOAT, 0) as rating,
        COUNT(r.id) as ratingsCount,
        u."createdAt"
      FROM "User" u
      LEFT JOIN "Rating" r ON u.id = r."ratedUserId"
      WHERE 
        u.name ILIKE ${`%${searchTerm}%`} OR 
        u.email ILIKE ${`%${searchTerm}%`}
      GROUP BY u.id
      ORDER BY rating DESC, ratingsCount DESC
      LIMIT ${limit} OFFSET ${skip}
    `;

    // Get the previous leaderboard (cached or from DB) to calculate changes
    // This would be more sophisticated in a real app
    const previousRankings = await prisma.$queryRaw`
      SELECT 
        u.id, 
        COALESCE(AVG(r.value)::FLOAT, 0) as rating,
        COUNT(r.id) as ratingsCount
      FROM "User" u
      LEFT JOIN "Rating" r ON u.id = r."ratedUserId"
      WHERE r."createdAt" < NOW() - INTERVAL '24 HOURS'
      GROUP BY u.id
      ORDER BY rating DESC, ratingsCount DESC
    `;

    // Map previous rankings to a lookup object
    const prevRankingsMap = new Map();
    (previousRankings as any[]).forEach((user, index) => {
      prevRankingsMap.set(user.id, index + 1);
    });

    // Format the response with change indicators
    const leaderboard = (users as any[]).map((user, index) => {
      const currentRank = index + 1;
      const previousRank = prevRankingsMap.get(user.id) || currentRank;
      
      let change = "same";
      if (previousRank < currentRank) change = "down";
      if (previousRank > currentRank) change = "up";

      return {
        id: user.id,
        name: user.name,
        username: user.email.split('@')[0], // Simplified username derivation
        rating: parseFloat(user.rating.toFixed(1)),
        ratings: parseInt(user.ratingsCount),
        change,
        image: user.image
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
    
    const body = await req.json();
    const { ratedUserId, value } = body;
    
    if (!ratedUserId || typeof value !== 'number' || value < 1 || value > 5) {
      return NextResponse.json({ error: "Invalid rating data" }, { status: 400 });
    }
    
    // Prevent users from rating themselves
    if (session.user.id === ratedUserId) {
      return NextResponse.json({ error: "You cannot rate yourself" }, { status: 400 });
    }
    
    // Create or update rating using upsert
    const rating = await prisma.rating.upsert({
      where: {
        userId_ratedUserId: {
          userId: session.user!.id,
          ratedUserId
        }
      },
      update: {
        value
      },
      create: {
        userId: session.user.id,
        ratedUserId,
        value
      }
    });
    
    // Calculate new average rating for the user
    const userRatings = await prisma.rating.findMany({
      where: {
        ratedUserId
      }
    });
    
    const totalRating = userRatings.reduce((sum, r) => sum + r.value, 0);
    const averageRating = totalRating / userRatings.length;
    
    // Trigger Pusher event for real-time updates
    await pusher.trigger('leaderboard', 'rating-updated', {
      userId: ratedUserId,
      averageRating,
      ratingsCount: userRatings.length
    });
    
    return NextResponse.json({ 
      success: true, 
      rating,
      averageRating,
      ratingsCount: userRatings.length
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
    
    const body = await req.json();
    const { ratings } = body;
    
    if (!Array.isArray(ratings) || ratings.length === 0) {
      return NextResponse.json({ error: "Invalid ratings data" }, { status: 400 });
    }
    
    // Validate all ratings
    for (const rating of ratings) {
      if (!rating.ratedUserId || typeof rating.value !== 'number' || 
          rating.value < 1 || rating.value > 5 || 
          rating.ratedUserId === session.user.id) {
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
              userId: session.user!.id,
              ratedUserId: rating.ratedUserId
            }
          },
          update: {
            value: rating.value
          },
          create: {
            userId: session.user!.id,
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
        
        // Trigger Pusher event for each updated user
        await pusher.trigger('leaderboard', 'rating-updated', {
          userId,
          averageRating,
          ratingsCount: userRatings.length
        });
        
        return {
          userId,
          averageRating,
          ratingsCount: userRatings.length
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