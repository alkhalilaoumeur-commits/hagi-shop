import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import prisma from "@/lib/prisma";
import { cancelOrder, markOrderShipped } from "@/lib/services/order-lifecycle";
import { makeOrder, cleanupOrder } from "./_helpers/factory";

/**
 * Tests für den AUTOMATISCHEN Stripe-Refund in cancelOrder (Security-Fix 2026-06-22).
 *
 * Vorher: "Storno mit Erstattung" setzte nur DB-Felder auf REFUNDED — ohne echten
 * Stripe-Refund. Der Admin glaubte "Geld zurück", beim Kunden kam nichts an.
 * Jetzt löst cancelOrder den Refund real über die Stripe-API aus.
 *
 * Garantien:
 *  C1: Storno MIT refundCents + PaymentIntent → stripe.refunds.create (richtiger PI,
 *      Betrag, Idempotency-Key) + stripeRefundId im Refund-Record, Order CANCELLED/REFUNDED.
 *  C2: Stripe-Fehler → Order bleibt NICHT storniert, NICHT erstattet (kein false-positive).
 *  C3: Doppel-Call idempotent — Stripe-Refund nur einmal, genau ein Refund-Record.
 *  C4: Storno OHNE refundCents → kein Stripe-Call, kein Refund-Record, paymentStatus unverändert.
 *  C5: Order OHNE PaymentIntent → DB-only Refund, Stripe nicht aufgerufen.
 *  C6: Bereits versandte Order → ORDER_ALREADY_SHIPPED, kein Stripe-Call.
 *  C7: Teil-Refund → PARTIALLY_REFUNDED + exakter Betrag an Stripe.
 */

const { refundsCreate } = vi.hoisted(() => ({ refundsCreate: vi.fn() }));
vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({ refunds: { create: refundsCreate } }),
}));

const ADMIN = { actorType: "admin" as const, actorId: "admin-1", ipAddress: "127.0.0.1" };

