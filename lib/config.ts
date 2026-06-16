/**
 * Zentraler Reader für kritische Env-Variablen mit Fail-Fast in Production.
 *
 * Pattern:
 *  - Dev: Default-Fallback erlaubt + console.warn
 *  - Prod: Throw beim Modul-Import, sodass die App gar nicht hochfährt
 *
 * So vermeiden wir stille Fehlkonfiguration (Stripe-Redirect auf localhost,
 * leere USt-ID auf Rechnungen, etc).
 */

const isProd = process.env.NODE_ENV === "production";

function requireInProd(name: string, value: string | undefined, devFallback?: string): string {
  if (value && value.trim().length > 0) return value;
  if (isProd) {
    throw new Error(
      `${name} muss in Production gesetzt sein. Refusing to start with silent fallback.`,
    );
  }
  if (devFallback !== undefined) {
    console.warn(`[config] ${name} nicht gesetzt — Dev-Fallback "${devFallback}" wird genutzt.`);
    return devFallback;
  }
  throw new Error(`${name} fehlt (auch in Dev kein Fallback definiert).`);
}

export const APP_URL = requireInProd(
  "NEXT_PUBLIC_APP_URL",
  process.env.NEXT_PUBLIC_APP_URL,
  "http://localhost:3002",
);

export const DATABASE_URL = (() => {
  const v = process.env.DATABASE_URL;
  if (!v || v.trim().length === 0) {
    throw new Error("DATABASE_URL fehlt. Ohne Datenbank-URL kann die App nicht starten.");
  }
  return v;
})();
