import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { MarketingFooter, MarketingNav } from "@/components/marketing/marketing-chrome";
import { PageHero } from "@/components/marketing/page-parts";

export const metadata: Metadata = {
  title: "Status — TicketOS",
  description: "Current operational status of TicketOS systems.",
};

const components = [
  ["Web application", "99.98%"],
  ["Public API", "99.97%"],
  ["AI triage & Copilot", "99.95%"],
  ["Workflows & execution", "99.96%"],
  ["Integrations", "99.99%"],
  ["Webhooks", "99.98%"],
];

export default function Status() {
  return (
    <main className="min-h-screen bg-[#f4f8fb] text-[#07111f]">
      <MarketingNav />
      <PageHero eyebrow="System status" title="All systems operational." />

      <section className="mx-auto max-w-3xl px-5 py-14 md:px-8">
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <span className="flex size-10 items-center justify-center rounded-full bg-emerald-500 text-white">
            <CheckCircle2 size={20} />
          </span>
          <div>
            <p className="font-semibold text-emerald-900">All systems operational</p>
            <p className="text-sm text-emerald-800/80">No incidents reported in the last 90 days.</p>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-[#d8e4ee] bg-white shadow-sm">
          {components.map(([name, uptime], i) => (
            <div
              key={name}
              className={`flex items-center justify-between gap-3 px-5 py-4 ${i > 0 ? "border-t border-[#eef2f6]" : ""}`}
            >
              <span className="text-sm font-medium text-slate-700">{name}</span>
              <div className="flex items-center gap-3">
                <span className="hidden text-xs text-slate-400 sm:inline">{uptime} uptime · 90d</span>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  Operational
                </span>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          Uptime figures are illustrative. For production SLAs, talk to us.
        </p>
      </section>

      <MarketingFooter />
    </main>
  );
}
