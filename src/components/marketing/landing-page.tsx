"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  ClipboardCheck,
  Cloud,
  Database,
  FileCheck2,
  Fingerprint,
  GitBranch,
  KeyRound,
  LockKeyhole,
  MessageSquareText,
  Network,
  Play,
  ShieldCheck,
  Sparkles,
  UserPlus,
  UserX,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

const heroTickets = [
  { id: "TOS-2041", title: "Restore Okta access", status: "Executing", agent: "Access Agent" },
  { id: "TOS-2040", title: "Prepare designer workspace", status: "Approval", agent: "Onboarding Agent" },
  { id: "TOS-2038", title: "Close contractor access", status: "Policy check", agent: "Security Agent" },
];

const productFeatures = [
  ["Identity recovery", "Verify the requester, restore access, rotate sessions, and record the reason.", KeyRound],
  ["Onboarding plans", "Create app access, device tasks, manager checks, and approval steps from one request.", UserPlus],
  ["Departure controls", "Close accounts, protect data, and pause risky removals before anything breaks.", UserX],
  ["Workflow replay", "See the exact path an agent followed, from policy checks to final confirmation.", GitBranch],
] satisfies Array<[string, string, LucideIcon]>;

const metrics = [
  ["58%", "Routine IT tasks handled by agents"],
  ["9h", "Average onboarding handoff recovered"],
  ["71%", "Approval loops shortened with context"],
  ["2.4x", "More requests completed per operator"],
];

const integrations = [
  ["Okta", Fingerprint],
  ["Google Workspace", Cloud],
  ["Microsoft Teams", MessageSquareText],
  ["Slack", MessageSquareText],
  ["GitHub", GitBranch],
  ["Jira", ClipboardCheck],
  ["ServiceNow", Workflow],
  ["Datadog", Database],
  ["BambooHR", UserPlus],
  ["Workday", FileCheck2],
  ["Cisco Meraki", Network],
  ["Salesforce", Cloud],
] satisfies Array<[string, LucideIcon]>;

const controls = [
  ["Role-scoped access", LockKeyhole],
  ["Approval stops", BadgeCheck],
  ["SSO-ready", Fingerprint],
  ["Audit history", FileCheck2],
  ["Policy checks", ShieldCheck],
  ["Provisioning limits", UserPlus],
] satisfies Array<[string, LucideIcon]>;

