/**
 * DEPRECATED — pre-Stage-4 Auth.
 *
 * Diese Funktionen prüften nur ein statisches ENV-Password gegen den Cookie-Wert.
 * Seit Stage 4 läuft die Admin-Auth über `lib/services/admin-auth.ts` (argon2id +
 * Database-Sessions + Rate-Limit + Audit).
 *
 * Diese Datei bleibt nur, um Build-Fehler in alten API-Routes (Stage 1-3) zu
 * vermeiden, die Pfade hieraus importieren. Sie leiten alle auf das neue System weiter.
 */

import { NextRequest } from "next/server";
import { getCurrentAdmin, requireAdmin } from "@/lib/services/admin-auth";

export async function requireAdminAuth() {
  await requireAdmin();
}

export async function checkAdminRequest(_req: NextRequest): Promise<boolean> {
  const admin = await getCurrentAdmin();
  return admin !== null;
}

/** @deprecated — Stage-4-Auth nutzt admin-auth.loginAdminAction */
export function checkAdminPassword(_password: string): boolean {
  throw new Error("DEPRECATED — use loginAdminAction");
}
