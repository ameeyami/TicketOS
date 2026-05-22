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
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { updateAgentAutonomy } from "@/app/app/autonomy/actions";
import { PendingButton } from "@/components/ui/pending-button";
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

  const agentRows = agents ?? [];
  const ticketRows = tickets ?? [];
  const policyRows = policies ?? [];
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
