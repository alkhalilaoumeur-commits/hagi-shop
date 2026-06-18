import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/konto/ResetPasswordForm";

export const metadata: Metadata = { title: "Neues Passwort — Hagi Teppiche", robots: { index: false } };

export default function ResetPasswordPage({ params }: { params: { token: string } }) {
  return <ResetPasswordForm token={params.token} />;
}
