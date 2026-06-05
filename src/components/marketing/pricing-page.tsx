"use client";

import { motion } from "framer-motion";
import { ArrowRight, Check, Coins, ScrollText, Undo2, X } from "lucide-react";
import Link from "next/link";
import { AuroraField, GridOverlay } from "@/components/brand/backgrounds";
import { MarketingFooter, MarketingNav } from "@/components/marketing/marketing-chrome";

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
};

const tiers = [
  {
    name: "Solo",
    price: "$0",
    cadence: "forever",
    blurb: "For individuals and trials.",
    cta: "Start free",
    href: "/auth/sign-in",
    featured: false,
    features: [
      "1 operator, 1 workspace",
      "AI triage, agents & tickets",
      "One-click rollback + full audit trail",
      "1 connected app",
    ],
  },
  {
    name: "Team",
    price: "$49",
    cadence: "per operator / month",
    blurb: "For growing IT teams.",
    cta: "Start free trial",
    href: "/auth/sign-in",
    featured: true,
    features: [
      "Unlimited workflows & integrations",
      "Earned autonomy + dry-run previews",
      "Cost ledger & monthly budgets",
      "Slack & Teams intake",
      "AI usage included — no credit packs",
    ],
  },
  {
    name: "Scale",
    price: "Custom",
    cadence: "annual",
    blurb: "For larger and regulated orgs.",
    cta: "Talk to us",
    href: "mailto:hello@ticketos.app",
    featured: false,
    features: [
      "Everything in Team",
      "SSO / SAML & SCIM provisioning",
      "Data residency / on-prem option",
      "Audit export & priority support",
      "Custom integrations",
    ],
  },
];

const neverBilled = [
  "Per-action AI credits",
  "Usage overage packs",
  "Mandatory implementation fees",
  "Certified-consultant lock-in",
];

const everyPlan = [
  ["Audit", "A complete, replayable record of every decision, approval, and action.", ScrollText],
  ["Undo", "One-click rollback on real changes an agent makes in your connected systems.", Undo2],
  ["Afford", "AI usage included, with a hard monthly budget and live cost per resolution.", Coins],
] satisfies Array<[string, string, typeof ScrollText]>;

const faqs = [
  ["Will my AI bill be predictable?", "Yes. AI usage is included in your plan and capped by a hard monthly budget you set. No per-action credits, no overage packs, no surprise invoices."],
  ["How long does it take to go live?", "Hours, not months. Opinionated defaults mean one IT generalist can run it — no certified-consultant project required."],
  ["Can I trust agents to act on production?", "Every action is reversible, audited, and gated by earned autonomy and approval stops. You can preview the blast radius before anything runs."],
  ["What if I outgrow a plan?", "Move up anytime. Scale adds SSO/SCIM, data residency, and custom integrations for larger or regulated teams."],
];

