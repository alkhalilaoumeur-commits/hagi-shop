/**
 * Reminder-Service für die 14-Tage-Refund-Frist nach BGB § 357 Abs. 1.
 *
 * Frist startet ab withdrawalRequestedAt (Eingang der Widerrufserklärung).
 * NICHT ab returnReceivedAt — der Verkäufer DARF zwar nach § 357 Abs. 4
 * zurückhalten bis Ware da, aber die 14-Tage-Frist läuft TROTZDEM ab Antrag.
 *
 * 3 Eskalationsstufen:
 *  - REMINDER (Tag 9): 5 Tage übrig, freundlich
 *  - URGENT   (Tag 12): 2 Tage übrig, dringend
 *  - OVERDUE  (Tag 14+): Frist gerissen, Verzugszinsen-Risiko nach § 288 BGB
 */

import prisma from "@/lib/prisma";

export const REFUND_DEADLINE_DAYS = 14;
export const REMINDER_DAY = 9; // ≥ 9 Tage nach Widerruf, < 12 Tage
export const URGENT_DAY = 12; // ≥ 12 Tage nach Widerruf, < 14 Tage
export const OVERDUE_DAY = 14; // ≥ 14 Tage nach Widerruf

export type ReminderStage = "REMINDER" | "URGENT" | "OVERDUE";

export interface PendingRefund {
  orderId: string;
  orderNumber: string;
  customerEmail: string;
  withdrawalRequestedAt: Date;
  returnReceivedAt: Date | null;
  totalCents: number;
  refundedCents: number;
  daysSinceWithdrawal: number;
  daysRemaining: number;
  deadline: Date;
  stage: ReminderStage;
}

function classify(daysSince: number): ReminderStage | null {
  if (daysSince >= OVERDUE_DAY) return "OVERDUE";
  if (daysSince >= URGENT_DAY) return "URGENT";
  if (daysSince >= REMINDER_DAY) return "REMINDER";
  return null;
}

/**
 * Findet alle Orders mit aktivem Widerruf-Antrag, bei denen die 14-Tage-Refund-Frist
 * naht oder bereits gerissen ist. Vollständig refundierte Orders werden ausgeschlossen.
 */
export async function findOverdueWithdrawalRefunds(now: Date = new Date()): Promise<PendingRefund[]> {
  const cutoff = new Date(now.getTime() - REMINDER_DAY * 86400 * 1000);

  const orders = await prisma.order.findMany({
    where: {
      withdrawalRequestedAt: { not: null, lte: cutoff },
      paymentStatus: { notIn: ["REFUNDED"] },
    },
    select: {
      id: true,
      orderNumber: true,
      customerEmail: true,
      withdrawalRequestedAt: true,
      returnReceivedAt: true,
      totalCents: true,
      refundedCents: true,
    },
  });

  const result: PendingRefund[] = [];
  for (const o of orders) {
    if (!o.withdrawalRequestedAt) continue;
    if (o.refundedCents >= o.totalCents) continue; // schon voll refundiert

    const daysSince = Math.floor((now.getTime() - o.withdrawalRequestedAt.getTime()) / 86400000);
    const stage = classify(daysSince);
    if (!stage) continue;

    const deadline = new Date(o.withdrawalRequestedAt.getTime() + REFUND_DEADLINE_DAYS * 86400000);
    const daysRemaining = Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / 86400000));

    result.push({
      orderId: o.id,
      orderNumber: o.orderNumber,
      customerEmail: o.customerEmail,
      withdrawalRequestedAt: o.withdrawalRequestedAt,
      returnReceivedAt: o.returnReceivedAt,
      totalCents: o.totalCents,
      refundedCents: o.refundedCents,
      daysSinceWithdrawal: daysSince,
      daysRemaining,
      deadline,
      stage,
    });
  }

  result.sort((a, b) => b.daysSinceWithdrawal - a.daysSinceWithdrawal);
  return result;
}

/**
 * Gruppiert Pending-Refunds nach Stage für eine zusammengefasste Admin-Mail.
 */
export function groupByStage(refunds: PendingRefund[]): Record<ReminderStage, PendingRefund[]> {
  const groups: Record<ReminderStage, PendingRefund[]> = {
    REMINDER: [],
    URGENT: [],
    OVERDUE: [],
  };
  for (const r of refunds) groups[r.stage].push(r);
  return groups;
}
