"use client";
import { useState } from "react";
import Link from "next/link";

export function AnnouncementBar() {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;

  return (
    <div
      className="relative z-50 flex items-center justify-center gap-6 px-10 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em]"
      style={{ background: "#0F0A06", color: "#D2C9B5" }}
    >
      <span className="hidden sm:block opacity-40">◆</span>
      <span>Kostenloser Versand auf alle Bestellungen</span>
      <span className="opacity-40">◆</span>
      <Link href="/produkte" className="underline underline-offset-2 hover:opacity-70 transition-opacity">
        30 Tage Rückgaberecht
      </Link>
      <span className="opacity-40 hidden sm:block">◆</span>
      <span className="hidden md:block">Direktimport · Kein Zwischenhändler</span>
      <button
        onClick={() => setVisible(false)}
        className="absolute right-4 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 transition-opacity text-base leading-none"
        aria-label="Schließen"
      >
        ×
      </button>
    </div>
  );
}
