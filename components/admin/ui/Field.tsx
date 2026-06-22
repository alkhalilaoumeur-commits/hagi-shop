import type { ReactNode } from "react";

/**
 * Gemeinsame Form-Primitive für den Admin. `fieldClass` ist die einheitliche
 * Optik für Inputs/Selects; <Field> ergänzt ein Label darüber.
 */
export const fieldClass =
  "w-full px-3 py-2.5 text-sm bg-bg-card border border-[#D9CDB8] text-ink focus:outline-none focus:border-ink transition-colors";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.18em] block mb-1.5 text-ink-muted">{label}</span>
      {children}
    </label>
  );
}

/** Kleines Eyebrow-Label für Abschnitts-Überschriften (✦ …). */
export function SectionLabel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p className={`text-[10px] uppercase tracking-[0.22em] text-gold ${className}`}>✦ {children}</p>
  );
}
