import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CheckCircle2,
  CircleAlert,
  Clock3,
  Flame,
  MessageSquareText,
  ShieldAlert,
  Siren,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { openIncident, resolveIncident } from "@/app/app/incidents/actions";
import { PageHeader } from "@/components/dashboard/page-header";
import { PendingButton } from "@/components/ui/pending-button";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const severityStyles: Record<string, string> = {
  critical: "border-rose-200 bg-rose-50 text-rose-700",
  high: "border-amber-200 bg-amber-50 text-amber-800",
  medium: "border-sky-200 bg-sky-50 text-sky-700",
};

export default async function IncidentsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect("/auth/sign-in?message=Sign in to open the incident room.");
  }

  const organization = await ensureWorkspace(supabase, userData.user);
  const [{ data: tickets }, { data: incidentLogs }, { data: approvals }, { data: workflowRuns }] = await Promise.all([
    supabase
      .from("tickets")
      .select("*, agents(name, status)")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("audit_logs")
      .select("*, tickets(id, external_id, title)")
      .eq("organization_id", organization.id)
      .in("event_type", ["incident_opened", "incident_resolved", "ticket_blocked", "ticket_escalated"])
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("approval_requests")
      .select("id, ticket_id, title, status, created_at")
      .eq("organization_id", organization.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase
      .from("workflow_runs")
      .select("id, ticket_id, status, confidence, workflows(name)")
      .eq("organization_id", organization.id)
      .in("status", ["running", "waiting_for_approval", "failed", "blocked"])
      .order("created_at", { ascending: false }),
  ]);

  const ticketRows = tickets ?? [];
  const logs = incidentLogs ?? [];
  const openedIncidentIds = new Set(logs.filter((log) => log.event_type === "incident_opened").map((log) => log.ticket_id).filter(Boolean));
  const resolvedIncidentIds = new Set(logs.filter((log) => log.event_type === "incident_resolved").map((log) => log.ticket_id).filter(Boolean));
  const pendingApprovalIds = new Set((approvals ?? []).map((approval) => approval.ticket_id).filter(Boolean));
  const incidentCandidates = ticketRows
    .filter((ticket) => shouldShowIncident(ticket, openedIncidentIds, resolvedIncidentIds, pendingApprovalIds))
    .map((ticket) => ({
      ticket,
      severity: readSeverity(ticket, openedIncidentIds, pendingApprovalIds),
      incidentLog: logs.find((log) => log.ticket_id === ticket.id && log.event_type === "incident_opened"),
      approval: (approvals ?? []).find((approval) => approval.ticket_id === ticket.id),
      run: (workflowRuns ?? []).find((run) => run.ticket_id === ticket.id),
    }));

  const activeIncidents = incidentCandidates.filter((item) => openedIncidentIds.has(item.ticket.id) && !resolvedIncidentIds.has(item.ticket.id));
  const criticalCount = incidentCandidates.filter((item) => item.severity === "critical").length;
  const approvalCount = incidentCandidates.filter((item) => item.approval).length;

  return (
    <main className="min-h-screen bg-[#f6f7f2] px-4 py-6 text-[#151914] md:px-8">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          crumbs={[{ label: "IT" }, { label: "Incidents" }]}
          title="Incidents"
          description="Coordinate high-risk work across the incident room."
          actions={
            <Link
              href="/app/escalations"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#17211c] px-3 text-sm font-semibold text-white"
            >
              SLA view
              <Clock3 size={16} />
            </Link>
          }
        />

        <section className="mt-6 grid gap-3 md:grid-cols-4">
          <MetricCard label="Active incidents" value={String(activeIncidents.length)} icon={Siren} />
          <MetricCard label="Critical risk" value={String(criticalCount)} icon={Flame} />
          <MetricCard label="Approval holds" value={String(approvalCount)} icon={ShieldAlert} />
          <MetricCard label="Incident events" value={String(logs.length)} icon={CircleAlert} />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_.62fr]">
          <div className="space-y-4">
            {incidentCandidates.map(({ ticket, severity, incidentLog, approval, run }) => {
              const isOpen = openedIncidentIds.has(ticket.id) && !resolvedIncidentIds.has(ticket.id);

              return (
                <article key={ticket.id} className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn("rounded-md border px-2 py-1 text-xs font-semibold", severityStyles[severity])}>
                          {severity}
                        </span>
                        <span className="rounded-md border border-black/10 px-2 py-1 text-xs font-semibold text-black/52">
                          {isOpen ? "incident open" : ticket.status.replaceAll("_", " ")}
                        </span>
                        <span className="text-xs font-semibold text-black/38">{ticket.external_id ?? ticket.id.slice(0, 8)}</span>
                      </div>
                      <h2 className="mt-3 text-xl font-semibold tracking-tight">{ticket.title}</h2>
                    </div>
                    <Link
                      href={`/app/tickets/${ticket.id}`}
                      className="inline-flex h-10 w-fit items-center gap-2 rounded-lg border border-black/10 px-3 text-sm font-semibold"
                    >
                      Inspect
                      <MessageSquareText size={15} />
                    </Link>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-4">
                    <Fact label="Agent" value={ticket.agents?.name ?? "Unassigned"} />
                    <Fact label="Workflow" value={readRelationName(run?.workflows) ?? "Not linked"} />
                    <Fact label="Approval" value={approval ? "Waiting" : "None"} />
                    <Fact label="Opened" value={incidentLog ? formatDate(incidentLog.created_at) : "Not opened"} />
                  </div>

                  <div className="mt-5 grid gap-3 lg:grid-cols-2">
                    <OpenIncidentForm ticketId={ticket.id} organizationId={organization.id} disabled={isOpen} defaultSeverity={severity} />
                    <ResolveIncidentForm ticketId={ticket.id} organizationId={organization.id} disabled={!isOpen} />
                  </div>
                </article>
              );
            })}

            {incidentCandidates.length === 0 && (
              <div className="rounded-xl border border-dashed border-black/15 bg-white p-8 text-center">
                <CheckCircle2 size={28} className="mx-auto text-[#2f6f60]" />
                <p className="mt-3 font-semibold">No incident candidates.</p>
                <p className="mt-2 text-sm text-black/52">Critical, blocked, or failed tickets will appear here.</p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <Panel title="Incident roles" icon={UsersRound}>
              <div className="space-y-3">
                <RoleBoundary title="Commander" detail="Owns decisions and timeline." />
                <RoleBoundary title="Operator" detail="Runs workflow recovery." />
                <RoleBoundary title="Comms" detail="Keeps stakeholders updated." />
              </div>
            </Panel>

            <Panel title="Incident log" icon={CircleAlert}>
              <div className="divide-y divide-black/8 rounded-lg border border-black/10">
                {logs.map((log) => (
                  <div key={log.id} className="p-4">
                    <p className="font-semibold">{log.event_summary}</p>
                    <p className="mt-1 text-sm text-black/48">
                      {log.tickets?.external_id ?? "workspace"} · {formatDate(log.created_at)}
                    </p>
                    {typeof log.metadata?.note === "string" && log.metadata.note && (
                      <p className="mt-2 text-sm text-black/55">{log.metadata.note}</p>
                    )}
                  </div>
                ))}
                {logs.length === 0 && <p className="p-4 text-sm text-black/48">Incident events will appear here.</p>}
              </div>
            </Panel>
          </div>
        </section>
      </div>
    </main>
  );
}

