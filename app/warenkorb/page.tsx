"use client";

import Link from "next/link";
import Image from "next/image";
import { Trash2, Minus, Plus } from "lucide-react";
import { useCart } from "@/lib/cart-store";
import { formatPrice } from "@/lib/format";

export default function WarenkorbPage() {
  const { items, remove, updateQty, total, clear } = useCart();

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <p className="font-serif text-3xl text-ink mb-4">Ihr Warenkorb ist leer</p>
        <p className="text-muted mb-8">Entdecken Sie unsere Kollektion handgeknüpfter Teppiche.</p>
        <Link
          href="/produkte"
          className="inline-block bg-green text-white px-8 py-3 text-sm font-medium hover:bg-green/90 transition-colors"
        >
          Zur Kollektion
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="font-serif text-3xl text-ink mb-10">Warenkorb</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Artikel-Liste */}
        <div className="lg:col-span-2 space-y-6">
          {items.map((item) => (
            <div key={item.productId} className="flex gap-4 pb-6 border-b border-border">
              <div className="w-24 h-32 relative flex-shrink-0 bg-surface rounded-sm overflow-hidden">
                <Image
                  src={item.image || "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=200"}
                  alt={item.name}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-serif text-ink font-medium mb-1">{item.name}</h3>
                <p className="text-sm text-gold font-semibold mb-3">{formatPrice(item.price)}</p>

                <div className="flex items-center gap-3">
                  {/* Menge */}
                  <div className="flex items-center border border-border">
                    <button
                      onClick={() => updateQty(item.productId, item.quantity - 1)}
                      className="p-2 hover:bg-surface transition-colors"
                      aria-label="Weniger"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="px-3 text-sm font-medium">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(item.productId, item.quantity + 1)}
                      className="p-2 hover:bg-surface transition-colors"
                      aria-label="Mehr"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Entfernen */}
                  <button
                    onClick={() => remove(item.productId)}
                    className="p-2 text-muted hover:text-signal transition-colors"
                    aria-label="Entfernen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-sm text-muted mt-2">
                  Gesamt: {formatPrice(item.price * item.quantity)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Bestellzusammenfassung */}
        <div className="lg:col-span-1">
          <div className="bg-surface border border-border p-6 sticky top-24">
            <h2 className="font-serif text-lg text-ink mb-4">Zusammenfassung</h2>

            <div className="space-y-3 text-sm border-b border-border pb-4 mb-4">
              <div className="flex justify-between">
                <span className="text-muted">Zwischensumme</span>
                <span className="text-ink">{formatPrice(total())}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Versand</span>
                <span className="text-ink">9,95 €</span>
              </div>
              <p className="text-xs text-muted">oder kostenlose Selbstabholung in Stuttgart</p>
            </div>

            <div className="flex justify-between font-semibold mb-6">
              <span>Gesamtbetrag</span>
              <span className="text-gold">{formatPrice(total() + 995)}</span>
            </div>
            <p className="text-xs text-muted mb-4">Alle Preise inkl. 19% MwSt.</p>

            <Link
              href="/checkout"
              className="block w-full text-center bg-green text-white py-3.5 text-sm font-medium hover:bg-green/90 transition-colors"
            >
              Zur Kasse →
            </Link>

            <button
              onClick={clear}
              className="w-full mt-3 text-xs text-muted hover:text-signal transition-colors text-center"
            >
              Warenkorb leeren
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
