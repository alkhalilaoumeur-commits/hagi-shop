"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { Card } from "@/components/admin/ui/Card";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { fieldClass } from "@/components/admin/ui/Field";
import {
  startTotpEnrollmentAction,
  confirmTotpEnrollmentAction,
  disableTotpAction,
} from "@/app/actions/admin-2fa";

export function TwoFactorPanel({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [enroll, setEnroll] = useState<{ qrDataUrl: string; secret: string } | null>(null);
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onlyDigits = (v: string) => v.replace(/\D/g, "").slice(0, 6);

  const begin = () =>
    startTransition(async () => {
      setError(null);
      const res = await startTotpEnrollmentAction();
      if (res.ok) setEnroll({ qrDataUrl: res.qrDataUrl, secret: res.secret });
      else setError("Einrichtung fehlgeschlagen.");
    });

  const confirm = () =>
    startTransition(async () => {
      setError(null);
      const res = await confirmTotpEnrollmentAction({ token });
      if (res.ok) {
        setEnroll(null);
        setToken("");
        router.refresh();
      } else {
        setError(res.error === "INVALID_TOTP" ? "Code falsch — bitte erneut." : "Fehler bei der Aktivierung.");
      }
    });

  const disable = () =>
    startTransition(async () => {
      setError(null);
      const res = await disableTotpAction({ token });
      if (res.ok) {
        setToken("");
        router.refresh();
      } else {
        setError(res.error === "INVALID_TOTP" ? "Code falsch — bitte erneut." : "Fehler beim Deaktivieren.");
      }
    });

  return (
    <div className="max-w-xl">
      <PageHeader
        eyebrow="Sicherheit"
        title="Zwei-Faktor-Authentifizierung"
        description="Schützt dein Admin-Konto mit einem zusätzlichen Code aus einer Authenticator-App (z.B. Google Authenticator, Authy)."
      />

      {enabled ? (
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-green" />
            <span className="text-sm text-ink font-medium">2FA ist aktiv.</span>
          </div>
          <p className="text-sm text-ink-muted">
            Zum Deaktivieren bitte einen aktuellen Code aus deiner App eingeben.
          </p>
          <input
            value={token}
            onChange={(e) => setToken(onlyDigits(e.target.value))}
            inputMode="numeric"
            placeholder="000000"
            className={`${fieldClass} max-w-[160px] tracking-[0.4em] font-mono`}
          />
          {error && <p className="text-sm text-sienna">{error}</p>}
          <AdminButton variant="danger" size="sm" onClick={disable} disabled={isPending || token.length !== 6}>
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            2FA deaktivieren
          </AdminButton>
        </Card>
      ) : !enroll ? (
        <Card className="p-6 space-y-4">
          <p className="text-sm text-ink-muted">
            2FA ist aktuell <span className="text-sienna font-medium">nicht aktiv</span>. Richte sie
            jetzt ein, damit ein gestohlenes Passwort allein nicht reicht.
          </p>
          {error && <p className="text-sm text-sienna">{error}</p>}
          <AdminButton variant="primary" size="sm" onClick={begin} disabled={isPending}>
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            2FA einrichten
          </AdminButton>
        </Card>
      ) : (
        <Card className="p-6 space-y-5">
          <div>
            <p className="text-sm text-ink font-medium mb-1">1. QR-Code scannen</p>
            <p className="text-sm text-ink-muted mb-3">
              Scanne den Code mit deiner Authenticator-App.
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={enroll.qrDataUrl} alt="2FA QR-Code" width={180} height={180} className="border border-border" />
            <p className="text-[11px] text-muted mt-2">
              Kein Scan möglich? Schlüssel manuell eintragen:
              <br />
              <code className="font-mono text-ink break-all">{enroll.secret}</code>
            </p>
          </div>
          <div>
            <p className="text-sm text-ink font-medium mb-2">2. Code aus der App eingeben</p>
            <input
              value={token}
              onChange={(e) => setToken(onlyDigits(e.target.value))}
              inputMode="numeric"
              placeholder="000000"
              autoFocus
              className={`${fieldClass} max-w-[160px] tracking-[0.4em] font-mono`}
            />
          </div>
          {error && <p className="text-sm text-sienna">{error}</p>}
          <div className="flex gap-3">
            <AdminButton variant="primary" size="sm" onClick={confirm} disabled={isPending || token.length !== 6}>
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Aktivieren
            </AdminButton>
            <AdminButton
              variant="ghost"
              size="sm"
              onClick={() => {
                setEnroll(null);
                setToken("");
                setError(null);
              }}
              disabled={isPending}
            >
              Abbrechen
            </AdminButton>
          </div>
        </Card>
      )}
    </div>
  );
}
