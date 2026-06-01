import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Clock3,
  FileText,
  MessageSquareText,
  ShieldAlert,
  Siren,
  TimerReset,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { acknowledgeEscalation, escalateTicket } from "@/app/app/escalations/actions";
import { PageHeader } from "@/components/dashboard/page-header";
import { PendingButton } from "@/components/ui/pending-button";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const priorityHours: Record<string, number> = {
  critical: 2,
  high: 8,
  medium: 24,
  low: 72,
};

const statusStyles: Record<string, string> = {
  breached: "border-rose-200 bg-rose-50 text-rose-700",
  risk: "border-amber-200 bg-amber-50 text-amber-800",
  healthy: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

export default async function EscalationsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect("/auth/sign-in?message=Sign in to manage escalations.");
  }

  const organization = await ensureWorkspace(supabase, userData.user);
  const [{ data: tickets }, { data: approvals }, { data: auditLogs }, { data: workflowRuns }] = await Promise.all([
    supabase
      .from("tickets")
      .select("*, agents(id, name, status)")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("approval_requests")
      .select("id, ticket_id, title, status, due_at, created_at")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("audit_logs")
      .select("*, tickets(external_id, title)")
      .eq("organization_id", organization.id)
      .in("event_type", ["ticket_escalated", "escalation_acknowledged", "approved", "rejected", "ticket_blocked"])
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("workflow_runs")
      .select("id, ticket_id, status, confidence, started_at, completed_at, workflows(name)")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  const ticketRows = tickets ?? [];
  const approvalRows = approvals ?? [];
  const pendingApprovals = approvalRows.filter((approval) => approval.status === "pending");
  const pendingApprovalIds = new Set(pendingApprovals.map((approval) => approval.ticket_id).filter(Boolean));
  const escalations = ticketRows
    .filter((ticket) => shouldEscalate(ticket, pendingApprovalIds))
    .map((ticket) => ({
      ticket,
      sla: readSla(ticket),
      approval: pendingApprovals.find((approval) => approval.ticket_id === ticket.id),
      run: (workflowRuns ?? []).find((run) => run.ticket_id === ticket.id),
    }))
    .sort((a, b) => a.sla.remainingMinutes - b.sla.remainingMinutes);

  const breached = escalations.filter((item) => item.sla.state === "breached").length;
  const atRisk = escalations.filter((item) => item.sla.state === "risk").length;
  const approvalWait = escalations.filter((item) => item.approval).length;
  const avgRemaining = escalations.length
    ? Math.round(escalations.reduce((sum, item) => sum + item.sla.remainingMinutes, 0) / escalations.length)
    : 0;

  return (
    <main className="min-h-screen bg-[#f6f7f2] px-4 py-6 text-[#151914] md:px-8">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          crumbs={[{ label: "IT" }, { label: "Escalations" }]}
          title="Escalations"
          description="Catch stalled tickets, pending approvals, failed runs, and SLA pressure before they breach."
          actions={
            <Link
              href="/app/approvals"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#17211c] px-3 text-sm font-semibold text-white"
            >
              Approval queue
              <ArrowRight size={16} />
            </Link>
          }
        />

        <section className="mt-6 grid gap-3 md:grid-cols-4">
          <MetricCard label="Breached" value={String(breached)} icon={Siren} />
          <MetricCard label="At risk" value={String(atRisk)} icon={TimerReset} />
          <MetricCard label="Approval wait" value={String(approvalWait)} icon={Clock3} />
          <MetricCard label="Avg remaining" value={formatDuration(avgRemaining)} icon={CheckCircle2} />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_.68fr]">
          <div className="space-y-4">
            {escalations.map(({ ticket, sla, approval, run }) => (
              <article key={ticket.id} className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <SlaPill state={sla.state} />
                      <span className="rounded-md border border-black/10 px-2 py-1 text-xs font-semibold text-black/52">
                        {ticket.priority}
                      </span>
                      <span className="rounded-md border border-black/10 px-2 py-1 text-xs font-semibold text-black/52">
                        {ticket.status.replaceAll("_", " ")}
                      </span>
                    </div>
                    <h2 className="mt-3 text-xl font-semibold tracking-tight">{ticket.title}</h2>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-black/56">
                      {ticket.ai_summary ?? ticket.description ?? "Ticket needs operator review."}
                    </p>
                  </div>
                  <Link
                    href={`/app/tickets/${ticket.id}`}
                    className="inline-flex h-10 w-fit items-center gap-2 rounded-lg border border-black/10 px-3 text-sm font-semibold"
                  >
                    Inspect ticket
                    <MessageSquareText size={15} />
                  </Link>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-4">
                  <Fact label="SLA remaining" value={formatDuration(sla.remainingMinutes)} />
                  <Fact label="Age" value={formatDuration(sla.ageMinutes)} />
                  <Fact label="Agent" value={ticket.agents?.name ?? "Unassigned"} />
                  <Fact label="Workflow" value={readRelationName(run?.workflows) ?? "Not linked"} />
                </div>

                {approval && (
                  <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm font-semibold text-amber-950">Pending approval: {approval.title}</p>
                    <p className="mt-1 text-sm text-amber-900/70">
                      Due {formatDate(approval.due_at)} · opened {formatDate(approval.created_at)}
                    </p>
                  </div>
                )}

                <div className="mt-5 grid gap-3 lg:grid-cols-2">
                  <EscalateForm
                    ticketId={ticket.id}
                    organizationId={organization.id}
                    title={`Escalation: ${ticket.external_id ?? ticket.title}`}
                  />
                  <AcknowledgeForm ticketId={ticket.id} organizationId={organization.id} />
                </div>
              </article>
            ))}

            {escalations.length === 0 && (
              <div className="rounded-xl border border-dashed border-black/15 bg-white p-8 text-center">
                <Siren size={28} className="mx-auto text-[#2f6f60]" />
                <p className="mt-3 font-semibold">No escalations need attention.</p>
                <p className="mt-2 text-sm text-black/52">Open tickets are currently inside SLA boundaries.</p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <Panel title="Escalation logic" icon={ShieldAlert}>
              <div className="space-y-3">
                <Boundary title="Critical" detail="2 hour operational target before breach." />
                <Boundary title="High" detail="8 hour operational target for visible business impact." />
                <Boundary title="Medium" detail="24 hour target for standard employee requests." />
                <Boundary title="Low" detail="72 hour target for non-urgent queue work." />
              </div>
            </Panel>

            <Panel title="Recent events" icon={FileText}>
              <div className="divide-y divide-black/8 rounded-lg border border-black/10">
                {(auditLogs ?? []).map((log) => (
                  <div key={log.id} className="p-4">
                    <p className="font-semibold">{log.event_summary}</p>
                    <p className="mt-1 text-sm text-black/50">
                      {log.tickets?.external_id ?? "workspace"} · {formatDate(log.created_at)}
                    </p>
                    {typeof log.metadata?.note === "string" && log.metadata.note && (
                      <p className="mt-2 text-sm leading-6 text-black/55">{log.metadata.note}</p>
                    )}
                  </div>
                ))}
                {(auditLogs ?? []).length === 0 && (
                  <p className="p-4 text-sm text-black/48">Escalation decisions will appear here.</p>
                )}
              </div>
            </Panel>
          </div>
        </section>
      </div>
    </main>
  );
}

function EscalateForm({
  ticketId,
  organizationId,
  title,
}: {
  ticketId: string;
  organizationId: string;
  title: string;
}) {
  return (
    <form action={escalateTicket} className="rounded-lg border border-rose-200 bg-rose-50 p-4">
      <input type="hidden" name="ticketId" value={ticketId} />
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="title" value={title} />
      <textarea
        name="note"
        rows={3}
        className="w-full resize-none rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm outline-none placeholder:text-black/38 focus:border-rose-400"
        placeholder="Optional escalation note, owner, or ticket reference..."
      />
      <PendingButton pendingText="Escalating..." className="mt-3 h-10 rounded-lg bg-rose-700 px-3 text-sm font-semibold text-white">
        <Siren size={16} />
        Escalate
      </PendingButton>
    </form>
  );
}

function AcknowledgeForm({ ticketId, organizationId }: { ticketId: string; organizationId: string }) {
  return (
    <form action={acknowledgeEscalation} className="rounded-lg border border-black/10 bg-[#f8faf5] p-4">
      <input type="hidden" name="ticketId" value={ticketId} />
      <input type="hidden" name="organizationId" value={organizationId} />
      <textarea
        name="note"
        rows={3}
        className="w-full resize-none rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none placeholder:text-black/38 focus:border-[#2f6f60]"
        placeholder="Optional acknowledgement note..."
      />
      <PendingButton pendingText="Acknowledging..." className="mt-3 h-10 rounded-lg bg-[#17211c] px-3 text-sm font-semibold text-white">
        <CheckCircle2 size={16} />
        Acknowledge
      </PendingButton>
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
    <div className="rounded-lg border border-black/10 bg-[#f8faf5] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/38">{label}</p>
      <p className="mt-2 text-sm font-semibold text-black/70">{value}</p>
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

function SlaPill({ state }: { state: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold",
        statusStyles[state] ?? statusStyles.healthy,
      )}
    >
      {state === "breached" ? <CircleAlert size={13} /> : <Clock3 size={13} />}
      {state}
    </span>
  );
}

function shouldEscalate(
  ticket: { id: string; status: string; priority: string; created_at: string | null },
  pendingApprovalIds: Set<string>,
) {
  if (["resolved"].includes(ticket.status)) {
    return false;
  }

  const sla = readSla(ticket);
  return (
    ["blocked", "failed", "approval_required"].includes(ticket.status) ||
    pendingApprovalIds.has(ticket.id) ||
    sla.state !== "healthy"
  );
}

function readSla(ticket: { priority: string; created_at: string | null }) {
  const targetMinutes = (priorityHours[ticket.priority] ?? 24) * 60;
  const createdAt = ticket.created_at ? new Date(ticket.created_at).getTime() : Date.now();
  const ageMinutes = Math.max(0, Math.round((Date.now() - createdAt) / 60000));
  const remainingMinutes = targetMinutes - ageMinutes;
  const state = remainingMinutes <= 0 ? "breached" : remainingMinutes <= targetMinutes * 0.25 ? "risk" : "healthy";

  return { ageMinutes, remainingMinutes, state };
}

function formatDuration(minutes: number) {
  const sign = minutes < 0 ? "-" : "";
  const absolute = Math.abs(minutes);
  const hours = Math.floor(absolute / 60);
  const mins = absolute % 60;

  if (hours <= 0) {
    return `${sign}${mins}m`;
  }

  return `${sign}${hours}h ${mins}m`;
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

function readRelationName(value: { name?: string | null } | Array<{ name?: string | null }> | null | undefined) {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? value[0]?.name ?? null : value.name ?? null;
}
