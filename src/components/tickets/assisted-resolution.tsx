"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BadgeCheck, BookOpen, Check, Copy, ListChecks, Loader2, Sparkles, Undo2, Wand2 } from "lucide-react";
import { draftTicketResolution, planTicketResolution } from "@/app/app/tickets/[ticketId]/actions";
import type { ResolutionPlan } from "@/lib/ai/assist";

export type AssistProps = {
  ticketId: string;
  similarTickets: Array<{ id: string; ref: string; title: string; similarity: number | null }>;
  suggestedArticles: Array<{ id: string; title: string; snippet: string }>;
  mode: "semantic" | "keyword";
};

export function AssistedResolution({ ticketId, similarTickets, suggestedArticles, mode }: AssistProps) {
  const [draft, setDraft] = useState<{ text: string; aiWritten: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [plan, setPlan] = useState<ResolutionPlan | null>(null);
  const [planning, setPlanning] = useState(false);

  async function onDraft() {
    if (loading) return;
    setLoading(true);
    try {
      setDraft(await draftTicketResolution(ticketId));
    } finally {
      setLoading(false);
    }
  }

  async function onPlan() {
    if (planning) return;
    setPlanning(true);
    try {
      setPlan(await planTicketResolution(ticketId));
    } finally {
      setPlanning(false);
    }
  }

  async function copyDraft() {
    if (!draft) return;
    await navigator.clipboard.writeText(draft.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const nothing = similarTickets.length === 0 && suggestedArticles.length === 0;

  return (
    <div className="rounded-xl border border-[#d8e4ee] bg-gradient-to-br from-[#f1f7ff] to-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-[#dbeafe] text-[#0b5f91]">
            <Wand2 size={16} />
          </span>
          <div>
            <h2 className="text-sm font-semibold">Assisted resolution</h2>
            <p className="text-xs text-slate-400">
              {mode === "semantic" ? "Matched by meaning" : "Matched by keywords"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onPlan}
            disabled={planning}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#0b2a4a] bg-white px-3 text-sm font-semibold text-[#0b2a4a] transition hover:bg-[#f1f7ff] disabled:opacity-50"
          >
            {planning ? <Loader2 size={15} className="animate-spin" /> : <ListChecks size={15} />}
            {planning ? "Planning…" : plan ? "Re-plan" : "Plan steps"}
          </button>
          <button
            type="button"
            onClick={onDraft}
            disabled={loading}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#0b2a4a] px-3 text-sm font-semibold text-white transition hover:bg-[#07111f] disabled:opacity-50"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {loading ? "Drafting…" : draft ? "Redraft" : "Draft resolution"}
          </button>
        </div>
      </div>

      {plan && (
        <div className="mt-3 rounded-lg border border-[#cfe0ef] bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#0b5f91]">Resolution plan</p>
          {plan.intents.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {plan.intents.map((intent) => (
                <span key={intent} className="rounded-full border border-black/10 bg-[#f5f8fc] px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                  {intent}
                </span>
              ))}
            </div>
          )}
          <ol className="mt-3 space-y-2">
            {plan.steps.map((step, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#0b2a4a] text-[10px] font-bold text-white">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-semibold text-slate-700">{step.title}</span>
                    {step.system && (
                      <span className="rounded-md border border-black/10 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                        {step.system}
                      </span>
                    )}
                    {step.needsApproval && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                        <BadgeCheck size={10} /> approval
                      </span>
                    )}
                    {step.reversible && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                        <Undo2 size={10} /> reversible
                      </span>
                    )}
                  </div>
                  <p className="text-xs leading-5 text-slate-500">{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>
          {!plan.aiWritten && (
            <p className="mt-2 text-xs text-slate-400">Heuristic plan — connect Claude for a ticket-specific plan.</p>
          )}
        </div>
      )}

      {draft && (
        <div className="mt-3 rounded-lg border border-[#cfe0ef] bg-white p-3">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#0b5f91]">Suggested resolution</p>
            <button
              type="button"
              onClick={copyDraft}
              className="inline-flex h-7 items-center gap-1.5 rounded-md border border-black/10 bg-white px-2 text-xs font-semibold text-slate-600"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{draft.text}</p>
          {!draft.aiWritten && (
            <p className="mt-2 text-xs text-slate-400">Heuristic — connect Claude for an AI-written, ticket-specific draft.</p>
          )}
        </div>
      )}

      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Similar resolved tickets</p>
          {similarTickets.length > 0 ? (
            <ul className="space-y-1.5">
              {similarTickets.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/app/tickets/${t.id}`}
                    className="flex items-center gap-2 rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-xs transition hover:bg-[#f8fbfe]"
                  >
                    <span className="shrink-0 font-semibold text-[#0b5f91]">{t.ref}</span>
                    <span className="min-w-0 flex-1 truncate text-slate-600">{t.title}</span>
                    {t.similarity != null && <span className="shrink-0 text-slate-400">{t.similarity}%</span>}
                    <ArrowRight size={12} className="shrink-0 text-slate-400" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg border border-dashed border-black/15 px-2.5 py-2 text-xs text-slate-400">
              No similar resolved tickets yet.
            </p>
          )}
        </div>

        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Relevant knowledge</p>
          {suggestedArticles.length > 0 ? (
            <ul className="space-y-1.5">
              {suggestedArticles.map((a) => (
                <li key={a.id} className="rounded-lg border border-black/10 bg-white px-2.5 py-1.5">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <BookOpen size={12} className="shrink-0 text-[#0b5f91]" />
                    {a.title}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-slate-500">{a.snippet}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg border border-dashed border-black/15 px-2.5 py-2 text-xs text-slate-400">
              No matching knowledge articles.
            </p>
          )}
        </div>
      </div>

      {nothing && (
        <p className="mt-3 text-xs text-slate-400">
          As your team resolves more tickets and adds knowledge, suggestions here get sharper.
        </p>
      )}
    </div>
  );
}
