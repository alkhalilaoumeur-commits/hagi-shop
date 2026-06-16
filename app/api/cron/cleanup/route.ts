import { NextResponse, type NextRequest } from "next/server";
import { cleanupRateLimitLogs } from "@/lib/services/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cron-Endpoint für regelmäßige Cleanups.
 * Aufruf: GET /api/cron/cleanup mit Header `Authorization: Bearer ${CRON_SECRET}`
 *
 * Coolify-Cron-Setup:
 *   curl -fsS -H "Authorization: Bearer ${CRON_SECRET}" https://hagi-shop.de/api/cron/cleanup
 *   alle 15 Minuten.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "cron_disabled" }, { status: 503 });
  }
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  const removedRateLogs = await cleanupRateLimitLogs();
  const duration = Date.now() - startedAt;

  return NextResponse.json({
    ok: true,
    duration_ms: duration,
    removed: { rate_logs: removedRateLogs },
  });
}
