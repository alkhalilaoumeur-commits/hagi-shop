import prisma from "@/lib/prisma";
import { generateTotpSecret, totpQrDataUrl, verifyTotp } from "@/lib/security/totp";
import { logAudit } from "./audit";

/**
 * Admin-2FA (TOTP) — Einrichtung & Deaktivierung.
 *
 * Der eigentliche Login-Gate sitzt in `admin-auth.ts:loginAdmin` (prüft
 * `totpEnabledAt`). Hier: Enrollment-Flow.
 *
 * Hinweis: `totpSecret` liegt (wie im bestehenden Schema vorgesehen) im Klartext
 * in der DB. Künftige Härtung: verschlüsselt at-rest ablegen.
 */

export async function isTotpEnabled(adminId: string): Promise<boolean> {
  const a = await prisma.admin.findUnique({
    where: { id: adminId },
    select: { totpEnabledAt: true },
  });
  return Boolean(a?.totpEnabledAt);
}

/**
 * Schritt 1: erzeugt ein NEUES Secret und speichert es als "pending"
 * (totpSecret gesetzt, totpEnabledAt bleibt null → Login wird noch NICHT
 * gegated). Liefert QR-Code zum Scannen. Erst `confirm` schaltet 2FA scharf.
 */
export async function startTotpEnrollment(
  adminId: string,
  accountEmail: string,
): Promise<{ qrDataUrl: string; secret: string }> {
  const secret = generateTotpSecret();
  await prisma.admin.update({
    where: { id: adminId },
    data: { totpSecret: secret, totpEnabledAt: null },
  });
  const qrDataUrl = await totpQrDataUrl(secret, accountEmail);
  return { qrDataUrl, secret };
}

/** Schritt 2: Code aus der App prüfen → 2FA aktivieren. */
export async function confirmTotpEnrollment(
  adminId: string,
  token: string,
  actorIp?: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const admin = await prisma.admin.findUnique({
    where: { id: adminId },
    select: { totpSecret: true, totpEnabledAt: true },
  });
  if (!admin?.totpSecret) return { ok: false, error: "NO_PENDING_SECRET" };
  if (admin.totpEnabledAt) return { ok: false, error: "ALREADY_ENABLED" };
  if (!verifyTotp(token, admin.totpSecret)) return { ok: false, error: "INVALID_TOTP" };

  await prisma.admin.update({
    where: { id: adminId },
    data: { totpEnabledAt: new Date() },
  });
  await logAudit({
    actorType: "admin",
    actorId: adminId,
    action: "admin.totp_enabled",
    entityType: "Admin",
    entityId: adminId,
    ipAddress: actorIp,
  });
  return { ok: true };
}

/** 2FA deaktivieren — nur mit gültigem aktuellem Code (Schutz gegen Übernahme). */
export async function disableTotp(
  adminId: string,
  token: string,
  actorIp?: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const admin = await prisma.admin.findUnique({
    where: { id: adminId },
    select: { totpSecret: true, totpEnabledAt: true },
  });
  if (!admin?.totpEnabledAt || !admin.totpSecret) return { ok: false, error: "NOT_ENABLED" };
  if (!verifyTotp(token, admin.totpSecret)) return { ok: false, error: "INVALID_TOTP" };

  await prisma.admin.update({
    where: { id: adminId },
    data: { totpSecret: null, totpEnabledAt: null },
  });
  await logAudit({
    actorType: "admin",
    actorId: adminId,
    action: "admin.totp_disabled",
    entityType: "Admin",
    entityId: adminId,
    ipAddress: actorIp,
  });
  return { ok: true };
}
