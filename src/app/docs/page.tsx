import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Cable, Code2, Compass, KeyRound, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { MarketingFooter, MarketingNav } from "@/components/marketing/marketing-chrome";
import { PAGE_CHIPS, PageHero } from "@/components/marketing/page-parts";

export const metadata: Metadata = {
  title: "Docs — TicketOS",
  description: "Get started with TicketOS: connect your AI key, wire up integrations, and automate IT in minutes.",
};

const quickstart = [
  ["Connect Claude", "Add your Anthropic key on the Claude API page to turn on AI triage, Copilot, and Ask.", KeyRound],
  ["Connect an app", "Link Slack or Jira so agents can execute real actions — with one-click rollback.", Cable],
  ["Create a ticket", "Raise a ticket (or POST via the API) and watch it get triaged, routed, and resolved.", Compass],
] satisfies Array<[string, string, LucideIcon]>;

const categories: Array<{ title: string; body: string; href: string; icon: LucideIcon }> = [
  { title: "Core concepts", body: "Tickets, agents, workflows, policies, autonomy, and the audit trail.", href: "/product", icon: BookOpen },
  { title: "Integrations", body: "Identity, chat, ticketing, and HR systems TicketOS sits on top of.", href: "/#integrations", icon: Cable },
  { title: "API reference", body: "Create tickets over REST and receive webhooks on ticket events.", href: "/api-reference", icon: Code2 },
  { title: "Security & trust", body: "BYO-key, no training on your data, RBAC, rollback, and data residency.", href: "/trust", icon: ShieldCheck },
];

export default function Docs() {
  return (
    <main className="min-h-screen bg-[#f4f8fb] text-[#07111f]">
      <MarketingNav />
      <PageHero
        eyebrow="Documentation"
        title="Up and running in minutes."
        subtitle="TicketOS ships with opinionated defaults so one IT generalist can run it. Start here."
      />

      <section className="mx-auto max-w-7xl px-5 py-16 md:px-8">
        <h2 className="text-xl font-semibold tracking-tight">Quickstart</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          {quickstart.map(([title, body, Icon], i) => (
            <div key={title} className="rounded-2xl border border-[#d8e4ee] bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <span className={`flex size-10 items-center justify-center rounded-xl bg-gradient-to-br ${PAGE_CHIPS[i % PAGE_CHIPS.length]}`}>
                  <Icon size={19} />
                </span>
                <span className="flex size-6 items-center justify-center rounded-full bg-[#0b2a4a] text-[11px] font-bold text-white">
                  {i + 1}
                </span>
              </div>
              <h3 className="mt-4 text-base font-semibold tracking-tight">{title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-slate-600">{body}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-12 text-xl font-semibold tracking-tight">Browse the docs</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((c, i) => (
            <Link
              key={c.title}
              href={c.href}
              className="group rounded-2xl border border-[#d8e4ee] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-[#b7d8f2] hover:shadow-xl hover:shadow-[#0b2a4a]/5"
            >
              <span className={`flex size-11 items-center justify-center rounded-xl bg-gradient-to-br ${PAGE_CHIPS[i % PAGE_CHIPS.length]}`}>
                <c.icon size={20} />
              </span>
              <h3 className="mt-4 flex items-center gap-1 text-base font-semibold tracking-tight">
                {c.title}
                <ArrowRight size={15} className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#0b5f91]" />
              </h3>
              <p className="mt-1.5 text-sm leading-6 text-slate-600">{c.body}</p>
            </Link>
          ))}
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
