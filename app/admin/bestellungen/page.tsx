"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/format";

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  product: { name: string };
}

interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  deliveryType: "SHIPPING" | "PICKUP";
  shippingStreet: string | null;
  shippingCity: string | null;
  shippingZip: string | null;
  status: "PENDING" | "PAID" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  totalAmount: number;
  createdAt: string;
  items: OrderItem[];
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Ausstehend",
  PAID: "Bezahlt",
  SHIPPED: "Versendet",
  DELIVERED: "Geliefert",
  CANCELLED: "Storniert",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  PAID: "bg-green/10 text-green",
  SHIPPED: "bg-blue-100 text-blue-700",
  DELIVERED: "bg-green/20 text-green",
  CANCELLED: "bg-signal/10 text-signal",
};

const STATUS_FLOW = ["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELLED"] as const;

export default function AdminBestellungenPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const adminPw =
    typeof window !== "undefined" ? sessionStorage.getItem("adminPw") ?? "" : "";

  const loadOrders = useCallback(async () => {
    const res = await fetch("/api/admin/bestellungen", {
      headers: { "x-admin-password": adminPw },
    });
    if (res.ok) {
      const data = await res.json();
      setOrders(data.orders ?? []);
    }
    setLoading(false);
  }, [adminPw]);

  useEffect(() => {
    if (!adminPw) {
      const pw = prompt("Admin-Passwort:");
      if (pw) sessionStorage.setItem("adminPw", pw);
      window.location.reload();
      return;
    }
    loadOrders();
  }, [adminPw, loadOrders]);

  const updateStatus = async (orderId: string, status: string) => {
    setUpdating(orderId);
    await fetch("/api/admin/bestellungen", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-admin-password": adminPw,
      },
      body: JSON.stringify({ id: orderId, status }),
    });
    await loadOrders();
    setUpdating(null);
  };

  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-ink text-bg px-6 py-4 flex items-center justify-between">
        <h1 className="font-serif text-lg">Hagi <span className="text-gold">Admin</span></h1>
        <nav className="flex gap-6 text-sm">
          <Link href="/admin" className="hover:text-gold">Dashboard</Link>
          <Link href="/admin/produkte" className="hover:text-gold">Produkte</Link>
          <Link href="/admin/bestellungen" className="text-gold">Bestellungen</Link>
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <h2 className="font-serif text-2xl text-ink mb-6">
          Bestellungen ({orders.length})
        </h2>

        {loading ? (
          <p className="text-muted text-sm">Laden…</p>
        ) : orders.length === 0 ? (
          <p className="text-muted text-sm bg-bg border border-border p-6">
            Noch keine Bestellungen.
          </p>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div key={order.id} className="bg-bg border border-border">
                {/* Kopfzeile */}
                <div
                  className="px-4 py-3 flex items-center gap-4 cursor-pointer hover:bg-surface"
                  onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                >
                  {/* Kunde */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink">{order.customerName}</p>
                    <p className="text-xs text-muted">{order.customerEmail}</p>
                    <p className="text-xs text-muted">
                      {order.items.map((i) => `${i.product.name} ×${i.quantity}`).join(", ")}
                    </p>
                  </div>

                  {/* Betrag + Status */}
                  <div className="text-right flex-shrink-0 space-y-1">
                    <p className="text-sm font-semibold text-gold">
                      {formatPrice(order.totalAmount)}
                    </p>
                    <span
                      className={`inline-block text-xs px-2 py-0.5 rounded-sm ${STATUS_COLORS[order.status]}`}
                    >
                      {STATUS_LABELS[order.status]}
                    </span>
                    <p className="text-xs text-muted">
                      {new Date(order.createdAt).toLocaleDateString("de-DE")}
                    </p>
                  </div>

                  {/* Toggle */}
                  <div className="text-muted text-xs flex-shrink-0 w-4 text-center">
                    {expanded === order.id ? "▲" : "▼"}
                  </div>
                </div>

                {/* Detail-Klappe */}
                {expanded === order.id && (
                  <div className="border-t border-border px-4 py-4 bg-surface space-y-4">
                    {/* Positionen */}
                    <div>
                      <p className="text-xs text-muted uppercase tracking-wider mb-2">Positionen</p>
                      <table className="w-full text-sm">
                        <tbody>
                          {order.items.map((item) => (
                            <tr key={item.id}>
                              <td className="py-0.5 text-ink">{item.product.name}</td>
                              <td className="py-0.5 text-muted text-right">×{item.quantity}</td>
                              <td className="py-0.5 text-right pl-4">{formatPrice(item.price * item.quantity)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Lieferung */}
                    <div>
                      <p className="text-xs text-muted uppercase tracking-wider mb-2">Lieferung</p>
                      {order.deliveryType === "PICKUP" ? (
                        <p className="text-sm text-ink">Selbstabholung Stuttgart</p>
                      ) : (
                        <p className="text-sm text-ink">
                          {order.shippingStreet}, {order.shippingZip} {order.shippingCity}
                        </p>
                      )}
                      {order.customerPhone && (
                        <p className="text-xs text-muted mt-1">Tel: {order.customerPhone}</p>
                      )}
                    </div>

                    {/* Status ändern */}
                    <div>
                      <p className="text-xs text-muted uppercase tracking-wider mb-2">Status ändern</p>
                      <div className="flex flex-wrap gap-2">
                        {STATUS_FLOW.map((s) => (
                          <button
                            key={s}
                            onClick={() => updateStatus(order.id, s)}
                            disabled={order.status === s || updating === order.id}
                            className={`text-xs px-3 py-1.5 border transition-colors disabled:opacity-40 ${
                              order.status === s
                                ? "border-gold bg-gold/10 text-gold cursor-default"
                                : "border-border text-muted hover:border-ink hover:text-ink"
                            }`}
                          >
                            {updating === order.id ? "…" : STATUS_LABELS[s]}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
