import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  Filter,
  Plus,
  Search,
  TriangleAlert,
} from "lucide-react";
import { escalateTicket, updateTicketStatus } from "@/app/app/actions";
import { PageHeader } from "@/components/dashboard/page-header";
import { PendingButton } from "@/components/ui/pending-button";
import { ticketIcons } from "@/lib/dashboard-data";
import { computeSla } from "@/lib/sla";
import { canSeeTicket, loadTeamContext } from "@/lib/teams";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const statusOptions = [
  { value: "all", label: "All statuses" },
  { value: "new", label: "New" },
  { value: "triaging", label: "Investigating" },
  { value: "approval_required", label: "Approval" },
  { value: "executing", label: "Resolving" },
  { value: "resolved", label: "Resolved" },
  { value: "blocked", label: "Blocked" },
  { value: "failed", label: "Failed" },
];

const priorityOptions = [
  { value: "all", label: "All priorities" },
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const slaOptions = [
  { value: "all", label: "Any SLA" },
  { value: "attention", label: "At risk or breached" },
  { value: "at_risk", label: "At risk" },
  { value: "breached", label: "Breached (open)" },
];

const statusStyles: Record<string, string> = {
  new: "border-zinc-200 bg-zinc-50 text-zinc-700",
  triaging: "border-sky-200 bg-sky-50 text-sky-700",
  approval_required: "border-[#b7d8f2] bg-[#e7f3ff] text-[#0b5f91]",
  executing: "border-emerald-200 bg-emerald-50 text-emerald-700",
  resolved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  blocked: "border-rose-200 bg-rose-50 text-rose-700",
  failed: "border-rose-200 bg-rose-50 text-rose-700",
};

const statusLabels: Record<string, string> = {
  new: "New",
  triaging: "Investigating",
  approval_required: "Approval",
  executing: "Resolving",
  resolved: "Resolved",
  failed: "Failed",
  blocked: "Blocked",
};

export default async function TicketInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; priority?: string; category?: string; team?: string; sla?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect("/auth/sign-in?message=Sign in to manage the AI ticket inbox.");
  }

  const organization = await ensureWorkspace(supabase, userData.user);
  const params = await searchParams;
  const [{ data: tickets }, { data: approvals }] = await Promise.all([
    supabase
      .from("tickets")
      .select("*, agents(id, name, status)")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("approval_requests")
      .select("id, ticket_id, status")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false }),
  ]);

  const ctx = await loadTeamContext(supabase, organization.id, userData.user);
  const teamsById = new Map(ctx.teams.map((team) => [team.id, team]));
  const canCreate = ctx.orgRole !== "viewer";

  // App-level team scoping: members only see tickets for their teams (owners/admins see all).
  const ticketRows = (tickets ?? []).filter((ticket) => canSeeTicket(ticket, ctx));
  const pendingApprovalTicketIds = new Set((approvals ?? []).filter((approval) => approval.status === "pending").map((approval) => approval.ticket_id));
  const categories = Array.from(new Set(ticketRows.map((ticket) => ticket.category).filter(Boolean))).sort();
  const hasAppliedFilter = hasTicketFilter(params);
  let filteredTickets = hasAppliedFilter ? filterTickets(ticketRows, params) : [];
  if (hasAppliedFilter && params.team && params.team !== "all") {
    filteredTickets = filteredTickets.filter(
      (ticket) => ticket.requesting_team_id === params.team || ticket.assigned_team_id === params.team,
    );
  }
  if (hasAppliedFilter && params.sla && params.sla !== "all") {
    filteredTickets = filteredTickets.filter((ticket) => {
      if (ticket.status === "resolved") return false;
      const state = computeSla({
        priority: ticket.priority,
        createdAt: ticket.created_at,
        status: ticket.status,
        resolvedAt: ticket.resolved_at,
      }).state;
      if (params.sla === "at_risk") return state === "at_risk";
      if (params.sla === "breached") return state === "breached";
      return state === "at_risk" || state === "breached"; // attention
    });
  }

  // SLA watch counts across all visible open tickets.
  let atRiskOpen = 0;
  let breachedOpen = 0;
  for (const ticket of ticketRows) {
    if (ticket.status === "resolved") continue;
    const state = computeSla({
      priority: ticket.priority,
      createdAt: ticket.created_at,
      status: ticket.status,
      resolvedAt: ticket.resolved_at,
    }).state;
    if (state === "at_risk") atRiskOpen += 1;
    else if (state === "breached") breachedOpen += 1;
  }

  return (
    <main className="min-h-screen bg-[#f4f8fb] px-4 py-5 text-[#07111f] md:px-8">
      <div className="mx-auto max-w-6xl">
        <PageHeader
          crumbs={[{ label: "IT" }, { label: "Tickets" }]}
          title="Tickets"
          description="Filter the queue, inspect requests, and resolve work."
          actions={
            canCreate ? (
              <Link
                href="/app/tickets/new"
                className="inline-flex h-10 items-center gap-2 rounded-md bg-[#0b2a4a] px-3 text-sm font-semibold text-white"
              >
                <Plus size={16} />
                New ticket
              </Link>
            ) : undefined
          }
        />

        {(breachedOpen > 0 || atRiskOpen > 0) && params.sla !== "attention" && params.sla !== "breached" && params.sla !== "at_risk" && (
          <Link
            href="/app/tickets?sla=attention"
            className="mt-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
          >
            <TriangleAlert size={16} />
            {breachedOpen > 0 && <span>{breachedOpen} breached</span>}
            {breachedOpen > 0 && atRiskOpen > 0 && <span className="text-amber-400">·</span>}
            {atRiskOpen > 0 && <span>{atRiskOpen} at risk</span>}
            <span className="ml-1 font-normal text-amber-800">— open the SLA watch</span>
            <ArrowRight size={15} className="ml-auto" />
          </Link>
        )}

        <section className="mt-5 grid gap-5 xl:grid-cols-[300px_1fr]">
          <aside>
            <div className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Filter size={17} className="text-[#0b5f91]" />
                <h2 className="font-semibold">Filters</h2>
              </div>
              <form action="/app/tickets" className="mt-4 grid gap-3">
                <label className="text-sm font-semibold">
                  Search
                  <div className="mt-2 flex h-10 items-center gap-2 rounded-md border border-black/10 bg-[#f8fbfe] px-3">
                    <Search size={16} className="text-black/38" />
                    <input
                      name="q"
                      defaultValue={params.q ?? ""}
                      className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-black/38"
                      placeholder="Ticket, requester, summary..."
                    />
                  </div>
                </label>

                <SelectFilter name="status" label="Status" value={params.status ?? "all"} options={statusOptions} />
                <SelectFilter name="priority" label="Priority" value={params.priority ?? "all"} options={priorityOptions} />
                <SelectFilter name="sla" label="SLA" value={params.sla ?? "all"} options={slaOptions} />
                <SelectFilter
                  name="category"
                  label="Category"
                  value={params.category ?? "all"}
                  options={[
                    { value: "all", label: "All categories" },
                    ...categories.map((category) => ({ value: String(category), label: String(category) })),
                  ]}
                />

                {ctx.teams.length > 0 && (
                  <SelectFilter
                    name="team"
                    label="Team"
                    value={params.team ?? "all"}
                    options={[
                      { value: "all", label: "All teams" },
                      ...ctx.teams.map((team) => ({ value: team.id, label: team.name })),
                    ]}
                  />
                )}

                <button className="h-10 rounded-md bg-[#0b2a4a] px-3 text-sm font-semibold text-white">
                  Apply filters
                </button>
                <Link
                  href="/app/tickets"
                  className="inline-flex h-10 items-center justify-center rounded-md border border-black/10 px-3 text-sm font-semibold"
                >
                  Clear
                </Link>
              </form>
            </div>

          </aside>

          <section className="rounded-lg border border-black/10 bg-white shadow-sm">
            <div className="flex flex-col gap-2 border-b border-black/10 px-4 py-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Queue results</h2>
                <p className="mt-1 text-sm text-black/52">
                  {hasAppliedFilter
                    ? `Showing ${filteredTickets.length} matching tickets`
                    : "Apply a filter to show tickets"}
                </p>
              </div>
              <Link
                href="/app/approvals"
                className="inline-flex h-9 items-center gap-2 rounded-md border border-black/10 px-3 text-sm font-semibold"
              >
                Approval workspace
                <ArrowRight size={15} />
              </Link>
            </div>

            <div className="divide-y divide-black/8">
              {filteredTickets.map((ticket) => {
                const TicketIcon = ticketIcons[ticket.category as keyof typeof ticketIcons] ?? ticketIcons.Default;
                const sla = computeSla({
                  priority: ticket.priority,
                  createdAt: ticket.created_at,
                  status: ticket.status,
                  resolvedAt: ticket.resolved_at,
                });

                return (
                  <article key={ticket.id} className="grid gap-4 px-4 py-3 transition hover:bg-[#f8fbfe] lg:grid-cols-[1fr_190px]">
                    <div className="flex gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#e7f3ff] text-[#0b5f91]">
                        <TicketIcon size={19} />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold text-black/42">{ticket.external_id ?? ticket.id.slice(0, 8)}</span>
                          <StatusPill status={ticket.status} />
                          <span className="rounded-md border border-black/10 px-2 py-1 text-xs font-semibold text-black/52">
                            {ticket.priority}
                          </span>
                          <span className={cn("rounded-md border px-2 py-1 text-xs font-semibold", sla.badgeClass)}>
                            SLA: {sla.label}
                          </span>
                          {pendingApprovalTicketIds.has(ticket.id) && (
                            <span className="rounded-md border border-[#b7d8f2] bg-[#e7f3ff] px-2 py-1 text-xs font-semibold text-[#0b5f91]">
                              approval pending
                            </span>
                          )}
                        </div>
                        <h3 className="mt-2 font-semibold tracking-tight">{ticket.title}</h3>
                        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                          {ticket.ai_summary ?? ticket.description ?? "No summary available."}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-black/42">
                          <span>{ticket.category ?? "Uncategorized"}</span>
                          <span>{ticket.requester_name ?? ticket.requester_email ?? "Unknown requester"}</span>
                          <span>{formatDate(ticket.created_at)}</span>
                          {(ticket.requesting_team_id || ticket.assigned_team_id) && (
                            <span className="text-[#0b5f91]">
                              {teamsById.get(ticket.requesting_team_id)?.name ?? "—"} →{" "}
                              {teamsById.get(ticket.assigned_team_id)?.name ?? "Unassigned"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 lg:items-end">
                      <div className="text-left lg:text-right">
                        <p className="text-sm font-semibold">{ticket.agents?.name ?? "Unassigned"}</p>
                        <p className="text-xs text-black/48">{Number(ticket.ai_confidence ?? 0)}% confidence</p>
                      </div>
                      <div className="flex flex-wrap gap-2 lg:justify-end">
                        <Link
                          href={`/app/tickets/${ticket.id}`}
                          className="inline-flex h-9 items-center gap-2 rounded-md bg-[#0b2a4a] px-3 text-sm font-semibold text-white"
                        >
                          Inspect
                          <ArrowRight size={15} />
                        </Link>
                        {canCreate &&
                          !["resolved", "blocked"].includes(ticket.status) &&
                          (sla.state === "at_risk" || sla.state === "breached") && (
                            <EscalateForm ticketId={ticket.id} organizationId={organization.id} />
                          )}
                        {canCreate && !["resolved", "blocked"].includes(ticket.status) && (
                          <QuickStatusForm ticketId={ticket.id} organizationId={organization.id} status="resolved" label="Resolve" />
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}

              {!hasAppliedFilter && (
                <p className="p-8 text-center text-sm text-black/48">
                  No tickets are shown until you apply a status, priority, category, or search filter.
                </p>
              )}

              {hasAppliedFilter && filteredTickets.length === 0 && (
                <p className="p-8 text-center text-sm text-black/48">No tickets match the current filters.</p>
              )}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

function QuickStatusForm({
  ticketId,
  organizationId,
  status,
  label,
}: {
  ticketId: string;
  organizationId: string;
  status: "resolved" | "blocked" | "executing";
  label: string;
}) {
  return (
    <form action={updateTicketStatus}>
      <input type="hidden" name="ticketId" value={ticketId} />
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="status" value={status} />
      <PendingButton
        pendingText="Updating..."
        className="h-9 rounded-lg border border-black/10 bg-white px-3 text-sm font-semibold"
      >
        <CheckCircle2 size={15} />
        {label}
      </PendingButton>
    </form>
  );
}

function EscalateForm({ ticketId, organizationId }: { ticketId: string; organizationId: string }) {
  return (
    <form action={escalateTicket}>
      <input type="hidden" name="ticketId" value={ticketId} />
      <input type="hidden" name="organizationId" value={organizationId} />
      <PendingButton
        pendingText="Escalating..."
        className="h-9 rounded-lg border border-amber-300 bg-amber-50 px-3 text-sm font-semibold text-amber-800"
      >
        <ArrowUp size={15} />
        Escalate
      </PendingButton>
    </form>
  );
}

function SelectFilter({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="text-sm font-semibold">
      {label}
      <select
        name={name}
        defaultValue={value}
        className="mt-2 h-10 w-full rounded-md border border-black/10 bg-[#f8fbfe] px-3 text-sm outline-none focus:border-[#0b5f91]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "rounded-md border px-2 py-1 text-xs font-semibold",
        statusStyles[status] ?? "border-zinc-200 bg-zinc-50 text-zinc-700",
      )}
    >
      {statusLabels[status] ?? status.replaceAll("_", " ")}
    </span>
  );
}

function filterTickets<
  T extends {
    title: string;
    description: string | null;
    ai_summary: string | null;
    requester_name: string | null;
    requester_email: string | null;
    external_id: string | null;
    status: string;
    priority: string;
    category: string | null;
  },
>(tickets: T[], params: { q?: string; status?: string; priority?: string; category?: string }) {
  let filtered = tickets;
  const query = params.q?.trim().toLowerCase();

  if (query) {
    filtered = filtered.filter((ticket) =>
      [
        ticket.title,
        ticket.description ?? "",
        ticket.ai_summary ?? "",
        ticket.requester_name ?? "",
        ticket.requester_email ?? "",
        ticket.external_id ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }

  if (params.status && params.status !== "all") {
    filtered = filtered.filter((ticket) => ticket.status === params.status);
  }

  if (params.priority && params.priority !== "all") {
    filtered = filtered.filter((ticket) => ticket.priority === params.priority);
  }

  if (params.category && params.category !== "all") {
    filtered = filtered.filter((ticket) => ticket.category === params.category);
  }

  return filtered;
}

function hasTicketFilter(params: { q?: string; status?: string; priority?: string; category?: string; team?: string; sla?: string }) {
  return Boolean(
    params.q?.trim() ||
      (params.status && params.status !== "all") ||
      (params.priority && params.priority !== "all") ||
      (params.category && params.category !== "all") ||
      (params.team && params.team !== "all") ||
      (params.sla && params.sla !== "all"),
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
