"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  adminMarkShipped,
  adminMarkDelivered,
  adminCancelOrder,
  adminMarkReturnReceived,
  adminRefundWithdrawal,
} from "@/app/actions/admin-orders";

interface Props {
  orderId: string;
  orderStatus: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  totalCents: number;
  refundedCents: number;
  withdrawalRequestedAt: Date | null;
  returnReceivedAt: Date | null;
}

export function OrderActions({
  orderId,
  orderStatus,
  paymentStatus,
  fulfillmentStatus,
  totalCents,
  refundedCents,
  withdrawalRequestedAt,
  returnReceivedAt,
}: Props) {
  const router = useRouter();
  const [activeForm, setActiveForm] = useState<"ship" | "deliver" | "cancel" | "return" | "refund" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canShip =
    orderStatus !== "CANCELLED" &&
    paymentStatus === "PAID" &&
    fulfillmentStatus !== "FULFILLED";

  const canDeliver = orderStatus === "CONFIRMED" && fulfillmentStatus === "FULFILLED";

  const canCancel = orderStatus !== "CANCELLED" && orderStatus !== "COMPLETED" && fulfillmentStatus !== "FULFILLED";

  const hasActiveWithdrawal = withdrawalRequestedAt !== null && paymentStatus !== "REFUNDED";
  const canMarkReturn = hasActiveWithdrawal && fulfillmentStatus === "FULFILLED" && returnReceivedAt === null;
  const canRefundWithdrawal =
    hasActiveWithdrawal &&
    (fulfillmentStatus === "UNFULFILLED" || returnReceivedAt !== null) &&
    refundedCents < totalCents;

  const refresh = () => {
    setActiveForm(null);
    setError(null);
    router.refresh();
  };

  return (
    <section
      className="p-6"
      style={{ background: "#F0EAD8", border: "1px solid #E5DCC8" }}
    >
      <p className="text-[10px] uppercase tracking-[0.22em] mb-4" style={{ color: "#B89968" }}>
        ✦ Aktionen
      </p>

      {activeForm === null && (
        <>
          {hasActiveWithdrawal && (
            <div
              className="mb-4 px-4 py-3 text-[11px] uppercase tracking-[0.15em]"
              style={{ background: "#FAEDE9", border: "1px solid #A33B2A", color: "#7E2A1D" }}
            >
              Aktiver Widerruf seit {withdrawalRequestedAt?.toLocaleString("de-DE")}
              {returnReceivedAt
                ? " — Ware retourniert"
                : fulfillmentStatus === "FULFILLED"
                ? " — Ware NOCH NICHT eingegangen"
                : " — Versand war noch nicht raus"}
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <ActionButton enabled={canShip} onClick={() => setActiveForm("ship")} primary>
              Als versendet markieren
            </ActionButton>
            <ActionButton enabled={canDeliver} onClick={() => setActiveForm("deliver")}>
              Als zugestellt markieren
            </ActionButton>
            {hasActiveWithdrawal && (
              <ActionButton enabled={canMarkReturn} onClick={() => setActiveForm("return")}>
                Ware retourniert
              </ActionButton>
            )}
            {hasActiveWithdrawal && (
              <ActionButton enabled={canRefundWithdrawal} onClick={() => setActiveForm("refund")} primary>
                Widerruf erstatten
              </ActionButton>
            )}
            <ActionButton enabled={canCancel} onClick={() => setActiveForm("cancel")} danger>
              Stornieren
            </ActionButton>
          </div>
        </>
      )}

      {activeForm === "ship" && (
        <ShipForm
          orderId={orderId}
          onCancel={() => setActiveForm(null)}
          onError={setError}
          isPending={isPending}
          startTransition={startTransition}
          refresh={refresh}
        />
      )}

      {activeForm === "deliver" && (
        <ConfirmForm
          label="Lieferung bestätigen?"
          description="Markiert die Bestellung als zugestellt. Auto-Mail wird ausgelöst."
          confirmLabel="Ja, zugestellt"
          isPending={isPending}
          onCancel={() => setActiveForm(null)}
          onConfirm={() =>
            startTransition(async () => {
              const result = await adminMarkDelivered({ orderId });
              if (result.ok) refresh();
              else setError(result.error);
            })
          }
        />
      )}

      {activeForm === "cancel" && (
        <CancelForm
          orderId={orderId}
          totalCents={totalCents}
          onCancel={() => setActiveForm(null)}
          onError={setError}
          isPending={isPending}
          startTransition={startTransition}
          refresh={refresh}
        />
      )}

      {activeForm === "return" && (
        <ReturnForm
          orderId={orderId}
          onCancel={() => setActiveForm(null)}
          onError={setError}
          isPending={isPending}
          startTransition={startTransition}
          refresh={refresh}
        />
      )}

      {activeForm === "refund" && (
        <WithdrawalRefundForm
          orderId={orderId}
          maxRefundCents={totalCents - refundedCents}
          onCancel={() => setActiveForm(null)}
          onError={setError}
          isPending={isPending}
          startTransition={startTransition}
          refresh={refresh}
        />
      )}

      {error && (
        <p className="text-[11px] mt-3" style={{ color: "#7E2A1D" }}>
          Fehler: {error}
        </p>
      )}
    </section>
  );
}

function ActionButton({
  enabled,
  onClick,
  children,
  primary,
  danger,
}: {
  enabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
  primary?: boolean;
  danger?: boolean;
}) {
  const bg = primary ? "#0F0A06" : danger ? "#7E2A1D" : "#FFFFFF";
  const color = primary || danger ? "#FAFAF7" : "#0F0A06";
  return (
    <button
      type="button"
      disabled={!enabled}
      onClick={onClick}
      className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.18em] disabled:opacity-30 disabled:cursor-not-allowed"
      style={{ background: bg, color, border: primary || danger ? "none" : "1px solid #0F0A06" }}
    >
      {children}
    </button>
  );
}

function ShipForm({
  orderId,
  onCancel,
  onError,
  isPending,
  startTransition,
  refresh,
}: {
  orderId: string;
  onCancel: () => void;
  onError: (e: string | null) => void;
  isPending: boolean;
  startTransition: React.TransitionStartFunction;
  refresh: () => void;
}) {
  const [carrier, setCarrier] = useState("DHL");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          onError(null);
          const result = await adminMarkShipped({
            orderId,
            trackingNumber,
            carrier,
            trackingUrl: trackingUrl || null,
          });
          if (result.ok) refresh();
          else onError(result.error);
        });
      }}
      className="space-y-3"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input
          required
          placeholder="Carrier (DHL, Spedition, etc.)"
          value={carrier}
          onChange={(e) => setCarrier(e.target.value)}
          maxLength={32}
          className="px-3 py-2.5 text-sm bg-transparent focus:outline-none"
          style={{ border: "1px solid #D9CDB8", color: "#0F0A06" }}
        />
        <input
          required
          placeholder="Tracking-Nummer"
          value={trackingNumber}
          onChange={(e) => setTrackingNumber(e.target.value)}
          maxLength={64}
          className="px-3 py-2.5 text-sm font-mono bg-transparent focus:outline-none"
          style={{ border: "1px solid #D9CDB8", color: "#0F0A06" }}
        />
      </div>
      <input
        placeholder="Tracking-URL (optional)"
        type="url"
        value={trackingUrl}
        onChange={(e) => setTrackingUrl(e.target.value)}
        maxLength={500}
        className="w-full px-3 py-2.5 text-sm bg-transparent focus:outline-none"
        style={{ border: "1px solid #D9CDB8", color: "#0F0A06" }}
      />
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2.5 text-[11px] font-bold uppercase tracking-[0.18em] disabled:opacity-50 inline-flex items-center gap-2"
          style={{ background: "#0F0A06", color: "#FAFAF7" }}
        >
          {isPending && <Loader2 className="w-3 h-3 animate-spin" />}
          Versand bestätigen + Mail senden
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 text-[11px] uppercase tracking-[0.15em]"
          style={{ color: "#5A4A3A" }}
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
}

