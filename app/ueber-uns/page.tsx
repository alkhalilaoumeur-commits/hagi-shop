import { Metadata } from "next";
import Link from "next/link";
import { TrustStrip } from "@/components/home/TrustStrip";

export const metadata: Metadata = {
  title: "Über uns — vier Generationen, vier Reisen pro Jahr | Hagi Teppiche Stuttgart",
  description:
    "Hagi Teppiche aus Stuttgart — Direktimporteur seit 2003. 47 Knüpfer-Familien, 8 Herkunftsländer, viermal jährliche Reisen in den Orient.",
};

const TIMELINE = [
  {
    year: "2003",
    title: "Erste Reise nach Täbris",
    text: "Hagi reist zum ersten Mal mit der Absicht zu importieren in den Iran. Die ersten 12 Teppiche kommen nach Stuttgart — heute hängen drei davon noch in seinem privaten Wohnzimmer.",
  },
  {
    year: "2008",
    title: "Showroom Stuttgart",
    text: "Der erste eigene Showroom in der Egilolfstraße öffnet — bewusst klein, bewusst persönlich. Bis heute kein Verkaufsteam, jeder Kunde spricht direkt mit Hagi.",
  },
  {
    year: "2011",
    title: "Familie Roshan, Täbris",
    text: "Erste Partnerschaft mit einer Knüpfer-Familie über drei Generationen — keine Aufträge mehr über Mittler. Direkter Kontakt, faire Preise, langfristige Beziehung.",
  },
  {
    year: "2016",
    title: "Erweiterung nach Anatolien &amp; Marokko",
    text: "Kelims aus Ostanatolien und Berber-Teppiche aus dem Atlasgebirge kommen ins Sortiment. Heute beliefern uns 47 Knüpfer-Familien aus 8 Ländern.",
  },
  {
    year: "2020-22",
    title: "Pandemie und Direktimport",
    text: "Während die großen Importeure Lieferketten verloren, halten unsere persönlichen Beziehungen. Wir liefern weiter — direkt, ohne Großhandels-Zwischenstation.",
  },
  {
    year: "Heute",
    title: "Viermal pro Jahr im Orient",
    text: "Jährliche Reisen zu allen Knüpf-Familien, persönliche Auswahl jedes Teppichs, Echtheits-Zertifizierung direkt vom Webstuhl bis Stuttgart.",
  },
];

