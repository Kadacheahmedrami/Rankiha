// app/api/events/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/prisma/prismaClient';
import { getServerAuthSession } from '@/app/lib/auth';
import { rateLimit } from '@/lib/rateLimit';
import { validateToken, generateCSRFToken } from '@/lib/csrf';
import { BLACKLISTED_EMAILS } from '@/app/BLACKLIST/blacklist';
import { logger } from '@/lib/logger';

// Constants for security settings
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
 * GET: Fetch a list of events ordered by start date.
 */
export async function GET(req: NextRequest) {
  try {
    // Run security middleware.
    const secCheck = await securityMiddleware(req);
    if (secCheck) return secCheck;

    // Fetch events.
    const events = await prisma.event.findMany({
      orderBy: { startDate: 'asc' },
    });

    const response = NextResponse.json({ data: events });
    return setSecurityHeaders(response);
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}
