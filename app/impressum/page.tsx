// TODO: Hagis echte Firmendaten (Name, Adresse, USt-IdNr., Tel.) eintragen nach Klärungsgespräch

export default function ImpressumPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <h1 className="font-serif text-3xl text-ink mb-8">Impressum</h1>
      <div className="space-y-6 text-sm text-muted leading-relaxed">
        <div>
          <h2 className="font-semibold text-ink mb-1">Angaben gemäß § 5 TMG</h2>
          <p>
            [HAGIS VOLLSTÄNDIGER NAME]<br />
            [STRASSE + HAUSNUMMER]<br />
            [PLZ STUTTGART]<br />
            Deutschland
          </p>
        </div>
        <div>
          <h2 className="font-semibold text-ink mb-1">Kontakt</h2>
          <p>
            E-Mail: <a href="mailto:kontakt@hagi-shop.de" className="text-gold hover:underline">kontakt@hagi-shop.de</a><br />
            Tel: [TELEFONNUMMER]
          </p>
        </div>
        <div>
          <h2 className="font-semibold text-ink mb-1">Umsatzsteuer-Identifikationsnummer</h2>
          <p>[USt-IdNr. oder § 19 UStG Hinweis]</p>
        </div>
        <div>
          <h2 className="font-semibold text-ink mb-1">Verantwortlich für den Inhalt (§ 55 Abs. 2 RStV)</h2>
          <p>[HAGIS VOLLSTÄNDIGER NAME] · [ADRESSE WIE OBEN]</p>
        </div>
      </div>
    </div>
  );
}
