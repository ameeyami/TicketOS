"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Bot,
  CheckCircle2,
  ChevronDown,
  FileText,
  Gauge,
  MessagesSquare,
  MessageSquareText,
  Sparkles,
  Star,
  TrendingUp,
  Undo2,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AuroraField, GridOverlay } from "@/components/brand/backgrounds";
import { cn } from "@/lib/utils";

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
};

/* ===================================================================== */
/* HERO — floating glass dashboard cluster                                */
/* ===================================================================== */

const feedRows = [
  { icon: CheckCircle2, tone: "text-[#7ef0a8]", title: "Triaged TOS-1923", sub: "Network · high" },
  { icon: FileText, tone: "text-[#7dd3fc]", title: "Drafted resolution", sub: "Password reset" },
  { icon: BadgeCheck, tone: "text-[#fcd34d]", title: "Awaiting approval", sub: "Offboarding" },
  { icon: Undo2, tone: "text-[#c4b5fd]", title: "Action reversed", sub: "Slack message" },
];

export function HeroDashboard() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, delay: 0.1 }}
      className="relative mx-auto min-h-[400px] w-full max-w-[540px] sm:min-h-[460px]"
    >
      {/* glow */}
      <div
        className="pointer-events-none absolute inset-[14%] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(34,197,94,0.28), transparent 70%)" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-0 top-0 size-56 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(56,189,248,0.22), transparent 70%)" }}
        aria-hidden
      />

      {/* Main AI activity card */}
      <div className="tos-anim-float-slow absolute left-[4%] top-[10%] w-[68%] rounded-2xl border border-white/12 bg-[#0b1a2e]/85 p-4 shadow-2xl backdrop-blur">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#22c55e] to-[#0b5f91] text-white">
              <Bot size={15} />
            </span>
            <span className="text-sm font-semibold text-white">AI activity</span>
          </div>
          <span className="flex items-center gap-1 text-[10px] font-semibold text-[#7ef0a8]">
            <span className="size-1.5 animate-pulse rounded-full bg-[#22c55e]" />
            live
          </span>
        </div>
        <div className="mt-3 space-y-2">
          {feedRows.map((row) => (
            <div key={row.title} className="flex items-center gap-2.5 rounded-lg border border-white/8 bg-white/[0.04] px-2.5 py-2">
              <row.icon size={15} className={cn("shrink-0", row.tone)} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white">{row.title}</p>
                <p className="truncate text-[10px] text-white/45">{row.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Metric tile */}
      <div className="tos-anim-float absolute right-0 top-0 w-[40%] rounded-2xl border border-white/12 bg-[#0b1a2e]/85 p-4 shadow-2xl backdrop-blur">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">Auto-resolved</p>
        <p className="mt-1 bg-gradient-to-r from-[#22c55e] to-[#5eead4] bg-clip-text text-3xl font-semibold text-transparent">58%</p>
        <div className="mt-2 flex items-end gap-1">
          {[40, 55, 48, 70, 62, 85, 78].map((h, i) => (
            <span key={i} className="flex-1 rounded-sm bg-gradient-to-t from-[#22c55e]/40 to-[#5eead4]" style={{ height: `${h * 0.32}px` }} />
          ))}
        </div>
        <p className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-[#7ef0a8]">
          <TrendingUp size={11} /> +12% this week
        </p>
      </div>

      {/* Chart card */}
      <div className="tos-anim-drift absolute bottom-[2%] left-0 hidden w-[48%] rounded-2xl border border-white/12 bg-[#0b1a2e]/85 p-3.5 shadow-2xl backdrop-blur sm:block">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">Tickets / week</p>
        <svg viewBox="0 0 120 44" className="mt-2 h-12 w-full" preserveAspectRatio="none" aria-hidden>
          <defs>
            <linearGradient id="tos-hero-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0 34 L20 28 L40 30 L60 18 L80 22 L100 10 L120 14 L120 44 L0 44 Z" fill="url(#tos-hero-area)" />
          <path d="M0 34 L20 28 L40 30 L60 18 L80 22 L100 10 L120 14" fill="none" stroke="#7dd3fc" strokeWidth="1.5" />
        </svg>
      </div>

      {/* Approval toast */}
      <div className="tos-anim-float absolute bottom-[14%] right-[1%] flex w-[46%] items-center gap-2 rounded-xl border border-white/12 bg-[#0b1a2e]/90 p-2.5 shadow-2xl backdrop-blur">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#fcd34d]/15 text-[#fcd34d]">
          <BadgeCheck size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-semibold text-white">Approval needed</p>
          <p className="truncate text-[10px] text-white/45">Grant Okta admin</p>
        </div>
        <span className="rounded-md bg-[#22c55e] px-2 py-1 text-[10px] font-bold text-[#03120a]">Approve</span>
      </div>
    </motion.div>
  );
}

/* ===================================================================== */
/* WORKFLOW PIPELINE — dark, glowing connected steps                      */
/* ===================================================================== */

const pipeline: Array<{ title: string; sub: string; icon: LucideIcon; tone: string }> = [
  { title: "Ticket created", sub: "Slack · Teams · email · API", icon: MessagesSquare, tone: "from-[#22c55e] to-[#0f7a5f]" },
  { title: "AI understands intent", sub: "Classifies & summarises", icon: Sparkles, tone: "from-[#38bdf8] to-[#0b5f91]" },
  { title: "Assigns priority", sub: "Priority + SLA, instantly", icon: Gauge, tone: "from-[#a855f7] to-[#5b4bc4]" },
  { title: "Triggers workflow", sub: "Governed automation runs", icon: Workflow, tone: "from-[#f59e0b] to-[#b45309]" },
  { title: "Resolves automatically", sub: "Acts on real systems · reversible", icon: CheckCircle2, tone: "from-[#22c55e] to-[#0e7490]" },
];

export function WorkflowPipeline() {
  return (
    <section className="relative overflow-hidden bg-[#07111f] text-white">
      <AuroraField intensity="soft" />
      <GridOverlay tone="dark" />
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{ background: "radial-gradient(60% 60% at 50% 0%, rgba(34,197,94,0.12), transparent 70%)" }}
      />
      <div className="relative mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-20">
        <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7ef0a8]">The loop</p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-tight md:text-5xl">
            One message in. A resolved, reversible action out.
          </h2>
        </motion.div>

        <div className="mt-12 flex flex-col items-stretch gap-3 lg:flex-row lg:items-center">
          {pipeline.map((step, index) => (
            <div key={step.title} className="contents">
              <motion.div
                {...fadeUp}
                transition={{ delay: index * 0.08 }}
                className="group relative flex-1 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur transition hover:border-white/20 hover:bg-white/[0.07]"
              >
                <span
                  className="pointer-events-none absolute -right-6 -top-6 size-20 rounded-full blur-2xl"
                  style={{ background: "radial-gradient(circle, rgba(56,189,248,0.25), transparent 70%)" }}
                  aria-hidden
                />
                <span className={cn("flex size-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg", step.tone)}>
                  <step.icon size={20} />
                </span>
                <p className="mt-4 text-[10px] font-bold text-white/35">STEP {index + 1}</p>
                <h3 className="mt-1 text-base font-semibold leading-snug">{step.title}</h3>
                <p className="mt-1 text-xs leading-5 text-white/50">{step.sub}</p>
              </motion.div>
              {index < pipeline.length - 1 && (
                <div className="flex shrink-0 items-center justify-center text-white/25 lg:px-0.5">
                  <ArrowRight size={18} className="hidden lg:block" />
                  <ChevronDown size={18} className="lg:hidden" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ===================================================================== */
/* DASHBOARD SHOWCASE — image-free product panel                          */
/* ===================================================================== */

const showcaseTiles = [
  { label: "Auto-resolved", value: "58%", accent: "from-[#dcfce7] to-[#d1fae5] text-[#0f7a5f]" },
  { label: "MTTR", value: "6.1h", accent: "from-[#e0f2fe] to-[#dbeafe] text-[#0b5f91]" },
  { label: "Deflection", value: "52%", accent: "from-[#ede9fe] to-[#fae8ff] text-[#7c3aed]" },
  { label: "Open", value: "23", accent: "from-[#ffedd5] to-[#fef3c7] text-[#b45309]" },
];

const showcaseNav: Array<{ label: string; icon: LucideIcon; active?: boolean }> = [
  { label: "Tickets", icon: MessageSquareText, active: true },
  { label: "Incidents", icon: AlertTriangle },
  { label: "Workflows", icon: Workflow },
  { label: "Reports", icon: BarChart3 },
];

const showcaseFeed = [
  { icon: CheckCircle2, tone: "text-[#0f7a5f]", text: "Resolved “VPN drops” for 3 users" },
  { icon: Sparkles, tone: "text-[#0b5f91]", text: "Drafted KB article from TOS-1920" },
  { icon: Gauge, tone: "text-[#7c3aed]", text: "Escalated TOS-1925 — SLA at risk" },
  { icon: Undo2, tone: "text-[#a21caf]", text: "Reversed Jira issue create" },
];

const showcaseRuns = [
  { name: "Onboarding · Marketing", pct: 100, status: "Done", tone: "bg-emerald-500" },
  { name: "Offboarding · Contractor", pct: 64, status: "Running", tone: "bg-sky-500" },
  { name: "Access review · Finance", pct: 30, status: "Approval", tone: "bg-amber-500" },
];

const barData = [38, 52, 46, 64, 58, 78, 71, 88];

export function DashboardShowcase() {
  return (
    <section className="bg-gradient-to-b from-white to-[#eef5ff]">
      <div className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-20">
        <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0b5f91]">The product</p>
          <h2 className="mt-2.5 text-3xl font-semibold leading-tight tracking-tight md:text-5xl">
            Your whole operation, in one live view.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-600">
            Analytics, AI activity, and automation monitoring — together, in real time.
          </p>
        </motion.div>

        <motion.div
          {...fadeUp}
          className="mt-10 overflow-hidden rounded-3xl border border-[#d8e4ee] bg-white shadow-[0_30px_80px_-30px_rgba(7,17,31,0.35)]"
        >
          {/* window bar */}
          <div className="flex items-center gap-3 border-b border-[#e8eef5] bg-[#f8fbfe] px-4 py-3">
            <div className="flex gap-1.5">
              <span className="size-3 rounded-full bg-[#ff5f57]" />
              <span className="size-3 rounded-full bg-[#febc2e]" />
              <span className="size-3 rounded-full bg-[#28c840]" />
            </div>
            <span className="text-xs font-semibold text-slate-400">TicketOS — Operations</span>
          </div>

          <div className="grid md:grid-cols-[176px_1fr]">
            {/* sidebar */}
            <div className="hidden border-r border-[#eef2f6] p-3 md:block">
              {showcaseNav.map((item) => (
                <div
                  key={item.label}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium",
                    item.active ? "bg-[#0b2a4a] text-white" : "text-slate-500",
                  )}
                >
                  <item.icon size={15} className={item.active ? "text-[#7ef0a8]" : "text-slate-400"} />
                  {item.label}
                </div>
              ))}
            </div>

            {/* main */}
            <div className="p-4 md:p-5">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {showcaseTiles.map((tile) => (
                  <div key={tile.label} className="rounded-xl border border-[#e8eef5] bg-white p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-medium text-slate-500">{tile.label}</p>
                      <span className={cn("size-2 rounded-full bg-gradient-to-br", tile.accent)} />
                    </div>
                    <p className="mt-1.5 text-xl font-semibold tracking-tight">{tile.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
                {/* chart */}
                <div className="rounded-xl border border-[#e8eef5] bg-white p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">Tickets resolved</p>
                    <span className="rounded-md bg-[#ecfdf5] px-2 py-0.5 text-[11px] font-semibold text-[#0f7a5f]">+18%</span>
                  </div>
                  <div className="mt-4 flex h-28 items-end gap-2">
                    {barData.map((h, i) => (
                      <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1.5">
                        <div
                          className="w-full rounded-t-md bg-gradient-to-t from-[#0b5f91] to-[#38bdf8]"
                          style={{ height: `${h}%` }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* activity feed */}
                <div className="rounded-xl border border-[#e8eef5] bg-white p-4">
                  <p className="flex items-center gap-1.5 text-sm font-semibold">
                    <Bot size={14} className="text-[#0b5f91]" /> AI activity
                  </p>
                  <div className="mt-3 space-y-2.5">
                    {showcaseFeed.map((row) => (
                      <div key={row.text} className="flex items-start gap-2">
                        <row.icon size={14} className={cn("mt-0.5 shrink-0", row.tone)} />
                        <p className="text-xs leading-5 text-slate-600">{row.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* workflow monitoring */}
              <div className="mt-4 rounded-xl border border-[#e8eef5] bg-white p-4">
                <p className="flex items-center gap-1.5 text-sm font-semibold">
                  <Workflow size={14} className="text-[#0b5f91]" /> Workflow monitoring
                </p>
                <div className="mt-3 space-y-3">
                  {showcaseRuns.map((run) => (
                    <div key={run.name} className="flex items-center gap-3">
                      <p className="w-44 shrink-0 truncate text-xs font-medium text-slate-600">{run.name}</p>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div className={cn("h-full rounded-full", run.tone)} style={{ width: `${run.pct}%` }} />
                      </div>
                      <span className="w-16 shrink-0 text-right text-[11px] font-semibold text-slate-500">{run.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ===================================================================== */
/* FEATURE PREVIEW — mini UI inside each differentiator card              */
/* ===================================================================== */

export function FeaturePreview({ index }: { index: number }) {
  const base = "mt-4 rounded-xl border border-[#e8eef5] bg-[#f8fbfe] p-3";
  switch (index) {
    case 0: // Undo any action
      return (
        <div className={base}>
          <div className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2 text-xs font-medium text-slate-600">
              <MessagesSquare size={14} className="shrink-0 text-[#0b5f91]" />
              <span className="truncate">Posted to #it-help</span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-rose-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-rose-700">
              <Undo2 size={11} /> Undo
            </span>
          </div>
        </div>
      );
    case 1: // Earned autonomy
      return (
        <div className={base}>
          <div className="flex items-center justify-between text-xs font-medium text-slate-600">
            <span>Autonomy</span>
            <span className="text-[#0f7a5f]">72%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-gradient-to-r from-[#22c55e] to-[#0f7a5f]" style={{ width: "72%" }} />
          </div>
          <p className="mt-2 text-[11px] text-slate-400">Suggest → Auto-run</p>
        </div>
      );
    case 2: // Price every resolution
      return (
        <div className={base}>
          <div className="flex items-end justify-between">
            <span className="text-xl font-semibold tracking-tight text-[#07111f]">$0.21</span>
            <span className="text-[11px] text-slate-400">/ resolution</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-[#0b5f91]" style={{ width: "38%" }} />
          </div>
          <p className="mt-1.5 text-[11px] text-slate-400">Budget 38% used</p>
        </div>
      );
    case 3: // Preview blast radius
      return (
        <div className={base}>
          <div className="flex flex-wrap gap-1.5">
            {["Okta", "Slack", "Jira"].map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1 rounded-md border border-[#e8eef5] bg-white px-2 py-1 text-[11px] font-semibold text-slate-600"
              >
                <CheckCircle2 size={11} className="text-[#0f7a5f]" /> {s}
              </span>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-slate-400">3 systems · all reversible</p>
        </div>
      );
    case 4: // Lives in chat
      return (
        <div className={`${base} space-y-1.5`}>
          <span className="inline-block rounded-lg rounded-bl-sm border border-[#e8eef5] bg-white px-2.5 py-1.5 text-[11px] text-slate-600">
            Reset my password
          </span>
          <div className="flex justify-end">
            <span className="inline-block rounded-lg rounded-br-sm bg-[#0b2a4a] px-2.5 py-1.5 text-[11px] text-white">
              Done — link sent ✓
            </span>
          </div>
        </div>
      );
    default: // Replayable audit
      return (
        <div className={base}>
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-slate-500">
            {["Triaged", "Approved", "Executed"].map((s, i) => (
              <span key={s} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-slate-300">→</span>}
                <span className="inline-flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-[#0b5f91]" />
                  {s}
                </span>
              </span>
            ))}
          </div>
        </div>
      );
  }
}

/* ===================================================================== */
/* SOCIAL PROOF — stats + role-based quotes                               */
/* ===================================================================== */

const proofStats: Array<[string, string]> = [
  ["50K+", "Tickets automated"],
  ["92%", "Faster routing"],
  ["58%", "Auto-resolved"],
  ["100%", "Reversible actions"],
];

const testimonials = [
  {
    quote: "We let agents handle the routine work and still sleep at night — every action is reversible and logged.",
    who: "Head of IT",
    org: "mid-market SaaS",
  },
  {
    quote: "Approvals that used to take a day now happen in minutes, right inside Slack.",
    who: "IT Operations Lead",
    org: "fintech",
  },
  {
    quote: "Finally a tool where I can see exactly what the AI did — and what it cost.",
    who: "Systems Administrator",
    org: "300-person company",
  },
];

export function SocialProof() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-16 md:px-8">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {proofStats.map(([value, label]) => (
          <motion.div
            {...fadeUp}
            whileHover={{ y: -3 }}
            key={label}
            className="rounded-2xl border border-[#d8e4ee] bg-white p-5 text-center shadow-sm"
          >
            <p className="bg-gradient-to-br from-[#0b5f91] to-[#5b4bc4] bg-clip-text text-3xl font-semibold tracking-tight text-transparent md:text-4xl">
              {value}
            </p>
            <p className="mt-1 text-xs text-slate-500">{label}</p>
          </motion.div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-3">
        {testimonials.map((t, i) => (
          <motion.div
            {...fadeUp}
            transition={{ delay: i * 0.05 }}
            key={t.who}
            className="rounded-2xl border border-[#d8e4ee] bg-white p-6 shadow-sm"
          >
            <div className="flex gap-0.5 text-[#f59e0b]">
              {Array.from({ length: 5 }).map((_, j) => (
                <Star key={j} size={14} className="fill-current" />
              ))}
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-700">“{t.quote}”</p>
            <p className="mt-4 text-xs font-semibold text-[#07111f]">
              {t.who} <span className="font-normal text-slate-400">· {t.org}</span>
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
