import { describe, it, expect, beforeEach, afterEach } from "vitest";
import prisma from "@/lib/prisma";
import { claimUniqueStock } from "@/lib/services/stock";
import { ensureProduct } from "./_helpers/factory";

/**
 * Regressionstest für B3-F1 (HIGH): Unikat-Doppelverkauf.
 * `claimUniqueStock` ist der gemeinsame atomare Bestands-Claim, auf den sich
 * sowohl der Stripe-Webhook (bezahlte Order) als auch die Manual-Showroom-Order
 * stützen. Er MUSS dasselbe Unikat genau EINMAL vergeben — auch bei parallelem
 * Zugriff (zwei Online-Käufer, oder Online + Showroom).
 */
describe("Stock — atomarer Unikat-Claim (Doppelverkauf-Schutz)", () => {
  let categoryId: string;
  let uniqueId: string;
  let serialId: string;

  beforeEach(async () => {
    ({ categoryId } = await ensureProduct());
    const stamp = `${Date.now()}-${process.hrtime.bigint()}`;
    const uniq = await prisma.product.create({
      data: {
        name: "Unikat-Concurrency", slug: `uc-${stamp}`, description: "x",
        price: 250000, sku: `UC-${stamp}`, categoryId, images: [],
        inStock: true, isUnique: true,
      },
    });
    uniqueId = uniq.id;
    const serial = await prisma.product.create({
      data: {
        name: "Serie-Concurrency", slug: `sc-${stamp}`, description: "x",
        price: 9900, sku: `SC-${stamp}`, categoryId, images: [],
        inStock: true, isUnique: false,
      },
    });
    serialId = serial.id;
  });

  afterEach(async () => {
    await prisma.product.deleteMany({ where: { id: { in: [uniqueId, serialId] } } }).catch(() => {});
  });

  it("erster Claim vergibt das Unikat, zweiter sieht es als unavailable", async () => {
    const first = await prisma.$transaction((tx) => claimUniqueStock(tx, [uniqueId]));
    expect(first.claimed).toEqual([uniqueId]);
    expect(first.unavailable).toEqual([]);

    const second = await prisma.$transaction((tx) => claimUniqueStock(tx, [uniqueId]));
    expect(second.claimed).toEqual([]);
    expect(second.unavailable).toEqual([uniqueId]);

    const p = await prisma.product.findUnique({ where: { id: uniqueId } });
    expect(p?.inStock).toBe(false);
  });

  it("Serienware (isUnique=false) wird nie geclaimt und bleibt inStock", async () => {
    const r = await prisma.$transaction((tx) => claimUniqueStock(tx, [serialId]));
    expect(r.claimed).toEqual([]);
    expect(r.unavailable).toEqual([]);
    const p = await prisma.product.findUnique({ where: { id: serialId } });
    expect(p?.inStock).toBe(true);
  });

  it("PARALLELE Claims auf dasselbe Unikat → genau EINER gewinnt", async () => {
    const results = await Promise.allSettled([
      prisma.$transaction((tx) => claimUniqueStock(tx, [uniqueId])),
      prisma.$transaction((tx) => claimUniqueStock(tx, [uniqueId])),
      prisma.$transaction((tx) => claimUniqueStock(tx, [uniqueId])),
    ]);
    const claimedCount = results
      .filter((r): r is PromiseFulfilledResult<{ claimed: string[]; unavailable: string[] }> => r.status === "fulfilled")
      .filter((r) => r.value.claimed.includes(uniqueId)).length;
    expect(claimedCount).toBe(1);

    const p = await prisma.product.findUnique({ where: { id: uniqueId } });
    expect(p?.inStock).toBe(false);
  });

  it("gemischte Order: Unikat wird geclaimt, wenn schon verkauft → unavailable meldet genau das Unikat", async () => {
    await prisma.$transaction((tx) => claimUniqueStock(tx, [uniqueId]));
    const r = await prisma.$transaction((tx) => claimUniqueStock(tx, [uniqueId, serialId]));
    expect(r.unavailable).toEqual([uniqueId]);
    expect(r.claimed).toEqual([]);
  });
});
