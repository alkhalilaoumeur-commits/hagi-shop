import prisma from "@/lib/prisma";
import { logAudit, type ActorType } from "./audit";
import { releaseDiscount } from "./discount";
import {
  sendShippingNotification,
  sendDeliveryNotification,
  sendCancellationNotification,
  sendWithdrawalReceived,
} from "@/lib/email/send";

interface ActorContext {
  actorType: ActorType;
  actorId?: string;
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
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.updateMany({
      where: {
        id: orderId,
        orderStatus: { not: "CANCELLED" },
        fulfillmentStatus: { not: "FULFILLED" },
      },
      data: {
        orderStatus: "CANCELLED",
        cancelReason: params.reason.slice(0, 200),
        cancelledAt: new Date(),
        paymentStatus: params.refundCents ? "REFUNDED" : undefined,
        refundedCents: params.refundCents ?? 0,
        refundedAt: params.refundCents ? new Date() : null,
      },
    });
    if (updated.count === 0) {
      const exists = await tx.order.findUnique({
        where: { id: orderId },
        select: { id: true, orderStatus: true, fulfillmentStatus: true },
      });
      if (!exists) throw new Error("ORDER_NOT_FOUND");
      if (exists.fulfillmentStatus === "FULFILLED") throw new Error("ORDER_ALREADY_SHIPPED");
      return { skipped: true as const, order: null };
    }
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
    return { skipped: false as const, order };
  });

  if (result.skipped || !result.order) return { skipped: true };

  if (result.order.discountCode) {
    await releaseDiscount(result.order.discountCode);
  }

  await logAudit({
    actorType: actor.actorType,
    actorId: actor.actorId,
    action: "order.cancelled",
    entityType: "Order",
    entityId: orderId,
    after: { reason: params.reason, refundCents: params.refundCents ?? 0 },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  try {
    await sendCancellationNotification(result.order.customerEmail, {
      customerFirstName: result.order.billingFirstName,
      orderNumber: result.order.orderNumber,
      reason: params.reason,
      refundCents: params.refundCents,
    });
  } catch (err) {
    console.error("[lifecycle] cancellation mail failed", err);
  }

  return { skipped: false };
}

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

  if (order.internalNote?.includes("Widerruf eingegangen")) {
    return { skipped: true };
  }

  const note = `Widerruf eingegangen ${new Date().toISOString()}${params.reason ? ` — ${params.reason.slice(0, 200)}` : ""}`;
  const combinedNote = [order.internalNote, note].filter(Boolean).join("\n");

  await prisma.order.update({
    where: { id: orderId },
    data: { internalNote: combinedNote },
  });

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
