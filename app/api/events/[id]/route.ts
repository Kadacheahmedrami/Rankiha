// app/api/events/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/prisma/prismaClient';
import { getServerAuthSession } from '@/app/lib/auth';
import { rateLimit } from '@/lib/rateLimit';
import { validateToken, generateCSRFToken } from '@/lib/csrf';
import { BLACKLISTED_EMAILS } from '@/app/BLACKLIST/blacklist';


const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30;

/**
 * Security middleware: rate limiting, CSRF validation (for non-GET), authentication,
 * and email blacklist check.
 */
async function securityMiddleware(req: NextRequest): Promise<NextResponse | null> {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const rateResult = await rateLimit(ip, RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW);
  if (!rateResult.success) {
    return NextResponse.json(
      { error: "Too many requests, please try again later" },
      { status: 429 }
    );
  }
  if (req.method !== "GET") {
    const csrfToken = req.headers.get("x-csrf-token");
    if (!csrfToken || !(await validateToken(csrfToken))) {
     
      return NextResponse.json({ error: "Invalid request" }, { status: 403 });
    }
  }
  // Uncomment below if you need session authentication in this endpoint:
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
 * GET: Fetch event details and an article leaderboard for a specific event.
 * Calculates each article's average rating, count, rank, and change indicator.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Run security middleware.
    const secCheck = await securityMiddleware(req);
    if (secCheck) return secCheck;

    const { id } = params;

    // --- Query Event Details ---
    const event = await prisma.event.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        startDate: true,
        endDate: true,
      },
    });
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // --- Query Leaderboard Data ---
    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    // Query articles for the event (using id), joining with ratings to calculate average rating and count.
    const articles = await prisma.$queryRaw<any[]>`
      SELECT 
        a.id,
        a.name,
        a.description,
        a."createdAt",
        COALESCE(AVG(r.value)::FLOAT, 0) as rating,
        COUNT(r.id) as "ratingsCount"
      FROM "Article" a
      LEFT JOIN "Rating" r ON a.id = r."ratedArticleId"
      WHERE a."eventId" = ${id} AND a.visible = true
      GROUP BY a.id
      ORDER BY rating DESC, "ratingsCount" DESC
      LIMIT ${limit} OFFSET ${skip}
    `;

    // Count the total number of articles for pagination.
    const countResult = await prisma.$queryRaw<{ count: string }[]>`
      SELECT COUNT(*) as count
      FROM "Article" a
      WHERE a."eventId" = ${id} AND a.visible = true
    `;
    const totalCount = parseInt(countResult[0].count);
    const totalPages = Math.ceil(totalCount / limit);

    // Get previous rankings (based on ratings older than 24 hours) for change indicators.
    const previousRankings = await prisma.$queryRaw<any[]>`
      SELECT 
        a.id,
        COALESCE(AVG(r.value)::FLOAT, 0) as rating,
        COUNT(r.id) as "ratingsCount"
      FROM "Article" a
      LEFT JOIN "Rating" r ON a.id = r."ratedArticleId"
      WHERE a."eventId" = ${id} AND r."createdAt" < NOW() - INTERVAL '24 HOURS'
      GROUP BY a.id
      ORDER BY rating DESC, "ratingsCount" DESC
    `;
    const prevRankingsMap = new Map<string, number>();
    previousRankings.forEach((article, index) => {
      prevRankingsMap.set(article.id, index + 1);
    });

    // Build leaderboard with ranking and change indicator.
    const leaderboard = articles.map((article, index) => {
      const currentRank = skip + index + 1;
      const previousRank = prevRankingsMap.get(article.id) || currentRank;
      let change: 'up' | 'down' | 'same' = 'same';
      if (previousRank < currentRank) change = 'down';
      if (previousRank > currentRank) change = 'up';
      return {
        id: article.id,
        name: article.name,
        description: article.description,
        rating: parseFloat(article.rating.toFixed(1)),
        ratingsCount: parseInt(article.ratingsCount),
        rank: currentRank,
        change,
      };
    });

    // --- Build Combined Response ---
    const responseData = {
      event,
      leaderboard: {
        data: leaderboard,
        pagination: { total: totalCount, page, limit, totalPages },
      },
    };

    const response = NextResponse.json(responseData);
    return setSecurityHeaders(response);
  } catch (error) {
    console.error('Error fetching article leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch article leaderboard' },
      { status: 500 }
    );
  }
}
