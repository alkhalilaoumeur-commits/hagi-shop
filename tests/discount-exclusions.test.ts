import { describe, it, expect, beforeAll, afterAll } from "vitest";
import prisma from "@/lib/prisma";
import { previewDiscount } from "@/lib/services/discount";

/**
 * Regressionstest für B2-F1 (MEDIUM): `excludedProductIds`/`excludedCategoryIds`
 * wurden vor dem Fix nie ausgewertet → Rabatt griff auf ausgeschlossene Produkte
 * (stiller Margenverlust). Jetzt reduziert der Ausschluss die rabattfähige Basis.
 */
describe("Discount — Produkt-/Kategorie-Ausschlüsse", () => {
  const code = "EXCL10-" + Date.now();
  const EXCLUDED_PRODUCT = "prod-excluded-" + Date.now();
  const NORMAL_PRODUCT = "prod-normal-" + Date.now();
  const EXCLUDED_CATEGORY = "cat-excluded-" + Date.now();

  beforeAll(async () => {
    await prisma.discount.create({
      data: {
        code,
        type: "PERCENTAGE",
        value: 10,
        validFrom: new Date(Date.now() - 1000),
        active: true,
        excludedProductIds: [EXCLUDED_PRODUCT],
        excludedCategoryIds: [EXCLUDED_CATEGORY],
      },
    });
  });
  afterAll(async () => {
    await prisma.discount.deleteMany({ where: { code } });
  });

  it("ohne Item-Liste = volle Basis (Rückwärtskompatibilität)", async () => {
    const r = await previewDiscount({ code, subtotalCents: 100000, shippingCents: 0 });
    expect(r?.discountCents).toBe(10000); // 10% von 1000€
  });

  it("ausgeschlossenes Produkt zählt NICHT zur Rabattbasis", async () => {
    const r = await previewDiscount({
      code,
      subtotalCents: 100000,
      shippingCents: 0,
      items: [
        { productId: NORMAL_PRODUCT, categoryId: null, lineSubtotalCents: 60000 },
        { productId: EXCLUDED_PRODUCT, categoryId: null, lineSubtotalCents: 40000 },
      ],
    });
    expect(r?.discountCents).toBe(6000); // 10% nur von 600€
  });

  it("ausgeschlossene Kategorie zählt NICHT zur Rabattbasis", async () => {
    const r = await previewDiscount({
      code,
      subtotalCents: 100000,
      shippingCents: 0,
      items: [
        { productId: NORMAL_PRODUCT, categoryId: "cat-normal", lineSubtotalCents: 70000 },
        { productId: "prod-x", categoryId: EXCLUDED_CATEGORY, lineSubtotalCents: 30000 },
      ],
    });
    expect(r?.discountCents).toBe(7000); // 10% nur von 700€
  });

  it("alle Positionen ausgeschlossen → Rabatt 0", async () => {
    const r = await previewDiscount({
      code,
      subtotalCents: 40000,
      shippingCents: 0,
      items: [{ productId: EXCLUDED_PRODUCT, categoryId: null, lineSubtotalCents: 40000 }],
    });
    expect(r?.discountCents).toBe(0);
  });
});
