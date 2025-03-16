import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/app/lib/auth';
import { prisma } from '@/prisma/prismaClient';
import { BLACKLISTED_EMAILS } from "@/app/BLACKLIST/blacklist";
import { rateLimit } from "@/lib/rateLimit";
import { validateToken, generateCSRFToken } from "@/lib/csrf";
import { encrypt } from "@/lib/encryption";
import { z } from "zod";

// Constants for security settings and pagination
const DEFAULT_PAGE_SIZE = 20;
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 150;

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
  page: z.number().int().min(1).optional()
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
 * Security middleware: rate limiting, CSRF validation (for non-GET), authentication, and blacklist check.
 */
async function securityMiddleware(req: NextRequest): Promise<NextResponse | null> {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const rateResult = await rateLimit(ip, RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW);
  if (!rateResult.success) {
    return NextResponse.json({ error: "Too many requests, please try again later" }, { status: 429 });
  }
  
  if (req.method !== "GET") {
    const csrfToken = req.headers.get("x-csrf-token");
    if (!csrfToken || !(await validateToken(csrfToken))) {
      return NextResponse.json({ error: "Invalid request" }, { status: 403 });
    }
  }
  
  const session = await getServerAuthSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  
  if (session.user.email && BLACKLISTED_EMAILS.includes(session.user.email)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }
  
  return null;
}

/**
 * Helper: Set security headers (and attach a fresh CSRF token) on the response.
 */
async function setSecurityHeaders(response: NextResponse): Promise<NextResponse> {
  const csrfToken = await generateCSRFToken();
  response.headers.set("x-csrf-token", csrfToken);
  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Content-Security-Policy", "default-src 'self'");
  return response;
}

/**
 * GET: Fetch leaderboard data with pagination metadata.
 * Returns the leaderboard and the current user's global rank (encrypted).
 */
