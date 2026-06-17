import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import prisma from "@/lib/prisma";
import { markReturnReceived, refundWithdrawnOrder, registerWithdrawal } from "@/lib/services/order-lifecycle";
import { makeOrder, cleanupOrder } from "./_helpers/factory";

/**
 * Tests für den AUTOMATISCHEN Stripe-Refund in refundWithdrawnOrder.
 *
 * Vorher: refundWithdrawnOrder hat nur DB-Felder gesetzt — der Admin musste das
 * Geld manuell im Stripe-Dashboard zurückzahlen. Jetzt löst der Service den
 * Refund selbst über die Stripe-API aus.
 *
 * Garantien:
 *  S1: Order MIT stripePaymentIntentId → stripe.refunds.create wird aufgerufen
 *      (richtiger PaymentIntent, richtiger Betrag, Idempotency-Key) + stripeRefundId
 *      landet im Refund-Record.
 *  S2: Stripe-Fehler → Order bleibt UNREFUNDED (kein false-positive REFUNDED).
 *  S3: Doppel-Call ist idempotent — Stripe wird nur EINMAL erfolgreich verbucht,
 *      genau EIN Refund-Record.
 *  S4: Order OHNE stripePaymentIntentId (Showroom-Walkin) → DB-only Refund,
 *      Stripe wird NICHT aufgerufen, Refund-Record mit stripeRefundId=null.
 *  S5: Partial-Refund übergibt exakt den Teilbetrag an Stripe.
 */

// vi.hoisted, damit der Mock vor dem (gehoisteten) vi.mock-Factory existiert.
const { refundsCreate } = vi.hoisted(() => ({ refundsCreate: vi.fn() }));

vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({ refunds: { create: refundsCreate } }),
}));

const ADMIN = { actorType: "admin" as const, actorId: "admin-1", ipAddress: "127.0.0.1" };
const CUSTOMER = { actorType: "customer" as const, actorId: "cust-1", ipAddress: "127.0.0.1" };

