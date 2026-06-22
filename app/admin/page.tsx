import Link from "next/link";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/services/admin-auth";
import { formatPrice } from "@/lib/format";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { Card, KpiCard } from "@/components/admin/ui/Card";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { AdminLink } from "@/components/admin/ui/AdminButton";
import { ORDER_STATUS, deliveryLabel, metaOf } from "@/lib/admin/status-labels";

export const dynamic = "force-dynamic";

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
    productsOutOfStock,
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
        customerEmail: true,
        totalCents: true,
        orderStatus: true,
        createdAt: true,
        deliveryType: true,
      },
    }),
    prisma.product.count({ where: { inStock: true } }),
    prisma.product.count({ where: { inStock: false } }),
    prisma.customer.count({ where: { deletedAt: null } }),
  ]);

  const revenue = revenueLast30._sum.totalCents ?? 0;
  const aov = paidLast30 > 0 ? Math.round(revenue / paidLast30) : 0;

  // "Aktionen nötig" — nur anzeigen, was wirklich Aufmerksamkeit braucht.
  const alerts: { label: string; href: string; tone: "sienna" | "gold" }[] = [];
  if (pendingShipments > 0) {
    alerts.push({
      label: `${pendingShipments} Bestellung${pendingShipments === 1 ? "" : "en"} warten auf Versand`,
      href: "/admin/bestellungen?fulfillment=UNFULFILLED",
      tone: "sienna",
    });
  }
  if (productsOutOfStock > 0) {
    alerts.push({
      label: `${productsOutOfStock} Produkt${productsOutOfStock === 1 ? "" : "e"} ausverkauft`,
      href: "/admin/produkte",
      tone: "gold",
    });
  }

  return (
    <div className="space-y-12">
      <PageHeader eyebrow="Übersicht · letzte 30 Tage" title="Wie läuft der Laden?" />

      {/* Aktionen nötig */}
      {alerts.length > 0 && (
        <section className="space-y-2">
          {alerts.map((a) => (
            <Link
              key={a.href + a.label}
              href={a.href}
              className={`flex items-center justify-between gap-4 px-5 py-3 border-l-4 bg-bg-card border border-border transition-colors hover:bg-bg-sand ${
                a.tone === "sienna" ? "border-l-sienna" : "border-l-gold"
              }`}
            >
              <span className="text-sm text-ink">{a.label}</span>
              <span className="text-[11px] uppercase tracking-[0.15em] text-sienna">Ansehen →</span>
            </Link>
          ))}
        </section>
      )}

      {/* Kennzahlen */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <KpiCard label="Bestellungen 30T" value={String(paidLast30)} sub={`${paidLast7} in 7 Tagen`} />
        <KpiCard label="Umsatz 30T" value={formatPrice(revenue)} sub="brutto" />
        <KpiCard label="Ø Bestellwert" value={formatPrice(aov)} sub="letzte 30 Tage" />
        <KpiCard
          label="Versand offen"
          value={String(pendingShipments)}
          sub={pendingShipments > 0 ? "wartet auf dich" : "alles raus"}
          accent={pendingShipments > 0 ? "sienna" : "green"}
        />
      </section>

      {/* Letzte Bestellungen */}
      <section>
        <div className="flex items-end justify-between mb-6">
          <p className="text-[10px] uppercase tracking-[0.22em] text-gold">✦ Letzte Bestellungen</p>
          <AdminLink href="/admin/bestellungen" variant="ghost" size="sm">
            Alle ansehen →
          </AdminLink>
        </div>

        {recentOrders.length === 0 ? (
          <p className="text-ink-muted">Noch keine Bestellungen.</p>
        ) : (
          <Card className="divide-y divide-border">
            {recentOrders.map((order) => {
              const meta = metaOf(ORDER_STATUS, order.orderStatus);
              return (
                <Link
                  key={order.id}
                  href={`/admin/bestellungen/${order.id}`}
                  className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-5 py-4 items-center transition-colors hover:bg-bg-sand"
                >
                  <StatusBadge label={meta.label} tone={meta.tone} />
                  <div>
                    <p className="font-mono text-sm text-ink">{order.orderNumber}</p>
                    <p className="text-[11px] text-muted">
                      {order.customerEmail} · {deliveryLabel(order.deliveryType)}
                    </p>
                  </div>
                  <p className="text-[10px] uppercase tracking-[0.15em] font-mono hidden md:block text-muted">
                    {new Intl.DateTimeFormat("de-DE", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(order.createdAt)}
                  </p>
                  <p className="font-mono text-sm text-right text-ink">{formatPrice(order.totalCents)}</p>
                </Link>
              );
            })}
          </Card>
        )}
      </section>

      {/* Sekundär-Kennzahlen + Quick-Actions */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="grid grid-cols-2 gap-6">
          <KpiCard label="Produkte aktiv" value={String(productsInStock)} sub={`${productsOutOfStock} ausverkauft`} />
          <KpiCard label="Kunden" value={String(customerCount)} sub="mit Konto" />
        </div>
        <div className="grid grid-cols-1 gap-3">
          <QuickAction
            href="/admin/bestellung-anlegen"
            label="Showroom-Verkauf eintragen"
            description="Walk-in-Kunde im Showroom? Manuelle Order anlegen, damit das Inventar synchron bleibt."
          />
          <QuickAction
            href="/admin/export"
            label="CSV für Steuerberater"
            description="Zeitraum wählen, DATEV-kompatible Datei runterladen."
          />
        </div>
      </section>
    </div>
  );
}

function QuickAction({ href, label, description }: { href: string; label: string; description: string }) {
  return (
    <Link
      href={href}
      className="block p-5 bg-bg-elevated border border-border transition-colors hover:bg-ink group"
    >
      <p className="font-serif text-lg mb-1 text-ink group-hover:text-bone">{label} →</p>
      <p className="text-sm text-ink-muted group-hover:text-[#D2C9B5]">{description}</p>
    </Link>
  );
}
