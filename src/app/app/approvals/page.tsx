import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BadgeCheck,
  CheckCircle2,
  Clock3,
  MessageSquareText,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { decideApproval } from "@/app/app/actions";
import { PageHeader } from "@/components/dashboard/page-header";
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
    <main className="min-h-screen px-4 py-5 text-[#151914] md:px-8">
      <div className="mx-auto max-w-6xl">
        <PageHeader
          crumbs={[{ label: "Operations" }, { label: "Approvals" }]}
          title="Approvals"
          description="Review requests that need a human decision."
        />

        <section className="mt-5 grid gap-3 md:grid-cols-3">
          <MetricCard label="Pending" value={String(pendingApprovals.length)} icon={Clock3} />
          <MetricCard label="Approved" value={String(approvedCount)} icon={CheckCircle2} />
          <MetricCard label="Rejected" value={String(rejectedCount)} icon={XCircle} />
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_340px]">
          <div className="space-y-4">
            <Panel title="Needs decision" icon={BadgeCheck}>
              <div className="space-y-3">
                {pendingApprovals.map((approval) => (
                  <article key={approval.id} className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
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
                        <h2 className="mt-3 text-lg font-semibold">{approval.title}</h2>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-black/56">
                          {approval.description ?? "An AI workflow paused for human review."}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-black/42">
                          <span>{approval.tickets?.external_id ?? "Unlinked ticket"}</span>
                          <span>{approval.workflow_runs?.workflows?.name ?? "Manual approval"}</span>
                          <span>Due {formatDate(approval.due_at ?? approval.created_at)}</span>
                          <span>Age {ageLabel(approval.created_at)}</span>
                        </div>
                      </div>
                      {approval.ticket_id && (
                        <Link
                          href={`/app/tickets/${approval.ticket_id}`}
                          className="inline-flex h-9 items-center gap-2 rounded-md border border-black/10 px-3 text-sm font-semibold"
                        >
                          Inspect ticket
                          <MessageSquareText size={15} />
                        </Link>
                      )}
                    </div>

                    <ApprovalDecisionForm approval={approval} />
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
                      <p className="mt-3 rounded-lg bg-[#f5f8fc] p-3 text-sm leading-6 text-black/58">
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

function ApprovalDecisionForm({
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
    <form action={decideApproval} className="mt-4 rounded-lg border border-[#d8e4ee] bg-[#f8fbfe] p-3">
      <input type="hidden" name="approvalId" value={approval.id} />
      <input type="hidden" name="ticketId" value={approval.ticket_id ?? ""} />
      <input type="hidden" name="workflowRunId" value={approval.workflow_run_id ?? ""} />
      <input type="hidden" name="organizationId" value={approval.organization_id} />
      <textarea
        name="note"
        rows={2}
        className="w-full resize-none rounded-md border border-[#d8e4ee] bg-white px-3 py-2 text-sm outline-none placeholder:text-black/38 focus:border-[#0b5f91]"
        placeholder="Optional note, ticket reference, or rejection reason..."
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <PendingButton
          name="decision"
          value="approved"
          pendingText="Approving..."
          className="h-9 rounded-md bg-[#0b2a4a] px-3 text-sm font-semibold text-white"
        >
          <CheckCircle2 size={16} />
          Approve
        </PendingButton>
        <PendingButton
          name="decision"
          value="rejected"
          pendingText="Rejecting..."
          className="h-9 rounded-md border border-black/10 bg-white px-3 text-sm font-semibold text-[#07111f]"
        >
          <XCircle size={16} />
          Reject
        </PendingButton>
      </div>
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
        <span className="flex size-9 items-center justify-center rounded-lg bg-[#e7f0ff] text-[#0b5f91]">
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
        <span className="flex size-8 items-center justify-center rounded-lg bg-[#e7f0ff] text-[#0b5f91]">
          <Icon size={16} />
        </span>
        <h2 className="font-semibold">{title}</h2>
      </div>
      {children}
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
