import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import prisma from "@/lib/prisma";
import { sendOrderConfirmation } from "@/lib/email/send";
import { recordReceive, markProcessed, markError } from "@/lib/services/webhook-dedup";
import { releaseDiscount } from "@/lib/services/discount";
import { claimUniqueStock } from "@/lib/services/stock";
import { redactStripeEvent } from "@/lib/services/stripe-redact";
import { logAudit } from "@/lib/services/audit";
import { logError } from "@/lib/services/error-log";
import type { Prisma } from "@prisma/client";
import type Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 1_000_000;

/** Wird geworfen, wenn ein bereits verkauftes Unikat erneut bezahlt wurde. */
class OversoldError extends Error {
  constructor(public readonly productIds: string[]) {
    super("OVERSOLD");
  }
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !secret) {
    return NextResponse.json({ error: "missing_signature_or_secret" }, { status: 400 });
  }

  const rawBody = await req.text();
  if (rawBody.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    console.error("[webhook] signature verify failed", err);
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  let recordId: string | null = null;
  try {
    const received = await recordReceive({
      provider: "stripe",
      providerEventId: event.id,
      eventType: event.type,
      payload: redactStripeEvent(event),
      signature: sig,
    });

    if (received.alreadyProcessed) {
      return NextResponse.json({ received: true, dedup: true });
    }
    recordId = received.recordId;

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session, recordId);
        break;
      case "checkout.session.expired":
        await handleCheckoutSessionExpired(event.data.object as Stripe.Checkout.Session);
        break;
      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      default:
        await markProcessed(recordId);
        return NextResponse.json({ received: true, ignored: event.type });
    }

    await markProcessed(recordId);
    return NextResponse.json({ received: true, ok: true });
  } catch (err) {
    await logError({ source: "api/stripe/webhook", error: err, context: { eventId: event.id, eventType: event.type } });
    if (recordId) {
      await markError(recordId, err instanceof Error ? err.message : String(err));
    }
    return NextResponse.json({ error: "handler_failed" }, { status: 500 });
  }
}

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3, delayMs = 800): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, delayMs * attempt));
      }
    }
  }
  throw lastErr;
}

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
  recordId: string,
) {
  let order = await prisma.order.findUnique({
    where: { stripeSessionId: session.id },
    include: { items: true },
  });
  if (!order && session.client_reference_id) {
    order = await prisma.order.findUnique({
      where: { id: session.client_reference_id },
      include: { items: true },
    });
    if (order && !order.stripeSessionId) {
      await prisma.order.update({
        where: { id: order.id },
        data: { stripeSessionId: session.id },
      });
    }
  }
  if (!order) {
    console.warn("[webhook] no order for session", session.id);
    return;
  }

  if (order.paymentStatus === "PAID") {
    await markProcessed(recordId, order.id);
    return;
  }

  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : null;
  const paidCents = session.amount_total ?? order.totalCents;

  if (Math.abs(paidCents - order.totalCents) > 100) {
    await logAudit({
      actorType: "webhook",
      action: "order.amount_mismatch",
      entityType: "Order",
      entityId: order.id,
      after: {
        expected: order.totalCents,
        received: paidCents,
        diff: paidCents - order.totalCents,
      },
    });
  }

  const charge = await getPaymentMethodInfo(paymentIntentId);

  const productIds = order.items.map((i) => i.productId).filter((id): id is string => id !== null);

  // Bestands-Claim und PAID-Markierung in EINER Transaktion: verhindert
  // Doppelverkauf von Unikaten (zwei bezahlte Orders auf denselben Teppich) und
  // bleibt idempotent gegen Stripe-Webhook-Retries (rollt bei Oversold komplett zurück).
  const updated = await confirmPaidOrder(order, productIds, {
    paidCents,
    paymentIntentId,
    paymentMethodType: charge?.type ?? null,
    paymentMethodLast4: charge?.last4 ?? null,
  });
  if (!updated) return; // Oversold: Unikat war schon verkauft → in confirmPaidOrder erstattet + storniert

  await logAudit({
    actorType: "webhook",
    action: "order.paid",
    entityType: "Order",
    entityId: updated.id,
    after: { orderNumber: updated.orderNumber, paidCents },
  });

  try {
    await withRetry(() =>
      sendOrderConfirmation(updated.customerEmail, {
        customerFirstName: updated.billingFirstName,
        orderNumber: updated.orderNumber,
        publicToken: updated.publicToken,
        items: updated.items.map((i) => ({
          title: i.productTitle,
          sku: i.productSku,
          quantity: i.quantity,
          unitPriceCents: i.unitPriceCents,
          totalCents: i.subtotalCents,
          imageUrl: i.productImageUrl,
        })),
        subtotalCents: updated.subtotalCents,
        shippingCents: updated.shippingCents,
        discountCents: updated.discountCents,
        totalCents: updated.totalCents,
        shippingMethodName: updated.shippingMethodName ?? "Versand",
        estimatedDeliveryRange:
          updated.estimatedDeliveryMinDays && updated.estimatedDeliveryMaxDays
            ? `${updated.estimatedDeliveryMinDays}–${updated.estimatedDeliveryMaxDays}`
            : "in Kürze",
        isPickup: updated.deliveryType === "PICKUP",
      }),
    );
  } catch (mailErr) {
    console.error("[webhook] confirmation mail failed after retries", mailErr);
    await logAudit({
      actorType: "webhook",
      action: "mail.confirmation_failed",
      entityType: "Order",
      entityId: updated.id,
      after: { error: mailErr instanceof Error ? mailErr.message : String(mailErr) },
    });
  }
}

