"use client";

import { useState, useTransition } from "react";
import { changePasswordAction } from "@/app/actions/customer-auth";
import { translateAuthError } from "@/lib/konto-errors";
import { AuthError, AuthSuccess, Field, SubmitButton } from "./AuthShell";

export function ChangePasswordForm() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      setError(null);
      setDone(false);
      const result = await changePasswordAction({ oldPassword, newPassword });
      if (result.ok) {
        setDone(true);
        setOldPassword("");
        setNewPassword("");
      } else {
        setError(translateAuthError(result.error));
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Field
        label="Aktuelles Passwort"
        type="password"
        value={oldPassword}
        onChange={(e) => setOldPassword(e.target.value)}
        required
        autoComplete="current-password"
      />
      <Field
        label="Neues Passwort"
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        required
        autoComplete="new-password"
      />
      {error && <AuthError message={error} />}
      {done && <AuthSuccess>Passwort erfolgreich geändert.</AuthSuccess>}
      <SubmitButton pending={isPending} label="Passwort ändern" />
    </form>
  );
}
