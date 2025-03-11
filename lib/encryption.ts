import crypto from "crypto";

// Configuration: adjust these values and ensure ENCRYPTION_KEY is set in your environment.
const algorithm = "aes-256-cbc";
// Use a 32-byte (256-bit) key. Ensure you have a secure key set in your environment.
const secretKey = process.env.ENCRYPTION_KEY || "default_secret_key_change_me";
const key = crypto.createHash("sha256").update(secretKey).digest();

export function encrypt(text: string): string {
  // Generate a random initialization vector for each encryption
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  // Return iv and encrypted text separated by a colon
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

export function decrypt(encryptedText: string): string {
  // Split the input into the iv and the encrypted data
  const parts = encryptedText.split(":");
  if (parts.length !== 2) {
    throw new Error("Invalid encrypted text format");
  }
  const iv = Buffer.from(parts[0], "hex");
  const encrypted = Buffer.from(parts[1], "hex");
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}
