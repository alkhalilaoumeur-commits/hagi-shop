import type { Metadata } from "next";
import Link from "next/link";
import { TrustStrip } from "@/components/home/TrustStrip";

export const metadata: Metadata = {
  title: "Showroom Stuttgart — Termin vereinbaren | Hagi Teppiche",
  description:
    "Besuchen Sie unseren Showroom in Stuttgart. Persönliche Beratung, über 200 Teppiche zum Anfassen. Termin in 24 Stunden bestätigt.",
};

const SERVICES = [
  {
    label: "Persönliche Beratung",
    text: "60-90 Minuten in unserem Showroom. Wir nehmen uns Zeit, hören zu, zeigen — keine Verkaufs-Choreografie.",
  },
  {
    label: "Teppich auf Probe",
    text: "Wählen Sie 2-3 Teppiche aus. Wir liefern, Sie testen 7 Tage zuhause. Was nicht passt, holen wir kostenlos ab.",
  },
  {
    label: "Reinigung &amp; Reparatur",
    text: "Bringen Sie Ihren Teppich vorbei — auch wenn er nicht von uns ist. Wir reinigen, knüpfen, restaurieren.",
  },
  {
    label: "Wertschätzung",
    text: "Erbstück? Antik-Stück? Wir schätzen den Wert kostenlos und ehrlich. 200 € oder 20.000 € — wir sagen es Ihnen.",
  },
];