function ConfirmForm({
  label,
  description,
  confirmLabel,
  isPending,
  onCancel,
  onConfirm,
}: {
  label: string;
  description: string;
  confirmLabel: string;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div>
      <p className="font-serif text-lg mb-1" style={{ color: "#0F0A06" }}>{label}</p>
      <p className="text-sm mb-4" style={{ color: "#5A4A3A" }}>{description}</p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onConfirm}
          disabled={isPending}
          className="px-6 py-2.5 text-[11px] font-bold uppercase tracking-[0.18em] disabled:opacity-50"
          style={{ background: "#0F0A06", color: "#FAFAF7" }}
        >
          {confirmLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 text-[11px] uppercase tracking-[0.15em]"
          style={{ color: "#5A4A3A" }}
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}

function CancelForm({
  orderId,
  totalCents,
  onCancel,
  onError,
  isPending,
  startTransition,
  refresh,
}: {
  orderId: string;
  totalCents: number;
  onCancel: () => void;
  onError: (e: string | null) => void;
  isPending: boolean;
  startTransition: React.TransitionStartFunction;
  refresh: () => void;
}) {
  const [reason, setReason] = useState("");
  const [withRefund, setWithRefund] = useState(true);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          onError(null);
          const result = await adminCancelOrder({
            orderId,
            reason,
            refundCents: withRefund ? totalCents : undefined,
          });
          if (result.ok) refresh();
          else onError(result.error);
        });
      }}
      className="space-y-3"
    >
      <input
        required
        placeholder="Grund der Stornierung"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        maxLength={200}
        className="w-full px-3 py-2.5 text-sm bg-transparent focus:outline-none"
        style={{ border: "1px solid #D9CDB8", color: "#0F0A06" }}
      />
      <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "#0F0A06" }}>
        <input
          type="checkbox"
          checked={withRefund}
          onChange={(e) => setWithRefund(e.target.checked)}
          className="w-4 h-4"
          style={{ accentColor: "#0F0A06" }}
        />
        Vollständigen Refund automatisch über Stripe auslösen
      </label>
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2.5 text-[11px] font-bold uppercase tracking-[0.18em] disabled:opacity-50 inline-flex items-center gap-2"
          style={{ background: "#7E2A1D", color: "#FAFAF7" }}
        >
          {isPending && <Loader2 className="w-3 h-3 animate-spin" />}
          Stornieren + Mail
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 text-[11px] uppercase tracking-[0.15em]"
          style={{ color: "#5A4A3A" }}
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
}

