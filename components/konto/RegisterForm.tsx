"use client";

import { useState, useTransition } from "react";
import { registerCustomerAction } from "@/app/actions/customer-auth";
import { translateAuthError } from "@/lib/konto-errors";
import { AuthShell, AuthError, AuthSuccess, Field, SubmitButton, AuthLink } from "./AuthShell";

export function RegisterForm() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      setError(null);
      setRetryAfter(null);
      const result = await registerCustomerAction({
        email,
        password,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
      });
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
        eyebrow="Fast geschafft"
        title="Bitte E-Mail bestätigen"
        footer={<AuthLink href="/konto/login">Zurück zur Anmeldung</AuthLink>}
      >
        <AuthSuccess>
          Wir haben Ihnen eine E-Mail an <strong>{email}</strong> geschickt. Bitte klicken Sie auf den
          Bestätigungslink, um Ihr Konto zu aktivieren. Der Link ist 24 Stunden gültig.
        </AuthSuccess>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Mein Konto"
      title="Konto anlegen"
      subtitle="Bestellungen verfolgen, Adressen speichern, schneller bestellen."
      footer={
        <>
          Schon ein Konto? <AuthLink href="/konto/login">Anmelden</AuthLink>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Vorname" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" />
          <Field label="Nachname" value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" />
        </div>
        <Field
          label="E-Mail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <Field
          label="Passwort"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
        />
        <p className="text-[11px]" style={{ color: "#8A7866" }}>
          Mindestens 12 Zeichen, je ein Groß- und Kleinbuchstabe und eine Ziffer.
        </p>
        {error && <AuthError message={error} retryAfter={retryAfter} />}
        <SubmitButton pending={isPending} label="Konto anlegen" />
      </form>
    </AuthShell>
  );
}
