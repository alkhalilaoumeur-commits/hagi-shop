import { NextResponse } from "next/server";

/**
 * Veraltet seit Stage 2.4 — Checkout läuft jetzt über Server Action
 * `app/actions/checkout.ts`. Route bleibt nur als 410 Gone falls noch
 * Alt-Clients existieren.
 */
export async function POST() {
  return NextResponse.json(
    { error: "endpoint_deprecated", use: "server-action /checkout" },
    { status: 410 },
  );
}
