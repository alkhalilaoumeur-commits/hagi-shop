/**
 * Email-Normalisierung. ÜBERALL nutzen wo Emails verglichen oder gespeichert werden.
 *
 * - Trimmt Whitespace
 * - Lowercased (RFC 5321 Domain ist case-insensitive, Local-Part technisch nicht,
 *   aber praktisch von allen Providern als case-insensitive behandelt)
 * - Limit 254 chars (RFC 5321 hard limit)
 * - Returns null bei Invalid
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;

export function normalizeEmail(input: string | null | undefined): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_EMAIL_LENGTH) return null;
  const lowered = trimmed.toLowerCase();
  if (!EMAIL_REGEX.test(lowered)) return null;
  return lowered;
}

/**
 * Strict normalize — wirft, falls invalid. Für Server-Actions die explizit
 * Email als Pflicht erwarten.
 */
export function normalizeEmailOrThrow(input: string | null | undefined): string {
  const email = normalizeEmail(input);
  if (!email) throw new Error("INVALID_EMAIL");
  return email;
}
