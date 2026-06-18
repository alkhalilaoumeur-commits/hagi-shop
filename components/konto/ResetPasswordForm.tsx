"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resetPasswordAction } from "@/app/actions/customer-auth";
import { translateAuthError } from "@/lib/konto-errors";
import { AuthShell, AuthError, Field, SubmitButton, AuthLink } from "./AuthShell";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      setError(null);
      const result = await resetPasswordAction({ token, password });
      if (result.ok) {
        router.push((result.redirectTo ?? "/konto/login") + "?reset=ok");
        router.refresh();
      } else {
        setError(translateAuthError(result.error));
      }
    });
  };

  return (
    <AuthShell
      eyebrow="Passwort"
      title="Neues Passwort"
      subtitle="Vergeben Sie ein neues, sicheres Passwort für Ihr Konto."
      footer={<AuthLink href="/konto/login">Zurück zur Anmeldung</AuthLink>}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <Field
          label="Neues Passwort"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoFocus
          autoComplete="new-password"
        />
        <p className="text-[11px]" style={{ color: "#8A7866" }}>
          Mindestens 12 Zeichen, je ein Groß- und Kleinbuchstabe und eine Ziffer.
        </p>
        {error && <AuthError message={error} />}
        <SubmitButton pending={isPending} label="Passwort speichern" />
      </form>
    </AuthShell>
  );
}
