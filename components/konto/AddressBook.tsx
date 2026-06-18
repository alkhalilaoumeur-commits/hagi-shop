"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addAddressAction,
  updateAddressAction,
  deleteAddressAction,
  setDefaultBillingAction,
  setDefaultShippingAction,
} from "@/app/actions/customer-address";
import { Field, AuthError } from "./AuthShell";

export interface AddressView {
  id: string;
  label: string | null;
  firstName: string;
  lastName: string;
  company: string | null;
  street1: string;
  street2: string | null;
  city: string;
  state: string | null;
  postalCode: string;
  countryCode: string;
  phone: string | null;
  isDefaultBilling: boolean;
  isDefaultShipping: boolean;
}

type FormState = {
  label: string;
  firstName: string;
  lastName: string;
  company: string;
  street1: string;
  street2: string;
  city: string;
  postalCode: string;
  countryCode: string;
  phone: string;
  isDefaultBilling: boolean;
  isDefaultShipping: boolean;
};

const EMPTY: FormState = {
  label: "",
  firstName: "",
  lastName: "",
  company: "",
  street1: "",
  street2: "",
  city: "",
  postalCode: "",
  countryCode: "DE",
  phone: "",
  isDefaultBilling: false,
  isDefaultShipping: false,
};

function toForm(a: AddressView): FormState {
  return {
    label: a.label ?? "",
    firstName: a.firstName,
    lastName: a.lastName,
    company: a.company ?? "",
    street1: a.street1,
    street2: a.street2 ?? "",
    city: a.city,
    postalCode: a.postalCode,
    countryCode: a.countryCode,
    phone: a.phone ?? "",
    isDefaultBilling: a.isDefaultBilling,
    isDefaultShipping: a.isDefaultShipping,
  };
}

