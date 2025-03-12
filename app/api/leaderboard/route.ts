import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/app/lib/auth';
import { prisma } from '@/prisma/prismaClient';
import { BLACKLISTED_EMAILS } from "@/app/BLACKLIST/blacklist";
import { rateLimit } from "@/lib/rateLimit";
import { validateToken, generateCSRFToken } from "@/lib/csrf";
import { z } from "zod";
import { encrypt, decrypt } from "@/lib/encryption";
import { logger } from "@/lib/logger";
import { hashId } from "@/lib/idHasher";

// Constants for security settings and pagination
const DEFAULT_PAGE_SIZE = 20;
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30;

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
  limit: z.number().int().min(1).max(50).optional(),
  page: z.number().int().min(1).optional()
});

// Define a type for the raw rank query result
type RankResult = { higherCount: string }[];

/**
 * Helper: Calculate current rank for a given average rating and ratings count among visible users.
 */
async function getUserRank(
  averageRating: number,
  ratingsCount: number
): Promise<number> {
  const rankResult = await prisma.$queryRaw<RankResult>`
    SELECT COUNT(*) as "higherCount"
    FROM (
      SELECT 
        u.id,
        COALESCE(AVG(r.value)::FLOAT, 0) as rating,
        COUNT(r.id) as "ratingsCount"
      FROM "User" u
      LEFT JOIN "Rating" r ON u.id = r."ratedUserId"
      WHERE u.visible = true
      GROUP BY u.id
    ) as leaderboard
    WHERE leaderboard.rating > ${averageRating}
      OR (leaderboard.rating = ${averageRating} AND leaderboard."ratingsCount" > ${ratingsCount})
  `;
  return parseInt(rankResult[0].higherCount) + 1;
}

/**
 * Simple security middleware: rate limiting, CSRF validation (for non-GET), authentication, and blacklist check.
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
      logger.warn("Invalid CSRF token", { ip });
      return NextResponse.json({ error: "Invalid request" }, { status: 403 });
    }
  }
  const session = await getServerAuthSession();
 
  if (!session?.user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  if (session.user.email && BLACKLISTED_EMAILS.includes(session.user.email)) {
    logger.warn("Blacklisted email attempted access", { email: session.user.email });
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
 */
