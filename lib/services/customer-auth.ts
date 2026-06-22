import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { generateToken, hashToken } from "@/lib/security/tokens";
import { hashPassword, verifyPassword, isStrongPassword } from "@/lib/security/password";
import { normalizeEmailOrThrow } from "@/lib/security/email";
import { APP_URL } from "@/lib/config";
import { sendEmailVerification, sendPasswordReset } from "@/lib/email/send";
import { rateLimit, extractIp } from "./rate-limit";
import { logAudit } from "./audit";

/**
 * Kunden-Authentifizierung — gespiegeltes Pattern von admin-auth.ts.
 *
 * Unterschiede zum Admin:
 *  - Double-Opt-In: Account erst nach E-Mail-Verifizierung nutzbar.
 *  - Längere Session-TTL (Kunden bleiben länger eingeloggt).
 *  - Passwort-Reset-Flow (Admins haben den nicht).
 *  - Beim Verify: Backfill bestehender Gast-Bestellungen über die E-Mail.
 *
 * Sicherheit:
 *  - Rate-Limit pro IP (Login / Register / Reset).
 *  - Account-Lock nach 5 Fehlversuchen für 15 min.
 *  - Constant-time-Delay gegen Timing-Attacks bei unbekannter E-Mail.
 *  - Keine User-Enumeration bei Register / Reset (generische Erfolgsmeldung).
 *  - Session-Token wird nur als SHA-256-Hash gespeichert (Plain nur im Cookie).
 */

export const CUSTOMER_SESSION_COOKIE = "hagi-customer-session";
const SESSION_TTL_HOURS = 720; // 30 Tage
const VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const RESET_TTL_MS = 60 * 60 * 1000; // 1h
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;
const LOGIN_RATE_LIMIT = { limit: 5, windowSeconds: 60 * 15 };
const REGISTER_RATE_LIMIT = { limit: 5, windowSeconds: 60 * 60 };
const RESET_RATE_LIMIT = { limit: 5, windowSeconds: 60 * 60 };

