"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { requireAdmin } from "@/lib/services/admin-auth";
import {
  startTotpEnrollment,
  confirmTotpEnrollment,
  disableTotp,
} from "@/lib/services/admin-2fa";
import { extractIp } from "@/lib/services/rate-limit";

const tokenSchema = z.object({ token: z.string().trim().regex(/^\d{6}$/) });

export async function startTotpEnrollmentAction(): Promise<
  { ok: true; qrDataUrl: string; secret: string } | { ok: false; error: string }
> {
  const admin = await requireAdmin();
  const { qrDataUrl, secret } = await startTotpEnrollment(admin.id, admin.email);
  return { ok: true, qrDataUrl, secret };
}

export async function confirmTotpEnrollmentAction(
  rawInput: unknown,
): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin();
  const parsed = tokenSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, error: "INVALID_TOTP" };
  const ip = extractIp(await headers());
  return confirmTotpEnrollment(admin.id, parsed.data.token, ip);
}

export async function disableTotpAction(
  rawInput: unknown,
): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin();
  const parsed = tokenSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, error: "INVALID_TOTP" };
  const ip = extractIp(await headers());
  return disableTotp(admin.id, parsed.data.token, ip);
}
