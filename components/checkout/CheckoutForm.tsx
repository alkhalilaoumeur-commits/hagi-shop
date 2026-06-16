"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-store";
import { formatPrice } from "@/lib/format";
import {
  previewShippingAction,
  previewDiscountAction,
  validateCartAction,
  type CartSnapshot,
  type ShippingPreview,
  type DiscountPreview,
} from "@/app/actions/cart";
import { createCheckoutSessionAction } from "@/app/actions/checkout";

const COUNTRIES = [
  { code: "DE", label: "Deutschland" },
  { code: "AT", label: "Österreich" },
  { code: "CH", label: "Schweiz" },
  { code: "FR", label: "Frankreich" },
  { code: "IT", label: "Italien" },
  { code: "ES", label: "Spanien" },
  { code: "NL", label: "Niederlande" },
  { code: "BE", label: "Belgien" },
] as const;

type Country = (typeof COUNTRIES)[number]["code"];

const DELIVERY_LABEL = {
  SHIPPING: "Versand nach Hause",
  PICKUP: "Abholung im Showroom Stuttgart",
  LOCAL_DELIVERY: "Lokale Anlieferung Stuttgart",
} as const;

type Address = {
  firstName: string;
  lastName: string;
  company: string;
  street1: string;
  street2: string;
  city: string;
  state: string;
  postalCode: string;
  countryCode: Country;
  phone: string;
};

const emptyAddress: Address = {
  firstName: "",
  lastName: "",
  company: "",
  street1: "",
  street2: "",
  city: "",
  state: "",
  postalCode: "",
  countryCode: "DE",
  phone: "",
};

