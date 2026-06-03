"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Globe,
  KeyRound,
  Lock,
  Mail,
  ScrollText,
  Server,
  ShieldCheck,
  SlidersHorizontal,
  Undo2,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { AuroraField, GridOverlay } from "@/components/brand/backgrounds";
import { MarketingFooter, MarketingNav } from "@/components/marketing/marketing-chrome";

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
};

const principles = [
  {
    icon: KeyRound,
    title: "Your data, your key",
    body: "AI runs on your own Anthropic key, stored only for your workspace. We never train on your tickets, knowledge, or conversations — they are never used to improve any model.",
  },
  {
    icon: ScrollText,
    title: "Every action is audited",
    body: "Triage, approvals, executions and rollbacks all write to an immutable audit log with the actor, time and reasoning — so you can answer 'who did what, and why' months later.",
  },
  {
    icon: Undo2,
    title: "One-click rollback",
    body: "Real changes in connected apps (Slack, Jira and more) are reversible. If an automation does the wrong thing, you undo it in one click — no clean-up tickets.",
  },
  {
    icon: UsersRound,
    title: "Role-based access",
    body: "Owner, admin, operator and viewer roles gate who can approve, execute and configure. Tickets are scoped to the teams that raise and process them.",
  },
  {
    icon: SlidersHorizontal,
    title: "Policy & approval gates",
    body: "Sensitive actions are blocked or held for manager approval by policy before anything runs. Autonomy is earned, not assumed — with dry-run previews first.",
  },
  {
    icon: Globe,
    title: "Data residency you control",
    body: "TicketOS runs on your own Supabase project, in the region you choose. Your operational data stays in your database, under your control.",
  },
];

const subprocessors = [
  {
    name: "Anthropic (Claude)",
    purpose: "AI triage, Copilot, self-service answers, runbooks — only when you connect your own key.",
    data: "Ticket text you send for that request",
    optional: "Required for AI features",
  },
  {
    name: "Supabase",
    purpose: "Your database, authentication and storage — your own project.",
    data: "All workspace data, in your region",
    optional: "Core",
  },
  {
    name: "Slack / Jira / Gmail",
    purpose: "Real execution + notifications, only for the providers you choose to connect.",
    data: "Only the fields needed for each action",
    optional: "Optional, per connection",
  },
];

const compliance = [
  { label: "SOC 2 Type II", status: "In progress" },
  { label: "GDPR-aligned data handling", status: "Supported" },
  { label: "No model training on your data", status: "Guaranteed" },
  { label: "Encryption in transit & at rest", status: "Supported" },
];

export function TrustPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <MarketingNav />

      {/* Hero */}
      <header className="relative overflow-hidden bg-[#07111f] px-5 py-20 text-white md:px-8 md:py-28">
        <AuroraField />
        <GridOverlay />
        <div className="relative mx-auto max-w-4xl text-center">
          <motion.span
            {...fadeUp}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-white/70"
          >
            <ShieldCheck size={14} />
            Security &amp; trust
          </motion.span>
          <motion.h1 {...fadeUp} transition={{ delay: 0.05 }} className="mt-5 text-4xl font-semibold tracking-tight md:text-5xl">
            Automation you can prove, and undo.
          </motion.h1>
          <motion.p {...fadeUp} transition={{ delay: 0.1 }} className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-white/64">
            TicketOS acts on real systems — so it is built to be auditable, reversible, and governed by default. Your
            data stays yours, AI runs on your own key, and every action leaves a trail.
          </motion.p>
        </div>
      </header>

      {/* Principles */}
      <section className="px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl font-semibold tracking-tight text-[#07111f]">How we protect your workspace</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {principles.map((p, i) => (
              <motion.div
                key={p.title}
                {...fadeUp}
                transition={{ delay: i * 0.04 }}
                className="rounded-2xl border border-[#e3ebf3] bg-white p-5 shadow-sm"
              >
                <span className="flex size-10 items-center justify-center rounded-xl bg-[#e7f0ff] text-[#0b5f91]">
                  <p.icon size={19} />
                </span>
                <h3 className="mt-4 text-base font-semibold text-[#07111f]">{p.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{p.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* AI handling */}
      <section className="border-y border-[#e3ebf3] bg-[#f6f9fc] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#cfe0ef] bg-white px-3 py-1 text-xs font-semibold text-[#0b5f91]">
              <Lock size={13} />
              Bring your own AI
            </span>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-[#07111f]">
              The AI runs on your key — not a shared black box
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              You connect your own Anthropic key. It is stored only for your workspace and used solely to answer your
              own requests. There is no shared model pool, no cross-customer data, and nothing is ever used to train a
              model. Turn AI off and TicketOS still runs on its built-in heuristics.
            </p>
          </div>
          <div className="rounded-2xl border border-[#e3ebf3] bg-white p-2 shadow-sm">
            {[
              "Your key, your spend — visible in the cost ledger",
              "No training on your data, ever",
              "Disconnect the key at any time, in one click",
              "Heuristic fallback keeps the app working without AI",
            ].map((line) => (
              <div key={line} className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-[#07111f]">
                <BadgeCheck size={17} className="shrink-0 text-emerald-600" />
                {line}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Subprocessors */}
      <section className="px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-[#07111f]">
            <Server size={20} className="text-[#0b5f91]" />
            Subprocessors &amp; data flow
          </h2>
          <p className="mt-2 text-sm text-slate-500">Only the services you choose to connect ever see your data.</p>
          <div className="mt-6 overflow-hidden rounded-2xl border border-[#e3ebf3]">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-[#f6f9fc] text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Purpose</th>
                  <th className="hidden px-4 py-3 md:table-cell">Data shared</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef2f6]">
                {subprocessors.map((s) => (
                  <tr key={s.name} className="align-top">
                    <td className="px-4 py-3 font-semibold text-[#07111f]">{s.name}</td>
                    <td className="px-4 py-3 text-slate-600">{s.purpose}</td>
                    <td className="hidden px-4 py-3 text-slate-600 md:table-cell">{s.data}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-md border border-[#cfe0ef] bg-[#f1f7ff] px-2 py-0.5 text-xs font-semibold text-[#0b5f91]">
                        {s.optional}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Compliance */}
      <section className="border-t border-[#e3ebf3] bg-[#f6f9fc] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl font-semibold tracking-tight text-[#07111f]">Compliance &amp; posture</h2>
          <p className="mt-2 text-sm text-slate-500">An honest snapshot — we label what is live and what is on the way.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {compliance.map((c) => (
              <div key={c.label} className="rounded-2xl border border-[#e3ebf3] bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-[#07111f]">{c.label}</p>
                <p
                  className={
                    c.status === "In progress"
                      ? "mt-2 inline-block rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800"
                      : "mt-2 inline-block rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700"
                  }
                >
                  {c.status}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-col items-start gap-4 rounded-2xl border border-[#e3ebf3] bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold text-[#07111f]">
                <Mail size={18} className="text-[#0b5f91]" />
                Security questions or a vulnerability to report?
              </h3>
              <p className="mt-1 text-sm text-slate-600">We respond to security reports quickly. Reach the team directly.</p>
            </div>
            <Link
              href="mailto:security@ticketos.app"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-[#0b2a4a] px-5 text-sm font-semibold text-white transition hover:bg-[#07111f]"
            >
              security@ticketos.app
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
