import type { Prisma } from "@prisma/client";

/**
 * Nimmt die Unikat-Produkte (`isUnique: true`) einer Order atomar aus dem Bestand.
 * Serienware (`isUnique: false`) ist unbegrenzt verfügbar und wird nicht angefasst.
 *
 * Der Claim MUSS innerhalb der Transaktion laufen, die auch den Order-Status
 * ändert. Nur so committet/rollbackt "Unikat verkauft" gemeinsam mit "Order bezahlt":
 * - Webhook-Retry nach erfolgreichem Commit → Order ist bereits PAID → früher Early-Return.
 * - Retry nach Rollback → Bestand wurde mit zurückgerollt → Claim greift sauber erneut.
 * - Zwei verschiedene Orders auf dasselbe Unikat → Postgres serialisiert die Zeile,
 *   der zweite `updateMany` sieht `inStock: false` → count 0 → `unavailable`.
 *
 * Gibt zurück, welche Unikate NICHT mehr verfügbar waren (bereits verkauft).
 */
export async function claimUniqueStock(
  tx: Prisma.TransactionClient,
  productIds: (string | null | undefined)[],
): Promise<{ claimed: string[]; unavailable: string[] }> {
  const ids = [...new Set(productIds.filter((id): id is string => !!id))];
  if (ids.length === 0) return { claimed: [], unavailable: [] };

  const uniqueProducts = await tx.product.findMany({
    where: { id: { in: ids }, isUnique: true },
    select: { id: true },
  });

  const claimed: string[] = [];
  const unavailable: string[] = [];
  for (const { id } of uniqueProducts) {
    const res = await tx.product.updateMany({
      where: { id, isUnique: true, inStock: true },
      data: { inStock: false },
    });
    if (res.count === 1) claimed.push(id);
    else unavailable.push(id);
  }
  return { claimed, unavailable };
}
