import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  Cable,
  CheckCircle2,
  CircleAlert,
  Clock3,
  History,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  StickyNote,
  Undo2,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AuroraField } from "@/components/brand/backgrounds";
import { decideApproval } from "@/app/app/tickets/[ticketId]/actions";
import { updateTicketStatus } from "@/app/app/actions";
import { reverseExecutionAction } from "@/app/app/executions/actions";
import {
  MODEL_PRICING,
  estimateTicketTriageCost,
  estimateWorkflowRunCost,
  formatUsd,
  modelForPriority,
} from "@/lib/cost-model";
import { getInverseAction } from "@/lib/integration-action-catalog";
import { computeSla } from "@/lib/sla";
import {
  displayStepStatus,
  displayTicketStatus,
  titleCase,
  type TicketDetailData,
} from "@/lib/supabase/ticket-detail";
import { cn } from "@/lib/utils";
import { PendingButton } from "@/components/ui/pending-button";

export function TicketDetailView({ data }: { data: TicketDetailData }) {
  const { ticket, steps, approval, policies, auditLogs, comments, executionActions, requestingTeam, assignedTeam } = data;
  const status = displayTicketStatus(ticket.status);
  const policy = policies[0];

  const costModel = modelForPriority(ticket.priority);
  const executedActionCount = executionActions.filter(
    (action) => !(action.reverses_action_id ?? action.request_payload?.reverses_action_id),
  ).length;
  const resolutionCost =
    estimateTicketTriageCost(costModel, ticket.description, ticket.ai_summary).costUsd +
    estimateWorkflowRunCost(costModel, steps.length, executedActionCount).costUsd;

  const sla = computeSla({
    priority: ticket.priority,
    createdAt: ticket.created_at,
    status: ticket.status,
    resolvedAt: ticket.resolved_at,
  });
  const slaDue = sla.dueAt.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <main className="relative min-h-screen px-4 py-5 text-[#151914] md:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[340px] overflow-hidden">
        <AuroraField intensity="soft" />
      </div>
      <div className="relative mx-auto max-w-6xl">
        <div className="grid gap-5 border-b border-black/10 pb-6 lg:grid-cols-[1fr_300px] lg:items-start">
          <div>
            <Link
              href="/app/tickets"
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-black/10 bg-white/80 px-3 text-sm font-semibold backdrop-blur transition hover:bg-white"
            >
              <ArrowLeft size={16} />
              Tickets
            </Link>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-black/10 bg-white px-2 py-1 text-xs font-semibold text-black/48">
                {ticket.external_id ?? ticket.id.slice(0, 8)}
              </span>
              <StatusPill status={status} />
              <span className="rounded-md border border-black/10 bg-white px-2 py-1 text-xs font-semibold text-black/52">
                {titleCase(ticket.priority)}
              </span>
            </div>
            <h1 className="mt-4 max-w-3xl text-2xl font-semibold tracking-tight md:text-3xl">
              {ticket.title}
            </h1>
            <div className="mt-4 max-w-3xl rounded-xl border border-black/10 bg-white/70 p-4 backdrop-blur">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#0b5f91]">
                <Sparkles size={13} />
                AI summary
              </p>
              <p className="mt-2 text-sm leading-6 text-black/64">{ticket.ai_summary ?? ticket.description}</p>
            </div>
          </div>

          <div className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-black/52">Confidence</p>
              <p className="text-2xl font-semibold tracking-tight">{Number(ticket.ai_confidence)}%</p>
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-black/8">
              <div
                className="h-1.5 rounded-full bg-[#2f6f60]"
                style={{ width: `${Number(ticket.ai_confidence)}%` }}
              />
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-black/8 pt-3">
              <div>
                <p className="text-sm font-medium text-black/52">Est. cost to resolve</p>
                <p className="text-xs text-black/40">{MODEL_PRICING[costModel].label} · modeled</p>
              </div>
              <p className="text-xl font-semibold tracking-tight">{formatUsd(resolutionCost)}</p>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-black/8 pt-3">
              <div>
                <p className="text-sm font-medium text-black/52">SLA</p>
                <p className="text-xs text-black/40">{sla.targetHours}h target · due {slaDue}</p>
              </div>
              <span className={cn("rounded-md border px-2 py-1 text-xs font-semibold", sla.badgeClass)}>{sla.label}</span>
            </div>
            <div className="mt-4 border-t border-black/8 pt-3">
              <p className="text-sm font-medium text-black/52">Teams</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold">
                <span className="rounded-md border border-black/10 bg-white px-2 py-1 text-slate-600">
                  From: {requestingTeam?.name ?? "—"}
                </span>
                <span className="rounded-md border border-black/10 bg-white px-2 py-1 text-slate-600">
                  To: {assignedTeam?.name ?? "Unassigned"}
                </span>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/42">Operator action</p>
              <div className="grid gap-2">
                <TicketStatusForm ticketId={ticket.id} organizationId={ticket.organization_id} status="resolved" label="Resolve" />
                <TicketStatusForm ticketId={ticket.id} organizationId={ticket.organization_id} status="executing" label="Reopen" />
                <TicketStatusForm ticketId={ticket.id} organizationId={ticket.organization_id} status="blocked" label="Block" />
              </div>
            </div>
          </div>
        </div>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_360px]">
          <Panel title="Execution timeline" icon={Clock3}>
            <div className="space-y-3">
              {steps.length > 0 ? (
                steps.map((step, index) => (
                  <div key={step.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className={cn(
                          "flex size-8 items-center justify-center rounded-lg border",
                          step.status === "running"
                            ? "border-[#2f6f60] bg-[#e7f5ee] text-[#2f6f60]"
                            : step.status === "failed" || step.status === "blocked"
                              ? "border-rose-200 bg-rose-50 text-rose-700"
                              : "border-black/10 bg-white text-black/52",
                        )}
                      >
                        {step.status === "succeeded" ? <CheckCircle2 size={16} /> : <Clock3 size={16} />}
                      </span>
                      {index !== steps.length - 1 && <span className="mt-2 h-8 w-px bg-black/10" />}
                    </div>
                    <div className="min-w-0 pb-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold">{step.name}</p>
                        <span className="rounded-md bg-[#edf5e9] px-2 py-1 text-xs font-semibold text-[#315f4f]">
                          {displayStepStatus(step.status)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-6 text-black/55">
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

          <div className="space-y-5">
            <Panel title="Approval" icon={BadgeCheck}>
              {approval ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="font-semibold text-amber-950">{approval.title}</p>
                  <p className="mt-2 text-sm leading-6 text-amber-900/72">
                    {approval.description ?? "This workflow is waiting for a human decision."}
                  </p>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-amber-900/52">
                    Status: {titleCase(approval.status)}
                  </p>
                  {approval.status === "pending" && (
                    <div className="mt-3 grid gap-3">
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

            <Panel title="Policy" icon={ShieldCheck}>
              {policy ? (
                <div className="rounded-lg border border-black/10 p-3">
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

        <section className="mt-5">
          <Panel title="Provider actions" icon={Cable}>
            <p className="-mt-2 mb-4 text-sm leading-6 text-black/52">
              Every action an agent took on a connected system — and a one-click undo for the ones that can be safely reversed.
            </p>
            <ProviderActions actions={executionActions} organizationId={ticket.organization_id} />
          </Panel>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[.82fr_1.18fr]">
          <Panel title="Notes" icon={StickyNote}>
            <div className="space-y-3">
              {comments.length > 0 ? (
                comments.map((comment) => (
                  <div key={comment.id} className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-amber-900">
                        {noteLabel(comment.metadata?.source)}
                      </span>
                      <span className="text-xs text-amber-900/58">
                        {new Date(comment.created_at).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-amber-950">{comment.body}</p>
                  </div>
                ))
              ) : (
                <EmptyState text="No notes added yet." />
              )}
            </div>
          </Panel>

          <Panel title="Audit trail" icon={LockKeyhole}>
            <div className="overflow-hidden rounded-lg border border-black/10">
              {auditLogs.length > 0 ? (
                auditLogs.map((log) => (
                  <div key={log.id} className="grid gap-3 border-b border-black/8 p-3 last:border-b-0 md:grid-cols-[110px_1fr]">
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
        rows={1}
        className="mb-2 w-full rounded-lg border border-black/10 px-2 py-2 text-xs outline-none focus:border-[#2f6f60] focus:ring-4 focus:ring-[#2f6f60]/10"
        placeholder="Add note"
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

function ProviderActions({
  actions,
  organizationId,
}: {
  actions: TicketDetailData["executionActions"];
  organizationId: string;
}) {
  if (!actions.length) {
    return <EmptyState text="No provider actions have run for this ticket yet." />;
  }

  return (
    <div className="space-y-3">
      {actions.map((action) => {
        const inverse = getInverseAction(action.integration_key, action.action_key);
        const reversedAt = (action.reversed_at ?? action.response_payload?.reversed_at) as string | undefined;
        const isReversal = Boolean(action.reverses_action_id ?? action.request_payload?.reverses_action_id);
        const undoable = action.status === "succeeded" && !reversedAt && !isReversal && Boolean(inverse);

        return (
          <div key={action.id} className="rounded-lg border border-black/10 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-black/10 bg-white px-2 py-1 text-xs font-semibold text-black/52">
                {action.integration_key}
              </span>
              <span className="text-sm font-semibold">{action.action_key.replaceAll("_", " ")}</span>
              {isReversal && (
                <span className="inline-flex items-center gap-1 rounded-md border border-violet-200 bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700">
                  <History size={11} />
                  Rollback
                </span>
              )}
              {reversedAt && (
                <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">
                  <Undo2 size={11} />
                  Reversed
                </span>
              )}
            </div>
            {action.response_payload?.detail && !isReversal && (
              <p className="mt-2 text-sm leading-6 text-black/55">{action.response_payload.detail}</p>
            )}
            {reversedAt && (
              <p className="mt-2 text-xs text-amber-900/70">
                {action.response_payload?.reversal_note ?? "Reversed by an operator."}
              </p>
            )}
            {undoable && inverse && (
              <form action={reverseExecutionAction} className="mt-3 grid gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <input type="hidden" name="actionId" value={action.id} />
                <input type="hidden" name="organizationId" value={organizationId} />
                <p className="text-sm leading-5 text-amber-900/80">
                  <span className="font-semibold">{inverse.display_name}</span> — {inverse.description}
                </p>
                <input
                  name="note"
                  className="h-9 w-full rounded-md border border-amber-200 bg-white px-2 text-xs outline-none focus:border-amber-500"
                  placeholder="Reason for rollback (optional)"
                />
                <PendingButton
                  pendingText="Rolling back..."
                  className="h-9 rounded-md border border-amber-300 bg-white px-3 text-sm font-semibold text-amber-900"
                >
                  <Undo2 size={14} />
                  Undo this action
                </PendingButton>
              </form>
            )}
          </div>
        );
      })}
    </div>
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

function noteLabel(source: unknown) {
  const value = String(source ?? "agent_note").replaceAll("_", " ");
  return value.includes("agent") ? "Agent note" : titleCase(value);
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-black/15 bg-[#f8faf5] p-4 text-sm text-black/48">
      {text}
    </div>
  );
}
