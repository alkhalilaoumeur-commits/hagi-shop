import Link from "next/link";
import { requireAdminAuth } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  await requireAdminAuth();

  const [productCount, orderCount, recentOrders] = await Promise.all([
    prisma.product.count(),
    prisma.order.count(),
    prisma.order.findMany({
      include: { items: { include: { product: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const revenue = await prisma.order.aggregate({
    _sum: { totalAmount: true },
    where: { status: "PAID" },
  });

  const statusMap: Record<string, string> = {
    PENDING: "Ausstehend",
    PAID: "Bezahlt",
    SHIPPED: "Versendet",
    DELIVERED: "Geliefert",
    CANCELLED: "Storniert",
  };

  return (
    <div className="min-h-screen bg-surface">
      {/* Admin-Navbar */}
      <header className="bg-ink text-bg px-6 py-4 flex items-center justify-between">
        <h1 className="font-serif text-lg">
          Hagi <span className="text-gold">Admin</span>
        </h1>
        <nav className="flex gap-6 text-sm">
          <Link href="/admin" className="hover:text-gold transition-colors">Dashboard</Link>
          <Link href="/admin/produkte" className="hover:text-gold transition-colors">Produkte</Link>
          <Link href="/admin/bestellungen" className="hover:text-gold transition-colors">Bestellungen</Link>
          <Link href="/" className="text-muted hover:text-gold transition-colors">→ Shop</Link>
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Produkte", value: productCount },
            { label: "Bestellungen", value: orderCount },
            { label: "Umsatz", value: formatPrice(revenue._sum.totalAmount ?? 0) },
            { label: "Heute", value: new Date().toLocaleDateString("de-DE") },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-bg border border-border p-4">
              <p className="text-xs text-muted uppercase tracking-wider mb-1">{kpi.label}</p>
              <p className="text-2xl font-bold text-ink">{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Schnellzugriff */}
        <div className="flex gap-3 mb-10">
          <Link
            href="/admin/produkte/neu"
            className="bg-green text-white px-5 py-2.5 text-sm font-medium hover:bg-green/90 transition-colors"
          >
            + Neues Produkt
          </Link>
          <Link
            href="/admin/bestellungen"
            className="border border-border text-ink px-5 py-2.5 text-sm font-medium hover:bg-surface transition-colors"
          >
            Alle Bestellungen
          </Link>
        </div>

        {/* Letzte Bestellungen */}
        <div>
          <h2 className="font-serif text-xl text-ink mb-4">Letzte Bestellungen</h2>
          {recentOrders.length === 0 ? (
            <p className="text-muted text-sm">Noch keine Bestellungen.</p>
          ) : (
            <div className="bg-bg border border-border divide-y divide-border">
              {recentOrders.map((order) => (
                <div key={order.id} className="px-4 py-3 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink">{order.customerName}</p>
                    <p className="text-xs text-muted">{order.customerEmail}</p>
                    <p className="text-xs text-muted">
                      {order.items.map((i) => i.product.name).join(", ")}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-gold">{formatPrice(order.totalAmount)}</p>
                    <p className="text-xs text-muted">{statusMap[order.status] ?? order.status}</p>
                    <p className="text-xs text-muted">
                      {new Date(order.createdAt).toLocaleDateString("de-DE")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
