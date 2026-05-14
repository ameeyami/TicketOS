"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  CheckCircle2,
  CircleAlert,
  Clock3,
  GitBranch,
  LockKeyhole,
  Play,
  ShieldCheck,
  Workflow,
  Zap,
} from "lucide-react";
import Link from "next/link";

const workflowSteps = [
  "Request intake",
  "Intent analysis",
  "Policy check",
  "Tool execution",
  "Verification",
];

const trustItems = [
  {
    title: "Execution transparency",
    body: "Every agent action exposes reasoning, confidence, permissions, inputs, outputs, and policy decisions.",
    icon: ShieldCheck,
  },
  {
    title: "Workflow replay",
    body: "Replay a ticket like an operational trace instead of reading through scattered comments and logs.",
    icon: Play,
  },
  {
    title: "Operational intelligence",
    body: "Spot bottlenecks, approval latency, automation opportunities, and where humans still carry load.",
    icon: GitBranch,
  },
];

const policyRows = [
  {
    title: "Allow",
    body: "Password reset after identity and manager checks pass",
    icon: CheckCircle2,
  },
  {
    title: "Approve",
    body: "Production repository access needs human review",
    icon: BadgeCheck,
  },
  {
    title: "Block",
    body: "Account owns active API keys and cannot be deactivated",
    icon: CircleAlert,
  },
  {
    title: "Audit",
    body: "Every tool call stores actor, reason, payload, and result",
    icon: LockKeyhole,
  },
];

export function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f8f4] text-[#171914]">
      <section className="relative min-h-[92vh] border-b border-black/10 px-5 py-5 sm:px-8 lg:px-10">
        <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(255,255,255,.9),rgba(231,238,228,.64)_44%,rgba(220,232,238,.72))]" />
        <div className="absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_50%_0%,rgba(43,95,88,.18),transparent_58%)]" />
        <div className="relative mx-auto flex max-w-7xl flex-col">
          <nav className="flex h-14 items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-[#17211c] text-white">
                <Workflow size={18} />
              </span>
              <span className="text-lg font-semibold tracking-tight">TicketOS</span>
            </Link>
            <div className="hidden items-center gap-7 text-sm font-medium text-black/62 md:flex">
              <a href="#platform">Platform</a>
              <a href="#trust">Trust</a>
              <a href="#intelligence">Intelligence</a>
            </div>
            <Link
              href="/app"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#17211c] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#24332b]"
            >
              Open command center
              <ArrowRight size={16} />
            </Link>
          </nav>

          <div className="grid min-h-[calc(92vh-76px)] items-center gap-10 py-16 lg:grid-cols-[.92fr_1.08fr] lg:py-10">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-3xl"
            >
              <div className="mb-7 inline-flex items-center gap-2 rounded-lg border border-black/10 bg-white/70 px-3 py-2 text-sm font-medium text-black/68 shadow-sm backdrop-blur">
                <Bot size={16} />
                AI agents for autonomous IT operations
              </div>
              <h1 className="text-5xl font-semibold leading-[1.02] tracking-tight text-[#121611] sm:text-6xl lg:text-7xl">
                TicketOS
              </h1>
              <p className="mt-6 max-w-2xl text-xl leading-8 text-black/64">
                The AI execution layer for IT operations. Resolve requests, run
                governed workflows, and show every decision your agents make.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/app"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#17211c] px-5 text-sm font-semibold text-white shadow-lg shadow-black/10 transition hover:bg-[#26352d]"
                >
                  View live prototype
                  <ArrowRight size={17} />
                </Link>
                <a
                  href="#platform"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-black/12 bg-white/70 px-5 text-sm font-semibold text-[#17211c] backdrop-blur transition hover:bg-white"
                >
                  See execution model
                  <Play size={17} />
                </a>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 28, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.12, duration: 0.7 }}
              className="relative"
            >
              <div className="overflow-hidden rounded-2xl border border-black/12 bg-[#111713] shadow-2xl shadow-[#30433b]/20">
                <div className="flex h-12 items-center justify-between border-b border-white/10 px-4">
                  <div className="flex gap-2">
                    <span className="size-3 rounded-full bg-[#ff6b5f]" />
                    <span className="size-3 rounded-full bg-[#ffd166]" />
                    <span className="size-3 rounded-full bg-[#4ecb71]" />
                  </div>
                  <span className="text-xs font-medium text-white/46">Execution command center</span>
                </div>
                <div className="grid gap-4 p-4 lg:grid-cols-[.9fr_1.1fr]">
                  <div className="space-y-3">
                    {["Okta reset", "Designer onboarding", "VPN outage"].map((item, index) => (
                      <motion.div
                        key={item}
                        animate={{ opacity: [0.74, 1, 0.74] }}
                        transition={{ duration: 2.8, repeat: Infinity, delay: index * 0.4 }}
                        className="rounded-xl border border-white/10 bg-white/[.06] p-4"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-white">{item}</span>
                          <span className="rounded-md bg-emerald-400/15 px-2 py-1 text-xs text-emerald-200">
                            {index === 1 ? "approval" : "running"}
                          </span>
                        </div>
                        <div className="mt-3 h-2 rounded-full bg-white/10">
                          <div
                            className="h-2 rounded-full bg-[#7be0b5]"
                            style={{ width: `${78 - index * 16}%` }}
                          />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <div className="rounded-xl border border-white/10 bg-[#19211d] p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-white">Workflow trace</span>
                      <span className="text-xs text-white/44">96% confidence</span>
                    </div>
                    <div className="mt-6 space-y-4">
                      {workflowSteps.map((step, index) => (
                        <div key={step} className="flex items-center gap-3">
                          <span className="flex size-7 items-center justify-center rounded-lg bg-white/8 text-[#9ee7c5]">
                            {index < 3 ? <CheckCircle2 size={15} /> : <Clock3 size={15} />}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <span className="truncate text-sm text-white/86">{step}</span>
                              <span className="text-xs text-white/38">09:{41 + index}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section id="platform" className="px-5 py-20 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[.8fr_1.2fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#47685d]">Execution first</p>
            <h2 className="mt-4 max-w-xl text-4xl font-semibold tracking-tight">
              Less chatbot. More operational control plane.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {trustItems.map((item) => (
              <div key={item.title} className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
                <item.icon className="text-[#2d6658]" size={22} />
                <h3 className="mt-5 text-lg font-semibold">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-black/58">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="trust" className="border-y border-black/10 bg-[#111713] px-5 py-20 text-white sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#9ee7c5]">Governed autonomy</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight">
              AI can act only when policy, permissions, and confidence agree.
            </h2>
          </div>
          <div className="grid gap-3">
            {policyRows.map((row) => (
              <div key={row.title} className="flex gap-4 rounded-xl border border-white/10 bg-white/[.06] p-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-[#9ee7c5]">
                  <row.icon size={19} />
                </span>
                <div>
                  <h3 className="font-semibold">{row.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-white/56">{row.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="intelligence" className="px-5 py-18 sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-7 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">Built for the IT work that never stops.</h2>
            <p className="mt-3 max-w-2xl text-black/60">
              Start with password resets, onboarding, access approvals, software provisioning, deactivation, routing,
              and troubleshooting. Grow into the execution fabric for internal operations.
            </p>
          </div>
          <Link
            href="/app"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#17211c] px-5 text-sm font-semibold text-white"
          >
            Launch command center
            <Zap size={17} />
          </Link>
        </div>
      </section>
    </main>
  );
}