export function LandingPage() {
  return (
    <main className="min-h-screen bg-[#f4f8fb] text-[#07111f]">
      <nav className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-[#d8e4ee] bg-white/90 px-5 backdrop-blur md:px-8">
        <Link href="/" className="flex items-center gap-3 text-xl font-semibold tracking-tight">
          <TicketOSMark />
          TicketOS
        </Link>
        <div className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
          <a href="#product">Product</a>
          <a href="#integrations">Integrations</a>
          <a href="#security">Security</a>
          <a href="#start">Contact</a>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/auth/sign-in" className="text-sm font-semibold text-[#07111f]">
            Log in
          </Link>
          <Link href="/auth/sign-up" className="hidden h-10 items-center gap-2 rounded-md bg-[#0b2a4a] px-4 text-sm font-semibold text-white sm:inline-flex">
            Request access
            <ArrowRight size={16} />
          </Link>
        </div>
      </nav>

      <section className="relative overflow-hidden border-b border-[#d8e4ee] bg-[#07111f] text-white">
        <div className="mx-auto grid min-h-[720px] max-w-7xl gap-10 px-5 py-20 md:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex rounded-full border border-white/15 bg-white/8 px-3 py-1 text-sm font-semibold text-[#b7f7d0]"
            >
              AI-native IT service operations
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 }}
              className="mt-6 max-w-4xl text-5xl font-semibold leading-[1.02] tracking-tight md:text-7xl"
            >
              Resolve IT requests with agents you can audit.
            </motion.h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/68">
              TicketOS gives lean IT teams a governed workspace where AI agents triage requests, ask for approval,
              execute actions, and explain what happened.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/auth/sign-up" className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#22c55e] px-5 text-base font-semibold text-[#03120a]">
                Request access
                <ArrowRight size={18} />
              </Link>
              <a href="#product" className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-white/15 bg-white/8 px-5 text-base font-semibold text-white">
                View product tour
                <Play size={18} />
              </a>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 22, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.12, duration: 0.55 }}
            className="overflow-hidden rounded-xl border border-white/12 bg-white text-left text-[#07111f] shadow-2xl shadow-black/30"
          >
            <div className="flex h-11 items-center justify-between border-b border-[#d8e4ee] bg-[#f8fbfe] px-4">
              <div className="flex items-center gap-2">
                <TicketOSMark small />
                <span className="text-sm font-semibold">Service workspace</span>
              </div>
              <span className="rounded-md bg-[#e8f8ef] px-2 py-1 text-xs font-semibold text-[#0f7a5f]">Live</span>
            </div>
            <div className="grid min-h-[420px] lg:grid-cols-[250px_1fr]">
              <div className="border-r border-[#d8e4ee] bg-[#f4f8fb] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Suggestions</p>
                <div className="mt-4 space-y-3">
                  {heroTickets.map((ticket, index) => (
                    <div key={ticket.id} className={index === 0 ? "rounded-md border border-[#b7d8f2] bg-white p-3" : "rounded-md border border-[#d8e4ee] bg-white p-3"}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">{ticket.title}</p>
                          <p className="mt-1 text-xs text-slate-500">{ticket.agent}</p>
                        </div>
                        <span className="rounded bg-[#e7f3ff] px-2 py-1 text-[11px] font-semibold text-[#0b5f91]">
                          {index === 0 ? "8m" : index === 1 ? "48m" : "2h"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-[#e8f8ef] px-2 py-1 text-xs font-semibold text-[#0f7a5f]">New workflow</span>
                  <h2 className="font-semibold">Restore Okta access for Priya Shah</h2>
                </div>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
                  The agent found HR context, verified MFA, checked policy, and prepared the tool action for review.
                </p>
                <div className="mt-7 grid gap-3">
                  {["Request captured", "Identity verified", "Policy checked", "Access action prepared", "Requester notified"].map((step, index) => (
                    <div key={step} className="flex items-center justify-between rounded-md border border-[#d8e4ee] bg-[#f8fbfe] px-3 py-3">
                      <div className="flex items-center gap-3">
                        {index < 3 ? <CheckCircle2 size={17} className="text-[#0f7a5f]" /> : <Sparkles size={17} className="text-[#0b5f91]" />}
                        <span className="text-sm font-semibold">{step}</span>
                      </div>
                      <span className="text-xs font-semibold text-slate-400">{index < 3 ? "Done" : "Queued"}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 md:px-8">
        <div className="grid gap-4 md:grid-cols-4">
          {metrics.map(([value, label]) => (
            <div key={label} className="rounded-lg border border-[#d8e4ee] bg-white p-6">
              <p className="text-4xl font-semibold tracking-tight">{value}</p>
              <p className="mt-4 text-sm leading-6 text-slate-600">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="product" className="mx-auto grid max-w-7xl gap-10 px-5 py-16 md:px-8 lg:grid-cols-[0.45fr_0.55fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#0b5f91]">Product</p>
          <h2 className="mt-3 text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
            A calmer way to run high-volume IT work.
          </h2>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            The workspace is built around visible execution: queue, workflow, approval, policy, and replay.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {productFeatures.map(([title, body, Icon]) => (
            <div key={title} className="rounded-lg border border-[#d8e4ee] bg-white p-5">
              <span className="flex size-10 items-center justify-center rounded-md bg-[#e7f3ff] text-[#0b5f91]">
                <Icon size={20} />
              </span>
              <h3 className="mt-5 text-xl font-semibold">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="integrations" className="mx-auto max-w-7xl px-5 py-16 md:px-8">
        <FeatureGrid
          title="Connect the systems your service desk already uses"
          body="TicketOS sits above identity, collaboration, ticketing, monitoring, and HR systems so agents can execute with context."
          items={integrations}
        />
      </section>

      <section id="security" className="mx-auto max-w-7xl px-5 py-16 md:px-8">
        <FeatureGrid
          title="Governed execution before agents touch sensitive tools"
          body="Every workflow can include approval stops, role boundaries, policy checks, and replayable audit history."
          items={controls}
        />
      </section>

      <section id="start" className="mx-auto grid max-w-7xl gap-10 border-t border-[#d8e4ee] px-5 py-16 md:px-8 lg:grid-cols-[0.48fr_0.52fr]">
        <div>
          <h2 className="text-4xl font-semibold tracking-tight md:text-5xl">Start with one recurring request</h2>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
            Pick the workflow your IT team repeats every week. TicketOS can map the checks, approvals, and tool actions.
          </p>
        </div>
        <form className="grid gap-3">
          <input className="h-12 rounded-md border border-[#d8e4ee] bg-white px-4 text-sm outline-none focus:border-[#0b5f91]" placeholder="Work email" />
          <input className="h-12 rounded-md border border-[#d8e4ee] bg-white px-4 text-sm outline-none focus:border-[#0b5f91]" placeholder="Company" />
          <input className="h-12 rounded-md border border-[#d8e4ee] bg-white px-4 text-sm outline-none focus:border-[#0b5f91]" placeholder="First workflow to automate" />
          <Link href="/auth/sign-up" className="inline-flex h-12 w-fit items-center justify-center gap-2 rounded-md bg-[#0b2a4a] px-5 text-sm font-semibold text-white">
            Request access
            <ArrowRight size={16} />
          </Link>
        </form>
      </section>
    </main>
  );
}

function TicketOSMark({ small = false }: { small?: boolean }) {
  return (
    <span className={small ? "flex size-6 items-center justify-center rounded-md bg-[#22c55e] text-xs font-bold text-[#03120a]" : "flex size-8 items-center justify-center rounded-md bg-[#22c55e] text-sm font-bold text-[#03120a]"}>
      T
    </span>
  );
}

function FeatureGrid({
  title,
  body,
  items,
}: {
  title: string;
  body: string;
  items: Array<[string, LucideIcon]>;
}) {
  return (
    <div className="grid gap-8 rounded-xl border border-[#d8e4ee] bg-white p-6 md:grid-cols-[0.36fr_0.64fr] md:p-8">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-4 text-base leading-7 text-slate-600">{body}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(([label, Icon]) => (
          <div key={label} className="flex items-center gap-3 rounded-md border border-[#d8e4ee] bg-[#f8fbfe] p-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#e7f3ff] text-[#0b5f91]">
              <Icon size={17} />
            </span>
            <span className="text-sm font-semibold">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
