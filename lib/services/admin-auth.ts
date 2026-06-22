import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { generateToken, hashToken } from "@/lib/security/tokens";
import { hashPassword, verifyPassword } from "@/lib/security/password";
import { verifyTotp } from "@/lib/security/totp";
import { normalizeEmailOrThrow } from "@/lib/security/email";
import { rateLimit, extractIp } from "./rate-limit";
import { logAudit } from "./audit";

export const ADMIN_SESSION_COOKIE = "hagi-admin-session";
const SESSION_TTL_HOURS = 12;
const LOGIN_RATE_LIMIT = { limit: 5, windowSeconds: 60 * 15 };
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

export interface AuthedAdmin {
  id: string;
  email: string;
  displayName: string | null;
}

export async function loginAdmin(
  emailInput: string,
  passwordInput: string,
  totpToken?: string,
): Promise<{ ok: true; admin: AuthedAdmin } | { ok: false; error: string; retryAfter?: number }> {
  const h = await headers();
  const ip = extractIp(h);
  const ua = h.get("user-agent")?.slice(0, 500) ?? null;

  const rl = await rateLimit({
    key: `ip:${ip}:admin-login`,
    limit: LOGIN_RATE_LIMIT.limit,
    windowSeconds: LOGIN_RATE_LIMIT.windowSeconds,
  });
  if (!rl.allowed) {
    await logAudit({
      actorType: "system",
      action: "admin.login_rate_limited",
      entityType: "Admin",
      entityId: "n/a",
      ipAddress: ip,
      userAgent: ua,
    });
    return { ok: false, error: "RATE_LIMITED", retryAfter: rl.retryAfter };
  }

  let email: string;
  try {
    email = normalizeEmailOrThrow(emailInput);
  } catch {
    return { ok: false, error: "INVALID_CREDENTIALS" };
  }

  const admin = await prisma.admin.findUnique({ where: { email } });

  if (!admin || !admin.isActive) {
    await logAudit({
      actorType: "system",
      action: "admin.login_failed",
      entityType: "Admin",
      entityId: admin?.id ?? "n/a",
      after: { email, reason: admin ? "inactive" : "no_user" },
      ipAddress: ip,
      userAgent: ua,
    });
    // Constant-time response delay um Timing-Attacks zu blocken
    await sleep(150 + Math.random() * 100);
    return { ok: false, error: "INVALID_CREDENTIALS" };
  }

  if (admin.lockedUntil && admin.lockedUntil > new Date()) {
    return {
      ok: false,
      error: "ACCOUNT_LOCKED",
      retryAfter: Math.ceil((admin.lockedUntil.getTime() - Date.now()) / 1000),
    };
  }

  const passwordOk = await verifyPassword(passwordInput, admin.passwordHash);

  if (!passwordOk) {
    const nextFails = admin.failedLoginAttempts + 1;
    const shouldLock = nextFails >= MAX_FAILED_ATTEMPTS;
    await prisma.admin.update({
      where: { id: admin.id },
      data: {
        failedLoginAttempts: nextFails,
        lockedUntil: shouldLock ? new Date(Date.now() + LOCK_DURATION_MS) : null,
      },
    });
    await logAudit({
      actorType: "system",
      action: "admin.login_failed",
      entityType: "Admin",
      entityId: admin.id,
      after: { attempts: nextFails, locked: shouldLock },
      ipAddress: ip,
      userAgent: ua,
    });
    return { ok: false, error: shouldLock ? "ACCOUNT_LOCKED" : "INVALID_CREDENTIALS" };
  }

  // Zweiter Faktor (TOTP), falls für diesen Admin aktiviert. Erst NACH korrektem
  // Passwort — ein gültiges Passwort allein reicht nicht für eine Session.
  if (admin.totpEnabledAt && admin.totpSecret) {
    if (!totpToken) {
      // Passwort war korrekt, aber der Code fehlt → UI blendet das Code-Feld ein.
      // Kein Failed-Attempt (Passwort stimmte ja), keine Session.
      return { ok: false, error: "TOTP_REQUIRED" };
    }
    if (!verifyTotp(totpToken, admin.totpSecret)) {
      // Falscher Code zählt als Fehlversuch → schützt vor Code-Brute-Force.
      const nextFails = admin.failedLoginAttempts + 1;
      const shouldLock = nextFails >= MAX_FAILED_ATTEMPTS;
      await prisma.admin.update({
        where: { id: admin.id },
        data: {
          failedLoginAttempts: nextFails,
          lockedUntil: shouldLock ? new Date(Date.now() + LOCK_DURATION_MS) : null,
        },
      });
      await logAudit({
        actorType: "system",
        action: "admin.login_totp_failed",
        entityType: "Admin",
        entityId: admin.id,
        after: { attempts: nextFails, locked: shouldLock },
        ipAddress: ip,
        userAgent: ua,
      });
      return { ok: false, error: shouldLock ? "ACCOUNT_LOCKED" : "INVALID_TOTP" };
    }
  }

  // Erfolg
  const token = generateToken(32);
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.admin.update({
      where: { id: admin.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: ip,
      },
    }),
    prisma.adminSession.create({
      data: {
        adminId: admin.id,
        tokenHash,
        ipAddress: ip,
        userAgent: ua ?? undefined,
        expiresAt,
      },
    }),
  ]);

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  await logAudit({
    actorType: "admin",
    actorId: admin.id,
    action: "admin.login_success",
    entityType: "Admin",
    entityId: admin.id,
    ipAddress: ip,
    userAgent: ua,
  });

  return {
    ok: true,
    admin: { id: admin.id, email: admin.email, displayName: admin.displayName },
  };
}

export async function getCurrentAdmin(): Promise<AuthedAdmin | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
    if (!token || token.length < 16 || token.length > 100) return null;

    const tokenHash = hashToken(token);
    const session = await prisma.adminSession.findUnique({
      where: { tokenHash },
      include: { admin: true },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) return null;
    if (!session.admin.isActive) return null;

    return {
      id: session.admin.id,
      email: session.admin.email,
      displayName: session.admin.displayName,
    };
  } catch {
    // DB nicht erreichbar (z.B. während next build ohne DATABASE_URL) → nicht eingeloggt
    return null;
  }
}

export async function requireAdmin(): Promise<AuthedAdmin> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

export async function logoutAdmin(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (token) {
    const tokenHash = hashToken(token);
    await prisma.adminSession.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}

export async function createInitialAdmin(params: {
  email: string;
  password: string;
  displayName?: string;
}): Promise<{ id: string; email: string }> {
  const email = normalizeEmailOrThrow(params.email);
  const existing = await prisma.admin.count();
  if (existing > 0) {
    throw new Error("ADMIN_ALREADY_EXISTS");
  }
  const passwordHash = await hashPassword(params.password);
  const admin = await prisma.admin.create({
    data: {
      email,
      passwordHash,
      displayName: params.displayName ?? null,
      isActive: true,
    },
  });
  return { id: admin.id, email: admin.email };
}

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}
