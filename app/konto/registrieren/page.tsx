import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentCustomer } from "@/lib/services/customer-auth";
import { RegisterForm } from "@/components/konto/RegisterForm";

export const metadata: Metadata = { title: "Konto anlegen — Hagi Teppiche", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  if (await getCurrentCustomer()) redirect("/konto");
  return <RegisterForm />;
}
