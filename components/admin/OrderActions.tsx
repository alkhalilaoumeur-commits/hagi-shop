"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { adminMarkShipped, adminMarkDelivered, adminCancelOrder } from "@/app/actions/admin-orders";

interface Props {
  orderId: string;
  orderStatus: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  totalCents: number;
}

export function OrderActions({ orderId, orderStatus, paymentStatus, fulfillmentStatus, totalCents }: Props) {
  const router = useRouter();
  const [activeForm, setActiveForm] = useState<"ship" | "deliver" | "cancel" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canShip =
    orderStatus !== "CANCELLED" &&
    paymentStatus === "PAID" &&
    fulfillmentStatus !== "FULFILLED";

  const canDeliver = orderStatus === "CONFIRMED" && fulfillmentStatus === "FULFILLED";

  const canCancel = orderStatus !== "CANCELLED" && orderStatus !== "COMPLETED" && fulfillmentStatus !== "FULFILLED";

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
        <div className="flex flex-wrap gap-3">
          <ActionButton enabled={canShip} onClick={() => setActiveForm("ship")} primary>
            Als versendet markieren
          </ActionButton>
          <ActionButton enabled={canDeliver} onClick={() => setActiveForm("deliver")}>
            Als zugestellt markieren
          </ActionButton>
          <ActionButton enabled={canCancel} onClick={() => setActiveForm("cancel")} danger>
            Stornieren
          </ActionButton>
        </div>
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
        Vollständigen Refund auslösen (über Stripe getrennt anstoßen)
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
