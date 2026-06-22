"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { loginAdminAction } from "@/app/actions/admin-auth";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpToken, setTotpToken] = useState("");
  const [needsTotp, setNeedsTotp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      setError(null);
      setRetryAfter(null);
      const result = await loginAdminAction({
        email,
        password,
        totpToken: needsTotp ? totpToken : undefined,
      });
      if (result.ok) {
        router.push(result.redirectTo);
        router.refresh();
      } else if (result.error === "TOTP_REQUIRED") {
        // Passwort stimmte → jetzt den zweiten Faktor abfragen (kein Fehler).
        setNeedsTotp(true);
      } else {
        setError(translateError(result.error));
        if (result.retryAfter) setRetryAfter(result.retryAfter);
      }
    });
  };

  return (
    <main style={{ background: "#FAFAF7", minHeight: "100vh" }} className="flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <p
            className="text-[10px] uppercase tracking-[0.25em] mb-3"
            style={{ color: "#B89968" }}
          >
            ✦ Intern
          </p>
          <p className="font-serif text-3xl font-semibold tracking-[0.18em]" style={{ color: "#0F0A06" }}>
            HAGI<span style={{ color: "#A33B2A" }}>.</span>
          </p>
          <p className="text-[11px] uppercase tracking-[0.18em] mt-2" style={{ color: "#5A4A3A" }}>
            Admin-Bereich
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-8 space-y-5"
          style={{ background: "#FFFFFF", border: "1px solid #E5DCC8" }}
        >
          <div>
            <label
              className="text-[10px] uppercase tracking-[0.18em] block mb-2"
              style={{ color: "#5A4A3A" }}
            >
              E-Mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-transparent focus:outline-none"
              style={{ border: "1px solid #D9CDB8", color: "#0F0A06" }}
              required
              autoFocus
              autoComplete="email"
            />
          </div>

          <div>
            <label
              className="text-[10px] uppercase tracking-[0.18em] block mb-2"
              style={{ color: "#5A4A3A" }}
            >
              Passwort
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-transparent focus:outline-none"
              style={{ border: "1px solid #D9CDB8", color: "#0F0A06" }}
              required
              autoComplete="current-password"
            />
          </div>

          {needsTotp && (
            <div>
              <label
                className="text-[10px] uppercase tracking-[0.18em] block mb-2"
                style={{ color: "#5A4A3A" }}
              >
                2FA-Code (Authenticator-App)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={totpToken}
                onChange={(e) => setTotpToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full px-3 py-2.5 text-sm bg-transparent focus:outline-none tracking-[0.4em] font-mono"
                style={{ border: "1px solid #D9CDB8", color: "#0F0A06" }}
                placeholder="000000"
                required
                autoFocus
                autoComplete="one-time-code"
              />
              <p className="text-[10px] mt-1.5" style={{ color: "#8A7866" }}>
                6-stelligen Code aus deiner Authenticator-App eingeben.
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 text-sm" style={{ background: "#F7EBE6", border: "1px solid #A33B2A", color: "#7E2A1D" }}>
              {error}
              {retryAfter && retryAfter > 0 && (
                <div className="text-[11px] mt-1 opacity-70">
                  Bitte warten Sie {retryAfter} Sekunden.
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3.5 text-[11px] font-bold uppercase tracking-[0.18em] disabled:opacity-50 inline-flex items-center justify-center gap-2"
            style={{ background: "#0F0A06", color: "#FAFAF7" }}
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Anmelden
          </button>
        </form>

        <p className="text-[10px] uppercase tracking-[0.18em] text-center mt-6" style={{ color: "#8A7866" }}>
          Nur für autorisierte Mitarbeiter
        </p>
      </div>
    </main>
  );
}

function translateError(code: string): string {
  switch (code) {
    case "INVALID_CREDENTIALS":
      return "E-Mail oder Passwort falsch.";
    case "ACCOUNT_LOCKED":
      return "Konto vorübergehend gesperrt nach zu vielen Fehlversuchen.";
    case "RATE_LIMITED":
      return "Zu viele Anmeldeversuche. Bitte später erneut versuchen.";
    case "INVALID_INPUT":
      return "Bitte E-Mail und Passwort eingeben.";
    case "INVALID_TOTP":
      return "2FA-Code falsch. Bitte erneut eingeben.";
    default:
      return "Login fehlgeschlagen.";
  }
}
