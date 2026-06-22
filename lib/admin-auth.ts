/**
 * Dünner Kompatibilitäts-Wrapper auf das aktuelle Auth-System.
 *
 * Seit Stage 4 läuft die Admin-Auth über `lib/services/admin-auth.ts`
 * (argon2id + Database-Sessions + Rate-Limit + Audit). Diese Datei existiert
 * nur noch, damit ältere Server-Pages weiter `requireAdminAuth()` importieren
 * können. Die früheren ENV-Passwort-Funktionen (`checkAdminRequest`,
 * `checkAdminPassword`) wurden entfernt — sie waren durch einen fehlenden
 * `await` faktisch wirkungslos (Security-Fix 2026-06-22).
 */

import { requireAdmin } from "@/lib/services/admin-auth";

export async function requireAdminAuth() {
  await requireAdmin();
}
