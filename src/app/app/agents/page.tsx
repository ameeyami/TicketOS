import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Bot,
  Boxes,
  CirclePause,
  Play,
  ShieldCheck,
} from "lucide-react";
import { assignTicketToAgent, updateAgentStatus } from "@/app/app/agents/actions";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard/page-header";
import { PendingButton } from "@/components/ui/pending-button";

const statusStyles: Record<string, string> = {
  Executing: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Waiting: "bg-zinc-100 text-zinc-700 border-zinc-200",
  Investigating: "bg-sky-50 text-sky-700 border-sky-200",
  Paused: "bg-amber-50 text-amber-800 border-amber-200",
  Blocked: "bg-rose-50 text-rose-700 border-rose-200",
};

const actionStatuses = [
  { label: "Run", status: "Executing", icon: Play, pending: "Starting..." },
  { label: "Pause", status: "Paused", icon: CirclePause, pending: "Pausing..." },
  { label: "Block", status: "Blocked", icon: ShieldCheck, pending: "Blocking..." },
];

export default async function AgentsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect("/auth/sign-in?message=Sign in to manage AI agents.");
  }

  const organization = await ensureWorkspace(supabase, userData.user);
  const [{ data: agents }, { data: tickets }] = await Promise.all([
    supabase.from("agents").select("*").eq("organization_id", organization.id).order("created_at"),
    supabase
      .from("tickets")
      .select("id, external_id, title, status, priority, ai_confidence, assigned_agent_id, created_at")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false }),
  ]);

  const ticketRows = tickets ?? [];
  const agentRows = agents ?? [];
  const unassignedTickets = ticketRows.filter((ticket) => !ticket.assigned_agent_id);

  return (
    <main className="min-h-screen bg-[#fbfaf8] px-4 py-5 text-[#151914] md:px-8">
      <div className="mx-auto max-w-6xl">
        <PageHeader
          crumbs={[{ label: "Other" }, { label: "Agents" }]}
          title="Agents"
          description="Manage agent status and ticket assignment."
        />

        <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_340px]">
          <div className="grid gap-4 lg:grid-cols-2">
            {agentRows.map((agent) => {
              const assignedTickets = ticketRows.filter((ticket) => ticket.assigned_agent_id === agent.id);

              return (
                <article key={agent.id} className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
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
                        "shrink-0 rounded-md border px-2 py-1 text-xs font-semibold",
                        statusStyles[agent.status] ?? "border-zinc-200 bg-zinc-100 text-zinc-700",
                      )}
                    >
                      {agent.status}
                    </span>
                  </div>

                  <div className="mt-4 rounded-lg border border-black/10 bg-[#f8faf5] p-3">
                    <p className="text-sm text-black/58">
                      <span className="font-semibold text-black/72">Scope:</span>{" "}
                      {agent.memory_scope ?? "No scoped memory yet"}
                    </p>
                    <p className="mt-2 text-sm text-black/58">
                      <span className="font-semibold text-black/72">Capabilities:</span>{" "}
                      {agent.capabilities?.join(", ") || "General operations"}
                    </p>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">Assigned work</p>
                      <span className="text-xs font-semibold text-black/42">{assignedTickets.length} tickets</span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {assignedTickets.slice(0, 3).map((ticket) => (
                        <Link
                          key={ticket.id}
                          href={`/app/tickets/${ticket.id}`}
                          className="block rounded-lg border border-black/10 p-3 transition hover:bg-[#f8faf5]"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="truncate text-sm font-semibold">{ticket.title}</p>
                            <span className="shrink-0 text-xs font-semibold text-black/42">
                              {ticket.external_id ?? ticket.id.slice(0, 8)}
                            </span>
                          </div>
                          <p className="mt-1 text-xs uppercase tracking-[0.14em] text-black/38">
                            {ticket.status.replaceAll("_", " ")} · {ticket.priority}
                          </p>
                        </Link>
                      ))}
                      {assignedTickets.length === 0 && (
                        <p className="rounded-lg border border-dashed border-black/15 p-3 text-sm text-black/48">
                          No active tickets assigned.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {actionStatuses.map((action) => (
                      <form key={action.status} action={updateAgentStatus}>
                        <input type="hidden" name="agentId" value={agent.id} />
                        <input type="hidden" name="organizationId" value={organization.id} />
                        <input type="hidden" name="status" value={action.status} />
                        <PendingButton
                          pendingText={action.pending}
                          className={cn(
                            "h-9 rounded-lg px-3 text-sm font-semibold",
                            action.status === "Executing"
                              ? "bg-[#17211c] text-white"
                              : "border border-black/10 bg-white text-[#151914]",
                          )}
                        >
                          <action.icon size={15} />
                          {action.label}
                        </PendingButton>
                      </form>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>

          <div>
            <section className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Boxes size={18} className="text-[#2f6f60]" />
                <h2 className="font-semibold">Unassigned tickets</h2>
              </div>
              <div className="mt-4 space-y-3">
                {unassignedTickets.length > 0 ? (
                  unassignedTickets.slice(0, 5).map((ticket) => (
                    <div key={ticket.id} className="rounded-lg border border-black/10 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{ticket.title}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.14em] text-black/38">
                            {ticket.external_id ?? ticket.id.slice(0, 8)} · {ticket.status.replaceAll("_", " ")}
                          </p>
                        </div>
                        <Link
                          href={`/app/tickets/${ticket.id}`}
                          className="rounded-lg border border-black/10 px-3 py-2 text-xs font-semibold"
                        >
                          Inspect
                        </Link>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {agentRows.map((agent) => (
                          <form key={agent.id} action={assignTicketToAgent}>
                            <input type="hidden" name="ticketId" value={ticket.id} />
                            <input type="hidden" name="agentId" value={agent.id} />
                            <input type="hidden" name="organizationId" value={organization.id} />
                            <PendingButton
                              pendingText="Assigning..."
                              className="h-9 rounded-lg border border-black/10 bg-white px-3 text-sm font-semibold text-[#151914]"
                            >
                              {agent.name}
                            </PendingButton>
                          </form>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="rounded-lg border border-dashed border-black/15 bg-[#f8faf5] p-4 text-sm text-black/48">
                    Every ticket is assigned to an agent.
                  </p>
                )}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
