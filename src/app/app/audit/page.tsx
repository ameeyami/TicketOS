import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Bot,
  CheckCircle2,
  CircleAlert,
  Clock3,
  FileClock,
  GitBranch,
  ListRestart,
  ShieldCheck,
  Workflow,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const stepStyles: Record<string, string> = {
  succeeded: "border-emerald-200 bg-emerald-50 text-emerald-700",
  running: "border-sky-200 bg-sky-50 text-sky-700",
  pending: "border-zinc-200 bg-zinc-50 text-zinc-700",
  blocked: "border-rose-200 bg-rose-50 text-rose-700",
  failed: "border-rose-200 bg-rose-50 text-rose-700",
};

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ run?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect("/auth/sign-in?message=Sign in to review audit and workflow replay.");
  }

  const organization = await ensureWorkspace(supabase, userData.user);
  const params = await searchParams;

  const [{ data: workflowRuns }, { data: auditLogs }] = await Promise.all([
    supabase
      .from("workflow_runs")
      .select("*, workflows(name), tickets(id, external_id, title, status), workflow_versions(graph)")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("audit_logs")
      .select("*, agents(name), tickets(external_id, title)")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const runs = workflowRuns ?? [];
  const selectedRun = runs.find((run) => run.id === params.run) ?? runs[0] ?? null;

  const [{ data: steps }, { data: actions }, { data: runPolicies }, { data: runAudits }] = selectedRun
    ? await Promise.all([
        supabase
          .from("workflow_run_steps")
          .select("*")
          .eq("workflow_run_id", selectedRun.id)
          .order("created_at"),
        supabase
          .from("execution_actions")
          .select("*")
          .eq("workflow_run_id", selectedRun.id)
          .order("created_at"),
        supabase
          .from("policy_evaluations")
          .select("*, policy_rules(name)")
          .eq("workflow_run_id", selectedRun.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("audit_logs")
          .select("*, agents(name), tickets(external_id, title)")
          .eq("workflow_run_id", selectedRun.id)
          .order("created_at", { ascending: false }),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];

  const auditRows = auditLogs ?? [];
  const blockedEvents = auditRows.filter((log) => ["blocked", "ticket_blocked"].includes(log.event_type)).length;
  const approvalEvents = auditRows.filter((log) => log.event_type.includes("approval")).length;
  const replayableRuns = runs.filter((run) => Boolean(run.replay_snapshot && Object.keys(run.replay_snapshot).length)).length;

  return (
    <main className="min-h-screen bg-[#fbfaf8] px-4 py-5 text-[#151914] md:px-8">
      <div className="mx-auto max-w-6xl">
        <PageHeader
          crumbs={[{ label: "Governance" }, { label: "Audit" }]}
          title="Audit"
          description="Replay workflow runs and review agent decisions."
        />

        <section className="mt-5 grid gap-3 md:grid-cols-4">
          <MetricCard label="Workflow runs" value={String(runs.length)} icon={Workflow} />
          <MetricCard label="Replay snapshots" value={String(replayableRuns)} icon={ListRestart} />
          <MetricCard label="Approvals logged" value={String(approvalEvents)} icon={ShieldCheck} />
          <MetricCard label="Blocked actions" value={String(blockedEvents)} icon={CircleAlert} />
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[340px_1fr]">
          <div>
            <Panel title="Run history" icon={FileClock}>
              <div className="space-y-3">
                {runs.map((run) => (
                  <Link
                    key={run.id}
                    href={`/app/audit?run=${run.id}`}
                    className={cn(
                      "block rounded-lg border p-4 transition hover:bg-[#f8faf5]",
                      selectedRun?.id === run.id ? "border-[#2f6f60] bg-[#f8faf5]" : "border-black/10 bg-white",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{run.workflows?.name ?? "Workflow run"}</p>
                        <p className="mt-1 text-sm text-black/52">
                          {run.tickets?.external_id ?? "Ticket"} · {run.tickets?.title ?? "No ticket title"}
                        </p>
                      </div>
                      <StatusPill status={run.status} />
                    </div>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-black/38">
                      {formatDate(run.created_at)} · {Number(run.confidence ?? 0)}% confidence
                    </p>
                  </Link>
                ))}
                {runs.length === 0 && (
                  <p className="rounded-lg border border-dashed border-black/15 bg-[#f8faf5] p-4 text-sm text-black/48">
                    Workflow runs will appear here after a workflow is started.
                  </p>
                )}
              </div>
            </Panel>
          </div>

          <div className="space-y-5">
            <Panel title="Workflow replay" icon={ListRestart}>
              {selectedRun ? (
                <div>
                  <div className="rounded-lg border border-black/10 bg-[#111713] p-5 text-white">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-sm text-white/48">Selected run</p>
                        <h2 className="mt-1 text-xl font-semibold">{selectedRun.workflows?.name ?? "Workflow run"}</h2>
                        <p className="mt-2 text-sm leading-6 text-white/62">
                          {selectedRun.tickets?.external_id ?? "Ticket"} · {selectedRun.tickets?.title ?? "No ticket title"}
                        </p>
                      </div>
                      <StatusPill status={selectedRun.status} dark />
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      <DarkFact label="Confidence" value={`${Number(selectedRun.confidence ?? 0)}%`} />
                      <DarkFact label="Started" value={formatDate(selectedRun.started_at ?? selectedRun.created_at)} />
                      <DarkFact label="Snapshot" value={selectedRun.replay_snapshot?.replayable ? "Replayable" : "Recorded"} />
                    </div>
                  </div>

                  <div className="mt-5 space-y-4">
                    {(steps ?? []).map((step, index) => (
                      <div key={step.id} className="grid grid-cols-[40px_1fr] gap-4">
                        <div className="flex flex-col items-center">
                          <span
                            className={cn(
                              "flex size-10 items-center justify-center rounded-lg border bg-white",
                              stepStyles[step.status] ?? "border-zinc-200 text-zinc-700",
                            )}
                          >
                            {step.status === "succeeded" ? (
                              <CheckCircle2 size={18} />
                            ) : step.status === "failed" || step.status === "blocked" ? (
                              <XCircle size={18} />
                            ) : (
                              <Clock3 size={18} />
                            )}
                          </span>
                          {index !== (steps ?? []).length - 1 && <span className="mt-2 h-12 w-px bg-black/10" />}
                        </div>
                        <div className="rounded-lg border border-black/10 bg-white p-4">
                          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                            <p className="font-semibold">{step.name}</p>
                            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-black/38">
                              {step.actor_type} · {step.status}
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-black/55">
                            {step.output?.detail ?? step.error_message ?? "Execution step recorded."}
                          </p>
                        </div>
                      </div>
                    ))}
                    {(steps ?? []).length === 0 && (
                      <p className="rounded-lg border border-dashed border-black/15 bg-[#f8faf5] p-4 text-sm text-black/48">
                        No replay steps are attached to this workflow run.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-black/15 bg-[#f8faf5] p-4 text-sm text-black/48">
                  Start a workflow to generate replay history.
                </p>
              )}
            </Panel>

            <section className="grid gap-5 lg:grid-cols-2">
              <Panel title="Run policies" icon={ShieldCheck}>
                <div className="space-y-3">
                  {(runPolicies ?? []).map((policy) => (
                    <div key={policy.id} className="rounded-lg border border-black/10 p-4">
                      <p className="font-semibold">{titleCase(policy.decision.replaceAll("_", " "))}</p>
                      <p className="mt-1 text-sm leading-6 text-black/55">{policy.reason}</p>
                    </div>
                  ))}
                  {(runPolicies ?? []).length === 0 && (
                    <p className="rounded-lg border border-dashed border-black/15 p-4 text-sm text-black/48">
                      No policy decisions tied to this run.
                    </p>
                  )}
                </div>
              </Panel>

              <Panel title="Execution actions" icon={GitBranch}>
                <div className="space-y-3">
                  {(actions ?? []).map((action) => (
                    <div key={action.id} className="rounded-lg border border-black/10 p-4">
                      <p className="font-semibold">{action.integration_key}</p>
                      <p className="mt-1 text-sm text-black/52">{action.action_key}</p>
                      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-black/38">
                        {action.status}
                      </p>
                    </div>
                  ))}
                  {(actions ?? []).length === 0 && (
                    <p className="rounded-lg border border-dashed border-black/15 p-4 text-sm text-black/48">
                      Provider-level actions will appear when integrations return execution output.
                    </p>
                  )}
                </div>
              </Panel>
            </section>

            <Panel title="Audit stream" icon={Bot}>
              <div className="divide-y divide-black/8 rounded-lg border border-black/10">
                {([...((runAudits ?? []).length ? runAudits ?? [] : auditRows)]).map((log) => (
                  <div key={log.id} className="grid gap-3 p-3 md:grid-cols-[100px_1fr]">
                    <span className="text-xs font-semibold text-black/42">{formatDate(log.created_at)}</span>
                    <div>
                      <p className="font-semibold">{log.event_summary}</p>
                      <p className="mt-1 text-sm text-black/50">
                        {log.agents?.name ?? "TicketOS"} · {titleCase(log.event_type.replaceAll("_", " "))} ·{" "}
                        {log.tickets?.external_id ?? "workspace"}
                      </p>
                    </div>
                  </div>
                ))}
                {auditRows.length === 0 && (
                  <p className="p-4 text-sm text-black/48">Audit events will appear as operators and agents act.</p>
                )}
              </div>
            </Panel>
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-black/52">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
        </div>
        <span className="flex size-8 items-center justify-center rounded-lg bg-[#eef5ea] text-[#2e6658]">
          <Icon size={16} />
        </span>
      </div>
    </div>
  );
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-[#eef5ea] text-[#2e6658]">
          <Icon size={16} />
        </span>
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function StatusPill({ status, dark = false }: { status: string; dark?: boolean }) {
  const className =
    status === "running"
      ? dark
        ? "border-sky-300/30 bg-sky-300/12 text-sky-100"
        : "border-sky-200 bg-sky-50 text-sky-700"
      : status === "succeeded"
        ? dark
          ? "border-emerald-300/30 bg-emerald-300/12 text-emerald-100"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
        : status === "blocked" || status === "failed"
          ? dark
            ? "border-rose-300/30 bg-rose-300/12 text-rose-100"
            : "border-rose-200 bg-rose-50 text-rose-700"
          : dark
            ? "border-white/15 bg-white/8 text-white/72"
            : "border-zinc-200 bg-zinc-50 text-zinc-700";

  return <span className={cn("rounded-md border px-2 py-1 text-xs font-semibold", className)}>{status}</span>;
}

function DarkFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[.06] p-3">
      <p className="text-xs text-white/38">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Not recorded";
  }

  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function titleCase(value: string) {
  return value
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
