import type { Tone } from "@/lib/admin/status-labels";

/**
 * Einheitlicher Status-Pill. Nimmt einen semantischen `tone` (nicht eine Farbe)
 * und übersetzt ihn an EINER Stelle in konkrete Klassen. Will man später die
 * Admin-Farbwelt anpassen, ändert man nur diese Map.
 */
const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-bg-sand text-ink-muted",
  warning: "bg-gold text-bone",
  success: "bg-green text-bone",
  danger: "bg-sienna-dark text-bone",
  info: "bg-ink-muted text-bone",
  dark: "bg-ink text-bone",
};

export function StatusBadge({
  label,
  tone = "neutral",
  className = "",
}: {
  label: string;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={`inline-block px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] ${TONE_CLASSES[tone]} ${className}`}
    >
      {label}
    </span>
  );
}
