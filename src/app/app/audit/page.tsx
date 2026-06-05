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
    <main className="min-h-screen px-4 py-6 text-[#151914] md:px-8">
      <div className="mx-auto max-w-6xl">
        <PageHeader
          crumbs={[{ label: "Governance" }, { label: "Audit" }]}
          title="Audit"
          description="Replay workflow runs and review agent decisions."
        />

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Workflow runs" value={String(runs.length)} icon={Workflow} accent={CHIP[0]} />
          <MetricCard label="Replay snapshots" value={String(replayableRuns)} icon={ListRestart} accent={CHIP[1]} />
          <MetricCard label="Approvals logged" value={String(approvalEvents)} icon={ShieldCheck} accent={CHIP[2]} />
          <MetricCard label="Blocked actions" value={String(blockedEvents)} icon={CircleAlert} accent={CHIP[3]} />
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[300px_1fr]">
          <div>
            <Panel title="Run history" icon={FileClock}>
              <div className="space-y-2">
                {runs.map((run) => (
                  <Link
                    key={run.id}
                    href={`/app/audit?run=${run.id}`}
                    className={cn(
                      "block rounded-lg border p-3 transition",
                      selectedRun?.id === run.id
                        ? "border-[#0b2a4a] bg-[#f1f6fb]"
                        : "border-black/10 bg-white hover:bg-[#f5f8fc]",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold">{run.workflows?.name ?? "Workflow run"}</p>
                      <StatusPill status={run.status} />
                    </div>
                    <p className="mt-1 line-clamp-1 text-xs text-slate-500">
                      {run.tickets?.external_id ?? "Ticket"} · {run.tickets?.title ?? "No ticket title"}
                    </p>
                    <p className="mt-2 text-xs font-medium text-slate-400">
                      {formatDate(run.created_at)} · {Number(run.confidence ?? 0)}% confidence
                    </p>
                  </Link>
                ))}
                {runs.length === 0 && (
                  <p className="rounded-lg border border-dashed border-black/15 p-3 text-sm text-slate-500">
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
                  <div className="rounded-lg border border-[#d8e4ee] bg-[#f1f6fb] p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-xs font-medium text-slate-400">Selected run</p>
                        <h2 className="mt-0.5 text-base font-semibold text-[#0b1a2e]">{selectedRun.workflows?.name ?? "Workflow run"}</h2>
                        <p className="mt-1 text-sm leading-6 text-slate-500">
                          {selectedRun.tickets?.external_id ?? "Ticket"} · {selectedRun.tickets?.title ?? "No ticket title"}
                        </p>
                      </div>
                      <StatusPill status={selectedRun.status} />
                    </div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                      <Fact label="Confidence" value={`${Number(selectedRun.confidence ?? 0)}%`} />
                      <Fact label="Started" value={formatDate(selectedRun.started_at ?? selectedRun.created_at)} />
                      <Fact label="Snapshot" value={selectedRun.replay_snapshot?.replayable ? "Replayable" : "Recorded"} />
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {(steps ?? []).map((step, index) => (
                      <div key={step.id} className="grid grid-cols-[36px_1fr] gap-3">
                        <div className="flex flex-col items-center">
                          <span
                            className={cn(
                              "flex size-9 items-center justify-center rounded-lg border bg-white",
                              stepStyles[step.status] ?? "border-zinc-200 text-zinc-700",
                            )}
                          >
                            {step.status === "succeeded" ? (
                              <CheckCircle2 size={16} />
                            ) : step.status === "failed" || step.status === "blocked" ? (
                              <XCircle size={16} />
                            ) : (
                              <Clock3 size={16} />
                            )}
                          </span>
                          {index !== (steps ?? []).length - 1 && <span className="mt-1 h-10 w-px bg-black/10" />}
                        </div>
                        <div className="rounded-lg border border-black/10 bg-white p-3">
                          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                            <p className="text-sm font-semibold">{step.name}</p>
                            <span className="text-xs font-medium text-slate-400">
                              {step.actor_type} · {step.status}
                            </span>
                          </div>
                          <p className="mt-1 text-sm leading-6 text-slate-500">
                            {step.output?.detail ?? step.error_message ?? "Execution step recorded."}
                          </p>
                        </div>
                      </div>
                    ))}
                    {(steps ?? []).length === 0 && (
                      <p className="rounded-lg border border-dashed border-black/15 p-3 text-sm text-slate-500">
                        No replay steps are attached to this workflow run.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-black/15 p-3 text-sm text-slate-500">
                  Start a workflow to generate replay history.
                </p>
              )}
            </Panel>

            <section className="grid gap-5 lg:grid-cols-2">
              <Panel title="Run policies" icon={ShieldCheck}>
                <div className="space-y-2">
                  {(runPolicies ?? []).map((policy) => (
                    <div key={policy.id} className="rounded-lg border border-black/10 p-3">
                      <p className="text-sm font-semibold">{titleCase(policy.decision.replaceAll("_", " "))}</p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{policy.reason}</p>
                    </div>
                  ))}
                  {(runPolicies ?? []).length === 0 && (
                    <p className="rounded-lg border border-dashed border-black/15 p-3 text-sm text-slate-500">
                      No policy decisions tied to this run.
                    </p>
                  )}
                </div>
              </Panel>

              <Panel title="Execution actions" icon={GitBranch}>
                <div className="space-y-2">
                  {(actions ?? []).map((action) => (
                    <div key={action.id} className="rounded-lg border border-black/10 p-3">
                      <p className="text-sm font-semibold">{action.integration_key}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{action.action_key}</p>
                      <p className="mt-1.5 text-xs font-medium text-slate-400">{action.status}</p>
                    </div>
                  ))}
                  {(actions ?? []).length === 0 && (
                    <p className="rounded-lg border border-dashed border-black/15 p-3 text-sm text-slate-500">
                      Provider-level actions will appear when integrations return execution output.
                    </p>
                  )}
                </div>
              </Panel>
            </section>

            <Panel title="Audit stream" icon={Bot}>
              <div className="divide-y divide-black/[0.06] rounded-lg border border-black/10">
                {([...((runAudits ?? []).length ? runAudits ?? [] : auditRows)]).map((log) => (
                  <div key={log.id} className="grid gap-2 p-3 md:grid-cols-[96px_1fr]">
                    <span className="text-xs font-medium text-slate-400">{formatDate(log.created_at)}</span>
                    <div>
                      <p className="text-sm font-semibold">{log.event_summary}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {log.agents?.name ?? "TicketOS"} · {titleCase(log.event_type.replaceAll("_", " "))} ·{" "}
                        {log.tickets?.external_id ?? "workspace"}
                      </p>
                    </div>
                  </div>
                ))}
                {auditRows.length === 0 && (
                  <p className="p-3 text-sm text-slate-500">Audit events will appear as operators and agents act.</p>
                )}
              </div>
            </Panel>
          </div>
        </section>
      </div>
    </main>
  );
}

const CHIP = [
  "from-[#e0f2fe] to-[#dbeafe] text-[#0b5f91]",
  "from-[#ede9fe] to-[#fae8ff] text-[#7c3aed]",
  "from-[#dcfce7] to-[#d1fae5] text-[#0f7a5f]",
  "from-[#ffedd5] to-[#fef3c7] text-[#b45309]",
  "from-[#cffafe] to-[#ccfbf1] text-[#0e7490]",
  "from-[#fce7f3] to-[#fae8ff] text-[#a21caf]",
];

function MetricCard({
  label,
  value,
  icon: Icon,
  accent = CHIP[0],
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight">{value}</p>
        </div>
        <span className={`flex size-9 items-center justify-center rounded-lg bg-gradient-to-br ${accent}`}>
          <Icon size={17} />
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
      <div className="mb-3 flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-lg bg-[#e7f0ff] text-[#0b5f91]">
          <Icon size={15} />
        </span>
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const className =
    status === "running"
      ? "border-sky-200 bg-sky-50 text-sky-700"
      : status === "succeeded"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : status === "blocked" || status === "failed"
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-zinc-200 bg-zinc-50 text-zinc-700";

  return <span className={cn("shrink-0 rounded-md border px-2 py-0.5 text-xs font-semibold", className)}>{status}</span>;
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-black/10 bg-white p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-700">{value}</p>
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
