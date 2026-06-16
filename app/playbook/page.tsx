import type { Metadata } from "next";
import { PlaybookBoard } from "@/components/playbook/PlaybookBoard";

export const metadata: Metadata = {
  title: "Operations Playbook | Hagi intern",
  description: "Interne Workflow-, Risiko- und Security-Übersicht.",
  robots: { index: false, follow: false },
};

export default function PlaybookPage() {
  return <PlaybookBoard />;
}
