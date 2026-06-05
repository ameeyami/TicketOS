import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Bot,
  Coins,
  Cpu,
  Gauge,
  Receipt,
  TrendingUp,
  Wallet,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { updateCostBudget } from "@/app/app/costs/actions";
import { PageHeader } from "@/components/dashboard/page-header";
import { PendingButton } from "@/components/ui/pending-button";
import {
  DEFAULT_MONTHLY_BUDGET_USD,
  MODEL_PRICING,
  type ModelKey,
  estimateTicketTriageCost,
  estimateWorkflowRunCost,
  formatUsd,
  modelForPriority,
} from "@/lib/cost-model";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type CostItem = {
  createdAt: string;
  costUsd: number;
  model: ModelKey;
  agent: string;
  workflow?: string;
};

export default async function CostsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect("/auth/sign-in?message=Sign in to review AI economics.");
  }

  const organization = await ensureWorkspace(supabase, userData.user);
  const [
    { data: tickets },
    { data: runs },
    { data: steps },
    { data: actions },
    { data: agents },
    { data: membership },
    { data: orgBudget },
  ] = await Promise.all([
    supabase
      .from("tickets")
      .select("id, external_id, title, status, priority, assigned_agent_id, description, ai_summary, created_at")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("workflow_runs")
      .select("id, status, ticket_id, created_at, workflows(name)")
      .eq("organization_id", organization.id),
    supabase.from("workflow_run_steps").select("workflow_run_id").eq("organization_id", organization.id),
    supabase.from("execution_actions").select("workflow_run_id").eq("organization_id", organization.id),
    supabase.from("agents").select("id, name").eq("organization_id", organization.id),
    supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", organization.id)
      .eq("user_id", userData.user.id)
      .maybeSingle(),
    supabase
      .from("organizations")
      .select("monthly_ai_budget_usd")
      .eq("id", organization.id)
      .maybeSingle(),
  ]);

  const ticketRows = tickets ?? [];
  const runRows = runs ?? [];
  const stepCounts = countByKey(steps ?? [], "workflow_run_id");
  const actionCounts = countByKey(actions ?? [], "workflow_run_id");
  const agentById = new Map((agents ?? []).map((agent) => [agent.id, agent.name]));
  const ticketById = new Map(ticketRows.map((ticket) => [ticket.id, ticket]));
  const canManage = membership?.role === "owner" || membership?.role === "admin";
  const monthlyBudget = Number(orgBudget?.monthly_ai_budget_usd ?? DEFAULT_MONTHLY_BUDGET_USD);

  // Per-ticket totals (triage + linked run execution) drive the "cost per resolution" story.
  const ticketCosts = ticketRows.map((ticket) => {
    const model = modelForPriority(ticket.priority);
    const triage = estimateTicketTriageCost(model, ticket.description, ticket.ai_summary);
    const linkedRuns = runRows.filter((run) => run.ticket_id === ticket.id);
    const runCost = linkedRuns.reduce(
      (sum, run) => sum + estimateWorkflowRunCost(model, stepCounts[run.id] ?? 0, actionCounts[run.id] ?? 0).costUsd,
      0,
    );
    return { ticket, model, total: triage.costUsd + runCost };
  });

  // Flat ledger of every modeled cost event, for time-window + breakdown math.
  const costItems: CostItem[] = [];
  for (const ticket of ticketRows) {
    const model = modelForPriority(ticket.priority);
    const triage = estimateTicketTriageCost(model, ticket.description, ticket.ai_summary);
    costItems.push({
      createdAt: ticket.created_at,
      costUsd: triage.costUsd,
      model,
      agent: ticket.assigned_agent_id ? agentById.get(ticket.assigned_agent_id) ?? "Unassigned" : "Unassigned",
    });
  }
  for (const run of runRows) {
    const ticket = run.ticket_id ? ticketById.get(run.ticket_id) : null;
    const model = modelForPriority(ticket?.priority);
    const est = estimateWorkflowRunCost(model, stepCounts[run.id] ?? 0, actionCounts[run.id] ?? 0);
    costItems.push({
      createdAt: run.created_at,
      costUsd: est.costUsd,
      model,
      agent: ticket?.assigned_agent_id ? agentById.get(ticket.assigned_agent_id) ?? "Unassigned" : "Unassigned",
      workflow: relationName(run.workflows) ?? "Workflow",
    });
  }

  const totalSpend = costItems.reduce((sum, item) => sum + item.costUsd, 0);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const fractionElapsed = Math.max(now.getDate() / daysInMonth, 1 / daysInMonth);
  const monthToDate = costItems
    .filter((item) => new Date(item.createdAt) >= monthStart)
    .reduce((sum, item) => sum + item.costUsd, 0);
  const projectedMonthly = monthToDate / fractionElapsed;

  const resolvedTickets = ticketCosts.filter((entry) => entry.ticket.status === "resolved");
  const automatedTickets = ticketCosts.filter(
    (entry) => entry.ticket.assigned_agent_id || runRows.some((run) => run.ticket_id === entry.ticket.id),
  );
  const resolutionBasis = resolvedTickets.length || automatedTickets.length || ticketCosts.length;
  const costPerResolution = totalSpend / Math.max(1, resolutionBasis);
  const resolutionLabel = resolvedTickets.length ? "resolved ticket" : "handled ticket";

  const budgetUsedPct = monthlyBudget > 0 ? Math.round((monthToDate / monthlyBudget) * 100) : 0;
  const projectedPct = monthlyBudget > 0 ? Math.round((projectedMonthly / monthlyBudget) * 100) : 0;
  const projectedOver = projectedMonthly > monthlyBudget;

  const byWorkflow = sumBy(costItems.filter((item) => item.workflow), (item) => item.workflow!);
  const byAgent = sumBy(costItems, (item) => item.agent);
  const byModel = sumBy(costItems, (item) => MODEL_PRICING[item.model].label);
  const topTickets = [...ticketCosts].sort((a, b) => b.total - a.total).slice(0, 6);

  return (
    <main className="min-h-screen px-4 py-6 text-[#151914] md:px-8">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          crumbs={[{ label: "Governance" }, { label: "Costs" }]}
          title="AI economics"
          description="What AI execution costs — per resolution, workflow, and agent — against a hard monthly budget."
        />

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Cost per resolution" value={formatUsd(costPerResolution)} detail={`per ${resolutionLabel}`} icon={Receipt} accent={CHIP[0]} />
          <MetricCard label="Spend this month" value={formatUsd(monthToDate)} detail={`${budgetUsedPct}% of budget used`} icon={Coins} accent={CHIP[1]} />
          <MetricCard label="Projected month" value={formatUsd(projectedMonthly)} detail={`${projectedPct}% of budget`} icon={TrendingUp} accent={CHIP[2]} />
          <MetricCard label="Total modeled spend" value={formatUsd(totalSpend)} detail={`${costItems.length} AI events`} icon={Gauge} accent={CHIP[3]} />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
          <Panel title="Monthly budget" icon={Wallet}>
            <div
              className={cn(
                "rounded-lg border p-5",
                projectedOver ? "border-rose-200 bg-rose-50" : "border-emerald-200 bg-emerald-50",
              )}
            >
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-black/45">Month to date</p>
                  <p className="mt-1 text-3xl font-semibold tracking-tight">{formatUsd(monthToDate)}</p>
                </div>
                <p className="text-sm font-semibold text-black/50">of {formatUsd(monthlyBudget)}</p>
              </div>
              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-black/10">
                <div
                  className={cn("h-full rounded-full", projectedOver ? "bg-rose-500" : "bg-emerald-500")}
                  style={{ width: `${Math.min(100, budgetUsedPct)}%` }}
                />
              </div>
              <p className={cn("mt-3 text-sm font-semibold", projectedOver ? "text-rose-700" : "text-emerald-800")}>
                {projectedOver
                  ? `On pace to spend ${formatUsd(projectedMonthly)} — over budget by ${formatUsd(projectedMonthly - monthlyBudget)}.`
                  : `On pace for ${formatUsd(projectedMonthly)} — within budget.`}
              </p>
            </div>

            {canManage ? (
              <form action={updateCostBudget} className="mt-4 grid gap-2 rounded-lg border border-black/10 bg-white p-4">
                <input type="hidden" name="organizationId" value={organization.id} />
                <label className="text-xs font-semibold uppercase tracking-[0.14em] text-black/40">
                  Monthly budget (USD)
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-lg font-semibold text-black/50">$</span>
                    <input
                      name="monthlyBudget"
                      type="number"
                      min={0}
                      step={50}
                      defaultValue={Math.round(monthlyBudget)}
                      className="h-10 w-full rounded-md border border-black/10 bg-white px-3 text-sm outline-none focus:border-[#0b2a4a]"
                    />
                  </div>
                </label>
                <PendingButton
                  pendingText="Saving budget..."
                  className="h-10 rounded-md bg-[#0b2a4a] px-3 text-sm font-semibold text-white transition hover:bg-[#07111f]"
                >
                  Set budget
                </PendingButton>
              </form>
            ) : (
              <p className="mt-4 rounded-lg border border-dashed border-black/15 p-4 text-sm text-black/48">
                Owners and admins can change the monthly budget.
              </p>
            )}
          </Panel>

          <div className="space-y-6">
            <Panel title="Spend by workflow" icon={Workflow}>
              <BarList rows={toBarRows(byWorkflow)} emptyText="Run a workflow to see execution spend." />
            </Panel>
            <section className="grid gap-6 lg:grid-cols-2">
              <Panel title="Spend by agent" icon={Bot}>
                <BarList rows={toBarRows(byAgent)} />
              </Panel>
              <Panel title="Spend by model" icon={Cpu}>
                <BarList rows={toBarRows(byModel)} />
              </Panel>
            </section>
          </div>
        </section>

        <section className="mt-6">
          <Panel title="Costliest resolutions" icon={Receipt}>
            <div className="overflow-hidden rounded-lg border border-black/10">
              {topTickets.length > 0 ? (
                topTickets.map((entry) => (
                  <Link
                    key={entry.ticket.id}
                    href={`/app/tickets/${entry.ticket.id}`}
                    className="flex items-center justify-between gap-3 border-b border-black/8 p-3 last:border-b-0 hover:bg-[#f8fbfe]"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-black/42">
                          {entry.ticket.external_id ?? entry.ticket.id.slice(0, 8)}
                        </span>
                        <span className="rounded-md bg-[#e7f0ff] px-2 py-0.5 text-xs font-semibold text-[#0b5f91]">
                          {MODEL_PRICING[entry.model].label}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm font-semibold">{entry.ticket.title}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold">{formatUsd(entry.total)}</span>
                      <ArrowRight size={15} className="text-black/35" />
                    </div>
                  </Link>
                ))
              ) : (
                <p className="p-6 text-center text-sm text-black/48">No tickets to price yet.</p>
              )}
            </div>
          </Panel>
        </section>
      </div>
    </main>
  );
}

