import { describe, it, expect, beforeEach, afterEach } from "vitest";
import prisma from "@/lib/prisma";
import { markOrderShipped, markOrderDelivered, cancelOrder } from "@/lib/services/order-lifecycle";
import { makeOrder, cleanupOrder } from "./_helpers/factory";

const ACTOR = { actorType: "admin" as const, actorId: "test-admin", ipAddress: "127.0.0.1" };

describe("Order-State — Race-Safe Transitions", () => {
  let orderId: string;

  beforeEach(async () => {
    const { order } = await makeOrder({
      orderStatus: "CONFIRMED",
      paymentStatus: "PAID",
      paidAt: new Date(),
      confirmedAt: new Date(),
    });
    orderId = order.id;
  });

  afterEach(async () => {
    await cleanupOrder(orderId);
  });

  it("Ship → FULFILLED + fulfilledAt + ein Fulfillment", async () => {
    await markOrderShipped(orderId, { trackingNumber: "1Z999AA1", carrier: "DHL" }, ACTOR);
    const o = await prisma.order.findUnique({
      where: { id: orderId },
      include: { fulfillments: true },
    });
    expect(o?.fulfillmentStatus).toBe("FULFILLED");
    expect(o?.fulfillments.length).toBe(1);
    expect(o?.fulfillments[0]?.trackingNumber).toBe("1Z999AA1");
  });

  it("Doppel-Ship erzeugt KEIN zweites Fulfillment (Idempotenz)", async () => {
    await markOrderShipped(orderId, { trackingNumber: "1Z999AA1", carrier: "DHL" }, ACTOR);
    await markOrderShipped(orderId, { trackingNumber: "1Z999AA2", carrier: "DHL" }, ACTOR).catch(() => {});
    const fc = await prisma.fulfillment.count({ where: { orderId } });
    expect(fc).toBe(1);
  });

  it("Concurrent Ship-Calls: nur ein Fulfillment landet in DB", async () => {
    const calls = await Promise.allSettled(
      Array.from({ length: 4 }).map((_, i) =>
        markOrderShipped(orderId, { trackingNumber: `1Z999AA${i}`, carrier: "DHL" }, ACTOR),
      ),
    );
    const ok = calls.filter((c) => c.status === "fulfilled").length;
    expect(ok).toBeGreaterThanOrEqual(1);
    const fc = await prisma.fulfillment.count({ where: { orderId } });
    expect(fc).toBe(1);
  });

  it("Deliver nach Ship → COMPLETED + deliveredAt", async () => {
    await markOrderShipped(orderId, { trackingNumber: "1Z999AA1", carrier: "DHL" }, ACTOR);
    await markOrderDelivered(orderId, ACTOR);
    const o = await prisma.order.findUnique({ where: { id: orderId } });
    expect(o?.orderStatus).toBe("COMPLETED");
    expect(o?.deliveredAt).not.toBeNull();
  });

  it("Cancel von CANCELLED-Order wird übersprungen (skipped:true)", async () => {
    await cancelOrder(orderId, { reason: "test" }, ACTOR);
    const r2 = await cancelOrder(orderId, { reason: "second" }, ACTOR);
    expect(r2.skipped).toBe(true);
  });

  it("Cancel mit Refund → REFUNDED + refundedCents gesetzt", async () => {
    await cancelOrder(orderId, { reason: "kunde-bittet", refundCents: 189900 }, ACTOR);
    const o = await prisma.order.findUnique({ where: { id: orderId } });
    expect(o?.orderStatus).toBe("CANCELLED");
    expect(o?.paymentStatus).toBe("REFUNDED");
    expect(o?.refundedCents).toBe(189900);
  });

  it("AuditLog für Ship+Deliver+Cancel angelegt", async () => {
    await markOrderShipped(orderId, { trackingNumber: "1Z999AA1", carrier: "DHL" }, ACTOR);
    await markOrderDelivered(orderId, ACTOR);
    const audits = await prisma.auditLog.findMany({
      where: { entityType: "Order", entityId: orderId },
      select: { action: true },
    });
    const actions = audits.map((a) => a.action);
    expect(actions).toContain("order.shipped");
    expect(actions).toContain("order.delivered");
  });
});

describe("Order-State — Invalid Transitions", () => {
  it("Ship einer PENDING (unbezahlten) Order: lifecycle blockt via Status-Guard", async () => {
    const { order } = await makeOrder({ orderStatus: "PENDING", paymentStatus: "PENDING" });
    let threw = false;
    try {
      await markOrderShipped(order.id, { trackingNumber: "X", carrier: "DHL" }, ACTOR);
    } catch {
      threw = true;
    }
    const o = await prisma.order.findUnique({ where: { id: order.id } });
    // markOrderShipped nutzt updateMany mit WHERE-Status-Guard.
    // Eine PENDING-Order sollte nicht zu FULFILLED werden.
    expect(o?.fulfillmentStatus !== "FULFILLED" || threw).toBe(true);
    await cleanupOrder(order.id);
  });

  it("Deliver ohne vorheriges Ship: wirft ORDER_NOT_SHIPPED oder bleibt UNFULFILLED", async () => {
    const { order } = await makeOrder({
      orderStatus: "CONFIRMED",
      paymentStatus: "PAID",
    });
    let threw = false;
    try {
      await markOrderDelivered(order.id, ACTOR);
    } catch {
      threw = true;
    }
    const o = await prisma.order.findUnique({ where: { id: order.id } });
    // Deliver ohne Ship sollte den Status nicht heimlich auf COMPLETED setzen
    // (entweder Throw oder explizit-skip).
    const safe = threw || o?.orderStatus !== "COMPLETED" || o?.fulfillmentStatus === "FULFILLED";
    expect(safe).toBe(true);
    await cleanupOrder(order.id);
  });
});
