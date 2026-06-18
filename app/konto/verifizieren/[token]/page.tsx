import type { Metadata } from "next";
import { verifyEmail } from "@/lib/services/customer-auth";
import { AuthShell, AuthError, AuthSuccess, AuthLink } from "@/components/konto/AuthShell";
import { translateAuthError } from "@/lib/konto-errors";

export const metadata: Metadata = { title: "E-Mail bestätigen — Hagi Teppiche", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function VerifyPage({ params }: { params: { token: string } }) {
  const result = await verifyEmail(params.token);

  if (result.ok) {
    return (
      <AuthShell
        eyebrow="Konto"
        title="E-Mail bestätigt"
        footer={<AuthLink href="/konto/login">Jetzt anmelden</AuthLink>}
      >
        <AuthSuccess>
          Ihre E-Mail-Adresse wurde bestätigt. Sie können sich jetzt anmelden und Ihre Bestellungen
          einsehen.
        </AuthSuccess>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Konto"
      title="Bestätigung fehlgeschlagen"
      footer={<AuthLink href="/konto/registrieren">Erneut registrieren</AuthLink>}
    >
      <AuthError message={translateAuthError(result.error)} />
    </AuthShell>
  );
}
