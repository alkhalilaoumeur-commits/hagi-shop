import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/services/admin-auth";
import { exportOrdersCSV } from "@/lib/services/csv-export";
import { logAudit } from "@/lib/services/audit";
import { extractIp } from "@/lib/services/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  onlyPaid: z.enum(["true", "false"]).default("true"),
});

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();

  const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_query" }, { status: 400 });
  }
  const { from, to, onlyPaid } = parsed.data;

  const fromDate = new Date(`${from}T00:00:00.000Z`);
  const toDate = new Date(`${to}T23:59:59.999Z`);

  if (fromDate > toDate) {
    return NextResponse.json({ error: "from_after_to" }, { status: 400 });
  }
  const maxRangeDays = 366;
  const diffDays = (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays > maxRangeDays) {
    return NextResponse.json({ error: "range_too_large" }, { status: 400 });
  }

  const csv = await exportOrdersCSV({
    from: fromDate,
    to: toDate,
    onlyPaid: onlyPaid === "true",
  });

  const ip = extractIp(req.headers);
  await logAudit({
    actorType: "admin",
    actorId: admin.id,
    action: "admin.csv_export",
    entityType: "Order",
    entityId: "batch",
    after: { from, to, onlyPaid, bytes: csv.length },
    ipAddress: ip,
  });

  const filename = `hagi-export_${from}_bis_${to}.csv`;
  // UTF-8 BOM für Excel-Kompatibilität
  const body = "﻿" + csv;
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
