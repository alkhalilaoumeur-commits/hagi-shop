"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ConsentChoice = "all" | "essential" | "custom";

interface ConsentState {
  version: string;
  decidedAt: string;
  analytics: boolean;
  marketing: boolean;
}

const CONSENT_VERSION = "1.0";
const STORAGE_KEY = "hagi-cookie-consent";

export function readConsent(): ConsentState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentState;
    if (parsed.version !== CONSENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeConsent(state: ConsentState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent("hagi:consent-changed", { detail: state }));
}

export function CookieBanner() {
  const [decided, setDecided] = useState<boolean>(true);
  const [showCustomize, setShowCustomize] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const existing = readConsent();
    setDecided(existing !== null);
  }, []);

  const choose = (choice: ConsentChoice) => {
    const state: ConsentState = {
      version: CONSENT_VERSION,
      decidedAt: new Date().toISOString(),
      analytics: choice === "all" ? true : choice === "custom" ? analytics : false,
      marketing: choice === "all" ? true : choice === "custom" ? marketing : false,
    };
    writeConsent(state);
    setDecided(true);
  };

  if (decided) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie-Einstellungen"
      aria-modal="false"
      className="fixed inset-x-0 bottom-0 z-[60] p-4 md:p-6"
      style={{ pointerEvents: "auto" }}
    >
      <div
        className="max-w-page mx-auto p-5 md:p-7 shadow-2xl"
        style={{
          background: "#FAFAF7",
          border: "1px solid #D9CDB8",
          boxShadow: "0 20px 60px -20px rgba(15,10,6,0.35)",
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-5 md:gap-8 items-start">
          <div>
            <p
              className="text-[10px] uppercase tracking-[0.22em] mb-2"
              style={{ color: "#B89968" }}
            >
              ✦ Cookies
            </p>
            <h2
              className="font-serif text-xl md:text-2xl leading-tight mb-2"
              style={{ color: "#0F0A06" }}
            >
              Wir nutzen Cookies — nur, was wirklich nötig ist.
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: "#5A4A3A", maxWidth: "62ch" }}>
              Technisch notwendige Cookies machen Warenkorb und Bestellung möglich.
              Mit Ihrer Erlaubnis nutzen wir zusätzlich anonyme Analyse (Plausible —
              keine Tracker, keine Drittländer). Details in unserer{" "}
              <Link href="/datenschutz" className="underline" style={{ color: "#A33B2A" }}>
                Datenschutzerklärung
              </Link>
              .
            </p>

            {showCustomize && (
              <div
                className="mt-5 pt-5 space-y-3"
                style={{ borderTop: "1px solid #D9CDB8" }}
              >
                <ToggleRow label="Technisch notwendig" sub="Immer aktiv (Warenkorb, Login, Stripe)" checked disabled />
                <ToggleRow
                  label="Analyse (Plausible)"
                  sub="Anonyme Statistik — keine personenbezogenen Daten"
                  checked={analytics}
                  onChange={setAnalytics}
                />
                <ToggleRow
                  label="Marketing"
                  sub="Aktuell nutzen wir nichts in dieser Kategorie."
                  checked={marketing}
                  onChange={setMarketing}
                />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 w-full md:w-auto md:min-w-[240px]">
            <button
              onClick={() => choose("all")}
              className="px-6 py-3 text-[11px] font-bold uppercase tracking-[0.18em]"
              style={{ background: "#0F0A06", color: "#FAFAF7" }}
            >
              Alle akzeptieren
            </button>
            <button
              onClick={() => choose("essential")}
              className="px-6 py-3 text-[11px] font-medium uppercase tracking-[0.15em]"
              style={{ background: "transparent", color: "#0F0A06", border: "1px solid #0F0A06" }}
            >
              Nur Notwendige
            </button>
            {showCustomize ? (
              <button
                onClick={() => choose("custom")}
                className="px-6 py-3 text-[11px] font-medium uppercase tracking-[0.15em]"
                style={{ background: "transparent", color: "#A33B2A", border: "1px solid #A33B2A" }}
              >
                Auswahl speichern
              </button>
            ) : (
              <button
                onClick={() => setShowCustomize(true)}
                className="text-[11px] uppercase tracking-[0.15em] pb-0.5 self-center mt-1"
                style={{ color: "#5A4A3A", borderBottom: "1px solid #D9CDB8" }}
              >
                Anpassen
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  sub,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  sub: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        className="w-4 h-4 mt-1 flex-shrink-0"
        style={{ accentColor: "#0F0A06" }}
      />
      <div>
        <p className="text-sm font-medium" style={{ color: "#0F0A06" }}>
          {label}
        </p>
        <p className="text-[11px]" style={{ color: "#8A7866" }}>
          {sub}
        </p>
      </div>
    </label>
  );
}
