"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Coins,
  Gauge,
  LifeBuoy,
  ShieldCheck,
  Sparkles,
  Undo2,
  Wand2,
  Webhook,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { AuroraField, GridOverlay } from "@/components/brand/backgrounds";
import { MarketingFooter, MarketingNav } from "@/components/marketing/marketing-chrome";

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
};

const ICON_GRADIENTS = [
  "from-[#e0f2fe] to-[#dbeafe] text-[#0b5f91]",
  "from-[#ede9fe] to-[#fae8ff] text-[#7c3aed]",
  "from-[#dcfce7] to-[#d1fae5] text-[#0f7a5f]",
  "from-[#ffedd5] to-[#fef3c7] text-[#b45309]",
  "from-[#cffafe] to-[#ccfbf1] text-[#0e7490]",
  "from-[#fce7f3] to-[#fae8ff] text-[#a21caf]",
];

const capabilities = [
  ["AI triage", "Every request is classified, prioritised, SLA-timed, and summarised the moment it lands.", Sparkles],
  ["Self-service assistant", "Employees ask in plain language and get cited answers from your knowledge base — deflecting routine tickets.", LifeBuoy],
  ["Knowledge that compounds", "Resolve a ticket once and AI drafts a reusable article from it, ready to review and publish.", BookOpen],
  ["Incident signals", "Spikes of similar tickets are clustered into one major incident with an AI-drafted runbook.", AlertTriangle],
  ["Assisted resolution", "Open any ticket to see similar past fixes, relevant articles, and a one-click drafted resolution.", Wand2],
  ["Plain-English workflows", "Describe what should happen and TicketOS generates a governed, reviewable workflow graph.", Workflow],
  ["Real execution + undo", "Agents act on Slack, Jira and more — and every change is one click from being reversed.", Undo2],
  ["Cost per resolution", "A live ledger prices each AI resolution against a hard monthly budget.", Coins],
  ["Performance & trends", "Deflection, MTTR, SLA health and team load — tracked over time, with AI insight.", Gauge],
  ["API & embeddable widget", "Create tickets from any system over REST, and drop a self-service widget on any page.", Webhook],
] satisfies Array<[string, string, LucideIcon]>;

export function ProductPage() {
  return (
    <main className="min-h-screen bg-[#f4f8fb] text-[#07111f]">
      <MarketingNav />

      {/* Hero */}
      <section className="relative overflow-hidden bg-[#07111f] text-white">
        <AuroraField intensity="soft" />
        <GridOverlay tone="dark" />
        <div className="relative mx-auto max-w-7xl px-5 py-16 text-center md:px-8 md:py-20">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-[#b7f7d0] backdrop-blur"
          >
            <span className="size-1.5 animate-pulse rounded-full bg-[#22c55e]" />
            The product
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            className="mx-auto mt-5 max-w-3xl text-4xl font-semibold leading-[1.07] tracking-tight md:text-5xl"
          >
            One workspace to run IT with{" "}
            <span className="bg-gradient-to-r from-[#22c55e] via-[#5eead4] to-[#38bdf8] bg-clip-text text-transparent">
              AI you can trust.
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/68"
          >
            From the first message to a resolved, reversible action — triage, self-service, automation, execution, and
            governance in one clean operations layer.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="mt-8">
            <Link
              href="/auth/sign-in"
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#22c55e] to-[#5eead4] px-7 text-base font-semibold text-[#03120a] shadow-lg shadow-[#22c55e]/25 transition hover:opacity-95"
            >
              Open the workspace
              <ArrowRight size={18} className="transition group-hover:translate-x-0.5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="mx-auto max-w-7xl px-5 py-16 md:px-8">
        <motion.div {...fadeUp} className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0b5f91]">Capabilities</p>
          <h2 className="mt-2.5 text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
            Everything the service desk needs, governed end to end.
          </h2>
        </motion.div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {capabilities.map(([title, body, Icon], index) => (
            <motion.div
              {...fadeUp}
              transition={{ delay: (index % 3) * 0.05 }}
              whileHover={{ y: -4 }}
              key={title}
              className="group rounded-2xl border border-[#d8e4ee] bg-white p-6 shadow-sm transition hover:border-[#b7d8f2]"
            >
              <span
                className={`flex size-12 items-center justify-center rounded-xl bg-gradient-to-br transition group-hover:scale-105 ${
                  ICON_GRADIENTS[index % ICON_GRADIENTS.length]
                }`}
              >
                <Icon size={22} />
              </span>
              <h3 className="mt-4 text-lg font-semibold tracking-tight">{title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-slate-600">{body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Governed band */}
      <section className="bg-gradient-to-b from-white to-[#f5f3ff]">
        <div className="mx-auto max-w-7xl px-5 py-16 md:px-8">
          <motion.div {...fadeUp} className="flex flex-col items-start gap-5 rounded-3xl border border-[#d8e4ee] bg-white p-7 shadow-sm md:flex-row md:items-center md:justify-between md:p-9">
            <div className="max-w-xl">
              <span className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#ede9fe] to-[#fae8ff] text-[#7c3aed]">
                <ShieldCheck size={21} />
              </span>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight">Governed by default, not as an add-on.</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Role-based access, policy gates, approval stops, a replayable audit trail, and one-click rollback are
                built into every workflow — so autonomy is always earned and accountable.
              </p>
            </div>
            <Link
              href="/trust"
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-[#d8e4ee] px-5 text-sm font-semibold text-[#0b2a4a] transition hover:border-[#0b2a4a]"
            >
              See how we keep it safe
              <ArrowRight size={16} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-[#07111f] text-white">
        <AuroraField intensity="soft" />
        <GridOverlay tone="dark" />
        <div className="relative mx-auto flex max-w-7xl flex-col items-center gap-6 px-5 py-16 text-center md:px-8">
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">See it run in your workspace.</h2>
          <Link
            href="/auth/sign-in"
            className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#22c55e] to-[#5eead4] px-7 text-base font-semibold text-[#03120a] shadow-lg shadow-[#22c55e]/25 transition hover:opacity-95"
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
