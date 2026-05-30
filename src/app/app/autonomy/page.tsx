import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Bot,
  CircleAlert,
  Clock3,
  FileText,
  Gauge,
  LockKeyhole,
  Play,
  ShieldCheck,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { setWorkflowAutonomy, updateAgentAutonomy } from "@/app/app/autonomy/actions";
import { PendingButton } from "@/components/ui/pending-button";
import {
  AUTONOMY_LEVELS,
  DEFAULT_AUTONOMY_LEVEL,
  assessTrust,
  autonomyLevelMeta,
  compareLevels,
  normalizeAutonomyLevel,
  type AutonomyLevel,
  type TrustAssessment,
  type WorkflowTrack,
} from "@/lib/autonomy";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const modeByStatus: Record<string, AutonomyMode> = {
  Executing: "autonomous",
  Investigating: "supervised",
  Waiting: "supervised",
  Paused: "approval_only",
  Blocked: "off",
};

const modeStyles: Record<AutonomyMode, string> = {
  autonomous: "border-emerald-200 bg-emerald-50 text-emerald-700",
  supervised: "border-sky-200 bg-sky-50 text-sky-700",
  approval_only: "border-amber-200 bg-amber-50 text-amber-800",
  off: "border-rose-200 bg-rose-50 text-rose-700",
};

const autonomyModes = [
  {
    mode: "autonomous",
    label: "Autonomous",
    detail: "Agent can execute allowed workflows without a new approval gate.",
    icon: Play,
  },
  {
    mode: "supervised",
    label: "Supervised",
    detail: "Agent can investigate, but sensitive actions are routed through approval.",
    icon: ShieldCheck,
  },
  {
    mode: "approval_only",
    label: "Approval-only",
    detail: "Agent stays paused until a human explicitly approves execution.",
    icon: BadgeCheck,
  },
  {
    mode: "off",
    label: "Off",
    detail: "Agent is blocked from autonomous execution.",
    icon: LockKeyhole,
  },
] as const;

type AutonomyMode = "autonomous" | "supervised" | "approval_only" | "off";

