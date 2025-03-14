import crypto from "crypto";

/**
 * Hashes a given ID using SHA-256 and returns a shorter version.
 * This can be used to mask or shorten IDs for display.
 *
 * @param id - The ID string to hash.
 * @returns A hashed string (first 10 characters of the SHA-256 hash).
 */
export function hashId(id: string): string {
  return crypto.createHash("sha256").update(id).digest("hex").slice(0, 10);
}
