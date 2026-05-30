import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Clock3,
  History,
  Loader2,
  ShieldAlert,
  Undo2,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { reverseExecutionAction, updateExecutionActionStatus } from "@/app/app/executions/actions";
import { PendingButton } from "@/components/ui/pending-button";
import { getInverseAction, type InverseActionDefinition } from "@/lib/integration-action-catalog";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const statusOptions = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "running", label: "Running" },
  { value: "succeeded", label: "Succeeded" },
  { value: "failed", label: "Failed" },
  { value: "blocked", label: "Blocked" },
  { value: "skipped", label: "Skipped" },
];

const statusStyles: Record<string, string> = {
  pending: "border-zinc-200 bg-zinc-50 text-zinc-700",
  running: "border-sky-200 bg-sky-50 text-sky-700",
  succeeded: "border-emerald-200 bg-emerald-50 text-emerald-700",
  failed: "border-rose-200 bg-rose-50 text-rose-700",
  blocked: "border-rose-200 bg-rose-50 text-rose-700",
  skipped: "border-zinc-200 bg-zinc-50 text-zinc-700",
};

const statusIcons: Record<string, LucideIcon> = {
  pending: Clock3,
  running: Loader2,
  succeeded: CheckCircle2,
  failed: XCircle,
  blocked: ShieldAlert,
  skipped: CircleAlert,
};

