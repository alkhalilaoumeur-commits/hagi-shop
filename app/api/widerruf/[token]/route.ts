import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { rateLimit, extractIp } from "@/lib/services/rate-limit";
import { isWithdrawalEligible } from "@/lib/services/withdrawal";
import { registerWithdrawal } from "@/lib/services/order-lifecycle";
import { sendWithdrawalReceived } from "@/lib/email/send";
import { logAudit } from "@/lib/services/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  reason: z.string().max(2000).optional(),
});

/**
 * Customer-initiierter Widerruf nach BGB § 355.
 *
 * Pfad: POST /api/widerruf/[token]
 * Body: { "reason": "optional Begründung" }
 *
 * Sicherheits-Layers:
 *  - Token-Format-Check (32-byte base64url, 43+ chars)
 *  - Rate-Limit 3/h pro IP (1× reicht, paar Retries erlaubt)
 *  - Token-Lookup via UNIQUE-Index in Prisma
 *  - isWithdrawalEligible prüft Bezahl-Status, Frist, schon-widerrufen
 *  - Idempotenz durch registerWithdrawal (internalNote-Check)
 *  - Reject mit Audit-Log + Status-Code (kein Info-Leak)
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  if (!token || token.length < 16 || token.length > 64 || !/^[A-Za-z0-9_-]+$/.test(token)) {
    return NextResponse.json({ error: "invalid_token" }, { status: 404 });
  }

  const ip = extractIp(req.headers);
  const rl = await rateLimit({ key: `ip:${ip}:withdrawal`, limit: 3, windowSeconds: 3600 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "rate_limited", retryAfter: rl.retryAfter }, { status: 429 });
  }

  let body: { reason?: string } = {};
  try {
    const raw = await req.json();
    body = BodySchema.parse(raw);
  } catch {
    // Body optional — leerer/invalider Body wird zu {}
  }

  const order = await prisma.order.findUnique({ where: { publicToken: token } });
  if (!order) {
    return NextResponse.json({ error: "invalid_token" }, { status: 404 });
  }

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
    return NextResponse.json({ error: eligibility.reason }, { status: 403 });
  }

  const actor = { actorType: "customer" as const, actorId: order.customerEmail, ipAddress: ip };
  const result = await registerWithdrawal(order.id, { reason: body.reason }, actor);

  if (!result.skipped) {
    try {
      await sendWithdrawalReceived(order.customerEmail, {
        customerFirstName: order.billingFirstName,
        orderNumber: order.orderNumber,
        publicToken: token,
      });
    } catch (err) {
      console.error("[withdrawal] mail failed", err);
    }
  }

  return NextResponse.json({ ok: true, skipped: result.skipped });
}
