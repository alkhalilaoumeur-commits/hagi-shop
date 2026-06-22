import { requireAdmin } from "@/lib/services/admin-auth";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { Card } from "@/components/admin/ui/Card";
import { Field, fieldClass, SectionLabel } from "@/components/admin/ui/Field";

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
      <PageHeader
        eyebrow="Steuerberater-Export"
        title="CSV-Export"
        description="DATEV-orientierter Export aller bezahlten Bestellungen im Zeitraum. UTF-8 mit BOM (Excel-kompatibel), Semikolon-getrennt."
      />

      <form method="get" action="/api/admin/export-orders" className="p-6 space-y-4 bg-bg-elevated border border-border">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Von">
            <input required type="date" name="from" defaultValue={fmt(firstOfMonth)} className={fieldClass} />
          </Field>
          <Field label="Bis">
            <input required type="date" name="to" defaultValue={fmt(today)} className={fieldClass} />
          </Field>
        </div>

        <label className="flex items-center gap-2 text-sm cursor-pointer text-ink">
          <input type="checkbox" name="onlyPaid" value="true" defaultChecked className="w-4 h-4" style={{ accentColor: "#0F0A06" }} />
          Nur bezahlte Bestellungen (empfohlen für Buchhaltung)
        </label>

        <button type="submit" className="px-6 py-3 text-[11px] font-bold uppercase tracking-[0.18em] bg-ink text-bone hover:bg-sienna transition-colors">
          CSV herunterladen
        </button>
      </form>

      <section className="space-y-2 text-sm text-ink-muted">
        <SectionLabel>Schnellauswahl</SectionLabel>
        <ul className="space-y-1.5">
          <li>
            <a href={`/api/admin/export-orders?from=${fmt(firstOfMonth)}&to=${fmt(today)}&onlyPaid=true`} className="underline text-sienna">
              Aktueller Monat (bis heute)
            </a>
          </li>
          <li>
            <a href={`/api/admin/export-orders?from=${fmt(lastMonth)}&to=${fmt(lastMonthEnd)}&onlyPaid=true`} className="underline text-sienna">
              Vor-Monat ({lastMonth.toLocaleDateString("de-DE", { month: "long", year: "numeric" })})
            </a>
          </li>
          <li>
            <a href={`/api/admin/export-orders?from=${fmt(new Date(today.getFullYear(), 0, 1))}&to=${fmt(today)}&onlyPaid=true`} className="underline text-sienna">
              Aktuelles Jahr
            </a>
          </li>
        </ul>
      </section>

      <Card className="p-5">
        <SectionLabel className="mb-2">Spalten</SectionLabel>
        <p className="text-xs text-ink-muted">
          Belegdatum · Belegnummer · Kunde · Firma · Stadt · Land · USt-IdNr · B2B · Reverse-Charge ·
          Netto · Versand · Rabatt · USt-Satz · USt-Betrag · Brutto · Refund · Zahlungsart · Status
        </p>
      </Card>
    </div>
  );
}