export default function ShowroomPage() {
  return (
    <>
      <section className="pt-32 pb-16 relative" style={{ background: "#0F0A06" }}>
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: "radial-gradient(ellipse at 20% 60%, rgba(163,59,42,0.35), transparent 60%)",
          }}
        />

        <div className="relative max-w-page mx-auto px-6 md:px-12">
          <nav className="flex items-center gap-2 text-[11px] uppercase tracking-[0.15em] mb-12" style={{ color: "#8A7866" }}>
            <Link href="/" className="hover:opacity-70 transition-opacity">Start</Link>
            <span>/</span>
            <span style={{ color: "#FAFAF7" }}>Showroom</span>
          </nav>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div
                className="inline-flex items-center gap-3 rounded-full px-4 py-1.5 mb-8"
                style={{ background: "rgba(250,250,247,0.06)", border: "1px solid rgba(250,250,247,0.14)" }}
              >
                <span className="live-dot" />
                <span className="text-[10px] uppercase tracking-[0.22em] font-medium" style={{ color: "#E5DCC8" }}>
                  Heute geöffnet · 10-19 Uhr
                </span>
              </div>

              <h1 className="font-serif leading-[0.95] mb-6" style={{ fontSize: "clamp(2.8rem, 6vw, 5.5rem)", color: "#FAFAF7" }}>
                Kommen Sie<br />
                <span className="font-script" style={{ fontSize: "clamp(4.5rem, 9vw, 8rem)", color: "#B89968", lineHeight: "0.85", display: "inline-block", marginTop: "0.2em" }}>
                  vorbei.
                </span>
              </h1>

              <p className="text-base md:text-lg leading-relaxed mb-8" style={{ color: "#D2C9B5", maxWidth: "42ch" }}>
                Teppiche müssen Sie fühlen. Die Wolle in der Hand, den Knoten unter den Fingern, die Farbe im Tageslicht. Unser Showroom in Stuttgart ist eine Galerie — kommen Sie vorbei.
              </p>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="#termin"
                  className="inline-flex items-center gap-2 px-8 py-3.5 text-[11px] font-bold uppercase tracking-[0.15em]"
                  style={{ background: "#A33B2A", color: "#FAFAF7" }}
                >
                  Termin vereinbaren
                </Link>
                <a
                  href="tel:+4971112345678"
                  className="inline-flex items-center gap-2 px-8 py-3.5 text-[11px] font-medium uppercase tracking-[0.15em]"
                  style={{ border: "1px solid rgba(250,250,247,0.2)", color: "#D2C9B5" }}
                >
                  +49 711 12 34 56 78
                </a>
              </div>
            </div>

            <div
              className="aspect-[4/5] relative overflow-hidden"
              style={{ background: "#1A1208" }}
            >
              <div
                className="absolute inset-0 flex items-center justify-center text-center p-8"
                style={{
                  background: "linear-gradient(135deg, rgba(163,59,42,0.25) 0%, transparent 100%)",
                }}
              >
                <div>
                  <p className="font-script mb-2" style={{ fontSize: "clamp(3rem, 6vw, 5rem)", color: "#B89968", lineHeight: "0.85" }}>
                    Hagi
                  </p>
                  <p className="text-[11px] uppercase tracking-[0.25em]" style={{ color: "#D2C9B5" }}>
                    Showroom · Egilolfstraße 41<br />70599 Stuttgart
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <TrustStrip />

      <section id="termin" className="py-20 md:py-28" style={{ background: "#FAFAF7" }}>
        <div className="max-w-page mx-auto px-6 md:px-12 grid md:grid-cols-[1fr_2fr] gap-16">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] mb-3" style={{ color: "#B89968" }}>
              ✦ Was wir tun
            </p>
            <h2 className="font-serif text-3xl md:text-4xl leading-tight mb-6" style={{ color: "#0F0A06" }}>
              Vier Wege, Sie<br />
              <span className="font-script" style={{ fontSize: "1.4em", color: "#A33B2A" }}>zu betreuen.</span>
            </h2>
            <p className="text-base leading-relaxed" style={{ color: "#5A4A3A" }}>
              Egal ob Sie einen ersten Teppich kaufen oder ein Erbstück bringen — wir machen das seit zwanzig Jahren.
            </p>
          </div>

          <div className="divide-y" style={{ borderColor: "#E5DCC8" }}>
            {SERVICES.map((s, i) => (
              <div key={s.label} className="grid grid-cols-[60px_1fr] gap-6 py-8">
                <span className="font-mono text-sm" style={{ color: "#B89968" }}>
                  0{i + 1}
                </span>
                <div>
                  <h3 className="font-serif text-xl mb-2" style={{ color: "#0F0A06" }} dangerouslySetInnerHTML={{ __html: s.label }} />
                  <p className="text-base leading-relaxed" style={{ color: "#5A4A3A" }} dangerouslySetInnerHTML={{ __html: s.text }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28" style={{ background: "#F0EAD8", borderTop: "1px solid #E5DCC8" }}>
        <div className="max-w-page mx-auto px-6 md:px-12">
          <div className="grid md:grid-cols-[1fr_1fr] gap-12">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] mb-3" style={{ color: "#B89968" }}>
                ✦ Ihr Berater vor Ort
              </p>
              <h2 className="font-serif text-3xl md:text-4xl leading-tight mb-6" style={{ color: "#0F0A06" }}>
                Hagi <span className="font-script" style={{ fontSize: "1.4em", color: "#A33B2A" }}>persönlich.</span>
              </h2>
              <p className="text-base md:text-lg leading-relaxed mb-6" style={{ color: "#5A4A3A" }}>
                Sie sprechen direkt mit dem Inhaber — nicht mit einem Praktikanten, nicht mit einem Verkaufsteam. Hagi ist seit über 20 Jahren in der Branche, reist viermal im Jahr in die Knüpfregionen und kennt jeden Teppich in seinem Showroom persönlich.
              </p>
              <ul className="space-y-3 text-sm" style={{ color: "#5A4A3A" }}>
                <li className="flex items-start gap-2">
                  <span style={{ color: "#A33B2A" }}>✓</span>
                  <span>Persönliche Beratung auf Deutsch, Englisch, Persisch</span>
                </li>
                <li className="flex items-start gap-2">
                  <span style={{ color: "#A33B2A" }}>✓</span>
                  <span>Termin meist innerhalb von 24 h bestätigt</span>
                </li>
                <li className="flex items-start gap-2">
                  <span style={{ color: "#A33B2A" }}>✓</span>
                  <span>Auch Video-Beratung möglich (für Auswärtige)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span style={{ color: "#A33B2A" }}>✓</span>
                  <span>Bei großen Projekten: Hausbesuch in Süddeutschland</span>
                </li>
              </ul>
            </div>

            <div
              className="p-8 md:p-10"
              style={{ background: "#FAFAF7", border: "1px solid #E5DCC8" }}
            >
              <p className="text-[10px] uppercase tracking-[0.2em] mb-2" style={{ color: "#B89968" }}>
                Termin anfragen
              </p>
              <h3 className="font-serif text-2xl md:text-3xl mb-6" style={{ color: "#0F0A06" }}>
                Wir melden uns innerhalb 24 h.
              </h3>

              <form className="flex flex-col gap-4">
                <input
                  type="text"
                  placeholder="Ihr Name"
                  className="px-4 py-3 text-sm border focus:outline-none transition-colors"
                  style={{ background: "transparent", borderColor: "#E5DCC8", color: "#0F0A06" }}
                />
                <input
                  type="email"
                  placeholder="E-Mail"
                  className="px-4 py-3 text-sm border focus:outline-none transition-colors"
                  style={{ background: "transparent", borderColor: "#E5DCC8", color: "#0F0A06" }}
                />
                <input
                  type="tel"
                  placeholder="Telefon (optional)"
                  className="px-4 py-3 text-sm border focus:outline-none transition-colors"
                  style={{ background: "transparent", borderColor: "#E5DCC8", color: "#0F0A06" }}
                />
                <textarea
                  placeholder="Wann passt es Ihnen? Worum geht es?"
                  rows={4}
                  className="px-4 py-3 text-sm border focus:outline-none transition-colors resize-none"
                  style={{ background: "transparent", borderColor: "#E5DCC8", color: "#0F0A06" }}
                />
                <button
                  type="submit"
                  className="mt-2 px-8 py-3.5 text-[11px] font-bold uppercase tracking-[0.15em]"
                  style={{ background: "#0F0A06", color: "#FAFAF7" }}
                >
                  Termin anfragen
                </button>
              </form>

              <div className="mt-8 pt-6 grid grid-cols-2 gap-4 text-sm" style={{ borderTop: "1px solid #E5DCC8" }}>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.15em] mb-1" style={{ color: "#8A7866" }}>
                    Adresse
                  </p>
                  <p style={{ color: "#0F0A06" }}>
                    Egilolfstraße 41<br />70599 Stuttgart
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.15em] mb-1" style={{ color: "#8A7866" }}>
                    Öffnungszeiten
                  </p>
                  <p style={{ color: "#0F0A06" }}>
                    Mo-Fr 10-19 Uhr<br />Sa 10-16 Uhr<br />Sonntags geschlossen
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
