import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Cable,
  CheckCircle2,
  Clock3,
  FileText,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { recordAppOwnerReview, requestAppReview } from "@/app/app/apps/actions";
import { PendingButton } from "@/components/ui/pending-button";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type IntegrationRow = {
  id: string;
  provider_key: string;
  display_name: string;
  status: string;
  scopes: string[] | null;
  config: Record<string, unknown> | null;
  updated_at: string;
};

type ActionRow = {
  id: string;
  integration_id: string;
  display_name: string;
  action_key: string;
  risk_level: string;
  requires_approval: boolean;
};

type AuditRow = {
  id: string;
  event_type: string;
  event_summary: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

type ApprovalRow = {
  id: string;
  title: string;
  status: string;
  created_at: string;
};

const statusStyles: Record<string, string> = {
  connected: "border-emerald-200 bg-emerald-50 text-emerald-700",
  degraded: "border-amber-200 bg-amber-50 text-amber-800",
  disabled: "border-rose-200 bg-rose-50 text-rose-700",
  not_connected: "border-zinc-200 bg-zinc-50 text-zinc-700",
};

const riskStyles: Record<string, string> = {
  high: "border-rose-200 bg-rose-50 text-rose-700",
  medium: "border-amber-200 bg-amber-50 text-amber-800",
  low: "border-zinc-200 bg-zinc-50 text-zinc-700",
};

export default async function AppsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect("/auth/sign-in?message=Sign in to review apps.");
  }

  const organization = await ensureWorkspace(supabase, userData.user);
  const [{ data: integrations }, { data: actions }, { data: audits }, { data: approvals }] = await Promise.all([
    supabase
      .from("integrations")
      .select("id, provider_key, display_name, status, scopes, config, updated_at")
      .eq("organization_id", organization.id)
      .order("display_name"),
    supabase
      .from("integration_actions")
      .select("id, integration_id, display_name, action_key, risk_level, requires_approval")
      .eq("organization_id", organization.id)
      .order("risk_level", { ascending: false }),
    supabase
      .from("audit_logs")
      .select("id, event_type, event_summary, created_at, metadata")
      .eq("organization_id", organization.id)
      .in("event_type", ["app_review_requested", "app_owner_reviewed", "integration_updated", "integration_actions_synced"])
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("approval_requests")
      .select("id, title, status, created_at")
      .eq("organization_id", organization.id)
      .ilike("title", "App review:%")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const integrationRows = (integrations ?? []) as IntegrationRow[];
  const actionRows = (actions ?? []) as ActionRow[];
  const auditRows = (audits ?? []) as AuditRow[];
  const approvalRows = (approvals ?? []) as ApprovalRow[];
  const connectedCount = integrationRows.filter((app) => app.status === "connected").length;
  const highRiskActions = actionRows.filter((action) => action.risk_level === "high").length;
  const approvalActions = actionRows.filter((action) => action.requires_approval).length;
  const pendingReviews = approvalRows.filter((approval) => approval.status === "pending").length;

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
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#47685d]">Apps</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Govern connected apps.</h1>
          </div>
          <Link
            href="/app/integrations"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#17211c] px-3 text-sm font-semibold text-white"
          >
            Integrations
            <Cable size={16} />
          </Link>
        </div>

        <section className="mt-6 grid gap-3 md:grid-cols-4">
          <MetricCard label="Apps" value={String(integrationRows.length)} icon={Cable} />
          <MetricCard label="Connected" value={String(connectedCount)} icon={CheckCircle2} />
          <MetricCard label="High risk" value={String(highRiskActions)} icon={ShieldAlert} />
          <MetricCard label="Pending reviews" value={String(pendingReviews)} icon={Clock3} />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_.38fr]">
          <div className="grid gap-4 lg:grid-cols-2">
            {integrationRows.map((app) => {
              const appActions = actionRows.filter((action) => action.integration_id === app.id);
              const appAudits = auditRows.filter((audit) => audit.metadata?.integration_id === app.id);
              const owner = appAudits.find((audit) => audit.event_type === "app_owner_reviewed")?.metadata?.owner_email;
              const highRiskCount = appActions.filter((action) => action.risk_level === "high").length;
              const approvalCount = appActions.filter((action) => action.requires_approval).length;
              const config = app.config ?? {};

              return (
                <article key={app.id} className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusPill value={app.status} />
                        <span className="rounded-md border border-black/10 px-2 py-1 text-xs font-semibold text-black/52">
                          {app.provider_key}
                        </span>
                      </div>
                      <h2 className="mt-3 text-xl font-semibold tracking-tight">{app.display_name}</h2>
                      <p className="mt-2 text-sm text-black/52">
                        ID: {String(config.connection_id ?? "Not connected")} {owner ? `· Owner: ${String(owner)}` : ""}
                      </p>
                    </div>
                    <Link
                      href={`/app/integrations/${app.id}`}
                      className="inline-flex h-9 items-center gap-2 rounded-lg border border-black/10 bg-white px-3 text-sm font-semibold"
                    >
                      Actions
                      <Workflow size={15} />
                    </Link>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-3">
                    <Fact label="Actions" value={String(appActions.length)} />
                    <Fact label="High risk" value={String(highRiskCount)} />
                    <Fact label="Approval" value={String(approvalCount)} />
                  </div>

                  <div className="mt-5 rounded-lg border border-black/10">
                    {appActions.slice(0, 4).map((action) => (
                      <div key={action.id} className="flex items-center justify-between gap-3 border-b border-black/8 p-3 last:border-b-0">
                        <div>
                          <p className="text-sm font-semibold">{action.display_name}</p>
                          <p className="mt-1 text-xs text-black/42">{action.action_key}</p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <RiskPill value={action.risk_level} />
                          {action.requires_approval && <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">approval</span>}
                        </div>
                      </div>
                    ))}
                    {appActions.length === 0 && <p className="p-3 text-sm text-black/48">Sync actions from the integration detail page.</p>}
                  </div>

                  <div className="mt-5 grid gap-3">
                    <form action={requestAppReview} className="rounded-lg border border-black/10 bg-[#f8faf5] p-4">
                      <input type="hidden" name="organizationId" value={organization.id} />
                      <input type="hidden" name="integrationId" value={app.id} />
                      <input type="hidden" name="appName" value={app.display_name} />
                      <div className="grid gap-3 sm:grid-cols-[.55fr_1fr]">
                        <select name="reviewType" defaultValue={highRiskCount > 0 ? "risk_review" : "access_review"} className="h-10 rounded-lg border border-black/10 bg-white px-3 text-sm font-semibold outline-none">
                          <option value="owner_review">Owner review</option>
                          <option value="access_review">Access review</option>
                          <option value="risk_review">Risk review</option>
                        </select>
                        <input name="note" placeholder="Optional review note" className="h-10 rounded-lg border border-black/10 bg-white px-3 text-sm outline-none" />
                      </div>
                      <PendingButton pendingText="Requesting..." className="mt-3 h-10 rounded-lg bg-[#17211c] px-3 text-sm font-semibold text-white">
                        <BadgeCheck size={16} />
                        Request app review
                      </PendingButton>
                    </form>

                    <form action={recordAppOwnerReview} className="rounded-lg border border-black/10 bg-white p-4">
                      <input type="hidden" name="organizationId" value={organization.id} />
                      <input type="hidden" name="integrationId" value={app.id} />
                      <input type="hidden" name="appName" value={app.display_name} />
                      <div className="grid gap-3 sm:grid-cols-2">
                        <input name="ownerEmail" required type="email" placeholder="Owner email" className="h-10 rounded-lg border border-black/10 bg-white px-3 text-sm outline-none" />
                        <input name="note" placeholder="Optional note" className="h-10 rounded-lg border border-black/10 bg-white px-3 text-sm outline-none" />
                      </div>
                      <PendingButton pendingText="Saving..." className="mt-3 h-10 rounded-lg border border-black/10 bg-white px-3 text-sm font-semibold text-[#17211c]">
                        <ShieldCheck size={16} />
                        Record owner
                      </PendingButton>
                    </form>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="space-y-6">
            <Panel title="Review queue" icon={BadgeCheck}>
              <div className="space-y-3">
                {approvalRows.map((approval) => (
                  <div key={approval.id} className="rounded-lg border border-black/10 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold">{approval.title}</p>
                      <StatusPill value={approval.status} />
                    </div>
                    <p className="mt-2 text-sm text-black/48">{formatDate(approval.created_at)}</p>
                  </div>
                ))}
                {approvalRows.length === 0 && <p className="rounded-lg border border-dashed border-black/15 p-4 text-sm text-black/48">App review requests will appear here.</p>}
              </div>
            </Panel>

            <Panel title="App audit" icon={FileText}>
              <div className="divide-y divide-black/8 rounded-lg border border-black/10">
                {auditRows.slice(0, 12).map((audit) => (
                  <div key={audit.id} className="p-4">
                    <p className="font-semibold">{audit.event_summary}</p>
                    <p className="mt-1 text-sm text-black/48">
                      {audit.event_type.replaceAll("_", " ")} · {formatDate(audit.created_at)}
                    </p>
                  </div>
                ))}
                {auditRows.length === 0 && <p className="p-4 text-sm text-black/48">App governance events will appear here.</p>}
              </div>
            </Panel>

            <Panel title="Controls" icon={KeyRound}>
              <div className="grid gap-3">
                <Fact label="Approval actions" value={String(approvalActions)} />
                <Fact label="Synced actions" value={String(actionRows.length)} />
                <Fact label="Connected apps" value={`${connectedCount}/${integrationRows.length}`} />
              </div>
            </Panel>
          </div>
        </section>
      </div>
    </main>
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
      <p className="mt-2 break-words text-sm font-semibold text-black/70">{value}</p>
    </div>
  );
}

function StatusPill({ value }: { value: string }) {
  return (
    <span className={cn("rounded-md border px-2 py-1 text-xs font-semibold", statusStyles[value] ?? "border-zinc-200 bg-zinc-50 text-zinc-700")}>
      {value.replaceAll("_", " ")}
    </span>
  );
}

function RiskPill({ value }: { value: string }) {
  return <span className={cn("rounded-md border px-2 py-1 text-xs font-semibold", riskStyles[value] ?? riskStyles.low)}>{value}</span>;
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