export function AddressBook({ addresses }: { addresses: AddressView[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null); // null = kein Formular, "new" = neu
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const openNew = () => {
    setForm(EMPTY);
    setEditingId("new");
    setError(null);
  };
  const openEdit = (a: AddressView) => {
    setForm(toForm(a));
    setEditingId(a.id);
    setError(null);
  };
  const close = () => {
    setEditingId(null);
    setError(null);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      setError(null);
      const payload = {
        ...form,
        label: form.label || null,
        company: form.company || null,
        street2: form.street2 || null,
        phone: form.phone || null,
        countryCode: form.countryCode.toUpperCase(),
      };
      const result =
        editingId === "new"
          ? await addAddressAction(payload)
          : await updateAddressAction({ ...payload, addressId: editingId });
      if (result.ok) {
        close();
        router.refresh();
      } else {
        setError(translate(result.error));
      }
    });
  };

  const runAction = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    startTransition(async () => {
      const result = await fn();
      if (result.ok) router.refresh();
      else setError(translate(result.error ?? "INTERNAL_ERROR"));
    });
  };

  return (
    <div className="space-y-4">
      {error && !editingId && <AuthError message={error} />}

      {addresses.length === 0 && !editingId && (
        <div className="p-6 text-sm" style={{ background: "#FFFFFF", border: "1px solid #E5DCC8", color: "#5A4A3A" }}>
          Sie haben noch keine Adressen gespeichert.
        </div>
      )}

      {addresses.map((a) => (
        <div key={a.id} className="p-5" style={{ background: "#FFFFFF", border: "1px solid #E5DCC8" }}>
          <div className="flex items-start justify-between gap-4">
            <div className="text-sm" style={{ color: "#0F0A06" }}>
              <div className="flex items-center gap-2 mb-1">
                {a.label && <span className="font-medium">{a.label}</span>}
                {a.isDefaultShipping && <Badge>Standard-Lieferung</Badge>}
                {a.isDefaultBilling && <Badge>Standard-Rechnung</Badge>}
              </div>
              <p>{a.firstName} {a.lastName}{a.company ? ` · ${a.company}` : ""}</p>
              <p style={{ color: "#5A4A3A" }}>
                {a.street1}{a.street2 ? `, ${a.street2}` : ""}, {a.postalCode} {a.city}, {a.countryCode}
              </p>
              {a.phone && <p style={{ color: "#8A7866" }}>{a.phone}</p>}
            </div>
            <div className="flex flex-col items-end gap-2 text-[11px] uppercase tracking-[0.12em]">
              <button onClick={() => openEdit(a)} className="underline" style={{ color: "#A33B2A" }}>
                Bearbeiten
              </button>
              <button
                onClick={() => runAction(() => deleteAddressAction({ addressId: a.id }))}
                disabled={isPending}
                className="underline disabled:opacity-50"
                style={{ color: "#8A7866" }}
              >
                Löschen
              </button>
            </div>
          </div>
          <div className="flex gap-4 mt-3 text-[11px] uppercase tracking-[0.12em]">
            {!a.isDefaultShipping && (
              <button
                onClick={() => runAction(() => setDefaultShippingAction({ addressId: a.id }))}
                disabled={isPending}
                className="underline disabled:opacity-50"
                style={{ color: "#5A4A3A" }}
              >
                Als Standard-Lieferung
              </button>
            )}
            {!a.isDefaultBilling && (
              <button
                onClick={() => runAction(() => setDefaultBillingAction({ addressId: a.id }))}
                disabled={isPending}
                className="underline disabled:opacity-50"
                style={{ color: "#5A4A3A" }}
              >
                Als Standard-Rechnung
              </button>
            )}
          </div>
        </div>
      ))}

      {editingId ? (
        <form onSubmit={submit} className="p-6 space-y-4" style={{ background: "#FFFFFF", border: "1px solid #A33B2A" }}>
          <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: "#B89968" }}>
            {editingId === "new" ? "Neue Adresse" : "Adresse bearbeiten"}
          </p>
          <Field label="Bezeichnung (optional)" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Vorname" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
            <Field label="Nachname" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
          </div>
          <Field label="Firma (optional)" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
          <Field label="Straße & Nr." value={form.street1} onChange={(e) => setForm({ ...form, street1: e.target.value })} required />
          <Field label="Adresszusatz (optional)" value={form.street2} onChange={(e) => setForm({ ...form, street2: e.target.value })} />
          <div className="grid grid-cols-3 gap-3">
            <Field label="PLZ" value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} required />
            <Field label="Stadt" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
            <Field label="Land" value={form.countryCode} onChange={(e) => setForm({ ...form, countryCode: e.target.value })} required maxLength={2} />
          </div>
          <Field label="Telefon (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <div className="flex flex-col gap-2 text-sm" style={{ color: "#5A4A3A" }}>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.isDefaultShipping} onChange={(e) => setForm({ ...form, isDefaultShipping: e.target.checked })} />
              Als Standard-Lieferadresse
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.isDefaultBilling} onChange={(e) => setForm({ ...form, isDefaultBilling: e.target.checked })} />
              Als Standard-Rechnungsadresse
            </label>
          </div>
          {error && <AuthError message={error} />}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="px-6 py-3 text-[11px] font-bold uppercase tracking-[0.18em] disabled:opacity-50"
              style={{ background: "#0F0A06", color: "#FAFAF7" }}
            >
              {isPending ? "Speichern…" : "Speichern"}
            </button>
            <button type="button" onClick={close} className="px-6 py-3 text-[11px] uppercase tracking-[0.18em]" style={{ color: "#5A4A3A" }}>
              Abbrechen
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={openNew}
          className="px-6 py-3 text-[11px] font-bold uppercase tracking-[0.18em]"
          style={{ background: "#0F0A06", color: "#FAFAF7" }}
        >
          + Neue Adresse
        </button>
      )}
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[9px] uppercase tracking-[0.15em] px-2 py-0.5" style={{ color: "#2F5A2F", border: "1px solid #5A8A5A" }}>
      {children}
    </span>
  );
}

function translate(code: string): string {
  switch (code) {
    case "FORBIDDEN":
      return "Diese Adresse gehört nicht zu Ihrem Konto.";
    case "NOT_FOUND":
      return "Adresse nicht gefunden.";
    case "INVALID_INPUT":
      return "Bitte alle Pflichtfelder korrekt ausfüllen.";
    default:
      return "Es ist ein Fehler aufgetreten.";
  }
}
