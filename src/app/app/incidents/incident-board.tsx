"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Loader2, Radar, Sparkles } from "lucide-react";
import { analyzeCluster, declareIncident } from "@/app/app/incidents/actions";
import { PendingButton } from "@/components/ui/pending-button";
import type { IncidentAnalysis } from "@/lib/ai/incident";

export type ClusterDTO = {
  id: string;
  theme: string;
  topCategory: string | null;
  topPriority: string;
  windowLabel: string;
  tickets: Array<{ id: string; ref: string; title: string; priority: string }>;
};

const SEVERITY_STYLE: Record<string, string> = {
  sev1: "border-rose-200 bg-rose-50 text-rose-700",
  sev2: "border-amber-200 bg-amber-50 text-amber-800",
  sev3: "border-sky-200 bg-sky-50 text-sky-700",
};

export function IncidentBoard({ clusters }: { clusters: ClusterDTO[] }) {
  if (clusters.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-black/15 bg-white p-10 text-center">
        <Radar size={28} className="mx-auto text-[#0b5f91]" />
        <p className="mt-3 font-semibold">No incident spikes detected.</p>
        <p className="mt-1 text-sm text-slate-500">
          When several similar tickets arrive in a short window, TicketOS clusters them here and offers to declare a
          major incident with a runbook.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {clusters.map((cluster) => (
        <ClusterCard key={cluster.id} cluster={cluster} />
      ))}
    </div>
  );
}

function ClusterCard({ cluster }: { cluster: ClusterDTO }) {
  const [analysis, setAnalysis] = useState<IncidentAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  async function onAnalyze() {
    setLoading(true);
    try {
      const result = await analyzeCluster(cluster.tickets.map((t) => t.id));
      setAnalysis(result);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-1 text-xs font-bold text-amber-800">
              <AlertTriangle size={13} />
              {cluster.tickets.length} similar tickets
            </span>
            {cluster.topCategory && (
              <span className="rounded-md border border-black/10 bg-[#f5f8fc] px-2 py-0.5 text-xs font-semibold text-slate-600">
                {cluster.topCategory}
              </span>
            )}
            <span className="text-xs text-slate-500">{cluster.windowLabel}</span>
          </div>
          <p className="mt-1.5 text-sm text-slate-600">
            Shared theme: <span className="font-medium text-slate-800">{cluster.theme}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={onAnalyze}
          disabled={loading}
          className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-[#0b2a4a] bg-white px-3 text-sm font-semibold text-[#0b2a4a] transition hover:bg-[#f1f7ff] disabled:opacity-50"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
          {loading ? "Analyzing…" : analysis ? "Re-analyze" : "Analyze with AI"}
        </button>
      </div>

      {/* the clustered tickets */}
      <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {cluster.tickets.map((t) => (
          <li key={t.id}>
            <Link
              href={`/app/tickets/${t.id}`}
              className="flex items-center gap-2 rounded-lg border border-black/10 bg-[#f8fbfe] px-2.5 py-1.5 text-xs transition hover:bg-white"
            >
              <span className="shrink-0 font-semibold text-[#0b5f91]">{t.ref}</span>
              <span className="truncate text-slate-600">{t.title}</span>
            </Link>
          </li>
        ))}
      </ul>

      {analysis && (
        <div className="mt-4 rounded-xl border border-[#d8e4ee] bg-[#f8fbfe] p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-md border px-2 py-0.5 text-xs font-bold uppercase ${SEVERITY_STYLE[analysis.severity] ?? SEVERITY_STYLE.sev2}`}>
              {analysis.severity}
            </span>
            <h3 className="text-sm font-semibold">{analysis.title}</h3>
            {!analysis.isIncident && (
              <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-500">
                AI thinks these may be unrelated
              </span>
            )}
            {!analysis.aiWritten && (
              <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-500">
                Heuristic — connect Claude for AI analysis
              </span>
            )}
          </div>

          {analysis.impact && <p className="mt-2 text-sm text-slate-600">{analysis.impact}</p>}
          {analysis.rootCauseHypothesis && (
            <p className="mt-2 text-sm text-slate-600">
              <span className="font-semibold text-slate-700">Likely cause: </span>
              {analysis.rootCauseHypothesis}
            </p>
          )}

          {analysis.runbook.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0b5f91]">Runbook</p>
              <ol className="mt-2 space-y-1.5">
                {analysis.runbook.map((step, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-700">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#0b2a4a] text-[10px] font-bold text-white">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}

          <form action={declareIncident} className="mt-4 flex items-center gap-2 border-t border-[#d8e4ee] pt-3">
            <input type="hidden" name="title" value={analysis.title} />
            <input type="hidden" name="impact" value={analysis.impact} />
            <input type="hidden" name="severity" value={analysis.severity} />
            <input type="hidden" name="rootCause" value={analysis.rootCauseHypothesis} />
            <input type="hidden" name="runbook" value={JSON.stringify(analysis.runbook)} />
            <input type="hidden" name="ticketIds" value={JSON.stringify(cluster.tickets.map((t) => t.id))} />
            <PendingButton
              pendingText="Declaring…"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#0b2a4a] px-3 text-sm font-semibold text-white transition hover:bg-[#07111f]"
            >
              <AlertTriangle size={15} />
              Declare major incident
              <ArrowRight size={14} />
            </PendingButton>
            <span className="text-xs text-slate-500">Creates a parent ticket, links these {cluster.tickets.length}, and saves the runbook.</span>
          </form>
        </div>
      )}
    </section>
  );
}
