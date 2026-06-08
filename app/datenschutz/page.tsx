import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Datenschutzerklärung | Hagi Oriental Carpets",
  robots: "noindex",
};

export default function DatenschutzPage() {
  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-ink text-bg px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-serif text-lg">
          Hagi <span className="text-gold">Oriental Carpets</span>
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="font-serif text-3xl text-ink mb-8">Datenschutzerklärung</h1>

        <div className="space-y-6 text-sm text-ink leading-relaxed">
          <section>
            <h2 className="font-semibold text-base mb-2">1. Verantwortlicher</h2>
            <p className="text-muted">
              [NAME EINTRAGEN]<br />
              [STRASSE]<br />
              [PLZ ORT]<br />
              E-Mail: kontakt@hagi-shop.de
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">2. Erhobene Daten</h2>
            <p>
              Beim Bestellvorgang erheben wir folgende personenbezogene Daten:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-muted">
              <li>Name, E-Mail-Adresse, Telefonnummer</li>
              <li>Lieferadresse (bei Versandbestellung)</li>
              <li>Bestelldaten (Produkte, Preise, Datum)</li>
              <li>Zahlungsdaten (werden von Stripe verarbeitet, nicht von uns gespeichert)</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">3. Zweck der Verarbeitung</h2>
            <p>
              Die Daten werden ausschließlich zur Abwicklung Ihrer Bestellung verwendet:
              Bestellbestätigung per E-Mail, Versand, Kundenkommunikation.
              Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">4. Weitergabe an Dritte</h2>
            <p>
              Ihre Daten werden weitergegeben an:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-muted">
              <li><strong>Stripe Inc.</strong> — Zahlungsabwicklung (Datenschutz: stripe.com/de/privacy)</li>
              <li><strong>DHL / Paketdienstleister</strong> — Lieferung (Name + Adresse)</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">5. Speicherdauer</h2>
            <p>
              Bestelldaten werden gemäß gesetzlicher Aufbewahrungspflichten (HGB § 257,
              AO § 147) für 10 Jahre aufbewahrt. Danach werden sie gelöscht.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">6. Ihre Rechte</h2>
            <p>
              Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung
              der Verarbeitung sowie Datenübertragbarkeit. Wenden Sie sich hierfür an
              die oben genannte E-Mail-Adresse.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">7. Keine Cookies / Tracking</h2>
            <p>
              Dieser Shop verwendet keine Marketing-Cookies und kein Tracking-Tooling.
              Technisch notwendige Session-Daten werden nur für die Dauer Ihrer
              Sitzung gespeichert.
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
