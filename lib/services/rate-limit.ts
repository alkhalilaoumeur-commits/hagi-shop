import prisma from "@/lib/prisma";

/**
 * Postgres-basiertes Rate-Limiting (atomar).
 *
 * Fixed-Window-Counter in der Tabelle `RateLimitCounter`: pro {key + Fenster-Start}
 * existiert genau eine Zeile, hochgezählt über ein einziges atomares
 * `INSERT … ON CONFLICT DO UPDATE count = count + 1 RETURNING count`. Damit kann
 * kein paralleler Request "unter dem Limit durchschlüpfen" (das war der Race im
 * alten Count-then-Insert-Ansatz über auditLog). Abgelaufene Buckets räumt der
 * Cleanup-Cron weg.
 *
 * Trade-off Fixed-Window: an der Fenstergrenze theoretisch bis 2× Limit. Für
 * Login-/Token-Throttling akzeptabel. Für höhere Last später Upstash Redis
 * Sliding-Window.
 *
 * Pattern:
 *   const { allowed, retryAfter } = await rateLimit({ key: `ip:${ip}:invoice`, limit: 10, windowSeconds: 60 });
 *   if (!allowed) return 429
 */

interface RateLimitInput {
  key: string;
  limit: number;
  windowSeconds: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter: number;
}

export async function rateLimit(input: RateLimitInput): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = input.windowSeconds * 1000;
  // Fixed-Window: alle Requests im selben Zeitfenster teilen sich einen Bucket.
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const bucketKey = `${input.key}:${windowStart}`;
  const expiresAt = new Date(windowStart + windowMs);

  // ATOMAR: ein einziges INSERT…ON CONFLICT DO UPDATE count+1 RETURNING count.
  // Postgres serialisiert den Upsert pro Zeile → kein Count-then-Insert-Race mehr,
  // parallele Requests können nicht gemeinsam "unter dem Limit durchschlüpfen".
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimitCounter" ("bucketKey", "count", "expiresAt")
    VALUES (${bucketKey}, 1, ${expiresAt})
    ON CONFLICT ("bucketKey") DO UPDATE SET "count" = "RateLimitCounter"."count" + 1
    RETURNING "count"
  `;
  const count = Number(rows[0]?.count ?? 1);

  if (count > input.limit) {
    return {
      allowed: false,
      remaining: 0,
      // Bis zum Ende des aktuellen Fensters warten.
      retryAfter: Math.max(1, Math.ceil((windowStart + windowMs - now) / 1000)),
    };
  }

  return {
    allowed: true,
    remaining: Math.max(0, input.limit - count),
    retryAfter: 0,
  };
}

/**
 * Periodischer Cleanup — PFLICHT via Coolify Cron alle 15 min.
 *
 *   curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
 *     https://hagi-shop.de/api/cron/cleanup
 *
 * Ohne Cron wächst auditLog linear → DoS-Verstärker.
 */
export async function cleanupRateLimitLogs(): Promise<number> {
  // Abgelaufene Buckets entfernen (Fenster ist vorbei → nicht mehr relevant).
  const counters = await prisma.rateLimitCounter.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  // Legacy: alte auditLog "rate.hit"-Zeilen aus der Zeit vor dem Tabellen-Umbau.
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const legacy = await prisma.auditLog.deleteMany({
    where: { action: "rate.hit", entityType: "RateLimit", createdAt: { lt: oneHourAgo } },
  });
  return counters.count + legacy.count;
}

/**
 * IP-Helper für Server-Components/Actions.
 *
 * Hierarchie (bevorzugt vertrauenswürdige Header):
 *   1. cf-connecting-ip — Cloudflare setzt diesen Header; Spoofing-resistent
 *      weil Cloudflare ihn überschreibt
 *   2. x-real-ip — Coolify Traefik
 *   3. x-forwarded-for first hop — letzter Fallback
 *
 * In Production-Setup ist Cloudflare immer davor → cf-connecting-ip greift.
 * Bei direktem Hetzner-Access (lokal) fällt es auf x-real-ip/x-forwarded-for zurück.
 */
export function extractIp(headers: Headers): string {
  const cf = headers.get("cf-connecting-ip");
  if (cf) {
    const ip = cf.trim();
    if (isValidIp(ip)) return ip;
  }
  const real = headers.get("x-real-ip");
  if (real) {
    const ip = real.trim();
    if (isValidIp(ip)) return ip;
  }
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first && isValidIp(first)) return first;
  }
  return "unknown";
}

function isValidIp(s: string): boolean {
  if (s.length > 64) return false;
  // IPv4 oder IPv6 grob: nur erlaubte Zeichen
  return /^[0-9a-fA-F:.]+$/.test(s);
}
