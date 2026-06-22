"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { loginAdmin, logoutAdmin } from "@/lib/services/admin-auth";

const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(256),
  totpToken: z.string().trim().max(10).optional(),
});

export type LoginResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: string; retryAfter?: number };

export async function loginAdminAction(rawInput: unknown): Promise<LoginResult> {
  const parsed = loginSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: "INVALID_INPUT" };
  }
  const result = await loginAdmin(parsed.data.email, parsed.data.password, parsed.data.totpToken);
  if (!result.ok) {
    return { ok: false, error: result.error, retryAfter: result.retryAfter };
  }
  return { ok: true, redirectTo: "/admin" };
}

export async function logoutAdminAction(): Promise<void> {
  await logoutAdmin();
  redirect("/admin/login");
}
