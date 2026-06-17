// Widerrufsbelehrung für physische Waren — § 312g Abs. 1 BGB + § 355 BGB
// Teppiche sind keine digitalen Inhalte — 14 Tage Widerrufsrecht gilt uneingeschränkt

export default function WiderrufPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <h1 className="font-serif text-3xl text-ink mb-2">Widerrufsbelehrung</h1>
      <p className="text-muted text-sm mb-10">Stand: Juni 2026</p>

      <div className="space-y-8 text-sm text-muted leading-relaxed">
        <section>
          <h2 className="font-semibold text-ink mb-2 text-base">Widerrufsrecht</h2>
          <p>
            Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu
            widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag, an dem Sie oder ein
            von Ihnen benannter Dritter, der nicht der Beförderer ist, die Waren in Besitz genommen
            haben bzw. hat.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-ink mb-2 text-base">Ausübung des Widerrufsrechts</h2>
          <p>
            Um Ihr Widerrufsrecht auszuüben, müssen Sie uns — [HAGIS NAME], [ADRESSE] — mittels
            einer eindeutigen Erklärung (z. B. E-Mail an{" "}
            <a href="mailto:kontakt@hagi-shop.de" className="text-gold hover:underline">
              kontakt@hagi-shop.de
            </a>
            ) über Ihren Entschluss informieren.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-ink mb-2 text-base">Folgen des Widerrufs</h2>
          <p>
            Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen
            erhalten haben, einschließlich der Lieferkosten (mit Ausnahme der zusätzlichen Kosten,
            die sich daraus ergeben, dass Sie eine andere Art der Lieferung als die von uns
            angebotene, günstigste Standardlieferung gewählt haben), unverzüglich und spätestens
            binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über Ihren
            Widerruf eingegangen ist. Wir verwenden für diese Rückzahlung dasselbe Zahlungsmittel.
          </p>
          <p className="mt-3">
            Sie haben die Waren unverzüglich und in jedem Fall spätestens binnen vierzehn Tagen
            ab dem Tag, an dem Sie uns über den Widerruf informieren, an uns zurückzusenden oder
            zu übergeben. Die Frist ist gewahrt, wenn Sie die Waren vor Ablauf der Frist absenden.
            Sie tragen die unmittelbaren Kosten der Rücksendung der Waren.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-ink mb-2 text-base">Muster-Widerrufsformular</h2>
          <div className="border border-border p-4 space-y-2 text-xs">
            <p>An: Hagi Teppiche, Egilolfstraße 41, 70599 Stuttgart, E-Mail: info@hagi-shop.de</p>
            <p>Hiermit widerrufe ich den von mir abgeschlossenen Vertrag über den Kauf folgender Waren:</p>
            <p>— Bestellt am / erhalten am:</p>
            <p>— Name des Verbrauchers:</p>
            <p>— Anschrift des Verbrauchers:</p>
            <p>— Datum:</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            <a
              href="/widerrufsformular?dl=1"
              className="inline-block px-4 py-2 font-semibold uppercase tracking-[0.15em]"
              style={{ background: "#0F0A06", color: "#FAFAF7" }}
            >
              Muster-PDF herunterladen
            </a>
            <a
              href="/widerruf-antrag"
              className="inline-block px-4 py-2 uppercase tracking-[0.15em]"
              style={{ background: "transparent", border: "1px solid #0F0A06", color: "#0F0A06" }}
            >
              Online widerrufen →
            </a>
          </div>
          <p className="mt-3 text-xs text-muted">
            Die Verwendung des Formulars ist nicht zwingend. Sie können auch formlos per E-Mail
            an info@hagi-shop.de oder über das Online-Formular widerrufen.
          </p>
        </section>
      </div>
    </div>
  );
}
