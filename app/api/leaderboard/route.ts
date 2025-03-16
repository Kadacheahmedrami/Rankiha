import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/app/lib/auth';
import { prisma } from '@/prisma/prismaClient';
import { Prisma } from '@prisma/client';
import { BLACKLISTED_EMAILS } from "@/app/BLACKLIST/blacklist";
import { rateLimit } from "@/lib/rateLimit";
import { validateToken, generateCSRFToken } from "@/lib/csrf";
import { encrypt } from "@/lib/encryption";
import { z } from "zod";
import NodeCache from 'node-cache';

// Constants for security settings and pagination
const DEFAULT_PAGE_SIZE = 20;
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 200;

// Cache configuration
const CACHE_TTL = 60; // Cache lifetime in seconds
const cache = new NodeCache({ stdTTL: CACHE_TTL, checkperiod: 120 });
const CACHE_KEYS = {
  LEADERBOARD: 'leaderboard',
  USER_RANKS: 'user_ranks',
  USER_RATING: (id: string) => `user_rating_${id}`
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
  page: z.number().int().min(1).optional()
});

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
 * Optimized getUserRank using a pre-computed rank map
 */
function getUserRank(id: string, rankMap: Map<string, number>): number {
  return rankMap.get(id) || -1;
}

/**
 * Helper: Generate cache key for leaderboard queries based on search params
 */
