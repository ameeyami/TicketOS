import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  MessageSquareText,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { decideApproval } from "@/app/app/actions";
import { PendingButton } from "@/components/ui/pending-button";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-800",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  rejected: "border-rose-200 bg-rose-50 text-rose-700",
  cancelled: "border-zinc-200 bg-zinc-50 text-zinc-700",
};

export default async function ApprovalsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect("/auth/sign-in?message=Sign in to manage approvals.");
  }

  const organization = await ensureWorkspace(supabase, userData.user);
  const { data: approvals } = await
    supabase
      .from("approval_requests")
      .select("*, tickets(id, external_id, title, priority, status, ai_confidence), agents(name), workflow_runs(id, status, confidence, workflows(name))")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false });

  const approvalRows = approvals ?? [];
  const pendingApprovals = approvalRows.filter((approval) => approval.status === "pending");
  const resolvedApprovals = approvalRows.filter((approval) => approval.status !== "pending");
  const approvedCount = approvalRows.filter((approval) => approval.status === "approved").length;
  const rejectedCount = approvalRows.filter((approval) => approval.status === "rejected").length;

  return (
    <main className="min-h-screen bg-[#fbfaf8] px-4 py-5 text-[#151914] md:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/app"
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-black/10 bg-white px-3 text-sm font-semibold"
        >
          <ArrowLeft size={16} />
          Command center
        </Link>

        <div className="mt-5 flex flex-col gap-4 border-b border-black/10 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Approvals</h1>
            <p className="mt-2 text-sm text-black/54">Review requests that need a human decision.</p>
          </div>
        </div>

        <section className="mt-5 grid gap-3 md:grid-cols-3">
          <MetricCard label="Pending" value={String(pendingApprovals.length)} icon={Clock3} />
          <MetricCard label="Approved" value={String(approvedCount)} icon={CheckCircle2} />
          <MetricCard label="Rejected" value={String(rejectedCount)} icon={XCircle} />
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <Panel title="Needs decision" icon={BadgeCheck}>
              <div className="space-y-4">
                {pendingApprovals.map((approval) => (
                  <article key={approval.id} className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusPill status={approval.status} />
                          <span className="rounded-md border border-black/10 px-2 py-1 text-xs font-semibold text-black/52">
                            {approval.tickets?.priority ?? "medium"}
                          </span>
                          <span className="rounded-md border border-black/10 px-2 py-1 text-xs font-semibold text-black/52">
                            {Number(approval.tickets?.ai_confidence ?? 0)}% confidence
                          </span>
                          {approval.workflow_runs?.status && (
                            <span className="rounded-md border border-[#b7d8f2] bg-[#e7f3ff] px-2 py-1 text-xs font-semibold text-[#0b5f91]">
                              run {approval.workflow_runs.status.replaceAll("_", " ")}
                            </span>
                          )}
                        </div>
                        <h2 className="mt-3 text-xl font-semibold">{approval.title}</h2>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-black/56">
                          {approval.description ?? "An AI workflow paused for human review."}
                        </p>
                      </div>
                      {approval.ticket_id && (
                        <Link
                          href={`/app/tickets/${approval.ticket_id}`}
                          className="inline-flex h-10 items-center gap-2 rounded-lg border border-black/10 px-3 text-sm font-semibold"
                        >
                          Inspect ticket
                          <MessageSquareText size={15} />
                        </Link>
                      )}
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-3">
                      <Fact label="Ticket" value={approval.tickets?.external_id ?? "Unlinked"} />
                      <Fact label="Workflow" value={approval.workflow_runs?.workflows?.name ?? "Manual approval"} />
                      <Fact label="Due" value={formatDate(approval.due_at ?? approval.created_at)} />
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      <Fact label="Requester" value={approval.agents?.name ?? "TicketOS"} />
                      <Fact label="Opened" value={formatDate(approval.created_at)} />
                      <Fact label="Age" value={ageLabel(approval.created_at)} />
                    </div>

                    <div className="mt-5 rounded-lg border border-[#b7d8f2] bg-[#e7f3ff] p-4">
                      <p className="text-sm font-semibold text-amber-950">Decision note</p>
                      <p className="mt-1 text-sm leading-6 text-[#0b4f7a]">
                        Optional, but useful for ticket references, manager context, or exception rationale. Approval resumes the workflow; rejection blocks it.
                      </p>
                      <ApprovalDecisionForms approval={approval} />
                    </div>
                  </article>
                ))}
                {pendingApprovals.length === 0 && (
                  <p className="rounded-xl border border-dashed border-black/15 bg-white p-5 text-sm text-black/48">
                    No approvals are waiting right now.
                  </p>
                )}
              </div>
            </Panel>
          </div>

          <div>
            <Panel title="Decision history" icon={ShieldCheck}>
              <div className="space-y-3">
                {resolvedApprovals.map((approval) => (
                  <div key={approval.id} className="rounded-lg border border-black/10 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{approval.title}</p>
                        <p className="mt-1 text-sm text-black/52">
                          {approval.tickets?.external_id ?? "Ticket"} · {approval.tickets?.title ?? "No ticket title"}
                        </p>
                        <p className="mt-1 text-sm text-black/42">
                          {approval.workflow_runs?.workflows?.name ?? "Manual approval"}
                        </p>
                      </div>
                      <StatusPill status={approval.status} />
                    </div>
                    {approval.decision_note && (
                      <p className="mt-3 rounded-lg bg-[#f8faf5] p-3 text-sm leading-6 text-black/58">
                        {approval.decision_note}
                      </p>
                    )}
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-black/38">
                      {approval.decided_at ? `Decided ${formatDate(approval.decided_at)}` : "Awaiting decision time"}
                    </p>
                  </div>
                ))}
                {resolvedApprovals.length === 0 && (
                  <p className="rounded-lg border border-dashed border-black/15 p-4 text-sm text-black/48">
                    Approved and rejected requests will appear here.
                  </p>
                )}
              </div>
            </Panel>
          </div>
        </section>
      </div>
    </main>
  );
}

