"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import {
  registerCustomer,
  loginCustomer,
  logoutCustomer,
  requestPasswordReset,
  resetPassword,
  changePassword,
  requireCustomer,
} from "@/lib/services/customer-auth";

/**
 * Server-Actions für das Kundenkonto. Muster aus app/actions/admin-auth.ts:
 * Zod-`safeParse`, discriminated-union-Result, Redirect nicht in der Action,
 * sondern als `redirectTo`-String (Client navigiert), außer beim Logout.
 */

export type ActionResult =
  | { ok: true; redirectTo?: string }
  | { ok: false; error: string; retryAfter?: number };

const registerSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(256),
  firstName: z.string().max(120).optional(),
  lastName: z.string().max(120).optional(),
});

export async function registerCustomerAction(rawInput: unknown): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: "INVALID_INPUT" };
  }
  const res = await registerCustomer(
    parsed.data.email,
    parsed.data.password,
    parsed.data.firstName,
    parsed.data.lastName,
  );
  if (!res.ok) return res;
  return { ok: true };
}

const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(256),
});

export async function loginCustomerAction(rawInput: unknown): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: "INVALID_INPUT" };
  }
  const result = await loginCustomer(parsed.data.email, parsed.data.password);
  if (!result.ok) {
    return { ok: false, error: result.error, retryAfter: result.retryAfter };
  }
  return { ok: true, redirectTo: "/konto" };
}

export async function logoutCustomerAction(): Promise<void> {
  await logoutCustomer();
  redirect("/konto/login");
}

const emailOnlySchema = z.object({ email: z.string().email().max(254) });

export async function requestPasswordResetAction(rawInput: unknown): Promise<ActionResult> {
  const parsed = emailOnlySchema.safeParse(rawInput);
  // Bei ungültigem Input dennoch generisch ok (keine Enumeration).
  if (!parsed.success) return { ok: true };
  const res = await requestPasswordReset(parsed.data.email);
  if (!res.ok) return res;
  return { ok: true };
}

const resetSchema = z.object({
  token: z.string().min(16).max(100),
  password: z.string().min(1).max(256),
});

export async function resetPasswordAction(rawInput: unknown): Promise<ActionResult> {
  const parsed = resetSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: "INVALID_INPUT" };
  }
  const res = await resetPassword(parsed.data.token, parsed.data.password);
  if (!res.ok) return res;
  return { ok: true, redirectTo: "/konto/login" };
}

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1).max(256),
  newPassword: z.string().min(1).max(256),
});

export async function changePasswordAction(rawInput: unknown): Promise<ActionResult> {
  const parsed = changePasswordSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: "INVALID_INPUT" };
  }
  const customer = await requireCustomer();
  const res = await changePassword(customer.id, parsed.data.oldPassword, parsed.data.newPassword);
  if (!res.ok) return res;
  return { ok: true };
}
