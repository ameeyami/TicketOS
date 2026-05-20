import "@xyflow/react/dist/style.css";

import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  Bot,
  CheckCircle2,
  CircleAlert,
  Clock3,
  GitBranch,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  StickyNote,
  Workflow,
  XCircle,
} from "lucide-react";
import { decideApproval } from "@/app/app/tickets/[ticketId]/actions";
import { updateTicketStatus } from "@/app/app/actions";
import {
  displayStepStatus,
  displayTicketStatus,
  titleCase,
  type TicketDetailData,
} from "@/lib/supabase/ticket-detail";
import { cn } from "@/lib/utils";
import { PendingButton } from "@/components/ui/pending-button";

export function TicketDetailView({ data }: { data: TicketDetailData }) {
  const { ticket, latestRun, steps, approval, policies, auditLogs, comments } = data;
  const status = displayTicketStatus(ticket.status);
  const policy = policies[0];

  return (
    <main className="min-h-screen bg-[#f6f7f2] px-4 py-6 text-[#151914] md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              href="/app"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-black/10 bg-white px-3 text-sm font-semibold"
            >
              <ArrowLeft size={16} />
              Command center
            </Link>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-black/10 bg-white px-2 py-1 text-xs font-semibold text-black/48">
                {ticket.external_id ?? ticket.id.slice(0, 8)}
              </span>
              <StatusPill status={status} />
              <span className="rounded-md border border-black/10 bg-white px-2 py-1 text-xs font-semibold text-black/52">
                {titleCase(ticket.priority)}
              </span>
            </div>
            <h1 className="mt-3 max-w-4xl text-3xl font-semibold tracking-tight md:text-5xl">
              {ticket.title}
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-black/58">
              {ticket.ai_summary ?? ticket.description}
            </p>
          </div>

          <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm md:w-80">
            <p className="text-sm font-medium text-black/52">AI confidence</p>
            <p className="mt-3 text-5xl font-semibold tracking-tight">{Number(ticket.ai_confidence)}%</p>
            <div className="mt-4 h-2 rounded-full bg-black/8">
              <div
                className="h-2 rounded-full bg-[#2f6f60]"
                style={{ width: `${Number(ticket.ai_confidence)}%` }}
              />
            </div>
            <div className="mt-5 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/42">Operator action</p>
              <div className="grid gap-3">
                <TicketStatusForm ticketId={ticket.id} organizationId={ticket.organization_id} status="resolved" label="Resolve" />
                <TicketStatusForm ticketId={ticket.id} organizationId={ticket.organization_id} status="executing" label="Reopen" />
                <TicketStatusForm ticketId={ticket.id} organizationId={ticket.organization_id} status="blocked" label="Block" />
              </div>
            </div>
          </div>
        </div>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
          <Panel title="Execution timeline" icon={Clock3}>
            <div className="space-y-4">
              {steps.length > 0 ? (
                steps.map((step, index) => (
                  <div key={step.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <span
                        className={cn(
                          "flex size-10 items-center justify-center rounded-lg border",
                          step.status === "running"
                            ? "border-[#2f6f60] bg-[#e7f5ee] text-[#2f6f60]"
                            : step.status === "failed" || step.status === "blocked"
                              ? "border-rose-200 bg-rose-50 text-rose-700"
                              : "border-black/10 bg-white text-black/52",
                        )}
                      >
                        {step.status === "succeeded" ? <CheckCircle2 size={18} /> : <Clock3 size={18} />}
                      </span>
                      {index !== steps.length - 1 && <span className="mt-2 h-12 w-px bg-black/10" />}
                    </div>
                    <div className="min-w-0 pb-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{step.name}</p>
                        <span className="rounded-md bg-[#edf5e9] px-2 py-1 text-xs font-semibold text-[#315f4f]">
                          {displayStepStatus(step.status)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-black/55">
                        {step.output?.detail ?? step.error_message ?? "Execution step recorded."}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState text="No workflow run has been attached to this ticket yet." />
              )}
            </div>
          </Panel>

          <Panel title="Workflow replay" icon={GitBranch}>
            <div className="rounded-xl border border-black/10 bg-[#111713] p-5 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#d7ff78]">
                    {latestRun?.workflows?.name ?? "No workflow selected"}
                  </p>
                  <p className="mt-2 text-sm text-white/52">
                    {latestRun
                      ? `Run status: ${titleCase(latestRun.status.replaceAll("_", " "))}`
                      : "TicketOS will replay the trace once a workflow starts."}
                  </p>
                </div>
                <Workflow size={24} className="text-[#d7ff78]" />
              </div>
              <div className="mt-6 grid gap-3">
                {["Intake", "Analyze", "Policy", "Execute", "Verify"].map((node, index) => (
                  <div key={node} className="flex items-center gap-3">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-white/10 text-sm font-semibold">
                      {index + 1}
                    </span>
                    <span className="text-sm font-semibold">{node}</span>
                    <span className="ml-auto h-px flex-1 bg-white/10" />
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        </section>

        <section className="mt-6">
          <div className="grid gap-6 xl:grid-cols-2">
            <Panel title="Approval gate" icon={BadgeCheck}>
              {approval ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <p className="font-semibold text-amber-950">{approval.title}</p>
                  <p className="mt-2 text-sm leading-6 text-amber-900/72">
                    {approval.description ?? "This workflow is waiting for a human decision."}
                  </p>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-amber-900/52">
                    Status: {titleCase(approval.status)}
                  </p>
                  {approval.status === "pending" && (
                    <div className="mt-4 grid gap-3">
                      <ApprovalForm
                        approvalId={approval.id}
                        ticketId={ticket.id}
                        organizationId={ticket.organization_id}
                        decision="approved"
                      />
                      <ApprovalForm
                        approvalId={approval.id}
                        ticketId={ticket.id}
                        organizationId={ticket.organization_id}
                        decision="rejected"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <EmptyState text="No approval is attached to this ticket." />
              )}
            </Panel>

            <Panel title="Policy decision" icon={ShieldCheck}>
              {policy ? (
                <div className="rounded-lg border border-black/10 p-4">
                  <div className="flex items-center gap-2">
                    {policy.decision === "allow" ? (
                      <CheckCircle2 size={18} className="text-[#2f6f60]" />
                    ) : policy.decision === "block" ? (
                      <XCircle size={18} className="text-rose-700" />
                    ) : (
                      <CircleAlert size={18} className="text-amber-700" />
                    )}
                    <p className="font-semibold">{titleCase(policy.decision.replaceAll("_", " "))}</p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-black/56">{policy.reason}</p>
                  <p className="mt-3 text-xs text-black/42">{Number(policy.confidence)}% confidence</p>
                </div>
              ) : (
                <EmptyState text="No policy evaluation has been recorded for this ticket." />
              )}
            </Panel>
          </div>

        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[.82fr_1.18fr]">
          <Panel title="Operator notes" icon={StickyNote}>
            <div className="space-y-3">
              {comments.length > 0 ? (
                comments.map((comment) => (
                  <div key={comment.id} className="rounded-lg border border-black/10 p-4">
                    <p className="text-sm leading-6 text-black/68">{comment.body}</p>
                    <p className="mt-2 text-xs text-black/38">
                      {new Date(comment.created_at).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      · {String(comment.metadata?.source ?? "operator_note").replaceAll("_", " ")}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyState text="No operator notes yet. Add a note while resolving, blocking, reopening, or deciding an approval." />
              )}
            </div>
          </Panel>

          <Panel title="Audit trail" icon={LockKeyhole}>
            <div className="overflow-hidden rounded-lg border border-black/10">
              {auditLogs.length > 0 ? (
                auditLogs.map((log) => (
                  <div key={log.id} className="grid gap-3 border-b border-black/8 p-4 last:border-b-0 md:grid-cols-[120px_1fr]">
                    <span className="text-xs font-semibold text-black/42">
                      {new Date(log.created_at).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{log.event_summary}</p>
                      <p className="mt-1 text-xs text-black/45">
                        {log.agents?.name ?? "TicketOS"} · {titleCase(log.event_type.replaceAll("_", " "))} ·{" "}
                        {String(log.metadata?.note ?? log.metadata?.policy ?? log.metadata?.source ?? "audit")}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState text="No audit records have been written for this ticket yet." />
              )}
            </div>
          </Panel>
        </section>

        <section className="mt-6 rounded-xl border border-black/10 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Bot size={18} className="text-[#2f6f60]" />
            <h2 className="text-lg font-semibold">AI explanation</h2>
          </div>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-black/56">
            TicketOS matched this request to an operational workflow, checked policy and permissions, then recorded
            each action as a replayable execution trace. Future Copilot responses will cite this timeline, policy
            decision, and audit trail directly.
          </p>
        </section>
      </div>
    </main>
  );
}

function TicketStatusForm({
  ticketId,
  organizationId,
  status,
  label,
}: {
  ticketId: string;
  organizationId: string;
  status: "executing" | "resolved" | "blocked";
  label: string;
}) {
  return (
    <form action={updateTicketStatus}>
      <input type="hidden" name="ticketId" value={ticketId} />
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="status" value={status} />
      <label className="sr-only" htmlFor={`${status}-note`}>
        Optional note for {label}
      </label>
      <textarea
        id={`${status}-note`}
        name="note"
        rows={2}
        className="mb-2 w-full rounded-lg border border-black/10 px-2 py-2 text-xs outline-none focus:border-[#2f6f60] focus:ring-4 focus:ring-[#2f6f60]/10"
        placeholder="Optional note"
      />
      <PendingButton
        pendingText={`${label}...`}
        className={cn(
          "h-9 w-full rounded-lg text-xs font-semibold",
          status === "resolved"
            ? "bg-[#17211c] text-white"
            : "border border-black/10 bg-white text-[#151914]",
        )}
      >
        {label}
      </PendingButton>
    </form>
  );
}

function ApprovalForm({
  approvalId,
  ticketId,
  organizationId,
  decision,
}: {
  approvalId: string;
  ticketId: string;
  organizationId: string;
  decision: "approved" | "rejected";
}) {
  return (
    <form action={decideApproval}>
      <input type="hidden" name="approvalId" value={approvalId} />
      <input type="hidden" name="ticketId" value={ticketId} />
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="decision" value={decision} />
      <textarea
        name="note"
        rows={2}
        className="mb-2 w-full rounded-lg border border-amber-200 bg-white px-2 py-2 text-xs outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
        placeholder="Optional note or ticket reference"
      />
      <PendingButton
        pendingText={decision === "approved" ? "Approving..." : "Rejecting..."}
        className={cn(
          "h-9 rounded-lg px-3 text-sm font-semibold",
          decision === "approved"
            ? "bg-[#17211c] text-white"
            : "border border-black/10 bg-white text-[#151914]",
        )}
      >
        {decision === "approved" ? "Approve" : "Reject"}
      </PendingButton>
    </form>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Resolving: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Approval: "bg-amber-50 text-amber-800 border-amber-200",
    Investigating: "bg-sky-50 text-sky-700 border-sky-200",
    Blocked: "bg-rose-50 text-rose-700 border-rose-200",
    Resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };

  return (
    <span className={cn("rounded-md border px-2 py-1 text-xs font-semibold", styles[status] ?? styles.Resolving)}>
      {status}
    </span>
  );
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Sparkles;
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

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-black/15 bg-[#f8faf5] p-4 text-sm text-black/48">
      {text}
    </div>
  );
}
