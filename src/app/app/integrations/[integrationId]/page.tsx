import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Cable,
  CheckCircle2,
  FileJson,
  LockKeyhole,
  Power,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  syncIntegrationActions,
  updateIntegrationActionApproval,
  updateIntegrationStatus,
} from "@/app/app/integrations/actions";
import { PendingButton } from "@/components/ui/pending-button";
import { getCatalogForProvider } from "@/lib/integration-action-catalog";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const riskStyles: Record<string, string> = {
  low: "border-emerald-200 bg-emerald-50 text-emerald-700",
  medium: "border-amber-200 bg-amber-50 text-amber-800",
  high: "border-rose-200 bg-rose-50 text-rose-700",
};

export default async function IntegrationDetailPage({
  params,
}: {
  params: Promise<{ integrationId: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect("/auth/sign-in?message=Sign in to inspect integration scopes.");
  }

  const organization = await ensureWorkspace(supabase, userData.user);
  const { integrationId } = await params;

  const { data: integration, error: integrationError } = await supabase
    .from("integrations")
    .select("*")
    .eq("id", integrationId)
    .eq("organization_id", organization.id)
    .maybeSingle();

  if (integrationError) {
    throw integrationError;
  }

  if (!integration) {
    notFound();
  }

  const [{ data: actions }, { data: auditLogs }, { data: executionActions }] = await Promise.all([
    supabase
      .from("integration_actions")
      .select("*")
      .eq("integration_id", integration.id)
      .order("risk_level")
      .order("display_name"),
    supabase
      .from("audit_logs")
      .select("*")
      .eq("organization_id", organization.id)
      .in("event_type", ["integration_updated", "integration_actions_synced", "integration_action_policy_updated"])
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("execution_actions")
      .select("*")
      .eq("organization_id", organization.id)
      .eq("integration_key", integration.provider_key)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const actionRows = actions ?? [];
  const catalog = getCatalogForProvider(integration.provider_key);
  const highRiskActions = actionRows.filter((action) => action.risk_level === "high").length;
  const approvalRequired = actionRows.filter((action) => action.requires_approval).length;
  const missingActions = Math.max(0, catalog.length - actionRows.length);

  return (
    <main className="min-h-screen px-4 py-6 text-[#151914] md:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/app/integrations"
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-black/10 bg-white px-3 text-sm font-semibold"
        >
          <ArrowLeft size={16} />
          Integrations
        </Link>

        <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#47685d]">Integration action scope</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">{integration.display_name}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-black/56">
              Review the actions TicketOS agents can execute, their risk level, and which ones require human approval.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <IntegrationButton id={integration.id} status="disabled" label="Disable" icon="power" />
            <form action={syncIntegrationActions}>
              <input type="hidden" name="integrationId" value={integration.id} />
              <PendingButton
                pendingText="Syncing..."
                className="h-10 rounded-lg bg-[#0b2a4a] px-3 text-sm font-semibold text-white"
              >
                <RefreshCw size={16} />
                Sync actions
              </PendingButton>
            </form>
          </div>
        </div>

        <section className="mt-6 grid gap-3 md:grid-cols-4">
          <MetricCard label="Connection" value={integration.status.replaceAll("_", " ")} icon={Cable} />
          <MetricCard label="Catalog actions" value={String(actionRows.length)} icon={Workflow} />
          <MetricCard label="Needs approval" value={String(approvalRequired)} icon={BadgeCheck} />
          <MetricCard label="High risk" value={String(highRiskActions)} icon={ShieldAlert} />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_.72fr]">
          <div className="space-y-6">
            <Panel title="Connection setup" icon={Cable}>
              <ConnectionSetupForm
                integrationId={integration.id}
                providerKey={integration.provider_key}
                displayName={integration.display_name}
                config={integration.config as IntegrationConfig | null}
                isConnected={integration.status === "connected"}
              />
            </Panel>

            <Panel title="Executable actions" icon={Workflow}>
              <div className="space-y-3">
                {actionRows.map((action) => (
                  <article key={action.id} className="rounded-lg border border-black/10 bg-white p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <RiskPill risk={action.risk_level} />
                          <span
                            className={cn(
                              "rounded-md border px-2 py-1 text-xs font-semibold",
                              action.requires_approval
                                ? "border-amber-200 bg-amber-50 text-amber-800"
                                : "border-emerald-200 bg-emerald-50 text-emerald-700",
                            )}
                          >
                            {action.requires_approval ? "approval required" : "autonomous"}
                          </span>
                        </div>
                        <h2 className="mt-3 text-lg font-semibold">{action.display_name}</h2>
                        <p className="mt-1 text-sm text-black/52">{action.action_key}</p>
                      </div>
                      <form action={updateIntegrationActionApproval}>
                        <input type="hidden" name="actionId" value={action.id} />
                        <input type="hidden" name="integrationId" value={integration.id} />
                        <input type="hidden" name="requiresApproval" value={action.requires_approval ? "false" : "true"} />
                        <PendingButton
                          pendingText="Updating..."
                          className="h-9 rounded-lg border border-black/10 bg-white px-3 text-sm font-semibold"
                        >
                          {action.requires_approval ? <ShieldCheck size={15} /> : <LockKeyhole size={15} />}
                          {action.requires_approval ? "Allow autonomous" : "Require approval"}
                        </PendingButton>
                      </form>
                    </div>
                    <div className="mt-4 rounded-lg border border-black/10 bg-[#f5f8fc] p-3">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-black/38">
                        <FileJson size={14} />
                        Action contract
                      </div>
                      <p className="mt-2 text-sm leading-6 text-black/58">
                        Inputs: {readSchemaList(action.schema, "inputs")} · Output: {readSchemaOutput(action.schema)}
                      </p>
                    </div>
                  </article>
                ))}
                {actionRows.length === 0 && (
                  <div className="rounded-lg border border-dashed border-black/15 bg-[#f5f8fc] p-5">
                    <p className="font-semibold">No actions synced yet.</p>
                    <p className="mt-2 text-sm leading-6 text-black/52">
                      Sync the provider catalog to define the actions agents can execute through this integration.
                    </p>
                  </div>
                )}
              </div>
            </Panel>
          </div>

          <div className="space-y-6">
            <Panel title="Scope readiness" icon={ShieldCheck}>
              <div className="rounded-lg border border-black/10 bg-[#0b2a4a] p-5 text-white">
                <p className="text-sm text-white/48">Provider key</p>
                <p className="mt-2 text-2xl font-semibold">{integration.provider_key}</p>
                <p className="mt-3 text-sm leading-6 text-white/58">
                  {missingActions > 0
                    ? `${missingActions} catalog actions are not yet synced.`
                    : "The provider action catalog is synced for this workspace."}
                </p>
              </div>
              <div className="mt-4 grid gap-3">
                {(integration.scopes ?? []).map((scope: string) => (
                  <div key={scope} className="flex items-center justify-between rounded-lg border border-black/10 p-3">
                    <span className="text-sm font-semibold">{scope}</span>
                    <CheckCircle2 size={16} className="text-[#0b2a4a]" />
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Recent execution calls" icon={RefreshCw}>
              <div className="space-y-3">
                {(executionActions ?? []).map((action) => (
                  <div key={action.id} className="rounded-lg border border-black/10 p-4">
                    <p className="font-semibold">{action.action_key}</p>
                    <p className="mt-1 text-sm text-black/52">{action.status} · {formatDate(action.created_at)}</p>
                  </div>
                ))}
                {(executionActions ?? []).length === 0 && (
                  <p className="rounded-lg border border-dashed border-black/15 p-4 text-sm text-black/48">
                    Execution calls will appear when workflows use this provider.
                  </p>
                )}
              </div>
            </Panel>

            <Panel title="Integration audit" icon={ShieldCheck}>
              <div className="divide-y divide-black/8 rounded-lg border border-black/10">
                {(auditLogs ?? []).map((log) => (
                  <div key={log.id} className="p-4">
                    <p className="font-semibold">{log.event_summary}</p>
                    <p className="mt-1 text-sm text-black/50">{formatDate(log.created_at)}</p>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </section>
      </div>
    </main>
  );
}

function IntegrationButton({
  id,
  status,
  label,
  icon,
}: {
  id: string;
  status: "connected" | "disabled";
  label: string;
  icon: "check" | "power";
}) {
  const Icon = icon === "check" ? CheckCircle2 : Power;

  return (
    <form action={updateIntegrationStatus}>
      <input type="hidden" name="integrationId" value={id} />
      <input type="hidden" name="status" value={status} />
      <PendingButton
        pendingText={label === "Connect" ? "Connecting..." : "Disabling..."}
        className={cn(
          "h-10 rounded-lg px-3 text-sm font-semibold",
          status === "connected"
            ? "border border-black/10 bg-white text-[#151914]"
            : "border border-black/10 bg-white text-[#151914]",
        )}
      >
        {icon === "check" ? <Icon size={15} /> : <LockKeyhole size={15} />}
        {label}
      </PendingButton>
    </form>
  );
}

function connectionPlaceholder(providerKey: string) {
  const labels: Record<string, string> = {
    github: "GitHub organization ID",
    slack: "Slack workspace ID",
    teams: "Microsoft tenant ID",
    okta: "Okta domain or tenant ID",
    jira: "Jira site ID",
    "google-workspace": "Google customer ID",
  };

  return labels[providerKey] ?? "Workspace or app ID";
}

type IntegrationConfig = {
  connection_id?: string;
  admin_email?: string | null;
  connection_note?: string | null;
};

function ConnectionSetupForm({
  integrationId,
  providerKey,
  displayName,
  config,
  isConnected,
}: {
  integrationId: string;
  providerKey: string;
  displayName: string;
  config: IntegrationConfig | null;
  isConnected: boolean;
}) {
  return (
    <div>
      {isConnected && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <p className="font-semibold">{displayName} is connected</p>
          <p className="mt-1">ID: {config?.connection_id ?? "Not saved"}</p>
          {config?.admin_email && <p className="mt-1">Admin: {config.admin_email}</p>}
          {config?.connection_note && <p className="mt-1">Note: {config.connection_note}</p>}
        </div>
      )}
      <form action={updateIntegrationStatus} className="grid gap-3 md:grid-cols-[1fr_1fr]">
        <input type="hidden" name="integrationId" value={integrationId} />
        <input type="hidden" name="status" value="connected" />
        <label className="text-xs font-semibold uppercase tracking-[0.12em] text-black/42">
          Workspace ID
          <input
            name="connectionId"
            required
            defaultValue={config?.connection_id ?? ""}
            placeholder={connectionPlaceholder(providerKey)}
            className="mt-2 h-10 w-full rounded-lg border border-black/10 bg-white px-3 text-sm normal-case tracking-normal outline-none focus:border-[#0b2a4a]"
          />
        </label>
        <label className="text-xs font-semibold uppercase tracking-[0.12em] text-black/42">
          Admin email
          <input
            name="adminEmail"
            type="email"
            defaultValue={config?.admin_email ?? ""}
            placeholder="admin@company.com"
            className="mt-2 h-10 w-full rounded-lg border border-black/10 bg-white px-3 text-sm normal-case tracking-normal outline-none focus:border-[#0b2a4a]"
          />
        </label>
        <label className="text-xs font-semibold uppercase tracking-[0.12em] text-black/42 md:col-span-2">
          Setup note
          <input
            name="note"
            defaultValue={config?.connection_note ?? ""}
            placeholder="Optional ticket reference, scope note, or approval context"
            className="mt-2 h-10 w-full rounded-lg border border-black/10 bg-white px-3 text-sm normal-case tracking-normal outline-none focus:border-[#0b2a4a]"
          />
        </label>
        <div className="md:col-span-2">
          <PendingButton
            pendingText={isConnected ? "Updating..." : "Connecting..."}
            className="h-10 rounded-lg bg-[#0b2a4a] px-3 text-sm font-semibold text-white"
          >
            <CheckCircle2 size={15} />
            {isConnected ? "Update connection" : "Validate and connect"}
          </PendingButton>
        </div>
      </form>
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
    <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-black/52">{label}</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
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
    <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-lg bg-[#e7f0ff] text-[#0b5f91]">
          <Icon size={18} />
        </span>
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function RiskPill({ risk }: { risk: string }) {
  return (
    <span className={cn("rounded-md border px-2 py-1 text-xs font-semibold", riskStyles[risk] ?? riskStyles.low)}>
      {risk} risk
    </span>
  );
}

function readSchemaList(value: unknown, key: string) {
  if (!value || typeof value !== "object") {
    return "none";
  }

  const schema = value as Record<string, unknown>;
  const items = Array.isArray(schema[key]) ? schema[key].map(String) : [];
  return items.length ? items.join(", ") : "none";
}

function readSchemaOutput(value: unknown) {
  if (!value || typeof value !== "object") {
    return "unknown";
  }

  const schema = value as Record<string, unknown>;
  return typeof schema.output === "string" ? schema.output : "unknown";
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