function ApprovalDecisionForms({
  approval,
}: {
  approval: {
    id: string;
    ticket_id: string | null;
    workflow_run_id: string | null;
    organization_id: string;
  };
}) {
  return (
    <div className="mt-4 grid gap-3 lg:grid-cols-2">
      <DecisionForm approval={approval} decision="approved" />
      <DecisionForm approval={approval} decision="rejected" />
    </div>
  );
}

function DecisionForm({
  approval,
  decision,
}: {
  approval: {
    id: string;
    ticket_id: string | null;
    workflow_run_id: string | null;
    organization_id: string;
  };
  decision: "approved" | "rejected";
}) {
  return (
    <form action={decideApproval} className="rounded-lg border border-black/10 bg-white p-3">
      <input type="hidden" name="approvalId" value={approval.id} />
      <input type="hidden" name="ticketId" value={approval.ticket_id ?? ""} />
      <input type="hidden" name="workflowRunId" value={approval.workflow_run_id ?? ""} />
      <input type="hidden" name="organizationId" value={approval.organization_id} />
      <input type="hidden" name="decision" value={decision} />
      <textarea
        name="note"
        rows={3}
        className="w-full resize-none rounded-lg border border-black/10 bg-[#f8faf5] px-3 py-2 text-sm outline-none placeholder:text-black/38 focus:border-[#2f6f60]"
        placeholder={
          decision === "approved"
            ? "Optional approval note or ticket reference..."
            : "Optional rejection reason or follow-up..."
        }
      />
      <PendingButton
        pendingText={decision === "approved" ? "Approving..." : "Rejecting..."}
        className={cn(
          "mt-3 h-10 w-full rounded-lg px-3 text-sm font-semibold",
          decision === "approved"
            ? "bg-[#17211c] text-white"
            : "border border-black/10 bg-white text-[#151914]",
        )}
      >
        {decision === "approved" ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
        {decision === "approved" ? "Approve" : "Reject"}
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
    <div className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-black/52">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
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
    <div className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-[#eef5ea] text-[#2e6658]">
          <Icon size={16} />
        </span>
        <h2 className="font-semibold">{title}</h2>
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

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "rounded-md border px-2 py-1 text-xs font-semibold",
        statusStyles[status] ?? "border-zinc-200 bg-zinc-50 text-zinc-700",
      )}
    >
      {status.replaceAll("_", " ")}
    </span>
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

function ageLabel(value: string | null | undefined) {
  if (!value) {
    return "Unknown";
  }

  const ageMs = Date.now() - new Date(value).getTime();
  const hours = Math.max(0, Math.floor(ageMs / (1000 * 60 * 60)));

  if (hours < 1) {
    return "Under 1h";
  }

  if (hours < 24) {
    return `${hours}h`;
  }

  return `${Math.floor(hours / 24)}d`;
}
