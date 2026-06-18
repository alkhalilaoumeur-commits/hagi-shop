import Link from "next/link";
import type { Metadata } from "next";
import { requireCustomer } from "@/lib/services/customer-auth";
import prisma from "@/lib/prisma";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Meine Bestellungen — Hagi Teppiche", robots: { index: false } };
export const dynamic = "force-dynamic";

function statusLabel(orderStatus: string, fulfillmentStatus: string): { text: string; color: string } {
  if (orderStatus === "CANCELLED") return { text: "Storniert", color: "#7E2A1D" };
  if (fulfillmentStatus === "RETURNED") return { text: "Retourniert", color: "#8A7866" };
  if (orderStatus === "COMPLETED" || fulfillmentStatus === "FULFILLED")
    return { text: "Abgeschlossen", color: "#2F5A2F" };
  if (orderStatus === "CONFIRMED") return { text: "In Bearbeitung", color: "#A33B2A" };
  return { text: "Offen", color: "#B89968" };
}

export default async function BestellungenPage() {
  const customer = await requireCustomer();
  const orders = await prisma.order.findMany({
    where: { customerId: customer.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      orderNumber: true,
      publicToken: true,
      createdAt: true,
      totalCents: true,
      orderStatus: true,
      fulfillmentStatus: true,
      items: { select: { productTitle: true, quantity: true } },
    },
  });

  return (
    <main style={{ background: "#FAFAF7", minHeight: "70vh" }} className="px-6 py-16">
      <div className="max-w-page mx-auto">
        <Link href="/konto" className="text-[11px] uppercase tracking-[0.18em]" style={{ color: "#8A7866" }}>
          ← Mein Konto
        </Link>
        <h1 className="font-serif text-4xl mt-4 mb-10" style={{ color: "#0F0A06" }}>
          Meine Bestellungen
        </h1>

        {orders.length === 0 ? (
          <div className="p-8 text-center" style={{ background: "#FFFFFF", border: "1px solid #E5DCC8" }}>
            <p className="text-sm" style={{ color: "#5A4A3A" }}>
              Sie haben noch keine Bestellungen.
            </p>
            <Link
              href="/produkte"
              className="inline-block mt-4 px-6 py-3 text-[11px] font-bold uppercase tracking-[0.18em]"
              style={{ background: "#0F0A06", color: "#FAFAF7" }}
            >
              Kollektion ansehen
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => {
              const status = statusLabel(o.orderStatus, o.fulfillmentStatus);
              const itemSummary = o.items
                .map((i) => `${i.quantity}× ${i.productTitle}`)
                .join(", ");
              return (
                <Link
                  key={o.id}
                  href={`/bestellung/status/${o.publicToken}`}
                  className="p-5 flex items-center justify-between gap-4 transition-colors hover:bg-white"
                  style={{ background: "#FFFFFF", border: "1px solid #E5DCC8" }}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm" style={{ color: "#0F0A06" }}>
                        {o.orderNumber}
                      </span>
                      <span
                        className="text-[10px] uppercase tracking-[0.15em] px-2 py-0.5"
                        style={{ color: status.color, border: `1px solid ${status.color}` }}
                      >
                        {status.text}
                      </span>
                    </div>
                    <p className="text-xs mt-1 truncate" style={{ color: "#8A7866" }}>
                      {o.createdAt.toLocaleDateString("de-DE")} · {itemSummary}
                    </p>
                  </div>
                  <div className="font-mono text-sm whitespace-nowrap" style={{ color: "#0F0A06" }}>
                    {formatPrice(o.totalCents)}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
