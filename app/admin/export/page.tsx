import { requireAdmin } from "@/lib/services/admin-auth";

export const dynamic = "force-dynamic";

export default async function CSVExportPage() {
  await requireAdmin();

  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  return (
    <div className="space-y-8 max-w-2xl">
      <header>
        <p className="text-[10px] uppercase tracking-[0.25em] mb-3" style={{ color: "#B89968" }}>
          ✦ Steuerberater-Export
        </p>
        <h1 className="font-serif" style={{ fontSize: "clamp(2rem, 4vw, 3rem)", color: "#0F0A06" }}>
          CSV-Export
        </h1>
        <p className="text-base mt-3" style={{ color: "#5A4A3A" }}>
          DATEV-orientierter Export aller bezahlten Bestellungen im Zeitraum. UTF-8 mit BOM
          (Excel-kompatibel), Semikolon-getrennt.
        </p>
      </header>

      <form
        method="get"
        action="/api/admin/export-orders"
        className="p-6 space-y-4"
        style={{ background: "#F0EAD8", border: "1px solid #E5DCC8" }}
      >
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.18em] block mb-1.5" style={{ color: "#5A4A3A" }}>
              Von
            </span>
            <input
              required
              type="date"
              name="from"
              defaultValue={fmt(firstOfMonth)}
              className="w-full px-3 py-2.5 text-sm bg-transparent"
              style={{ border: "1px solid #D9CDB8", color: "#0F0A06" }}
            />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.18em] block mb-1.5" style={{ color: "#5A4A3A" }}>
              Bis
            </span>
            <input
              required
              type="date"
              name="to"
              defaultValue={fmt(today)}
              className="w-full px-3 py-2.5 text-sm bg-transparent"
              style={{ border: "1px solid #D9CDB8", color: "#0F0A06" }}
            />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "#0F0A06" }}>
          <input type="checkbox" name="onlyPaid" value="true" defaultChecked className="w-4 h-4" style={{ accentColor: "#0F0A06" }} />
          Nur bezahlte Bestellungen (empfohlen für Buchhaltung)
        </label>

        <button
          type="submit"
          className="px-6 py-3 text-[11px] font-bold uppercase tracking-[0.18em]"
          style={{ background: "#0F0A06", color: "#FAFAF7" }}
        >
          CSV herunterladen
        </button>
      </form>

      <section className="space-y-2 text-sm" style={{ color: "#5A4A3A" }}>
        <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: "#B89968" }}>
          ✦ Schnellauswahl
        </p>
        <ul className="space-y-1.5">
          <li>
            <a
              href={`/api/admin/export-orders?from=${fmt(firstOfMonth)}&to=${fmt(today)}&onlyPaid=true`}
              className="underline"
              style={{ color: "#A33B2A" }}
            >
              Aktueller Monat (bis heute)
            </a>
          </li>
          <li>
            <a
              href={`/api/admin/export-orders?from=${fmt(lastMonth)}&to=${fmt(lastMonthEnd)}&onlyPaid=true`}
              className="underline"
              style={{ color: "#A33B2A" }}
            >
              Vor-Monat ({lastMonth.toLocaleDateString("de-DE", { month: "long", year: "numeric" })})
            </a>
          </li>
          <li>
            <a
              href={`/api/admin/export-orders?from=${fmt(new Date(today.getFullYear(), 0, 1))}&to=${fmt(today)}&onlyPaid=true`}
              className="underline"
              style={{ color: "#A33B2A" }}
            >
              Aktuelles Jahr
            </a>
          </li>
        </ul>
      </section>

      <section className="p-5" style={{ background: "#FFFFFF", border: "1px solid #E5DCC8" }}>
        <p className="text-[10px] uppercase tracking-[0.18em] mb-2" style={{ color: "#B89968" }}>
          ✦ Spalten
        </p>
        <p className="text-xs" style={{ color: "#5A4A3A" }}>
          Belegdatum · Belegnummer · Kunde · Firma · Stadt · Land · USt-IdNr · B2B · Reverse-Charge ·
          Netto · Versand · Rabatt · USt-Satz · USt-Betrag · Brutto · Refund · Zahlungsart · Status
        </p>
      </section>
    </div>
  );
}
