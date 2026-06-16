const REVIEWS = [
  {
    name: "Dr. Andrea Weihmann",
    role: "Innenarchitektin",
    city: "Stuttgart-West",
    text: "Wir beziehen seit zwölf Jahren Teppiche bei Hagi für unsere Kundenprojekte. Die Beratung ist die ehrlichste in Süddeutschland — wir wissen, was wir bekommen, bevor wir es bezahlen.",
    initials: "AW",
  },
  {
    name: "Matthias Bredow",
    role: "Privatkunde",
    city: "Heidelberg",
    text: "Ich habe vorher zwei Showrooms in München gesehen. Hagi war günstiger, das Stück besser, das Zertifikat unzweideutig. Mein zweiter Teppich wird auch ein Hagi.",
    initials: "MB",
  },
  {
    name: "Familie Yıldız",
    role: "Privatkunden",
    city: "Filderstadt",
    text: "Mein Vater war Teppichknüpfer in Anatolien. Wenn ich hier einen Kelim aussuche, fühle ich die Wolle — und Hagi versteht, warum mir das wichtig ist.",
    initials: "FY",
  },
];

const PLATFORMS = [
  { name: "Google", rating: "4,9", count: "127 Bewertungen" },
  { name: "Trusted Shops", rating: "4,8", count: "84 Bewertungen" },
];

export function Reviews() {
  return (
    <section className="py-20 md:py-28" style={{ background: "#F0EAD8", borderTop: "1px solid #E5DCC8" }}>
      <div className="max-w-page mx-auto px-6 md:px-12">
        <div className="flex flex-wrap items-end justify-between mb-12 gap-6">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] mb-3" style={{ color: "#B89968" }}>
              ✦ Was unsere Kunden sagen
            </p>
            <h2 className="font-serif leading-tight" style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)", color: "#0F0A06" }}>
              Vertrauen seit
              <span className="font-script ml-3" style={{ fontSize: "clamp(3rem, 6vw, 5rem)", color: "#A33B2A" }}>
                20 Jahren.
              </span>
            </h2>
          </div>

          <div className="flex gap-8">
            {PLATFORMS.map((p) => (
              <div key={p.name}>
                <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: "#8A7866" }}>
                  {p.name}
                </p>
                <p className="font-serif text-3xl" style={{ color: "#0F0A06" }}>
                  {p.rating}<span style={{ color: "#A33B2A" }}>/5</span>
                </p>
                <p className="text-[11px]" style={{ color: "#8A7866" }}>
                  {p.count}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {REVIEWS.map((r) => (
            <article
              key={r.name}
              className="p-8 flex flex-col"
              style={{ background: "#FAFAF7", border: "1px solid #E5DCC8" }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center font-serif text-sm font-medium"
                  style={{ background: "#0F0A06", color: "#FAFAF7" }}
                >
                  {r.initials}
                </div>
                <div>
                  <p className="font-serif text-base leading-tight" style={{ color: "#0F0A06" }}>
                    {r.name}
                  </p>
                  <p className="text-[11px] uppercase tracking-[0.12em]" style={{ color: "#8A7866" }}>
                    {r.role} · {r.city}
                  </p>
                </div>
              </div>

              <p className="text-sm leading-relaxed mb-6" style={{ color: "#5A4A3A" }}>
                &ldquo;{r.text}&rdquo;
              </p>

              <div className="mt-auto pt-4" style={{ borderTop: "1px solid #E5DCC8" }}>
                <span style={{ color: "#B89968", letterSpacing: "2px" }}>★★★★★</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
