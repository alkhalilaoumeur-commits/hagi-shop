import { describe, it, expect, afterEach, beforeEach } from "vitest";
import prisma from "@/lib/prisma";
import { rateLimit, cleanupRateLimitLogs } from "@/lib/services/rate-limit";

/**
 * Tests für das atomare Rate-Limiting (Security-Fix 2026-06-22).
 *
 * Vorher: count(auditLog) DANN create() — zwei getrennte Statements. Parallele
 * Requests konnten beide "unter dem Limit" zählen und beide durchkommen → Limit
 * umgehbar. Jetzt: ein atomares INSERT…ON CONFLICT DO UPDATE count+1.
 *
 * R1: zählt korrekt hoch, blockt ab dem (limit+1)-ten Request.
 * R2: verschiedene Keys sind unabhängig.
 * R3: KERN — 20 PARALLELE Requests bei limit=5 → exakt 5 erlaubt, nie mehr.
 * R4: cleanup entfernt abgelaufene Buckets.
 */

describe("Rate-Limit — atomar", () => {
  beforeEach(async () => {
    await prisma.rateLimitCounter.deleteMany({});
  });
  afterEach(async () => {
    await prisma.rateLimitCounter.deleteMany({});
  });

  it("R1: erlaubt genau `limit` Requests, blockt danach", async () => {
    const key = "test:r1";
    const results = [];
    for (let i = 0; i < 5; i++) {
      results.push(await rateLimit({ key, limit: 3, windowSeconds: 60 }));
    }
    expect(results.map((r) => r.allowed)).toEqual([true, true, true, false, false]);
    expect(results[0].remaining).toBe(2);
    expect(results[2].remaining).toBe(0);
    expect(results[3].retryAfter).toBeGreaterThan(0);
  });

  it("R2: verschiedene Keys sind unabhängig", async () => {
    const a = await rateLimit({ key: "test:r2:a", limit: 1, windowSeconds: 60 });
    const b = await rateLimit({ key: "test:r2:b", limit: 1, windowSeconds: 60 });
    expect(a.allowed).toBe(true);
    expect(b.allowed).toBe(true);
    // jeweils zweiter Call blockt
    expect((await rateLimit({ key: "test:r2:a", limit: 1, windowSeconds: 60 })).allowed).toBe(false);
  });

  it("R3: 20 parallele Requests bei limit=5 → exakt 5 erlaubt (Atomarität)", async () => {
    const key = "test:r3:concurrent";
    const calls = Array.from({ length: 20 }, () =>
      rateLimit({ key, limit: 5, windowSeconds: 60 }),
    );
    const results = await Promise.all(calls);
    const allowed = results.filter((r) => r.allowed).length;
    expect(allowed).toBe(5);
    expect(results.filter((r) => !r.allowed).length).toBe(15);

    // In der DB steht genau ein Bucket mit count=20 (alle Versuche gezählt).
    const counters = await prisma.rateLimitCounter.findMany({
      where: { bucketKey: { startsWith: key } },
    });
    expect(counters).toHaveLength(1);
    expect(counters[0].count).toBe(20);
  });

  it("R4: cleanup entfernt abgelaufene Buckets, behält aktive", async () => {
    await prisma.rateLimitCounter.create({
      data: { bucketKey: "test:r4:expired", count: 9, expiresAt: new Date(Date.now() - 1000) },
    });
    await prisma.rateLimitCounter.create({
      data: { bucketKey: "test:r4:active", count: 1, expiresAt: new Date(Date.now() + 60_000) },
    });

    const removed = await cleanupRateLimitLogs();
    expect(removed).toBeGreaterThanOrEqual(1);

    expect(await prisma.rateLimitCounter.findUnique({ where: { bucketKey: "test:r4:expired" } })).toBeNull();
    expect(await prisma.rateLimitCounter.findUnique({ where: { bucketKey: "test:r4:active" } })).not.toBeNull();
  });
});