// Supabase types embedded relations as an array or object depending on inference.
function relationName(relation: unknown): string | undefined {
  if (Array.isArray(relation)) return relation[0]?.name;
  if (relation && typeof relation === "object") return (relation as { name?: string }).name;
  return undefined;
}

function toBarRows(totals: Record<string, number>) {
  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const max = Math.max(0.0001, ...entries.map(([, value]) => value));
  return entries.map(([label, value]) => ({ label, value: formatUsd(value), ratio: value / max }));
}

function sumBy<T>(rows: T[], key: (row: T) => string) {
  return rows.reduce<Record<string, number>>((totals, row) => {
    const bucket = key(row);
    totals[bucket] = (totals[bucket] ?? 0) + (row as unknown as { costUsd: number }).costUsd;
    return totals;
  }, {});
}

function countByKey<T extends Record<string, unknown>>(rows: T[], key: keyof T) {
  return rows.reduce<Record<string, number>>((counts, row) => {
    const value = String(row[key] ?? "");
    if (value) {
      counts[value] = (counts[value] ?? 0) + 1;
    }
    return counts;
  }, {});
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
  detail,
  icon: Icon,
  accent = CHIP[0],
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight">{value}</p>
          <p className="mt-1 text-xs text-slate-400">{detail}</p>
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
      <div className="mb-4 flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-lg bg-[#e7f0ff] text-[#0b5f91]">
          <Icon size={15} />
        </span>
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function BarList({
  rows,
  emptyText = "No spend recorded yet.",
}: {
  rows: Array<{ label: string; value: string; ratio: number }>;
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
            <p className="truncate text-sm font-semibold">{row.label}</p>
            <span className="text-sm font-semibold text-black/45">{row.value}</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/8">
            <div
              className="h-full rounded-full bg-[#0b5f91]"
              style={{ width: `${Math.max(6, Math.round(row.ratio * 100))}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
