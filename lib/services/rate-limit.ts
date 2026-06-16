import prisma from "@/lib/prisma";

/**
 * Postgres-basiertes Rate-Limiting.
 *
 * Nutzt einen eigenen kleinen Counter pro {key, window-start}. Sliding-Window
 * über INSERT + DELETE-OLD. Reicht für niedrige bis mittlere Last (< 100 req/s).
 *
 * In Production später ersetzen durch Upstash Redis Sliding-Window für höhere
 * Last + global verteilte Edge.
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
  const windowStart = new Date(now - input.windowSeconds * 1000);

  const count = await prisma.auditLog.count({
    where: {
      action: "rate.hit",
      entityType: "RateLimit",
      entityId: input.key,
      createdAt: { gte: windowStart },
    },
  });

  if (count >= input.limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: input.windowSeconds,
    };
  }

  await prisma.auditLog.create({
    data: {
      actorType: "system",
      action: "rate.hit",
      entityType: "RateLimit",
      entityId: input.key,
    },
  });

  return {
    allowed: true,
    remaining: input.limit - count - 1,
    retryAfter: 0,
  };
}

/**
 * Periodischer Cleanup — sollte via Cron-Job laufen.
 * Löscht Rate-Limit-Logs älter als 1 Stunde (wir brauchen sie nur kurz).
 */
export async function cleanupRateLimitLogs(): Promise<number> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const result = await prisma.auditLog.deleteMany({
    where: {
      action: "rate.hit",
      entityType: "RateLimit",
      createdAt: { lt: oneHourAgo },
    },
  });
  return result.count;
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
