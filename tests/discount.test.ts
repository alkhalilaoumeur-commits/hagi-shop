import { describe, it, expect, beforeAll, afterAll } from "vitest";
import prisma from "@/lib/prisma";
import { previewDiscount, redeemDiscount, releaseDiscount } from "@/lib/services/discount";

describe("Discount — PERCENTAGE Berechnung", () => {
  const code = "TEST10P-" + Date.now();
  beforeAll(async () => {
    await prisma.discount.create({
      data: {
        code,
        type: "PERCENTAGE",
        value: 10,
        validFrom: new Date(Date.now() - 1000),
        active: true,
      },
    });
  });
  afterAll(async () => {
    await prisma.discount.deleteMany({ where: { code } });
  });

  it("10% auf 1899,00€ = 189,90€", async () => {
    const r = await previewDiscount({ code, subtotalCents: 189900, shippingCents: 0 });
    expect(r?.discountCents).toBe(18990);
  });

  it("10% auf 0€ = 0€", async () => {
    const r = await previewDiscount({ code, subtotalCents: 0, shippingCents: 0 });
    expect(r?.discountCents).toBe(0);
  });

  it("PERCENTAGE-Code rabattiert NICHT den Versand (appliesToShipping=false)", async () => {
    const r = await previewDiscount({ code, subtotalCents: 100000, shippingCents: 0 });
    expect(r?.appliesToShipping).toBe(false);
  });
});

describe("Discount — FIXED_AMOUNT Berechnung", () => {
  const code = "TEST50F-" + Date.now();
  beforeAll(async () => {
    await prisma.discount.create({
      data: {
        code,
        type: "FIXED_AMOUNT",
        value: 5000,
        validFrom: new Date(Date.now() - 1000),
        active: true,
      },
    });
  });
  afterAll(async () => {
    await prisma.discount.deleteMany({ where: { code } });
  });

  it("50€-Fix-Rabatt = 5000 cents", async () => {
    const r = await previewDiscount({ code, subtotalCents: 100000, shippingCents: 0 });
    expect(r?.discountCents).toBe(5000);
  });
});

describe("Discount — FREE_SHIPPING", () => {
  const code = "FREESHIP-" + Date.now();
  beforeAll(async () => {
    await prisma.discount.create({
      data: {
        code,
        type: "FREE_SHIPPING",
        value: 0,
        validFrom: new Date(Date.now() - 1000),
        active: true,
      },
    });
  });
  afterAll(async () => {
    await prisma.discount.deleteMany({ where: { code } });
  });

  it("FREE_SHIPPING setzt appliesToShipping=true", async () => {
    const r = await previewDiscount({ code, subtotalCents: 100000, shippingCents: 0 });
    expect(r?.appliesToShipping).toBe(true);
  });
});

describe("Discount — usedCount lifecycle (redeem + release)", () => {
  const code = "RELEASE-" + Date.now();
  beforeAll(async () => {
    await prisma.discount.create({
      data: {
        code,
        type: "PERCENTAGE",
        value: 5,
        usageLimit: 10,
        validFrom: new Date(Date.now() - 1000),
        active: true,
      },
    });
  });
  afterAll(async () => {
    await prisma.discount.deleteMany({ where: { code } });
  });

  it("redeemDiscount inkrementiert usedCount", async () => {
    await redeemDiscount({ code, subtotalCents: 100000, shippingCents: 0 });
    const d = await prisma.discount.findUnique({ where: { code } });
    expect(d?.usedCount).toBeGreaterThanOrEqual(1);
  });

  it("releaseDiscount dekrementiert usedCount (bei Cancel)", async () => {
    const before = (await prisma.discount.findUnique({ where: { code } }))?.usedCount ?? 0;
    await releaseDiscount(code);
    const after = (await prisma.discount.findUnique({ where: { code } }))?.usedCount ?? 0;
    expect(after).toBe(Math.max(0, before - 1));
  });

  it("releaseDiscount unter 0 geht nicht (Guard usedCount > 0)", async () => {
    await prisma.discount.update({ where: { code }, data: { usedCount: 0 } });
    await releaseDiscount(code);
    const d = await prisma.discount.findUnique({ where: { code } });
    expect(d?.usedCount).toBe(0);
  });
});

describe("Discount — Mindestbestellwert + Gültigkeit", () => {
  const code = "MIN500-" + Date.now();
  beforeAll(async () => {
    await prisma.discount.create({
      data: {
        code,
        type: "PERCENTAGE",
        value: 10,
        minOrderCents: 50000,
        validFrom: new Date(Date.now() - 1000),
        active: true,
      },
    });
  });
  afterAll(async () => {
    await prisma.discount.deleteMany({ where: { code } });
  });

  it("Subtotal unter min → MIN_ORDER-Fehler", async () => {
    const r = await previewDiscount({ code, subtotalCents: 10000, shippingCents: 0 });
    expect(r?.errors?.length ?? 0).toBeGreaterThan(0);
  });

  it("Subtotal über min → Discount greift", async () => {
    const r = await previewDiscount({ code, subtotalCents: 60000, shippingCents: 0 });
    expect(r?.discountCents).toBeGreaterThan(0);
  });
});

describe("Discount — Gültigkeitsfenster + Inaktiv", () => {
  it("Inaktiver Code → INVALID", async () => {
    const c = "INACTIVE-" + Date.now();
    await prisma.discount.create({
      data: { code: c, type: "PERCENTAGE", value: 10, validFrom: new Date(Date.now() - 1000), active: false },
    });
    const r = await previewDiscount({ code: c, subtotalCents: 100000, shippingCents: 0 });
    expect(r?.errors).toContain("INVALID");
    await prisma.discount.deleteMany({ where: { code: c } });
  });

  it("Noch nicht aktiver Code → NOT_YET_ACTIVE", async () => {
    const c = "FUTURE-" + Date.now();
    await prisma.discount.create({
      data: { code: c, type: "PERCENTAGE", value: 10, validFrom: new Date(Date.now() + 1000 * 60 * 60 * 24), active: true },
    });
    const r = await previewDiscount({ code: c, subtotalCents: 100000, shippingCents: 0 });
    expect(r?.errors).toContain("NOT_YET_ACTIVE");
    await prisma.discount.deleteMany({ where: { code: c } });
  });

  it("Abgelaufener Code → EXPIRED", async () => {
    const c = "EXPIRED-" + Date.now();
    await prisma.discount.create({
      data: {
        code: c,
        type: "PERCENTAGE",
        value: 10,
        validFrom: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
        validUntil: new Date(Date.now() - 1000 * 60 * 60),
        active: true,
      },
    });
    const r = await previewDiscount({ code: c, subtotalCents: 100000, shippingCents: 0 });
    expect(r?.errors).toContain("EXPIRED");
    await prisma.discount.deleteMany({ where: { code: c } });
  });
});
