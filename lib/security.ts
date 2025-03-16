import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rateLimit';
import { validateToken, generateCSRFToken } from '@/lib/csrf';
import { BLACKLISTED_EMAILS } from '@/app/BLACKLIST/blacklist';

// You can also export these constants if you want them centralized.
export const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
export const RATE_LIMIT_MAX_REQUESTS = 200;

/**
 * securityMiddleware applies rate limiting, CSRF validation (for non-GET requests),
 * checks authentication and verifies that the user's email is not blacklisted.
 * It assumes that a session is passed as a parameter.
 */
export async function securityMiddleware(
  req: NextRequest,
  session: any
): Promise<NextResponse | null> {
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

  // Authentication check.
  if (!session || !session.user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  if (session.user.email && BLACKLISTED_EMAILS.includes(session.user.email)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  return null;
}

/**
 * setSecurityHeaders attaches security-related HTTP headers (including a fresh CSRF token)
 * to the response.
 */
export async function setSecurityHeaders(response: NextResponse): Promise<NextResponse> {
  const csrfToken = await generateCSRFToken();
  response.headers.set("x-csrf-token", csrfToken);
  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Content-Security-Policy", "default-src 'self'");
  return response;
}
