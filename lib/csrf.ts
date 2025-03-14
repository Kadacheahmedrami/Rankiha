import crypto from "crypto";

/**
 * Simple in-memory CSRF token generator and validator.
 * 
 * Note: This is a basic implementation for demonstration. In a production environment,
 * consider a more robust solution, perhaps using signed tokens or storing tokens per session.
 */

const tokenStore: Set<string> = new Set();
const CSRF_SECRET = process.env.CSRF_SECRET || "default-secret";

/**
 * Generates a new CSRF token.
 * @returns A promise that resolves to a new token.
 */
export async function generateCSRFToken(): Promise<string> {
  // Generate a random token (256-bit token represented in hex)
  const token = crypto.randomBytes(32).toString("hex");
  // Optionally, you can sign the token with a secret here.
  tokenStore.add(token);
  return token;
}

/**
 * Validates a provided CSRF token.
 * @param token - The CSRF token to validate.
 * @returns A promise that resolves to true if valid; otherwise, false.
 */
export async function validateToken(token: string): Promise<boolean> {
  if (tokenStore.has(token)) {
    // Optionally remove the token after one use to prevent replay attacks.
    tokenStore.delete(token);
    return true;
  }
  return false;
}
