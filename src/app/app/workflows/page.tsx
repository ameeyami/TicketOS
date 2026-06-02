import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Play, Plus, ShieldCheck, Workflow } from "lucide-react";
import { runWorkflow } from "@/app/app/workflows/actions";
import { PageHeader } from "@/components/dashboard/page-header";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PendingButton } from "@/components/ui/pending-button";

export default async function WorkflowsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect("/auth/sign-in?message=Sign in to manage workflows.");
  }

  const organization = await ensureWorkspace(supabase, userData.user);
  const [{ data: workflows }, { data: runs }, { data: policies }, { data: tickets }] = await Promise.all([
    supabase.from("workflows").select("*").eq("organization_id", organization.id).order("created_at"),
    supabase
      .from("workflow_runs")
      .select("*, workflows(name), tickets(external_id, title)")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase.from("policy_rules").select("*").eq("organization_id", organization.id).order("created_at"),
    supabase
      .from("tickets")
      .select("id, external_id, title, status")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  return (
    <main className="min-h-screen bg-[#f4f8fb] px-4 py-5 text-[#07111f] md:px-8">
      <div className="mx-auto max-w-6xl">
        <PageHeader
          crumbs={[{ label: "IT" }, { label: "Workflows" }]}
          title="Workflows"
          description="Run a governed automation against a ticket — the agent executes each provider step, gated by policy and earned autonomy, and every action stays reversible."
          actions={
            <Link
              href="/app/workflows/new"
              className="inline-flex h-10 items-center gap-2 rounded-md bg-[#0b2a4a] px-3 text-sm font-semibold text-white"
            >
              <Plus size={16} />
              New workflow
            </Link>
          }
        />

        <section className="mt-5 grid gap-5 lg:grid-cols-[1fr_340px]">
          <div className="space-y-4">
            {(workflows ?? []).map((workflow) => (
              <div key={workflow.id} className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#e7f3ff] text-[#0b5f91]">
                      <Workflow size={18} />
                    </span>
                    <div>
                      <h2 className="text-lg font-semibold">{workflow.name}</h2>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{workflow.description}</p>
                      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Trigger: {workflow.trigger_type}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/app/workflows/${workflow.id}`}
                      className="inline-flex h-9 items-center gap-2 rounded-md border border-black/10 px-3 text-sm font-semibold"
                    >
                      Designer
                      <ArrowRight size={15} />
                    </Link>
                  </div>
                </div>
                <RunWorkflowForm
                  workflowId={workflow.id}
                  organizationId={organization.id}
                  tickets={tickets ?? []}
                />
              </div>
            ))}
          </div>

          <div className="space-y-5">
            <div className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <ShieldCheck size={17} className="text-[#0b5f91]" />
                <h2 className="font-semibold">Policy rules</h2>
              </div>
              <div className="mt-4 space-y-3">
                {(policies ?? []).length > 0 ? (
                  policies?.map((policy) => (
                    <div key={policy.id} className="rounded-md border border-black/10 p-3">
                      <p className="font-semibold">{policy.name}</p>
                      <p className="mt-1 text-sm text-black/52">{policy.description}</p>
                    </div>
                  ))
                ) : (
                  <p className="rounded-lg border border-dashed border-black/15 bg-[#f5f8fc] p-4 text-sm text-black/48">
                    No custom policy rules yet.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
              <h2 className="font-semibold">Recent runs</h2>
              <div className="mt-4 space-y-3">
                {(runs ?? []).map((run) => (
                  <div key={run.id} className="rounded-md border border-black/10 p-3">
                    <p className="font-semibold">{run.workflows?.name ?? "Workflow run"}</p>
                    <p className="mt-1 text-sm text-black/52">
                      {run.tickets?.external_id ?? "Ticket"} · {run.tickets?.title ?? "No ticket title"}
                    </p>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-black/38">
                      {run.status} · {Number(run.confidence)}% confidence
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function RunWorkflowForm({
  workflowId,
  organizationId,
  tickets,
}: {
  workflowId: string;
  organizationId: string;
  tickets: Array<{ id: string; external_id: string | null; title: string; status: string }>;
}) {
  return (
    <form action={runWorkflow} className="mt-4 grid gap-3 rounded-lg border border-[#d8e4ee] bg-[#f8fbfe] p-3 md:grid-cols-[1fr_1fr_auto]">
      <input type="hidden" name="workflowId" value={workflowId} />
      <input type="hidden" name="organizationId" value={organizationId} />
      <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        Ticket
        <select
          name="ticketId"
          className="mt-2 h-10 w-full rounded-md border border-[#d8e4ee] bg-white px-3 text-sm normal-case tracking-normal text-[#07111f] outline-none focus:border-[#0b5f91]"
          required
        >
          <option value="">Choose ticket</option>
          {tickets.map((ticket) => (
            <option key={ticket.id} value={ticket.id}>
              {ticket.external_id ?? "Ticket"} - {ticket.title}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        Note
        <input
          name="note"
          className="mt-2 h-10 w-full rounded-md border border-[#d8e4ee] bg-white px-3 text-sm normal-case tracking-normal text-[#07111f] outline-none focus:border-[#0b5f91]"
          placeholder="Optional operator note"
        />
      </label>
      <div className="flex items-end">
        <PendingButton
          pendingText="Starting..."
          className="h-10 w-full rounded-md bg-[#0b2a4a] px-3 text-sm font-semibold text-white md:w-auto"
        >
          <Play size={16} />
          Run
        </PendingButton>
      </div>
    </form>
  );
}
