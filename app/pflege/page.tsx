import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Teppich-Pflege Anleitung — vom Importeur | Hagi Teppiche Stuttgart",
  description:
    "Wie reinige ich einen handgeknüpften Teppich richtig? Was tun bei Flecken? Wie lagere ich richtig? Anleitung vom Stuttgarter Direktimporteur.",
};

const SECTIONS = [
  {
    num: "01",
    title: "Tägliche Pflege",
    text: "Saugen Sie Ihren Teppich einmal pro Woche mit niedriger Saugleistung — niemals mit Bürstrolle. Saugen Sie immer in Flor-Richtung, nie quer. Bei Seide oder seidenhaltigen Mischungen genügt das Absaugen mit einer Handdüse.",
  },
  {
    num: "02",
    title: "Bei Flecken — die ersten 30 Sekunden",
    text: "Sofort handeln. Tupfen Sie mit einem sauberen weißen Baumwolltuch — niemals reiben. Bei wässrigen Flecken (Wein, Saft) verdünntes lauwarmes Wasser. Bei Öl/Fett: trocken absaugen, dann mit minimaler Mengen Spülmittel-Wasser tupfen. Niemals direkten Wärmeeinsatz (Föhn).",
  },
  {
    num: "03",
    title: "Professionelle Reinigung",
    text: "Alle 2-4 Jahre — abhängig von Beanspruchung. Wir bieten in Stuttgart unsere eigene Reinigung an, mit fachgerechter Wäsche in flachem Wasser, Naturseife und schonender Trocknung. Niemals in eine normale Reinigung geben.",
  },
  {
    num: "04",
    title: "Sonne &amp; Licht",
    text: "Naturfarben bleichen unter direkter Sonneneinstrahlung aus. Drehen Sie Ihren Teppich halbjährlich um 180° — so altert er gleichmäßig und behält seine Farbintensität.",
  },
  {
    num: "05",
    title: "Lagerung",
    text: "Wenn Sie den Teppich einlagern: rollen, niemals falten. Mit reiner Baumwolle umwickeln (kein Plastik — bildet Schimmel). An einem trockenen, dunklen Ort lagern. Zwischen den Wickelschichten Lavendel oder Zedernholz gegen Motten.",
  },
  {
    num: "06",
    title: "Fußbodenheizung",
    text: "Alle unsere Teppiche mit Baumwoll-Kette sind für Fußbodenheizung geeignet. Empfehlung: maximale Heiztemperatur 27 °C. Zu hohe Temperaturen können die Wolle austrocknen.",
  },
];

const FAQ = [
  {
    q: "Was tun bei einem Mottenbefall?",
    a: "Sofort: Teppich aus dem Raum, gründlich klopfen (im Freien), absaugen. Befallene Stelle markieren. Bei stärkerem Befall: zu uns bringen — wir behandeln professionell mit Naturmethoden, keine Chemiekeule.",
  },
  {
    q: "Darf ich meinen Teppich draußen lüften?",
    a: "Ja, einmal pro Saison ist ideal. Im Schatten, nicht in praller Sonne. Über eine Wäscheleine hängen, leicht abklopfen. So entfernt sich gebundener Staub.",
  },
  {
    q: "Was tun, wenn der Teppich Wellen wirft?",
    a: "Meist normales Setzverhalten in den ersten Wochen. Hilfe: einige Tage umgekehrt auslegen, die Wellen verschwinden. Bleiben Wellen länger: in den Showroom kommen, wir richten ihn.",
  },
  {
    q: "Ist mein Teppich Allergiker-geeignet?",
    a: "Handgeknüpfte Wollteppiche sind besser als Synthetik — die natürliche Faser bindet Hausstaub und gibt ihn beim Saugen wieder ab. Bei Wollallergie: lieber Kelim aus Baumwolle wählen.",
  },
  {
    q: "Mein Teppich riecht nach Wolle. Normal?",
    a: "Bei neuen handgeknüpften Wollteppichen normal — der natürliche Lanolin-Geruch verfliegt in 2-4 Wochen. Lüften hilft. Sollte er nach 6 Wochen noch da sein: melden, wir prüfen.",
  },
];

