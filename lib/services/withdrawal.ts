/**
 * Widerrufsrecht im Fernabsatz (BGB § 312g, § 355, § 356, § 357).
 *
 * Wichtigste Regeln (für B2C-Online-Shops PFLICHT):
 *  - 14 Tage Frist ab Erhalt der Ware (deliveredAt).
 *  - Bei fehlender/fehlerhafter Belehrung verlängert sich die Frist auf
 *    12 Monate + 14 Tage (§ 356 Abs. 3 Satz 2).
 *  - Frist endet nicht vorher, auch bei Bezahlung vor Lieferung.
 *  - Verkäufer erstattet: alle Zahlungen INKL. günstigste Standardlieferung
 *    (Hin-Versand, § 357 Abs. 2 Satz 2). Rück-Versand zahlt Käufer.
 *  - Rückerstattung binnen 14 Tagen nach Widerrufseingang (§ 357 Abs. 1).
 *  - Verkäufer darf Rückerstattung verweigern bis Ware zurück ODER Nachweis
 *    der Rücksendung erbracht.
 *
 * Widerruf möglich in diesen Phasen:
 *  1. Bezahlt, nicht versandt        → Voll-Refund + Lager-Release
 *  2. Bezahlt, versandt, nicht erhalten → Käufer kann verweigern, Frist startet noch nicht
 *  3. Bezahlt, geliefert, ≤14 Tage    → Standard-Fall
 *  4. Bezahlt, geliefert, ≤12M+14d UND keine Belehrung → erweiterte Frist
 *
 * NICHT widerrufbar:
 *  - PENDING (unbezahlt) → einfach Cart abbrechen
 *  - bereits CANCELLED   → schon storniert
 *  - bereits WITHDRAWN   → schon widerrufen (Idempotenz)
 *  - außerhalb Frist + Belehrung war korrekt
 */

export const WITHDRAWAL_PERIOD_DAYS = 14;
export const WITHDRAWAL_EXTENDED_PERIOD_DAYS = 365 + 14; // 12 Monate + 14 Tage

export type WithdrawalRejectReason =
  | "ORDER_NOT_FOUND"
  | "ORDER_NOT_PAID"
  | "ORDER_ALREADY_CANCELLED"
  | "ORDER_ALREADY_WITHDRAWN"
  | "WITHDRAWAL_PERIOD_EXPIRED";

export interface OrderForWithdrawal {
  orderStatus: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
  paymentStatus: "PENDING" | "AUTHORIZED" | "PAID" | "PARTIALLY_REFUNDED" | "REFUNDED" | "FAILED" | "EXPIRED";
  fulfillmentStatus: "UNFULFILLED" | "PARTIALLY_FULFILLED" | "FULFILLED" | "RETURNED";
  paidAt: Date | null;
  deliveredAt: Date | null;
  cancelledAt?: Date | null;
  withdrawalNoticeGiven?: boolean;
  withdrawalRequestedAt?: Date | null;
  /** Veraltet — bleibt nur für Backwards-Compat-Tests; neue Logik nutzt withdrawalRequestedAt. */
  internalNote?: string | null;
}

/**
 * Berechnet das Frist-Ende (inklusiv) ab dem die Order NICHT mehr widerrufbar ist.
 *
 * - Solange nicht geliefert (deliveredAt=null) startet die Frist nicht → null
 * - Mit Belehrung: deliveredAt + 14 Tage
 * - Ohne/fehlerhafter Belehrung: deliveredAt + 12 Monate + 14 Tage
 */
export function calcWithdrawalDeadline(
  deliveredAt: Date | null,
  noticeGiven: boolean = true,
): Date | null {
  if (!deliveredAt) return null;
  const days = noticeGiven ? WITHDRAWAL_PERIOD_DAYS : WITHDRAWAL_EXTENDED_PERIOD_DAYS;
  return new Date(deliveredAt.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * Live-Countdown für die Widerrufsfrist (Kunden-Status-Seite).
 *
 * Liefert das Frist-Ende + verbleibende ganze Tage (aufgerundet, damit der
 * letzte Tag als "1 Tag" zählt). Negativ = Frist abgelaufen. Null, solange noch
 * nicht zugestellt wurde (Frist startet erst mit Zustellung, § 356 Abs. 2 BGB).
 */
export function withdrawalDaysRemaining(
  deliveredAt: Date | null,
  noticeGiven: boolean,
  now: Date = new Date(),
): { deadline: Date; daysRemaining: number } | null {
  const deadline = calcWithdrawalDeadline(deliveredAt, noticeGiven);
  if (!deadline) return null;
  const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
  return { deadline, daysRemaining };
}

/**
 * Prüft ob eine Order zum Zeitpunkt `now` widerrufen werden kann.
 * Liefert detaillierten Reject-Grund oder { eligible: true }.
 */
export function isWithdrawalEligible(
  order: OrderForWithdrawal,
  now: Date = new Date(),
): { eligible: true } | { eligible: false; reason: WithdrawalRejectReason } {
  if (order.orderStatus === "CANCELLED") {
    return { eligible: false, reason: "ORDER_ALREADY_CANCELLED" };
  }
  if (order.withdrawalRequestedAt || order.internalNote?.includes("Widerruf eingegangen")) {
    return { eligible: false, reason: "ORDER_ALREADY_WITHDRAWN" };
  }
  if (order.paymentStatus !== "PAID" && order.paymentStatus !== "PARTIALLY_REFUNDED") {
    return { eligible: false, reason: "ORDER_NOT_PAID" };
  }

  // Vor Lieferung: jederzeit widerrufbar (Frist startet noch nicht).
  if (!order.deliveredAt) return { eligible: true };

  const deadline = calcWithdrawalDeadline(order.deliveredAt, order.withdrawalNoticeGiven ?? true);
  if (!deadline) return { eligible: true };

  if (now > deadline) {
    return { eligible: false, reason: "WITHDRAWAL_PERIOD_EXPIRED" };
  }
  return { eligible: true };
}

export interface RefundCalcInput {
  subtotalCents: number;
  shippingCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
}

export interface RefundCalcResult {
  /** Wieviel der Kunde zurück bekommt (in Cent). */
  totalCents: number;
  /** Wird der Hin-Versand miterstattet? Bei Voll-Widerruf ja, bei Teil-Widerruf nein. */
  includesShipping: boolean;
  /** Aufschlüsselung für Belegerstellung. */
  breakdown: {
    items: number;
    shipping: number;
    discount: number;
    tax: number;
  };
}

/**
 * Berechnet die Rückerstattung nach BGB § 357 Abs. 2.
 *
 * - Voll-Widerruf: Gesamtbetrag inkl. Hin-Versand zurück
 * - Teil-Widerruf (partialItemsCents gesetzt): nur die zurückgegebenen Artikel,
 *   Hin-Versand bleibt beim Verkäufer (Käufer behält ja Restbestellung)
 */
export function calcWithdrawalRefund(
  order: RefundCalcInput,
  opts: { partialItemsCents?: number } = {},
): RefundCalcResult {
  if (opts.partialItemsCents !== undefined) {
    return {
      totalCents: opts.partialItemsCents,
      includesShipping: false,
      breakdown: {
        items: opts.partialItemsCents,
        shipping: 0,
        discount: 0,
        tax: 0,
      },
    };
  }
  return {
    totalCents: order.totalCents,
    includesShipping: order.shippingCents > 0,
    breakdown: {
      items: order.subtotalCents,
      shipping: order.shippingCents,
      discount: -order.discountCents,
      tax: order.taxCents,
    },
  };
}
