"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  ClipboardCheck,
  Cloud,
  Coins,
  Database,
  FileCheck2,
  Fingerprint,
  GitBranch,
  KeyRound,
  LockKeyhole,
  MessagesSquare,
  Network,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Undo2,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { TicketOSLogo } from "@/components/brand/ticketos-logo";
import { AuroraField, GridOverlay, OrbitArt } from "@/components/brand/backgrounds";
import { MarketingFooter, MarketingNav } from "@/components/marketing/marketing-chrome";

const heroSteps = [
  ["Request captured", "from Slack", true],
  ["Identity verified", "via HRIS", true],
  ["Policy checked", "reset.v2", true],
  ["Access restored", "Okta", false],
] as const;

const differentiators = [
  ["Undo any action", "One click reverses what an agent did on a connected system — re-add the group, restore the account.", Undo2],
  ["Price every resolution", "A live ledger shows the AI cost of each ticket and your month-to-date burn against a hard budget.", Coins],
  ["Preview the blast radius", "Before a workflow runs, see exactly which systems it will touch, what's reversible, and what pauses for approval.", ScanSearch],
  ["Earned autonomy", "Workflows graduate from suggest to fully autonomous as they prove themselves — and tighten the instant trust drops.", TrendingUp],
  ["Lives in chat", "Requests arrive from Slack and Teams, get classified, and the agent replies in the same thread.", MessagesSquare],
  ["Replayable audit", "Every decision, approval, and action is recorded — replay the exact path an agent followed.", GitBranch],
] satisfies Array<[string, string, LucideIcon]>;

const metrics = [
  ["58%", "Routine IT work handled by agents"],
  ["$0.21", "Median cost per AI resolution"],
  ["71%", "Shorter approval loops"],
  ["100%", "Actions audited and reversible"],
];

const integrations = [
  ["Okta", Fingerprint],
  ["Google Workspace", Cloud],
  ["Microsoft Teams", MessagesSquare],
  ["Slack", MessagesSquare],
  ["GitHub", GitBranch],
  ["Jira", ClipboardCheck],
  ["ServiceNow", Workflow],
  ["Datadog", Database],
  ["BambooHR", KeyRound],
  ["Workday", FileCheck2],
  ["Cisco Meraki", Network],
  ["Salesforce", Cloud],
] satisfies Array<[string, LucideIcon]>;

const controls = [
  ["Role-scoped access", LockKeyhole],
  ["Approval stops", BadgeCheck],
  ["Reversible actions", Undo2],
  ["Audit history", FileCheck2],
  ["Policy checks", ShieldCheck],
  ["Cost budgets", Coins],
] satisfies Array<[string, LucideIcon]>;

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
};

