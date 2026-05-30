"use client";

import { motion } from "framer-motion";
import { ArrowRight, Check, Minus, X } from "lucide-react";
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

type Cell = boolean | "partial" | string;
const comparison: Array<[string, Cell, Cell, Cell]> = [
  ["Autonomous resolution", true, true, "Top tier only"],
  ["Undo / reverse an action", true, false, false],
  ["Cost per resolution + budget cap", true, false, false],
  ["Dry-run blast-radius preview", true, false, "partial"],
  ["Earned, self-adjusting autonomy", true, false, false],
  ["Chat-native intake (Slack/Teams)", true, true, "partial"],
  ["Replayable audit trail", true, true, true],
  ["Transparent public pricing", true, false, false],
  ["Fit for teams under 500", true, true, false],
];

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
        <div className="relative mx-auto max-w-7xl px-5 py-20 text-center md:px-8">
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
            className="mx-auto mt-6 max-w-3xl text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl"
          >
            Pricing that doesn&apos;t punish you for using AI.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/68"
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
                    ? "mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#0b2a4a] text-sm font-semibold text-white transition hover:bg-[#07111f]"
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

      {/* Comparison */}
      <section className="mx-auto max-w-7xl px-5 py-16 md:px-8">
        <motion.div {...fadeUp} className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0b5f91]">How we compare</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight">The control others leave out.</h2>
        </motion.div>

        <motion.div {...fadeUp} className="mt-8 overflow-hidden rounded-3xl border border-[#d8e4ee] bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#d8e4ee] bg-[#f8fbfe]">
                <th className="px-5 py-4 font-semibold">Capability</th>
                <th className="px-4 py-4 text-center font-semibold text-[#0b2a4a]">TicketOS</th>
                <th className="px-4 py-4 text-center font-semibold text-slate-500">Modern</th>
                <th className="px-4 py-4 text-center font-semibold text-slate-500">ServiceNow</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map(([label, tos, modern, snow], index) => (
                <tr key={label} className={index % 2 ? "bg-[#fbfdff]" : "bg-white"}>
                  <td className="px-5 py-3.5 font-medium text-slate-700">{label}</td>
                  <ComparisonCell value={tos} highlight />
                  <ComparisonCell value={modern} />
                  <ComparisonCell value={snow} />
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
        <p className="mt-3 text-xs text-slate-400">
          Competitor details are from public sources as of May 2026; Modern&apos;s are marketing-derived.
        </p>
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
          <h2 className="max-w-2xl text-4xl font-semibold tracking-tight md:text-5xl">
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

function ComparisonCell({ value, highlight = false }: { value: Cell; highlight?: boolean }) {
  let content;
  if (value === true) {
    content = <Check size={18} className={highlight ? "text-[#0f7a5f]" : "text-slate-500"} />;
  } else if (value === false) {
    content = <X size={18} className="text-rose-400" />;
  } else if (value === "partial") {
    content = <Minus size={18} className="text-amber-500" />;
  } else {
    content = <span className="text-xs font-medium text-slate-500">{value}</span>;
  }

  return (
    <td className={cellClass(highlight)}>
      <span className="flex items-center justify-center">{content}</span>
    </td>
  );
}

function cellClass(highlight: boolean) {
  return highlight ? "bg-[#f3fbf6] px-4 py-3.5 text-center" : "px-4 py-3.5 text-center";
}
