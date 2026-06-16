import argon2 from "argon2";

const OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(plaintext: string): Promise<string> {
  if (typeof plaintext !== "string" || plaintext.length < 12 || plaintext.length > 256) {
    throw new Error("INVALID_PASSWORD_LENGTH");
  }
  return argon2.hash(plaintext, OPTIONS);
}

export async function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  if (typeof plaintext !== "string" || typeof hash !== "string") return false;
  try {
    return await argon2.verify(hash, plaintext, OPTIONS);
  } catch {
    return false;
  }
}

export function isStrongPassword(plaintext: string): { ok: boolean; reason?: string } {
  if (plaintext.length < 12) return { ok: false, reason: "MIN_12_CHARS" };
  if (plaintext.length > 256) return { ok: false, reason: "MAX_256_CHARS" };
  if (!/[a-z]/.test(plaintext)) return { ok: false, reason: "NEEDS_LOWER" };
  if (!/[A-Z]/.test(plaintext)) return { ok: false, reason: "NEEDS_UPPER" };
  if (!/[0-9]/.test(plaintext)) return { ok: false, reason: "NEEDS_DIGIT" };
  return { ok: true };
}