describe("Storno-Refund — automatischer Stripe-Refund", () => {
  let orderId: string;

  beforeEach(() => refundsCreate.mockReset());
  afterEach(async () => {
    if (orderId) await cleanupOrder(orderId);
  });

  it("C1: Storno mit Refund + PaymentIntent löst Stripe-Refund aus", async () => {
    refundsCreate.mockResolvedValueOnce({ id: "re_cancel_1" });
    const { order } = await makeOrder({
      orderStatus: "CONFIRMED",
      paymentStatus: "PAID",
      fulfillmentStatus: "UNFULFILLED",
      paidAt: new Date(),
      totalCents: 189900,
      stripePaymentIntentId: "pi_cancel_1",
    });
    orderId = order.id;

    const r = await cancelOrder(orderId, { reason: "Kunde abgesprungen", refundCents: 189900 }, ADMIN);
    expect(r.skipped).toBe(false);

    expect(refundsCreate).toHaveBeenCalledTimes(1);
    const [body, opts] = refundsCreate.mock.calls[0];
    expect(body.payment_intent).toBe("pi_cancel_1");
    expect(body.amount).toBe(189900);
    expect(opts.idempotencyKey).toBe(`cancel-refund-${orderId}-189900`);

    const o = await prisma.order.findUnique({ where: { id: orderId } });
    expect(o?.orderStatus).toBe("CANCELLED");
    expect(o?.paymentStatus).toBe("REFUNDED");
    expect(o?.refundedCents).toBe(189900);

    const refunds = await prisma.refund.findMany({ where: { orderId } });
    expect(refunds).toHaveLength(1);
    expect(refunds[0].stripeRefundId).toBe("re_cancel_1");
    expect(refunds[0].reason).toBe("cancellation");
  });

  it("C2: Stripe-Fehler → Order bleibt aktiv & unrefunded", async () => {
    refundsCreate.mockRejectedValueOnce(new Error("card_declined"));
    const { order } = await makeOrder({
      orderStatus: "CONFIRMED",
      paymentStatus: "PAID",
      fulfillmentStatus: "UNFULFILLED",
      paidAt: new Date(),
      totalCents: 189900,
      stripePaymentIntentId: "pi_cancel_fail",
    });
    orderId = order.id;

    let err: string | null = null;
    try {
      await cancelOrder(orderId, { reason: "test", refundCents: 189900 }, ADMIN);
    } catch (e) {
      err = (e as Error).message;
    }
    expect(err).toBe("STRIPE_REFUND_FAILED");

    const o = await prisma.order.findUnique({ where: { id: orderId } });
    expect(o?.orderStatus).not.toBe("CANCELLED");
    expect(o?.paymentStatus).toBe("PAID");
    expect(o?.refundedCents).toBe(0);
    expect(await prisma.refund.count({ where: { orderId } })).toBe(0);
  });

  it("C3: Doppel-Call idempotent — genau ein Refund-Record", async () => {
    refundsCreate.mockResolvedValue({ id: "re_cancel_dup" });
    const { order } = await makeOrder({
      orderStatus: "CONFIRMED",
      paymentStatus: "PAID",
      fulfillmentStatus: "UNFULFILLED",
      paidAt: new Date(),
      totalCents: 189900,
      stripePaymentIntentId: "pi_cancel_dup",
    });
    orderId = order.id;

    const r1 = await cancelOrder(orderId, { reason: "test", refundCents: 189900 }, ADMIN);
    const r2 = await cancelOrder(orderId, { reason: "test", refundCents: 189900 }, ADMIN);
    expect(r1.skipped).toBe(false);
    expect(r2.skipped).toBe(true); // bereits CANCELLED → früher Skip vor Stripe
    expect(refundsCreate).toHaveBeenCalledTimes(1);
    expect(await prisma.refund.count({ where: { orderId } })).toBe(1);
  });

  it("C4: Storno ohne Refund → kein Stripe-Call, paymentStatus unverändert", async () => {
    const { order } = await makeOrder({
      orderStatus: "CONFIRMED",
      paymentStatus: "PAID",
      fulfillmentStatus: "UNFULFILLED",
      paidAt: new Date(),
      totalCents: 189900,
      stripePaymentIntentId: "pi_cancel_norefund",
    });
    orderId = order.id;

    const r = await cancelOrder(orderId, { reason: "Doppelbestellung" }, ADMIN);
    expect(r.skipped).toBe(false);
    expect(refundsCreate).not.toHaveBeenCalled();

    const o = await prisma.order.findUnique({ where: { id: orderId } });
    expect(o?.orderStatus).toBe("CANCELLED");
    expect(o?.paymentStatus).toBe("PAID");
    expect(o?.refundedCents).toBe(0);
    expect(await prisma.refund.count({ where: { orderId } })).toBe(0);
  });

  it("C5: Order ohne PaymentIntent → DB-only Refund, Stripe nicht aufgerufen", async () => {
    const { order } = await makeOrder({
      orderStatus: "CONFIRMED",
      paymentStatus: "PAID",
      fulfillmentStatus: "UNFULFILLED",
      paidAt: new Date(),
      totalCents: 189900,
      stripePaymentIntentId: null,
    });
    orderId = order.id;

    const r = await cancelOrder(orderId, { reason: "walkin", refundCents: 189900 }, ADMIN);
    expect(r.skipped).toBe(false);
    expect(refundsCreate).not.toHaveBeenCalled();

    const o = await prisma.order.findUnique({ where: { id: orderId } });
    expect(o?.paymentStatus).toBe("REFUNDED");
    const refunds = await prisma.refund.findMany({ where: { orderId } });
    expect(refunds).toHaveLength(1);
    expect(refunds[0].stripeRefundId).toBeNull();
  });

  it("C6: Bereits versandte Order → ORDER_ALREADY_SHIPPED, kein Stripe-Call", async () => {
    const { order } = await makeOrder({
      orderStatus: "CONFIRMED",
      paymentStatus: "PAID",
      fulfillmentStatus: "UNFULFILLED",
      paidAt: new Date(),
      totalCents: 189900,
      stripePaymentIntentId: "pi_cancel_shipped",
    });
    orderId = order.id;
    await markOrderShipped(orderId, { trackingNumber: "DHL-X", carrier: "DHL" }, ADMIN);

    let err: string | null = null;
    try {
      await cancelOrder(orderId, { reason: "zu spät", refundCents: 189900 }, ADMIN);
    } catch (e) {
      err = (e as Error).message;
    }
    expect(err).toBe("ORDER_ALREADY_SHIPPED");
    expect(refundsCreate).not.toHaveBeenCalled();
  });

  it("C7: Teil-Refund → PARTIALLY_REFUNDED + exakter Betrag", async () => {
    refundsCreate.mockResolvedValueOnce({ id: "re_cancel_partial" });
    const { order } = await makeOrder({
      orderStatus: "CONFIRMED",
      paymentStatus: "PAID",
      fulfillmentStatus: "UNFULFILLED",
      paidAt: new Date(),
      totalCents: 189900,
      stripePaymentIntentId: "pi_cancel_partial",
    });
    orderId = order.id;

    await cancelOrder(orderId, { reason: "teilweise", refundCents: 50000 }, ADMIN);
    expect(refundsCreate.mock.calls[0][0].amount).toBe(50000);

    const o = await prisma.order.findUnique({ where: { id: orderId } });
    expect(o?.paymentStatus).toBe("PARTIALLY_REFUNDED");
    expect(o?.refundedCents).toBe(50000);
  });
});
