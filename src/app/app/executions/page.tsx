import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Cpu,
  Filter,
  Loader2,
  Play,
  ShieldAlert,
  Workflow,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { updateExecutionActionStatus } from "@/app/app/executions/actions";
import { PendingButton } from "@/components/ui/pending-button";
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
  const [{ data: actions }, { data: runs }, { data: integrations }] = await Promise.all([
    supabase
      .from("execution_actions")
      .select("*, workflow_runs(id, status, confidence, tickets(id, external_id, title), workflows(id, name))")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("workflow_runs")
      .select("*, workflows(name), tickets(external_id, title)")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase.from("integrations").select("id, provider_key, display_name, status").eq("organization_id", organization.id),
  ]);

  const actionRows = actions ?? [];
  const runRows = runs ?? [];
  const providers = Array.from(new Set(actionRows.map((action) => action.integration_key))).sort();
  const filteredActions = filterActions(actionRows, params);
  const runningActions = actionRows.filter((action) => action.status === "running").length;
  const pendingActions = actionRows.filter((action) => action.status === "pending").length;
  const succeededActions = actionRows.filter((action) => action.status === "succeeded").length;
  const failedActions = actionRows.filter((action) => ["failed", "blocked"].includes(action.status)).length;

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
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#47685d]">Execution console</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">Monitor provider-level actions.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-black/56">
              Track the concrete actions agents execute against Okta, Slack, Jira, Google Workspace, and other systems.
            </p>
          </div>
          <Link
            href="/app/workflows"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#17211c] px-3 text-sm font-semibold text-white"
          >
            <Play size={16} />
            Run workflow
          </Link>
        </div>

        <section className="mt-6 grid gap-3 md:grid-cols-4">
          <MetricCard label="Running" value={String(runningActions)} icon={Loader2} />
          <MetricCard label="Pending" value={String(pendingActions)} icon={Clock3} />
          <MetricCard label="Succeeded" value={String(succeededActions)} icon={CheckCircle2} />
          <MetricCard label="Blocked or failed" value={String(failedActions)} icon={ShieldAlert} />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[.72fr_1.28fr]">
          <aside className="space-y-6">
            <Panel title="Filters" icon={Filter}>
              <form action="/app/executions" className="grid gap-4">
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
                <button className="h-10 rounded-lg bg-[#17211c] px-3 text-sm font-semibold text-white">
                  Apply filters
                </button>
                <Link
                  href="/app/executions"
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-black/10 px-3 text-sm font-semibold"
                >
                  Clear
                </Link>
              </form>
            </Panel>

            <Panel title="Recent workflow runs" icon={Workflow}>
              <div className="space-y-3">
                {runRows.map((run) => (
                  <Link
                    key={run.id}
                    href={`/app/audit?run=${run.id}`}
                    className="block rounded-lg border border-black/10 p-4 transition hover:bg-[#f8faf5]"
                  >
                    <p className="font-semibold">{run.workflows?.name ?? "Workflow run"}</p>
                    <p className="mt-1 text-sm text-black/52">
                      {run.tickets?.external_id ?? "Ticket"} · {run.tickets?.title ?? "No title"}
                    </p>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-black/38">
                      {run.status} · {Number(run.confidence ?? 0)}% confidence
                    </p>
                  </Link>
                ))}
              </div>
            </Panel>

            <Panel title="Provider readiness" icon={Cpu}>
              <div className="space-y-2">
                {(integrations ?? []).map((integration) => (
                  <Link
                    key={integration.id}
                    href={`/app/integrations/${integration.id}`}
                    className="flex items-center justify-between rounded-lg border border-black/10 p-3 transition hover:bg-[#f8faf5]"
                  >
                    <span className="text-sm font-semibold">{integration.display_name}</span>
                    <span className="text-xs font-semibold text-black/45">{integration.status.replaceAll("_", " ")}</span>
                  </Link>
                ))}
              </div>
            </Panel>
          </aside>

          <section className="rounded-xl border border-black/10 bg-white shadow-sm">
            <div className="flex flex-col gap-2 border-b border-black/10 p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Execution actions</h2>
                <p className="mt-1 text-sm text-black/52">
                  Showing {filteredActions.length} of {actionRows.length} provider actions
                </p>
              </div>
              <Link
                href="/app/audit"
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-black/10 px-3 text-sm font-semibold"
              >
                Open replay
                <ArrowRight size={15} />
              </Link>
            </div>

            <div className="divide-y divide-black/8">
              {filteredActions.map((action) => (
                <article key={action.id} className="grid gap-4 p-5 transition hover:bg-[#f8faf5] lg:grid-cols-[1fr_240px]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill status={action.status} />
                      <span className="rounded-md border border-black/10 px-2 py-1 text-xs font-semibold text-black/52">
                        {action.integration_key}
                      </span>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold">{action.action_key}</h3>
                    <p className="mt-2 text-sm leading-6 text-black/55">
                      {action.workflow_runs?.workflows?.name ?? "Workflow"} ·{" "}
                      {action.workflow_runs?.tickets?.external_id ?? "Ticket"} ·{" "}
                      {action.workflow_runs?.tickets?.title ?? "No ticket title"}
                    </p>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-black/38">
                      Created {formatDate(action.created_at)}
                    </p>
                    {action.error_message && (
                      <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm leading-6 text-rose-700">
                        {action.error_message}
                      </p>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <ActionStatusForm actionId={action.id} organizationId={organization.id} status="succeeded" label="Succeeded" />
                    <ActionStatusForm actionId={action.id} organizationId={organization.id} status="failed" label="Failed" />
                    <ActionStatusForm actionId={action.id} organizationId={organization.id} status="blocked" label="Blocked" />
                  </div>
                </article>
              ))}
              {filteredActions.length === 0 && (
                <p className="p-8 text-center text-sm text-black/48">
                  No execution actions match the current filters. Run a workflow to generate provider actions.
                </p>
              )}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

function ActionStatusForm({
  actionId,
  organizationId,
  status,
  label,
}: {
  actionId: string;
  organizationId: string;
  status: "succeeded" | "failed" | "blocked";
  label: string;
}) {
  return (
    <form action={updateExecutionActionStatus} className="rounded-lg border border-black/10 bg-white p-3">
      <input type="hidden" name="actionId" value={actionId} />
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="status" value={status} />
      <input
        name="note"
        className="mb-2 h-9 w-full rounded-lg border border-black/10 bg-[#f8faf5] px-2 text-xs outline-none focus:border-[#2f6f60]"
        placeholder="Optional note"
      />
      <PendingButton
        pendingText="Updating..."
        className={cn(
          "h-9 w-full rounded-lg px-3 text-sm font-semibold",
          status === "succeeded"
            ? "bg-[#17211c] text-white"
            : "border border-black/10 bg-white text-[#151914]",
        )}
      >
        {status === "succeeded" ? <CheckCircle2 size={15} /> : status === "failed" ? <XCircle size={15} /> : <ShieldAlert size={15} />}
        {label}
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