function OpenIncidentForm({
  ticketId,
  organizationId,
  defaultSeverity,
  disabled,
}: {
  ticketId: string;
  organizationId: string;
  defaultSeverity: string;
  disabled: boolean;
}) {
  return (
    <form action={openIncident} className="rounded-lg border border-rose-200 bg-rose-50 p-4">
      <input type="hidden" name="ticketId" value={ticketId} />
      <input type="hidden" name="organizationId" value={organizationId} />
      <div className="grid gap-2 sm:grid-cols-2">
        <select
          name="severity"
          defaultValue={defaultSeverity}
          disabled={disabled}
          className="h-10 rounded-lg border border-rose-200 bg-white px-3 text-sm font-semibold outline-none disabled:opacity-50"
        >
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
        </select>
        <input
          name="commander"
          disabled={disabled}
          placeholder="Commander"
          className="h-10 rounded-lg border border-rose-200 bg-white px-3 text-sm outline-none disabled:opacity-50"
        />
      </div>
      <textarea
        name="note"
        rows={3}
        disabled={disabled}
        className="mt-3 w-full resize-none rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm outline-none disabled:opacity-50"
        placeholder="Optional incident note..."
      />
      <PendingButton
        pendingText="Opening..."
        disabled={disabled}
        className="mt-3 h-10 rounded-lg bg-rose-700 px-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        <Siren size={16} />
        Open incident
      </PendingButton>
    </form>
  );
}

function ResolveIncidentForm({ ticketId, organizationId, disabled }: { ticketId: string; organizationId: string; disabled: boolean }) {
  return (
    <form action={resolveIncident} className="rounded-lg border border-black/10 bg-[#f8faf5] p-4">
      <input type="hidden" name="ticketId" value={ticketId} />
      <input type="hidden" name="organizationId" value={organizationId} />
      <textarea
        name="note"
        rows={3}
        disabled={disabled}
        className="w-full resize-none rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none disabled:opacity-50"
        placeholder="Optional resolution note..."
      />
      <PendingButton
        pendingText="Resolving..."
        disabled={disabled}
        className="mt-3 h-10 rounded-lg bg-[#17211c] px-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        <CheckCircle2 size={16} />
        Resolve
      </PendingButton>
    </form>
  );
}

function MetricCard({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) {
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

function Panel({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }) {
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
    <div className="rounded-lg border border-black/10 bg-[#f8faf5] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/38">{label}</p>
      <p className="mt-2 text-sm font-semibold text-black/70">{value}</p>
    </div>
  );
}

function RoleBoundary({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-lg border border-black/10 p-4">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-black/50">{detail}</p>
    </div>
  );
}

function shouldShowIncident(
  ticket: { id: string; status: string; priority: string },
  openedIncidentIds: Set<string>,
  resolvedIncidentIds: Set<string>,
  pendingApprovalIds: Set<string>,
) {
  if (ticket.status === "resolved") return false;
  if (openedIncidentIds.has(ticket.id) && !resolvedIncidentIds.has(ticket.id)) return true;

  return (
    ["blocked", "failed", "approval_required"].includes(ticket.status) ||
    ["critical", "high"].includes(ticket.priority) ||
    pendingApprovalIds.has(ticket.id)
  );
}

function readSeverity(
  ticket: { id: string; status: string; priority: string },
  openedIncidentIds: Set<string>,
  pendingApprovalIds: Set<string>,
) {
  if (ticket.priority === "critical" || ticket.status === "failed" || openedIncidentIds.has(ticket.id)) return "critical";
  if (ticket.priority === "high" || ticket.status === "blocked" || pendingApprovalIds.has(ticket.id)) return "high";
  return "medium";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not recorded";

  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function readRelationName(value: { name?: string | null } | Array<{ name?: string | null }> | null | undefined) {
  if (!value) return null;
  return Array.isArray(value) ? value[0]?.name ?? null : value.name ?? null;
}
