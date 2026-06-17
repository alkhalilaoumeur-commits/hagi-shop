import Link from "next/link";
import { lookupOrderForWithdrawal } from "@/app/actions/withdrawal";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Widerruf einreichen — Hagi Teppiche",
  robots: { index: false, follow: false },
};

const ERRORS: Record<string, string> = {
  invalid: "Eingaben unvollständig oder ungültig.",
  notfound: "Bestellung nicht gefunden — bitte Nummer und E-Mail prüfen.",
  rate_limited: "Zu viele Versuche. Bitte in einigen Minuten erneut versuchen.",
};

export default async function WiderrufAntragLanding({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const errorMsg = sp.error ? ERRORS[sp.error] ?? null : null;

  return (
    <main
      className="min-h-[100dvh] px-6 py-24"
      style={{ background: "radial-gradient(ellipse at 15% 20%, #F6EEDB 0%, #EFE6D2 60%, #E8DEC4 100%)" }}
    >
      <div className="max-w-xl mx-auto">
        <p className="text-[10px] uppercase tracking-[0.25em] mb-3" style={{ color: "#B89968" }}>
          ✦ Widerrufsrecht
        </p>
        <h1
          className="font-serif leading-[0.95] mb-6"
          style={{ fontSize: "clamp(2.2rem, 4.5vw, 3.5rem)", color: "#0F0A06", letterSpacing: "-0.015em" }}
        >
          Bestellung<br />
          <em style={{ color: "#A33B2A", fontStyle: "italic" }}>widerrufen.</em>
        </h1>
        <p className="text-base md:text-lg leading-snug mb-10" style={{ color: "#5A4A3A" }}>
          14 Tage Frist ab Erhalt. Volle Rückerstattung des Kaufpreises inklusive Hin-Versand.
          Bitte Bestellnummer und E-Mail eingeben, mit der Sie bestellt haben.
        </p>

        {errorMsg && (
          <div
            className="mb-8 px-4 py-3 text-sm"
            style={{ background: "#FAEDE9", border: "1px solid #A33B2A", color: "#A33B2A" }}
          >
            {errorMsg}
          </div>
        )}

        <form action={lookupOrderForWithdrawal} className="space-y-5">
          <div>
            <label
              htmlFor="orderNumber"
              className="block text-[10px] uppercase tracking-[0.22em] mb-2"
              style={{ color: "#5A4A3A" }}
            >
              Bestellnummer
            </label>
            <input
              id="orderNumber"
              name="orderNumber"
              type="text"
              required
              autoComplete="off"
              placeholder="HAG-2026-000000"
              className="w-full px-4 py-3 font-mono text-base"
              style={{ background: "#FAFAF7", border: "1px solid #D9CDB8", color: "#0F0A06" }}
            />
          </div>
          <div>
            <label
              htmlFor="email"
              className="block text-[10px] uppercase tracking-[0.22em] mb-2"
              style={{ color: "#5A4A3A" }}
            >
              E-Mail-Adresse
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full px-4 py-3 text-base"
              style={{ background: "#FAFAF7", border: "1px solid #D9CDB8", color: "#0F0A06" }}
            />
          </div>
          <button
            type="submit"
            className="w-full px-7 py-4 text-[11px] font-bold uppercase tracking-[0.18em] mt-4"
            style={{ background: "#0F0A06", color: "#FAFAF7" }}
          >
            Weiter →
          </button>
        </form>

        <div className="mt-10 pt-8 text-sm" style={{ borderTop: "1px solid #D9CDB8", color: "#5A4A3A" }}>
          <p className="mb-3">
            Vollständige Widerrufsbelehrung:{" "}
            <Link href="/widerruf" className="underline" style={{ color: "#A33B2A" }}>
              hier lesen
            </Link>
          </p>
          <p>
            Fragen?{" "}
            <a href="mailto:info@hagi-shop.de" className="underline" style={{ color: "#A33B2A" }}>
              info@hagi-shop.de
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
