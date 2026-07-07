import prisma from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { logAudit, type ActorType } from "./audit";
import { logError } from "./error-log";
import { releaseDiscount } from "./discount";
import {
  sendShippingNotification,
  sendDeliveryNotification,
  sendCancellationNotification,
  sendWithdrawalReceived,
} from "@/lib/email/send";

interface ActorContext {
  actorType: ActorType;
  actorId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Race-safe Lifecycle-Service.
 *
 * Pattern: Status-Transition als atomarer `updateMany` mit WHERE-Bedingung
 * der den aktuellen Status verlangt. Wenn `count === 0`: Transition wurde
 * von einem anderen Caller bereits durchgeführt → wir skippen sauber.
 */

export async function markOrderShipped(
  orderId: string,
  params: {
    trackingNumber: string;
    carrier: string;
    trackingUrl?: string | null;
    notes?: string | null;
  },
  actor: ActorContext,
): Promise<{ skipped: boolean }> {
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.updateMany({
      where: {
        id: orderId,
        orderStatus: { not: "CANCELLED" },
        paymentStatus: "PAID",
        fulfillmentStatus: { not: "FULFILLED" },
      },
      data: {
        fulfillmentStatus: "FULFILLED",
        fulfilledAt: new Date(),
      },
    });

    if (updated.count === 0) {
      const exists = await tx.order.findUnique({
        where: { id: orderId },
        select: { id: true, orderStatus: true, paymentStatus: true, fulfillmentStatus: true },
      });
      if (!exists) throw new Error("ORDER_NOT_FOUND");
      if (exists.orderStatus === "CANCELLED") throw new Error("ORDER_CANCELLED");
      if (exists.paymentStatus !== "PAID") throw new Error("ORDER_NOT_PAID");
      return { skipped: true, order: null, fulfillmentId: null };
    }

    const order = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: true },
    });

    const fulfillment = await tx.fulfillment.create({
      data: {
        orderId,
        trackingNumber: params.trackingNumber.slice(0, 64),
        carrier: params.carrier.slice(0, 32),
        trackingUrl: params.trackingUrl?.slice(0, 500) ?? undefined,
        notes: params.notes?.slice(0, 500) ?? undefined,
        shippedAt: new Date(),
        items: {
          create: order.items.map((i) => ({
            orderItemId: i.id,
            quantity: i.quantity - i.fulfilledQuantity,
          })),
        },
      },
    });

    for (const item of order.items) {
      await tx.orderItem.update({
        where: { id: item.id },
        data: { fulfilledQuantity: item.quantity },
      });
    }

    return { skipped: false as const, order, fulfillmentId: fulfillment.id };
  });

  if (result.skipped || !result.order) return { skipped: true };

  await logAudit({
    actorType: actor.actorType,
    actorId: actor.actorId,
    action: "order.shipped",
    entityType: "Order",
    entityId: orderId,
    after: {
      trackingNumber: params.trackingNumber,
      carrier: params.carrier,
      fulfillmentId: result.fulfillmentId,
    },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  try {
    await sendShippingNotification(result.order.customerEmail, {
      customerFirstName: result.order.billingFirstName,
      orderNumber: result.order.orderNumber,
      publicToken: result.order.publicToken,
      trackingNumber: params.trackingNumber,
      trackingUrl: params.trackingUrl ?? null,
      carrier: params.carrier,
      estimatedDeliveryRange:
        result.order.estimatedDeliveryMinDays && result.order.estimatedDeliveryMaxDays
          ? `${result.order.estimatedDeliveryMinDays}–${result.order.estimatedDeliveryMaxDays}`
          : "wenigen",
    });
  } catch (err) {
    console.error("[lifecycle] shipping mail failed", err);
    await logAudit({
      actorType: "system",
      action: "mail.shipping_failed",
      entityType: "Order",
      entityId: orderId,
      after: { error: err instanceof Error ? err.message : String(err) },
    });
  }

  return { skipped: false };
}

export async function markOrderDelivered(
  orderId: string,
  actor: ActorContext,
): Promise<{ skipped: boolean }> {
  const updated = await prisma.order.updateMany({
    where: {
      id: orderId,
      orderStatus: { not: "CANCELLED" },
      deliveredAt: null,
      // Pflicht: nur FULFILLED-Orders dürfen auf COMPLETED. Sonst State-Drift
      // (Order zeigt COMPLETED ohne dass je ein Fulfillment in der DB war).
      fulfillmentStatus: "FULFILLED",
    },
    data: {
      orderStatus: "COMPLETED",
      deliveredAt: new Date(),
    },
  });

  if (updated.count === 0) {
    const exists = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, orderStatus: true, deliveredAt: true, fulfillmentStatus: true },
    });
    if (!exists) throw new Error("ORDER_NOT_FOUND");
    if (exists.orderStatus === "CANCELLED") throw new Error("ORDER_CANCELLED");
    if (exists.fulfillmentStatus !== "FULFILLED") throw new Error("ORDER_NOT_SHIPPED");
    return { skipped: true };
  }

  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });

  await logAudit({
    actorType: actor.actorType,
    actorId: actor.actorId,
    action: "order.delivered",
    entityType: "Order",
    entityId: orderId,
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  try {
    await sendDeliveryNotification(order.customerEmail, {
      customerFirstName: order.billingFirstName,
      orderNumber: order.orderNumber,
      publicToken: order.publicToken,
    });
  } catch (err) {
    console.error("[lifecycle] delivery mail failed", err);
  }

  return { skipped: false };
}

export async function cancelOrder(
  orderId: string,
  params: { reason: string; refundCents?: number },
  actor: ActorContext,
): Promise<{ skipped: boolean }> {
  const refundCents = params.refundCents ?? 0;
  if (refundCents < 0) throw new Error("REFUND_AMOUNT_INVALID");

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderStatus: true,
      fulfillmentStatus: true,
      paymentStatus: true,
      totalCents: true,
      refundedCents: true,
      stripePaymentIntentId: true,
      customerEmail: true,
      orderNumber: true,
      billingFirstName: true,
      discountCode: true,
    },
  });
  if (!order) throw new Error("ORDER_NOT_FOUND");
  // Idempotenz: bereits storniert → früher, sauberer Skip (auch VOR jedem Stripe-Call).
  if (order.orderStatus === "CANCELLED") return { skipped: true };
  // Versandte Ware kann nicht storniert werden (das läuft über Widerruf/Retoure).
  if (order.fulfillmentStatus === "FULFILLED") throw new Error("ORDER_ALREADY_SHIPPED");
  if (refundCents > order.totalCents - order.refundedCents) throw new Error("REFUND_EXCEEDS_PAID");

  // ECHTER STRIPE-REFUND — VOR der DB-Markierung.
  // Geld-Sicherheit (analog refundWithdrawnOrder): erst wenn Stripe das Geld real
  // ausgelöst hat, markieren wir die Order als erstattet. Schlägt Stripe fehl,
  // bleibt der Status unverändert → Admin kann erneut auslösen. Doppel-Refund-
  // Schutz über deterministischen Idempotency-Key.
  let stripeRefundId: string | null = null;
  if (refundCents > 0 && order.stripePaymentIntentId) {
    try {
      const stripe = getStripe();
      const refund = await stripe.refunds.create(
        {
          payment_intent: order.stripePaymentIntentId,
          amount: refundCents,
          reason: "requested_by_customer",
          metadata: {
            orderId: order.id,
            orderNumber: order.orderNumber,
            kind: "cancellation",
          },
        },
        { idempotencyKey: `cancel-refund-${order.id}-${refundCents}` },
      );
      stripeRefundId = refund.id;
    } catch (err) {
      console.error("[lifecycle] Stripe-Refund (Storno) fehlgeschlagen", err);
      await logAudit({
        actorType: actor.actorType,
        actorId: actor.actorId,
        action: "order.refund_failed",
        entityType: "Order",
        entityId: orderId,
        after: { refundCents, kind: "cancellation", error: String((err as Error)?.message ?? err) },
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      });
      throw new Error("STRIPE_REFUND_FAILED");
    }
  } else if (refundCents > 0) {
    // Order ohne PaymentIntent (Showroom-Walkin/Test) → DB-only Refund.
    console.warn(
      `[lifecycle] cancelOrder: Order ${orderId} ohne stripePaymentIntentId — DB-only Refund (manuell ausgleichen).`,
    );
  }

  const isFullRefund = refundCents >= order.totalCents - order.refundedCents;
  const updated = await prisma.order.updateMany({
    where: {
      id: orderId,
      orderStatus: { not: "CANCELLED" },
      fulfillmentStatus: { not: "FULFILLED" },
    },
    data: {
      orderStatus: "CANCELLED",
      cancelReason: params.reason.slice(0, 200),
      cancelledAt: new Date(),
      paymentStatus: refundCents > 0 ? (isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED") : undefined,
      refundedCents: order.refundedCents + refundCents,
      refundedAt: refundCents > 0 ? new Date() : null,
    },
  });
  // Zwischen Pre-Check und Update hat ein anderer Caller storniert/versandt → Skip.
  // (Der Stripe-Refund oben ist durch den Idempotency-Key gegen Doppelung geschützt.)
  if (updated.count === 0) {
    // WICHTIG: Wenn oben bereits Geld erstattet wurde, darf das NICHT still
    // verschluckt werden — sonst ist der Refund ohne DB-Beleg (B3-F2). Refund
    // dokumentieren + Admin über ErrorLog/Audit alarmieren.
    if (refundCents > 0) {
      await prisma.refund
        .create({ data: { orderId, amountCents: refundCents, reason: "cancellation_orphaned", stripeRefundId } })
        .catch(() => {});
      await logError({
        source: "lib/services/order-lifecycle",
        error: new Error(
          `ORPHANED_REFUND: Order ${order.orderNumber} — Refund ${refundCents} Cent ausgelöst, aber Storno-Guard blockierte (paralleler Versand/Storno). Manuelle Prüfung nötig.`,
        ),
        context: { op: "cancel_orphaned_refund", orderId, refundCents, stripeRefundId },
      });
      await logAudit({
        actorType: actor.actorType,
        actorId: actor.actorId,
        action: "order.refund_orphaned",
        entityType: "Order",
        entityId: orderId,
        after: { refundCents, stripeRefundId },
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      });
    }
    return { skipped: true };
  }

  // Refund-Beleg nur, wenn tatsächlich erstattet wurde.
  if (refundCents > 0) {
    await prisma.refund.create({
      data: { orderId, amountCents: refundCents, reason: "cancellation", stripeRefundId },
    });
  }

  if (order.discountCode) {
    await releaseDiscount(order.discountCode);
  }

  await logAudit({
    actorType: actor.actorType,
    actorId: actor.actorId,
    action: "order.cancelled",
    entityType: "Order",
    entityId: orderId,
    after: { reason: params.reason, refundCents, stripeRefundId },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  try {
    await sendCancellationNotification(order.customerEmail, {
      customerFirstName: order.billingFirstName,
      orderNumber: order.orderNumber,
      reason: params.reason,
      refundCents: refundCents > 0 ? refundCents : undefined,
    });
  } catch (err) {
    console.error("[lifecycle] cancellation mail failed", err);
  }

  return { skipped: false };
}

/**
 * Refund eines widerrufenen Auftrags nach BGB § 357.
 *
 * **Sicherheits-Garantien (hart):**
 *  - Nur admin/system dürfen refundieren (Customer kann es NIE selbst auslösen)
 *  - Voraussetzung: withdrawalRequestedAt MUSS gesetzt sein
 *  - Wenn Order versandt war (fulfillmentStatus=FULFILLED), MUSS returnReceivedAt
 *    gesetzt sein (Ware physisch zurück). Phase 1 (UNFULFILLED) erlaubt
 *    Direkt-Refund ohne Rückversand.
 *  - Idempotent: doppelter Call mit gleichem Betrag → skipped
 *
 * Dies verhindert das Szenario: "Customer behauptet Rückgabe, Admin sieht aber
 * keinen Eingang" — der Refund kann ohne explizite Admin-Quittung nicht laufen.
 */
export async function refundWithdrawnOrder(
  orderId: string,
  params: {
    refundCents: number;
    /** Wertersatz § 357 Abs. 7 BGB: für Gebrauchsspuren einbehaltener Betrag (Default 0). */
    valueCompensationCents?: number;
    /** Pflicht-Begründung, sobald Wertersatz > 0 einbehalten wird (Rechtsnachweis). */
    valueCompensationReason?: string;
  },
  actor: ActorContext,
): Promise<{ skipped: boolean }> {
  if (actor.actorType !== "admin" && actor.actorType !== "system") {
    throw new Error("FORBIDDEN_ACTOR");
  }
  if (params.refundCents <= 0) throw new Error("REFUND_AMOUNT_INVALID");

  const valueCompensationCents = params.valueCompensationCents ?? 0;
  const valueCompensationReason = params.valueCompensationReason?.trim() ?? "";
  if (valueCompensationCents < 0) throw new Error("VALUE_COMPENSATION_INVALID");
  // § 357 Abs. 7 BGB: Wertersatz ist nur mit Begründung zulässig (Beweislast Händler).
  if (valueCompensationCents > 0 && valueCompensationReason.length === 0) {
    throw new Error("VALUE_COMPENSATION_REASON_REQUIRED");
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderStatus: true,
      paymentStatus: true,
      fulfillmentStatus: true,
      withdrawalRequestedAt: true,
      returnReceivedAt: true,
      totalCents: true,
      refundedCents: true,
      customerEmail: true,
      orderNumber: true,
      billingFirstName: true,
      discountCode: true,
      stripePaymentIntentId: true,
    },
  });
  if (!order) throw new Error("ORDER_NOT_FOUND");
  if (!order.withdrawalRequestedAt) throw new Error("NO_WITHDRAWAL");
  if (order.paymentStatus === "REFUNDED") return { skipped: true };
  if (params.refundCents > order.totalCents - order.refundedCents) {
    throw new Error("REFUND_EXCEEDS_PAID");
  }
  // Netto-Refund (an Kunde) + einbehaltener Wertersatz dürfen den noch offenen
  // Betrag nicht überschreiten — sonst würde "mehr einbehalten als gezahlt".
  if (params.refundCents + valueCompensationCents > order.totalCents - order.refundedCents) {
    throw new Error("VALUE_COMPENSATION_EXCEEDS_TOTAL");
  }

  // KERN-GUARD: Wenn Order versandt war, muss Ware physisch zurück sein.
  if (order.fulfillmentStatus === "FULFILLED" && !order.returnReceivedAt) {
    throw new Error("RETURN_NOT_RECEIVED");
  }

  // ECHTER STRIPE-REFUND — VOR der DB-Markierung.
  // Geld-Sicherheit: Wir markieren die Order erst dann als erstattet, wenn das
  // Geld bei Stripe real ausgelöst wurde. Schlägt Stripe fehl, bleibt der
  // Status unverändert → Admin kann erneut auslösen (keine § 357-Frist-Falle).
  // Doppel-Refund-Schutz über deterministischen Idempotency-Key: bei
  // gleichzeitigen/wiederholten Calls liefert Stripe denselben Refund zurück.
  let stripeRefundId: string | null = null;
  if (order.stripePaymentIntentId) {
    try {
      const stripe = getStripe();
      const refund = await stripe.refunds.create(
        {
          payment_intent: order.stripePaymentIntentId,
          amount: params.refundCents,
          reason: "requested_by_customer",
          metadata: {
            orderId: order.id,
            orderNumber: order.orderNumber,
            kind: "withdrawal",
          },
        },
        { idempotencyKey: `wd-refund-${order.id}-${params.refundCents}` },
      );
      stripeRefundId = refund.id;
    } catch (err) {
      // Stripe-Fehler: DB NICHT als refunded markieren. Audit + sprechender Fehler.
      console.error("[lifecycle] Stripe-Refund fehlgeschlagen", err);
      await logAudit({
        actorType: actor.actorType,
        actorId: actor.actorId,
        action: "order.refund_failed",
        entityType: "Order",
        entityId: orderId,
        after: { refundCents: params.refundCents, error: String((err as Error)?.message ?? err) },
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      });
      throw new Error("STRIPE_REFUND_FAILED");
    }
  } else {
    // Manuelle Order (Showroom-Walkin) oder Test ohne PaymentIntent → DB-only Refund.
    console.warn(
      `[lifecycle] refundWithdrawnOrder: Order ${orderId} ohne stripePaymentIntentId — DB-only Refund (manuell ausgleichen).`,
    );
  }

  const updated = await prisma.order.updateMany({
    where: { id: orderId, paymentStatus: { not: "REFUNDED" }, withdrawalRequestedAt: { not: null } },
    data: {
      paymentStatus: params.refundCents >= order.totalCents - order.refundedCents ? "REFUNDED" : "PARTIALLY_REFUNDED",
      orderStatus: "CANCELLED",
      cancelReason: "withdrawal",
      cancelledAt: new Date(),
      refundedCents: order.refundedCents + params.refundCents,
      refundedAt: new Date(),
    },
  });
  if (updated.count === 0) return { skipped: true };

  // Refund-Record als Beleg für den real ausgelösten Stripe-Refund.
  // Nur der Gewinner des updateMany-Guards (count===1) kommt hierher → kein
  // Konflikt mit dem @unique auf stripeRefundId bei parallelen Calls.
  await prisma.refund.create({
    data: {
      orderId,
      amountCents: params.refundCents,
      reason: "withdrawal",
      valueCompensationCents,
      notes: valueCompensationCents > 0 ? valueCompensationReason : null,
      stripeRefundId,
    },
  });

  if (order.discountCode) {
    await releaseDiscount(order.discountCode);
  }

  await logAudit({
    actorType: actor.actorType,
    actorId: actor.actorId,
    action: "order.withdrawal_refunded",
    entityType: "Order",
    entityId: orderId,
    after: {
      refundCents: params.refundCents,
      valueCompensationCents,
      valueCompensationReason: valueCompensationCents > 0 ? valueCompensationReason : null,
    },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  try {
    await sendCancellationNotification(order.customerEmail, {
      customerFirstName: order.billingFirstName,
      orderNumber: order.orderNumber,
      reason: "Ihr Widerruf wurde bearbeitet, das Geld ist auf dem Weg.",
      refundCents: params.refundCents,
      valueCompensationCents: valueCompensationCents > 0 ? valueCompensationCents : undefined,
      valueCompensationReason: valueCompensationCents > 0 ? valueCompensationReason : undefined,
    });
  } catch (err) {
    console.error("[lifecycle] withdrawal refund mail failed", err);
  }

  return { skipped: false };
}

/**
 * Customer-Widerruf nach BGB § 355.
 * Setzt withdrawalRequestedAt + withdrawalReason atomar via updateMany-Guard.
 * KEIN Refund — der erfolgt separat NACH markReturnReceived.
 */
export async function registerWithdrawal(
  orderId: string,
  params: { reason?: string },
  actor: ActorContext,
): Promise<{ skipped: boolean }> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("ORDER_NOT_FOUND");
  if (order.orderStatus !== "COMPLETED" && order.orderStatus !== "CONFIRMED") {
    throw new Error("ORDER_NOT_RETURNABLE");
  }
  if (order.withdrawalRequestedAt) {
    return { skipped: true };
  }

  const updated = await prisma.order.updateMany({
    where: { id: orderId, withdrawalRequestedAt: null, orderStatus: { not: "CANCELLED" } },
    data: {
      withdrawalRequestedAt: new Date(),
      withdrawalReason: params.reason?.slice(0, 2000) ?? null,
    },
  });
  if (updated.count === 0) return { skipped: true };

  await logAudit({
    actorType: actor.actorType,
    actorId: actor.actorId,
    action: "order.withdrawal_received",
    entityType: "Order",
    entityId: orderId,
    after: { reason: params.reason ?? null },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  try {
    await sendWithdrawalReceived(order.customerEmail, {
      customerFirstName: order.billingFirstName,
      orderNumber: order.orderNumber,
      publicToken: order.publicToken,
    });
  } catch (err) {
    console.error("[lifecycle] withdrawal mail failed", err);
  }

  return { skipped: false };
}

/**
 * Admin markiert: Ware ist physisch zurück.
 *
 * **WICHTIG (Sicherheits-Gate):**
 *  - Nur admin/system dürfen das setzen, NIE customer (Server-Action garantiert das)
 *  - Voraussetzung: withdrawalRequestedAt MUSS gesetzt sein (sonst NO_WITHDRAWAL)
 *  - Idempotent: doppelter Call → skipped:true
 *
 * Erst danach darf der Refund laufen (siehe cancelOrder Refund-Guard).
 */
export async function markReturnReceived(
  orderId: string,
  params: { trackingNumber?: string | null },
  actor: ActorContext,
): Promise<{ skipped: boolean }> {
  if (actor.actorType !== "admin" && actor.actorType !== "system") {
    throw new Error("FORBIDDEN_ACTOR");
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, withdrawalRequestedAt: true, returnReceivedAt: true, customerEmail: true, orderNumber: true },
  });
  if (!order) throw new Error("ORDER_NOT_FOUND");
  if (!order.withdrawalRequestedAt) throw new Error("NO_WITHDRAWAL");
  if (order.returnReceivedAt) return { skipped: true };

  const updated = await prisma.order.updateMany({
    where: { id: orderId, withdrawalRequestedAt: { not: null }, returnReceivedAt: null },
    data: {
      returnReceivedAt: new Date(),
      returnTrackingNumber: params.trackingNumber?.slice(0, 200) ?? null,
    },
  });
  if (updated.count === 0) return { skipped: true };

  await logAudit({
    actorType: actor.actorType,
    actorId: actor.actorId,
    action: "order.return_received",
    entityType: "Order",
    entityId: orderId,
    after: { trackingNumber: params.trackingNumber ?? null },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  return { skipped: false };
}
