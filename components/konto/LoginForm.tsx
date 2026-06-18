"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { loginCustomerAction } from "@/app/actions/customer-auth";
import { translateAuthError } from "@/lib/konto-errors";
import { AuthShell, AuthError, Field, SubmitButton, AuthLink } from "./AuthShell";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      setError(null);
      setRetryAfter(null);
      const result = await loginCustomerAction({ email, password });
      if (result.ok) {
        router.push(result.redirectTo ?? "/konto");
        router.refresh();
      } else {
        setError(translateAuthError(result.error));
        if (result.retryAfter) setRetryAfter(result.retryAfter);
      }
    });
  };

  return (
    <AuthShell
      eyebrow="Mein Konto"
      title="Anmelden"
      footer={
        <>
          Noch kein Konto? <AuthLink href="/konto/registrieren">Jetzt registrieren</AuthLink>
        </>
      }
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
        <Field
          label="Passwort"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
        {error && <AuthError message={error} retryAfter={retryAfter} />}
        <SubmitButton pending={isPending} label="Anmelden" />
        <p className="text-center text-[11px]">
          <AuthLink href="/konto/passwort-vergessen">Passwort vergessen?</AuthLink>
        </p>
      </form>
    </AuthShell>
  );
}