export function CheckoutForm() {
  const router = useRouter();
  const { items, clear } = useCart();

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [isBusinessCustomer, setIsBusinessCustomer] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [vatId, setVatId] = useState("");

  const [deliveryType, setDeliveryType] = useState<"SHIPPING" | "PICKUP">("SHIPPING");
  const [shipping, setShipping] = useState<Address>(emptyAddress);
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);
  const [billing, setBilling] = useState<Address>(emptyAddress);

  const [shippingPreview, setShippingPreview] = useState<ShippingPreview | null>(null);
  const [shippingRateId, setShippingRateId] = useState<string | null>(null);
  const [, startShipping] = useTransition();

  const [snapshot, setSnapshot] = useState<CartSnapshot | null>(null);
  const [, startCart] = useTransition();

  const [discountCode, setDiscountCode] = useState("");
  const [discountPreview, setDiscountPreview] = useState<DiscountPreview | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [isDiscountPending, startDiscount] = useTransition();

  const [customerNote, setCustomerNote] = useState("");

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [withdrawalAccepted, setWithdrawalAccepted] = useState(false);
  const [newsletterConsent, setNewsletterConsent] = useState(false);

  const [submitting, startSubmit] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const cartInput = useMemo(
    () => items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
    [items],
  );

  useEffect(() => {
    if (cartInput.length === 0) return;
    startCart(async () => {
      const s = await validateCartAction({ items: cartInput });
      setSnapshot(s);
    });
  }, [cartInput]);

  useEffect(() => {
    if (cartInput.length === 0) return;
    startShipping(async () => {
      const s = await previewShippingAction({
        items: cartInput,
        countryCode: shipping.countryCode,
        deliveryType,
      });
      setShippingPreview(s);
      const cheapest = s.quotes[0];
      if (cheapest && !s.quotes.some((q) => q.rateId === shippingRateId)) {
        setShippingRateId(cheapest.rateId);
      }
    });
  }, [cartInput, shipping.countryCode, deliveryType]);

  const selectedRate = shippingPreview?.quotes.find((q) => q.rateId === shippingRateId) ?? null;
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
        customerEmail: email || null,
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

  const isFormReady =
    items.length > 0 &&
    !!email &&
    !!shippingRateId &&
    shipping.firstName.length > 0 &&
    shipping.lastName.length > 0 &&
    shipping.street1.length > 0 &&
    shipping.city.length > 0 &&
    shipping.postalCode.length > 0 &&
    termsAccepted &&
    privacyAccepted &&
    withdrawalAccepted &&
    (!isBusinessCustomer || (companyName.length > 0 && vatId.length > 0)) &&
    (billingSameAsShipping ||
      (billing.firstName.length > 0 &&
        billing.street1.length > 0 &&
        billing.city.length > 0 &&
        billing.postalCode.length > 0));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormReady || !shippingRateId) return;

    startSubmit(async () => {
      setSubmitError(null);
      const result = await createCheckoutSessionAction({
        items: cartInput,
        email,
        phone: phone || null,
        isBusinessCustomer,
        companyName: isBusinessCustomer ? companyName : null,
        vatId: isBusinessCustomer ? vatId : null,
        shipping: {
          ...shipping,
          company: shipping.company || null,
          street2: shipping.street2 || null,
          state: shipping.state || null,
          phone: shipping.phone || null,
        },
        billingSameAsShipping,
        billing: billingSameAsShipping
          ? null
          : {
              ...billing,
              company: billing.company || null,
              street2: billing.street2 || null,
              state: billing.state || null,
              phone: billing.phone || null,
            },
        shippingRateId,
        deliveryType,
        discountCode: discountPreview?.result?.code || null,
        customerNote: customerNote || null,
        termsAccepted: true,
        privacyAccepted: true,
        withdrawalAccepted: true,
        newsletterConsent,
      });

      if (result.ok && result.redirectUrl) {
        clear();
        router.push(result.redirectUrl);
      } else {
        setSubmitError(
          result.errors?.[0]
            ? `${result.errors[0].field}: ${result.errors[0].code}`
            : "Unbekannter Fehler.",
        );
      }
    });
  };

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-6 md:px-12 py-32 text-center">
        <p className="text-[10px] uppercase tracking-[0.25em] mb-4" style={{ color: "#B89968" }}>
          ✦ Warenkorb
        </p>
        <h1 className="font-serif text-3xl md:text-4xl mb-6" style={{ color: "#0F0A06" }}>
          Bitte legen Sie zuerst einen Teppich in den Warenkorb.
        </h1>
        <Link
          href="/produkte"
          className="inline-flex items-center gap-2 px-8 py-3.5 text-[11px] font-bold uppercase tracking-[0.18em]"
          style={{ background: "#0F0A06", color: "#FAFAF7" }}
        >
          Zur Kollektion
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-page mx-auto px-6 md:px-12 pt-32 pb-24">
      <div className="mb-12">
        <p className="text-[10px] uppercase tracking-[0.25em] mb-3" style={{ color: "#B89968" }}>
          ✦ Schritt 2 von 3
        </p>
        <h1
          className="font-serif leading-[0.95]"
          style={{ fontSize: "clamp(2.2rem, 4.5vw, 3.5rem)", color: "#0F0A06" }}
        >
          Kontakt &amp; <em style={{ color: "#A33B2A", fontStyle: "italic" }}>Lieferung.</em>
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-10 lg:gap-16">
        <div className="space-y-10">
          <Section title="Kontakt" eyebrow="✦ Wir erreichen Sie unter">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="E-Mail" required>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  autoComplete="email"
                />
              </Field>
              <Field label="Telefon (für Spedition)">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputClass}
                  autoComplete="tel"
                />
              </Field>
            </div>
          </Section>

          <Section title="Käufer-Typ" eyebrow="✦ Privat oder Geschäft">
            <div className="grid grid-cols-2 gap-3 mb-4">
              <ToggleButton
                active={!isBusinessCustomer}
                onClick={() => setIsBusinessCustomer(false)}
              >
                Privatkunde
              </ToggleButton>
              <ToggleButton
                active={isBusinessCustomer}
                onClick={() => setIsBusinessCustomer(true)}
              >
                Geschäftskunde
              </ToggleButton>
            </div>

            {isBusinessCustomer && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Firma" required>
                  <input
                    required={isBusinessCustomer}
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="USt-IdNr." required>
                  <input
                    required={isBusinessCustomer}
                    value={vatId}
                    onChange={(e) => setVatId(e.target.value.toUpperCase())}
                    className={inputClass}
                    placeholder="DE123456789"
                  />
                </Field>
              </div>
            )}
          </Section>

          <Section title="Lieferung" eyebrow="✦ Wohin geht der Teppich">
            <div className="grid grid-cols-2 gap-3 mb-6">
              {(["SHIPPING", "PICKUP"] as const).map((dt) => (
                <ToggleButton key={dt} active={deliveryType === dt} onClick={() => setDeliveryType(dt)}>
                  {DELIVERY_LABEL[dt]}
                </ToggleButton>
              ))}
            </div>

            <AddressFields address={shipping} setAddress={setShipping} />

            {shippingPreview && shippingPreview.quotes.length > 0 && (
              <div className="mt-6">
                <p className="text-[10px] uppercase tracking-[0.18em] mb-2" style={{ color: "#5A4A3A" }}>
                  Versandoption
                </p>
                <div className="flex flex-col gap-2">
                  {shippingPreview.quotes.map((q) => {
                    const selected = q.rateId === shippingRateId;
                    return (
                      <button
                        type="button"
                        key={q.rateId}
                        onClick={() => setShippingRateId(q.rateId)}
                        className="text-left px-3 py-3"
                        style={{
                          background: selected ? "#0F0A06" : "#FAFAF7",
                          color: selected ? "#FAFAF7" : "#0F0A06",
                          border: "1px solid",
                          borderColor: selected ? "#0F0A06" : "#D9CDB8",
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
                          style={{ color: selected ? "#D2C9B5" : "#8A7866" }}
                        >
                          {q.minDays === q.maxDays
                            ? `${q.maxDays} Tage`
                            : `${q.minDays}–${q.maxDays} Tage`}
                          {q.freeShippingApplied ? " · Versand frei" : ""}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </Section>

          <Section title="Rechnung" eyebrow="✦ Rechnungsadresse">
            <label className="flex items-center gap-3 text-sm mb-4 cursor-pointer" style={{ color: "#0F0A06" }}>
              <input
                type="checkbox"
                checked={billingSameAsShipping}
                onChange={(e) => setBillingSameAsShipping(e.target.checked)}
                className="w-4 h-4"
                style={{ accentColor: "#0F0A06" }}
              />
              Rechnungsadresse ist gleich der Lieferadresse
            </label>
            {!billingSameAsShipping && <AddressFields address={billing} setAddress={setBilling} />}
          </Section>

          <Section title="Gutschein-Code (optional)" eyebrow="✦ Falls vorhanden">
            <div className="flex gap-2">
              <input
                value={discountCode}
                onChange={(e) => {
                  setDiscountCode(e.target.value.toUpperCase());
                  setDiscountError(null);
                }}
                disabled={!!discountPreview?.result?.discountCents}
                placeholder="z. B. WILLKOMMEN10"
                className={`${inputClass} font-mono disabled:opacity-50`}
              />
              {discountPreview?.result?.discountCents ? (
                <button
                  type="button"
                  onClick={() => {
                    setDiscountCode("");
                    setDiscountPreview(null);
                    setDiscountError(null);
                  }}
                  className="px-4 text-[11px] uppercase tracking-[0.15em]"
                  style={{ background: "transparent", border: "1px solid #A33B2A", color: "#A33B2A" }}
                >
                  Entfernen
                </button>
              ) : (
                <button
                  type="button"
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
                {discountError}
              </p>
            )}
          </Section>

          <Section title="Anmerkung (optional)" eyebrow="✦ Notiz an uns">
            <textarea
              value={customerNote}
              onChange={(e) => setCustomerNote(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="z. B. Wunsch-Liefertag, besondere Hinweise für die Anlieferung..."
              className={`${inputClass} resize-y`}
            />
          </Section>

          <Section title="Bestätigung" eyebrow="✦ Pflichthinweise">
            <div className="space-y-3 text-sm" style={{ color: "#0F0A06" }}>
              <Checkbox checked={termsAccepted} onChange={setTermsAccepted} required>
                Ich akzeptiere die{" "}
                <Link href="/agb" target="_blank" className="underline" style={{ color: "#A33B2A" }}>
                  AGB
                </Link>
                .
              </Checkbox>
              <Checkbox checked={privacyAccepted} onChange={setPrivacyAccepted} required>
                Ich habe die{" "}
                <Link href="/datenschutz" target="_blank" className="underline" style={{ color: "#A33B2A" }}>
                  Datenschutzerklärung
                </Link>{" "}
                gelesen.
              </Checkbox>
              <Checkbox checked={withdrawalAccepted} onChange={setWithdrawalAccepted} required>
                Ich habe die{" "}
                <Link href="/widerruf" target="_blank" className="underline" style={{ color: "#A33B2A" }}>
                  Widerrufsbelehrung
                </Link>{" "}
                gelesen und zur Kenntnis genommen.
              </Checkbox>
              <Checkbox checked={newsletterConsent} onChange={setNewsletterConsent}>
                Optional: Newsletter mit Direktimport-Geschichten + neuen Stücken (jederzeit kündbar)
              </Checkbox>
            </div>
          </Section>
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="p-6 md:p-8" style={{ background: "#F0EAD8", border: "1px solid #E5DCC8" }}>
            <p className="text-[10px] uppercase tracking-[0.25em] mb-4" style={{ color: "#B89968" }}>
              ✦ Ihre Bestellung
            </p>

            <ul className="divide-y mb-6" style={{ borderColor: "#D9CDB8" }}>
              {items.map((item) => {
                const snapItem = snapshot?.items.find((s) => s.productId === item.productId);
                const price = snapItem?.unitPriceCents ?? item.price;
                return (
                  <li key={item.productId} className="flex gap-3 py-3">
                    <div className="relative w-14 h-16 flex-shrink-0" style={{ background: "#EAE1D2" }}>
                      <Image src={item.image || ""} alt={item.name} fill className="object-cover" sizes="64px" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-serif text-sm leading-tight truncate" style={{ color: "#0F0A06" }}>
                        {item.name}
                      </p>
                      <p className="text-[11px] font-mono mt-1" style={{ color: "#8A7866" }}>
                        {item.quantity} × {formatPrice(price)}
                      </p>
                    </div>
                    <p className="font-mono text-sm whitespace-nowrap" style={{ color: "#0F0A06" }}>
                      {formatPrice(price * item.quantity)}
                    </p>
                  </li>
                );
              })}
            </ul>

            <dl className="space-y-2 text-sm pt-4" style={{ borderTop: "1px solid #D9CDB8" }}>
              <SummaryRow label="Zwischensumme" value={formatPrice(subtotalCents)} />
              <SummaryRow
                label="Versand"
                value={selectedRate ? (selectedRate.cents === 0 ? "Gratis" : formatPrice(selectedRate.cents)) : "—"}
              />
              {discountCents > 0 && (
                <SummaryRow
                  label={`Rabatt (${discountPreview?.result?.code})`}
                  value={`-${formatPrice(discountCents)}`}
                  accent="#A33B2A"
                />
              )}
            </dl>

            <div
              className="flex items-baseline justify-between pt-4 mt-4 mb-1"
              style={{ borderTop: "1px solid #D9CDB8" }}
            >
              <span className="text-[11px] uppercase tracking-[0.18em]" style={{ color: "#5A4A3A" }}>
                Gesamt
              </span>
              <span className="font-serif text-2xl" style={{ color: "#0F0A06" }}>
                {formatPrice(totalCents)}
              </span>
            </div>
            <p className="text-[10px]" style={{ color: "#8A7866" }}>
              inkl. MwSt., zzgl. Versandkosten falls separat ausgewiesen
            </p>

            {submitError && (
              <p className="text-[11px] mt-4" style={{ color: "#7E2A1D" }}>
                {submitError}
              </p>
            )}

            <button
              type="submit"
              disabled={!isFormReady || submitting}
              className="w-full mt-8 py-4 text-[11px] font-bold uppercase tracking-[0.18em] disabled:opacity-40 inline-flex items-center justify-center gap-2"
              style={{ background: "#A33B2A", color: "#FAFAF7" }}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Zahlungspflichtig bestellen →
            </button>

            <p className="text-[10px] mt-3 leading-relaxed" style={{ color: "#5A4A3A" }}>
              Mit Klick auf &ldquo;Zahlungspflichtig bestellen&rdquo; werden Sie zur sicheren Zahlung
              weitergeleitet. Es entstehen verbindliche Kaufverpflichtungen gemäß BGB § 312j.
            </p>

            <Link
              href="/warenkorb"
              className="block text-center mt-4 text-[11px] uppercase tracking-[0.15em]"
              style={{ color: "#5A4A3A" }}
            >
              ← Zurück zum Warenkorb
            </Link>
          </div>
        </aside>
      </div>
    </form>
  );
}

const inputClass =
  "w-full px-3 py-2.5 text-sm bg-transparent focus:outline-none focus:border-[#A33B2A] transition-colors";

function Section({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <p className="text-[10px] uppercase tracking-[0.22em] mb-1" style={{ color: "#B89968" }}>
        {eyebrow}
      </p>
      <h2 className="font-serif text-2xl mb-5" style={{ color: "#0F0A06" }}>
        {title}
      </h2>
      <div style={{ borderTop: "1px solid #E5DCC8", paddingTop: "1.25rem" }}>{children}</div>
    </section>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.18em] block mb-1.5" style={{ color: "#5A4A3A" }}>
        {label}
        {required && <span style={{ color: "#A33B2A" }}> *</span>}
      </span>
      <div style={{ border: "1px solid #D9CDB8" }}>{children}</div>
    </label>
  );
}

function AddressFields({
  address,
  setAddress,
}: {
  address: Address;
  setAddress: React.Dispatch<React.SetStateAction<Address>>;
}) {
  const u = (key: keyof Address, val: string) => setAddress((a) => ({ ...a, [key]: val }));
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Field label="Vorname" required>
        <input required value={address.firstName} onChange={(e) => u("firstName", e.target.value)} className={inputClass} autoComplete="given-name" />
      </Field>
      <Field label="Nachname" required>
        <input required value={address.lastName} onChange={(e) => u("lastName", e.target.value)} className={inputClass} autoComplete="family-name" />
      </Field>
      <Field label="Firma (optional)">
        <input value={address.company} onChange={(e) => u("company", e.target.value)} className={inputClass} autoComplete="organization" />
      </Field>
      <div />
      <Field label="Straße + Hausnummer" required>
        <input required value={address.street1} onChange={(e) => u("street1", e.target.value)} className={inputClass} autoComplete="address-line1" />
      </Field>
      <Field label="Adresszusatz (optional)">
        <input value={address.street2} onChange={(e) => u("street2", e.target.value)} className={inputClass} autoComplete="address-line2" />
      </Field>
      <Field label="PLZ" required>
        <input required value={address.postalCode} onChange={(e) => u("postalCode", e.target.value)} className={inputClass} autoComplete="postal-code" />
      </Field>
      <Field label="Stadt" required>
        <input required value={address.city} onChange={(e) => u("city", e.target.value)} className={inputClass} autoComplete="address-level2" />
      </Field>
      <Field label="Land" required>
        <select
          required
          value={address.countryCode}
          onChange={(e) => u("countryCode", e.target.value)}
          className={`${inputClass} cursor-pointer`}
          autoComplete="country"
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </select>
      </Field>
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-center px-3 py-3 text-sm transition-colors"
      style={{
        background: active ? "#0F0A06" : "transparent",
        color: active ? "#FAFAF7" : "#0F0A06",
        border: "1px solid",
        borderColor: active ? "#0F0A06" : "#D9CDB8",
      }}
    >
      {children}
    </button>
  );
}

function Checkbox({
  checked,
  onChange,
  required,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        required={required}
        className="w-4 h-4 mt-0.5 flex-shrink-0"
        style={{ accentColor: "#0F0A06" }}
      />
      <span className="leading-relaxed">{children}</span>
    </label>
  );
}

function SummaryRow({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt style={{ color: "#5A4A3A" }}>{label}</dt>
      <dd className="font-mono" style={{ color: accent ?? "#0F0A06" }}>
        {value}
      </dd>
    </div>
  );
}
