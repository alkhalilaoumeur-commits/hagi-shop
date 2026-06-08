import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Kontakt | Hagi Oriental Carpets",
  description: "Kontaktieren Sie Hagi Oriental Carpets in Stuttgart. Wir beraten Sie gerne zu unserem Teppich-Sortiment.",
};

export default function KontaktPage() {
  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-ink text-bg px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-serif text-lg">
          Hagi <span className="text-gold">Oriental Carpets</span>
        </Link>
        <nav className="flex gap-6 text-sm">
          <Link href="/produkte" className="hover:text-gold">Teppiche</Link>
          <Link href="/ueber-uns" className="hover:text-gold">Über uns</Link>
        </nav>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="font-serif text-4xl text-ink mb-3">Kontakt</h1>
        <p className="text-muted mb-12">Wir freuen uns von Ihnen zu hören.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Kontaktdaten */}
          <div className="space-y-6">
            <div>
              <p className="text-xs text-muted uppercase tracking-widest mb-2">Adresse</p>
              <p className="text-ink">
                [STRASSE]<br />
                [PLZ] Stuttgart
              </p>
            </div>

            <div>
              <p className="text-xs text-muted uppercase tracking-widest mb-2">Telefon</p>
              <a href="tel:[TELEFON]" className="text-ink hover:text-gold">
                [TELEFON HIER EINTRAGEN]
              </a>
            </div>

            <div>
              <p className="text-xs text-muted uppercase tracking-widest mb-2">E-Mail</p>
              <a href="mailto:kontakt@hagi-shop.de" className="text-gold hover:underline">
                kontakt@hagi-shop.de
              </a>
            </div>

            <div>
              <p className="text-xs text-muted uppercase tracking-widest mb-2">Öffnungszeiten</p>
              <div className="space-y-1 text-ink text-sm">
                <p>[MO–FR] [UHRZEIT]</p>
                <p>[SA] [UHRZEIT]</p>
                <p className="text-muted">Sonntag geschlossen</p>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted uppercase tracking-widest mb-2">Selbstabholung</p>
              <p className="text-sm text-muted">
                Online-Bestellungen können auch direkt bei uns abgeholt werden.
                Wählen Sie bei der Bestellung die Option „Selbstabholung".
              </p>
            </div>
          </div>

          {/* Einfaches Kontakt-CTA */}
          <div className="bg-bg border border-border p-6 flex flex-col justify-between">
            <div>
              <h2 className="font-serif text-2xl text-ink mb-3">Persönliche Beratung</h2>
              <p className="text-sm text-muted leading-relaxed mb-6">
                Unsicher welcher Teppich zu Ihnen passt? Kommen Sie einfach vorbei oder
                schreiben Sie uns — wir beraten Sie gerne zu Größen, Qualitäten und Preisen.
              </p>
            </div>

            <div className="space-y-3">
              <a
                href="mailto:kontakt@hagi-shop.de"
                className="block text-center bg-green text-white py-3 text-sm font-medium hover:bg-green/90 transition-colors"
              >
                E-Mail schreiben
              </a>
              <a
                href="tel:[TELEFON]"
                className="block text-center border border-border text-ink py-3 text-sm font-medium hover:border-ink transition-colors"
              >
                Anrufen
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