export async function GET(req: NextRequest) {
  try {
    // Run security middleware.
    const secCheck = await securityMiddleware(req);
    if (secCheck) return secCheck;
    
    const searchParams = req.nextUrl.searchParams;
    const searchTerm = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;
    
    // Fetch paginated users with their average rating.
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
      WHERE 
        u.visible = true AND
        (u.name ILIKE ${`%${searchTerm}%`} OR u.email ILIKE ${`%${searchTerm}%`})
      GROUP BY u.id
      ORDER BY rating DESC, "ratingsCount" DESC, u."createdAt" ASC
      LIMIT ${limit} OFFSET ${skip}
    `;
    
    const countResult = await prisma.$queryRaw<{ count: string }[]>`
      SELECT COUNT(*) as count
      FROM "User" u
      WHERE u.visible = true AND (u.name ILIKE ${`%${searchTerm}%`} OR u.email ILIKE ${`%${searchTerm}%`})
    `;
    const totalCount = parseInt(countResult[0].count);
    const totalPages = Math.ceil(totalCount / limit);
    
    // Get previous leaderboard for change indicators.
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
    
    const leaderboard = users.map((user, index) => {
      const currentRank = skip + index + 1;
      const previousRank = prevRankingsMap.get(user.id) || currentRank;
      let change: "up" | "down" | "same" = "same";
      if (previousRank < currentRank) change = "down";
      if (previousRank > currentRank) change = "up";
      return {
        id: user.id,
        name: user.name,
        username: user.email,
        tag : user.tag,
        rating: parseFloat(user.rating.toFixed(2)),
        ratings: parseInt(user.ratingsCount),
        change,
        rank: currentRank,
      };
    });
    
    // Compute current user's data if authenticated and visible.
    const session = await getServerAuthSession();
    let currentUserData = null;
    if (session?.user?.id) {
      const currentUserProfile = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, name: true, email: true, image: true, visible: true },
      });
      if (currentUserProfile && currentUserProfile.visible) {
        const currentUserRatings = await prisma.rating.findMany({
          where: { ratedUserId: session.user.id },
        });
        const totalRating = currentUserRatings.reduce((sum, r) => sum + r.value, 0);
        const ratingsCount = currentUserRatings.length;
        const averageRating = ratingsCount > 0 ? totalRating / ratingsCount : 0;
        const averageRatingRounded = parseFloat(averageRating.toFixed(1));
        const rank = await getUserRank(averageRating, ratingsCount);
        currentUserData = {
          id: currentUserProfile.id,
          name: currentUserProfile.name,
          username: currentUserProfile.email,
          rating: averageRatingRounded,
          ratings: ratingsCount,
          rank,
        };
      }
    }
    
    const responseData = {
      data: leaderboard,
      pagination: { total: totalCount, page, limit, totalPages },
      currentUser: currentUserData,
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.email && BLACKLISTED_EMAILS.includes(session.user.email)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
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
    
    const rating = await prisma.rating.upsert({
      where: {
        userId_ratedUserId: { userId: currentUser.id, ratedUserId },
      },
      update: { value },
      create: { userId: currentUser.id, ratedUserId, value },
    });
    
    const userRatings = await prisma.rating.findMany({ where: { ratedUserId } });
    const totalRating = userRatings.reduce((sum, r) => sum + r.value, 0);
    const averageRating = totalRating / userRatings.length;
    const averageRatingRounded = parseFloat(averageRating.toFixed(1));
    const rank = await getUserRank(averageRating, userRatings.length);
    
    const response = NextResponse.json({ 
      success: true, 
      rating,
      averageRating: averageRatingRounded,
      ratingsCount: userRatings.length,
      rank,
    });
    return setSecurityHeaders(response);
  } catch (error) {
    console.error("Error creating/updating rating:", error);
    return NextResponse.json({ error: "Failed to save rating" }, { status: 500 });
  }
}

/**
 * PATCH: Batch update multiple ratings in a transaction (batch update).
 */
export async function PATCH(req: NextRequest) {
  try {
    const secCheck = await securityMiddleware(req);
    if (secCheck) return secCheck;
    
    const session = await getServerAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.email && BLACKLISTED_EMAILS.includes(session.user.email)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    const currentUser = session.user;
    const body = await req.json();
    const { ratings } = body;
    
    if (!Array.isArray(ratings) || ratings.length === 0) {
      return NextResponse.json({ error: "Invalid ratings data" }, { status: 400 });
    }
    for (const r of ratings) {
      if (!r.ratedUserId || typeof r.value !== 'number' || r.value < 1 || r.value > 5 || r.ratedUserId === currentUser.id) {
        return NextResponse.json({ error: "Invalid rating data or self-rating detected" }, { status: 400 });
      }
    }
    
    const updatedRatings = await prisma.$transaction(async (tx) => {
      const results = [];
      for (const r of ratings) {
        const result = await tx.rating.upsert({
          where: { userId_ratedUserId: { userId: currentUser.id, ratedUserId: r.ratedUserId } },
          update: { value: r.value },
          create: { userId: currentUser.id, ratedUserId: r.ratedUserId, value: r.value },
        });
        results.push(result);
      }
      return results;
    });
    
    const affectedUserIds = [...new Set(ratings.map(r => r.ratedUserId))];
    const updates = await Promise.all(
      affectedUserIds.map(async (userId) => {
        const userRatings = await prisma.rating.findMany({ where: { ratedUserId: userId } });
        const totalRating = userRatings.reduce((sum, r) => sum + r.value, 0);
        const averageRating = userRatings.length > 0 ? totalRating / userRatings.length : 0;
        const averageRatingRounded = parseFloat(averageRating.toFixed(1));
        const rank = await getUserRank(averageRating, userRatings.length);
        return {
          userId,
          averageRating: averageRatingRounded,
          ratingsCount: userRatings.length,
          rank,
        };
      })
    );
    
    const response = NextResponse.json({ 
      success: true, 
      updatedRatings,
      updates,
    });
    return setSecurityHeaders(response);
  } catch (error) {
    console.error("Error updating multiple ratings:", error);
    return NextResponse.json({ error: "Failed to update ratings" }, { status: 500 });
  }
}
