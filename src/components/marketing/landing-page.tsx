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
import { AuroraField, GridOverlay } from "@/components/brand/backgrounds";
import { MarketingFooter, MarketingNav } from "@/components/marketing/marketing-chrome";
import { cn } from "@/lib/utils";

const heroSteps = [
  ["Request captured", "Slack", CheckCircle2],
  ["Identity verified", "HRIS", CheckCircle2],
  ["Policy checked", "reset.v2", CheckCircle2],
  ["Access restored", "Okta", Sparkles],
] satisfies Array<[string, string, LucideIcon]>;

const flow = [
  ["Capture", "Requests land from Slack, Teams, or the portal and get auto-classified.", MessagesSquare],
  ["Verify", "Identity and context are checked against your HRIS and directory.", Fingerprint],
  ["Govern", "Policy decides in the open: allow, pause for approval, or block.", ShieldCheck],
  ["Execute", "The agent acts on real systems — Okta, Slack, Jira, Google.", Workflow],
  ["Reverse", "Every action is priced, audited, and one click from undo.", Undo2],
] satisfies Array<[string, string, LucideIcon]>;

const differentiators = [
  ["Undo any action", "One click reverses what an agent did on a connected system — re-add the group, restore the account, delete the message it posted.", Undo2],
  ["Earned autonomy", "Workflows graduate from suggest to fully autonomous as they prove themselves — and tighten the instant trust drops.", TrendingUp],
  ["Price every resolution", "A live ledger shows the AI cost of each ticket against a hard budget.", Coins],
  ["Preview the blast radius", "See which systems a workflow touches and what's reversible — before it runs.", ScanSearch],
  ["Lives in chat", "Requests arrive in Slack and Teams; the agent replies in the same thread.", MessagesSquare],
  ["Replayable audit", "Replay the exact path an agent followed — every decision and action.", GitBranch],
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
  ["Role-scoped access", "Owners, admins, operators, and viewers each do exactly what their role allows — nothing more.", LockKeyhole],
  ["Approval stops", "Sensitive actions pause for a manager. Nothing risky runs unattended.", BadgeCheck],
  ["Reversible actions", "Every action an agent takes on a real system can be undone with one click.", Undo2],
  ["Replayable audit", "A complete, replayable record of every decision, approval, and action.", FileCheck2],
  ["Policy checks", "Rules decide allow, require-approval, or block before any system is touched.", ShieldCheck],
  ["Cost budgets", "A hard monthly AI budget with live spend tracked per resolution.", Coins],
] satisfies Array<[string, string, LucideIcon]>;

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

        <div className="relative mx-auto grid min-h-[680px] max-w-7xl gap-12 px-5 py-20 md:px-8 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
          <div>
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-[#b7f7d0] backdrop-blur"
            >
              <span className="size-1.5 animate-pulse rounded-full bg-[#22c55e]" />
              AI-native IT service operations
            </motion.span>

            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 }}
              className="mt-6 max-w-2xl text-balance text-5xl font-semibold leading-[1.02] tracking-tight md:text-7xl"
            >
              Autonomy you can{" "}
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
              TicketOS gives lean IT teams a governed workspace where AI agents triage requests, ask for approval, and
              execute on real systems — then let you reverse any action, see what it cost, and prove what happened.
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
                href="#how"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-6 text-base font-semibold text-white backdrop-blur transition hover:bg-white/10"
              >
                See how it works
              </a>
            </motion.div>

            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-white/45">
              <span className="inline-flex items-center gap-1.5"><LockKeyhole size={13} /> Policy-gated</span>
              <span className="inline-flex items-center gap-1.5"><Undo2 size={13} /> Reversible</span>
              <span className="inline-flex items-center gap-1.5"><Coins size={13} /> Cost-aware</span>
              <span className="inline-flex items-center gap-1.5"><GitBranch size={13} /> Fully audited</span>
            </div>
          </div>

          <HeroConsole />
        </div>
      </section>

      {/* Metrics */}
      <section className="border-b border-[#d8e4ee] bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px overflow-hidden px-5 md:grid-cols-4 md:px-8">
          {metrics.map(([value, label], index) => (
            <motion.div {...fadeUp} transition={{ delay: index * 0.05 }} key={label} className="px-2 py-10 text-center md:px-6">
              <p className="text-4xl font-semibold tracking-tight text-[#0b2a4a] md:text-5xl">{value}</p>
              <p className="mx-auto mt-3 max-w-[18ch] text-sm leading-6 text-slate-500">{label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-7xl px-5 py-20 md:px-8">
        <motion.div {...fadeUp} className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0b5f91]">How it works</p>
          <h2 className="mt-3 text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
            From a chat message to a resolved, reversible action.
          </h2>
        </motion.div>

        <div className="relative mt-14">
          {/* connecting line */}
          <div className="pointer-events-none absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-[#22c55e]/30 via-[#38bdf8]/30 to-[#6366f1]/30 lg:block" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {flow.map(([title, body, Icon], index) => (
              <motion.div {...fadeUp} transition={{ delay: index * 0.07 }} key={title} className="relative">
                <div className="relative z-10 flex size-14 items-center justify-center rounded-2xl border border-[#d8e4ee] bg-white text-[#0b5f91] shadow-sm">
                  <Icon size={22} />
                  <span className="absolute -right-1.5 -top-1.5 flex size-6 items-center justify-center rounded-full bg-[#0b2a4a] text-[11px] font-bold text-white">
                    {index + 1}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-semibold tracking-tight">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Differentiators — bento */}
      <section id="features" className="mx-auto max-w-7xl px-5 pb-4 md:px-8">
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

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {differentiators.map(([title, body, Icon], index) => {
            const wide = index < 2;
            return (
              <motion.div
                {...fadeUp}
                transition={{ delay: (index % 4) * 0.05 }}
                key={title}
                className={cn(
                  "group flex flex-col gap-4 rounded-2xl border border-[#d8e4ee] bg-white p-6 transition hover:-translate-y-1 hover:border-[#b7d8f2] hover:shadow-xl hover:shadow-[#0b2a4a]/5",
                  wide && "lg:col-span-2 lg:flex-row lg:items-start lg:p-7",
                )}
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#e7f3ff] to-[#e8f8ef] text-[#0b5f91] transition group-hover:from-[#22c55e] group-hover:to-[#0b5f91] group-hover:text-white">
                  <Icon size={22} />
                </span>
                <div>
                  <h3 className={cn("font-semibold tracking-tight", wide ? "text-2xl" : "text-xl")}>{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Integrations */}
      <section id="integrations" className="mx-auto max-w-7xl px-5 py-16 md:px-8">
        <FeatureGrid
          eyebrow="Integrations"
          title="Connect the systems your service desk already runs"
          body="TicketOS sits above identity, collaboration, ticketing, monitoring, and HR systems so agents execute with full context."
          items={integrations}
        />
      </section>

      {/* Governance */}
      <section id="security" className="mx-auto max-w-7xl px-5 pb-20 md:px-8">
        <motion.div {...fadeUp} className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0b5f91]">Governance</p>
          <h2 className="mt-3 text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
            Guardrails before agents touch sensitive tools
          </h2>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            Approval stops, role boundaries, policy checks, cost budgets, and a replayable audit trail — enforced on
            every workflow.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {controls.map(([title, detail, Icon], index) => (
            <motion.div
              {...fadeUp}
              transition={{ delay: (index % 3) * 0.05 }}
              key={title}
              className="group rounded-2xl border border-[#d8e4ee] bg-white p-6 transition hover:-translate-y-1 hover:border-[#b7d8f2] hover:shadow-xl hover:shadow-[#0b2a4a]/5"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#e7f3ff] to-[#e8f8ef] text-[#0b5f91] transition group-hover:from-[#22c55e] group-hover:to-[#0b5f91] group-hover:text-white">
                <Icon size={21} />
              </span>
              <h3 className="mt-5 text-lg font-semibold tracking-tight">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
            </motion.div>
          ))}
        </div>
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

/** Animated "agent console": a command resolving into governed, reversible steps. */
function HeroConsole() {
  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute -inset-6 rounded-[2.25rem] blur-2xl"
        style={{ background: "radial-gradient(60% 60% at 70% 20%, rgba(34,197,94,0.22), transparent 70%)" }}
        aria-hidden="true"
      />

      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.14, duration: 0.6 }}
        className="tos-glass relative overflow-hidden rounded-2xl shadow-2xl shadow-black/40"
      >
        <div className="flex h-12 items-center justify-between border-b border-white/10 px-4">
          <div className="flex items-center gap-2">
            <TicketOSLogo markSize="sm" showWordmark={false} />
            <span className="text-sm font-semibold text-white/90">Resolution</span>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#22c55e]/15 px-2.5 py-1 text-xs font-semibold text-[#7ef0a8]">
            <span className="size-1.5 animate-pulse rounded-full bg-[#22c55e]" />
            Live
          </span>
        </div>

        <div className="space-y-4 p-5">
          {/* command bar */}
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5">
            <Sparkles size={15} className="shrink-0 text-[#7ef0a8]" />
            <p className="text-sm text-white/85">
              Reset Okta access for <span className="font-semibold text-white">Priya Shah</span>
              <span className="ml-0.5 inline-block h-3.5 w-px animate-pulse bg-[#7ef0a8] align-middle" />
            </p>
          </div>

          {/* governed steps */}
          <div className="space-y-2">
            {heroSteps.map(([label, detail, Icon], index) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, x: 14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.12 }}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <Icon size={16} className={index === heroSteps.length - 1 ? "text-[#38bdf8]" : "text-[#22c55e]"} />
                  <span className="text-sm font-medium text-white/90">{label}</span>
                </div>
                <span className="text-xs text-white/45">{detail}</span>
              </motion.div>
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
              <ShieldCheck size={12} className="text-[#7ef0a8]" /> Policy passed
            </span>
          </div>
        </div>
      </motion.div>

      {/* floating accent chips */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="tos-anim-float absolute -left-5 top-24 hidden items-center gap-2 rounded-xl border border-white/15 bg-[#0b1a2e]/80 px-3 py-2 text-xs font-semibold text-white shadow-xl backdrop-blur lg:flex"
      >
        <Undo2 size={14} className="text-[#7ef0a8]" />
        1-click undo
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.05 }}
        className="tos-anim-float-slow absolute -right-4 bottom-16 hidden items-center gap-2 rounded-xl border border-white/15 bg-[#0b1a2e]/80 px-3 py-2 text-xs font-semibold text-white shadow-xl backdrop-blur lg:flex"
      >
        <GitBranch size={14} className="text-[#7ef0a8]" />
        Replayable audit
      </motion.div>
    </div>
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