/**
 * Setzt die Order in EINER Transaktion auf PAID/CONFIRMED und claimt die Unikate.
 * Wirft intern `OversoldError`, wenn ein Unikat bereits verkauft war — dann wird
 * die Transaktion zurückgerollt (kein Bestand geändert, Order nicht PAID) und der
 * Kunde in `handleOversoldOrder` automatisch erstattet + die Order storniert.
 * Rückgabe `null` = Oversold behandelt; sonst die aktualisierte Order inkl. Items.
 */
async function confirmPaidOrder(
  order: { id: string; discountCode: string | null; orderNumber: string; stripePaymentIntentId: string | null },
  productIds: string[],
  opts: {
    paidCents: number;
    paymentIntentId: string | null;
    paymentMethodType: string | null;
    paymentMethodLast4: string | null;
  },
) {
  try {
    return await prisma.$transaction(async (tx) => {
      const { unavailable } = await claimUniqueStock(tx, productIds);
      if (unavailable.length > 0) throw new OversoldError(unavailable);
      return tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: "PAID",
          orderStatus: "CONFIRMED",
          paidCents: opts.paidCents,
          paidAt: new Date(),
          confirmedAt: new Date(),
          stripePaymentIntentId: opts.paymentIntentId ?? order.stripePaymentIntentId,
          paymentMethodType: opts.paymentMethodType,
          paymentMethodLast4: opts.paymentMethodLast4,
        },
        include: { items: true },
      });
    });
  } catch (err) {
    if (err instanceof OversoldError) {
      await handleOversoldOrder(order, opts.paymentIntentId, opts.paidCents, err.productIds);
      return null;
    }
    throw err;
  }
}

/**
 * Der Kunde hat für ein bereits verkauftes Unikat bezahlt. Voll erstatten (echter
 * Stripe-Refund, idempotent), Order stornieren, Rabatt freigeben, Admin alarmieren.
 */
