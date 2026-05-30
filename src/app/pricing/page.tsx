import type { Metadata } from "next";
import { PricingPage } from "@/components/marketing/pricing-page";

export const metadata: Metadata = {
  title: "Pricing — TicketOS",
  description:
    "Flat, predictable pricing with AI usage included. No per-action credits, no overage packs, no surprise bills.",
};

export default function Pricing() {
  return <PricingPage />;
}
