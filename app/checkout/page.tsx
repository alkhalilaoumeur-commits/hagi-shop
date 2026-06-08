"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-store";
import { formatPrice } from "@/lib/format";

type DeliveryType = "SHIPPING" | "PICKUP";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, total } = useCart();
  const [delivery, setDelivery] = useState<DeliveryType>("SHIPPING");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    shippingStreet: "",
    shippingCity: "",
    shippingZip: "",
  });

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <p className="font-serif text-2xl text-ink mb-4">Ihr Warenkorb ist leer.</p>
        <Link href="/produkte" className="text-gold hover:underline">
          Zur Kollektion →
        </Link>
      </div>
    );
  }

  const shippingCost = delivery === "SHIPPING" ? 995 : 0;
  const grandTotal = total() + shippingCost;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          deliveryType: delivery,
          ...form,
        }),
      });

      const data = await res.json() as { url?: string; error?: string };

      if (!res.ok || !data.url) {
        setError(data.error ?? "Checkout-Fehler. Bitte erneut versuchen.");
        return;
      }

      window.location.href = data.url;
    } catch {
      setError("Verbindungsfehler. Bitte erneut versuchen.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="font-serif text-3xl text-ink mb-10">Kasse</h1>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Formular */}
        <div className="lg:col-span-2 space-y-6">
          {/* Kontaktdaten */}
          <div className="space-y-4">
            <h2 className="font-serif text-xl text-ink">Kontaktdaten</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted block mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                  className="w-full border border-border px-3 py-2.5 text-sm bg-bg focus:border-gold outline-none transition-colors"
                  placeholder="Max Mustermann"
                />
              </div>
              <div>
                <label className="text-sm text-muted block mb-1">E-Mail *</label>
                <input
                  type="email"
                  required
                  value={form.customerEmail}
                  onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
                  className="w-full border border-border px-3 py-2.5 text-sm bg-bg focus:border-gold outline-none transition-colors"
                  placeholder="max@beispiel.de"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-muted block mb-1">Telefon (optional)</label>
              <input
                type="tel"
                value={form.customerPhone}
                onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                className="w-full border border-border px-3 py-2.5 text-sm bg-bg focus:border-gold outline-none transition-colors"
                placeholder="+49 176 ..."
              />
            </div>
          </div>

          {/* Lieferart */}
          <div className="space-y-3">
            <h2 className="font-serif text-xl text-ink">Lieferart</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "SHIPPING" as const, label: "Versand", sub: "+9,95 €" },
                { value: "PICKUP" as const, label: "Selbstabholung", sub: "Kostenlos · Stuttgart" },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className={`border p-4 cursor-pointer transition-all ${
                    delivery === opt.value
                      ? "border-gold bg-gold/5"
                      : "border-border hover:border-muted"
                  }`}
                >
                  <input
                    type="radio"
                    name="delivery"
                    value={opt.value}
                    checked={delivery === opt.value}
                    onChange={() => setDelivery(opt.value)}
                    className="sr-only"
                  />
                  <p className="font-medium text-ink text-sm">{opt.label}</p>
                  <p className="text-xs text-muted mt-1">{opt.sub}</p>
                </label>
              ))}
            </div>
          </div>

          {/* Lieferadresse (nur bei Versand) */}
          {delivery === "SHIPPING" && (
            <div className="space-y-4">
              <h2 className="font-serif text-xl text-ink">Lieferadresse</h2>
              <div>
                <label className="text-sm text-muted block mb-1">Straße + Hausnummer *</label>
                <input
                  type="text"
                  required
                  value={form.shippingStreet}
                  onChange={(e) => setForm({ ...form, shippingStreet: e.target.value })}
                  className="w-full border border-border px-3 py-2.5 text-sm bg-bg focus:border-gold outline-none transition-colors"
                  placeholder="Musterstraße 1"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-muted block mb-1">PLZ *</label>
                  <input
                    type="text"
                    required
                    maxLength={5}
                    value={form.shippingZip}
                    onChange={(e) => setForm({ ...form, shippingZip: e.target.value })}
                    className="w-full border border-border px-3 py-2.5 text-sm bg-bg focus:border-gold outline-none transition-colors"
                    placeholder="70599"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-sm text-muted block mb-1">Stadt *</label>
                  <input
                    type="text"
                    required
                    value={form.shippingCity}
                    onChange={(e) => setForm({ ...form, shippingCity: e.target.value })}
                    className="w-full border border-border px-3 py-2.5 text-sm bg-bg focus:border-gold outline-none transition-colors"
                    placeholder="Stuttgart"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Widerrufsrecht (§ 312g Abs. 2 Nr. 9 BGB — Sonderanfertigung ausgenommen) */}
          {/* Für Standard-Teppiche gilt: 14 Tage Widerrufsrecht */}
        </div>

        {/* Bestellübersicht */}
        <div className="lg:col-span-1">
          <div className="bg-surface border border-border p-6 sticky top-24">
            <h2 className="font-serif text-lg text-ink mb-4">Ihre Bestellung</h2>

            <div className="space-y-3 text-sm border-b border-border pb-4 mb-4">
              {items.map((item) => (
                <div key={item.productId} className="flex justify-between gap-2">
                  <span className="text-muted flex-1">{item.name} ×{item.quantity}</span>
                  <span className="text-ink flex-shrink-0">{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-muted">Versand</span>
                <span>{shippingCost > 0 ? formatPrice(shippingCost) : "Kostenlos"}</span>
              </div>
            </div>

            <div className="flex justify-between font-semibold text-base border-t border-border pt-4 mb-1">
              <span>Gesamt</span>
              <span className="text-gold">{formatPrice(grandTotal)}</span>
            </div>
            <p className="text-xs text-muted mb-6">inkl. 19% MwSt.</p>

            {error && (
              <p className="text-sm text-signal bg-signal/10 px-3 py-2 mb-4">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green text-white py-4 text-sm font-medium hover:bg-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Weiterleitung..." : "Jetzt bezahlen →"}
            </button>

            <p className="text-xs text-muted text-center mt-3">
              Sichere Zahlung via Stripe · Kreditkarte
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
