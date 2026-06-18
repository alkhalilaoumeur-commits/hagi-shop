import { NextResponse, type NextRequest } from "next/server";
import { findOverdueWithdrawalRefunds, groupByStage, type ReminderStage } from "@/lib/services/refund-reminders";
import { sendRefundReminderToAdmin } from "@/lib/email/send";
import { logAudit } from "@/lib/services/audit";
import { logError } from "@/lib/services/error-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cron-Endpoint für täglichen Refund-Reminder.
 * Empfohlene Cron-Konfiguration (Coolify):
 *   curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://hagi-shop.de/api/cron/refund-reminder
 *   1x täglich, idealerweise morgens 08:00 Uhr.
 *
 * Sendet pro Eskalations-Stage eine Sammel-Mail an ADMIN_NOTIFY_EMAIL (Fallback COMPANY_EMAIL).
 *
 * Idempotenz: 2x am Tag aufgerufen → 2x Mail. Bewusst, damit man bei Coolify-Ausfall
 * eine zweite Chance hat. Admin sieht Datum/Zeit im Mail-Header.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "cron_disabled" }, { status: 503 });
  if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const adminEmail =
    process.env.ADMIN_NOTIFY_EMAIL ?? process.env.COMPANY_EMAIL ?? "info@hagi-shop.de";

  const startedAt = Date.now();
  const refunds = await findOverdueWithdrawalRefunds();
  const groups = groupByStage(refunds);

  const sent: Array<{ stage: ReminderStage; count: number }> = [];
  for (const stage of ["OVERDUE", "URGENT", "REMINDER"] as ReminderStage[]) {
    if (groups[stage].length === 0) continue;
    try {
      await sendRefundReminderToAdmin({ to: adminEmail, stage, refunds: groups[stage] });
      sent.push({ stage, count: groups[stage].length });
    } catch (err) {
      await logError({ source: "api/cron/refund-reminder", error: err, context: { stage } });
    }
  }

  if (refunds.length > 0) {
    await logAudit({
      actorType: "system",
      action: "cron.refund_reminder_sent",
      entityType: "System",
      entityId: "refund-reminder",
      after: {
        totalPending: refunds.length,
        sent,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    duration_ms: Date.now() - startedAt,
    pending: refunds.length,
    sent,
  });
}
