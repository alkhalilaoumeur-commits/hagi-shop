/**
 * Regressionstest für den Security-Fix vom 2026-06-22.
 *
 * Vorher: `/api/admin/produkte` + `/api/admin/kategorien` riefen `checkAdminRequest`
 * ohne `await` auf → ein Promise ist immer truthy → der 401-Block lief NIE → die
 * Routen waren faktisch ungeschützt (Produkte anlegen/ändern/löschen ohne Session).
 *
 * Dieser Test mockt `getCurrentAdmin` und stellt sicher:
 *  - keine gültige Session  → JEDE Methode antwortet 401 (vor dem DB-Zugriff)
 *  - gültige Session        → die Route lässt durch (kein 401)
 *
 * Gegen den alten Code (fehlendes await) würde der "ohne Session → 401"-Block
 * fehlschlagen.
 */
import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { NextRequest } from "next/server";

// getCurrentAdmin wird pro Test umgeschaltet (null = nicht eingeloggt).
const getCurrentAdminMock = vi.fn();
vi.mock("@/lib/services/admin-auth", () => ({
  getCurrentAdmin: () => getCurrentAdminMock(),
}));

import { GET as listProducts, POST as createProduct } from "@/app/api/admin/produkte/route";
import {
  GET as getProduct,
  PATCH as patchProduct,
  DELETE as deleteProduct,
} from "@/app/api/admin/produkte/[id]/route";
import { GET as listCategories, POST as createCategory } from "@/app/api/admin/kategorien/route";

const jsonReq = (body: unknown) =>
  new NextRequest("http://localhost/api/admin/x", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
const params = { params: Promise.resolve({ id: "does-not-exist" }) };

describe("Admin-API Auth-Guard (Regression: fehlendes await)", () => {
  beforeEach(() => getCurrentAdminMock.mockReset());

  describe("OHNE gültige Session → 401", () => {
    beforeEach(() => getCurrentAdminMock.mockResolvedValue(null));

    it("GET /api/admin/produkte → 401", async () => {
      expect((await listProducts()).status).toBe(401);
    });
    it("POST /api/admin/produkte → 401 (kein Schreibzugriff)", async () => {
      const res = await createProduct(jsonReq({ name: "HACK", price: 1, categoryId: "x" }));
      expect(res.status).toBe(401);
    });
    it("GET /api/admin/produkte/[id] → 401", async () => {
      expect((await getProduct(jsonReq({}), params)).status).toBe(401);
    });
    it("PATCH /api/admin/produkte/[id] → 401 (keine Preisänderung)", async () => {
      const res = await patchProduct(jsonReq({ price: 1 }), params);
      expect(res.status).toBe(401);
    });
    it("DELETE /api/admin/produkte/[id] → 401 (kein Löschen)", async () => {
      expect((await deleteProduct(jsonReq({}), params)).status).toBe(401);
    });
    it("GET /api/admin/kategorien → 401", async () => {
      expect((await listCategories()).status).toBe(401);
    });
    it("POST /api/admin/kategorien → 401", async () => {
      expect((await createCategory(jsonReq({ name: "HACK" }))).status).toBe(401);
    });
  });

  describe("MIT gültiger Session → kein 401", () => {
    beforeEach(() =>
      getCurrentAdminMock.mockResolvedValue({ id: "admin-1", email: "a@x.de", displayName: "A" }),
    );

    it("GET /api/admin/produkte lässt durch (200)", async () => {
      expect((await listProducts()).status).toBe(200);
    });
    it("GET /api/admin/kategorien lässt durch (200)", async () => {
      expect((await listCategories()).status).toBe(200);
    });
  });
});

afterAll(() => vi.restoreAllMocks());
