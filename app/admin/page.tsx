import Link from "next/link";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/services/admin-auth";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Eingegangen",
  CONFIRMED: "Bezahlt",
  COMPLETED: "Abgeschlossen",
  CANCELLED: "Storniert",
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: "#B89968",
  CONFIRMED: "#5C7A4B",
  COMPLETED: "#0F0A06",
  CANCELLED: "#7E2A1D",
};

export default async function AdminDashboardPage() {
  await requireAdmin();

  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    paidLast30,
    paidLast7,
    revenueLast30,
    pendingShipments,
    recentOrders,
    productsInStock,
    customerCount,
  ] = await Promise.all([
    prisma.order.count({ where: { paymentStatus: "PAID", paidAt: { gte: since30d } } }),
    prisma.order.count({ where: { paymentStatus: "PAID", paidAt: { gte: since7d } } }),
    prisma.order.aggregate({
      where: { paymentStatus: "PAID", paidAt: { gte: since30d } },
      _sum: { totalCents: true },
    }),
    prisma.order.count({
      where: {
        paymentStatus: "PAID",
        orderStatus: { not: "CANCELLED" },
        fulfillmentStatus: { not: "FULFILLED" },
        deliveryType: "SHIPPING",
      },
    }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        orderNumber: true,
        publicToken: true,
        customerEmail: true,
        totalCents: true,
        orderStatus: true,
        paymentStatus: true,
        fulfillmentStatus: true,
        createdAt: true,
        deliveryType: true,
      },
    }),
    prisma.product.count({ where: { inStock: true } }),
    prisma.customer.count({ where: { deletedAt: null } }),
  ]);

  return (
    <div className="space-y-12">
      <header>
        <p className="text-[10px] uppercase tracking-[0.25em] mb-3" style={{ color: "#B89968" }}>
          ✦ Übersicht · letzte 30 Tage
        </p>
        <h1 className="font-serif" style={{ fontSize: "clamp(2.2rem, 4vw, 3.2rem)", color: "#0F0A06" }}>
          Wie läuft der Laden?
        </h1>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <KPI label="Bestellungen 30T" value={String(paidLast30)} sub={`${paidLast7} in 7T`} />
        <KPI label="Umsatz 30T" value={formatPrice(revenueLast30._sum.totalCents ?? 0)} sub="brutto" />
        <KPI
          label="Versand offen"
          value={String(pendingShipments)}
          sub={pendingShipments > 0 ? "wartet auf dich" : "alles raus"}
          accent={pendingShipments > 0 ? "#A33B2A" : "#5C7A4B"}
        />
        <KPI label="Produkte aktiv" value={String(productsInStock)} sub={`${customerCount} Kunden`} />
      </section>

      <section>
        <div className="flex items-end justify-between mb-6">
          <p className="text-[10px] uppercase tracking-[0.22em]" style={{ color: "#B89968" }}>
            ✦ Letzte Bestellungen
          </p>
          <Link
            href="/admin/bestellungen"
            className="text-[11px] uppercase tracking-[0.15em] pb-1"
            style={{ color: "#A33B2A", borderBottom: "1px solid #A33B2A" }}
          >
            Alle ansehen →
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <p style={{ color: "#5A4A3A" }}>Noch keine Bestellungen.</p>
        ) : (
          <div className="divide-y" style={{ borderColor: "#E5DCC8", background: "#FFFFFF", border: "1px solid #E5DCC8" }}>
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/admin/bestellungen/${order.id}`}
                className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-5 py-4 items-center transition-colors hover:bg-[#FAFAF7]"
              >
                <span
                  className="text-[9px] uppercase tracking-[0.22em] font-bold px-2 py-0.5"
                  style={{ background: STATUS_COLOR[order.orderStatus] ?? "#8A7866", color: "#FAFAF7" }}
                >
                  {STATUS_LABEL[order.orderStatus] ?? order.orderStatus}
                </span>
                <div>
                  <p className="font-mono text-sm" style={{ color: "#0F0A06" }}>
                    {order.orderNumber}
                  </p>
                  <p className="text-[11px]" style={{ color: "#8A7866" }}>
                    {order.customerEmail} · {order.deliveryType === "PICKUP" ? "Abholung" : "Versand"}
                  </p>
                </div>
                <p
                  className="text-[10px] uppercase tracking-[0.15em] font-mono hidden md:block"
                  style={{ color: "#8A7866" }}
                >
                  {new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(order.createdAt)}
                </p>
                <p className="font-mono text-sm text-right" style={{ color: "#0F0A06" }}>
                  {formatPrice(order.totalCents)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <QuickAction
          href="/admin/bestellung-anlegen"
          label="Showroom-Verkauf eintragen"
          description="Walk-in-Kunde im Showroom? Manuelle Order anlegen damit Inventar synchron bleibt."
        />
        <QuickAction
          href="/admin/export"
          label="CSV für Steuerberater"
          description="Zeitraum wählen, DATEV-kompatible Datei runterladen."
        />
      </section>
    </div>
  );
}

function KPI({ label, value, sub, accent = "#0F0A06" }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="p-5" style={{ background: "#FFFFFF", border: "1px solid #E5DCC8" }}>
      <p className="text-[10px] uppercase tracking-[0.18em] mb-2" style={{ color: "#8A7866" }}>
        {label}
      </p>
      <p className="font-serif" style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", color: accent, lineHeight: 1 }}>
        {value}
      </p>
      {sub && (
        <p className="text-[10px] mt-2" style={{ color: "#5A4A3A" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

function QuickAction({ href, label, description }: { href: string; label: string; description: string }) {
  return (
    <Link
      href={href}
      className="block p-6 transition-colors hover:bg-[#0F0A06] group"
      style={{ background: "#F0EAD8", border: "1px solid #E5DCC8" }}
    >
      <p className="font-serif text-xl mb-2 group-hover:text-[#FAFAF7]" style={{ color: "#0F0A06" }}>
        {label} →
      </p>
      <p className="text-sm group-hover:text-[#D2C9B5]" style={{ color: "#5A4A3A" }}>
        {description}
      </p>
    </Link>
  );
}
