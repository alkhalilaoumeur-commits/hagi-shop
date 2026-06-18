"use client";

import { useTransition } from "react";
import { logoutCustomerAction } from "@/app/actions/customer-auth";

export function LogoutButton() {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      onClick={() => startTransition(() => logoutCustomerAction())}
      disabled={isPending}
      className="text-[11px] uppercase tracking-[0.18em] underline disabled:opacity-50"
      style={{ color: "#8A7866" }}
    >
      {isPending ? "Abmelden…" : "Abmelden"}
    </button>
  );
}
