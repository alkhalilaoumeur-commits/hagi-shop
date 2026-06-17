"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { rateLimit, extractIp } from "@/lib/services/rate-limit";
import { isWithdrawalEligible } from "@/lib/services/withdrawal";
import { registerWithdrawal } from "@/lib/services/order-lifecycle";
import { sendWithdrawalReceived } from "@/lib/email/send";
import { logAudit } from "@/lib/services/audit";
import { normalizeEmail } from "@/lib/security/email";

const LookupSchema = z.object({
  orderNumber: z.string().min(3).max(50),
  email: z.string().email().max(254),
});

const SubmitSchema = z.object({
  token: z.string().min(16).max(64).regex(/^[A-Za-z0-9_-]+$/),
  reason: z.string().max(2000).optional(),
});

/**
 * Findet eine Order anhand Order-Nummer + Email und leitet zur Widerruf-Seite weiter.
 * Bei Mismatch: redirect mit allgemeinem Fehler (kein Info-Leak ob Order existiert).
 */
export async function lookupOrderForWithdrawal(formData: FormData) {
  const h = await headers();
  const ip = extractIp(h);
  const rl = await rateLimit({ key: `ip:${ip}:withdrawal_lookup`, limit: 10, windowSeconds: 600 });
  if (!rl.allowed) redirect("/widerruf-antrag?error=rate_limited");

  const parsed = LookupSchema.safeParse({
    orderNumber: formData.get("orderNumber"),
    email: formData.get("email"),
  });
  if (!parsed.success) redirect("/widerruf-antrag?error=invalid");

  const normalizedEmail = normalizeEmail(parsed.data.email);
  if (!normalizedEmail) redirect("/widerruf-antrag?error=invalid");

  const order = await prisma.order.findFirst({
    where: { orderNumber: parsed.data.orderNumber, customerEmail: normalizedEmail },
    select: { publicToken: true },
  });
  if (!order) redirect("/widerruf-antrag?error=notfound");

  redirect(`/widerruf-antrag/${order.publicToken}`);
}

/**
 * Customer reicht Widerruf ein.
 * Token aus URL-Path → server-side validiert.
 */
export async function submitWithdrawal(formData: FormData) {
  const h = await headers();
  const ip = extractIp(h);
  const rl = await rateLimit({ key: `ip:${ip}:withdrawal_submit`, limit: 3, windowSeconds: 3600 });
  if (!rl.allowed) redirect("/widerruf-antrag?error=rate_limited");

  const parsed = SubmitSchema.safeParse({
    token: formData.get("token"),
    reason: formData.get("reason") || undefined,
  });
  if (!parsed.success) redirect("/widerruf-antrag?error=invalid");

  const order = await prisma.order.findUnique({ where: { publicToken: parsed.data.token } });
  if (!order) redirect("/widerruf-antrag?error=notfound");

  const eligibility = isWithdrawalEligible(order);
  if (!eligibility.eligible) {
    await logAudit({
      actorType: "customer",
      action: "order.withdrawal_rejected",
      entityType: "Order",
      entityId: order.id,
      after: { reason: eligibility.reason },
      ipAddress: ip,
    });
    redirect(`/widerruf-antrag/${parsed.data.token}?error=${eligibility.reason}`);
  }

  const actor = { actorType: "customer" as const, actorId: order.customerEmail, ipAddress: ip };
  const result = await registerWithdrawal(order.id, { reason: parsed.data.reason }, actor);

  if (!result.skipped) {
    try {
      await sendWithdrawalReceived(order.customerEmail, {
        customerFirstName: order.billingFirstName,
        orderNumber: order.orderNumber,
        publicToken: parsed.data.token,
      });
    } catch (err) {
      console.error("[withdrawal-action] mail failed", err);
    }
  }

  redirect(`/widerruf-antrag/${parsed.data.token}/erfolg`);
}
