import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Ban,
  Bot,
  CheckCircle2,
  CirclePause,
  Clock3,
  GitBranch,
  Play,
  ScanSearch,
  ShieldCheck,
  Undo2,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { runWorkflow, updateWorkflowStatus } from "@/app/app/workflows/actions";
import { PendingButton } from "@/components/ui/pending-button";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { computeBlastRadius, type PlannedAction } from "@/lib/workflow-action-plan";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type WorkflowGraph = {
  nodes: string[];
  edges: string[];
  template?: string;
};

export default async function WorkflowDetailPage({
  params,
}: {
  params: Promise<{ workflowId: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect("/auth/sign-in?message=Sign in to inspect workflow design.");
  }

  const organization = await ensureWorkspace(supabase, userData.user);
  const { workflowId } = await params;

  const { data: workflow, error: workflowError } = await supabase
    .from("workflows")
    .select("*")
    .eq("id", workflowId)
    .eq("organization_id", organization.id)
    .maybeSingle();

  if (workflowError) {
    throw workflowError;
  }

  if (!workflow) {
    notFound();
  }

  const [{ data: versions }, { data: runs }, { data: policies }, { data: audits }, { data: tickets }] = await Promise.all([
    supabase
      .from("workflow_versions")
      .select("*")
      .eq("workflow_id", workflow.id)
      .order("version", { ascending: false }),
    supabase
      .from("workflow_runs")
      .select("*, tickets(id, external_id, title, status)")
      .eq("workflow_id", workflow.id)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("policy_evaluations")
      .select("*, tickets(external_id, title)")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("audit_logs")
      .select("*, tickets(external_id, title)")
      .eq("organization_id", organization.id)
      .in("event_type", ["workflow_created", "workflow_started", "workflow_activated", "workflow_paused"])
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("tickets")
      .select("id, external_id, title, status")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  const latestVersion = versions?.[0] ?? null;
  const graph = readGraph(latestVersion?.graph);
  const blastRadius = computeBlastRadius(workflow.trigger_type);
  const runRows = runs ?? [];
  const activeRuns = runRows.filter((run) => ["queued", "running", "waiting_for_approval"].includes(run.status)).length;
  const avgConfidence = runRows.length
    ? Math.round(runRows.reduce((sum, run) => sum + Number(run.confidence ?? 0), 0) / runRows.length)
    : 0;

  return (
    <main className="min-h-screen px-4 py-6 text-[#151914] md:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/app/workflows"
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-black/10 bg-white px-3 text-sm font-semibold"
        >
          <ArrowLeft size={16} />
          Workflow library
        </Link>

        <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#47685d]">Workflow designer</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">{workflow.name}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-black/56">{workflow.description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge active={workflow.is_active} />
            <form action={updateWorkflowStatus}>
              <input type="hidden" name="workflowId" value={workflow.id} />
              <input type="hidden" name="organizationId" value={organization.id} />
              <input type="hidden" name="isActive" value={workflow.is_active ? "false" : "true"} />
              <PendingButton
                pendingText={workflow.is_active ? "Pausing..." : "Activating..."}
                className="h-10 rounded-lg border border-black/10 bg-white px-3 text-sm font-semibold"
              >
                {workflow.is_active ? <CirclePause size={16} /> : <CheckCircle2 size={16} />}
                {workflow.is_active ? "Pause" : "Activate"}
              </PendingButton>
            </form>
          </div>
        </div>

        <section className="mt-6 grid gap-3 md:grid-cols-4">
          <MetricCard label="Versions" value={String(versions?.length ?? 0)} icon={GitBranch} />
          <MetricCard label="Runs" value={String(runRows.length)} icon={Workflow} />
          <MetricCard label="Active runs" value={String(activeRuns)} icon={Clock3} />
          <MetricCard label="Avg confidence" value={`${avgConfidence}%`} icon={Bot} />
        </section>

        <section className="mt-6 rounded-xl border border-black/10 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Start a governed run</h2>
              <p className="mt-1 text-sm text-black/52">
                Preview the exact blast radius below, then choose the ticket this workflow runs against.
              </p>
            </div>
          </div>
          <BlastRadiusPreview blastRadius={blastRadius} />
          <RunWorkflowForm workflowId={workflow.id} organizationId={organization.id} tickets={tickets ?? []} />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.08fr_.92fr]">
          <Panel title="Execution graph" icon={GitBranch}>
            <div className="rounded-lg border border-black/10 bg-[#0b2a4a] p-5 text-white">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md border border-white/10 bg-white/8 px-2 py-1 text-xs font-semibold text-white/62">
                  {workflow.trigger_type}
                </span>
                {graph.template && (
                  <span className="rounded-md border border-white/10 bg-white/8 px-2 py-1 text-xs font-semibold text-white/62">
                    {graph.template.replaceAll("_", " ")}
                  </span>
                )}
              </div>
              <div className="mt-5 space-y-4">
                {graph.nodes.map((node, index) => (
                  <div key={`${node}-${index}`} className="grid grid-cols-[42px_1fr] gap-4">
                    <div className="flex flex-col items-center">
                      <span className="flex size-10 items-center justify-center rounded-lg bg-[#7ef0a8] text-[#0b2a4a]">
                        {index + 1}
                      </span>
                      {index !== graph.nodes.length - 1 && <span className="mt-2 h-8 w-px bg-white/14" />}
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/[.06] p-4">
                      <p className="font-semibold">{titleCase(node.replaceAll("_", " "))}</p>
                      <p className="mt-1 text-sm text-white/48">{findOutgoingEdges(graph.edges, node)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          <div className="space-y-6">
            <Panel title="Run history" icon={Clock3}>
              <div className="space-y-3">
                {runRows.map((run) => (
                  <Link
                    key={run.id}
                    href={`/app/audit?run=${run.id}`}
                    className="block rounded-lg border border-black/10 p-4 transition hover:bg-[#f5f8fc]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{run.tickets?.external_id ?? "Workflow run"}</p>
                        <p className="mt-1 text-sm text-black/52">{run.tickets?.title ?? "No ticket attached"}</p>
                      </div>
                      <span className="rounded-md bg-[#e7f0ff] px-2 py-1 text-xs font-semibold text-[#0b5f91]">
                        {run.status}
                      </span>
                    </div>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-black/38">
                      {Number(run.confidence ?? 0)}% confidence · {formatDate(run.created_at)}
                    </p>
                  </Link>
                ))}
                {runRows.length === 0 && (
                  <p className="rounded-lg border border-dashed border-black/15 p-4 text-sm text-black/48">
                    Run this workflow to generate execution history.
                  </p>
                )}
              </div>
            </Panel>

            <Panel title="Guardrail signal" icon={ShieldCheck}>
              <div className="space-y-3">
                {(policies ?? []).slice(0, 4).map((policy) => (
                  <div key={policy.id} className="rounded-lg border border-black/10 p-4">
                    <p className="font-semibold">{titleCase(policy.decision.replaceAll("_", " "))}</p>
                    <p className="mt-1 text-sm leading-6 text-black/55">{policy.reason}</p>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Workflow audit" icon={ShieldCheck}>
              <div className="divide-y divide-black/8 rounded-lg border border-black/10">
                {(audits ?? []).map((audit) => (
                  <div key={audit.id} className="p-4">
                    <p className="font-semibold">{audit.event_summary}</p>
                    <p className="mt-1 text-sm text-black/50">{formatDate(audit.created_at)}</p>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </section>
      </div>
    </main>
  );
}

function BlastRadiusPreview({ blastRadius }: { blastRadius: ReturnType<typeof computeBlastRadius> }) {
  const riskStyles: Record<string, string> = {
    low: "border-emerald-200 bg-emerald-50 text-emerald-700",
    medium: "border-amber-200 bg-amber-50 text-amber-800",
    high: "border-rose-200 bg-rose-50 text-rose-700",
  };

  return (
    <div className="mt-4 rounded-xl border border-black/10 bg-[#f5f8fc] p-4">
      <div className="flex items-center gap-2">
        <ScanSearch size={16} className="text-[#0b5f91]" />
        <p className="text-sm font-semibold">Dry run · blast radius</p>
        <span className="rounded-md border border-black/10 bg-white px-2 py-0.5 text-xs font-semibold text-black/45">
          nothing runs yet
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-black/55">
        {blastRadius.total} provider {blastRadius.total === 1 ? "action" : "actions"} across{" "}
        {blastRadius.systems.join(", ")}. {blastRadius.approvalCount} will pause for approval,{" "}
        {blastRadius.highRiskCount} high-risk, {blastRadius.reversibleCount} reversible,{" "}
        {blastRadius.irreversibleCount} cannot be undone.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <SummaryChip icon={BadgeCheck} label={`${blastRadius.approvalCount} need approval`} />
        <SummaryChip icon={AlertTriangle} label={`${blastRadius.highRiskCount} high-risk`} />
        <SummaryChip icon={Undo2} label={`${blastRadius.reversibleCount} reversible`} />
        <SummaryChip icon={Ban} label={`${blastRadius.irreversibleCount} irreversible`} />
      </div>

      <div className="mt-4 space-y-2">
        {blastRadius.actions.map((action: PlannedAction, index: number) => (
          <div key={`${action.action_key}-${index}`} className="rounded-lg border border-black/10 bg-white p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-md bg-[#e7f0ff] text-xs font-bold text-[#0b5f91]">
                {index + 1}
              </span>
              <span className="text-sm font-semibold">{action.display_name}</span>
              <span className="rounded-md border border-black/10 bg-white px-2 py-0.5 text-xs font-semibold text-black/45">
                {action.target}
              </span>
              <span className={cn("rounded-md border px-2 py-0.5 text-xs font-semibold", riskStyles[action.risk_level])}>
                {action.risk_level} risk
              </span>
              {action.requires_approval && (
                <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">
                  <BadgeCheck size={11} />
                  approval
                </span>
              )}
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold",
                  action.reversible
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-rose-200 bg-rose-50 text-rose-700",
                )}
              >
                {action.reversible ? <Undo2 size={11} /> : <Ban size={11} />}
                {action.reversible ? "reversible" : "irreversible"}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-black/55">{action.changes}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryChip({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-black/10 bg-white px-2.5 py-1 text-xs font-semibold text-black/60">
      <Icon size={13} className="text-[#0b5f91]" />
      {label}
    </span>
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
    <form action={runWorkflow} className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
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
          Run workflow
        </PendingButton>
      </div>
    </form>
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
    <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-black/52">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
        </div>
        <span className="flex size-9 items-center justify-center rounded-lg bg-[#e7f0ff] text-[#0b5f91]">
          <Icon size={20} />
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
    <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-lg bg-[#e7f0ff] text-[#0b5f91]">
          <Icon size={18} />
        </span>
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex h-10 items-center rounded-lg border px-3 text-sm font-semibold",
        active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-800",
      )}
    >
      {active ? "Active" : "Paused"}
    </span>
  );
}

function readGraph(value: unknown): WorkflowGraph {
  if (!value || typeof value !== "object") {
    return { nodes: [], edges: [] };
  }

  const graph = value as Partial<WorkflowGraph>;
  return {
    nodes: Array.isArray(graph.nodes) ? graph.nodes.map(String) : [],
    edges: Array.isArray(graph.edges) ? graph.edges.map(String) : [],
    template: typeof graph.template === "string" ? graph.template : undefined,
  };
}

function findOutgoingEdges(edges: string[], node: string) {
  const nextNodes = edges
    .filter((edge) => edge.startsWith(`${node}->`))
    .map((edge) => titleCase(edge.split("->")[1]?.replaceAll("_", " ") ?? ""));

  return nextNodes.length ? `Next: ${nextNodes.join(", ")}` : "Terminal verification step";
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
