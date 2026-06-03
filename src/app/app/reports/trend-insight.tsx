"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { generateTrendInsight } from "@/app/app/reports/actions";

export function TrendInsight() {
  const [insight, setInsight] = useState<{ text: string; aiWritten: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  async function onGenerate() {
    setLoading(true);
    try {
      setInsight(await generateTrendInsight());
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-[#d8e4ee] bg-gradient-to-br from-[#f1f7ff] to-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-[#dbeafe] text-[#0b5f91]">
            <Sparkles size={15} />
          </span>
          <h2 className="text-sm font-semibold">AI insight</h2>
        </div>
        <button
          type="button"
          onClick={onGenerate}
          disabled={loading}
          className="inline-flex h-8 items-center gap-2 rounded-lg bg-[#0b2a4a] px-3 text-xs font-semibold text-white transition hover:bg-[#07111f] disabled:opacity-50"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {loading ? "Analyzing…" : insight ? "Regenerate" : "What changed this week?"}
        </button>
      </div>

      {insight ? (
        <p className="mt-3 text-sm leading-6 text-slate-700">
          {insight.text}
          {!insight.aiWritten && (
            <span className="mt-2 block text-xs text-slate-400">
              Heuristic summary — connect Claude on the Claude API page for an AI-written narrative.
            </span>
          )}
        </p>
      ) : (
        <p className="mt-3 text-sm text-slate-500">
          Get a plain-English read on what moved this week and why — generated from your own trends with your Claude key.
        </p>
      )}
    </div>
  );
}
