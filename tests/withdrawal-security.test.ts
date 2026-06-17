import { describe, it, expect, beforeEach, afterEach } from "vitest";
import prisma from "@/lib/prisma";
import { markReturnReceived, refundWithdrawnOrder, registerWithdrawal } from "@/lib/services/order-lifecycle";
import { makeOrder, cleanupOrder } from "./_helpers/factory";

const ADMIN = { actorType: "admin" as const, actorId: "admin-1", ipAddress: "127.0.0.1" };
const CUSTOMER = { actorType: "customer" as const, actorId: "cust-1", ipAddress: "127.0.0.1" };
const SYSTEM = { actorType: "system" as const, actorId: null, ipAddress: null };

/**
 * Sicherheits-Tests für das Szenario:
 * "Customer behauptet 'ich habe zurückgeschickt' — Admin hat aber nichts erhalten."
 *
 * Garantien die wir hier prüfen:
 *  G1: markReturnReceived akzeptiert NIEMALS actorType="customer"
 *  G2: refundWithdrawnOrder akzeptiert NIEMALS actorType="customer"
 *  G3: Refund einer FULFILLED-Order ohne returnReceivedAt schlägt fehl
 *  G4: Refund vor Widerruf-Antrag schlägt fehl
 *  G5: Phase 1 (UNFULFILLED) erlaubt Direkt-Refund ohne Return (Ware war nie raus)
 *  G6: Doppelter Refund ist idempotent
 *  G7: Refund > offener Betrag schlägt fehl (REFUND_EXCEEDS_PAID)
 *  G8: Audit-Log für jeden State-Change (Customer-Aktionen vs Admin-Aktionen)
 */

describe("Widerruf-Security — Customer kann KEINE Admin-Aktionen ausführen", () => {
  let orderId: string;

  beforeEach(async () => {
    const { order } = await makeOrder({
      orderStatus: "COMPLETED",
      paymentStatus: "PAID",
      fulfillmentStatus: "FULFILLED",
      paidAt: new Date(),
      confirmedAt: new Date(),
      deliveredAt: new Date(),
    });
    orderId = order.id;
    await registerWithdrawal(orderId, { reason: "test" }, CUSTOMER);
  });

  afterEach(async () => {
    await cleanupOrder(orderId);
  });

  it("G1: Customer kann markReturnReceived NICHT aufrufen → FORBIDDEN_ACTOR", async () => {
    let err: string | null = null;
    try {
      await markReturnReceived(orderId, {}, CUSTOMER);
    } catch (e) {
      err = (e as Error).message;
    }
    expect(err).toBe("FORBIDDEN_ACTOR");

    // Wichtig: returnReceivedAt darf NICHT gesetzt sein
    const o = await prisma.order.findUnique({ where: { id: orderId } });
    expect(o?.returnReceivedAt).toBeNull();
  });

  it("G2: Customer kann refundWithdrawnOrder NICHT aufrufen → FORBIDDEN_ACTOR", async () => {
    let err: string | null = null;
    try {
      await refundWithdrawnOrder(orderId, { refundCents: 100 }, CUSTOMER);
    } catch (e) {
      err = (e as Error).message;
    }
    expect(err).toBe("FORBIDDEN_ACTOR");

    const o = await prisma.order.findUnique({ where: { id: orderId } });
    expect(o?.paymentStatus).toBe("PAID");
    expect(o?.refundedCents).toBe(0);
  });
});

describe("Widerruf-Security — Refund-Guard gegen Return-Mismatch", () => {
  let orderId: string;

  beforeEach(async () => {
    const { order } = await makeOrder({
      orderStatus: "COMPLETED",
      paymentStatus: "PAID",
      fulfillmentStatus: "FULFILLED",
      paidAt: new Date(),
      confirmedAt: new Date(),
      deliveredAt: new Date(),
    });
    orderId = order.id;
  });

  afterEach(async () => {
    await cleanupOrder(orderId);
  });

  it("G3: Refund einer versandten Order ohne returnReceivedAt → RETURN_NOT_RECEIVED", async () => {
    await registerWithdrawal(orderId, { reason: "kaputt" }, CUSTOMER);
    let err: string | null = null;
    try {
      await refundWithdrawnOrder(orderId, { refundCents: 189900 }, ADMIN);
    } catch (e) {
      err = (e as Error).message;
    }
    expect(err).toBe("RETURN_NOT_RECEIVED");

    const o = await prisma.order.findUnique({ where: { id: orderId } });
    expect(o?.paymentStatus).toBe("PAID");
    expect(o?.refundedCents).toBe(0);
  });

  it("G3b: Nach markReturnReceived darf Refund laufen", async () => {
    await registerWithdrawal(orderId, { reason: "kaputt" }, CUSTOMER);
    await markReturnReceived(orderId, { trackingNumber: "DHL-XYZ" }, ADMIN);
    const r = await refundWithdrawnOrder(orderId, { refundCents: 189900 }, ADMIN);
    expect(r.skipped).toBe(false);

    const o = await prisma.order.findUnique({ where: { id: orderId } });
    expect(o?.paymentStatus).toBe("REFUNDED");
    expect(o?.refundedCents).toBe(189900);
    expect(o?.orderStatus).toBe("CANCELLED");
    expect(o?.returnTrackingNumber).toBe("DHL-XYZ");
  });

  it("G4: Refund ohne vorherigen Widerruf → NO_WITHDRAWAL", async () => {
    let err: string | null = null;
    try {
      await refundWithdrawnOrder(orderId, { refundCents: 100 }, ADMIN);
    } catch (e) {
      err = (e as Error).message;
    }
    expect(err).toBe("NO_WITHDRAWAL");
  });

  it("markReturnReceived ohne vorherigen Widerruf → NO_WITHDRAWAL", async () => {
    let err: string | null = null;
    try {
      await markReturnReceived(orderId, {}, ADMIN);
    } catch (e) {
      err = (e as Error).message;
    }
    expect(err).toBe("NO_WITHDRAWAL");
  });
});

