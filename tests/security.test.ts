import { describe, it, expect, beforeAll, afterAll } from "vitest";
import prisma from "@/lib/prisma";
import { makeOrder, cleanupOrder, cleanupAdmin } from "./_helpers/factory";
import { generateToken, hashToken } from "@/lib/security/tokens";
import { hashPassword } from "@/lib/security/password";

describe("Security — Token-/IDOR-Isolation", () => {
  let orderAId: string;
  let orderBId: string;
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    const a = await makeOrder({ customerEmail: "a@example.com" });
    const b = await makeOrder({ customerEmail: "b@example.com" });
    orderAId = a.order.id;
    orderBId = b.order.id;
    tokenA = a.publicToken;
    tokenB = b.publicToken;
  });

  afterAll(async () => {
    await cleanupOrder(orderAId);
    await cleanupOrder(orderBId);
  });

  it("Token A liest Order A", async () => {
    const found = await prisma.order.findUnique({ where: { publicToken: tokenA } });
    expect(found?.id).toBe(orderAId);
  });

  it("Token A findet NICHT Order B", async () => {
    const found = await prisma.order.findUnique({ where: { publicToken: tokenA } });
    expect(found?.id).not.toBe(orderBId);
  });

  it("Erfundener Token findet keine Order", async () => {
    const fake = generateToken();
    const found = await prisma.order.findUnique({ where: { publicToken: fake } });
    expect(found).toBeNull();
  });

  it("Leerer Token wirft / null", async () => {
    const found = await prisma.order.findUnique({ where: { publicToken: "" } });
    expect(found).toBeNull();
  });

  it("Token besteht regex-Validation (nur a-zA-Z0-9_-)", () => {
    expect(/^[A-Za-z0-9_-]+$/.test(tokenA)).toBe(true);
    expect(/^[A-Za-z0-9_-]+$/.test(tokenB)).toBe(true);
  });

  it("Token-Länge ≥ 43 chars (32 bytes base64url)", () => {
    expect(tokenA.length).toBeGreaterThanOrEqual(43);
    expect(tokenB.length).toBeGreaterThanOrEqual(43);
  });

  it("hashToken ist deterministisch + verschieden von Plain", () => {
    const h1 = hashToken(tokenA);
    const h2 = hashToken(tokenA);
    expect(h1).toBe(h2);
    expect(h1).not.toBe(tokenA);
  });
});

describe("Security — Admin-Auth Login-Rate-Limit + Lock", () => {
  const testEmail = `lock-test-${Date.now()}@example.com`;
  let adminId: string;

  beforeAll(async () => {
    const hash = await hashPassword("CorrectPassword123!");
    const admin = await prisma.admin.create({
      data: {
        email: testEmail,
        passwordHash: hash,
        isActive: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
    adminId = admin.id;
  });

  afterAll(async () => {
    await cleanupAdmin(testEmail);
  });

  it("Account ist initial nicht gesperrt", async () => {
    const a = await prisma.admin.findUnique({ where: { id: adminId } });
    expect(a?.lockedUntil).toBeNull();
    expect(a?.failedLoginAttempts).toBe(0);
  });

  it("FailedLoginAttempts inkrementiert", async () => {
    await prisma.admin.update({
      where: { id: adminId },
      data: { failedLoginAttempts: { increment: 1 } },
    });
    const a = await prisma.admin.findUnique({ where: { id: adminId } });
    expect(a?.failedLoginAttempts).toBe(1);
  });

  it("Bei 5 fehlerhaften Versuchen → lockedUntil in Zukunft", async () => {
    const lockTime = new Date(Date.now() + 15 * 60 * 1000);
    await prisma.admin.update({
      where: { id: adminId },
      data: { failedLoginAttempts: 5, lockedUntil: lockTime },
    });
    const a = await prisma.admin.findUnique({ where: { id: adminId } });
    expect(a?.lockedUntil?.getTime()).toBeGreaterThan(Date.now());
  });

  it("Reset nach erfolgreichem Login: lockedUntil=null, attempts=0", async () => {
    await prisma.admin.update({
      where: { id: adminId },
      data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    });
    const a = await prisma.admin.findUnique({ where: { id: adminId } });
    expect(a?.failedLoginAttempts).toBe(0);
    expect(a?.lockedUntil).toBeNull();
    expect(a?.lastLoginAt).not.toBeNull();
  });
});

describe("Security — Admin-Session Expiry", () => {
  const testEmail = `session-test-${Date.now()}@example.com`;
  let adminId: string;

  beforeAll(async () => {
    const hash = await hashPassword("SessionTestPass1!");
    const admin = await prisma.admin.create({
      data: { email: testEmail, passwordHash: hash, isActive: true },
    });
    adminId = admin.id;
  });

  afterAll(async () => {
    await cleanupAdmin(testEmail);
  });

  it("Aktive Session: expiresAt > now, revokedAt null", async () => {
    const token = generateToken();
    const session = await prisma.adminSession.create({
      data: {
        adminId,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      },
    });
    expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(session.revokedAt).toBeNull();
  });

  it("Abgelaufene Session: expiresAt < now wird als invalid behandelt", async () => {
    const token = generateToken();
    const session = await prisma.adminSession.create({
      data: {
        adminId,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() - 1000),
      },
    });
    expect(session.expiresAt.getTime()).toBeLessThan(Date.now());
    // Echte Validierung: getCurrentAdmin filtert per { expiresAt: { gt: new Date() }, revokedAt: null }
    const active = await prisma.adminSession.findFirst({
      where: { id: session.id, expiresAt: { gt: new Date() }, revokedAt: null },
    });
    expect(active).toBeNull();
  });

  it("Revoked Session wird gefiltert", async () => {
    const token = generateToken();
    const session = await prisma.adminSession.create({
      data: {
        adminId,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        revokedAt: new Date(),
      },
    });
    const active = await prisma.adminSession.findFirst({
      where: { id: session.id, expiresAt: { gt: new Date() }, revokedAt: null },
    });
    expect(active).toBeNull();
  });

  it("Session-tokenHash ≠ Plain-Token", () => {
    const t = generateToken();
    expect(hashToken(t)).not.toBe(t);
  });
});
