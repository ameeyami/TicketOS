"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
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
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

const heroTickets = [
  { id: "TOS-2041", title: "Restore Okta access", status: "Executing", agent: "Access Agent" },
  { id: "TOS-2040", title: "Prepare designer workspace", status: "Approval", agent: "Onboarding Agent" },
  { id: "TOS-2038", title: "Close contractor access", status: "Policy check", agent: "Security Agent" },
];

const productFeatures = [
  {
    title: "Identity recovery",
    body: "Confirm the requester, evaluate risk, restore access, rotate sessions, and write the audit note.",
    icon: KeyRound,
  },
  {
    title: "New-hire launch plans",
    body: "Turn a start date into app access, device tasks, manager checks, and a tracked execution path.",
    icon: UserPlus,
  },
  {
    title: "Departure controls",
    body: "Close accounts, protect data, hand over ownership, and pause risky removals for review.",
    icon: UserX,
  },
  {
    title: "Action-by-action replay",
    body: "Review the exact path an agent followed: context gathered, policy applied, task executed, result verified.",
    icon: GitBranch,
  },
];

const metrics = [
  { label: "routine work deflected", value: "58%", note: "identity and access tasks handled by agents" },
  { label: "handoff time recovered", value: "9h", note: "from offer accepted to workspace ready" },
  { label: "approval loops shortened", value: "71%", note: "with policy context attached upfront" },
  { label: "operator capacity gain", value: "2.4x", note: "more requests completed per IT owner" },
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

const securityControls = [
  ["Role-scoped operators", LockKeyhole],
  ["Human approval stops", BadgeCheck],
  ["SSO-ready access", Fingerprint],
  ["Complete action history", FileCheck2],
  ["Region-aware workspaces", Cloud],
  ["Policy checks before tools", ShieldCheck],
  ["Provisioning guardrails", UserPlus],
  ["Step-up verification", KeyRound],
] satisfies Array<[string, LucideIcon]>;

const comparisonCards = [
  {
    name: "ServiceNow",
    body: "Excellent for large process catalogs. TicketOS focuses on the work after submission: decisions, tool calls, and verification.",
    icon: Workflow,
  },
  {
    name: "Jira Service Management",
    body: "Useful for structured queues. TicketOS adds autonomous IT agents that can carry a request through to completion.",
    icon: ClipboardCheck,
  },
  {
    name: "Freshservice",
    body: "Good for lightweight help desk operations. TicketOS is designed for governed execution and operational memory.",
    icon: Zap,
  },
];

const workflowSteps = ["Capture", "Classify", "Check policy", "Run action", "Confirm"];

export function LandingPage() {
  return (
    <main className="min-h-screen bg-[#fbfaf8] text-[#171512]">
      <nav className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-[#eee8e2] bg-[#fbfaf8]/92 px-5 backdrop-blur md:px-8">
        <Link href="/" className="flex items-center gap-3 text-xl font-semibold tracking-tight">
          <span className="grid grid-cols-3 gap-0.5">
            <span className="size-2.5 bg-[#171512]" />
            <span className="size-2.5 bg-[#171512]" />
            <span className="size-2.5 bg-[#171512]" />
            <span className="size-2.5 bg-[#171512]" />
            <span className="size-2.5 bg-[#171512]" />
            <span className="size-2.5 bg-[#171512]" />
          </span>
          TicketOS
        </Link>
        <div className="hidden items-center gap-9 text-sm font-medium text-black/70 md:flex">
          <a href="#product">Product</a>
          <a href="#integrations">Integrations</a>
          <a href="#compare">Alternatives</a>
          <a href="#start">Resources</a>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/auth/sign-in" className="hidden text-sm font-medium md:inline">
            Log in
          </Link>
          <Link
            href="/auth/sign-in"
            className="inline-flex h-11 items-center gap-3 rounded-full bg-black px-5 text-sm font-semibold text-white"
          >
            Open prototype
            <span className="flex size-8 items-center justify-center rounded-full bg-white text-black">
              <ArrowRight size={17} />
            </span>
          </Link>
        </div>
      </nav>

      <section className="relative isolate overflow-hidden border-b border-[#eee8e2]">
        <div className="absolute inset-0 -z-10 bg-[#efe6dc]" />
        <div className="absolute inset-x-0 top-0 -z-10 h-[72%] bg-[url('https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=2400&q=80')] bg-cover bg-center opacity-35" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-72 bg-[#fbfaf8]" />
        <div className="mx-auto flex min-h-[760px] max-w-7xl flex-col items-center px-5 pb-16 pt-28 text-center md:px-8">
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="max-w-5xl text-6xl font-semibold leading-[0.98] tracking-tight md:text-8xl"
          >
            Let IT requests finish themselves.
          </motion.h1>
          <p className="mt-8 max-w-3xl text-xl leading-8 text-black/64">
            TicketOS gives IT teams a command center where agents can investigate, ask for approval, execute
            operational tasks, and explain every step they took.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/auth/sign-in" className="inline-flex h-14 items-center justify-center gap-3 rounded-full bg-black px-6 text-base font-semibold text-white">
              Open command center
              <ArrowRight size={18} />
            </Link>
            <a href="#product" className="inline-flex h-14 items-center justify-center gap-3 rounded-full border border-black/10 bg-white/80 px-6 text-base font-semibold backdrop-blur">
              Product tour
              <Play size={18} />
            </a>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 32, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.18, duration: 0.65 }}
            className="mt-16 w-full max-w-6xl overflow-hidden rounded-2xl border border-black/10 bg-white/92 text-left shadow-2xl shadow-black/10 backdrop-blur"
          >
            <div className="flex h-10 items-center gap-2 border-b border-[#eee8e2] px-4">
              <span className="size-3 rounded-full bg-[#ff6b5f]" />
              <span className="size-3 rounded-full bg-[#ffd166]" />
              <span className="size-3 rounded-full bg-[#4ecb71]" />
              <span className="ml-auto text-xs text-black/38">ticketos.app</span>
            </div>
            <div className="grid min-h-[390px] md:grid-cols-[220px_1fr]">
              <div className="border-r border-[#eee8e2] bg-[#faf7f5] p-4">
                <p className="text-xs font-semibold text-black/38">Work areas</p>
                {["IT", "Security", "People Ops"].map((team) => (
                  <div key={team} className="mt-4">
                    <p className="mb-2 text-sm font-semibold">{team}</p>
                    {["Queue", "Agent ideas", "Runs", "Apps"].map((item) => (
                      <div key={item} className="flex h-8 items-center gap-2 rounded-md px-2 text-sm text-black/58 first:bg-[#f1ebe5] first:text-black">
                        <span className="size-1.5 rounded-full bg-[#dc6b22]" />
                        {item}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div className="grid md:grid-cols-[300px_1fr]">
                <div className="border-r border-[#eee8e2] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="font-semibold">Agent ideas</p>
                    <Sparkles size={16} className="text-[#dc6b22]" />
                  </div>
                  {heroTickets.map((ticket, index) => (
                    <div key={ticket.id} className="mb-3 rounded-lg border border-[#eee8e2] bg-white p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">{ticket.title}</p>
                          <p className="mt-1 text-xs text-black/42">{ticket.agent}</p>
                        </div>
                        <span className="rounded bg-[#f8eee7] px-2 py-1 text-[11px] font-semibold text-[#dc6b22]">
                          {index === 0 ? "8m" : index === 1 ? "48m" : "2h"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-[#d9f876] px-2 py-1 text-xs font-semibold">New</span>
                    <h2 className="font-semibold">Restore Okta access for Priya Shah</h2>
                  </div>
                  <p className="mt-4 max-w-2xl text-sm leading-6 text-black/52">
                    TicketOS found matching HR context and a successful MFA challenge. The agent can restore access,
                    rotate sessions, send the update, and preserve a replayable trace.
                  </p>
                  <div className="mt-8 flex flex-col items-center">
                    {workflowSteps.map((step, index) => (
                      <div key={step} className="flex flex-col items-center">
                        <div className="w-[270px] rounded-lg border border-[#eee8e2] bg-white p-3">
                          <div className="flex items-center gap-2">
                            {index < 3 ? <CheckCircle2 size={16} className="text-emerald-600" /> : <Clock3 size={16} className="text-[#dc6b22]" />}
                            <span className="text-sm font-semibold">{step}</span>
                          </div>
                        </div>
                        {index !== workflowSteps.length - 1 && <span className="h-7 w-px bg-[#eee8e2]" />}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 md:px-8">
        <h2 className="max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">
          Built for teams that need IT work completed, not endlessly routed.
        </h2>
        <div className="mt-12 grid gap-5 md:grid-cols-4">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-2xl bg-[#f5f1ed] p-8">
              <p className="min-h-14 text-lg leading-7 text-black/62">{metric.note}</p>
              <p className="mt-24 text-7xl font-semibold tracking-tight">{metric.value}</p>
              <p className="mt-4 text-sm font-semibold uppercase leading-5">{metric.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="product" className="mx-auto grid max-w-7xl gap-12 px-5 py-20 md:px-8 lg:grid-cols-[.55fr_.45fr]">
        <div>
          <h2 className="text-5xl font-semibold leading-tight tracking-tight">
            A control room for everyday IT execution.
          </h2>
          <p className="mt-8 max-w-3xl text-xl leading-8 text-black/62">
            TicketOS turns repeatable service requests into agent-run workflows with visible checks, clear owners,
            approval stops, and a durable record of what happened.
          </p>
          <div className="mt-14 space-y-8">
            {productFeatures.map((feature) => (
              <div key={feature.title} className="grid gap-4 rounded-2xl p-5 transition hover:bg-[#f5f1ed] md:grid-cols-[36px_1fr]">
                <feature.icon size={24} />
                <div>
                  <h3 className="text-2xl font-semibold">{feature.title}</h3>
                  <p className="mt-3 max-w-2xl text-base leading-7 text-black/58">{feature.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl bg-[#f5f1ed] p-8">
          <div className="rounded-2xl border border-[#eee8e2] bg-white p-5 shadow-sm">
            <p className="text-sm text-black/42">Ticket IT-342</p>
            <h3 className="mt-2 text-xl font-semibold">Annalyse needs access restored</h3>
            <div className="mt-6 grid gap-2 text-sm">
              {["Message captured", "Identity confirmed", "Risk reviewed", "Access restored", "Requester updated"].map((step) => (
                <div key={step} className="flex items-center justify-between rounded-lg bg-[#fbfaf8] px-3 py-2">
                  <span>{step}</span>
                  <ArrowRight size={14} className="text-black/30" />
                </div>
              ))}
            </div>
          </div>
          <div className="mx-auto mt-5 w-4/5 rounded-2xl border border-[#eee8e2] bg-white p-5 shadow-sm">
            <div className="inline-flex rounded-full bg-[#d9f876] px-3 py-1 text-xs font-semibold">
              Saved as operational context
            </div>
            <p className="mt-4 text-sm leading-6 text-black/56">
              The next similar request starts with known systems, policy outcomes, and the safest execution path.
            </p>
          </div>
        </div>
      </section>

      <section id="integrations" className="mx-auto max-w-7xl space-y-6 px-5 py-16 md:px-8">
        <FeatureGrid
          title="Bring the tools IT already depends on into one execution surface"
          cta="Browse connected systems"
          items={integrations}
        />
        <FeatureGrid
          title="Give agents boundaries before they touch sensitive systems"
          cta="Review governance model"
          items={securityControls}
        />
      </section>

      <section id="compare" className="mx-auto max-w-7xl px-5 py-20 text-center md:px-8">
        <h2 className="text-5xl font-semibold tracking-tight">Where TicketOS fits</h2>
        <p className="mx-auto mt-5 max-w-3xl text-xl leading-8 text-black/60">
          Keep your systems of record. Add a layer that understands requests, runs approved actions, and gives
          operators proof instead of mystery.
        </p>
        <div className="mt-14 grid gap-6 text-left md:grid-cols-3">
          {comparisonCards.map((card) => (
            <div key={card.name} className="rounded-2xl bg-[#f5f1ed] p-8">
              <div className="flex items-center gap-4">
                <span className="flex size-11 items-center justify-center rounded-xl bg-white">
                  <card.icon size={22} className="text-[#dc6b22]" />
                </span>
                <h3 className="text-3xl font-semibold">{card.name}</h3>
              </div>
              <p className="mt-8 min-h-28 text-lg leading-7 text-black/62">{card.body}</p>
              <Link href="/auth/sign-in" className="inline-flex h-12 items-center gap-3 rounded-full border border-black/10 bg-white px-5 text-base font-semibold">
                Learn more
                <ArrowRight size={17} />
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section id="start" className="mx-auto grid max-w-7xl gap-12 px-5 py-20 md:px-8 lg:grid-cols-[.48fr_.52fr]">
        <div>
          <h2 className="text-5xl font-semibold tracking-tight">Start with one workflow</h2>
          <p className="mt-8 max-w-xl text-xl leading-8 text-black/62">
            Pick a repetitive IT request. TicketOS can map the approvals, systems, checks, and agent actions needed
            to turn it into a reliable run.
          </p>
        </div>
        <form className="space-y-4">
          <input className="h-14 w-full rounded-full border border-black/15 bg-white px-5 text-base outline-none" placeholder="Work email" />
          <input className="h-14 w-full rounded-full border border-black/15 bg-white px-5 text-base outline-none" placeholder="Company" />
          <input className="h-14 w-full rounded-full border border-black/15 bg-white px-5 text-base outline-none" placeholder="Workflow you want handled first" />
          <Link href="/auth/sign-up" className="inline-flex h-14 items-center justify-center rounded-full bg-black px-7 text-base font-semibold text-white">
            Request walkthrough
          </Link>
        </form>
      </section>

      <footer className="mx-auto grid max-w-7xl gap-10 border-t border-[#eee8e2] px-5 py-12 md:grid-cols-5 md:px-8">
        {[
          ["Product", "Command center", "Agent workspace", "Workflow replay", "Operational memory"],
          ["Workflows", "Identity", "Onboarding", "Offboarding", "Approvals"],
          ["Alternatives", "ServiceNow", "Jira Service Management", "Freshservice"],
          ["Company", "About", "Security", "Careers"],
          ["Resources", "Integrations", "Docs", "Status"],
        ].map(([heading, ...links]) => (
          <div key={heading}>
            <h3 className="text-lg font-semibold">{heading}</h3>
            <div className="mt-5 space-y-3">
              {links.map((link) => (
                <a key={link} href="#" className="block text-black/62">
                  {link}
                </a>
              ))}
            </div>
          </div>
        ))}
      </footer>
    </main>
  );
}

function FeatureGrid({
  title,
  cta,
  items,
}: {
  title: string;
  cta: string;
  items: Array<[string, LucideIcon]>;
}) {
  return (
    <div className="grid gap-8 rounded-3xl bg-[#f5f1ed] p-8 md:grid-cols-[.34fr_.66fr] md:p-10">
      <div className="flex flex-col justify-between gap-10">
        <h2 className="text-2xl font-medium leading-8">{title}</h2>
        <Link href="/auth/sign-in" className="inline-flex w-fit rounded-full bg-[#e9e1d8] px-5 py-3 text-base font-medium">
          {cta}
        </Link>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(([label, Icon]) => (
          <div key={label} className="flex items-center gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white shadow-sm">
              <Icon size={19} className="text-[#dc6b22]" />
            </span>
            <span className="text-lg font-medium">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
