import { NextResponse } from "next/server";

/**
 * Veraltet seit Stage 4 — Login läuft jetzt über Server Action
 * `app/actions/admin-auth.ts:loginAdminAction`.
 */
export async function POST() {
  return NextResponse.json(
    { error: "endpoint_deprecated", use: "server-action /admin/login" },
    { status: 410 },
  );
}