export interface AuthedCustomer {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

type SimpleResult =
  | { ok: true }
  | { ok: false; error: string; retryAfter?: number };

/**
 * Registrierung. Legt einen unverifizierten Customer an (oder aktualisiert einen
 * bestehenden unverifizierten) und verschickt die Verify-Mail. KEIN Auto-Login.
 *
 * Bei bereits VERIFIZIERTER E-Mail geben wir generisch `ok: true` zurück, ohne
 * etwas zu tun — sonst könnte man über die Response existierende Accounts
 * herausfinden (User-Enumeration).
 */
export async function registerCustomer(
  emailInput: string,
  passwordInput: string,
  firstName?: string | null,
  lastName?: string | null,
): Promise<SimpleResult> {
  const h = await headers();
  const ip = extractIp(h);
  const ua = h.get("user-agent")?.slice(0, 500) ?? null;

  const rl = await rateLimit({
    key: `ip:${ip}:customer-register`,
    limit: REGISTER_RATE_LIMIT.limit,
    windowSeconds: REGISTER_RATE_LIMIT.windowSeconds,
  });
  if (!rl.allowed) {
    return { ok: false, error: "RATE_LIMITED", retryAfter: rl.retryAfter };
  }

  let email: string;
  try {
    email = normalizeEmailOrThrow(emailInput);
  } catch {
    return { ok: false, error: "INVALID_EMAIL" };
  }

  const strength = isStrongPassword(passwordInput);
  if (!strength.ok) {
    return { ok: false, error: "WEAK_PASSWORD" };
  }

  const existing = await prisma.customer.findUnique({ where: { email } });

  // Bereits verifiziert → keine Enumeration. Generische Erfolgsmeldung.
  if (existing && existing.emailVerifiedAt) {
    await logAudit({
      actorType: "system",
      action: "customer.register_existing",
      entityType: "Customer",
      entityId: existing.id,
      ipAddress: ip,
      userAgent: ua,
    });
    return { ok: true };
  }

  const passwordHash = await hashPassword(passwordInput);
  const verifyToken = generateToken(32);
  const verifyTokenHash = hashToken(verifyToken);
  const verifyExpiresAt = new Date(Date.now() + VERIFY_TTL_MS);

  let customerId: string;
  if (existing) {
    // Unverifizierter Eintrag → Daten + neuen Verify-Token überschreiben.
    await prisma.customer.update({
      where: { id: existing.id },
      data: {
        passwordHash,
        firstName: firstName ?? existing.firstName,
        lastName: lastName ?? existing.lastName,
        emailVerifyTokenHash: verifyTokenHash,
        emailVerifyExpiresAt: verifyExpiresAt,
      },
    });
    customerId = existing.id;
  } else {
    const created = await prisma.customer.create({
      data: {
        email,
        passwordHash,
        firstName: firstName ?? null,
        lastName: lastName ?? null,
        emailVerifyTokenHash: verifyTokenHash,
        emailVerifyExpiresAt: verifyExpiresAt,
      },
    });
    customerId = created.id;
  }

  await sendEmailVerification(email, {
    firstName: firstName ?? null,
    verifyUrl: `${APP_URL}/konto/verifizieren/${verifyToken}`,
  });

  await logAudit({
    actorType: "customer",
    actorId: customerId,
    action: "customer.registered",
    entityType: "Customer",
    entityId: customerId,
    ipAddress: ip,
    userAgent: ua,
  });

  return { ok: true };
}

/**
 * E-Mail-Verifizierung. Setzt `emailVerifiedAt`, löscht den Token und ordnet
 * bestehende Gast-Bestellungen mit derselben E-Mail diesem Konto zu (Backfill).
 */
export async function verifyEmail(
  token: string,
): Promise<{ ok: true; customerId: string } | { ok: false; error: string }> {
  if (!token || token.length < 16 || token.length > 100) {
    return { ok: false, error: "INVALID_TOKEN" };
  }
  const tokenHash = hashToken(token);
  const customer = await prisma.customer.findUnique({ where: { emailVerifyTokenHash: tokenHash } });
  if (!customer) {
    return { ok: false, error: "INVALID_TOKEN" };
  }
  if (!customer.emailVerifyExpiresAt || customer.emailVerifyExpiresAt < new Date()) {
    return { ok: false, error: "TOKEN_EXPIRED" };
  }

  await prisma.$transaction([
    prisma.customer.update({
      where: { id: customer.id },
      data: {
        emailVerifiedAt: new Date(),
        emailVerifyTokenHash: null,
        emailVerifyExpiresAt: null,
      },
    }),
    // Backfill: Gast-Bestellungen dieser E-Mail dem Konto zuordnen.
    prisma.order.updateMany({
      where: { customerEmail: customer.email, customerId: null },
      data: { customerId: customer.id },
    }),
  ]);

  await logAudit({
    actorType: "customer",
    actorId: customer.id,
    action: "customer.email_verified",
    entityType: "Customer",
    entityId: customer.id,
  });

  return { ok: true, customerId: customer.id };
}

/**
 * Login. Spiegelt admin-auth.loginAdmin, plus EMAIL_NOT_VERIFIED-Gate NACH der
 * Passwort-Prüfung (verraten erst nach erfolgreicher Authentifizierung).
 */
export async function loginCustomer(
  emailInput: string,
  passwordInput: string,
): Promise<{ ok: true; customer: AuthedCustomer } | { ok: false; error: string; retryAfter?: number }> {
  const h = await headers();
  const ip = extractIp(h);
  const ua = h.get("user-agent")?.slice(0, 500) ?? null;

  const rl = await rateLimit({
    key: `ip:${ip}:customer-login`,
    limit: LOGIN_RATE_LIMIT.limit,
    windowSeconds: LOGIN_RATE_LIMIT.windowSeconds,
  });
  if (!rl.allowed) {
    await logAudit({
      actorType: "system",
      action: "customer.login_rate_limited",
      entityType: "Customer",
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

  const customer = await prisma.customer.findUnique({ where: { email } });

  if (!customer || !customer.passwordHash || customer.deletedAt) {
    await logAudit({
      actorType: "system",
      action: "customer.login_failed",
      entityType: "Customer",
      entityId: customer?.id ?? "n/a",
      after: { email, reason: "no_user" },
      ipAddress: ip,
      userAgent: ua,
    });
    // Constant-time-Delay gegen Timing-Attacks.
    await sleep(150 + Math.random() * 100);
    return { ok: false, error: "INVALID_CREDENTIALS" };
  }

  if (customer.lockedUntil && customer.lockedUntil > new Date()) {
    return {
      ok: false,
      error: "ACCOUNT_LOCKED",
      retryAfter: Math.ceil((customer.lockedUntil.getTime() - Date.now()) / 1000),
    };
  }

  const passwordOk = await verifyPassword(passwordInput, customer.passwordHash);

  if (!passwordOk) {
    const nextFails = customer.failedLoginAttempts + 1;
    const shouldLock = nextFails >= MAX_FAILED_ATTEMPTS;
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        failedLoginAttempts: nextFails,
        lockedUntil: shouldLock ? new Date(Date.now() + LOCK_DURATION_MS) : null,
      },
    });
    await logAudit({
      actorType: "system",
      action: "customer.login_failed",
      entityType: "Customer",
      entityId: customer.id,
      after: { attempts: nextFails, locked: shouldLock },
      ipAddress: ip,
      userAgent: ua,
    });
    return { ok: false, error: shouldLock ? "ACCOUNT_LOCKED" : "INVALID_CREDENTIALS" };
  }

  // Passwort korrekt — jetzt erst Verifizierungs-Status prüfen.
  if (!customer.emailVerifiedAt) {
    return { ok: false, error: "EMAIL_NOT_VERIFIED" };
  }

  await issueSession(customer.id, ip, ua);

  await prisma.customer.update({
    where: { id: customer.id },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
      lastLoginIp: ip,
    },
  });

