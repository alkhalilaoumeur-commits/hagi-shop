import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import prisma from "@/lib/prisma";
import { sendOrderConfirmation } from "@/lib/email/send";
import { recordReceive, markProcessed, markError } from "@/lib/services/webhook-dedup";
import { releaseDiscount } from "@/lib/services/discount";
import { logAudit } from "@/lib/services/audit";
import { logError } from "@/lib/services/error-log";
import type { Prisma } from "@prisma/client";
import type Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 1_000_000;

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
      payload: event as unknown as Prisma.InputJsonValue,
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

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: "PAID",
      orderStatus: "CONFIRMED",
      paidCents,
      paidAt: new Date(),
      confirmedAt: new Date(),
      stripePaymentIntentId: paymentIntentId ?? order.stripePaymentIntentId,
      paymentMethodType: charge?.type ?? null,
      paymentMethodLast4: charge?.last4 ?? null,
    },
    include: { items: true },
  });

  await logAudit({
    actorType: "webhook",
    action: "order.paid",
    entityType: "Order",
    entityId: updated.id,
    after: { orderNumber: updated.orderNumber, paidCents },
  });

  try {
    await sendOrderConfirmation(updated.customerEmail, {
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
    });
  } catch (mailErr) {
    console.error("[webhook] confirmation mail failed", mailErr);
    await logAudit({
      actorType: "webhook",
      action: "mail.confirmation_failed",
      entityType: "Order",
      entityId: updated.id,
      after: { error: mailErr instanceof Error ? mailErr.message : String(mailErr) },
    });
  }
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
  const order = await prisma.order.findFirst({
    where: { stripePaymentIntentId: intent.id },
    select: { id: true, discountCode: true, paymentStatus: true, orderNumber: true },
  });
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
