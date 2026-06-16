"use client";

import { useState, useEffect } from "react";

const PHONE = "4971112345678";
const NAME = "Hagi";
const HOURS = "Mo-Fr 10-19 · Sa 10-16";
const PRESET_MSG = encodeURIComponent(
  "Hallo Hagi, ich interessiere mich für einen Teppich aus Ihrer Kollektion. Können Sie mich beraten?"
);

export function WhatsAppBerater() {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 2500);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
          style={{ background: "rgba(15,10,6,0.5)" }}
        />
      )}

      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {open && (
          <div
            className="w-[300px] p-5 shadow-2xl"
            style={{
              background: "#FAFAF7",
              border: "1px solid #E5DCC8",
              animation: "revealUp 0.32s cubic-bezier(0.16,1,0.3,1) both",
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center font-serif font-medium"
                style={{ background: "#0F0A06", color: "#B89968" }}
              >
                H
              </div>
              <div>
                <p className="font-serif text-base leading-tight" style={{ color: "#0F0A06" }}>
                  {NAME}
                </p>
                <p className="text-[10px] uppercase tracking-[0.15em] flex items-center gap-1.5" style={{ color: "#5A4A3A" }}>
                  <span className="live-dot" style={{ width: "6px", height: "6px" }} />
                  Antwortet meist in 10 min
                </p>
              </div>
            </div>

            <p className="text-sm leading-relaxed mb-4" style={{ color: "#5A4A3A" }}>
              Hallo! Ich bin Hagi. Worum geht es — neuer Teppich, Beratung zum Erbstück, Reinigung? Schreiben Sie mir.
            </p>

            <p className="text-[11px] mb-4" style={{ color: "#8A7866" }}>
              {HOURS}
            </p>

            <a
              href={`https://wa.me/${PHONE}?text=${PRESET_MSG}`}
              target="_blank"
              rel="noopener"
              className="flex items-center justify-center gap-2 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.15em] w-full"
              style={{ background: "#25D366", color: "#FFFFFF" }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l.605.96-1.005 3.668 3.745-.982z" />
              </svg>
              Auf WhatsApp schreiben
            </a>

            <a
              href={`tel:+${PHONE}`}
              className="flex items-center justify-center gap-2 px-4 py-3 mt-2 text-[11px] font-medium uppercase tracking-[0.15em] w-full"
              style={{ border: "1px solid #E5DCC8", color: "#0F0A06" }}
            >
              Anrufen: +49 711 12 34 56 78
            </a>
          </div>
        )}

        <button
          onClick={() => setOpen(!open)}
          aria-label="Beratung anfragen"
          className="relative w-14 h-14 rounded-full flex items-center justify-center transition-transform hover:scale-105"
          style={{
            background: open ? "#0F0A06" : "#25D366",
            color: "#FFFFFF",
            boxShadow: "0 8px 24px rgba(15,10,6,0.25)",
          }}
        >
          {open ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
              <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l.605.96-1.005 3.668 3.745-.982z" />
            </svg>
          )}

          {!open && (
            <span
              className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
              style={{ background: "#FAFAF7", border: "2px solid #25D366" }}
            />
          )}
        </button>
      </div>
    </>
  );
}