export default async function AutonomyPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect("/auth/sign-in?message=Sign in to manage autonomy controls.");
  }

  const organization = await ensureWorkspace(supabase, userData.user);
  const [{ data: agents }, { data: tickets }, { data: policies }, { data: agentRuns }, { data: auditLogs }] =
    await Promise.all([
      supabase.from("agents").select("*").eq("organization_id", organization.id).order("created_at"),
      supabase
        .from("tickets")
        .select("id, status, assigned_agent_id, priority, ai_confidence")
        .eq("organization_id", organization.id),
      supabase
        .from("policy_rules")
        .select("*")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("agent_runs")
        .select("id, agent_id, status, created_at")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("audit_logs")
        .select("*, agents(name)")
        .eq("organization_id", organization.id)
        .in("event_type", ["agent_autonomy_updated", "agent_status_updated", "policy_rule_activated", "policy_rule_paused"])
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

  const [{ data: workflows }, { data: wfRuns }, { data: wfActions }, { data: autonomyLevelLogs }] = await Promise.all([
    supabase
      .from("workflows")
      .select("id, name, trigger_type, is_active")
      .eq("organization_id", organization.id)
      .order("created_at"),
    supabase.from("workflow_runs").select("id, workflow_id, status").eq("organization_id", organization.id),
    supabase
      .from("execution_actions")
      .select("workflow_run_id, response_payload")
      .eq("organization_id", organization.id),
    supabase
      .from("audit_logs")
      .select("metadata, created_at")
      .eq("organization_id", organization.id)
      .eq("event_type", "workflow_autonomy_updated")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const agentRows = agents ?? [];
  const ticketRows = tickets ?? [];
  const policyRows = policies ?? [];

  const wfRunRows = wfRuns ?? [];
  const runWorkflowMap = new Map(wfRunRows.map((run) => [run.id, run.workflow_id]));
  const rollbacksByWorkflow = new Map<string, number>();
  for (const action of wfActions ?? []) {
    if (action.response_payload?.reversed_at) {
      const wfId = runWorkflowMap.get(action.workflow_run_id);
      if (wfId) rollbacksByWorkflow.set(wfId, (rollbacksByWorkflow.get(wfId) ?? 0) + 1);
    }
  }
  const levelByWorkflow = new Map<string, AutonomyLevel>();
  for (const log of autonomyLevelLogs ?? []) {
    const wfId = log.metadata?.workflow_id;
    if (wfId && !levelByWorkflow.has(wfId)) {
      levelByWorkflow.set(wfId, normalizeAutonomyLevel(log.metadata?.level));
    }
  }

  const completedStatuses = ["succeeded", "failed", "blocked", "cancelled"];
  const workflowAutonomy = (workflows ?? []).map((workflow) => {
    const runs = wfRunRows.filter((run) => run.workflow_id === workflow.id);
    const completed = runs.filter((run) => completedStatuses.includes(run.status));
    const track: WorkflowTrack = {
      totalRuns: runs.length,
      completedRuns: completed.length,
      successfulRuns: completed.filter((run) => run.status === "succeeded").length,
      failedRuns: completed.filter((run) => ["failed", "blocked"].includes(run.status)).length,
      rollbacks: rollbacksByWorkflow.get(workflow.id) ?? 0,
    };
    return {
      workflow,
      track,
      assessment: assessTrust(track),
      current: levelByWorkflow.get(workflow.id) ?? DEFAULT_AUTONOMY_LEVEL,
    };
  });
  const autonomousCount = agentRows.filter((agent) => readMode(agent.status) === "autonomous").length;
  const guardedPolicyCount = policyRows.filter(
    (policy) => policy.is_active && ["approval_required", "block"].includes(policy.decision),
  ).length;
  const activeRunCount = (agentRuns ?? []).filter((run) => ["running", "waiting_for_approval"].includes(run.status)).length;
  const riskTickets = ticketRows.filter((ticket) => ["critical", "high"].includes(ticket.priority)).length;

  return (
    <main className="min-h-screen bg-[#f6f7f2] px-4 py-6 text-[#151914] md:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/app"
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-black/10 bg-white px-3 text-sm font-semibold"
        >
          <ArrowLeft size={16} />
          Command center
        </Link>

        <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#47685d]">Autonomy controls</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">Set the execution boundary for every agent.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-black/56">
              Choose which agents can act independently, which need supervision, and which must stay blocked.
            </p>
          </div>
          <div className="rounded-lg border border-black/10 bg-white px-4 py-3 text-sm font-semibold">
            {organization.name}
          </div>
        </div>

        <section className="mt-6 grid gap-3 md:grid-cols-4">
          <MetricCard label="Autonomous agents" value={`${autonomousCount}/${agentRows.length}`} icon={Bot} />
          <MetricCard label="Guardrails" value={String(guardedPolicyCount)} icon={ShieldCheck} />
          <MetricCard label="Active runs" value={String(activeRunCount)} icon={Gauge} />
          <MetricCard label="High-risk tickets" value={String(riskTickets)} icon={CircleAlert} />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_.68fr]">
          <div className="grid gap-4 lg:grid-cols-2">
            {agentRows.map((agent) => {
              const mode = readMode(agent.status);
              const assignedTickets = ticketRows.filter((ticket) => ticket.assigned_agent_id === agent.id);
              const agentPolicies = policyRows.filter(
                (policy) => policy.conditions?.agent_id === agent.id || policy.name.startsWith(`${agent.name} autonomy`),
              );

              return (
                <article key={agent.id} className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-4">
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#eef5ea] text-[#2e6658]">
                        <SlidersHorizontal size={20} />
                      </span>
                      <div>
                        <h2 className="text-lg font-semibold">{agent.name}</h2>
                        <p className="mt-1 text-sm leading-6 text-black/55">{agent.description}</p>
                      </div>
                    </div>
                    <ModePill mode={mode} />
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <Fact label="Tickets" value={String(assignedTickets.length)} />
                    <Fact label="Confidence" value={`${averageConfidence(assignedTickets)}%`} />
                    <Fact label="Policies" value={String(agentPolicies.length)} />
                  </div>

                  <div className="mt-5 rounded-lg border border-black/10 bg-[#111713] p-4 text-white">
                    <p className="text-sm font-semibold">Current boundary</p>
                    <p className="mt-2 text-sm leading-6 text-white/62">{modeDescription(mode)}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(agent.capabilities ?? []).map((capability: string) => (
                        <span key={capability} className="rounded-md border border-white/10 bg-white/8 px-2 py-1 text-xs text-white/68">
                          {capability}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3">
                    {autonomyModes.map((item) => (
                      <form key={item.mode} action={updateAgentAutonomy} className="rounded-lg border border-black/10 bg-[#f8faf5] p-3">
                        <input type="hidden" name="organizationId" value={organization.id} />
                        <input type="hidden" name="agentId" value={agent.id} />
                        <input type="hidden" name="mode" value={item.mode} />
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex gap-3">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#2e6658]">
                              <item.icon size={17} />
                            </span>
                            <div>
                              <p className="font-semibold">{item.label}</p>
                              <p className="mt-1 text-sm leading-6 text-black/52">{item.detail}</p>
                            </div>
                          </div>
                          <PendingButton
                            pendingText="Saving..."
                            className={cn(
                              "h-10 shrink-0 rounded-lg px-3 text-sm font-semibold",
                              mode === item.mode ? "bg-[#17211c] text-white" : "border border-black/10 bg-white text-[#151914]",
                            )}
                          >
                            {mode === item.mode ? "Current" : "Set mode"}
                          </PendingButton>
                        </div>
                      </form>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>

          <div className="space-y-6">
            <Panel title="Mode guide" icon={FileText}>
              <div className="space-y-3">
                {autonomyModes.map((mode) => (
                  <div key={mode.mode} className="rounded-lg border border-black/10 p-4">
                    <div className="flex items-center gap-2">
                      <span className="flex size-8 items-center justify-center rounded-lg bg-[#eef5ea] text-[#2e6658]">
                        <mode.icon size={16} />
                      </span>
                      <p className="font-semibold">{mode.label}</p>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-black/55">{mode.detail}</p>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Autonomy audit" icon={Clock3}>
              <div className="divide-y divide-black/8 rounded-lg border border-black/10">
                {(auditLogs ?? []).map((log) => (
                  <div key={log.id} className="p-4">
                    <p className="font-semibold">{log.event_summary}</p>
                    <p className="mt-1 text-sm text-black/50">
                      {log.agents?.name ?? "TicketOS"} · {formatDate(log.created_at)}
                    </p>
                  </div>
                ))}
                {(auditLogs ?? []).length === 0 && (
                  <p className="p-4 text-sm text-black/48">Autonomy changes will appear here.</p>
                )}
              </div>
            </Panel>
          </div>
        </section>

        <WorkflowAutonomySection items={workflowAutonomy} organizationId={organization.id} />
      </div>
    </main>
  );
}

function WorkflowAutonomySection({
  items,
  organizationId,
}: {
  items: Array<{
    workflow: { id: string; name: string; trigger_type: string; is_active: boolean };
    track: WorkflowTrack;
    assessment: TrustAssessment;
    current: AutonomyLevel;
  }>;
  organizationId: string;
}) {
  return (
    <section className="mt-6">
      <Panel title="Earned workflow autonomy" icon={Workflow}>
        <p className="-mt-2 mb-5 text-sm leading-6 text-black/55">
          Each workflow earns autonomy from its track record. TicketOS scores success and rollback rates, recommends a
          level, and flags a tighten the moment trust drops — so workflows graduate to independence the way a new hire
          would.
        </p>
        {items.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {items.map((item) => (
              <WorkflowAutonomyCard key={item.workflow.id} item={item} organizationId={organizationId} />
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-black/15 p-4 text-sm text-black/48">
            Create a workflow to start earning autonomy.
          </p>
        )}
      </Panel>
    </section>
  );
}

function WorkflowAutonomyCard({
  item,
  organizationId,
}: {
  item: {
    workflow: { id: string; name: string; trigger_type: string; is_active: boolean };
    track: WorkflowTrack;
    assessment: TrustAssessment;
    current: AutonomyLevel;
  };
  organizationId: string;
}) {
  const { workflow, track, assessment, current } = item;
  const recommended = assessment.recommended;
  const direction = compareLevels(recommended, current);
  const scoreTone =
    assessment.score >= 70 ? "text-emerald-700" : assessment.score >= 40 ? "text-amber-700" : "text-rose-700";
  const barTone =
    assessment.score >= 70 ? "bg-emerald-500" : assessment.score >= 40 ? "bg-amber-500" : "bg-rose-500";

  return (
    <article className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{workflow.name}</h3>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-black/38">
            {workflow.trigger_type.replaceAll("_", " ")}
          </p>
        </div>
        <div className="text-right">
          <p className={cn("text-3xl font-semibold tracking-tight", scoreTone)}>{assessment.score}</p>
          <p className="text-xs font-semibold text-black/40">trust score</p>
        </div>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/8">
        <div className={cn("h-full rounded-full", barTone)} style={{ width: `${Math.max(4, assessment.score)}%` }} />
      </div>
      <p className="mt-2 text-sm text-black/55">{assessment.rationale}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Fact label="Runs" value={String(track.totalRuns)} />
        <Fact label="Success" value={`${assessment.successRate}%`} />
        <Fact label="Rollbacks" value={String(track.rollbacks)} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-black/10 bg-[#f8faf5] p-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/38">Current level</p>
          <p className="mt-1 font-semibold">{autonomyLevelMeta[current].label}</p>
        </div>
        <span className="max-w-[55%] text-right text-xs leading-5 text-black/45">{autonomyLevelMeta[current].detail}</span>
      </div>

      {direction !== 0 && (
        <form
          action={setWorkflowAutonomy}
          className={cn(
            "mt-3 rounded-lg border p-3",
            direction > 0 ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50",
          )}
        >
          <input type="hidden" name="organizationId" value={organizationId} />
          <input type="hidden" name="workflowId" value={workflow.id} />
          <input type="hidden" name="level" value={recommended} />
          <input
            type="hidden"
            name="reason"
            value={direction > 0 ? "Applied earned promotion" : "Tightened after trust drop"}
          />
          <div className="flex items-center gap-2">
            {direction > 0 ? (
              <TrendingUp size={15} className="text-emerald-700" />
            ) : (
              <TrendingDown size={15} className="text-rose-700" />
            )}
            <p className={cn("text-sm font-semibold", direction > 0 ? "text-emerald-800" : "text-rose-700")}>
              {direction > 0 ? "Trust earned" : "Trust dropped"} — recommend {autonomyLevelMeta[recommended].label}
            </p>
          </div>
          <PendingButton
            pendingText="Applying..."
            className={cn(
              "mt-3 h-9 w-full rounded-md px-3 text-sm font-semibold text-white",
              direction > 0 ? "bg-emerald-700" : "bg-rose-700",
            )}
          >
            {direction > 0 ? "Promote" : "Tighten"} to {autonomyLevelMeta[recommended].label}
          </PendingButton>
        </form>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        {AUTONOMY_LEVELS.map((level) => (
          <form key={level} action={setWorkflowAutonomy}>
            <input type="hidden" name="organizationId" value={organizationId} />
            <input type="hidden" name="workflowId" value={workflow.id} />
            <input type="hidden" name="level" value={level} />
            <PendingButton
              pendingText="Saving..."
              className={cn(
                "h-9 w-full rounded-md border px-2 text-xs font-semibold",
                current === level
                  ? "border-[#17211c] bg-[#17211c] text-white"
                  : "border-black/10 bg-white text-[#151914]",
              )}
            >
              {autonomyLevelMeta[level].label}
            </PendingButton>
          </form>
        ))}
      </div>
    </article>
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
        <span className="flex size-11 items-center justify-center rounded-lg bg-[#eef5ea] text-[#2e6658]">
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
        <span className="flex size-9 items-center justify-center rounded-lg bg-[#eef5ea] text-[#2e6658]">
          <Icon size={18} />
        </span>
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-black/10 bg-[#f8faf5] p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/38">{label}</p>
      <p className="mt-2 text-sm font-semibold text-black/70">{value}</p>
    </div>
  );
}

function ModePill({ mode }: { mode: AutonomyMode }) {
  return (
    <span className={cn("shrink-0 rounded-md border px-2 py-1 text-xs font-semibold", modeStyles[mode])}>
      {mode.replaceAll("_", " ")}
    </span>
  );
}

function readMode(status: string): AutonomyMode {
  return modeByStatus[status] ?? "supervised";
}

function modeDescription(mode: AutonomyMode) {
  const descriptions: Record<AutonomyMode, string> = {
    autonomous: "Agent may execute allowed workflows when policy checks pass.",
    supervised: "Agent can investigate and prepare execution, with approval gates for sensitive work.",
    approval_only: "Agent is paused until a human approves next execution.",
    off: "Agent is blocked from autonomous execution.",
  };

  return descriptions[mode];
}

function averageConfidence(tickets: Array<{ ai_confidence: number | string | null }>) {
  if (tickets.length === 0) {
    return 0;
  }

  return Math.round(tickets.reduce((sum, ticket) => sum + Number(ticket.ai_confidence ?? 0), 0) / tickets.length);
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
