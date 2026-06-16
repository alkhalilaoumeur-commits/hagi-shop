import { randomBytes, createHash, timingSafeEqual } from "node:crypto";

/**
 * Cryptographically secure URL-safe token.
 * Uses 32 bytes → 43 chars base64url. Brute-force-resistant.
 * Verwendung: order.publicToken, customer.passwordResetTokenHash, email-verify.
 */
export function generateToken(byteLength: number = 32): string {
  return randomBytes(byteLength).toString("base64url");
}

/**
 * One-way hash for tokens we store but want to verify (password reset, email verify).
 * Wir speichern NIE den Klartext-Token in der DB.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Constant-time comparison — gegen Timing-Attacks.
 * Niemals === für Token-Vergleich nutzen.
 */
export function safeCompare(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

/**
 * Vergleicht einen Klartext-Token mit einem gespeicherten Hash.
 */
export function verifyTokenHash(plaintext: string, storedHash: string): boolean {
  return safeCompare(hashToken(plaintext), storedHash);
}
