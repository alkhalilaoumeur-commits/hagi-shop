import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Seite nicht gefunden — Hagi Teppiche",
};

export default function NotFound() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-24 text-center">
      <p className="font-serif text-5xl text-gold mb-4">404</p>
      <h1 className="font-serif text-2xl text-ink mb-4">
        Diese Seite existiert nicht.
      </h1>
      <p className="text-muted text-base mb-8">
        Der gesuchte Teppich ist wohl schon verkauft — oder die Seite wurde
        verschoben.
      </p>
      <div className="flex justify-center gap-4 flex-wrap">
        <Link
          href="/produkte"
          className="inline-block bg-green text-white px-8 py-3 text-sm font-medium hover:bg-green/90 transition-colors"
        >
          Zur Kollektion
        </Link>
        <Link
          href="/"
          className="inline-block border border-border text-ink px-8 py-3 text-sm font-medium hover:bg-surface transition-colors"
        >
          Startseite
        </Link>
      </div>
    </div>
  );
}
