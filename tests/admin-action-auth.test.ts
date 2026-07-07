/**
 * Regressionstest für die Auth-Test-Lücke aus Block 1: Es gab keinen Test, der
 * beweist, dass die mutierenden Admin-Server-Actions + der CSV-Export OHNE gültige
 * Session abgewiesen werden. Alle rufen `requireAdmin()` vor jeder DB-Mutation.
 *
 * Hier wird `requireAdmin` so gemockt, dass es ohne Session wirft (wie der echte
 * redirect("/admin/login")). Jede Action/Route MUSS dann abbrechen, bevor sie
 * irgendetwas tut.
 */
import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { NextRequest } from "next/server";

const requireAdminMock = vi.fn();
vi.mock("@/lib/services/admin-auth", () => ({
  requireAdmin: () => requireAdminMock(),
  getCurrentAdmin: vi.fn(async () => null),
}));

import {
  adminMarkShipped,
  adminMarkDelivered,
  adminCancelOrder,
  adminMarkReturnReceived,
  adminRefundWithdrawal,
  adminUpdateInternalNote,
} from "@/app/actions/admin-orders";
import { createManualOrderAction } from "@/app/actions/admin-manual-order";
import {
  startTotpEnrollmentAction,
  confirmTotpEnrollmentAction,
  disableTotpAction,
} from "@/app/actions/admin-2fa";
import { GET as exportOrders } from "@/app/api/admin/export-orders/route";

describe("Admin-Actions Auth-Guard (ohne Session → abgewiesen)", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    // Simuliert requireAdmin ohne gültige Session (echter Code: redirect → throw)
    requireAdminMock.mockRejectedValue(new Error("UNAUTHORIZED_REDIRECT"));
  });

  const cases: [string, () => Promise<unknown>][] = [
    ["adminMarkShipped", () => adminMarkShipped({ orderId: "o1", trackingNumber: "TRK123", carrier: "DHL" })],
    ["adminMarkDelivered", () => adminMarkDelivered({ orderId: "o1" })],
    ["adminCancelOrder", () => adminCancelOrder({ orderId: "o1", reason: "Test-Storno" })],
    ["adminMarkReturnReceived", () => adminMarkReturnReceived({ orderId: "o1" })],
    ["adminRefundWithdrawal", () => adminRefundWithdrawal({ orderId: "o1", refundCents: 100 })],
    ["adminUpdateInternalNote", () => adminUpdateInternalNote({ orderId: "o1", note: "n" })],
    ["createManualOrderAction", () => createManualOrderAction({})],
    ["startTotpEnrollmentAction", () => startTotpEnrollmentAction()],
    ["confirmTotpEnrollmentAction", () => confirmTotpEnrollmentAction({ token: "123456" })],
    ["disableTotpAction", () => disableTotpAction({ token: "123456" })],
  ];

  for (const [name, invoke] of cases) {
    it(`${name} bricht ohne Session ab (requireAdmin wirft)`, async () => {
      await expect(invoke()).rejects.toThrow();
      expect(requireAdminMock).toHaveBeenCalled();
    });
  }

  it("GET /api/admin/export-orders bricht ohne Session ab (kein PII-CSV)", async () => {
    const req = new NextRequest("http://localhost/api/admin/export-orders?from=2026-01-01&to=2026-12-31");
    await expect(exportOrders(req)).rejects.toThrow();
    expect(requireAdminMock).toHaveBeenCalled();
  });
});

afterAll(() => vi.restoreAllMocks());