export function LandingPage() {
  return (
    <main className="min-h-screen bg-[#f4f8fb] text-[#07111f]">
      <MarketingNav />

      {/* Hero */}
      <section className="relative overflow-hidden bg-[#07111f] text-white">
        <AuroraField className="opacity-90" />
        <GridOverlay tone="dark" />
        <OrbitArt className="right-[-180px] top-[-120px] hidden h-[640px] w-[640px] opacity-70 lg:block" />

        <div className="relative mx-auto grid min-h-[660px] max-w-7xl gap-12 px-5 py-20 md:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-[#b7f7d0] backdrop-blur"
            >
              <Sparkles size={13} />
              AI-native IT service operations
            </motion.span>

            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 }}
              className="mt-6 max-w-2xl text-balance text-5xl font-semibold leading-[1.03] tracking-tight md:text-7xl"
            >
              The autonomy you can{" "}
              <span className="bg-gradient-to-r from-[#22c55e] via-[#5eead4] to-[#38bdf8] bg-clip-text text-transparent">
                audit, undo, and afford.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className="mt-6 max-w-xl text-lg leading-8 text-white/68"
            >
              TicketOS gives lean IT teams a governed workspace where AI agents triage requests, ask for approval,
              execute on real systems — and let you reverse any action, see what it cost, and prove what happened.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              className="mt-9 flex flex-col gap-3 sm:flex-row"
            >
              <Link
                href="/auth/sign-in"
                className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#22c55e] px-6 text-base font-semibold text-[#03120a] shadow-lg shadow-[#22c55e]/20 transition hover:bg-[#34d36b]"
              >
                Open the workspace
                <ArrowRight size={18} className="transition group-hover:translate-x-0.5" />
              </Link>
              <a
                href="#features"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-6 text-base font-semibold text-white backdrop-blur transition hover:bg-white/10"
              >
                See what&apos;s different
              </a>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.16, duration: 0.6 }}
            className="tos-glass overflow-hidden rounded-2xl shadow-2xl shadow-black/40"
          >
            <div className="flex h-12 items-center justify-between border-b border-white/10 px-4">
              <div className="flex items-center gap-2">
                <TicketOSLogo markSize="sm" showWordmark={false} />
                <span className="text-sm font-semibold text-white/90">Service workspace</span>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#22c55e]/15 px-2.5 py-1 text-xs font-semibold text-[#7ef0a8]">
                <span className="size-1.5 rounded-full bg-[#22c55e]" />
                Live
              </span>
            </div>

            <div className="space-y-4 p-5">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-white/10 px-2 py-1 text-xs font-semibold text-white/80">TOS-1842</span>
                <span className="rounded-md bg-[#22c55e]/15 px-2 py-1 text-xs font-semibold text-[#7ef0a8]">Executing</span>
                <span className="text-sm font-semibold text-white/90">Restore Okta access · Priya Shah</span>
              </div>

              <div className="space-y-2">
                {heroSteps.map(([label, detail, done]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2.5">
                      {done ? (
                        <CheckCircle2 size={16} className="text-[#22c55e]" />
                      ) : (
                        <Sparkles size={16} className="text-[#38bdf8]" />
                      )}
                      <span className="text-sm font-medium text-white/90">{label}</span>
                    </div>
                    <span className="text-xs text-white/45">{detail}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-4 text-xs font-semibold">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-2.5 py-1 text-white/75">
                  <Coins size={12} className="text-[#7ef0a8]" /> $0.21 to resolve
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-2.5 py-1 text-white/75">
                  <Undo2 size={12} className="text-[#7ef0a8]" /> Reversible
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-2.5 py-1 text-white/75">
                  <TrendingUp size={12} className="text-[#7ef0a8]" /> Auto with audit
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Metrics */}
      <section className="border-b border-[#d8e4ee] bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px overflow-hidden px-5 md:grid-cols-4 md:px-8">
          {metrics.map(([value, label], index) => (
            <motion.div
              {...fadeUp}
              transition={{ delay: index * 0.05 }}
              key={label}
              className="px-2 py-10 text-center md:px-6"
            >
              <p className="text-4xl font-semibold tracking-tight text-[#0b2a4a] md:text-5xl">{value}</p>
              <p className="mx-auto mt-3 max-w-[18ch] text-sm leading-6 text-slate-500">{label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Differentiators */}
      <section id="features" className="mx-auto max-w-7xl px-5 py-20 md:px-8">
        <motion.div {...fadeUp} className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0b5f91]">Why TicketOS</p>
          <h2 className="mt-3 text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
            Most tools let agents act. We let you stay in control.
          </h2>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            Every other platform asks you to trust the automation. TicketOS makes that trust visible, reversible, and
            measurable — the things legacy ITSM and newer agents leave out.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {differentiators.map(([title, body, Icon], index) => (
            <motion.div
              {...fadeUp}
              transition={{ delay: (index % 3) * 0.06 }}
              key={title}
              className="group rounded-2xl border border-[#d8e4ee] bg-white p-6 transition hover:-translate-y-1 hover:border-[#b7d8f2] hover:shadow-xl hover:shadow-[#0b2a4a]/5"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#e7f3ff] to-[#e8f8ef] text-[#0b5f91] transition group-hover:from-[#22c55e] group-hover:to-[#0b5f91] group-hover:text-white">
                <Icon size={21} />
              </span>
              <h3 className="mt-5 text-xl font-semibold tracking-tight">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Integrations */}
      <section id="integrations" className="mx-auto max-w-7xl px-5 pb-8 md:px-8">
        <FeatureGrid
          eyebrow="Integrations"
          title="Connect the systems your service desk already runs"
          body="TicketOS sits above identity, collaboration, ticketing, monitoring, and HR systems so agents execute with full context."
          items={integrations}
        />
      </section>

      {/* Governance */}
      <section id="security" className="mx-auto max-w-7xl px-5 py-16 md:px-8">
        <FeatureGrid
          eyebrow="Governance"
          title="Guardrails before agents touch sensitive tools"
          body="Approval stops, role boundaries, policy checks, cost budgets, and a replayable audit trail — on every workflow."
          items={controls}
        />
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden bg-[#07111f] text-white">
        <AuroraField intensity="soft" />
        <GridOverlay tone="dark" />
        <div className="relative mx-auto flex max-w-7xl flex-col items-start gap-8 px-5 py-20 md:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="max-w-2xl text-4xl font-semibold tracking-tight md:text-5xl">
              Run IT from one clear, governed workspace.
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-8 text-white/68">
              Review tickets, connect apps, approve workflows, and inspect — and reverse — every agent action.
            </p>
          </div>
          <Link
            href="/auth/sign-in"
            className="group inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-[#22c55e] px-7 text-base font-semibold text-[#03120a] shadow-lg shadow-[#22c55e]/20 transition hover:bg-[#34d36b]"
          >
            Log in to TicketOS
            <ArrowRight size={18} className="transition group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}

function FeatureGrid({
  eyebrow,
  title,
  body,
  items,
}: {
  eyebrow: string;
  title: string;
  body: string;
  items: Array<[string, LucideIcon]>;
}) {
  return (
    <motion.div
      {...fadeUp}
      className="grid gap-8 rounded-3xl border border-[#d8e4ee] bg-white p-6 md:grid-cols-[0.38fr_0.62fr] md:p-10"
    >
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0b5f91]">{eyebrow}</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-4 text-base leading-7 text-slate-600">{body}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(([label, Icon]) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-xl border border-[#d8e4ee] bg-[#f8fbfe] p-3 transition hover:border-[#b7d8f2] hover:bg-white"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#e7f3ff] text-[#0b5f91]">
              <Icon size={17} />
            </span>
            <span className="text-sm font-semibold">{label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
