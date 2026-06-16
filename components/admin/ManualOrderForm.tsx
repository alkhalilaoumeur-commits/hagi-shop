"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { createManualOrderAction } from "@/app/actions/admin-manual-order";

interface ProductOption {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  isUnique: boolean;
}

export function ManualOrderForm({ products }: { products: ProductOption[] }) {
  const router = useRouter();
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [street, setStreet] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("DE");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD_TERMINAL" | "BANK_TRANSFER">("CASH");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedProduct = products.find((p) => p.id === productId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      setError(null);
      const result = await createManualOrderAction({
        productId,
        quantity,
        customerEmail: email,
        customerPhone: phone || null,
        customerFirstName: firstName,
        customerLastName: lastName,
        customerStreet: street,
        customerCity: city,
        customerPostalCode: postalCode,
        customerCountryCode: country,
        paymentMethod,
        internalNote: note || null,
      });
      if (result.ok) {
        router.push(`/admin/bestellungen/${result.orderId}`);
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <fieldset className="space-y-4">
        <legend className="text-[10px] uppercase tracking-[0.22em] mb-2" style={{ color: "#B89968" }}>
          ✦ Stück
        </legend>
        <select
          required
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          className="w-full px-3 py-2.5 text-sm bg-transparent"
          style={{ border: "1px solid #D9CDB8", color: "#0F0A06" }}
        >
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — {formatPrice(p.price)} {p.isUnique ? "(Unikat)" : ""}
            </option>
          ))}
        </select>
        {selectedProduct && !selectedProduct.isUnique && (
          <input
            type="number"
            min={1}
            max={50}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
            className="w-32 px-3 py-2.5 text-sm bg-transparent"
            style={{ border: "1px solid #D9CDB8", color: "#0F0A06" }}
          />
        )}
        {selectedProduct?.isUnique && (
          <p className="text-[11px]" style={{ color: "#8A7866" }}>
            Unikat — Menge auf 1 fixiert. Stück wird nach Anlage aus Online-Lager genommen.
          </p>
        )}
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-[10px] uppercase tracking-[0.22em] mb-2" style={{ color: "#B89968" }}>
          ✦ Kunde
        </legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input required label="Vorname" value={firstName} onChange={setFirstName} autoComplete="given-name" />
          <Input required label="Nachname" value={lastName} onChange={setLastName} autoComplete="family-name" />
          <Input required label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
          <Input label="Telefon" type="tel" value={phone} onChange={setPhone} autoComplete="tel" />
        </div>
        <Input required label="Straße + Nr." value={street} onChange={setStreet} autoComplete="address-line1" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Input required label="PLZ" value={postalCode} onChange={setPostalCode} autoComplete="postal-code" />
          <Input required label="Stadt" value={city} onChange={setCity} autoComplete="address-level2" />
          <Select
            required
            label="Land"
            value={country}
            onChange={setCountry}
            options={[
              { value: "DE", label: "Deutschland" },
              { value: "AT", label: "Österreich" },
              { value: "CH", label: "Schweiz" },
            ]}
          />
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-[10px] uppercase tracking-[0.22em] mb-2" style={{ color: "#B89968" }}>
          ✦ Zahlung
        </legend>
        <Select
          label="Zahlungsart"
          value={paymentMethod}
          onChange={(v) => setPaymentMethod(v as typeof paymentMethod)}
          options={[
            { value: "CASH", label: "Bar" },
            { value: "CARD_TERMINAL", label: "EC-Karte (Terminal)" },
            { value: "BANK_TRANSFER", label: "Überweisung erhalten" },
          ]}
        />
      </fieldset>

      <fieldset>
        <legend className="text-[10px] uppercase tracking-[0.22em] mb-2" style={{ color: "#B89968" }}>
          ✦ Notiz (intern)
        </legend>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Optional: Beratungs-Notiz, Wunsch-Termin etc."
          className="w-full px-3 py-2.5 text-sm bg-transparent resize-y"
          style={{ border: "1px solid #D9CDB8", color: "#0F0A06" }}
        />
      </fieldset>

      {error && (
        <p className="text-[11px]" style={{ color: "#7E2A1D" }}>
          Fehler: {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="px-8 py-3.5 text-[11px] font-bold uppercase tracking-[0.18em] inline-flex items-center gap-2 disabled:opacity-50"
        style={{ background: "#A33B2A", color: "#FAFAF7" }}
      >
        {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
        Verkauf eintragen
      </button>
    </form>
  );
}

function Input({
  label,
  value,
  onChange,
  required,
  type = "text",
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.18em] block mb-1.5" style={{ color: "#5A4A3A" }}>
        {label}
        {required && <span style={{ color: "#A33B2A" }}> *</span>}
      </span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        className="w-full px-3 py-2.5 text-sm bg-transparent focus:outline-none"
        style={{ border: "1px solid #D9CDB8", color: "#0F0A06" }}
      />
    </label>
  );
}

function Select<T extends string>({
  label,
  value,
  onChange,
  options,
  required,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.18em] block mb-1.5" style={{ color: "#5A4A3A" }}>
        {label}
      </span>
      <select
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full px-3 py-2.5 text-sm bg-transparent focus:outline-none"
        style={{ border: "1px solid #D9CDB8", color: "#0F0A06" }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}
