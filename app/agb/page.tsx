import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "AGB | Hagi Oriental Carpets",
  robots: "noindex",
};

export default function AGBPage() {
  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-ink text-bg px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-serif text-lg">
          Hagi <span className="text-gold">Oriental Carpets</span>
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 prose prose-stone">
        <h1 className="font-serif text-3xl text-ink mb-8">Allgemeine Geschäftsbedingungen</h1>

        <div className="space-y-6 text-sm text-ink leading-relaxed">
          <section>
            <h2 className="font-semibold text-base mb-2">§ 1 Geltungsbereich</h2>
            <p>
              Diese Allgemeinen Geschäftsbedingungen gelten für alle Verträge zwischen
              [FIRMA HIER EINTRAGEN], nachfolgend „Verkäufer", und dem Kunden.
              Abweichende Bedingungen des Kunden finden keine Anwendung.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">§ 2 Vertragsschluss</h2>
            <p>
              Die Darstellung der Produkte im Online-Shop stellt kein rechtlich
              bindendes Angebot dar, sondern eine Aufforderung zur Abgabe eines
              Angebots. Mit dem Absenden der Bestellung gibt der Kunde ein verbindliches
              Angebot ab. Der Verkäufer nimmt dieses Angebot durch Zusendung einer
              Auftragsbestätigung per E-Mail an.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">§ 3 Preise und Zahlung</h2>
            <p>
              Alle Preise verstehen sich als Endpreise in Euro. Die Zahlung erfolgt
              über den Zahlungsdienstleister Stripe (Kreditkarte). Die Lieferkosten
              werden im Bestellprozess separat ausgewiesen.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">§ 4 Lieferung</h2>
            <p>
              Die Lieferzeit beträgt in der Regel 3–7 Werktage innerhalb Deutschlands.
              Der Versand erfolgt per DHL oder ähnlichem Paketdienstleister.
              Selbstabholung in Stuttgart ist nach Vereinbarung möglich.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">§ 5 Widerrufsrecht</h2>
            <p>
              Als Verbraucher steht Ihnen ein gesetzliches Widerrufsrecht gemäß
              § 312g BGB zu. Weitere Informationen finden Sie in unserer{" "}
              <Link href="/widerruf" className="text-gold hover:underline">
                Widerrufsbelehrung
              </Link>.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">§ 6 Gewährleistung</h2>
            <p>
              Es gelten die gesetzlichen Gewährleistungsrechte. Mängel sind
              unverzüglich nach Feststellung zu melden.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">§ 7 Anwendbares Recht</h2>
            <p>
              Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des
              UN-Kaufrechts (CISG).
            </p>
          </section>

          <p className="text-muted text-xs pt-4 border-t border-border">
            Stand: {new Date().toLocaleDateString("de-DE", { month: "long", year: "numeric" })}
          </p>
        </div>
      </main>
    </div>
  );
}