export default function PflegePage() {
  return (
    <>
      <section className="pt-32 pb-16" style={{ background: "#FAFAF7" }}>
        <div className="max-w-page mx-auto px-6 md:px-12">
          <nav className="flex items-center gap-2 text-[11px] uppercase tracking-[0.15em] mb-12" style={{ color: "#8A7866" }}>
            <Link href="/" className="hover:opacity-70 transition-opacity">Start</Link>
            <span>/</span>
            <span style={{ color: "#0F0A06" }}>Pflege-Ratgeber</span>
          </nav>

          <div className="max-w-3xl">
            <p className="text-[10px] uppercase tracking-[0.25em] mb-4" style={{ color: "#B89968" }}>
              ✦ Aus 20 Jahren Erfahrung
            </p>
            <h1 className="font-serif leading-[0.95] mb-6" style={{ fontSize: "clamp(2.5rem, 6vw, 5rem)", color: "#0F0A06" }}>
              So behandeln Sie<br />
              <span className="font-script" style={{ fontSize: "clamp(4rem, 9vw, 7rem)", color: "#A33B2A" }}>ein Erbstück.</span>
            </h1>
            <p className="text-lg leading-relaxed" style={{ color: "#5A4A3A" }}>
              Ein handgeknüpfter Teppich kann fünf, sechs Generationen überdauern — wenn man ein paar einfache Regeln kennt. Hier sind sie, ohne Marketing-Sprech.
            </p>
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28" style={{ background: "#F0EAD8", borderTop: "1px solid #E5DCC8" }}>
        <div className="max-w-page mx-auto px-6 md:px-12">
          <div className="divide-y" style={{ borderColor: "#E5DCC8" }}>
            {SECTIONS.map((s) => (
              <div key={s.num} className="grid md:grid-cols-[100px_1fr_2fr] gap-6 py-10">
                <span className="font-serif text-3xl" style={{ color: "#0F0A06" }}>
                  {s.num}
                </span>
                <h2 className="font-serif text-xl md:text-2xl leading-tight" style={{ color: "#0F0A06" }}>
                  {s.title}
                </h2>
                <p className="text-base leading-relaxed" style={{ color: "#5A4A3A" }}>
                  {s.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28" style={{ background: "#FAFAF7" }}>
        <div className="max-w-page mx-auto px-6 md:px-12">
          <div className="grid md:grid-cols-[1fr_2fr] gap-12">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] mb-3" style={{ color: "#B89968" }}>
                ✦ Häufige Fragen
              </p>
              <h2 className="font-serif text-3xl md:text-4xl leading-tight" style={{ color: "#0F0A06" }}>
                Antworten aus<br />
                <span className="font-script" style={{ fontSize: "1.4em", color: "#A33B2A" }}>der Praxis.</span>
              </h2>
            </div>

            <div className="divide-y" style={{ borderColor: "#E5DCC8" }}>
              {FAQ.map((f) => (
                <details key={f.q} className="group py-6 cursor-pointer">
                  <summary className="flex items-center justify-between font-serif text-lg md:text-xl list-none" style={{ color: "#0F0A06" }}>
                    {f.q}
                    <span className="text-2xl ml-4 transition-transform group-open:rotate-45" style={{ color: "#A33B2A" }}>+</span>
                  </summary>
                  <p className="mt-4 text-base leading-relaxed" style={{ color: "#5A4A3A" }}>
                    {f.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28" style={{ background: "#0F0A06" }}>
        <div className="max-w-page mx-auto px-6 md:px-12 text-center">
          <p className="text-[10px] uppercase tracking-[0.25em] mb-4" style={{ color: "#B89968" }}>
            ✦ Showroom-Service
          </p>
          <h2 className="font-serif leading-tight mb-6" style={{ fontSize: "clamp(2rem, 5vw, 4rem)", color: "#FAFAF7" }}>
            Wir kümmern uns auch <span className="font-script block" style={{ fontSize: "1.4em", color: "#B89968", lineHeight: "0.85", marginTop: "0.2em" }}>danach.</span>
          </h2>
          <p className="text-base md:text-lg max-w-2xl mx-auto mb-10" style={{ color: "#D2C9B5" }}>
            Reinigung, Reparatur, Schätzung, Wertgutachten — bringen Sie Ihren Teppich in unseren Showroom in Stuttgart. Wir machen das seit 20 Jahren.
          </p>
          <Link
            href="/showroom"
            className="inline-flex items-center gap-2 px-8 py-3.5 text-[11px] font-bold uppercase tracking-[0.15em]"
            style={{ background: "#A33B2A", color: "#FAFAF7" }}
          >
            Showroom-Termin anfragen
          </Link>
        </div>
      </section>
    </>
  );
}