export default async function ExecutionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; provider?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect("/auth/sign-in?message=Sign in to inspect execution actions.");
  }

  const organization = await ensureWorkspace(supabase, userData.user);
  const params = await searchParams;
  const { data: actions } = await supabase
    .from("execution_actions")
    .select("*, workflow_runs(id, status, confidence, tickets(id, external_id, title), workflows(id, name))")
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: false });

  const actionRows = actions ?? [];
  const providers = Array.from(new Set(actionRows.map((action) => action.integration_key))).sort();
  const filteredActions = filterActions(actionRows, params);
  const runningActions = actionRows.filter((action) => action.status === "running").length;
  const pendingActions = actionRows.filter((action) => action.status === "pending").length;
  const succeededActions = actionRows.filter((action) => action.status === "succeeded").length;
  const failedActions = actionRows.filter((action) => ["failed", "blocked"].includes(action.status)).length;
  const reversibleActions = actionRows.filter(canReverse).length;

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
            <h1 className="text-3xl font-semibold tracking-tight">Execution console</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-black/56">
              Review provider actions, update the outcome, and roll back any action an agent took with one click.
            </p>
          </div>
          <Link
            href="/app/workflows"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#0b2a4a] px-3 text-sm font-semibold text-white"
          >
            Run workflow
            <ArrowRight size={16} />
          </Link>
        </div>

        <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <MetricCard label="Running" value={String(runningActions)} icon={Loader2} />
          <MetricCard label="Pending" value={String(pendingActions)} icon={Clock3} />
          <MetricCard label="Succeeded" value={String(succeededActions)} icon={CheckCircle2} />
          <MetricCard label="Blocked or failed" value={String(failedActions)} icon={ShieldAlert} />
          <MetricCard label="Reversible" value={String(reversibleActions)} icon={Undo2} />
        </section>

        <section className="mt-5 rounded-xl border border-black/10 bg-white shadow-sm">
          <div className="border-b border-black/10 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <p className="text-sm text-black/52">
                Showing <span className="font-semibold text-[#07111f]">{filteredActions.length}</span> of{" "}
                <span className="font-semibold text-[#07111f]">{actionRows.length}</span> provider actions
              </p>
              <Link
                href="/app/audit"
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-black/10 px-3 text-sm font-semibold"
              >
                Open replay
                <ArrowRight size={15} />
              </Link>
            </div>

            <form action="/app/executions" className="mt-4 grid gap-3 md:grid-cols-[180px_1fr_auto_auto]">
              <SelectFilter name="status" label="Status" value={params.status ?? "all"} options={statusOptions} />
              <SelectFilter
                name="provider"
                label="Provider"
                value={params.provider ?? "all"}
                options={[
                  { value: "all", label: "All providers" },
                  ...providers.map((provider) => ({ value: provider, label: provider })),
                ]}
              />
              <button className="h-10 self-end rounded-lg bg-[#0b2a4a] px-3 text-sm font-semibold text-white">
                Apply
              </button>
              <Link
                href="/app/executions"
                className="inline-flex h-10 items-center justify-center self-end rounded-lg border border-black/10 px-3 text-sm font-semibold"
              >
                Clear
              </Link>
            </form>
          </div>

          <div className="divide-y divide-black/8">
            {filteredActions.map((action) => {
              const inverse = getInverseAction(action.integration_key, action.action_key);
              const reversedAt = action.response_payload?.reversed_at as string | undefined;
              const isReversal = Boolean(action.request_payload?.reverses_action_id);
              const undoable = canReverse(action);

              return (
                <article key={action.id} className="grid gap-4 p-4 transition hover:bg-[#f8fbfe] lg:grid-cols-[1fr_280px]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill status={action.status} />
                      <span className="rounded-md border border-black/10 bg-white px-2 py-1 text-xs font-semibold text-black/52">
                        {action.integration_key}
                      </span>
                      {isReversal && (
                        <span className="inline-flex items-center gap-1 rounded-md border border-violet-200 bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-700">
                          <History size={12} />
                          Rollback
                        </span>
                      )}
                      {reversedAt && (
                        <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">
                          <Undo2 size={12} />
                          Reversed
                        </span>
                      )}
                    </div>
                    <h3 className="mt-3 truncate text-base font-semibold">{action.action_key.replaceAll("_", " ")}</h3>
                    <p className="mt-2 text-sm leading-6 text-black/55">
                      {action.workflow_runs?.workflows?.name ?? "Workflow"} ·{" "}
                      {action.workflow_runs?.tickets?.external_id ?? "Ticket"} ·{" "}
                      {action.workflow_runs?.tickets?.title ?? "No ticket title"}
                    </p>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-black/35">
                      {formatDate(action.created_at)}
                    </p>
                    {action.response_payload?.detail && !isReversal && (
                      <p className="mt-3 text-sm leading-6 text-black/55">{action.response_payload.detail}</p>
                    )}
                    {action.error_message && (
                      <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm leading-6 text-rose-700">
                        {action.error_message}
                      </p>
                    )}
                  </div>

                  <div className="grid gap-3">
                    {reversedAt ? (
                      <ReversedNotice reversedAt={reversedAt} note={action.response_payload?.reversal_note} />
                    ) : (
                      <ActionStatusForm actionId={action.id} organizationId={organization.id} currentStatus={action.status} />
                    )}
                    {undoable && inverse && (
                      <RollbackForm actionId={action.id} organizationId={organization.id} inverse={inverse} />
                    )}
                  </div>
                </article>
              );
            })}
            {filteredActions.length === 0 && (
              <p className="p-8 text-center text-sm text-black/48">
                No execution actions match the current filters. Run a workflow to generate provider actions.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function ActionStatusForm({
  actionId,
  organizationId,
  currentStatus,
}: {
  actionId: string;
  organizationId: string;
  currentStatus: string;
}) {
  return (
    <form action={updateExecutionActionStatus} className="grid gap-2 rounded-lg border border-[#d8e4ee] bg-[#f8fbfe] p-3">
      <input type="hidden" name="actionId" value={actionId} />
      <input type="hidden" name="organizationId" value={organizationId} />
      <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        Outcome
        <select
          name="status"
          defaultValue={currentStatus}
          className="mt-2 h-9 w-full rounded-md border border-[#d8e4ee] bg-white px-2 text-sm normal-case tracking-normal outline-none focus:border-[#0b5f91]"
        >
          <option value="running">Running</option>
          <option value="succeeded">Succeeded</option>
          <option value="failed">Failed</option>
          <option value="blocked">Blocked</option>
          <option value="skipped">Skipped</option>
        </select>
      </label>
      <input
        name="note"
        className="h-9 w-full rounded-md border border-[#d8e4ee] bg-white px-2 text-xs outline-none focus:border-[#0b5f91]"
        placeholder="Optional note"
      />
      <PendingButton
        pendingText="Updating..."
        className="h-9 w-full rounded-md bg-[#0b2a4a] px-3 text-sm font-semibold text-white"
      >
        <CheckCircle2 size={15} />
        Save outcome
      </PendingButton>
    </form>
  );
}

function RollbackForm({
  actionId,
  organizationId,
  inverse,
}: {
  actionId: string;
  organizationId: string;
  inverse: InverseActionDefinition;
}) {
  return (
    <form action={reverseExecutionAction} className="grid gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
      <input type="hidden" name="actionId" value={actionId} />
      <input type="hidden" name="organizationId" value={organizationId} />
      <div className="flex items-center gap-2 text-amber-800">
        <Undo2 size={14} />
        <p className="text-xs font-semibold uppercase tracking-[0.12em]">Reversible</p>
      </div>
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
        className="h-9 w-full rounded-md border border-amber-300 bg-white px-3 text-sm font-semibold text-amber-900"
      >
        <Undo2 size={15} />
        Undo this action
      </PendingButton>
    </form>
  );
}

function ReversedNotice({ reversedAt, note }: { reversedAt: string; note?: string }) {
  return (
    <div className="grid gap-1 rounded-lg border border-amber-200 bg-amber-50 p-3">
      <div className="flex items-center gap-2 text-amber-800">
        <Undo2 size={14} />
        <p className="text-xs font-semibold uppercase tracking-[0.12em]">Rolled back</p>
      </div>
      <p className="text-sm leading-5 text-amber-900/80">{note ?? "This action was reversed by an operator."}</p>
      <p className="text-xs text-amber-900/55">{formatDate(reversedAt)}</p>
    </div>
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
        className="mt-2 h-11 w-full rounded-lg border border-black/10 bg-[#f8faf5] px-3 text-sm outline-none focus:border-[#2f6f60]"
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
  const Icon = statusIcons[status] ?? Clock3;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold",
        statusStyles[status] ?? statusStyles.pending,
      )}
    >
      <Icon size={13} className={status === "running" ? "animate-spin" : ""} />
      {status}
    </span>
  );
}

function canReverse(action: {
  status: string;
  integration_key: string;
  action_key: string;
  request_payload?: { reverses_action_id?: string } | null;
  response_payload?: { reversed_at?: string } | null;
}) {
  return (
    action.status === "succeeded" &&
    !action.response_payload?.reversed_at &&
    !action.request_payload?.reverses_action_id &&
    Boolean(getInverseAction(action.integration_key, action.action_key))
  );
}

function filterActions<T extends { status: string; integration_key: string }>(
  actions: T[],
  params: { status?: string; provider?: string },
) {
  let filtered = actions;

  if (params.status && params.status !== "all") {
    filtered = filtered.filter((action) => action.status === params.status);
  }

  if (params.provider && params.provider !== "all") {
    filtered = filtered.filter((action) => action.integration_key === params.provider);
  }

  return filtered;
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
