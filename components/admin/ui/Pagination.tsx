import Link from "next/link";

/**
 * Einheitliche Seiten-Navigation. Baut die Query-String selbst aus den
 * vorhandenen Filter-Params (leere Werte werden verworfen) und hängt `page` an.
 * Genutzt in Bestell-Liste und Audit-Log (vorher 2× dupliziert).
 */
export function Pagination({
  page,
  totalPages,
  total,
  unit = "Einträge",
  params,
}: {
  page: number;
  totalPages: number;
  total: number;
  unit?: string;
  params: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;

  const hrefFor = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v != null && v !== "" && k !== "page") sp.set(k, String(v));
    }
    sp.set("page", String(p));
    return `?${sp.toString()}`;
  };

  return (
    <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.15em] mt-6 text-ink-muted">
      <span>
        Seite {page} von {totalPages} · {total} {unit}
      </span>
      <div className="flex gap-4">
        {page > 1 && (
          <Link href={hrefFor(page - 1)} className="pb-0.5 text-sienna border-b border-sienna">
            ← Zurück
          </Link>
        )}
        {page < totalPages && (
          <Link href={hrefFor(page + 1)} className="pb-0.5 text-sienna border-b border-sienna">
            Vor →
          </Link>
        )}
      </div>
    </div>
  );
}
