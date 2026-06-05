"use client";

import { useState } from "react";
import { ArrowRight, CircleAlert, GitBranch, Sparkles } from "lucide-react";
import { createWorkflowFromDraft, generateWorkflowDraft } from "@/app/app/workflows/actions";
import { PendingButton } from "@/components/ui/pending-button";
import type { GeneratedWorkflow } from "@/lib/ai/workflow-gen";

const EXAMPLES = [
  "When a new employee joins Marketing, create Google Workspace, Slack, and Jira access after manager approval.",
  "When someone reports a lost laptop, lock the device, revoke sessions, and open a security review.",
  "Reset a user's Okta password after verifying identity, then notify them.",
];

export function WorkflowGenerator({ organizationId, initialDescription = "" }: { organizationId: string; initialDescription?: string }) {
  const [description, setDescription] = useState(initialDescription);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [draft, setDraft] = useState<GeneratedWorkflow | null>(null);
  const [name, setName] = useState("");

  async function onGenerate(event: React.FormEvent) {
    event.preventDefault();
    if (!description.trim() || loading) return;
    setLoading(true);
    setError(null);
    setNote(null);
    setDraft(null);
    try {
      const result = await generateWorkflowDraft(description);
      if (result.ok && result.draft) {
        setDraft(result.draft);
        setName(result.draft.name);
        setNote(result.note ?? null);
      } else {
        setError(result.error ?? "Couldn't generate a workflow.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm md:p-6">
      <div className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-[#e7f0ff] text-[#0b5f91]">
          <Sparkles size={17} />
        </span>
        <h2 className="text-base font-semibold">Describe it in plain English</h2>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Tell TicketOS what should happen and it drafts a governed workflow graph — review it, then save.
      </p>

      <form onSubmit={onGenerate} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="e.g. When a new employee joins Marketing, create Google Workspace, Slack and Jira access after manager approval."
          className="min-w-0 flex-1 resize-none rounded-xl border border-[#d8e4ee] bg-[#f8fbfe] px-3 py-2.5 text-sm outline-none focus:border-[#0b2a4a]"
        />
        <button
          type="submit"
          disabled={loading || !description.trim()}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0b2a4a] px-4 text-sm font-semibold text-white transition hover:bg-[#07111f] disabled:opacity-50 sm:self-start"
        >
          <Sparkles size={15} />
          {loading ? "Drafting…" : "Generate"}
        </button>
      </form>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => setDescription(ex)}
            className="rounded-full border border-black/10 bg-[#f5f8fc] px-2.5 py-1 text-xs text-slate-500 transition hover:bg-white hover:text-slate-700"
          >
            {ex.length > 48 ? `${ex.slice(0, 48)}…` : ex}
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <CircleAlert size={15} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}

      {draft && (
        <div className="mt-5 rounded-xl border border-[#d8e4ee] bg-[#f8fbfe] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0b5f91]">Draft workflow</p>

          {note && <p className="mt-2 text-xs text-slate-500">{note}</p>}

          {/* step flow */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {draft.nodes.map((node, index) => (
              <span key={`${node}-${index}`} className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700">
                  <span className="flex size-4 items-center justify-center rounded-full bg-[#0b2a4a] text-[9px] font-bold text-white">
                    {index + 1}
                  </span>
                  {node.replaceAll("_", " ")}
                </span>
                {index < draft.nodes.length - 1 && <ArrowRight size={13} className="text-slate-400" />}
              </span>
            ))}
          </div>

          <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <GitBranch size={13} />
            {draft.nodes.length} steps · trigger: {draft.trigger_type.replaceAll("_", " ")} · {draft.description}
          </p>

          <form action={createWorkflowFromDraft} className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
            <input type="hidden" name="organizationId" value={organizationId} />
            <input type="hidden" name="description" value={draft.description} />
            <input type="hidden" name="triggerType" value={draft.trigger_type} />
            <input type="hidden" name="nodes" value={JSON.stringify(draft.nodes)} />
            <input type="hidden" name="edges" value={JSON.stringify(draft.edges)} />
            <label className="block flex-1">
              <span className="mb-1 block text-xs font-semibold text-slate-500">Workflow name</span>
              <input
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-10 w-full rounded-lg border border-black/10 bg-white px-3 text-sm font-medium outline-none focus:border-[#0b2a4a]"
              />
            </label>
            <PendingButton
              pendingText="Saving…"
              className="h-10 shrink-0 rounded-lg bg-[#0b2a4a] px-4 text-sm font-semibold text-white transition hover:bg-[#07111f]"
            >
              Save workflow
            </PendingButton>
          </form>
        </div>
      )}
    </section>
  );
}