export async function GET(req: NextRequest) {
  try {
    const secCheck = await securityMiddleware(req);
    if (secCheck) return secCheck;
    
    const searchParams = req.nextUrl.searchParams;
    const { search = "", limit = DEFAULT_PAGE_SIZE, page = 1 } = queryParamsSchema.parse({
      search: searchParams.get("search") || undefined,
      limit: searchParams.get("limit") ? parseInt(searchParams.get("limit") as string) : undefined,
      page: searchParams.get("page") ? parseInt(searchParams.get("page") as string) : undefined,
    });
    const skip = (page - 1) * limit;
    
    // Fetch paginated users.
    const users = await prisma.$queryRaw<any[]>`
      SELECT 
        u.tag, 
        u.id, 
        u.name, 
        u.email,
        COALESCE(AVG(r.value)::FLOAT, 0) as rating,
        COUNT(r.id) as "ratingsCount",
        u."createdAt"
      FROM "User" u
      LEFT JOIN "Rating" r ON u.id = r."ratedUserId"
      WHERE u.visible = true AND (u.name ILIKE ${`%${search}%`} OR u.email ILIKE ${`%${search}%`})
      GROUP BY u.id, u."createdAt"
      ORDER BY rating DESC, "ratingsCount" DESC, u."createdAt" ASC
      LIMIT ${limit} OFFSET ${skip}
    `;
    
    const countResult = await prisma.$queryRaw<{ count: string }[]>`
      SELECT COUNT(*) as count
      FROM "User" u
      WHERE u.visible = true AND (u.name ILIKE ${`%${search}%`} OR u.email ILIKE ${`%${search}%`})
    `;
    const totalCount = parseInt(countResult[0].count);
    const totalPages = Math.ceil(totalCount / limit);
    
    // Fetch previous leaderboard data for change indicators.
    const previousRankings = await prisma.$queryRaw<any[]>`
      SELECT 
        u.id, 
        COALESCE(AVG(r.value)::FLOAT, 0) as rating,
        COUNT(r.id) as "ratingsCount"
      FROM "User" u
      LEFT JOIN "Rating" r ON u.id = r."ratedUserId"
      WHERE u.visible = true AND r."createdAt" < NOW() - INTERVAL '24 HOURS'
      GROUP BY u.id
      ORDER BY rating DESC, "ratingsCount" DESC
    `;
    const prevRankingsMap = new Map<string, number>();
    previousRankings.forEach((user, index) => {
      prevRankingsMap.set(user.id, index + 1);
    });
    
    // Build leaderboard response.
    const leaderboard = users.map((user, index) => {
      const currentRank = skip + index + 1;
      const previousRank = prevRankingsMap.get(user.id) || currentRank;
      let change: "up" | "down" | "same" = "same";
      if (previousRank < currentRank) change = "down";
      if (previousRank > currentRank) change = "up";
      
      return {
        id: encrypt(user.id), // Raw user ID is returned.
        name: encrypt(user.name),
        username: encrypt(user.email),
        tag: encrypt(user.tag),
        rating: encrypt(parseFloat(user.rating.toFixed(2)).toString()),
        ratingsCount: encrypt(user.ratingsCount.toString()),
        rank: encrypt(currentRank.toString()),
        change,
      };
    });
    
    // Compute current user's global rank using a dedicated SQL query.
    let currentUserRank = null;
    const session = await getServerAuthSession();
    if (session?.user?.id) {
      const currentUserProfile = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, visible: true },
      });
      if (currentUserProfile && currentUserProfile.visible) {
        // Fetch current user's aggregated rating data.
        const currentUserData = await prisma.$queryRaw<any[]>`
          SELECT 
            COALESCE(AVG(r.value)::FLOAT, 0) as rating,
            COUNT(r.id) as "ratingsCount",
            u."createdAt"
          FROM "User" u
          LEFT JOIN "Rating" r ON u.id = r."ratedUserId"
          WHERE u.visible = true AND u.id = ${session.user.id}
          GROUP BY u.id, u."createdAt"
        `;
        if (currentUserData.length > 0) {
          const currentUserRating = parseFloat(currentUserData[0].rating);
          const currentUserRatingsCount = parseInt(currentUserData[0].ratingsCount);
          const currentUserCreatedAt = new Date(currentUserData[0].createdAt);
          
          const betterRankedUsersCount = await prisma.$queryRaw<[{ count: string }]>`
            SELECT COUNT(*) as count
            FROM "User" u
            LEFT JOIN (
              SELECT 
                "ratedUserId", 
                AVG(value) as avg_rating, 
                COUNT(*) as ratings_count
              FROM "Rating"
              GROUP BY "ratedUserId"
            ) r ON u.id = r."ratedUserId"
            WHERE 
              u.visible = true 
              AND (
                (COALESCE(r.avg_rating, 0) > ${currentUserRating})
                OR (COALESCE(r.avg_rating, 0) = ${currentUserRating} AND COALESCE(r.ratings_count, 0) > ${currentUserRatingsCount})
                OR (COALESCE(r.avg_rating, 0) = ${currentUserRating} AND COALESCE(r.ratings_count, 0) = ${currentUserRatingsCount} AND u."createdAt" < ${currentUserCreatedAt})
              )
          `;
          
          const rank = parseInt(betterRankedUsersCount[0].count) + 1;
          currentUserRank = encrypt(rank.toString());
        }
      }
    }
    
    const responseData = {
      data: leaderboard,
      pagination: { total: totalCount, page, limit, totalPages },
      currentUserRank, // Only the current user's global rank is returned.
    };
    
    const response = NextResponse.json(responseData);
    return setSecurityHeaders(response);
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
  }
}

/**
 * POST: Create or update a rating.
 */
