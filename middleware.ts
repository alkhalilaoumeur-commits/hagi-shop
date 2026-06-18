import { NextResponse, type NextRequest } from "next/server";

const ADMIN_SESSION_COOKIE = "hagi-admin-session";
const CUSTOMER_SESSION_COOKIE = "hagi-customer-session";

// Öffentliche Konto-Unterseiten (kein Login nötig). Prefix-Match.
const PUBLIC_KONTO_PATHS = [
  "/konto/login",
  "/konto/registrieren",
  "/konto/passwort-vergessen",
  "/konto/passwort-neu",
  "/konto/verifizieren",
];

/**
 * Defense-in-Depth: Middleware checkt ob ein Admin-Session-Cookie existiert,
 * BEVOR die Route überhaupt rendert. Die Page selbst macht zusätzlich die echte
 * Session-Validierung via `requireAdmin()`. Wenn jemand vergisst die Page-Level-
 * Auth zu setzen, fängt diese Schicht es ab.
 *
 * Wir validieren das Cookie hier NICHT gegen die DB (nicht im Edge-Runtime möglich).
 * Wir prüfen nur: "Gibt es überhaupt ein Cookie?" Bei keinem Cookie → Redirect.
 */

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Login-Page ist public
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  // Alles unter /admin und /api/admin braucht ein Session-Cookie
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    const cookie = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    if (!cookie) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      }
      const url = new URL("/admin/login", req.url);
      return NextResponse.redirect(url);
    }
  }

  // Konto-Bereich: Defense-in-Depth. Öffentliche Auth-Unterseiten ausnehmen.
  // Die echte Session-Validierung macht die Page via requireCustomer().
  if (pathname.startsWith("/konto")) {
    const isPublic = PUBLIC_KONTO_PATHS.some(
      (p) => pathname === p || pathname.startsWith(p + "/"),
    );
    if (!isPublic) {
      const cookie = req.cookies.get(CUSTOMER_SESSION_COOKIE)?.value;
      if (!cookie) {
        const url = new URL("/konto/login", req.url);
        return NextResponse.redirect(url);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/konto/:path*"],
};
