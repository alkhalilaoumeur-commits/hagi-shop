import { generateSecret, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";

/**
 * TOTP (RFC 6238) für die Admin-2FA. Dünner Wrapper um die funktionale
 * otplib-v13-API, damit die Konfiguration (Drift-Toleranz, Issuer) an EINER
 * Stelle liegt.
 *
 * tolerance: 30s → akzeptiert auch den vorherigen/nächsten 30-Sekunden-Code,
 * falls die Uhr der Authenticator-App leicht abweicht. Mehr nicht, sonst sinkt
 * die Sicherheit.
 */
const ISSUER = "Hagi Admin";
const TOLERANCE_SECONDS = 30;

export function generateTotpSecret(): string {
  return generateSecret(); // base32
}

/** otpauth://-URI für QR-Code / manuelles Eintragen in die Authenticator-App. */
export function totpKeyUri(secret: string, account: string): string {
  return generateURI({ strategy: "totp", secret, label: account, issuer: ISSUER });
}

export function verifyTotp(token: string, secret: string): boolean {
  const t = (token ?? "").trim();
  if (!/^\d{6}$/.test(t)) return false;
  try {
    return Boolean(verifySync({ token: t, secret, epochTolerance: TOLERANCE_SECONDS })?.valid);
  } catch {
    return false;
  }
}

/** QR-Code als Data-URL (PNG) zum Anzeigen im Einrichtungs-Dialog. */
export async function totpQrDataUrl(secret: string, account: string): Promise<string> {
  return QRCode.toDataURL(totpKeyUri(secret, account));
}
