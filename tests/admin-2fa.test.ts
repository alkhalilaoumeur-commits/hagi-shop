import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import { generateSync } from "otplib";

/**
 * Tests für die Admin-2FA (TOTP), Security-Feature 2026-06-22.
 *
 * Abgedeckt:
 *  - verifyTotp: gültig / ungültig / Format
 *  - Enrollment: start (pending, NICHT aktiv) → confirm (aktiv)
 *  - disable: nur mit gültigem Code
 *  - Login-Gate: 2FA-Admin braucht NACH korrektem Passwort einen gültigen Code
 *    (TOTP_REQUIRED → INVALID_TOTP → ok); Admin ohne 2FA loggt normal ein.
 */

// next/headers mocken (loginAdmin nutzt headers() + cookies()).
const cookieJar = new Map<string, string>();
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "user-agent": "vitest", "x-forwarded-for": "10.20.30.40" }),
  cookies: async () => ({
    get: (n: string) => {
      const v = cookieJar.get(n);
      return v ? { value: v } : undefined;
    },
    set: (n: string, v: string) => cookieJar.set(n, v),
    delete: (n: string) => cookieJar.delete(n),
  }),
}));

import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/security/password";
import { generateTotpSecret, verifyTotp } from "@/lib/security/totp";
import { loginAdmin } from "@/lib/services/admin-auth";
import {
  startTotpEnrollment,
  confirmTotpEnrollment,
  disableTotp,
  isTotpEnabled,
} from "@/lib/services/admin-2fa";

const EMAIL = `2fa-admin-${Date.now()}@example.com`;
const PASSWORD = "Test-Passwort-123";
let adminId: string;

beforeAll(async () => {
  const admin = await prisma.admin.create({
    data: { email: EMAIL, passwordHash: await hashPassword(PASSWORD), displayName: "2FA", isActive: true },
  });
  adminId = admin.id;
});

afterAll(async () => {
  await prisma.adminSession.deleteMany({ where: { adminId } });
  await prisma.admin.delete({ where: { id: adminId } });
});

beforeEach(async () => {
  cookieJar.clear();
  await prisma.rateLimitCounter.deleteMany({});
  await prisma.adminSession.deleteMany({ where: { adminId } });
  await prisma.admin.update({
    where: { id: adminId },
    data: { failedLoginAttempts: 0, lockedUntil: null, totpSecret: null, totpEnabledAt: null },
  });
});

describe("verifyTotp", () => {
  it("akzeptiert den aktuellen Code, lehnt falsche ab", () => {
    const secret = generateTotpSecret();
    expect(verifyTotp(generateSync({ secret }), secret)).toBe(true);
    expect(verifyTotp("000000", secret)).toBe(false);
  });
  it("lehnt nicht-6-stellige Eingaben ab", () => {
    const secret = generateTotpSecret();
    expect(verifyTotp("123", secret)).toBe(false);
    expect(verifyTotp("abcdef", secret)).toBe(false);
    expect(verifyTotp("", secret)).toBe(false);
  });
});

describe("Enrollment", () => {
  it("start speichert pending-Secret, aktiviert aber NICHT", async () => {
    const { secret } = await startTotpEnrollment(adminId, EMAIL);
    expect(secret).toBeTruthy();
    expect(await isTotpEnabled(adminId)).toBe(false);
  });

  it("confirm mit gültigem Code aktiviert 2FA", async () => {
    const { secret } = await startTotpEnrollment(adminId, EMAIL);
    const res = await confirmTotpEnrollment(adminId, generateSync({ secret }));
    expect(res.ok).toBe(true);
    expect(await isTotpEnabled(adminId)).toBe(true);
  });

  it("confirm mit falschem Code aktiviert NICHT", async () => {
    await startTotpEnrollment(adminId, EMAIL);
    const res = await confirmTotpEnrollment(adminId, "000000");
    expect(res.ok).toBe(false);
    expect(res.error).toBe("INVALID_TOTP");
    expect(await isTotpEnabled(adminId)).toBe(false);
  });

  it("disable nur mit gültigem Code", async () => {
    const { secret } = await startTotpEnrollment(adminId, EMAIL);
    await confirmTotpEnrollment(adminId, generateSync({ secret }));

    expect((await disableTotp(adminId, "000000")).ok).toBe(false);
    expect(await isTotpEnabled(adminId)).toBe(true);

    expect((await disableTotp(adminId, generateSync({ secret }))).ok).toBe(true);
    expect(await isTotpEnabled(adminId)).toBe(false);
  });
});

describe("Login-Gate", () => {
  it("Admin OHNE 2FA loggt normal ein (kein Regress)", async () => {
    const res = await loginAdmin(EMAIL, PASSWORD);
    expect(res.ok).toBe(true);
  });

  it("Admin MIT 2FA: korrektes Passwort ohne Code → TOTP_REQUIRED (keine Session)", async () => {
    const secret = generateTotpSecret();
    await prisma.admin.update({ where: { id: adminId }, data: { totpSecret: secret, totpEnabledAt: new Date() } });

    const res = await loginAdmin(EMAIL, PASSWORD);
    expect(res.ok).toBe(false);
    expect((res as { error: string }).error).toBe("TOTP_REQUIRED");
    // keine Session angelegt
    expect(await prisma.adminSession.count({ where: { adminId } })).toBe(0);
  });

  it("Admin MIT 2FA: falscher Code → INVALID_TOTP + Fehlversuch", async () => {
    const secret = generateTotpSecret();
    await prisma.admin.update({ where: { id: adminId }, data: { totpSecret: secret, totpEnabledAt: new Date() } });

    const res = await loginAdmin(EMAIL, PASSWORD, "000000");
    expect(res.ok).toBe(false);
    expect((res as { error: string }).error).toBe("INVALID_TOTP");
    const a = await prisma.admin.findUnique({ where: { id: adminId } });
    expect(a?.failedLoginAttempts).toBe(1);
  });

  it("Admin MIT 2FA: korrektes Passwort + korrekter Code → Session", async () => {
    const secret = generateTotpSecret();
    await prisma.admin.update({ where: { id: adminId }, data: { totpSecret: secret, totpEnabledAt: new Date() } });

    const res = await loginAdmin(EMAIL, PASSWORD, generateSync({ secret }));
    expect(res.ok).toBe(true);
    expect(await prisma.adminSession.count({ where: { adminId } })).toBeGreaterThan(0);
  });

  it("falsches Passwort wird vor dem 2FA-Schritt abgelehnt", async () => {
    const secret = generateTotpSecret();
    await prisma.admin.update({ where: { id: adminId }, data: { totpSecret: secret, totpEnabledAt: new Date() } });

    const res = await loginAdmin(EMAIL, "Falsches-Passwort-1", generateSync({ secret }));
    expect(res.ok).toBe(false);
    expect((res as { error: string }).error).toBe("INVALID_CREDENTIALS");
  });
});
