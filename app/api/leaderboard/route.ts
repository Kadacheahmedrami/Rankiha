import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/prisma/prismaClient';
import { encrypt } from '@/lib/encryption';
import { z } from 'zod';
import { securityMiddleware } from '@/lib/security';

// Constants for pagination (could also be moved to a config file)
const DEFAULT_PAGE_SIZE = 20;

const SCHOOL_DOMAINS = {
  ESTIN: '@estin.dz',
  ESI: '@esi.dz',
  ESISBA: '@esisba.dz',
  POLYTECH: '@polytech.dz'
};

// Input validation schemas
const ratingSchema = z.object({
  ratedUserId: z.string().uuid(),
  value: z.number().int().min(1).max(5)
});

const batchRatingSchema = z.object({
  ratings: z.array(ratingSchema).max(20)
});

const queryParamsSchema = z.object({
  search: z.string().optional(),
  limit: z.number().int().min(1).max(30).optional(),
  page: z.number().int().min(1).optional(),
  // New parameters:
  school: z.enum(['All', 'ESTIN', 'ESI', 'ESISBA', 'POLYTECH']).optional(),
  timeRange: z.enum(['Today', 'All Time']).optional(),
});

/**
 * Helper: Calculate current rank for a given user using the provided sorted users array.
 * (Used in GET for building the leaderboard.)
 */
function getUserRank({ id, users }: { id: string; users: any[] }): number {
  const index = users.findIndex(u => u.id === id);
  return index !== -1 ? index + 1 : -1;
}

/**
 * GET: Fetch leaderboard data with pagination metadata.
 * Returns the leaderboard and the current user's global rank (encrypted).
 */