export function PricingPage() {
  return (
    <main className="min-h-screen bg-[#f4f8fb] text-[#07111f]">
      <MarketingNav />

      {/* Hero */}
      <section className="relative overflow-hidden bg-[#07111f] text-white">
        <AuroraField intensity="soft" />
        <GridOverlay tone="dark" />
        <div className="relative mx-auto max-w-7xl px-5 py-16 text-center md:px-8">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-[#b7f7d0]"
          >
            Transparent pricing
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            className="mx-auto mt-5 max-w-3xl text-4xl font-semibold leading-[1.07] tracking-tight md:text-5xl"
          >
            Pricing that doesn&apos;t punish you for using AI.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/68"
          >
            Flat, predictable plans with AI usage included — no per-action credits, no overage packs, no
            surprise bills. The opposite of how legacy ITSM charges for automation.
          </motion.p>
        </div>
      </section>

      {/* Tiers */}
      <section className="mx-auto -mt-12 max-w-7xl px-5 pb-8 md:px-8">
        <div className="grid gap-5 md:grid-cols-3">
          {tiers.map((tier, index) => (
            <motion.div
              {...fadeUp}
              transition={{ delay: index * 0.06 }}
              key={tier.name}
              className={
                tier.featured
                  ? "relative rounded-3xl border-2 border-[#22c55e] bg-white p-7 shadow-xl shadow-[#22c55e]/10"
                  : "relative rounded-3xl border border-[#d8e4ee] bg-white p-7"
              }
            >
              {tier.featured && (
                <span className="absolute -top-3 left-7 rounded-full bg-[#22c55e] px-3 py-1 text-xs font-semibold text-[#03120a]">
                  Most popular
                </span>
              )}
              <h2 className="text-lg font-semibold">{tier.name}</h2>
              <p className="mt-1 text-sm text-slate-500">{tier.blurb}</p>
              <div className="mt-5 flex items-baseline gap-2">
                <span className="text-4xl font-semibold tracking-tight">{tier.price}</span>
                <span className="text-sm text-slate-500">{tier.cadence}</span>
              </div>
              <Link
                href={tier.href}
                className={
                  tier.featured
                    ? "mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#0b5f91] to-[#5b4bc4] text-sm font-semibold text-white shadow-lg shadow-[#5b4bc4]/20 transition hover:opacity-95"
                    : "mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-[#d8e4ee] text-sm font-semibold text-[#07111f] transition hover:border-[#0b2a4a]"
                }
              >
                {tier.cta}
                <ArrowRight size={16} />
              </Link>
              <ul className="mt-7 space-y-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm leading-6 text-slate-700">
                    <Check size={17} className="mt-0.5 shrink-0 text-[#0f7a5f]" />
                    {feature}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        <motion.div
          {...fadeUp}
          className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 rounded-2xl border border-[#d8e4ee] bg-white px-6 py-4 text-sm font-semibold text-slate-600"
        >
          <span className="text-slate-400">You&apos;ll never be billed for:</span>
          {neverBilled.map((item) => (
            <span key={item} className="inline-flex items-center gap-1.5">
              <X size={15} className="text-rose-500" />
              {item}
            </span>
          ))}
        </motion.div>
      </section>

      {/* Every plan includes */}
      <section className="mx-auto max-w-7xl px-5 py-16 md:px-8">
        <motion.div {...fadeUp} className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7c3aed]">In every plan</p>
          <h2 className="mt-2.5 text-3xl font-semibold tracking-tight">Control is included, not an upsell.</h2>
        </motion.div>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {everyPlan.map(([title, body, Icon], index) => (
            <motion.div
              {...fadeUp}
              transition={{ delay: index * 0.06 }}
              whileHover={{ y: -4 }}
              key={title}
              className="rounded-2xl border border-[#d8e4ee] bg-white p-6 shadow-sm"
            >
              <span
                className={`flex size-11 items-center justify-center rounded-xl bg-gradient-to-br ${
                  ["from-[#dcfce7] to-[#d1fae5] text-[#0f7a5f]", "from-[#e0f2fe] to-[#dbeafe] text-[#0b5f91]", "from-[#ede9fe] to-[#fae8ff] text-[#7c3aed]"][index]
                }`}
              >
                <Icon size={21} />
              </span>
              <h3 className="mt-4 text-lg font-semibold tracking-tight">{title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-slate-600">{body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-5 py-8 md:px-8">
        <motion.h2 {...fadeUp} className="text-center text-3xl font-semibold tracking-tight">
          Questions, answered
        </motion.h2>
        <div className="mt-8 space-y-3">
          {faqs.map(([q, a], index) => (
            <motion.div
              {...fadeUp}
              transition={{ delay: index * 0.04 }}
              key={q}
              className="rounded-2xl border border-[#d8e4ee] bg-white p-5"
            >
              <p className="font-semibold">{q}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{a}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative mt-8 overflow-hidden bg-[#07111f] text-white">
        <AuroraField intensity="soft" />
        <GridOverlay tone="dark" />
        <div className="relative mx-auto flex max-w-7xl flex-col items-center gap-6 px-5 py-20 text-center md:px-8">
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
            Start free. Stay in control.
          </h2>
          <Link
            href="/auth/sign-in"
            className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#22c55e] px-7 text-base font-semibold text-[#03120a] shadow-lg shadow-[#22c55e]/20 transition hover:bg-[#34d36b]"
          >
            Open the workspace
            <ArrowRight size={18} className="transition group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
