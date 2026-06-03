"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, CheckCircle2, Send, Sparkles, ThumbsUp } from "lucide-react";
import { askKnowledge, escalateQuery, markResolved, type AskResult } from "@/app/app/ask/actions";

export function AskAssistant() {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AskResult | null>(null);
  const [outcome, setOutcome] = useState<"resolved" | null>(null);
  const [busy, setBusy] = useState(false);

  async function onAsk(event: React.FormEvent) {
    event.preventDefault();
    if (!question.trim() || loading) return;
    setLoading(true);
    setOutcome(null);
    setResult(null);
    try {
      setResult(await askKnowledge(question));
    } catch {
      setResult({ answer: "Something went wrong. Please try again or create a ticket.", sources: [], queryId: null, grounded: false });
    } finally {
      setLoading(false);
    }
  }

  async function onHelped() {
    if (!result?.queryId || busy) return;
    setBusy(true);
    try {
      await markResolved(result.queryId);
      setOutcome("resolved");
    } finally {
      setBusy(false);
    }
  }

  async function onEscalate() {
    if (busy) return;
    setBusy(true);
    try {
      if (result?.queryId) await escalateQuery(result.queryId);
    } finally {
      router.push(`/app/tickets/new?title=${encodeURIComponent(question)}`);
    }
  }

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm md:p-6">
      <form onSubmit={onAsk} className="flex flex-col gap-3 sm:flex-row">
        <div className="flex min-w-0 flex-1 items-start gap-2 rounded-xl border border-[#d8e4ee] bg-[#f8fbfe] px-3 py-2.5">
          <Sparkles size={16} className="mt-0.5 shrink-0 text-[#0b5f91]" />
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={2}
            placeholder="Ask anything — e.g. How do I reset my Okta password? How do I get access to Figma?"
            className="min-w-0 flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-black/35"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0b2a4a] px-4 text-sm font-semibold text-white transition hover:bg-[#07111f] disabled:opacity-50 sm:self-start"
        >
          <Send size={15} />
          {loading ? "Thinking…" : "Ask"}
        </button>
      </form>

      {result && (
        <div className="mt-5 border-t border-black/[0.06] pt-5">
          <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{result.answer}</p>

          {result.sources.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-400">Sources:</span>
              {result.sources.map((s) => (
                <span key={s.id} className="inline-flex items-center gap-1.5 rounded-md border border-black/10 bg-[#f5f8fc] px-2 py-1 text-xs font-medium text-slate-600">
                  <BookOpen size={12} className="text-[#0b5f91]" />
                  {s.title}
                </span>
              ))}
            </div>
          )}

          {outcome === "resolved" ? (
            <div className="mt-5 inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
              <CheckCircle2 size={16} />
              Glad that helped — marked resolved without a ticket.
            </div>
          ) : (
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
              <p className="text-sm font-medium text-slate-500">Did this resolve your request?</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={onHelped}
                  disabled={busy}
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#0b2a4a] px-3 text-sm font-semibold text-white transition hover:bg-[#07111f] disabled:opacity-50"
                >
                  <ThumbsUp size={14} />
                  Yes, that helped
                </button>
                <button
                  onClick={onEscalate}
                  disabled={busy}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-black/10 bg-white px-3 text-sm font-semibold text-[#0b2a4a] transition hover:bg-black/[0.04] disabled:opacity-50"
                >
                  Still need help — create a ticket
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
