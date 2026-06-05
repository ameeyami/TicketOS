"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Cable, Check, KeyRound, Rocket, Search, UsersRound, Webhook } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type SetupStep = { key: string; label: string; done: boolean; href: string; hint: string };

const ICONS: Record<string, LucideIcon> = {
  claude: KeyRound,
  kb: BookOpen,
  team: UsersRound,
  app: Cable,
  api: Webhook,
  semantic: Search,
};

export function SetupChecklist({ steps }: { steps: SetupStep[] }) {
  const done = steps.filter((s) => s.done).length;
  const total = steps.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <section className="mb-5 rounded-lg border border-[#d8e4ee] bg-gradient-to-br from-[#f1f7ff] to-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-[#dbeafe] text-[#0b5f91]">
            <Rocket size={16} />
          </span>
          <div>
            <h2 className="text-sm font-semibold">Finish setting up TicketOS</h2>
            <p className="text-xs text-slate-500">{done} of {total} done</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-28 overflow-hidden rounded-full bg-black/10">
            <div className="h-full rounded-full bg-[#0b5f91]" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs font-semibold text-slate-500">{pct}%</span>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((step) => {
          const Icon = ICONS[step.key] ?? KeyRound;
          if (step.done) {
            return (
              <div
                key={step.key}
                className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2"
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                  <Check size={13} />
                </span>
                <span className="text-sm font-medium text-emerald-900 line-through decoration-emerald-300">{step.label}</span>
              </div>
            );
          }
          return (
            <Link
              key={step.key}
              href={step.href}
              className="group flex items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2 transition hover:border-[#0b5f91]"
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#e7f0ff] text-[#0b5f91]">
                <Icon size={13} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-[#07111f]">{step.label}</span>
                <span className="block truncate text-xs text-slate-400">{step.hint}</span>
              </span>
              <ArrowRight size={14} className="shrink-0 text-slate-300 transition group-hover:text-[#0b5f91]" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