describe("Widerruf-Security — Phase 1 (UNFULFILLED) erlaubt Direkt-Refund", () => {
  it("G5: PAID + UNFULFILLED + Widerruf → Refund OK ohne markReturnReceived", async () => {
    const { order } = await makeOrder({
      orderStatus: "CONFIRMED",
      paymentStatus: "PAID",
      fulfillmentStatus: "UNFULFILLED",
      paidAt: new Date(),
      confirmedAt: new Date(),
    });
    await registerWithdrawal(order.id, { reason: "doch nicht" }, CUSTOMER);
    const r = await refundWithdrawnOrder(order.id, { refundCents: 189900 }, ADMIN);
    expect(r.skipped).toBe(false);

    const o = await prisma.order.findUnique({ where: { id: order.id } });
    expect(o?.paymentStatus).toBe("REFUNDED");
    expect(o?.returnReceivedAt).toBeNull(); // war nie nötig

    await cleanupOrder(order.id);
  });
});

describe("Widerruf-Security — Refund-Mathematik + Idempotenz", () => {
  let orderId: string;

  beforeEach(async () => {
    const { order } = await makeOrder({
      orderStatus: "COMPLETED",
      paymentStatus: "PAID",
      fulfillmentStatus: "FULFILLED",
      paidAt: new Date(),
      confirmedAt: new Date(),
      deliveredAt: new Date(),
      totalCents: 100000,
    });
    orderId = order.id;
    await registerWithdrawal(orderId, {}, CUSTOMER);
    await markReturnReceived(orderId, {}, ADMIN);
  });

  afterEach(async () => {
    await cleanupOrder(orderId);
  });

  it("G6: Doppelter Refund mit gleichem Betrag → skipped:true", async () => {
    await refundWithdrawnOrder(orderId, { refundCents: 100000 }, ADMIN);
    const r2 = await refundWithdrawnOrder(orderId, { refundCents: 100000 }, ADMIN);
    expect(r2.skipped).toBe(true);

    const o = await prisma.order.findUnique({ where: { id: orderId } });
    expect(o?.refundedCents).toBe(100000); // NICHT 200000
  });

  it("G7: Refund > totalCents - refundedCents → REFUND_EXCEEDS_PAID", async () => {
    let err: string | null = null;
    try {
      await refundWithdrawnOrder(orderId, { refundCents: 999999 }, ADMIN);
    } catch (e) {
      err = (e as Error).message;
    }
    expect(err).toBe("REFUND_EXCEEDS_PAID");
  });

  it("G7b: Refund mit 0 oder negativ → REFUND_AMOUNT_INVALID", async () => {
    let err1: string | null = null;
    let err2: string | null = null;
    try { await refundWithdrawnOrder(orderId, { refundCents: 0 }, ADMIN); } catch (e) { err1 = (e as Error).message; }
    try { await refundWithdrawnOrder(orderId, { refundCents: -100 }, ADMIN); } catch (e) { err2 = (e as Error).message; }
    expect(err1).toBe("REFUND_AMOUNT_INVALID");
    expect(err2).toBe("REFUND_AMOUNT_INVALID");
  });

  it("Teil-Refund: PARTIALLY_REFUNDED + refundedCents kumuliert", async () => {
    await refundWithdrawnOrder(orderId, { refundCents: 30000 }, ADMIN);
    const o1 = await prisma.order.findUnique({ where: { id: orderId } });
    expect(o1?.paymentStatus).toBe("PARTIALLY_REFUNDED");
    expect(o1?.refundedCents).toBe(30000);

    await refundWithdrawnOrder(orderId, { refundCents: 70000 }, ADMIN);
    const o2 = await prisma.order.findUnique({ where: { id: orderId } });
    expect(o2?.paymentStatus).toBe("REFUNDED");
    expect(o2?.refundedCents).toBe(100000);
  });
});

describe("Widerruf-Security — Audit-Trail vollständig", () => {
  it("G8: registerWithdrawal + markReturnReceived + refundWithdrawnOrder erzeugen je einen AuditLog mit korrektem actorType", async () => {
    const { order } = await makeOrder({
      orderStatus: "COMPLETED",
      paymentStatus: "PAID",
      fulfillmentStatus: "FULFILLED",
      paidAt: new Date(),
      confirmedAt: new Date(),
      deliveredAt: new Date(),
    });

    await registerWithdrawal(order.id, { reason: "test" }, CUSTOMER);
    await markReturnReceived(order.id, { trackingNumber: "TRACK-1" }, ADMIN);
    await refundWithdrawnOrder(order.id, { refundCents: 189900 }, SYSTEM);

    const audits = await prisma.auditLog.findMany({
      where: { entityType: "Order", entityId: order.id },
      orderBy: { createdAt: "asc" },
      select: { action: true, actorType: true },
    });
    const map = new Map(audits.map((a) => [a.action, a.actorType]));

    expect(map.get("order.withdrawal_received")).toBe("customer");
    expect(map.get("order.return_received")).toBe("admin");
    expect(map.get("order.withdrawal_refunded")).toBe("system");

    await cleanupOrder(order.id);
  });
});