function ReturnForm({
  orderId,
  onCancel,
  onError,
  isPending,
  startTransition,
  refresh,
}: {
  orderId: string;
  onCancel: () => void;
  onError: (e: string) => void;
  isPending: boolean;
  startTransition: (cb: () => void) => void;
  refresh: () => void;
}) {
  const [trackingNumber, setTrackingNumber] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await adminMarkReturnReceived({
            orderId,
            trackingNumber: trackingNumber.trim() || null,
          });
          if (result.ok) refresh();
          else onError(result.error);
        });
      }}
      className="space-y-4"
    >
      <div>
        <label className="block text-[11px] uppercase tracking-[0.15em] mb-1.5" style={{ color: "#5A4A3A" }}>
          Rücksendungs-Tracking (optional)
        </label>
        <input
          type="text"
          value={trackingNumber}
          onChange={(e) => setTrackingNumber(e.target.value)}
          placeholder="z.B. DHL-Sendungsnummer"
          maxLength={200}
          className="w-full px-3 py-2 font-mono text-sm"
          style={{ background: "#FFFFFF", border: "1px solid #D9CDB8" }}
        />
      </div>
      <p className="text-[11px]" style={{ color: "#5A4A3A" }}>
        Wichtig: nur klicken WENN die Ware physisch hier eingegangen und kontrolliert ist.
        Erst danach kann der Refund gestartet werden.
      </p>
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2.5 text-[11px] font-bold uppercase tracking-[0.18em] disabled:opacity-50 inline-flex items-center gap-2"
          style={{ background: "#0F0A06", color: "#FAFAF7" }}
        >
          {isPending && <Loader2 className="w-3 h-3 animate-spin" />}
          Eingang bestätigen
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 text-[11px] uppercase tracking-[0.15em]"
          style={{ color: "#5A4A3A" }}
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
}

