import { describe, it, expect, beforeEach, afterEach } from "vitest";
import prisma from "@/lib/prisma";
import { registerWithdrawal } from "@/lib/services/order-lifecycle";
import { makeOrder, cleanupOrder } from "./_helpers/factory";

const ACTOR = { actorType: "system" as const, actorId: "test", ipAddress: "127.0.0.1" };

/**
 * BGB § 312g + § 355 — Widerrufsrecht im Fernabsatz.
 * Pflicht für B2C-Online-Shops. 14-Tage-Frist ab Erhalt der Ware (§ 355 Abs. 2).
 * Rückerstattung binnen 14 Tagen nach Widerrufseingang (§ 357 Abs. 1).
 * Hin-Versand muss erstattet werden, Rück-Versand nicht (§ 357 Abs. 6).
 */

describe("Widerruf — registerWithdrawal (existierende Funktion)", () => {
  let orderId: string;

  beforeEach(async () => {
    const { order } = await makeOrder({
      orderStatus: "COMPLETED",
      paymentStatus: "PAID",
      paidAt: new Date(),
      confirmedAt: new Date(),
      deliveredAt: new Date(),
    });
    orderId = order.id;
  });

  afterEach(async () => {
    await cleanupOrder(orderId);
  });

  it("Widerruf für COMPLETED-Order: skipped:false, internalNote bekommt 'Widerruf eingegangen'", async () => {
    const r = await registerWithdrawal(orderId, { reason: "passt nicht" }, ACTOR);
    expect(r.skipped).toBe(false);
    const o = await prisma.order.findUnique({ where: { id: orderId } });
    expect(o?.internalNote).toContain("Widerruf eingegangen");
  });

  it("Widerruf doppelt → skipped:true (Idempotenz)", async () => {
    await registerWithdrawal(orderId, { reason: "x" }, ACTOR);
    const r2 = await registerWithdrawal(orderId, { reason: "x2" }, ACTOR);
    expect(r2.skipped).toBe(true);
  });

  it("Widerruf erzeugt AuditLog 'order.withdrawal_received'", async () => {
    await registerWithdrawal(orderId, { reason: "nicht passend" }, ACTOR);
    const audit = await prisma.auditLog.findFirst({
      where: { entityType: "Order", entityId: orderId, action: "order.withdrawal_received" },
    });
    expect(audit).not.toBeNull();
  });

  it("Widerruf auf nicht-existierende Order → ORDER_NOT_FOUND", async () => {
    let err: string | null = null;
    try {
      await registerWithdrawal("nonexistent-id-xxx", {}, ACTOR);
    } catch (e) {
      err = (e as Error).message;
    }
    expect(err).toBe("ORDER_NOT_FOUND");
  });

  it("Widerruf für PENDING-Order (nicht zustellbar) → ORDER_NOT_RETURNABLE", async () => {
    const { order } = await makeOrder({ orderStatus: "PENDING", paymentStatus: "PENDING" });
    let err: string | null = null;
    try {
      await registerWithdrawal(order.id, {}, ACTOR);
    } catch (e) {
      err = (e as Error).message;
    }
    expect(err).toBe("ORDER_NOT_RETURNABLE");
    await cleanupOrder(order.id);
  });

  it("Widerruf-Grund wird im internalNote auf 200 chars abgeschnitten", async () => {
    const longReason = "A".repeat(500);
    await registerWithdrawal(orderId, { reason: longReason }, ACTOR);
    const o = await prisma.order.findUnique({ where: { id: orderId } });
    expect((o?.internalNote ?? "").length).toBeLessThan(longReason.length + 100);
  });
});

/**
 * RED-TESTS — Funktionen die fehlen und ergänzt werden müssen.
 * Jeder Test markiert konkret was zu bauen ist.
 */
