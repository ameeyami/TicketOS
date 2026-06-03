import type { Metadata } from "next";
import { TrustPage } from "@/components/marketing/trust-page";

export const metadata: Metadata = {
  title: "Security & Trust — TicketOS",
  description:
    "How TicketOS keeps your workspace safe: bring-your-own AI key with no training on your data, full audit trail, one-click rollback, role-based access, and data residency you control.",
};

export default function Trust() {
  return <TrustPage />;
}