export async function GET(req: NextRequest) {
  try {
    // Fetch session and perform security check.
    const session = await getServerAuthSession();
    const secCheck = await securityMiddleware(req, session);
    if (secCheck) return secCheck;

    const searchParams = req.nextUrl.searchParams;

    // Parse query parameters using the extended schema.
    const {
      search = "",
      limit = DEFAULT_PAGE_SIZE,
      page = 1,
      school = "All",
      timeRange = "All Time",
    } = queryParamsSchema.parse({
      search: searchParams.get("search") || undefined,
      limit: searchParams.get("limit")
        ? parseInt(searchParams.get("limit") as string)
        : undefined,
      page: searchParams.get("page")
        ? parseInt(searchParams.get("page") as string)
        : undefined,
      school: searchParams.get("school") || undefined,
      timeRange: searchParams.get("timeRange") || undefined,
    });

    const skip = (page - 1) * limit;

    // Build dynamic SQL filters.
    const schoolFilter =
      school !== "All" ? ` AND u.email ILIKE '%${SCHOOL_DOMAINS[school]}%'` : "";

    // Use updatedAt for the timeRange filter
    const ratingJoinCondition =
      timeRange === "Today"
        ? ` AND r."updatedAt" >= CURRENT_DATE`
        : "";

    // Main query: fetch paginated users with filters.
    const usersQuery = `
      SELECT 
        u.tag, 
        u.id, 
        u.name, 
        u.email,
        COALESCE(AVG(r.value)::FLOAT, 0) as rating,
        COUNT(r.id) as "ratingsCount",
        u."createdAt"
      FROM "User" u
      LEFT JOIN "Rating" r ON u.id = r."ratedUserId" ${ratingJoinCondition}
      WHERE u.visible = true 
        AND (u.name ILIKE '%${search}%' OR u.email ILIKE '%${search}%')
        ${schoolFilter}
      GROUP BY u.id, u."createdAt"
      ORDER BY rating DESC, "ratingsCount" DESC, u."createdAt" ASC
      LIMIT ${limit} OFFSET ${skip}
    `;
    const users = (await prisma.$queryRawUnsafe(usersQuery)) as {
      tag: string;
      id: string;
      name: string;
      email: string;
      rating: number;
      ratingsCount: number;
      createdAt: string;
    }[];

    // Count query: get total number of users for pagination.
    const countQuery = `
      SELECT COUNT(*) as count
      FROM "User" u
      WHERE u.visible = true 
        AND (u.name ILIKE '%${search}%' OR u.email ILIKE '%${search}%')
        ${schoolFilter}
    `;
    const countResult = (await prisma.$queryRawUnsafe(countQuery)) as { count: string }[];
    const totalCount = parseInt(countResult[0].count);
    const totalPages = Math.ceil(totalCount / limit);

    // Build time condition for previous rankings using updatedAt.
    const previousTimeCondition =
      timeRange === "Today"
        ? `r."updatedAt" < CURRENT_DATE`
        : `r."updatedAt" < NOW() - INTERVAL '24 HOURS'`;

    // Query for previous rankings (used to calculate ranking changes).
    const previousRankingsQuery = `
      SELECT 
        u.id, 
        COALESCE(AVG(r.value)::FLOAT, 0) as rating,
        COUNT(r.id) as "ratingsCount"
      FROM "User" u
      LEFT JOIN "Rating" r ON u.id = r."ratedUserId"
      WHERE u.visible = true 
        AND ${previousTimeCondition}
        ${schoolFilter}
      GROUP BY u.id
      ORDER BY rating DESC, "ratingsCount" DESC
    `;
    const previousRankings = (await prisma.$queryRawUnsafe(previousRankingsQuery)) as {
      id: string;
      rating: number;
      ratingsCount: number;
    }[];

    // Build leaderboard array.
    const leaderboard = users.map(
      (user, index) => {
        const currentRank = skip + index + 1;
        // Find the user's previous rank based on the previousRankings array.
        const previousRank = previousRankings.findIndex((prev) => prev.id === user.id) + 1 || currentRank;
        let change: "up" | "down" | "same" = "same";
        if (previousRank < currentRank) change = "down";
        if (previousRank > currentRank) change = "up";

        return {
          id: encrypt(user.id ?? ""),
          name: encrypt(user.name ?? ""),
          username: encrypt(user.email ?? ""),
          tag: encrypt(user.tag ?? ""),
          rating: encrypt(parseFloat(user.rating.toFixed(2)).toString()),
          ratingsCount: encrypt(user.ratingsCount.toString()),
          rank: encrypt(currentRank.toString()),
          change,
        };
      }
    );

    // Compute current user's global rank.
    let currentUserRank = null;
    if (session?.user?.id) {
      const currentUserProfile = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, visible: true },
      });
      if (currentUserProfile && currentUserProfile.visible) {
        const currentUserDataQuery = `
          SELECT 
            COALESCE(AVG(r.value)::FLOAT, 0) as rating,
            COUNT(r.id) as "ratingsCount",
            u."createdAt"
          FROM "User" u
          LEFT JOIN "Rating" r ON u.id = r."ratedUserId" ${ratingJoinCondition}
          WHERE u.visible = true 
            AND u.id = '${session.user.id}'
            ${schoolFilter}
          GROUP BY u.id, u."createdAt"
        `;
        const currentUserData = (await prisma.$queryRawUnsafe(currentUserDataQuery)) as {
          rating: string;
          ratingsCount: string;
          createdAt: string;
        }[];

        if (currentUserData.length > 0) {
          const currentUserRating = parseFloat(currentUserData[0].rating);
          const currentUserRatingsCount = parseInt(currentUserData[0].ratingsCount);
          const currentUserCreatedAt = new Date(currentUserData[0].createdAt);

          const betterRankedUsersCountQuery = `
            SELECT COUNT(*) as count
            FROM "User" u
            LEFT JOIN (
              SELECT 
                "ratedUserId", 
                AVG(value) as avg_rating, 
                COUNT(*) as ratings_count
              FROM "Rating"
              ${
                timeRange === "Today"
                  ? `WHERE "updatedAt" >= CURRENT_DATE`
                  : ""
              }
              GROUP BY "ratedUserId"
            ) r ON u.id = r."ratedUserId"
            WHERE 
              u.visible = true 
              ${schoolFilter}
              AND (
                (COALESCE(r.avg_rating, 0) > ${currentUserRating})
                OR (COALESCE(r.avg_rating, 0) = ${currentUserRating} AND COALESCE(r.ratings_count, 0) > ${currentUserRatingsCount})
                OR (COALESCE(r.avg_rating, 0) = ${currentUserRating} AND COALESCE(r.ratings_count, 0) = ${currentUserRatingsCount} AND u."createdAt" < '${currentUserCreatedAt.toISOString()}')
              )
          `;
          const betterRankedUsersCount = (await prisma.$queryRawUnsafe(betterRankedUsersCountQuery)) as [{ count: string }];
          const rank = parseInt(betterRankedUsersCount[0].count) + 1;
          currentUserRank = encrypt(rank.toString());
        }
      }
    }

    const responseData = {
      data: leaderboard,
      pagination: { total: totalCount, page, limit, totalPages },
      currentUserRank,
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}


