import type { Metadata } from "next";
import { CheckCircle2, CircleDashed, Loader2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { MarketingFooter, MarketingNav } from "@/components/marketing/marketing-chrome";
import { PageHero } from "@/components/marketing/page-parts";

export const metadata: Metadata = {
  title: "Roadmap — TicketOS",
  description: "What's shipped, what's in progress, and what's planned for TicketOS.",
};

const columns: Array<{
  title: string;
  icon: LucideIcon;
  tone: string;
  badge: string;
  items: string[];
}> = [
  {
    title: "Shipped",
    icon: CheckCircle2,
    tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
    badge: "Live",
    items: [
      "AI triage, Copilot & summaries",
      "Knowledge base + self-service Ask",
      "Auto-knowledge from resolved tickets",
      "Incident signals (AIOps clustering + runbooks)",
      "Assisted resolution (similar tickets + draft)",
      "Plain-English workflow generation",
      "Real execution + one-click rollback (Slack, Jira)",
      "Cost ledger & earned autonomy",
      "Reports, trends & team performance",
      "Public API + signed webhooks",
      "Embeddable self-service widget",
      "Semantic knowledge search",
    ],
  },
  {
    title: "In progress",
    icon: Loader2,
    tone: "border-sky-200 bg-sky-50 text-sky-700",
    badge: "Building",
    items: ["Scheduled automations (SLA sweeps, digests)", "Interactive approvals in Slack & email"],
  },
  {
    title: "Planned",
    icon: CircleDashed,
    tone: "border-slate-200 bg-slate-50 text-slate-600",
    badge: "Next",
    items: [
      "Two-way ServiceNow / Jira SM bridge",
      "SSO/SAML + SCIM provisioning",
      "Inbound email & native Slack intake",
      "Multilingual intake & answers",
    ],
  },
];

export default function Roadmap() {
  return (
    <main className="min-h-screen bg-[#f4f8fb] text-[#07111f]">
      <MarketingNav />
      <PageHero
        eyebrow="Roadmap"
        title="Where TicketOS is headed."
        subtitle="An honest look at what's live, what we're building, and what's next."
      />

      <section className="mx-auto max-w-7xl px-5 py-16 md:px-8">
        <div className="grid gap-5 md:grid-cols-3">
          {columns.map((col) => (
            <div key={col.title} className="rounded-2xl border border-[#d8e4ee] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
                  <col.icon size={17} className="text-slate-500" />
                  {col.title}
                </h2>
                <span className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${col.tone}`}>{col.badge}</span>
              </div>
              <ul className="mt-4 space-y-2.5">
                {col.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm leading-6 text-slate-600">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#0b5f91]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
