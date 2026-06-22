import type { ReactNode } from "react";

/**
 * Einheitlicher Seitenkopf: Eyebrow (✦ + Kategorie) + Serif-H1 + optionale
 * Beschreibung, mit Platz für eine Aktion rechts (z.B. "+ Neues Produkt").
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 mb-10">
      <div>
        {eyebrow && (
          <p className="text-[10px] uppercase tracking-[0.25em] mb-3 text-gold">✦ {eyebrow}</p>
        )}
        <h1 className="font-serif text-ink leading-[1.05]" style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}>
          {title}
        </h1>
        {description && <p className="mt-3 text-sm text-ink-muted max-w-xl">{description}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </header>
  );
}