/**
 * POST: Create or update a rating.
 */
export async function POST(req: NextRequest) {
  try {
    // Fetch session and perform security check.
    const session = await getServerAuthSession();
    const secCheck = await securityMiddleware(req, session);
    if (secCheck) return secCheck;

    const currentUser = session?.user;
    const body = await req.json();
    const { ratedUserId, value } = body;

    // Validate rating payload.
    if (!ratedUserId || typeof value !== "number" || value < 1 || value > 5) {
      return NextResponse.json({ error: "Invalid rating data" }, { status: 400 });
    }
    if (currentUser?.id === ratedUserId) {
      return NextResponse.json({ error: "You cannot rate yourself" }, { status: 400 });
    }

    const ratedUser = await prisma.user.findUnique({
      where: { id: ratedUserId, visible: true }
    });
    if (!ratedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Upsert the rating.
    await prisma.rating.upsert({
      where: { userId_ratedUserId: { userId: currentUser!.id, ratedUserId } },
      update: { value },
      create: { userId: currentUser!.id, ratedUserId, value },
    });

    // Recalculate the aggregate rating.
    const userRatings = await prisma.rating.findMany({ where: { ratedUserId } });
    const ratingsCount = userRatings.length;
    const averageRating = ratingsCount > 0
      ? userRatings.reduce((sum, r) => sum + r.value, 0) / ratingsCount
      : 0;
    const averageRatingRounded = parseFloat(averageRating.toFixed(1));

    // Define filtering defaults for ranking recalculation.
    const school = "All"; // or extract from query/body if needed.
    const timeRange: "Today" | "All Time" = "All Time";

    const schoolFilter =
      school !== "All" ? ` AND u.email ILIKE '%${SCHOOL_DOMAINS[school]}%'` : "";
    // Use updatedAt for the timeRange filter:
    const ratingJoinCondition =
    (timeRange as "Today" | "All Time") === "Today"
      ? ` AND r."createdAt" >= CURRENT_DATE`
      : "";
  
    
    // Use dynamic SQL to fetch all users (with filters) to determine ranking.
    const usersForRankQuery = `
      SELECT 
        u.id,
        COALESCE(AVG(r.value)::FLOAT, 0) as rating,
        COUNT(r.id) as "ratingsCount",
        u."createdAt"
      FROM "User" u
      LEFT JOIN "Rating" r ON u.id = r."ratedUserId" ${ratingJoinCondition}
      WHERE u.visible = true
      ${schoolFilter}
      GROUP BY u.id, u."createdAt"
      ORDER BY rating DESC, "ratingsCount" DESC, u."createdAt" ASC
    `;
    const usersForRank = (await prisma.$queryRawUnsafe(usersForRankQuery)) as Array<{
      id: string;
    }>;

    const rank = getUserRank({ id: ratedUserId, users: usersForRank });

    return NextResponse.json({
      success: true,
      id: ratedUserId,
      rating: encrypt(averageRatingRounded.toString()),
      ratingsCount: encrypt(ratingsCount.toString()),
      rank: encrypt(rank.toString()),
    });
  } catch (error) {
    console.error("Error creating/updating rating:", error);
    return NextResponse.json({ error: "Failed to save rating" }, { status: 500 });
  }
}