function WithdrawalRefundForm({
  orderId,
  maxRefundCents,
  onCancel,
  onError,
  isPending,
  startTransition,
  refresh,
}: {
  orderId: string;
  maxRefundCents: number;
  onCancel: () => void;
  onError: (e: string) => void;
  isPending: boolean;
  startTransition: (cb: () => void) => void;
  refresh: () => void;
}) {
  const parseEur = (s: string) => Math.round(parseFloat(s.replace(",", ".") || "0") * 100);

  const [wertersatzOn, setWertersatzOn] = useState(false);
  const [manualEur, setManualEur] = useState((maxRefundCents / 100).toFixed(2));
  const [wertersatzEur, setWertersatzEur] = useState("0.00");
  const [reason, setReason] = useState("");

  const wertersatzCents = wertersatzOn ? Math.max(0, parseEur(wertersatzEur)) : 0;
  // Netto-Erstattung an den Kunden: bei Wertersatz = Kaufpreis − Abzug, sonst frei wählbar.
  const refundCents = wertersatzOn ? Math.max(0, maxRefundCents - wertersatzCents) : parseEur(manualEur);

  const reasonMissing = wertersatzOn && reason.trim().length === 0;
  const invalid =
    refundCents <= 0 ||
    refundCents > maxRefundCents ||
    (wertersatzOn && (wertersatzCents <= 0 || refundCents + wertersatzCents > maxRefundCents || reasonMissing));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (invalid) return;
        startTransition(async () => {
          const result = await adminRefundWithdrawal({
            orderId,
            refundCents,
            valueCompensationCents: wertersatzOn ? wertersatzCents : undefined,
            valueCompensationReason: wertersatzOn ? reason.trim() : undefined,
          });
          if (result.ok) refresh();
          else onError(result.error);
        });
      }}
      className="space-y-4"
    >
      {!wertersatzOn && (
        <div>
          <label className="block text-[11px] uppercase tracking-[0.15em] mb-1.5" style={{ color: "#5A4A3A" }}>
            Erstattungsbetrag (max {(maxRefundCents / 100).toFixed(2)} €)
          </label>
          <input
            type="text"
            value={manualEur}
            onChange={(e) => setManualEur(e.target.value)}
            inputMode="decimal"
            className="w-full px-3 py-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[#B89968]"
            style={{ background: "#FFFFFF", border: "1px solid #D9CDB8" }}
          />
        </div>
      )}

      {/* Wertersatz-Toggle § 357 Abs. 7 BGB */}
      <label className="flex items-start gap-2.5 cursor-pointer">
        <input
          type="checkbox"
          checked={wertersatzOn}
          onChange={(e) => setWertersatzOn(e.target.checked)}
          className="mt-0.5"
        />
        <span className="text-[11px] leading-snug" style={{ color: "#5A4A3A" }}>
          <strong style={{ color: "#0F0A06" }}>Wertersatz für Gebrauchsspuren abziehen</strong> (§ 357 Abs. 7 BGB) —
          nur bei Wertminderung durch Nutzung über die bloße Prüfung hinaus.
        </span>
      </label>

      {wertersatzOn && (
        <div className="space-y-4 pl-1.5 border-l-2" style={{ borderColor: "#D9CDB8" }}>
          <div>
            <label className="block text-[11px] uppercase tracking-[0.15em] mb-1.5" style={{ color: "#5A4A3A" }}>
              Wertersatz-Betrag (€)
            </label>
            <input
              type="text"
              value={wertersatzEur}
              onChange={(e) => setWertersatzEur(e.target.value)}
              inputMode="decimal"
              className="w-full px-3 py-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[#B89968]"
              style={{ background: "#FFFFFF", border: "1px solid #D9CDB8" }}
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-[0.15em] mb-1.5" style={{ color: "#5A4A3A" }}>
              Begründung (Pflicht) <span style={{ color: "#A33B2A" }}>*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="z.B. Teppich mit deutlichen Laufspuren und Fleck, nicht mehr als Neuware verkäuflich."
              maxLength={1000}
              className="w-full px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#B89968]"
              style={{
                background: "#FFFFFF",
                border: `1px solid ${reasonMissing ? "#A33B2A" : "#D9CDB8"}`,
              }}
            />
            <p className="text-[11px] mt-1" style={{ color: "#5A4A3A" }}>
              Wird dem Kunden in der Storno-Mail mitgeteilt und revisionssicher protokolliert.
            </p>
          </div>

          {/* Live-Aufschlüsselung */}
          <div className="text-[12px] font-mono space-y-0.5 p-3" style={{ background: "#F4EFE6", color: "#0F0A06" }}>
            <div className="flex justify-between">
              <span>Kaufpreis</span>
              <span>{(maxRefundCents / 100).toFixed(2)} €</span>
            </div>
            <div className="flex justify-between" style={{ color: "#A33B2A" }}>
              <span>− Wertersatz</span>
              <span>−{(wertersatzCents / 100).toFixed(2)} €</span>
            </div>
            <div className="flex justify-between font-bold pt-1 mt-1 border-t" style={{ borderColor: "#D9CDB8" }}>
              <span>= Erstattung an Kunde</span>
              <span>{(refundCents / 100).toFixed(2)} €</span>
            </div>
          </div>
        </div>
      )}

      <p className="text-[11px]" style={{ color: "#5A4A3A" }}>
        Voll-Widerruf: Kaufpreis inkl. Hin-Versand zurück (§ 357 Abs. 2 BGB). Der Stripe-Refund wird automatisch
        ausgelöst — diese Aktion erstattet das Geld real und schickt dem Kunden die Storno-Mail.
      </p>
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending || invalid}
          className="px-6 py-2.5 text-[11px] font-bold uppercase tracking-[0.18em] disabled:opacity-50 inline-flex items-center gap-2"
          style={{ background: "#0F0A06", color: "#FAFAF7" }}
        >
          {isPending && <Loader2 className="w-3 h-3 animate-spin" />}
          {refundCents > 0 ? `${(refundCents / 100).toFixed(2)} € erstatten` : "Refund eintragen"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 text-[11px] uppercase tracking-[0.15em]"
          style={{ color: "#5A4A3A" }}
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
}
