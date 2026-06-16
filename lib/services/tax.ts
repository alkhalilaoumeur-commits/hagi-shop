/**
 * Tax-Service. Konfigurierbar zwischen Kleinunternehmer § 19 UStG (0%)
 * und Regelbesteuerung (19% DE Standard).
 *
 * ENV: TAX_MODE = "small_business" | "standard"
 * In Production wird das vom Hagi-Setup entschieden.
 */

export type TaxMode = "small_business" | "standard";

function resolveTaxMode(): TaxMode {
  const raw = process.env.TAX_MODE;
  if (raw === "small_business" || raw === "standard") return raw;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "TAX_MODE env var must be set to 'small_business' or 'standard' in production. " +
        "Refusing to start with undefined tax behavior.",
    );
  }
  console.warn("[tax] TAX_MODE not set — defaulting to 'small_business' (dev only)");
  return "small_business";
}

export const TAX_MODE: TaxMode = resolveTaxMode();

export const STANDARD_VAT_RATE = 19;
export const REDUCED_VAT_RATE = 7;

export interface TaxLine {
  ratePercent: number;
  baseCents: number;
  taxCents: number;
}

/**
 * Berechnet die enthaltene Steuer bei brutto-Preis (PAngV-konform DE).
 * Bei small_business: 0 EUR Steuer, ratePercent 0.
 * Bei standard: 19% (oder reduced 7%) aus dem Brutto.
 *
 * Mathe: taxCents = round(grossCents * rate / (100 + rate))
 */
export function taxFromGross(grossCents: number, ratePercent: number): TaxLine {
  if (ratePercent <= 0) {
    return { ratePercent: 0, baseCents: grossCents, taxCents: 0 };
  }
  const taxCents = Math.round((grossCents * ratePercent) / (100 + ratePercent));
  return {
    ratePercent,
    baseCents: grossCents - taxCents,
    taxCents,
  };
}

/**
 * Liefert die anwendbare Steuerquote für einen Item-Type.
 * Aktuell pauschal STANDARD für alle Teppiche.
 * Spätere Erweiterung: per Category (Kunstwerk = 7% reduced möglich).
 */
export function applicableTaxRate(_category?: string | null): number {
  if (TAX_MODE === "small_business") return 0;
  return STANDARD_VAT_RATE;
}

/**
 * Reverse-Charge-Logik für B2B-EU-Verkauf.
 * - Sender: DE-Unternehmer (Hagi mit USt-ID)
 * - Empfänger: B2B-Kunde aus anderem EU-Land mit gültiger USt-ID
 * → 0% Steuer, "Reverse Charge" Vermerk auf Rechnung.
 */
export function shouldApplyReverseCharge(params: {
  isB2B: boolean;
  customerCountryCode: string;
  customerVatId: string | null;
}): boolean {
  if (TAX_MODE === "small_business") return false;
  if (!params.isB2B || !params.customerVatId) return false;
  if (params.customerCountryCode === "DE") return false;
  const euCountries = [
    "AT", "BE", "BG", "CY", "CZ", "DK", "EE", "ES", "FI", "FR", "GR",
    "HR", "HU", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PL", "PT",
    "RO", "SE", "SI", "SK",
  ];
  return euCountries.includes(params.customerCountryCode);
}