export async function POST(req: NextRequest) {
  try {
    const secCheck = await securityMiddleware(req);
    if (secCheck) return secCheck;
    
    const session = await getServerAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    
    const currentUser = session.user;
    const body = await req.json();
    const { ratedUserId, value } = body;
    
    if (!ratedUserId || typeof value !== 'number' || value < 1 || value > 5) {
      return NextResponse.json({ error: "Invalid rating data" }, { status: 400 });
    }
    
    if (currentUser.id === ratedUserId) {
      return NextResponse.json({ error: "You cannot rate yourself" }, { status: 400 });
    }
    
    const ratedUser = await prisma.user.findUnique({ where: { id: ratedUserId, visible: true } });
    if (!ratedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    await prisma.rating.upsert({
      where: { userId_ratedUserId: { userId: currentUser.id, ratedUserId } },
      update: { value },
      create: { userId: currentUser.id, ratedUserId, value },
    });
    
    const userRatings = await prisma.rating.findMany({ where: { ratedUserId } });
    const ratingsCount = userRatings.length;
    const averageRating = ratingsCount > 0 
      ? userRatings.reduce((sum, r) => sum + r.value, 0) / ratingsCount 
      : 0;
    const averageRatingRounded = parseFloat(averageRating.toFixed(1));
    const rank = getUserRank({ id: ratedUserId, users: await prisma.$queryRaw`
      SELECT 
        u.id,
        COALESCE(AVG(r.value)::FLOAT, 0) as rating,
        COUNT(r.id) as "ratingsCount",
        u."createdAt"
      FROM "User" u
      LEFT JOIN "Rating" r ON u.id = r."ratedUserId"
      WHERE u.visible = true
      GROUP BY u.id, u."createdAt"
      ORDER BY rating DESC, "ratingsCount" DESC, u."createdAt" ASC
    ` });
    
    const response = NextResponse.json({
      success: true,
      id: ratedUserId,
      rating: encrypt(averageRatingRounded.toString()),
      ratingsCount: encrypt(ratingsCount.toString()),
      rank: encrypt(rank.toString())
    });
    
    return setSecurityHeaders(response);
  } catch (error) {
    console.error("Error creating/updating rating:", error);
    return NextResponse.json({ error: "Failed to save rating" }, { status: 500 });
  }
}

/**
 * PATCH: Batch update multiple ratings in a transaction.
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const secCheck = await securityMiddleware(req);
    if (secCheck) return secCheck;
    
    const currentUser = session.user;
    // Validate and parse the request body using Zod's batchRatingSchema.
    const { ratings } = batchRatingSchema.parse(await req.json());
    
    // Check for self-rating.
    if (ratings.some(r => r.ratedUserId === currentUser.id)) {
      return NextResponse.json({ error: "Invalid rating data or self-rating detected" }, { status: 400 });
    }
    
    // Update ratings in a transaction.
    await prisma.$transaction(
      ratings.map(r => 
        prisma.rating.upsert({
          where: { userId_ratedUserId: { userId: currentUser.id, ratedUserId: r.ratedUserId } },
          update: { value: r.value },
          create: { userId: currentUser.id, ratedUserId: r.ratedUserId, value: r.value },
        })
      )
    );
    
    const updates = await Promise.all(
      [...new Set(ratings.map(r => r.ratedUserId))].map(async (userId) => {
        const userRatings = await prisma.rating.findMany({ where: { ratedUserId: userId } });
        const ratingsCount = userRatings.length;
        const averageRating = ratingsCount > 0 
          ? userRatings.reduce((sum, r) => sum + r.value, 0) / ratingsCount 
          : 0;
        const averageRatingRounded = parseFloat(averageRating.toFixed(1));
        
        const rank = getUserRank({ id: userId, users: await prisma.$queryRaw`
          SELECT 
            u.id,
            COALESCE(AVG(r.value)::FLOAT, 0) as rating,
            COUNT(r.id) as "ratingsCount",
            u."createdAt"
          FROM "User" u
          LEFT JOIN "Rating" r ON u.id = r."ratedUserId"
          WHERE u.visible = true
          GROUP BY u.id, u."createdAt"
          ORDER BY rating DESC, "ratingsCount" DESC, u."createdAt" ASC
        ` });
        
        return {
          id: userId,
          rating: encrypt(averageRatingRounded.toString()),
          ratingsCount: encrypt(ratingsCount.toString()),
          rank: encrypt(rank.toString()),
        };
      })
    );
    
    const response = NextResponse.json({
      success: true,
      updates,
    });
    
    return setSecurityHeaders(response);
  } catch (error) {
    console.error("Error updating multiple ratings:", error);
    return NextResponse.json({ error: "Failed to update ratings" }, { status: 500 });
  }
}
