"use client";

import { animate, motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
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
  TrendingUp,
  Undo2,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { AuroraField, GridOverlay } from "@/components/brand/backgrounds";
import { MarketingFooter, MarketingNav } from "@/components/marketing/marketing-chrome";
import { DashboardShowcase, HeroDashboard, WorkflowPipeline } from "@/components/marketing/landing-visuals";
import { cn } from "@/lib/utils";

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

// Rotating accent palette so icon chips across the page feel colourful, not flat.
const ICON_GRADIENTS = [
  "from-[#e0f2fe] to-[#dbeafe] text-[#0b5f91]",
  "from-[#ede9fe] to-[#fae8ff] text-[#7c3aed]",
  "from-[#dcfce7] to-[#d1fae5] text-[#0f7a5f]",
  "from-[#ffedd5] to-[#fef3c7] text-[#b45309]",
  "from-[#cffafe] to-[#ccfbf1] text-[#0e7490]",
  "from-[#fce7f3] to-[#fae8ff] text-[#a21caf]",
];

export function LandingPage() {
  return (
    <main className="min-h-screen bg-[#f4f8fb] text-[#07111f]">
      <MarketingNav />

      {/* Hero */}
      <section className="relative overflow-hidden bg-[#07111f] text-white">
        <AuroraField className="opacity-90" />
        <GridOverlay tone="dark" />
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{ background: "radial-gradient(55% 45% at 82% 8%, rgba(56,189,248,0.16), transparent 70%)" }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{ background: "radial-gradient(45% 40% at 8% 88%, rgba(168,85,247,0.14), transparent 70%)" }}
        />

        <div className="relative mx-auto grid min-h-[580px] max-w-7xl gap-12 px-5 py-16 md:px-8 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
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
              className="mt-5 max-w-2xl text-balance text-5xl font-semibold leading-[1.0] tracking-tight md:text-7xl"
            >
              AI agents that run IT —{" "}
              <span className="bg-gradient-to-r from-[#22c55e] via-[#5eead4] to-[#38bdf8] bg-clip-text text-transparent">
                audit, undo, afford.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className="mt-5 max-w-lg text-base leading-7 text-white/65"
            >
              TicketOS triages requests, asks for approval, and executes on real systems — then lets you reverse any
              action, see what it cost, and prove exactly what happened.
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

          <HeroDashboard />
        </div>
      </section>

      {/* Metrics */}
      <section className="border-b border-[#d8e4ee] bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px overflow-hidden px-5 md:grid-cols-4 md:px-8">
          {metrics.map(([value, label], index) => (
            <motion.div
              {...fadeUp}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -3 }}
              key={label}
              className="px-2 py-9 text-center md:px-6"
            >
              <p className="bg-gradient-to-br from-[#0b5f91] to-[#5b4bc4] bg-clip-text text-4xl font-semibold tracking-tight text-transparent md:text-[2.75rem]">
                <CountUp value={value} />
              </p>
              <p className="mx-auto mt-2.5 max-w-[18ch] text-sm leading-6 text-slate-500">{label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Works-with strip */}
      <section className="border-b border-[#e3ebf3] bg-white">
        <div className="mx-auto max-w-7xl px-5 py-8 md:px-8">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Plugs into the stack you already run
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {integrations.slice(0, 7).map(([label, Icon]) => (
              <span key={label} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500">
                <Icon size={16} className="text-[#0b5f91]" />
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* How it works — AI pipeline */}
      <div id="how">
        <WorkflowPipeline />
      </div>

      {/* Product showcase */}
      <DashboardShowcase />

      {/* Differentiators — bento */}
      <section id="features" className="mx-auto max-w-7xl px-5 pb-4 pt-16 md:px-8">
        <motion.div {...fadeUp} className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7c3aed]">Why TicketOS</p>
          <h2 className="mt-2.5 text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
            Automation that keeps you in control.
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-600">
            TicketOS makes every automated action visible, reversible, and measurable — so you can let agents do the
            work without giving up oversight.
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
                  "group flex flex-col gap-4 rounded-2xl border border-[#d8e4ee] bg-white p-6 transition hover:-translate-y-1.5 hover:border-[#b7d8f2] hover:shadow-xl hover:shadow-[#0b2a4a]/5",
                  wide && "lg:col-span-2 lg:flex-row lg:items-start lg:p-7",
                )}
              >
                <span
                  className={cn(
                    "flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br transition group-hover:scale-105",
                    ICON_GRADIENTS[index % ICON_GRADIENTS.length],
                  )}
                >
                  <Icon size={22} />
                </span>
                <div>
                  <h3 className={cn("font-semibold tracking-tight", wide ? "text-xl" : "text-lg")}>{title}</h3>
                  <p className="mt-2.5 text-sm leading-6 text-slate-600">{body}</p>
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
      <section id="security" className="bg-gradient-to-b from-white to-[#f5f3ff]">
        <div className="mx-auto max-w-7xl px-5 py-16 md:px-8">
        <motion.div {...fadeUp} className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b45309]">Governance</p>
          <h2 className="mt-2.5 text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
            Guardrails before agents touch sensitive tools
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Approval stops, role boundaries, policy checks, cost budgets, and a replayable audit trail — enforced on
            every workflow.
          </p>
        </motion.div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {controls.map(([title, detail, Icon], index) => (
            <motion.div
              {...fadeUp}
              transition={{ delay: (index % 3) * 0.05 }}
              whileHover={{ y: -4 }}
              key={title}
              className="group rounded-2xl border border-[#d8e4ee] bg-white p-6 transition hover:border-[#b7d8f2] hover:shadow-xl hover:shadow-[#0b2a4a]/5"
            >
              <span
                className={cn(
                  "flex size-11 items-center justify-center rounded-xl bg-gradient-to-br transition group-hover:scale-105",
                  ICON_GRADIENTS[index % ICON_GRADIENTS.length],
                )}
              >
                <Icon size={21} />
              </span>
              <h3 className="mt-4 text-base font-semibold tracking-tight">{title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-slate-600">{detail}</p>
            </motion.div>
          ))}
        </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden bg-[#07111f] text-white">
        <AuroraField intensity="soft" />
        <GridOverlay tone="dark" />
        <div className="relative mx-auto flex max-w-7xl flex-col items-start gap-8 px-5 py-20 md:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
              Run IT from one clear, governed workspace.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-white/68">
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

/** Animates a metric (e.g. "58%", "$0.21") counting up the first time it scrolls into view. */
function CountUp({ value }: { value: string }) {
  const match = value.match(/^([^\d]*)([\d.]+)(.*)$/);
  const prefix = match?.[1] ?? "";
  const numStr = match?.[2] ?? "0";
  const suffix = match?.[3] ?? "";
  const target = parseFloat(numStr);
  const decimals = numStr.includes(".") ? (numStr.split(".")[1]?.length ?? 0) : 0;

  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [display, setDisplay] = useState(`${prefix}${(0).toFixed(decimals)}${suffix}`);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, target, {
      duration: 1.1,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(`${prefix}${v.toFixed(decimals)}${suffix}`),
    });
    return () => controls.stop();
  }, [inView, target, decimals, prefix, suffix]);

  return <span ref={ref}>{display}</span>;
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
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0e7490]">{eyebrow}</p>
        <h2 className="mt-2.5 text-2xl font-semibold tracking-tight md:text-3xl">{title}</h2>
        <p className="mt-3 text-sm leading-7 text-slate-600">{body}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(([label, Icon], index) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-xl border border-[#d8e4ee] bg-[#f8fbfe] p-3 transition hover:-translate-y-0.5 hover:border-[#b7d8f2] hover:bg-white"
          >
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br",
                ICON_GRADIENTS[index % ICON_GRADIENTS.length],
              )}
            >
              <Icon size={17} />
            </span>
            <span className="text-sm font-semibold">{label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
