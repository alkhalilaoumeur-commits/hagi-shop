import type { ReactNode } from "react";

/**
 * Weißer Karten-Container mit Sandstein-Rahmen — der durchgehende Baustein
 * für Panels, Listen und Info-Boxen im Admin.
 */
export function Card({
  children,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section";
}) {
  return <Tag className={`bg-bg-card border border-border ${className}`}>{children}</Tag>;
}

/**
 * Kennzahl-Kachel fürs Dashboard: Label oben, große Serif-Zahl, optionaler
 * Untertitel. `accent` färbt die Zahl (z.B. Terrakotta bei "Achtung nötig").
 */
export function KpiCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "ink" | "sienna" | "green";
}) {
  const accentClass =
    accent === "sienna" ? "text-sienna" : accent === "green" ? "text-green" : "text-ink";
  return (
    <Card className="p-5">
      <p className="text-[10px] uppercase tracking-[0.18em] mb-2 text-muted">{label}</p>
      <p className={`font-serif leading-none ${accentClass}`} style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)" }}>
        {value}
      </p>
      {sub && <p className="text-[10px] mt-2 text-ink-muted">{sub}</p>}
    </Card>
  );
}
