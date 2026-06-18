import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { generateInvoicePDF, generateDeliveryNotePDF } from "@/lib/pdf/generate";
import { rateLimit, extractIp } from "@/lib/services/rate-limit";
import { logError } from "@/lib/services/error-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ token: string }>;
}

export async function GET(req: NextRequest, { params }: Params) {
  const { token } = await params;
  if (!token || token.length < 16 || token.length > 64 || !/^[A-Za-z0-9_-]+$/.test(token)) {
    return NextResponse.json({ error: "invalid_token" }, { status: 400 });
  }

  const ip = extractIp(req.headers);
  const rl = await rateLimit({ key: `ip:${ip}:invoice`, limit: 30, windowSeconds: 60 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  const order = await prisma.order.findUnique({
    where: { publicToken: token },
    include: { items: true },
  });
  if (!order) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (order.paymentStatus !== "PAID" && order.paymentStatus !== "PARTIALLY_REFUNDED" && order.paymentStatus !== "REFUNDED") {
    return NextResponse.json({ error: "not_billable" }, { status: 403 });
  }

  const variant = req.nextUrl.searchParams.get("variant");
  const isDeliveryNote = variant === "lieferschein";

  try {
    const buffer = isDeliveryNote
      ? await generateDeliveryNotePDF(order)
      : await generateInvoicePDF(order);

    const filename = `${isDeliveryNote ? "Lieferschein" : "Rechnung"}_${order.orderNumber}.pdf`;
    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  } catch (err) {
    await logError({ source: "api/invoice", error: err });
    return NextResponse.json({ error: "generate_failed" }, { status: 500 });
  }
}
