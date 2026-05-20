import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  Bot,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Gauge,
  GitBranch,
  ShieldCheck,
  TrendingDown,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const statusLabels: Record<string, string> = {
  new: "New",
  triaging: "Investigating",
  approval_required: "Approval",
  executing: "Resolving",
  resolved: "Resolved",
  failed: "Failed",
  blocked: "Blocked",
};

const workflowOutcomeLabels: Record<string, string> = {
  queued: "Queued",
  running: "Running",
  waiting_for_approval: "Waiting approval",
  succeeded: "Succeeded",
  failed: "Failed",
  blocked: "Blocked",
  cancelled: "Cancelled",
};

export default async function IntelligencePage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect("/auth/sign-in?message=Sign in to review operational intelligence.");
  }

  const organization = await ensureWorkspace(supabase, userData.user);
  const [{ data: tickets }, { data: workflowRuns }, { data: agents }, { data: approvals }, { data: integrations }, { data: policies }] =
    await Promise.all([
      supabase
        .from("tickets")
        .select("id, external_id, title, status, priority, category, ai_confidence, assigned_agent_id, created_at, resolved_at")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("workflow_runs")
        .select("id, status, confidence, ticket_id, created_at, completed_at, workflows(name)")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false }),
      supabase.from("agents").select("*").eq("organization_id", organization.id).order("created_at"),
      supabase
        .from("approval_requests")
        .select("id, status, created_at, decided_at, tickets(external_id, title)")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false }),
      supabase.from("integrations").select("*").eq("organization_id", organization.id).order("display_name"),
      supabase
        .from("policy_evaluations")
        .select("id, decision, confidence, reason, created_at")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false }),
    ]);

  const ticketRows = tickets ?? [];
  const runRows = workflowRuns ?? [];
  const agentRows = agents ?? [];
  const approvalRows = approvals ?? [];
  const integrationRows = integrations ?? [];
  const policyRows = policies ?? [];

  const blockedTickets = ticketRows.filter((ticket) => ticket.status === "blocked" || ticket.status === "failed").length;
  const pendingApprovals = approvalRows.filter((approval) => approval.status === "pending").length;
  const completedRuns = runRows.filter((run) => ["succeeded", "failed", "blocked", "cancelled"].includes(run.status));
  const successfulRuns = runRows.filter((run) => run.status === "succeeded").length;
  const automatedTickets = ticketRows.filter((ticket) => ticket.assigned_agent_id || runRows.some((run) => run.ticket_id === ticket.id)).length;
  const avgConfidence = average(ticketRows.map((ticket) => Number(ticket.ai_confidence ?? 0)));
  const avgRunConfidence = average(runRows.map((run) => Number(run.confidence ?? 0)));
  const automationRate = percent(automatedTickets, ticketRows.length);
  const successRate = percent(successfulRuns, completedRuns.length || runRows.length);
  const workloadHoursSaved = Math.round(automatedTickets * 0.42 * 10) / 10;

  const ticketStatusCounts = countBy(ticketRows, "status");
  const workflowStatusCounts = countBy(runRows, "status");
  const categoryCounts = countBy(ticketRows, "category");
  const maxTicketStatus = maxCount(ticketStatusCounts);
  const maxWorkflowStatus = maxCount(workflowStatusCounts);
  const maxCategory = maxCount(categoryCounts);
  const connectedIntegrations = integrationRows.filter((integration) => integration.status === "connected").length;
  const blockedPolicies = policyRows.filter((policy) => policy.decision === "block").length;
  const approvalPolicies = policyRows.filter((policy) => policy.decision === "approval_required").length;
  const topBottleneck = findTopBottleneck({
    pendingApprovals,
    blockedTickets,
    waitingRuns: runRows.filter((run) => run.status === "waiting_for_approval").length,
    disconnectedIntegrations: integrationRows.length - connectedIntegrations,
  });

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
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#47685d]">Operational intelligence</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">Find where IT execution slows down.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-black/56">
              TicketOS turns execution data into bottlenecks, automation rates, agent load, and risk signals.
            </p>
          </div>
          <div className="rounded-lg border border-black/10 bg-white px-4 py-3 text-sm font-semibold">
            {organization.name}
          </div>
        </div>

        <section className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Automation coverage" value={`${automationRate}%`} detail={`${automatedTickets}/${ticketRows.length} tickets`} icon={Gauge} />
          <MetricCard label="Workflow success" value={`${successRate}%`} detail={`${successfulRuns} successful runs`} icon={CheckCircle2} />
          <MetricCard label="Workload reduced" value={`${workloadHoursSaved}h`} detail="estimated operator time saved" icon={TrendingDown} />
          <MetricCard label="Avg confidence" value={`${avgConfidence}%`} detail={`${avgRunConfidence}% workflow confidence`} icon={BarChart3} />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[.88fr_1.12fr]">
          <div className="space-y-6">
            <Panel title="Primary bottleneck" icon={CircleAlert}>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-amber-800/70">Current constraint</p>
                <h2 className="mt-2 text-2xl font-semibold text-amber-950">{topBottleneck.label}</h2>
                <p className="mt-2 text-sm leading-6 text-amber-900/72">{topBottleneck.detail}</p>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Fact label="Pending approvals" value={String(pendingApprovals)} />
                <Fact label="Blocked tickets" value={String(blockedTickets)} />
                <Fact label="Policy blocks" value={String(blockedPolicies)} />
                <Fact label="Approval policies" value={String(approvalPolicies)} />
              </div>
            </Panel>

            <Panel title="Agent workload" icon={Bot}>
              <div className="space-y-3">
                {agentRows.map((agent) => {
                  const workload = ticketRows.filter((ticket) => ticket.assigned_agent_id === agent.id).length;
                  const activeWorkload = ticketRows.filter(
                    (ticket) => ticket.assigned_agent_id === agent.id && !["resolved", "blocked", "failed"].includes(ticket.status),
                  ).length;

                  return (
                    <div key={agent.id} className="rounded-lg border border-black/10 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold">{agent.name}</p>
                          <p className="mt-1 text-sm text-black/50">{agent.status} · {agent.memory_scope ?? "General operations"}</p>
                        </div>
                        <span className="rounded-md bg-[#edf5e9] px-2 py-1 text-xs font-semibold text-[#315f4f]">
                          {activeWorkload} active
                        </span>
                      </div>
                      <Progress value={workload} max={Math.max(1, ticketRows.length)} />
                    </div>
                  );
                })}
              </div>
            </Panel>
          </div>

          <div className="space-y-6">
            <section className="grid gap-6 lg:grid-cols-2">
              <Panel title="Ticket states" icon={Workflow}>
                <BarList
                  rows={Object.entries(ticketStatusCounts).map(([status, count]) => ({
                    label: statusLabels[status] ?? titleCase(status.replaceAll("_", " ")),
                    value: count,
                    max: maxTicketStatus,
                  }))}
                />
              </Panel>

              <Panel title="Workflow outcomes" icon={GitBranch}>
                <BarList
                  rows={Object.entries(workflowStatusCounts).map(([status, count]) => ({
                    label: workflowOutcomeLabels[status] ?? titleCase(status.replaceAll("_", " ")),
                    value: count,
                    max: maxWorkflowStatus,
                  }))}
                  emptyText="Workflow outcomes appear after runs are started."
                />
              </Panel>
            </section>

            <Panel title="Demand mix" icon={BarChart3}>
              <BarList
                rows={Object.entries(categoryCounts).map(([category, count]) => ({
                  label: category || "Uncategorized",
                  value: count,
                  max: maxCategory,
                }))}
              />
            </Panel>

            <section className="grid gap-6 lg:grid-cols-2">
              <Panel title="Integration readiness" icon={ShieldCheck}>
                <div className="rounded-lg border border-black/10 bg-[#111713] p-5 text-white">
                  <p className="text-sm text-white/50">Connected systems</p>
                  <p className="mt-3 text-3xl font-semibold">{connectedIntegrations}/{integrationRows.length}</p>
                  <p className="mt-2 text-sm leading-6 text-white/58">
                    Agents can execute reliably only where integrations and scopes are connected.
                  </p>
                </div>
                <div className="mt-4 space-y-2">
                  {integrationRows.map((integration) => (
                    <div key={integration.id} className="flex items-center justify-between rounded-lg border border-black/10 p-3">
                      <span className="text-sm font-semibold">{integration.display_name}</span>
                      <span className="text-xs font-semibold text-black/45">{integration.status.replaceAll("_", " ")}</span>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel title="Recommended moves" icon={Clock3}>
                <div className="space-y-3">
                  {recommendations({ pendingApprovals, blockedTickets, connectedIntegrations, integrationTotal: integrationRows.length }).map((item) => (
                    <div key={item.title} className="rounded-lg border border-black/10 p-4">
                      <p className="font-semibold">{item.title}</p>
                      <p className="mt-1 text-sm leading-6 text-black/55">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </Panel>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-black/52">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
          <p className="mt-2 text-sm text-black/45">{detail}</p>
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
    <div className="rounded-lg border border-black/10 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/38">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function BarList({
  rows,
  emptyText = "No data available yet.",
}: {
  rows: Array<{ label: string; value: number; max: number }>;
  emptyText?: string;
}) {
  if (rows.length === 0) {
    return <p className="rounded-lg border border-dashed border-black/15 p-4 text-sm text-black/48">{emptyText}</p>;
  }

  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">{row.label}</p>
            <span className="text-sm font-semibold text-black/45">{row.value}</span>
          </div>
          <Progress value={row.value} max={row.max} />
        </div>
      ))}
    </div>
  );
}

function Progress({ value, max }: { value: number; max: number }) {
  const width = Math.max(6, Math.round((value / Math.max(1, max)) * 100));

  return (
    <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/8">
      <div className="h-full rounded-full bg-[#2f6f60]" style={{ width: `${width}%` }} />
    </div>
  );
}

function average(values: number[]) {
  const cleanValues = values.filter((value) => Number.isFinite(value));
  if (!cleanValues.length) {
    return 0;
  }

  return Math.round(cleanValues.reduce((sum, value) => sum + value, 0) / cleanValues.length);
}

function percent(part: number, total: number) {
  if (!total) {
    return 0;
  }

  return Math.round((part / total) * 100);
}

function countBy<T extends Record<string, unknown>>(rows: T[], key: keyof T) {
  return rows.reduce<Record<string, number>>((counts, row) => {
    const value = String(row[key] ?? "unknown");
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function maxCount(counts: Record<string, number>) {
  return Math.max(1, ...Object.values(counts));
}

function findTopBottleneck({
  pendingApprovals,
  blockedTickets,
  waitingRuns,
  disconnectedIntegrations,
}: {
  pendingApprovals: number;
  blockedTickets: number;
  waitingRuns: number;
  disconnectedIntegrations: number;
}) {
  const candidates = [
    {
      label: "Approval latency",
      value: pendingApprovals + waitingRuns,
      detail: "Human approval is the most likely delay when workflows pause after policy checks.",
    },
    {
      label: "Blocked execution",
      value: blockedTickets,
      detail: "Blocked or failed tickets need policy review before TicketOS can safely continue.",
    },
    {
      label: "Integration readiness",
      value: disconnectedIntegrations,
      detail: "Disconnected systems reduce the number of workflows agents can execute end to end.",
    },
  ].sort((a, b) => b.value - a.value);

  return candidates[0].value > 0
    ? candidates[0]
    : {
        label: "No major constraint",
        value: 0,
        detail: "The current workspace has no obvious operational bottleneck in the seeded data.",
      };
}

function recommendations({
  pendingApprovals,
  blockedTickets,
  connectedIntegrations,
  integrationTotal,
}: {
  pendingApprovals: number;
  blockedTickets: number;
  connectedIntegrations: number;
  integrationTotal: number;
}) {
  const items = [];

  if (pendingApprovals > 0) {
    items.push({
      title: "Clear pending approvals",
      detail: "Approvals are the easiest way to resume paused automations and improve resolution time.",
    });
  }

  if (blockedTickets > 0) {
    items.push({
      title: "Review blocked tickets",
      detail: "Blocked execution usually means missing ownership, high-risk access, or incomplete integration context.",
    });
  }

  if (connectedIntegrations < integrationTotal) {
    items.push({
      title: "Connect execution systems",
      detail: "More connected integrations expand what agents can complete without operator handoff.",
    });
  }

  if (!items.length) {
    items.push({
      title: "Expand automation coverage",
      detail: "Add more workflow templates for repetitive access, onboarding, and identity operations.",
    });
  }

  return items;
}

function titleCase(value: string) {
  return value
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
