import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  Brain,
  CheckCircle2,
  Clock3,
  Database,
  FileText,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { updateAgentMemory } from "@/app/app/agents/actions";
import { PendingButton } from "@/components/ui/pending-button";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  Executing: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Waiting: "border-zinc-200 bg-zinc-50 text-zinc-700",
  Investigating: "border-sky-200 bg-sky-50 text-sky-700",
  Paused: "border-amber-200 bg-amber-50 text-amber-800",
  Blocked: "border-rose-200 bg-rose-50 text-rose-700",
};

export default async function MemoryPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect("/auth/sign-in?message=Sign in to manage agent memory.");
  }

  const organization = await ensureWorkspace(supabase, userData.user);
  const [{ data: agents }, { data: tickets }, { data: runs }, { data: auditLogs }] = await Promise.all([
    supabase.from("agents").select("*").eq("organization_id", organization.id).order("created_at"),
    supabase
      .from("tickets")
      .select("id, external_id, title, category, status, assigned_agent_id, ai_confidence, created_at")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("agent_runs")
      .select("*, agents(name), tickets(external_id, title)")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("audit_logs")
      .select("*, agents(name)")
      .eq("organization_id", organization.id)
      .in("event_type", ["agent_memory_updated", "ticket_assigned", "agent_status_updated"])
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const agentRows = agents ?? [];
  const ticketRows = tickets ?? [];
  const runRows = runs ?? [];
  const scopedAgents = agentRows.filter((agent) => Boolean(agent.memory_scope)).length;
  const uniqueCapabilities = new Set(agentRows.flatMap((agent) => agent.capabilities ?? [])).size;
  const activeRunCount = runRows.filter((run) => ["queued", "running", "waiting_for_approval"].includes(run.status)).length;
  const averageConfidence = ticketRows.length
    ? Math.round(ticketRows.reduce((sum, ticket) => sum + Number(ticket.ai_confidence ?? 0), 0) / ticketRows.length)
    : 0;

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
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#47685d]">Operational memory</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">Control what agents remember.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-black/56">
              Inspect each agent’s allowed context, execution history, and capability boundaries before it acts.
            </p>
          </div>
          <div className="rounded-lg border border-black/10 bg-white px-4 py-3 text-sm font-semibold">
            {organization.name}
          </div>
        </div>

        <section className="mt-6 grid gap-3 md:grid-cols-4">
          <MetricCard label="Scoped agents" value={`${scopedAgents}/${agentRows.length}`} icon={Brain} />
          <MetricCard label="Capabilities" value={String(uniqueCapabilities)} icon={Sparkles} />
          <MetricCard label="Active runs" value={String(activeRunCount)} icon={Clock3} />
          <MetricCard label="Avg confidence" value={`${averageConfidence}%`} icon={CheckCircle2} />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_.72fr]">
          <div className="grid gap-4 lg:grid-cols-2">
            {agentRows.map((agent) => {
              const assignedTickets = ticketRows.filter((ticket) => ticket.assigned_agent_id === agent.id);
              const agentRuns = runRows.filter((run) => run.agent_id === agent.id);
              const categories = Array.from(new Set(assignedTickets.map((ticket) => ticket.category).filter(Boolean)));

              return (
                <article key={agent.id} className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-4">
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#eef5ea] text-[#2e6658]">
                        <Bot size={20} />
                      </span>
                      <div>
                        <h2 className="text-lg font-semibold">{agent.name}</h2>
                        <p className="mt-1 text-sm leading-6 text-black/55">{agent.description}</p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "rounded-md border px-2 py-1 text-xs font-semibold",
                        statusStyles[agent.status] ?? "border-zinc-200 bg-zinc-50 text-zinc-700",
                      )}
                    >
                      {agent.status}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <Fact label="Tickets" value={String(assignedTickets.length)} />
                    <Fact label="Runs" value={String(agentRuns.length)} />
                    <Fact label="Domains" value={String(categories.length)} />
                  </div>

                  <div className="mt-5 rounded-lg border border-black/10 bg-[#111713] p-4 text-white">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Brain size={16} className="text-[#d7ff78]" />
                      Memory scope
                    </div>
                    <p className="mt-3 text-sm leading-6 text-white/62">
                      {agent.memory_scope ?? "No memory scope defined."}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(agent.capabilities ?? []).map((capability: string) => (
                        <span key={capability} className="rounded-md border border-white/10 bg-white/8 px-2 py-1 text-xs text-white/68">
                          {capability}
                        </span>
                      ))}
                    </div>
                  </div>

                  <form action={updateAgentMemory} className="mt-5 grid gap-4">
                    <input type="hidden" name="agentId" value={agent.id} />
                    <input type="hidden" name="organizationId" value={organization.id} />
                    <label className="text-sm font-semibold">
                      Memory scope
                      <textarea
                        required
                        name="memoryScope"
                        defaultValue={agent.memory_scope ?? ""}
                        rows={3}
                        className="mt-2 w-full resize-none rounded-lg border border-black/10 bg-[#f8faf5] px-3 py-2 text-sm leading-6 outline-none focus:border-[#2f6f60]"
                        placeholder="Systems, policies, and operational context this agent can use..."
                      />
                    </label>
                    <label className="text-sm font-semibold">
                      Capabilities
                      <input
                        name="capabilities"
                        defaultValue={(agent.capabilities ?? []).join(", ")}
                        className="mt-2 h-11 w-full rounded-lg border border-black/10 bg-[#f8faf5] px-3 text-sm outline-none focus:border-[#2f6f60]"
                        placeholder="Okta, Slack, Google Workspace"
                      />
                    </label>
                    <PendingButton
                      pendingText="Saving..."
                      className="h-10 rounded-lg bg-[#17211c] px-3 text-sm font-semibold text-white"
                    >
                      <ShieldCheck size={16} />
                      Save memory
                    </PendingButton>
                  </form>
                </article>
              );
            })}
          </div>

          <div className="space-y-6">
            <Panel title="Recent memory signals" icon={Database}>
              <div className="space-y-3">
                {runRows.map((run) => (
                  <div key={run.id} className="rounded-lg border border-black/10 bg-white p-4">
                    <p className="font-semibold">{run.agents?.name ?? "Agent run"}</p>
                    <p className="mt-1 text-sm text-black/52">
                      {run.tickets?.external_id ?? "Ticket"} · {run.tickets?.title ?? "No ticket attached"}
                    </p>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-black/38">
                      {run.status} · {run.model ?? "policy simulator"}
                    </p>
                  </div>
                ))}
                {runRows.length === 0 && (
                  <p className="rounded-lg border border-dashed border-black/15 p-4 text-sm text-black/48">
                    Agent runs will appear here when agents start handling tickets.
                  </p>
                )}
              </div>
            </Panel>

            <Panel title="Memory audit" icon={FileText}>
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
                  <p className="p-4 text-sm text-black/48">Memory changes will appear here.</p>
                )}
              </div>
            </Panel>

            <Panel title="Memory boundaries" icon={MessageSquareText}>
              <div className="space-y-3">
                <Boundary title="Scope-first memory" detail="Agents should only use memory domains listed in their scope." />
                <Boundary title="Execution logs" detail="Runs and audit events provide traceable operational context." />
                <Boundary title="Human editable" detail="Operators can revise memory scope before expanding autonomy." />
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
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function Boundary({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-lg border border-black/10 p-4">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm leading-6 text-black/55">{detail}</p>
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