async function handleOversoldOrder(
  order: { id: string; discountCode: string | null; orderNumber: string; stripePaymentIntentId: string | null },
  paymentIntentId: string | null,
  paidCents: number,
  productIds: string[],
) {
  let refunded = false;
  if (paymentIntentId) {
    try {
      const stripe = getStripe();
      await stripe.refunds.create(
        { payment_intent: paymentIntentId, reason: "duplicate" },
        { idempotencyKey: `oversold-refund-${order.id}` },
      );
      refunded = true;
    } catch (refundErr) {
      await logError({
        source: "api/stripe/webhook",
        error: refundErr,
        context: { op: "oversold_refund_failed", orderId: order.id, orderNumber: order.orderNumber },
      });
    }
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: refunded ? "REFUNDED" : "PAID",
      orderStatus: "CANCELLED",
      paidCents,
      paidAt: new Date(),
      stripePaymentIntentId: paymentIntentId ?? order.stripePaymentIntentId,
      cancelReason: "oversold_unique_item",
      cancelledAt: new Date(),
      ...(refunded ? { refundedCents: paidCents, refundedAt: new Date() } : {}),
    },
  });

  if (order.discountCode) {
    await releaseDiscount(order.discountCode).catch(() => {});
  }

  await logAudit({
    actorType: "webhook",
    action: "order.oversold",
    entityType: "Order",
    entityId: order.id,
    after: { orderNumber: order.orderNumber, refunded, paidCents, productIds },
  });

  // Als Fehler protokollieren, damit es im Admin-Sicherheits-Dashboard sichtbar wird.
  await logError({
    source: "api/stripe/webhook",
    error: new Error(
      `OVERSOLD: Unikat(e) ${productIds.join(", ")} bereits verkauft, Order ${order.orderNumber} ${refunded ? "automatisch erstattet" : "NICHT erstattet — manueller Refund nötig!"}`,
    ),
    context: { op: "oversold", orderId: order.id, orderNumber: order.orderNumber, refunded },
  });
}

async function handleCheckoutSessionExpired(session: Stripe.Checkout.Session) {
  const order = await prisma.order.findUnique({
    where: { stripeSessionId: session.id },
    select: { id: true, discountCode: true, paymentStatus: true, orderNumber: true },
  });
  if (!order || order.paymentStatus === "PAID") return;

  await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: "EXPIRED",
      orderStatus: "CANCELLED",
      cancelReason: "stripe_session_expired",
      cancelledAt: new Date(),
    },
  });
  if (order.discountCode) {
    await releaseDiscount(order.discountCode);
  }
  await logAudit({
    actorType: "webhook",
    action: "order.expired",
    entityType: "Order",
    entityId: order.id,
    after: { orderNumber: order.orderNumber },
  });
}

async function handlePaymentIntentFailed(intent: Stripe.PaymentIntent) {
  let order = await prisma.order.findFirst({
    where: { stripePaymentIntentId: intent.id },
    select: { id: true, discountCode: true, paymentStatus: true, orderNumber: true },
  });

  // Fallback: PI-ID war bei Session-Erstellung noch nicht gesetzt → über Session-ID suchen
  if (!order) {
    try {
      const stripe = getStripe();
      const sessions = await stripe.checkout.sessions.list({ payment_intent: intent.id, limit: 1 });
      const sessionId = sessions.data[0]?.id;
      if (sessionId) {
        order = await prisma.order.findFirst({
          where: { stripeSessionId: sessionId },
          select: { id: true, discountCode: true, paymentStatus: true, orderNumber: true },
        });
      }
    } catch {
      // Stripe-Lookup-Fehler ist nicht kritisch — Order bleibt unverändert
    }
  }

  if (!order || order.paymentStatus === "PAID") return;

  await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: "FAILED",
      orderStatus: "CANCELLED",
      cancelReason: "payment_failed",
      cancelledAt: new Date(),
    },
  });
  if (order.discountCode) {
    await releaseDiscount(order.discountCode);
  }
  await logAudit({
    actorType: "webhook",
    action: "order.payment_failed",
    entityType: "Order",
    entityId: order.id,
    after: { orderNumber: order.orderNumber, reason: intent.last_payment_error?.message?.slice(0, 200) },
  });
}

async function getPaymentMethodInfo(
  paymentIntentId: string | null,
): Promise<{ type: string; last4: string | null } | null> {
  if (!paymentIntentId) return null;
  try {
    const stripe = getStripe();
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ["payment_method"],
    });
    const pm = intent.payment_method;
    if (!pm || typeof pm === "string") return null;
    return {
      type: pm.type,
      last4: pm.card?.last4 ?? null,
    };
  } catch {
    return null;
  }
}
