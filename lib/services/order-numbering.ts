import prisma from "@/lib/prisma";

/**
 * Atomare Order-Number-Generierung via Postgres UPSERT mit Returning.
 * Format: HAG-YYYY-NNNNNN (z.B. HAG-2026-000042).
 * Race-condition-sicher: nutzt CounterRow per Jahr mit UPDATE...RETURNING.
 */
export async function nextOrderNumber(): Promise<string> {
  const year = new Date().getUTCFullYear();

  const counter = await prisma.orderCounter.upsert({
    where: { year },
    update: { value: { increment: 1 } },
    create: { year, value: 1 },
    select: { value: true },
  });

  const padded = String(counter.value).padStart(6, "0");
  return `HAG-${year}-${padded}`;
}