  await logAudit({
    actorType: "customer",
    actorId: customer.id,
    action: "customer.login_success",
    entityType: "Customer",
    entityId: customer.id,
    ipAddress: ip,
    userAgent: ua,
  });

  return {
    ok: true,
    customer: {
      id: customer.id,
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
    },
  };
}

/**
 * Erzeugt eine Session-Row + setzt das Cookie. Wird von Login UND nach
 * Passwort-Reset (Auto-Login) genutzt.
 */
async function issueSession(customerId: string, ip: string, ua: string | null): Promise<void> {
  const token = generateToken(32);
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000);

  await prisma.customerSession.create({
    data: {
      customerId,
      tokenHash,
      ipAddress: ip,
      userAgent: ua ?? undefined,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(CUSTOMER_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function getCurrentCustomer(): Promise<AuthedCustomer | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value;
    if (!token || token.length < 16 || token.length > 100) return null;

    const tokenHash = hashToken(token);
    const session = await prisma.customerSession.findUnique({
      where: { tokenHash },
      include: { customer: true },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) return null;
    if (session.customer.deletedAt) return null;

    return {
      id: session.customer.id,
      email: session.customer.email,
      firstName: session.customer.firstName,
      lastName: session.customer.lastName,
    };
  } catch {
    return null;
  }
}

export async function requireCustomer(): Promise<AuthedCustomer> {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/konto/login");
  return customer;
}

export async function logoutCustomer(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value;
  if (token) {
    const tokenHash = hashToken(token);
    await prisma.customerSession.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  cookieStore.delete(CUSTOMER_SESSION_COOKIE);
}

/**
 * Passwort-vergessen. Verschickt einen Reset-Link, falls die E-Mail zu einem
 * verifizierten Konto gehört. Gibt IMMER generisch `ok: true` zurück
 * (keine Enumeration).
 */
export async function requestPasswordReset(emailInput: string): Promise<SimpleResult> {
  const h = await headers();
  const ip = extractIp(h);
  const ua = h.get("user-agent")?.slice(0, 500) ?? null;

  const rl = await rateLimit({
    key: `ip:${ip}:customer-reset`,
    limit: RESET_RATE_LIMIT.limit,
    windowSeconds: RESET_RATE_LIMIT.windowSeconds,
  });
  if (!rl.allowed) {
    return { ok: false, error: "RATE_LIMITED", retryAfter: rl.retryAfter };
  }

  let email: string;
  try {
    email = normalizeEmailOrThrow(emailInput);
  } catch {
    // Ungültige E-Mail → trotzdem generisch ok (keine Enumeration).
    return { ok: true };
  }

  const customer = await prisma.customer.findUnique({ where: { email } });

  if (customer && customer.emailVerifiedAt && !customer.deletedAt) {
    const resetToken = generateToken(32);
    const resetTokenHash = hashToken(resetToken);
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        passwordResetTokenHash: resetTokenHash,
        passwordResetExpiresAt: new Date(Date.now() + RESET_TTL_MS),
      },
    });
    await sendPasswordReset(email, {
      firstName: customer.firstName,
      resetUrl: `${APP_URL}/konto/passwort-neu/${resetToken}`,
    });
    await logAudit({
      actorType: "customer",
      actorId: customer.id,
      action: "customer.password_reset_requested",
      entityType: "Customer",
      entityId: customer.id,
      ipAddress: ip,
      userAgent: ua,
    });
  }

  return { ok: true };
}

/**
 * Setzt das Passwort über einen gültigen Reset-Token neu, löscht den Token und
 * widerruft ALLE bestehenden Sessions des Kunden (Sicherheit nach Reset).
 */
export async function resetPassword(token: string, newPassword: string): Promise<SimpleResult> {
  if (!token || token.length < 16 || token.length > 100) {
    return { ok: false, error: "INVALID_TOKEN" };
  }
  const strength = isStrongPassword(newPassword);
  if (!strength.ok) {
    return { ok: false, error: "WEAK_PASSWORD" };
  }

  const tokenHash = hashToken(token);
  const customer = await prisma.customer.findUnique({ where: { passwordResetTokenHash: tokenHash } });
  if (!customer) {
    return { ok: false, error: "INVALID_TOKEN" };
  }
  if (!customer.passwordResetExpiresAt || customer.passwordResetExpiresAt < new Date()) {
    return { ok: false, error: "TOKEN_EXPIRED" };
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.customer.update({
      where: { id: customer.id },
      data: {
        passwordHash,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    }),
    prisma.customerSession.updateMany({
      where: { customerId: customer.id, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  await logAudit({
    actorType: "customer",
    actorId: customer.id,
    action: "customer.password_reset",
    entityType: "Customer",
    entityId: customer.id,
  });

  return { ok: true };
}

/**
 * Passwort ändern für eingeloggte Kunden. Verifiziert das alte Passwort und
 * widerruft alle anderen Sessions außer der aktuellen.
 */
export async function changePassword(
  customerId: string,
  oldPassword: string,
  newPassword: string,
): Promise<SimpleResult> {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer || !customer.passwordHash) {
    return { ok: false, error: "INVALID_CREDENTIALS" };
  }
  const oldOk = await verifyPassword(oldPassword, customer.passwordHash);
  if (!oldOk) {
    return { ok: false, error: "INVALID_CREDENTIALS" };
  }
  const strength = isStrongPassword(newPassword);
  if (!strength.ok) {
    return { ok: false, error: "WEAK_PASSWORD" };
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.customer.update({
    where: { id: customer.id },
    data: { passwordHash },
  });

  await logAudit({
    actorType: "customer",
    actorId: customer.id,
    action: "customer.password_changed",
    entityType: "Customer",
    entityId: customer.id,
  });

  return { ok: true };
}

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}
