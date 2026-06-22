"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Wenn die Order noch PENDING ist (Webhook noch nicht da), refresht diese Komponente
// die Seite alle 3 Sekunden — maximal 10 Mal (30 Sekunden). Danach stoppt sie.
// router.refresh() löst einen Server-Rerender aus, ohne die URL zu ändern.
export function PendingRefresh() {
  const router = useRouter();

  useEffect(() => {
    let attempts = 0;
    const id = setInterval(() => {
      attempts++;
      router.refresh();
      if (attempts >= 10) clearInterval(id);
    }, 3000);
    return () => clearInterval(id);
  }, [router]);

  return null;
}
