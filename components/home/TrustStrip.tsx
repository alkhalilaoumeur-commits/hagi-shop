const ITEMS = [
  {
    label: "Echtheitszertifikat",
    sub: "Mit jedem Teppich",
    icon: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  {
    label: "31 Tage zurück",
    sub: "Gratis Rückversand",
    icon: "M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3",
  },
  {
    label: "Versand frei Haus",
    sub: "Innerhalb DACH",
    icon: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10",
  },
  {
    label: "Showroom Stuttgart",
    sub: "Termin in 24 h",
    icon: "M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z",
  },
];

export function TrustStrip() {
  return (
    <div
      className="relative"
      style={{
        background: "#FAFAF7",
        borderTop: "1px solid #E5DCC8",
        borderBottom: "1px solid #E5DCC8",
      }}
    >
      <div className="max-w-page mx-auto px-6 md:px-12 py-8 md:py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-8">
          {ITEMS.map((item) => (
            <div key={item.label} className="flex items-start gap-4">
              <div
                className="flex-shrink-0 mt-0.5"
                style={{ color: "#A33B2A" }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-7 h-7"
                >
                  <path d={item.icon} />
                </svg>
              </div>
              <div>
                <p
                  className="font-serif text-base md:text-lg leading-tight"
                  style={{ color: "#0F0A06" }}
                >
                  {item.label}
                </p>
                <p
                  className="text-[11px] uppercase tracking-[0.15em] mt-1"
                  style={{ color: "#8A7866" }}
                >
                  {item.sub}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