function getLeaderboardCacheKey(search: string, page: number, limit: number): string {
  return `${CACHE_KEYS.LEADERBOARD}_${search}_${page}_${limit}`;
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
    
    // Generate cache key for this specific leaderboard request
    const cacheKey = getLeaderboardCacheKey(search, page, limit);
    
    // Try to get from cache first
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      const response = NextResponse.json(cachedData);
      return setSecurityHeaders(response);
    }
    
    const skip = (page - 1) * limit;
    
    // Get session once and reuse
    const session = await getServerAuthSession();
    const currentUserId = session?.user?.id;
    
    // Use more targeted, optimized SQL query
    // Fetch paginated users with reduced data load
    const users = await prisma.$queryRaw<any[]>`
      SELECT 
        u.id, 
        u.name, 
        u.email,
        u.tag,
        COALESCE(r.avg_rating, 0) as rating,
        COALESCE(r.ratings_count, 0) as "ratingsCount",
        u."createdAt"
      FROM "User" u
      LEFT JOIN (
        SELECT 
          "ratedUserId", 
          AVG(value)::FLOAT as avg_rating, 
          COUNT(*) as ratings_count
        FROM "Rating"
        GROUP BY "ratedUserId"
      ) r ON u.id = r."ratedUserId"
      WHERE u.visible = true AND (u.name ILIKE ${`%${search}%`} OR u.email ILIKE ${`%${search}%`})
      ORDER BY rating DESC, "ratingsCount" DESC, u."createdAt" ASC
      LIMIT ${limit} OFFSET ${skip}
    `;
    
    // Use a specific count query that's more efficient
    const totalCount = await prisma.user.count({
      where: {
        visible: true,
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ]
      }
    });
    
    const totalPages = Math.ceil(totalCount / limit);
    
    // Get or build ranking map for performance
    let rankMap: Map<string, number>;
    const cachedRankMap = cache.get(CACHE_KEYS.USER_RANKS);
    
    if (cachedRankMap) {
      rankMap = cachedRankMap as Map<string, number>;
    } else {
      // Compute all user ranks in one go for efficient rank lookups
      const allUsersForRanking = await prisma.$queryRaw<{ id: string }[]>`
        SELECT 
          u.id
        FROM "User" u
        LEFT JOIN (
          SELECT 
            "ratedUserId", 
            AVG(value)::FLOAT as avg_rating, 
            COUNT(*) as ratings_count
          FROM "Rating"
          GROUP BY "ratedUserId"
        ) r ON u.id = r."ratedUserId"
        WHERE u.visible = true
        ORDER BY COALESCE(r.avg_rating, 0) DESC, COALESCE(r.ratings_count, 0) DESC, u."createdAt" ASC
      `;
      
      rankMap = new Map<string, number>();
      allUsersForRanking.forEach((user, index) => {
        rankMap.set(user.id, index + 1);
      });
      
      // Cache the rank map for future requests
      cache.set(CACHE_KEYS.USER_RANKS, rankMap, CACHE_TTL);
    }
    
    // Fetch previous day's rankings for change indicators
    let prevRankingsMap: Map<string, number>;
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    
    // Only compute this if we haven't already cached it
    const cachedPrevRankings = cache.get('prev_rankings');
    if (cachedPrevRankings) {
      prevRankingsMap = cachedPrevRankings as Map<string, number>;
    } else {
      const previousRankings = await prisma.$queryRaw<any[]>`
        WITH yesterday_ratings AS (
          SELECT 
            "ratedUserId",
            AVG(value)::FLOAT as avg_rating,
            COUNT(*) as ratings_count
          FROM "Rating"
          WHERE "createdAt" < ${yesterdayDate}
          GROUP BY "ratedUserId"
        )
        SELECT 
          u.id
        FROM "User" u
        LEFT JOIN yesterday_ratings yr ON u.id = yr."ratedUserId"
        WHERE u.visible = true
        ORDER BY COALESCE(yr.avg_rating, 0) DESC, COALESCE(yr.ratings_count, 0) DESC, u."createdAt" ASC
      `;
      
      prevRankingsMap = new Map<string, number>();
      previousRankings.forEach((user, index) => {
        prevRankingsMap.set(user.id, index + 1);
      });
      
      // Cache for 1 hour since this doesn't change frequently
      cache.set('prev_rankings', prevRankingsMap, 60 * 60);
    }
    
    // Build leaderboard response
    const leaderboard = users.map(user => {
      const currentRank = rankMap.get(user.id) || skip + 1;
      const previousRank = prevRankingsMap.get(user.id) || currentRank;
      let change: "up" | "down" | "same" = "same";
      if (previousRank < currentRank) change = "down";
      if (previousRank > currentRank) change = "up";
      
      return {
        id: encrypt(user.id),
        name: encrypt(user.name),
        username: encrypt(user.email),
        tag: encrypt(user.tag),
        rating: encrypt(parseFloat(user.rating.toFixed(2)).toString()),
        ratingsCount: encrypt(user.ratingsCount.toString()),
        rank: encrypt(currentRank.toString()),
        change,
      };
    });
    
    // Get current user rank efficiently using the precomputed map
    let currentUserRank = null;
    if (currentUserId) {
      const userRank = rankMap.get(currentUserId);
      if (userRank) {
        currentUserRank = encrypt(userRank.toString());
      }
    }
    
    const responseData = {
      data: leaderboard,
      pagination: { total: totalCount, page, limit, totalPages },
      currentUserRank,
    };
    
    // Cache the response
    cache.set(cacheKey, responseData, CACHE_TTL);
    
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
    const { ratedUserId, value } = ratingSchema.parse(body);
    
    if (currentUser.id === ratedUserId) {
      return NextResponse.json({ error: "You cannot rate yourself" }, { status: 400 });
    }
    
    // Check user existence efficiently
    const ratedUser = await prisma.user.findUnique({ 
      where: { id: ratedUserId, visible: true },
      select: { id: true } // Only fetch what we need
    });
    
    if (!ratedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    // Update or create the rating
    await prisma.rating.upsert({
      where: { userId_ratedUserId: { userId: currentUser.id, ratedUserId } },
      update: { value },
      create: { userId: currentUser.id, ratedUserId, value },
    });
    
    // Invalidate cache for this user and leaderboard
    invalidateRatingCaches([ratedUserId]);
    
    // Get updated user data using one efficient query
    const updatedUserData = await prisma.$queryRaw<any[]>`
      SELECT 
        AVG(r.value)::FLOAT as rating,
        COUNT(r.id) as "ratingsCount"
      FROM "Rating" r
      WHERE r."ratedUserId" = ${ratedUserId}
    `;
    
    const averageRating = parseFloat((updatedUserData[0]?.rating || 0).toFixed(2));
    const ratingsCount = parseInt(updatedUserData[0]?.ratingsCount || '0');
    
    // Get rank efficiently using the rank index
    const rank = await getUserRankOptimized(ratedUserId);
    
    const response = NextResponse.json({
      success: true,
      id: ratedUserId,
      rating: encrypt(averageRating.toString()),
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
    const secCheck = await securityMiddleware(req);
    if (secCheck) return secCheck;
    
    const session = await getServerAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    
    const currentUser = session.user;
    // Validate and parse the request body using Zod's batchRatingSchema
    const { ratings } = batchRatingSchema.parse(await req.json());
    
    // Check for self-rating
    if (ratings.some(r => r.ratedUserId === currentUser.id)) {
      return NextResponse.json({ error: "Invalid rating data or self-rating detected" }, { status: 400 });
    }
    
    // Get unique user IDs for efficient processing
    const uniqueUserIds = [...new Set(ratings.map(r => r.ratedUserId))];
    
    // Verify all users exist and are visible (in one query)
    const validUsers = await prisma.user.findMany({
      where: {
        id: { in: uniqueUserIds },
        visible: true
      },
      select: { id: true }
    });
    
    const validUserIds = new Set(validUsers.map(u => u.id));
    
    // Check if all users are valid
    if (validUserIds.size !== uniqueUserIds.length) {
      return NextResponse.json({ error: "One or more users not found" }, { status: 404 });
    }
    
    // Use a more efficient chunking approach for large batches
    const CHUNK_SIZE = 5;
    const ratingChunks = [];
    
    for (let i = 0; i < ratings.length; i += CHUNK_SIZE) {
      ratingChunks.push(ratings.slice(i, i + CHUNK_SIZE));
    }
    
    // Process each chunk in sequence
    for (const chunk of ratingChunks) {
      await prisma.$transaction(
        chunk.map(r => 
          prisma.rating.upsert({
            where: { userId_ratedUserId: { userId: currentUser.id, ratedUserId: r.ratedUserId } },
            update: { value: r.value },
            create: { userId: currentUser.id, ratedUserId: r.ratedUserId, value: r.value },
          })
        )
      );
    }
    
    // Invalidate all affected caches
    invalidateRatingCaches(uniqueUserIds);
    
    // Get updated data for all affected users in a single query
    const updatedRatings = await prisma.$queryRaw<any[]>`
      SELECT 
        r."ratedUserId" as id,
        AVG(r.value)::FLOAT as rating,
        COUNT(r.id) as "ratingsCount"
      FROM "Rating" r
      WHERE r."ratedUserId" IN (${Prisma.join(uniqueUserIds)})
      GROUP BY r."ratedUserId"
    `;
    
    // Build a map for efficient lookups
    const ratingsMap = new Map();
    updatedRatings.forEach(item => {
      ratingsMap.set(item.id, {
        rating: parseFloat(item.rating.toFixed(2)),
        ratingsCount: parseInt(item.ratingsCount)
      });
    });
    
    // Recalculate ranks (forcing a refresh of the rank cache)
    await refreshRankCache();
    
    // Get all user ranks efficiently
    const updates = await Promise.all(
      uniqueUserIds.map(async (userId) => {
        const userData = ratingsMap.get(userId) || { rating: 0, ratingsCount: 0 };
        const rank = await getUserRankOptimized(userId);
        
        return {
          id: userId,
          rating: encrypt(userData.rating.toString()),
          ratingsCount: encrypt(userData.ratingsCount.toString()),
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

/**
 * Helper: Get user rank efficiently using the cached rank map
 */
async function getUserRankOptimized(userId: string): Promise<number> {
  // Try to get from cache first
  let rankMap = cache.get(CACHE_KEYS.USER_RANKS) as Map<string, number>;
  
  if (!rankMap) {
    // If not in cache, recalculate and store
    rankMap = await refreshRankCache();
  }
  
  return rankMap.get(userId) || -1;
}

/**
 * Helper: Refresh the rank cache
 */
async function refreshRankCache(): Promise<Map<string, number>> {
  const allUsersForRanking = await prisma.$queryRaw<{ id: string }[]>`
    SELECT 
      u.id
    FROM "User" u
    LEFT JOIN (
      SELECT 
        "ratedUserId", 
        AVG(value)::FLOAT as avg_rating, 
        COUNT(*) as ratings_count
      FROM "Rating"
      GROUP BY "ratedUserId"
    ) r ON u.id = r."ratedUserId"
    WHERE u.visible = true
    ORDER BY COALESCE(r.avg_rating, 0) DESC, COALESCE(r.ratings_count, 0) DESC, u."createdAt" ASC
  `;
  
  const rankMap = new Map<string, number>();
  allUsersForRanking.forEach((user, index) => {
    rankMap.set(user.id, index + 1);
  });
  
  // Cache the rank map
  cache.set(CACHE_KEYS.USER_RANKS, rankMap, CACHE_TTL);
  
  return rankMap;
}

/**
 * Helper: Invalidate related caches when ratings change
 */
function invalidateRatingCaches(userIds: string[]): void {
  // Clear general leaderboard cache
  cache.keys().forEach(key => {
    if (key.startsWith(CACHE_KEYS.LEADERBOARD)) {
      cache.del(key);
    }
  });
  
  // Clear specific user caches
  userIds.forEach(id => {
    cache.del(CACHE_KEYS.USER_RATING(id));
  });
  
  // Clear ranks cache
  cache.del(CACHE_KEYS.USER_RANKS);
}