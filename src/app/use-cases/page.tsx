import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, KeyRound, LifeBuoy, ShieldCheck, UserMinus, UserPlus, AlertTriangle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { MarketingFooter, MarketingNav } from "@/components/marketing/marketing-chrome";
import { PAGE_CHIPS, PageHero } from "@/components/marketing/page-parts";

export const metadata: Metadata = {
  title: "Use cases — TicketOS",
  description:
    "How teams use TicketOS: onboarding, offboarding, access requests, password resets, incident response, and self-service deflection — all governed and reversible.",
};

const cases: Array<{ title: string; ask: string; does: string; icon: LucideIcon }> = [
  {
    title: "Onboarding",
    ask: "“New hire starts Monday in Marketing.”",
    does: "Creates accounts and grants the right app access after manager approval — and emails the new joiner.",
    icon: UserPlus,
  },
  {
    title: "Offboarding",
    ask: "“Contractor’s last day is today.”",
    does: "Revokes access and deactivates accounts on real systems, gated by policy — every action reversible.",
    icon: UserMinus,
  },
  {
    title: "Access requests",
    ask: "“I need access to the Finance dashboard.”",
    does: "Checks identity and policy, pauses for approval on sensitive scopes, then grants and logs it.",
    icon: ShieldCheck,
  },
  {
    title: "Password & MFA resets",
    ask: "“I’m locked out of my account.”",
    does: "Verifies the requester and triggers a secure reset, then notifies them — no ticket ping-pong.",
    icon: KeyRound,
  },
  {
    title: "Incident response",
    ask: "Ten “VPN is down” tickets in five minutes.",
    does: "Clusters the spike into one major incident with an AI runbook so you fix it once, not ten times.",
    icon: AlertTriangle,
  },
  {
    title: "Self-service deflection",
    ask: "“How do I connect to the VPN off-site?”",
    does: "Answers instantly from your knowledge base with citations — and only escalates if it can’t help.",
    icon: LifeBuoy,
  },
];

export default function UseCases() {
  return (
    <main className="min-h-screen bg-[#f4f8fb] text-[#07111f]">
      <MarketingNav />
      <PageHero
        eyebrow="Use cases"
        title="The everyday IT work, run by AI."
        subtitle="From a chat message to a resolved, reversible action — here's what TicketOS handles for lean IT teams."
      />

      <section className="mx-auto max-w-7xl px-5 py-16 md:px-8">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {cases.map((c, i) => (
            <div
              key={c.title}
              className="group rounded-2xl border border-[#d8e4ee] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-[#b7d8f2] hover:shadow-xl hover:shadow-[#0b2a4a]/5"
            >
              <span
                className={`flex size-12 items-center justify-center rounded-xl bg-gradient-to-br transition group-hover:scale-105 ${
                  PAGE_CHIPS[i % PAGE_CHIPS.length]
                }`}
              >
                <c.icon size={22} />
              </span>
              <h2 className="mt-4 text-lg font-semibold tracking-tight">{c.title}</h2>
              <p className="mt-2 text-sm italic leading-6 text-slate-500">{c.ask}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{c.does}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center gap-4 rounded-3xl border border-[#d8e4ee] bg-white p-8 text-center shadow-sm">
          <h2 className="text-2xl font-semibold tracking-tight">See it on your own tickets.</h2>
          <Link
            href="/auth/sign-in"
            className="group inline-flex h-12 items-center gap-2 rounded-full bg-gradient-to-r from-[#0b5f91] to-[#5b4bc4] px-7 text-base font-semibold text-white shadow-lg shadow-[#5b4bc4]/20 transition hover:opacity-95"
          >
            Get started free
            <ArrowRight size={18} className="transition group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
