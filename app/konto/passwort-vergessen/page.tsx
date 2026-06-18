import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/konto/ForgotPasswordForm";

export const metadata: Metadata = { title: "Passwort vergessen — Hagi Teppiche", robots: { index: false } };

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