export default function UeberUnsPage() {
  return (
    <>
      <section className="pt-32 pb-20 relative" style={{ background: "#0F0A06" }}>
        <div
          className="absolute inset-0 opacity-25"
          style={{ background: "radial-gradient(ellipse at 80% 30%, rgba(184,153,104,0.4), transparent 60%)" }}
        />
        <div className="relative max-w-page mx-auto px-6 md:px-12">
          <nav className="flex items-center gap-2 text-[11px] uppercase tracking-[0.15em] mb-12" style={{ color: "#8A7866" }}>
            <Link href="/" className="hover:opacity-70 transition-opacity">Start</Link>
            <span>/</span>
            <span style={{ color: "#FAFAF7" }}>Über uns</span>
          </nav>

          <div className="max-w-3xl">
            <p className="text-[10px] uppercase tracking-[0.25em] mb-6" style={{ color: "#B89968" }}>
              ✦ Direktimporteur seit 2003
            </p>
            <h1 className="font-serif leading-[0.95] mb-8" style={{ fontSize: "clamp(2.8rem, 6vw, 5.5rem)", color: "#FAFAF7" }}>
              Wir kennen jeden<br />
              <span className="font-script block" style={{ fontSize: "clamp(4.5rem, 9vw, 8rem)", color: "#B89968", lineHeight: "0.85", marginTop: "0.2em" }}>
                Knüpfer
              </span>
              <span className="block">persönlich.</span>
            </h1>
            <p className="text-lg md:text-xl leading-relaxed" style={{ color: "#D2C9B5", maxWidth: "50ch" }}>
              Seit 2003 reisen wir viermal pro Jahr in die Knüpfregionen des Orients. Wir sitzen in den Werkstätten. Wir geben die Wolle in die Hand. Wir vereinbaren Preise direkt — und Sie bekommen die Differenz.
            </p>
          </div>
        </div>
      </section>

      <section className="py-20 md:py-32" style={{ background: "#FAFAF7" }}>
        <div className="max-w-page mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-20 mb-16">
            <div>
              <p className="font-serif" style={{ fontSize: "clamp(3.5rem, 6vw, 5rem)", color: "#0F0A06", lineHeight: "1" }}>
                47
              </p>
              <p className="text-[11px] uppercase tracking-[0.2em] mt-3" style={{ color: "#8A7866" }}>
                Knüpfer-Familien
              </p>
              <p className="text-base mt-2" style={{ color: "#5A4A3A" }}>
                Persönlich gekannt, jährlich besucht, direkt belieferung.
              </p>
            </div>
            <div>
              <p className="font-serif" style={{ fontSize: "clamp(3.5rem, 6vw, 5rem)", color: "#0F0A06", lineHeight: "1" }}>
                8
              </p>
              <p className="text-[11px] uppercase tracking-[0.2em] mt-3" style={{ color: "#8A7866" }}>
                Herkunftsländer
              </p>
              <p className="text-base mt-2" style={{ color: "#5A4A3A" }}>
                Iran, Pakistan, Afghanistan, Türkei, Indien, Nepal, Marokko, China.
              </p>
            </div>
            <div>
              <p className="font-serif" style={{ fontSize: "clamp(3.5rem, 6vw, 5rem)", color: "#0F0A06", lineHeight: "1" }}>
                0
              </p>
              <p className="text-[11px] uppercase tracking-[0.2em] mt-3" style={{ color: "#8A7866" }}>
                Zwischenhändler
              </p>
              <p className="text-base mt-2" style={{ color: "#5A4A3A" }}>
                Keine Importeur-Marge, keine Großhandels-Schicht.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28" style={{ background: "#F0EAD8", borderTop: "1px solid #E5DCC8" }}>
        <div className="max-w-page mx-auto px-6 md:px-12">
          <div className="mb-16">
            <p className="text-[10px] uppercase tracking-[0.25em] mb-3" style={{ color: "#B89968" }}>
              ✦ Zeitstrahl
            </p>
            <h2 className="font-serif text-3xl md:text-5xl leading-tight" style={{ color: "#0F0A06" }}>
              Zwanzig Jahre<br />
              <span className="font-script" style={{ fontSize: "1.5em", color: "#A33B2A" }}>Direktimport.</span>
            </h2>
          </div>

          <div className="divide-y" style={{ borderColor: "#E5DCC8" }}>
            {TIMELINE.map((t) => (
              <div key={t.year} className="grid md:grid-cols-[140px_1fr_2fr] gap-6 py-10">
                <p className="font-mono text-sm" style={{ color: "#B89968" }}>
                  {t.year}
                </p>
                <h3 className="font-serif text-xl md:text-2xl leading-tight" style={{ color: "#0F0A06" }} dangerouslySetInnerHTML={{ __html: t.title }} />
                <p className="text-base leading-relaxed" style={{ color: "#5A4A3A" }} dangerouslySetInnerHTML={{ __html: t.text }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28" style={{ background: "#FAFAF7" }}>
        <div className="max-w-page mx-auto px-6 md:px-12">
          <div className="grid md:grid-cols-[1fr_2fr] gap-12 max-w-5xl">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] mb-3" style={{ color: "#B89968" }}>
                ✦ Unser Versprechen
              </p>
              <h2 className="font-serif text-3xl md:text-4xl leading-tight" style={{ color: "#0F0A06" }}>
                Drei Sätze.
              </h2>
            </div>

            <div className="space-y-8">
              <div className="pb-8" style={{ borderBottom: "1px solid #E5DCC8" }}>
                <p className="font-serif text-xl md:text-2xl leading-snug" style={{ color: "#0F0A06" }}>
                  &ldquo;Jeder Teppich, den Sie bei uns kaufen, ist echt. Punkt.&rdquo;
                </p>
                <p className="text-sm mt-3" style={{ color: "#5A4A3A" }}>
                  Echtheitszertifikat in Schriftform mit jedem Stück. Bei Zweifel: zurück, Geld zurück, keine Diskussion.
                </p>
              </div>
              <div className="pb-8" style={{ borderBottom: "1px solid #E5DCC8" }}>
                <p className="font-serif text-xl md:text-2xl leading-snug" style={{ color: "#0F0A06" }}>
                  &ldquo;Sie bezahlen, was der Knüpfer verdient — plus unsere Marge. Mehr nicht.&rdquo;
                </p>
                <p className="text-sm mt-3" style={{ color: "#5A4A3A" }}>
                  Kein Großhandel, keine Showroom-Kette, keine intransparenten Importeur-Aufschläge. Direkt vom Knüpfer zu Ihnen.
                </p>
              </div>
              <div>
                <p className="font-serif text-xl md:text-2xl leading-snug" style={{ color: "#0F0A06" }}>
                  &ldquo;Wir sind in zwei Jahrzehnten nicht gewachsen. Das war Absicht.&rdquo;
                </p>
                <p className="text-sm mt-3" style={{ color: "#5A4A3A" }}>
                  Hagi berät jeden Kunden persönlich. Keine Vertriebsmitarbeiter, keine Provisionsstruktur. Das ist die einzige Art, in der man unsere Branche ehrlich machen kann.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <TrustStrip />

      <section className="py-20 md:py-28" style={{ background: "#0F0A06" }}>
        <div className="max-w-page mx-auto px-6 md:px-12 text-center">
          <h2 className="font-serif leading-tight mb-6" style={{ fontSize: "clamp(2.2rem, 5vw, 4rem)", color: "#FAFAF7" }}>
            Kommen Sie<br />
            <span className="font-script block" style={{ fontSize: "1.5em", color: "#B89968", lineHeight: "0.85", marginTop: "0.2em" }}>
              vorbei.
            </span>
          </h2>
          <p className="text-base md:text-lg max-w-xl mx-auto mb-10" style={{ color: "#D2C9B5" }}>
            Egilolfstraße 41, Stuttgart. Mo-Fr 10-19 Uhr, Sa 10-16 Uhr.
          </p>
          <Link
            href="/showroom"
            className="inline-flex items-center gap-2 px-8 py-3.5 text-[11px] font-bold uppercase tracking-[0.15em]"
            style={{ background: "#A33B2A", color: "#FAFAF7" }}
          >
            Termin vereinbaren
          </Link>
        </div>
      </section>
    </>
  );
}
