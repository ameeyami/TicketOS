import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Play, ShieldCheck, Workflow } from "lucide-react";
import { runWorkflow } from "@/app/app/workflows/actions";
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
  const [{ data: workflows }, { data: runs }, { data: policies }] = await Promise.all([
    supabase.from("workflows").select("*").eq("organization_id", organization.id).order("created_at"),
    supabase
      .from("workflow_runs")
      .select("*, workflows(name), tickets(external_id, title)")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase.from("policy_rules").select("*").eq("organization_id", organization.id).order("created_at"),
  ]);

  return (
    <main className="min-h-screen bg-[#f6f7f2] px-4 py-6 text-[#151914] md:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/app"
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-black/10 bg-white px-3 text-sm font-semibold"
        >
          <ArrowLeft size={16} />
          Command center
        </Link>

        <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#47685d]">Workflow library</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">Run governed IT workflows.</h1>
          </div>
          <div className="rounded-lg border border-black/10 bg-white px-4 py-3 text-sm font-semibold">
            {organization.name}
          </div>
        </div>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_.8fr]">
          <div className="space-y-4">
            {(workflows ?? []).map((workflow) => (
              <div key={workflow.id} className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex gap-4">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#eef5ea] text-[#2e6658]">
                      <Workflow size={20} />
                    </span>
                    <div>
                      <h2 className="text-lg font-semibold">{workflow.name}</h2>
                      <p className="mt-1 text-sm leading-6 text-black/55">{workflow.description}</p>
                      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-black/38">
                        Trigger: {workflow.trigger_type}
                      </p>
                    </div>
                  </div>
                  <form action={runWorkflow}>
                    <input type="hidden" name="workflowId" value={workflow.id} />
                    <input type="hidden" name="organizationId" value={organization.id} />
                    <PendingButton
                      pendingText="Starting..."
                      className="h-10 rounded-lg bg-[#17211c] px-3 text-sm font-semibold text-white"
                    >
                      <Play size={16} />
                      Run workflow
                    </PendingButton>
                  </form>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-6">
            <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-[#2f6f60]" />
                <h2 className="text-lg font-semibold">Policy rules</h2>
              </div>
              <div className="mt-4 space-y-3">
                {(policies ?? []).length > 0 ? (
                  policies?.map((policy) => (
                    <div key={policy.id} className="rounded-lg border border-black/10 p-4">
                      <p className="font-semibold">{policy.name}</p>
                      <p className="mt-1 text-sm text-black/52">{policy.description}</p>
                    </div>
                  ))
                ) : (
                  <p className="rounded-lg border border-dashed border-black/15 bg-[#f8faf5] p-4 text-sm text-black/48">
                    No custom policy rules yet. Default guardrails are still active.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold">Recent workflow runs</h2>
              <div className="mt-4 space-y-3">
                {(runs ?? []).map((run) => (
                  <div key={run.id} className="rounded-lg border border-black/10 p-4">
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
