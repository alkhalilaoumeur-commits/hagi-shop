"use client";

import { useState, useTransition } from "react";
import { requestPasswordResetAction } from "@/app/actions/customer-auth";
import { translateAuthError } from "@/lib/konto-errors";
import { AuthShell, AuthError, AuthSuccess, Field, SubmitButton, AuthLink } from "./AuthShell";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      setError(null);
      setRetryAfter(null);
      const result = await requestPasswordResetAction({ email });
      if (result.ok) {
        setDone(true);
      } else {
        setError(translateAuthError(result.error));
        if (result.retryAfter) setRetryAfter(result.retryAfter);
      }
    });
  };

  if (done) {
    return (
      <AuthShell
        eyebrow="Passwort"
        title="E-Mail unterwegs"
        footer={<AuthLink href="/konto/login">Zurück zur Anmeldung</AuthLink>}
      >
        <AuthSuccess>
          Falls ein Konto mit dieser E-Mail existiert, haben wir Ihnen einen Link zum Zurücksetzen
          geschickt. Bitte prüfen Sie Ihr Postfach. Der Link ist 1 Stunde gültig.
        </AuthSuccess>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Passwort"
      title="Passwort vergessen"
      subtitle="Geben Sie Ihre E-Mail an, wir senden Ihnen einen Link zum Zurücksetzen."
      footer={<AuthLink href="/konto/login">Zurück zur Anmeldung</AuthLink>}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <Field
          label="E-Mail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
          autoComplete="email"
        />
        {error && <AuthError message={error} retryAfter={retryAfter} />}
        <SubmitButton pending={isPending} label="Link anfordern" />
      </form>
    </AuthShell>
  );
}
