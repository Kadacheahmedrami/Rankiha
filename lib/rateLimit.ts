/**
 * A simple in-memory rate limiter.
 *
 * This implementation uses a Map to store an array of request timestamps for each IP address.
 * It filters out old requests that fall outside the defined window and checks if the current
 * count exceeds the allowed maximum.
 *
 * Note: This is for demonstration or development purposes. For production, consider using a distributed
 * store (like Redis) for rate limiting.
 */

export type RateLimitResult = { success: boolean };

const requestsMap: Map<string, number[]> = new Map();

export async function rateLimit(
  ip: string,
  maxRequests: number,
  windowMs: number
): Promise<RateLimitResult> {
  const currentTime = Date.now();

  // Retrieve current request timestamps for this IP, or initialize if not present.
  const requests = requestsMap.get(ip) || [];

  // Filter out timestamps that are older than the time window.
  const recentRequests = requests.filter(
    (timestamp) => currentTime - timestamp < windowMs
  );

  // Update the map with only the recent timestamps.
  requestsMap.set(ip, recentRequests);

  // If the number of requests meets/exceeds the maximum allowed, return failure.
  if (recentRequests.length >= maxRequests) {
    return { success: false };
  }

  // Log the current request timestamp and return success.
  recentRequests.push(currentTime);
  requestsMap.set(ip, recentRequests);
  return { success: true };
}
