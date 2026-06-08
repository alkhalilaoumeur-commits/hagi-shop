import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Über uns | Hagi Oriental Carpets",
  description: "Hagi Oriental Carpets — handverlesene orientalische Teppiche aus Stuttgart. Über 20 Jahre Erfahrung im Teppichhandel.",
};

export default function UeberUnsPage() {
  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-ink text-bg px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-serif text-lg">
          Hagi <span className="text-gold">Oriental Carpets</span>
        </Link>
        <nav className="flex gap-6 text-sm">
          <Link href="/produkte" className="hover:text-gold">Teppiche</Link>
          <Link href="/kontakt" className="hover:text-gold">Kontakt</Link>
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="font-serif text-4xl text-ink mb-4">Über Hagi Oriental Carpets</h1>
        <p className="text-gold text-sm mb-10 tracking-widest uppercase">Stuttgart · Seit [JAHR]</p>

        <div className="space-y-8 text-ink leading-relaxed">
          <p className="text-lg">
            [KURZTEXT ÜBER HAGI EINFÜGEN — z.B. "Wir sind ein Familienunternehmen aus Stuttgart,
            spezialisiert auf handgeknüpfte orientalische Teppiche aus dem Iran, der Türkei und Afghanistan."]
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-8 border-y border-border">
            {[
              { value: "[X]+", label: "Jahre Erfahrung" },
              { value: "[X]+", label: "Teppiche im Sortiment" },
              { value: "[X]+", label: "Zufriedene Kunden" },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <p className="font-serif text-4xl text-gold mb-1">{item.value}</p>
                <p className="text-sm text-muted">{item.label}</p>
              </div>
            ))}
          </div>

          <section>
            <h2 className="font-serif text-2xl text-ink mb-3">Unsere Philosophie</h2>
            <p className="text-muted">
              [TEXT HIER EINFÜGEN — z.B. über Qualität, Herkunft, Handwerk, persönliche Beratung]
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-ink mb-3">Herkunft & Qualität</h2>
            <p className="text-muted">
              [TEXT ÜBER HERKUNFTSLÄNDER, QUALITÄTSMERKMALE, HANDARBEIT]
            </p>
          </section>

          <div className="bg-ink text-bg p-8 mt-8">
            <h3 className="font-serif text-2xl mb-3">Besuchen Sie uns</h3>
            <p className="text-bg/80 mb-4">
              [ADRESSE], Stuttgart
            </p>
            <Link
              href="/kontakt"
              className="inline-block border border-gold text-gold px-6 py-2.5 text-sm hover:bg-gold hover:text-ink transition-colors"
            >
              Kontakt aufnehmen
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
