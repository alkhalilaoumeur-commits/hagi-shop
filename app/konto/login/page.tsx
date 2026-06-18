import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentCustomer } from "@/lib/services/customer-auth";
import { LoginForm } from "@/components/konto/LoginForm";

export const metadata: Metadata = { title: "Anmelden — Hagi Teppiche", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getCurrentCustomer()) redirect("/konto");
  return <LoginForm />;
}
