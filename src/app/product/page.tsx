import type { Metadata } from "next";
import { ProductPage } from "@/components/marketing/product-page";

export const metadata: Metadata = {
  title: "Product — TicketOS",
  description:
    "One workspace to run IT with AI you can trust: triage, self-service, knowledge, incidents, plain-English workflows, real execution with one-click undo, governance, and cost control.",
};

export default function Product() {
  return <ProductPage />;
}
