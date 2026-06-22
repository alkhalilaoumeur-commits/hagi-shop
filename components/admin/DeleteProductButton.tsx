"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteProductButton({ productId, productName }: { productId: string; productName: string }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    // Cookie-Session reicht (same-origin fetch sendet sie automatisch).
    setDeleting(true);
    const res = await fetch(`/api/admin/produkte/${productId}`, { method: "DELETE" });
    if (res.status === 401) { router.push("/admin/login"); return; }
    router.refresh();
  };

  if (confirming) {
    return (
      <div className="flex gap-1">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs text-white bg-signal px-2 py-1 hover:bg-signal/90 disabled:opacity-50"
        >
          {deleting ? "…" : "Löschen?"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs text-muted border border-border px-2 py-1 hover:text-ink"
        >
          Nein
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      title={`${productName} löschen`}
      className="text-xs text-muted hover:text-signal border border-border px-2 py-1 hover:border-signal"
    >
      Löschen
    </button>
  );
}
