import Link from "next/link";

export function HeritageStory() {
  return (
    <section className="py-20 md:py-32 relative overflow-hidden" style={{ background: "#FAFAF7" }}>
      <div className="max-w-page mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-16 items-start">
          <div className="md:col-span-5">
            <p className="text-[10px] uppercase tracking-[0.25em] mb-4" style={{ color: "#B89968" }}>
              ✦ Seit 2003
            </p>
            <h2 className="font-serif leading-[0.95] mb-2" style={{ fontSize: "clamp(2.5rem, 5vw, 4.5rem)", color: "#0F0A06" }}>
              Vier Reisen
            </h2>
            <p className="font-script leading-[0.85] mb-8" style={{ fontSize: "clamp(4rem, 8vw, 7rem)", color: "#A33B2A" }}>
              im Jahr.
            </p>
            <p className="text-[11px] uppercase tracking-[0.2em]" style={{ color: "#8A7866" }}>
              Iran · Türkei · Afghanistan · Pakistan
            </p>
          </div>

          <div className="md:col-span-7">
            <p
              className="font-serif text-2xl md:text-3xl leading-snug mb-8"
              style={{ color: "#0F0A06" }}
            >
              &ldquo;Wir kennen jeden Knüpfer persönlich. Nicht über Mittler, nicht über Showrooms — wir reisen selbst.&rdquo;
            </p>
            <p className="text-base md:text-lg leading-relaxed mb-6" style={{ color: "#5A4A3A" }}>
              Seit über zwei Jahrzehnten reist Hagi viermal im Jahr in die Knüpfregionen des Orients. Wir sitzen in den Werkstätten, wir sehen die Webstühle, wir geben die Wolle in die Hand. Jeder Teppich, den wir nach Stuttgart bringen, hat einen Namen, eine Familie, eine Geschichte.
            </p>
            <p className="text-base md:text-lg leading-relaxed mb-8" style={{ color: "#5A4A3A" }}>
              Das ist keine Marketing-Geschichte. Das ist die Voraussetzung dafür, dass wir Ihnen einen Teppich verkaufen können, ohne mit der Wimper zu zucken — weil wir wissen, was er ist.
            </p>

            <div className="grid grid-cols-3 gap-6 pt-8 mb-8" style={{ borderTop: "1px solid #E5DCC8" }}>
              <div>
                <p className="font-serif text-3xl md:text-4xl" style={{ color: "#0F0A06" }}>
                  20<span style={{ color: "#A33B2A" }}>+</span>
                </p>
                <p className="text-[10px] uppercase tracking-[0.18em] mt-2" style={{ color: "#8A7866" }}>
                  Jahre Direktimport
                </p>
              </div>
              <div>
                <p className="font-serif text-3xl md:text-4xl" style={{ color: "#0F0A06" }}>
                  47
                </p>
                <p className="text-[10px] uppercase tracking-[0.18em] mt-2" style={{ color: "#8A7866" }}>
                  Knüpfer-Familien
                </p>
              </div>
              <div>
                <p className="font-serif text-3xl md:text-4xl" style={{ color: "#0F0A06" }}>
                  8
                </p>
                <p className="text-[10px] uppercase tracking-[0.18em] mt-2" style={{ color: "#8A7866" }}>
                  Herkunftsländer
                </p>
              </div>
            </div>

            <Link
              href="/ueber-uns"
              className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.15em] font-semibold pb-1"
              style={{ color: "#A33B2A", borderBottom: "1px solid #A33B2A" }}
            >
              Unsere ganze Geschichte →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