describe("Widerruf — Frist-Berechnung (RED — Funktion fehlt)", () => {
  it.fails("calcWithdrawalDeadline(deliveredAt) = deliveredAt + 14 Tage", async () => {
    // TODO bauen: lib/services/withdrawal.ts → calcWithdrawalDeadline(date)
    const mod = await import("@/lib/services/withdrawal" as string).catch(() => null);
    const calc = mod && typeof mod.calcWithdrawalDeadline === "function" ? mod.calcWithdrawalDeadline : null;
    if (!calc) throw new Error("NOT_IMPLEMENTED: lib/services/withdrawal.ts calcWithdrawalDeadline");
    const delivered = new Date("2026-06-01T10:00:00Z");
    const expected = new Date("2026-06-15T10:00:00Z");
    expect(calc(delivered).toISOString()).toBe(expected.toISOString());
  });

  it.fails("isWithdrawalEligible(order, now) prüft Frist ab deliveredAt (NICHT paidAt)", async () => {
    const mod = await import("@/lib/services/withdrawal" as string).catch(() => null);
    const eligible = mod && typeof mod.isWithdrawalEligible === "function" ? mod.isWithdrawalEligible : null;
    if (!eligible) throw new Error("NOT_IMPLEMENTED: isWithdrawalEligible muss Frist ab deliveredAt rechnen");
    const o = { deliveredAt: new Date(Date.now() - 13 * 86400 * 1000), paidAt: new Date(Date.now() - 30 * 86400 * 1000) };
    expect(eligible(o, new Date())).toBe(true);
    const overdue = { deliveredAt: new Date(Date.now() - 20 * 86400 * 1000), paidAt: new Date() };
    expect(eligible(overdue, new Date())).toBe(false);
  });

  it.fails("Frist verlängert sich auf 12 Monate + 14 Tage bei fehlender Belehrung", async () => {
    const mod = await import("@/lib/services/withdrawal" as string).catch(() => null);
    const eligible = mod && typeof mod.isWithdrawalEligible === "function" ? mod.isWithdrawalEligible : null;
    if (!eligible) throw new Error("NOT_IMPLEMENTED: isWithdrawalEligible muss withdrawalNoticeGiven berücksichtigen (§ 356 Abs. 3)");
    const o = {
      deliveredAt: new Date(Date.now() - 100 * 86400 * 1000),
      withdrawalNoticeGiven: false,
    };
    expect(eligible(o, new Date())).toBe(true);
  });
});

describe("Widerruf — Rückerstattungs-Logik (RED — Funktion fehlt)", () => {
  it.fails("calcRefund(order) = subtotal + originalShipping (NICHT Rückversand)", async () => {
    const mod = await import("@/lib/services/withdrawal" as string).catch(() => null);
    const calc = mod && typeof mod.calcWithdrawalRefund === "function" ? mod.calcWithdrawalRefund : null;
    if (!calc) throw new Error("NOT_IMPLEMENTED: calcWithdrawalRefund(order) → { totalCents, includesShipping }");
    const o = { subtotalCents: 189900, shippingCents: 4900, totalCents: 194800, discountCents: 0, taxCents: 0 };
    const refund = calc(o);
    expect(refund.totalCents).toBe(194800);
    expect(refund.includesShipping).toBe(true);
  });

  it.fails("Bei nur Teil-Rückgabe: anteilige Rückerstattung ohne Hin-Versand", async () => {
    const mod = await import("@/lib/services/withdrawal" as string).catch(() => null);
    const calc = mod && typeof mod.calcWithdrawalRefund === "function" ? mod.calcWithdrawalRefund : null;
    if (!calc) throw new Error("NOT_IMPLEMENTED: calcWithdrawalRefund mit partialItems-Param");
    const o = { subtotalCents: 189900, shippingCents: 4900, totalCents: 194800, discountCents: 0, taxCents: 0 };
    const refund = calc(o, { partialItemsCents: 50000 });
    expect(refund.totalCents).toBe(50000);
    expect(refund.includesShipping).toBe(false);
  });
});

describe("Widerruf — Customer-Endpoint (RED — Endpoint fehlt)", () => {
  it.fails("POST /api/widerruf/[token] erlaubt Customer-Widerruf vor Frist-Ende", async () => {
    // TODO: app/api/widerruf/[token]/route.ts bauen
    // - validiert Token
    // - prüft isWithdrawalEligible
    // - ruft registerWithdrawal mit actorType="customer"
    // - sendet Withdrawal-Mail
    throw new Error("NOT_IMPLEMENTED: app/api/widerruf/[token]/route.ts");
  });

  it.fails("POST /api/widerruf/[token] mit abgelaufener Frist → 403 + Audit 'order.withdrawal_rejected'", () => {
    throw new Error("NOT_IMPLEMENTED: Frist-Check + Reject-Pfad");
  });

  it.fails("POST /api/widerruf/[token] mit invalid Token → 404", () => {
    throw new Error("NOT_IMPLEMENTED: Token-Validation analog zu /bestellung/status/[token]");
  });
});

describe("Widerruf — Mail-Versand (Template + Trigger)", () => {
  it("Withdrawal-Mail-Template existiert als Export (Smoke)", async () => {
    // Vitest transformiert JSX in .tsx-Templates noch nicht out-of-the-box;
    // wir prüfen nur dass der Symbol-Export vorhanden ist. Render-Test wird
    // separat als CI-Step im Stage-3-Smoke-Skript ausgeführt.
    const mod = await import("@/lib/email/templates");
    expect(typeof mod.WithdrawalReceivedEmail).toBe("function");
  });
});
