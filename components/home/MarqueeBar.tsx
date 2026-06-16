const items = [
  "Handgeknüpfte Orientteppiche",
  "Direktimport aus dem Orient",
  "Über 20 Jahre Erfahrung",
  "Gratis Versand & Rückgabe",
  "30 Tage Rückgaberecht",
  "Persische · Kelim · Modern",
  "Showroom Stuttgart",
];

export function MarqueeBar() {
  const repeated = [...items, ...items, ...items];
  return (
    <div
      className="overflow-hidden py-3 relative z-10"
      style={{ background: "#A33B2A", borderBottom: "1px solid rgba(0,0,0,0.15)" }}
    >
      <div className="marquee-track flex items-center gap-0 whitespace-nowrap">
        {repeated.map((item, i) => (
          <span key={i} className="flex items-center gap-6 px-6">
            <span
              className="text-[10px] font-bold uppercase tracking-[0.2em] text-white"
            >
              {item}
            </span>
            <span className="text-white/40 text-[8px]">◆</span>
          </span>
        ))}
      </div>
    </div>
  );
}
