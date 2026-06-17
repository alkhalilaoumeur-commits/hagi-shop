import { NextResponse } from "next/server";
import { generateWithdrawalFormPDF } from "@/lib/pdf/generate";

export const runtime = "nodejs";
export const revalidate = 86400; // 1 Tag — Inhalt ist statisch

/**
 * Liefert das Muster-Widerrufsformular nach EGBGB Anlage 2 als PDF.
 * Öffentlicher GET-Endpoint — kein Auth, kein Rate-Limit nötig (CDN-cacheable).
 *
 * Aufruf:
 *   GET /widerrufsformular        → Inline-Display im Browser
 *   GET /widerrufsformular?dl=1   → erzwingt Download
 */
export async function GET(req: Request) {
  const dl = new URL(req.url).searchParams.get("dl");
  const pdfBuffer = await generateWithdrawalFormPDF();

  return new NextResponse(pdfBuffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": dl
        ? 'attachment; filename="hagi-widerrufsformular.pdf"'
        : 'inline; filename="hagi-widerrufsformular.pdf"',
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
