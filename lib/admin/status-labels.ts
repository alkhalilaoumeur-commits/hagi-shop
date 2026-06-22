/**
 * Zentrale Quelle für Status-Labels + visuelle "Töne" im Admin-Bereich.
 *
 * Vorher waren diese Maps in dashboard, bestellungen-liste, bestellungen-detail
 * und audit jeweils eigenständig (und teils widersprüchlich) definiert. Ab jetzt
 * gilt: ein Status → ein Label → ein Ton. Geändert wird nur noch hier.
 *
 * `tone` ist KEINE Farbe, sondern eine semantische Kategorie. Die <StatusBadge>-
 * Komponente übersetzt den Ton in konkrete Tailwind-Klassen. So bleibt die
 * Farbgebung an einer einzigen Stelle (der Komponente) steuerbar.
 */

export type Tone = "neutral" | "warning" | "success" | "danger" | "info" | "dark";

export type StatusMeta = { label: string; tone: Tone };

export const ORDER_STATUS: Record<string, StatusMeta> = {
  PENDING: { label: "Eingegangen", tone: "warning" },
  CONFIRMED: { label: "Bezahlt", tone: "success" },
  COMPLETED: { label: "Abgeschlossen", tone: "dark" },
  CANCELLED: { label: "Storniert", tone: "danger" },
};

export const PAYMENT_STATUS: Record<string, StatusMeta> = {
  PENDING: { label: "Ausstehend", tone: "warning" },
  AUTHORIZED: { label: "Autorisiert", tone: "info" },
  PAID: { label: "Bezahlt", tone: "success" },
  PARTIALLY_REFUNDED: { label: "Teil-Erstattet", tone: "warning" },
  REFUNDED: { label: "Erstattet", tone: "neutral" },
  FAILED: { label: "Fehlgeschlagen", tone: "danger" },
  EXPIRED: { label: "Abgelaufen", tone: "danger" },
};

export const FULFILLMENT_STATUS: Record<string, StatusMeta> = {
  UNFULFILLED: { label: "Offen", tone: "warning" },
  PARTIALLY_FULFILLED: { label: "Teil-Versandt", tone: "warning" },
  FULFILLED: { label: "Versandt", tone: "success" },
  RETURNED: { label: "Retoure", tone: "danger" },
};

export const DELIVERY_TYPE: Record<string, string> = {
  SHIPPING: "Versand",
  PICKUP: "Abholung",
  LOCAL_DELIVERY: "Lieferung",
};

/** Fallback-Helfer: liefert nie undefined, sondern den rohen Wert als Label. */
export function metaOf(map: Record<string, StatusMeta>, key: string): StatusMeta {
  return map[key] ?? { label: key, tone: "neutral" };
}

export function deliveryLabel(key: string): string {
  return DELIVERY_TYPE[key] ?? key;
}