describe("Widerruf-Refund — automatischer Stripe-Refund", () => {
  let orderId: string;

  beforeEach(() => {
    refundsCreate.mockReset();
  });

  afterEach(async () => {
    if (orderId) await cleanupOrder(orderId);
  });

  it("S1: Order mit PaymentIntent löst Stripe-Refund aus + speichert stripeRefundId", async () => {
    refundsCreate.mockResolvedValueOnce({ id: "re_test_123" });
    const { order } = await makeOrder({
      orderStatus: "COMPLETED",
      paymentStatus: "PAID",
      fulfillmentStatus: "FULFILLED",
      paidAt: new Date(),
      deliveredAt: new Date(),
      stripePaymentIntentId: "pi_test_abc",
    });
    orderId = order.id;
    await registerWithdrawal(orderId, { reason: "test" }, CUSTOMER);
    await markReturnReceived(orderId, { trackingNumber: "DHL-1" }, ADMIN);

    const r = await refundWithdrawnOrder(orderId, { refundCents: 189900 }, ADMIN);
    expect(r.skipped).toBe(false);

    // Stripe wurde mit den richtigen Parametern aufgerufen
    expect(refundsCreate).toHaveBeenCalledTimes(1);
    const [body, opts] = refundsCreate.mock.calls[0];
    expect(body.payment_intent).toBe("pi_test_abc");
    expect(body.amount).toBe(189900);
    expect(body.reason).toBe("requested_by_customer");
    expect(opts.idempotencyKey).toBe(`wd-refund-${orderId}-189900`);

    // DB-Status korrekt
    const o = await prisma.order.findUnique({ where: { id: orderId } });
    expect(o?.paymentStatus).toBe("REFUNDED");
    expect(o?.refundedCents).toBe(189900);

    // Refund-Record mit Stripe-ID
    const refunds = await prisma.refund.findMany({ where: { orderId } });
    expect(refunds).toHaveLength(1);
    expect(refunds[0].stripeRefundId).toBe("re_test_123");
    expect(refunds[0].amountCents).toBe(189900);
  });

  it("S2: Stripe-Fehler → Order bleibt UNREFUNDED, kein Refund-Record", async () => {
    refundsCreate.mockRejectedValueOnce(new Error("card_declined"));
    const { order } = await makeOrder({
      orderStatus: "COMPLETED",
      paymentStatus: "PAID",
      fulfillmentStatus: "FULFILLED",
      paidAt: new Date(),
      deliveredAt: new Date(),
      stripePaymentIntentId: "pi_test_fail",
    });
    orderId = order.id;
    await registerWithdrawal(orderId, { reason: "test" }, CUSTOMER);
    await markReturnReceived(orderId, { trackingNumber: "DHL-2" }, ADMIN);

    let err: string | null = null;
    try {
      await refundWithdrawnOrder(orderId, { refundCents: 189900 }, ADMIN);
    } catch (e) {
      err = (e as Error).message;
    }
    expect(err).toBe("STRIPE_REFUND_FAILED");

    // KRITISCH: Order darf NICHT als refunded markiert sein
    const o = await prisma.order.findUnique({ where: { id: orderId } });
    expect(o?.paymentStatus).toBe("PAID");
    expect(o?.refundedCents).toBe(0);

    const refunds = await prisma.refund.findMany({ where: { orderId } });
    expect(refunds).toHaveLength(0);
  });

  it("S3: Doppel-Call ist idempotent — genau ein Refund-Record", async () => {
    refundsCreate.mockResolvedValue({ id: "re_test_dup" });
    const { order } = await makeOrder({
      orderStatus: "COMPLETED",
      paymentStatus: "PAID",
      fulfillmentStatus: "FULFILLED",
      paidAt: new Date(),
      deliveredAt: new Date(),
      stripePaymentIntentId: "pi_test_dup",
    });
    orderId = order.id;
    await registerWithdrawal(orderId, { reason: "test" }, CUSTOMER);
    await markReturnReceived(orderId, { trackingNumber: "DHL-3" }, ADMIN);

    const r1 = await refundWithdrawnOrder(orderId, { refundCents: 189900 }, ADMIN);
    const r2 = await refundWithdrawnOrder(orderId, { refundCents: 189900 }, ADMIN);
    expect(r1.skipped).toBe(false);
    expect(r2.skipped).toBe(true); // zweiter Call: paymentStatus=REFUNDED → früher Skip

    const refunds = await prisma.refund.findMany({ where: { orderId } });
    expect(refunds).toHaveLength(1);
  });

  it("S4: Order OHNE PaymentIntent → DB-only Refund, Stripe nicht aufgerufen", async () => {
    const { order } = await makeOrder({
      orderStatus: "COMPLETED",
      paymentStatus: "PAID",
      fulfillmentStatus: "UNFULFILLED",
      paidAt: new Date(),
      stripePaymentIntentId: null,
    });
    orderId = order.id;
    await registerWithdrawal(orderId, { reason: "walkin" }, CUSTOMER);

    const r = await refundWithdrawnOrder(orderId, { refundCents: 189900 }, ADMIN);
    expect(r.skipped).toBe(false);
    expect(refundsCreate).not.toHaveBeenCalled();

    const o = await prisma.order.findUnique({ where: { id: orderId } });
    expect(o?.paymentStatus).toBe("REFUNDED");

    const refunds = await prisma.refund.findMany({ where: { orderId } });
    expect(refunds).toHaveLength(1);
    expect(refunds[0].stripeRefundId).toBeNull();
  });

  it("S5: Partial-Refund übergibt exakten Teilbetrag an Stripe", async () => {
    refundsCreate.mockResolvedValueOnce({ id: "re_test_partial" });
    const { order } = await makeOrder({
      orderStatus: "COMPLETED",
      paymentStatus: "PAID",
      fulfillmentStatus: "FULFILLED",
      paidAt: new Date(),
      deliveredAt: new Date(),
      totalCents: 189900,
      stripePaymentIntentId: "pi_test_partial",
    });
    orderId = order.id;
    await registerWithdrawal(orderId, { reason: "teil" }, CUSTOMER);
    await markReturnReceived(orderId, { trackingNumber: "DHL-4" }, ADMIN);

    await refundWithdrawnOrder(orderId, { refundCents: 50000 }, ADMIN);
    expect(refundsCreate.mock.calls[0][0].amount).toBe(50000);

    const o = await prisma.order.findUnique({ where: { id: orderId } });
    expect(o?.paymentStatus).toBe("PARTIALLY_REFUNDED");
    expect(o?.refundedCents).toBe(50000);
  });
});
