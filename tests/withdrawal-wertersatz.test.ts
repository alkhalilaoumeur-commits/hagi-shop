import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import prisma from "@/lib/prisma";
import { markReturnReceived, refundWithdrawnOrder, registerWithdrawal } from "@/lib/services/order-lifecycle";
import { makeOrder, cleanupOrder } from "./_helpers/factory";

/**
 * Tests für Wertersatz nach § 357 Abs. 7 BGB.
 *
 * Wenn die zurückgegebene Ware durch Nutzung über die bloße Prüfung hinaus an
 * Wert verloren hat, darf der Händler einen Wertersatz einbehalten — aber NUR
 * mit Begründung (Beweislast Händler) und transparent gegenüber dem Kunden.
 *
 * Garantien:
 *  W1: Wertersatz reduziert die Netto-Erstattung; Stripe bekommt nur den Netto-
 *      Betrag; der Refund-Record dokumentiert valueCompensationCents + Begründung.
 *  W2: Wertersatz > 0 OHNE Begründung → VALUE_COMPENSATION_REASON_REQUIRED.
 *  W3: Netto-Refund + Wertersatz > offener Betrag → VALUE_COMPENSATION_EXCEEDS_TOTAL.
 *  W4: Wertersatz = 0 → normaler Voll-Refund, valueCompensationCents=0, notes=null.
 *  W5: Negativer Wertersatz → VALUE_COMPENSATION_INVALID.
 */

const { refundsCreate } = vi.hoisted(() => ({ refundsCreate: vi.fn() }));

vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({ refunds: { create: refundsCreate } }),
}));

const ADMIN = { actorType: "admin" as const, actorId: "admin-1", ipAddress: "127.0.0.1" };
const CUSTOMER = { actorType: "customer" as const, actorId: "cust-1", ipAddress: "127.0.0.1" };

describe("Wertersatz § 357 Abs. 7 BGB", () => {
  let orderId: string;

  beforeEach(() => {
    refundsCreate.mockReset();
    refundsCreate.mockResolvedValue({ id: "re_wertersatz" });
  });

  afterEach(async () => {
    if (orderId) await cleanupOrder(orderId);
  });

  async function withdrawnReturnedOrder(pi: string | null = "pi_wertersatz") {
    const { order } = await makeOrder({
      orderStatus: "COMPLETED",
      paymentStatus: "PAID",
      fulfillmentStatus: "FULFILLED",
      paidAt: new Date(),
      deliveredAt: new Date(),
      totalCents: 189900,
      stripePaymentIntentId: pi,
    });
    orderId = order.id;
    await registerWithdrawal(orderId, { reason: "passt nicht" }, CUSTOMER);
    await markReturnReceived(orderId, { trackingNumber: "DHL-W" }, ADMIN);
    return order;
  }

  it("W1: Wertersatz reduziert Erstattung, Stripe bekommt Netto, Record dokumentiert Abzug", async () => {
    await withdrawnReturnedOrder();
    // Kaufpreis 1899,00 € − Wertersatz 399,00 € = 1500,00 € Netto-Erstattung
    const r = await refundWithdrawnOrder(
      orderId,
      { refundCents: 150000, valueCompensationCents: 39900, valueCompensationReason: "Deutliche Laufspuren + Fleck" },
      ADMIN,
    );
    expect(r.skipped).toBe(false);

    // Stripe erstattet nur den Netto-Betrag (Kunde bekommt 1500 €, nicht 1899 €)
    expect(refundsCreate).toHaveBeenCalledTimes(1);
    expect(refundsCreate.mock.calls[0][0].amount).toBe(150000);

    const o = await prisma.order.findUnique({ where: { id: orderId } });
    expect(o?.refundedCents).toBe(150000);
    expect(o?.paymentStatus).toBe("PARTIALLY_REFUNDED"); // 1500 < 1899 → nicht voll

    const refunds = await prisma.refund.findMany({ where: { orderId } });
    expect(refunds).toHaveLength(1);
    expect(refunds[0].amountCents).toBe(150000);
    expect(refunds[0].valueCompensationCents).toBe(39900);
    expect(refunds[0].notes).toBe("Deutliche Laufspuren + Fleck");
  });

  it("W2: Wertersatz > 0 ohne Begründung → VALUE_COMPENSATION_REASON_REQUIRED", async () => {
    await withdrawnReturnedOrder();
    let err: string | null = null;
    try {
      await refundWithdrawnOrder(orderId, { refundCents: 150000, valueCompensationCents: 39900 }, ADMIN);
    } catch (e) {
      err = (e as Error).message;
    }
    expect(err).toBe("VALUE_COMPENSATION_REASON_REQUIRED");

    // Nichts erstattet, kein Stripe-Call, kein Record
    expect(refundsCreate).not.toHaveBeenCalled();
    const o = await prisma.order.findUnique({ where: { id: orderId } });
    expect(o?.paymentStatus).toBe("PAID");
    expect(await prisma.refund.count({ where: { orderId } })).toBe(0);
  });

  it("W2b: Leere/Whitespace-Begründung zählt nicht als Begründung", async () => {
    await withdrawnReturnedOrder();
    let err: string | null = null;
    try {
      await refundWithdrawnOrder(
        orderId,
        { refundCents: 150000, valueCompensationCents: 39900, valueCompensationReason: "   " },
        ADMIN,
      );
    } catch (e) {
      err = (e as Error).message;
    }
    expect(err).toBe("VALUE_COMPENSATION_REASON_REQUIRED");
  });

  it("W3: Netto-Refund + Wertersatz > offener Betrag → VALUE_COMPENSATION_EXCEEDS_TOTAL", async () => {
    await withdrawnReturnedOrder();
    let err: string | null = null;
    try {
      // 1899,00 € voll erstatten UND zusätzlich 399 € einbehalten → unmöglich
      await refundWithdrawnOrder(
        orderId,
        { refundCents: 189900, valueCompensationCents: 39900, valueCompensationReason: "Spuren" },
        ADMIN,
      );
    } catch (e) {
      err = (e as Error).message;
    }
    expect(err).toBe("VALUE_COMPENSATION_EXCEEDS_TOTAL");
    expect(refundsCreate).not.toHaveBeenCalled();
  });

  it("W4: Wertersatz = 0 → normaler Voll-Refund, valueCompensationCents=0, notes=null", async () => {
    await withdrawnReturnedOrder();
    const r = await refundWithdrawnOrder(
      orderId,
      { refundCents: 189900, valueCompensationCents: 0 },
      ADMIN,
    );
    expect(r.skipped).toBe(false);

    const o = await prisma.order.findUnique({ where: { id: orderId } });
    expect(o?.paymentStatus).toBe("REFUNDED");

    const refunds = await prisma.refund.findMany({ where: { orderId } });
    expect(refunds[0].valueCompensationCents).toBe(0);
    expect(refunds[0].notes).toBeNull();
  });

  it("W5: Negativer Wertersatz → VALUE_COMPENSATION_INVALID", async () => {
    await withdrawnReturnedOrder();
    let err: string | null = null;
    try {
      await refundWithdrawnOrder(
        orderId,
        { refundCents: 150000, valueCompensationCents: -100, valueCompensationReason: "x" },
        ADMIN,
      );
    } catch (e) {
      err = (e as Error).message;
    }
    expect(err).toBe("VALUE_COMPENSATION_INVALID");
  });
});
