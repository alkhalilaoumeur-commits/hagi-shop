"use client";

import { useState, useEffect, useTransition, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Trash2, Minus, Plus, Loader2 } from "lucide-react";
import { useCart } from "@/lib/cart-store";
import { formatPrice } from "@/lib/format";
import {
  validateCartAction,
  previewShippingAction,
  previewDiscountAction,
  type CartSnapshot,
  type ShippingPreview,
  type DiscountPreview,
} from "@/app/actions/cart";

type Country = "DE" | "AT" | "CH" | "FR" | "IT" | "ES" | "NL" | "BE";

const COUNTRY_LABEL: Record<Country, string> = {
  DE: "Deutschland",
  AT: "Österreich",
  CH: "Schweiz",
  FR: "Frankreich",
  IT: "Italien",
  ES: "Spanien",
  NL: "Niederlande",
  BE: "Belgien",
};

const DELIVERY_LABELS: Record<"SHIPPING" | "PICKUP" | "LOCAL_DELIVERY", string> = {
  SHIPPING: "Versand",
  PICKUP: "Abholung im Showroom Stuttgart",
  LOCAL_DELIVERY: "Lokale Anlieferung Stuttgart",
};

export function CartView() {
  const { items, remove, updateQty, clear } = useCart();
  const [snapshot, setSnapshot] = useState<CartSnapshot | null>(null);
  const [country, setCountry] = useState<Country>("DE");
  const [deliveryType, setDeliveryType] = useState<"SHIPPING" | "PICKUP">("SHIPPING");
  const [shippingPreview, setShippingPreview] = useState<ShippingPreview | null>(null);
  const [selectedRateId, setSelectedRateId] = useState<string | null>(null);
  const [discountCode, setDiscountCode] = useState("");
  const [discountPreview, setDiscountPreview] = useState<DiscountPreview | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isShippingPending, startShipping] = useTransition();
  const [isDiscountPending, startDiscount] = useTransition();

  const cartInput = useMemo(
    () => items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
    [items],
  );

  useEffect(() => {
    if (cartInput.length === 0) {
      setSnapshot(null);
      setShippingPreview(null);
      setSelectedRateId(null);
      return;
    }
    startTransition(async () => {
      const snap = await validateCartAction({ items: cartInput });
      setSnapshot(snap);
    });
  }, [cartInput]);

  useEffect(() => {
    if (cartInput.length === 0) return;
    startShipping(async () => {
      const ship = await previewShippingAction({
        items: cartInput,
        countryCode: country,
        deliveryType,
      });
      setShippingPreview(ship);
      const cheapest = ship.quotes[0];
      if (cheapest && !ship.quotes.some((q) => q.rateId === selectedRateId)) {
        setSelectedRateId(cheapest.rateId);
      }
    });
  }, [cartInput, country, deliveryType]);

  const selectedRate = useMemo(
    () => shippingPreview?.quotes.find((q) => q.rateId === selectedRateId) ?? null,
    [shippingPreview, selectedRateId],
  );

  const shippingCents = selectedRate?.cents ?? 0;
  const subtotalCents = snapshot?.subtotalCents ?? 0;
  const discountCents = discountPreview?.result?.discountCents ?? 0;
  const totalCents = Math.max(0, subtotalCents + shippingCents - discountCents);

  const handleDiscountApply = () => {
    if (!discountCode.trim()) return;
    startDiscount(async () => {
      setDiscountError(null);
      const res = await previewDiscountAction({
        code: discountCode.trim(),
        items: cartInput,
        shippingCents,
        customerEmail: null,
      });
      if (res.result?.errors && res.result.errors.length > 0) {
        setDiscountError(res.result.errors[0]);
        setDiscountPreview(null);
      } else if (res.errors.length > 0) {
        setDiscountError(res.errors[0]);
        setDiscountPreview(null);
      } else {
        setDiscountPreview(res);
      }
    });
  };

  const handleDiscountReset = () => {
    setDiscountCode("");
    setDiscountPreview(null);
    setDiscountError(null);
  };

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-6 md:px-12 py-32 text-center">
        <p
          className="text-[10px] uppercase tracking-[0.25em] mb-5"
          style={{ color: "#B89968" }}
        >
          ✦ Ihr Warenkorb
        </p>
        <h1
          className="font-serif leading-[0.95] mb-6"
          style={{ fontSize: "clamp(2.2rem, 5vw, 3.5rem)", color: "#0F0A06" }}
        >
          Noch leer.
        </h1>
        <p className="text-base md:text-lg mb-10" style={{ color: "#5A4A3A" }}>
          Entdecken Sie unsere Kollektion — handgeknüpfte Teppiche, persönlich kuratiert.
        </p>
        <Link
          href="/produkte"
          className="inline-flex items-center gap-2 px-8 py-3.5 text-[11px] font-bold uppercase tracking-[0.18em]"
          style={{ background: "#0F0A06", color: "#FAFAF7" }}
        >
          Zur Kollektion
          <span aria-hidden>→</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-page mx-auto px-6 md:px-12 pt-32 pb-24">
      <div className="mb-12">
        <p className="text-[10px] uppercase tracking-[0.25em] mb-3" style={{ color: "#B89968" }}>
          ✦ Schritt 1 von 3
        </p>
        <h1
          className="font-serif leading-[0.95]"
          style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)", color: "#0F0A06" }}
        >
          Ihr <em style={{ color: "#A33B2A", fontStyle: "italic" }}>Warenkorb.</em>
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-10 lg:gap-16">
        <section>
          <div
            className="flex items-baseline justify-between pb-3 mb-6"
            style={{ borderBottom: "1px solid #D9CDB8" }}
          >
            <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: "#8A7866" }}>
              {items.length} {items.length === 1 ? "Stück" : "Stücke"}
            </p>
            <button
              onClick={clear}
              className="text-[11px] uppercase tracking-[0.15em] pb-0.5"
              style={{ color: "#A33B2A", borderBottom: "1px solid transparent" }}
            >
              Warenkorb leeren
            </button>
          </div>

          <ul className="divide-y" style={{ borderColor: "#E5DCC8" }}>
            {items.map((item) => {
              const snapItem = snapshot?.items.find((s) => s.productId === item.productId);
              const effectivePrice = snapItem?.unitPriceCents ?? item.price;
              return (
                <li key={item.productId} className="grid grid-cols-[88px_1fr] md:grid-cols-[120px_1fr_auto] gap-5 py-6">
                  <Link
                    href={`/produkte/${item.slug}`}
                    className="relative aspect-[3/4] overflow-hidden block"
                    style={{ background: "#EAE1D2" }}
                  >
                    <Image
                      src={item.image || ""}
                      alt={item.name}
                      fill
                      className="object-cover"
                      sizes="120px"
                    />
                  </Link>

                  <div className="min-w-0">
                    <Link href={`/produkte/${item.slug}`} className="block">
                      <h3 className="font-serif text-lg md:text-xl leading-tight mb-1" style={{ color: "#0F0A06" }}>
                        {item.name}
                      </h3>
                    </Link>
                    {snapItem?.productCategory && (
                      <p className="text-[10px] uppercase tracking-[0.18em] mb-3" style={{ color: "#B89968" }}>
                        {snapItem.productCategory}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 mt-2">
                      <div className="inline-flex items-center" style={{ border: "1px solid #D9CDB8" }}>
                        <button
                          onClick={() => updateQty(item.productId, item.quantity - 1)}
                          className="p-2 disabled:opacity-30 transition-opacity"
                          disabled={item.quantity <= 1}
                          aria-label="Weniger"
                        >
                          <Minus className="w-3 h-3" style={{ color: "#0F0A06" }} />
                        </button>
                        <span
                          className="px-4 font-mono text-sm w-12 text-center"
                          style={{ color: "#0F0A06" }}
                        >
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQty(item.productId, item.quantity + 1)}
                          className="p-2"
                          aria-label="Mehr"
                        >
                          <Plus className="w-3 h-3" style={{ color: "#0F0A06" }} />
                        </button>
                      </div>

                      <button
                        onClick={() => remove(item.productId)}
                        className="text-[11px] uppercase tracking-[0.15em] inline-flex items-center gap-1.5"
                        style={{ color: "#8A7866" }}
                        aria-label="Entfernen"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Entfernen
                      </button>
                    </div>
                  </div>

                  <div className="md:text-right md:col-start-3">
                    <p className="font-serif text-xl" style={{ color: "#A33B2A" }}>
                      {formatPrice(effectivePrice * item.quantity)}
                    </p>
                    {item.quantity > 1 && (
                      <p className="text-[11px] font-mono mt-1" style={{ color: "#8A7866" }}>
                        {item.quantity} × {formatPrice(effectivePrice)}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {snapshot && snapshot.errors.length > 0 && (
            <div
              className="mt-6 p-4 text-sm"
              style={{ background: "#F7EBE6", border: "1px solid #A33B2A", color: "#7E2A1D" }}
            >
              <p className="font-semibold mb-1">Hinweis:</p>
              <ul className="list-disc list-inside text-xs">
                {snapshot.errors.map((e) => (
                  <li key={e}>{translateError(e)}</li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="p-6 md:p-8" style={{ background: "#F0EAD8", border: "1px solid #E5DCC8" }}>
            <p className="text-[10px] uppercase tracking-[0.25em] mb-4" style={{ color: "#B89968" }}>
              ✦ Zusammenfassung
            </p>

            <div className="mb-6 pb-6" style={{ borderBottom: "1px solid #D9CDB8" }}>
              <label className="block text-[10px] uppercase tracking-[0.18em] mb-2" style={{ color: "#5A4A3A" }}>
                Lieferung nach
              </label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value as Country)}
                className="w-full px-3 py-2.5 text-sm bg-transparent focus:outline-none"
                style={{ border: "1px solid #D9CDB8", color: "#0F0A06" }}
              >
                {(Object.keys(COUNTRY_LABEL) as Country[]).map((c) => (
                  <option key={c} value={c}>
                    {COUNTRY_LABEL[c]}
                  </option>
                ))}
              </select>

              <label className="block text-[10px] uppercase tracking-[0.18em] mb-2 mt-4" style={{ color: "#5A4A3A" }}>
                Versandart
              </label>
              <div className="flex flex-col gap-2">
                {(["SHIPPING", "PICKUP"] as const).map((dt) => (
                  <button
                    key={dt}
                    onClick={() => setDeliveryType(dt)}
                    className="text-left px-3 py-2.5 text-sm transition-colors"
                    style={{
                      background: deliveryType === dt ? "#0F0A06" : "transparent",
                      color: deliveryType === dt ? "#FAFAF7" : "#0F0A06",
                      border: "1px solid",
                      borderColor: deliveryType === dt ? "#0F0A06" : "#D9CDB8",
                    }}
                  >
                    {DELIVERY_LABELS[dt]}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6 pb-6" style={{ borderBottom: "1px solid #D9CDB8" }}>
              <label className="block text-[10px] uppercase tracking-[0.18em] mb-2" style={{ color: "#5A4A3A" }}>
                Versandoption
              </label>
              {isShippingPending && !shippingPreview ? (
                <div className="flex items-center gap-2 text-sm py-3" style={{ color: "#8A7866" }}>
                  <Loader2 className="w-4 h-4 animate-spin" /> Lade Versandoptionen...
                </div>
              ) : shippingPreview && shippingPreview.quotes.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {shippingPreview.quotes.map((q) => {
                    const isSelected = q.rateId === selectedRateId;
                    return (
                      <button
                        key={q.rateId}
                        onClick={() => setSelectedRateId(q.rateId)}
                        className="text-left px-3 py-3"
                        style={{
                          background: isSelected ? "#0F0A06" : "#FAFAF7",
                          color: isSelected ? "#FAFAF7" : "#0F0A06",
                          border: "1px solid",
                          borderColor: isSelected ? "#0F0A06" : "#D9CDB8",
                        }}
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-medium text-sm">{q.name}</span>
                          <span className="font-mono text-sm">
                            {q.cents === 0 ? "Gratis" : formatPrice(q.cents)}
                          </span>
                        </div>
                        <p
                          className="text-[10px] uppercase tracking-[0.15em] mt-1"
                          style={{ color: isSelected ? "#D2C9B5" : "#8A7866" }}
                        >
                          {q.minDays === q.maxDays
                            ? `${q.maxDays} Tage`
                            : `${q.minDays}–${q.maxDays} Tage`}
                          {q.freeShippingApplied ? " · Frei ab Schwelle" : ""}
                        </p>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm" style={{ color: "#7E2A1D" }}>
                  Für {COUNTRY_LABEL[country]} keine Versandoption verfügbar. Bitte kontaktieren Sie uns.
                </p>
              )}
            </div>

            <div className="mb-6 pb-6" style={{ borderBottom: "1px solid #D9CDB8" }}>
              <label className="block text-[10px] uppercase tracking-[0.18em] mb-2" style={{ color: "#5A4A3A" }}>
                Gutschein-Code
              </label>
              <div className="flex gap-2">
                <input
                  value={discountCode}
                  onChange={(e) => {
                    setDiscountCode(e.target.value.toUpperCase());
                    setDiscountError(null);
                  }}
                  disabled={!!discountPreview?.result?.discountCents}
                  placeholder="z. B. WILLKOMMEN10"
                  className="flex-1 px-3 py-2.5 text-sm font-mono bg-transparent focus:outline-none disabled:opacity-50"
                  style={{ border: "1px solid #D9CDB8", color: "#0F0A06" }}
                />
                {discountPreview?.result?.discountCents ? (
                  <button
                    onClick={handleDiscountReset}
                    className="px-4 text-[11px] uppercase tracking-[0.15em]"
                    style={{ background: "transparent", border: "1px solid #A33B2A", color: "#A33B2A" }}
                  >
                    Entfernen
                  </button>
                ) : (
                  <button
                    onClick={handleDiscountApply}
                    disabled={isDiscountPending || !discountCode.trim()}
                    className="px-4 text-[11px] uppercase tracking-[0.15em] disabled:opacity-40"
                    style={{ background: "#0F0A06", color: "#FAFAF7" }}
                  >
                    {isDiscountPending ? "..." : "Anwenden"}
                  </button>
                )}
              </div>
              {discountError && (
                <p className="text-[11px] mt-2" style={{ color: "#7E2A1D" }}>
                  {translateDiscountError(discountError)}
                </p>
              )}
              {discountPreview?.result?.description && discountPreview.result.discountCents > 0 && (
                <p className="text-[11px] mt-2" style={{ color: "#5C7A4B" }}>
                  ✓ {discountPreview.result.description}
                </p>
              )}
            </div>

            <dl className="space-y-2 text-sm mb-6">
              <Row label="Zwischensumme" value={formatPrice(subtotalCents)} />
              <Row
                label="Versand"
                value={
                  selectedRate
                    ? selectedRate.cents === 0
                      ? "Gratis"
                      : formatPrice(selectedRate.cents)
                    : "—"
                }
              />
              {discountCents > 0 && (
                <Row
                  label={`Rabatt (${discountPreview?.result?.code})`}
                  value={`-${formatPrice(discountCents)}`}
                  accent="#A33B2A"
                />
              )}
            </dl>

            <div
              className="flex items-baseline justify-between pt-4 mb-2"
              style={{ borderTop: "1px solid #D9CDB8" }}
            >
              <span className="text-[11px] uppercase tracking-[0.18em]" style={{ color: "#5A4A3A" }}>
                Gesamt
              </span>
              <span className="font-serif text-2xl" style={{ color: "#0F0A06" }}>
                {isPending || isShippingPending ? "..." : formatPrice(totalCents)}
              </span>
            </div>
            <p className="text-[10px]" style={{ color: "#8A7866" }}>
              inkl. MwSt., zzgl. Versandkosten falls separat ausgewiesen
            </p>

            <Link
              href="/checkout"
              className="block w-full text-center mt-8 py-4 text-[11px] font-bold uppercase tracking-[0.18em]"
              style={{ background: "#A33B2A", color: "#FAFAF7" }}
            >
              Zur Kasse →
            </Link>

            <Link
              href="/produkte"
              className="block w-full text-center mt-3 py-2 text-[11px] uppercase tracking-[0.15em]"
              style={{ color: "#5A4A3A" }}
            >
              Weiter einkaufen
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt style={{ color: "#5A4A3A" }}>{label}</dt>
      <dd className="font-mono" style={{ color: accent ?? "#0F0A06" }}>
        {value}
      </dd>
    </div>
  );
}

function translateError(code: string): string {
  if (code.startsWith("PRODUCT_UNAVAILABLE")) return "Ein Stück ist nicht mehr verfügbar.";
  if (code.startsWith("QUANTITY_LIMIT")) return "Maximale Menge pro Stück erreicht.";
  if (code === "CART_TOO_LARGE") return "Warenkorb hat zu viele Stücke.";
  if (code === "INVALID_CART_FORMAT" || code === "INVALID_INPUT") return "Ungültiger Warenkorb.";
  return code;
}

function translateDiscountError(code: string): string {
  switch (code) {
    case "INVALID":
      return "Gutschein-Code ungültig.";
    case "INVALID_EMAIL":
      return "Ungültige E-Mail-Adresse.";
    case "NOT_YET_ACTIVE":
      return "Gutschein noch nicht aktiv.";
    case "EXPIRED":
      return "Gutschein abgelaufen.";
    case "LIMIT_REACHED":
      return "Gutschein wurde bereits maximal eingelöst.";
    case "MIN_ORDER_NOT_MET":
      return "Mindestbestellwert nicht erreicht.";
    case "ALREADY_USED":
      return "Sie haben diesen Gutschein bereits genutzt.";
    case "INVALID_INPUT":
      return "Eingabe ungültig.";
    default:
      return code;
  }
}
