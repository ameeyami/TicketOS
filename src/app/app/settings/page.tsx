import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Building2,
  Clock3,
  FileText,
  Gauge,
  LockKeyhole,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { updateOperationalControls, updateWorkspaceSettings } from "@/app/app/settings/actions";
import { PageHeader } from "@/components/dashboard/page-header";
import { PendingButton } from "@/components/ui/pending-button";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type AuditRow = {
  id: string;
  event_type: string;
  event_summary: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

const modeLabels: Record<string, string> = {
  assistive: "Assistive",
  approval_first: "Approval first",
  supervised: "Supervised",
  autonomous: "Autonomous",
};

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect("/auth/sign-in?message=Sign in to manage settings.");
  }

  const organization = await ensureWorkspace(supabase, userData.user);
  const [{ data: membership }, { data: settingsLogs }] = await Promise.all([
    supabase
      .from("organization_members")
      .select("role, created_at")
      .eq("organization_id", organization.id)
      .eq("user_id", userData.user.id)
      .maybeSingle(),
    supabase
      .from("audit_logs")
      .select("id, event_type, event_summary, created_at, metadata")
      .eq("organization_id", organization.id)
      .in("event_type", ["workspace_updated", "operational_controls_updated"])
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  const logs = (settingsLogs ?? []) as AuditRow[];
  const latestControls = logs.find((log) => log.event_type === "operational_controls_updated")?.metadata ?? {};
  const canManage = membership?.role === "owner" || membership?.role === "admin";
  const autonomyMode = String(latestControls.autonomy_mode ?? "approval_first");
  const confidenceThreshold = String(latestControls.confidence_threshold ?? "90");
  const retentionDays = String(latestControls.retention_days ?? "180");
  const approvalRequired = latestControls.approval_required !== false;

  return (
    <main className="min-h-screen bg-[#f6f7f2] px-4 py-6 text-[#151914] md:px-8">
      <div className="mx-auto max-w-6xl">
        <PageHeader
          crumbs={[{ label: "Settings" }]}
          title="Settings"
          description="Workspace controls."
          actions={
            <Link
              href="/app/audit"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#17211c] px-3 text-sm font-semibold text-white"
            >
              Audit
              <FileText size={16} />
            </Link>
          }
        />

        <section className="mt-6 grid gap-3 md:grid-cols-4">
          <MetricCard label="Role" value={membership?.role ?? "operator"} icon={ShieldCheck} />
          <MetricCard label="Mode" value={modeLabels[autonomyMode] ?? "Approval first"} icon={SlidersHorizontal} />
          <MetricCard label="Min confidence" value={`${confidenceThreshold}%`} icon={Gauge} />
          <MetricCard label="Retention" value={`${retentionDays}d`} icon={Clock3} />
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[.92fr_1fr]">
          <div className="space-y-6">
            <Panel title="Workspace identity" icon={Building2}>
              <form action={updateWorkspaceSettings} className="space-y-4">
                <input type="hidden" name="organizationId" value={organization.id} />
                <label className="block">
                  <span className="text-sm font-semibold">Workspace name</span>
                  <input
                    name="name"
                    defaultValue={organization.name}
                    required
                    disabled={!canManage}
                    className="mt-2 h-12 w-full rounded-lg border border-black/10 bg-white px-3 text-sm outline-none focus:border-[#2f6f60] focus:ring-4 focus:ring-[#2f6f60]/10 disabled:bg-black/5"
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <ReadOnlyFact label="Slug" value={organization.slug} />
                  <ReadOnlyFact label="Access" value={canManage ? "Can manage" : "View only"} />
                </div>
                <PendingButton
                  pendingText="Saving..."
                  disabled={!canManage}
                  className="h-10 rounded-lg bg-[#17211c] px-4 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Save workspace
                </PendingButton>
              </form>
            </Panel>

            <Panel title="Access profile" icon={LockKeyhole}>
              <div className="grid gap-3">
                <ReadOnlyFact label="Signed in as" value={userData.user.email ?? "Unknown"} />
                <ReadOnlyFact label="Workspace role" value={membership?.role ?? "operator"} />
                <ReadOnlyFact label="Tenant isolation" value="Supabase RLS active" />
              </div>
            </Panel>
          </div>

          <div className="space-y-6">
            <Panel title="Operational controls" icon={Settings2}>
              <form action={updateOperationalControls} className="space-y-4">
                <input type="hidden" name="organizationId" value={organization.id} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-semibold">Autonomy mode</span>
                    <select
                      name="autonomyMode"
                      defaultValue={autonomyMode}
                      disabled={!canManage}
                      className="mt-2 h-11 w-full rounded-lg border border-black/10 bg-white px-3 text-sm font-semibold outline-none disabled:bg-black/5"
                    >
                      <option value="assistive">Assistive</option>
                      <option value="approval_first">Approval first</option>
                      <option value="supervised">Supervised</option>
                      <option value="autonomous">Autonomous</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold">Minimum confidence</span>
                    <select
                      name="confidenceThreshold"
                      defaultValue={confidenceThreshold}
                      disabled={!canManage}
                      className="mt-2 h-11 w-full rounded-lg border border-black/10 bg-white px-3 text-sm font-semibold outline-none disabled:bg-black/5"
                    >
                      <option value="70">70%</option>
                      <option value="80">80%</option>
                      <option value="90">90%</option>
                      <option value="95">95%</option>
                    </select>
                  </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-semibold">Audit retention</span>
                    <select
                      name="retentionWindow"
                      defaultValue={retentionDays}
                      disabled={!canManage}
                      className="mt-2 h-11 w-full rounded-lg border border-black/10 bg-white px-3 text-sm font-semibold outline-none disabled:bg-black/5"
                    >
                      <option value="30">30 days</option>
                      <option value="90">90 days</option>
                      <option value="180">180 days</option>
                      <option value="365">365 days</option>
                    </select>
                  </label>
                  <label className="mt-7 flex h-11 items-center gap-3 rounded-lg border border-black/10 bg-white px-3 text-sm font-semibold">
                    <input
                      type="checkbox"
                      name="approvalRequired"
                      defaultChecked={approvalRequired}
                      disabled={!canManage}
                      className="size-4 accent-[#2f6f60]"
                    />
                    Require approval for risky actions
                  </label>
                </div>
                <textarea
                  name="note"
                  rows={3}
                  disabled={!canManage}
                  placeholder="Optional note for the audit log..."
                  className="w-full resize-none rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none disabled:bg-black/5"
                />
                <PendingButton
                  pendingText="Updating..."
                  disabled={!canManage}
                  className="h-10 rounded-lg bg-[#17211c] px-4 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Update controls
                </PendingButton>
              </form>
            </Panel>

            <Panel title="Settings audit" icon={FileText}>
              <div className="divide-y divide-black/8 rounded-lg border border-black/10">
                {logs.map((log) => (
                  <div key={log.id} className="p-4">
                    <p className="font-semibold">{log.event_summary}</p>
                    <p className="mt-1 text-sm text-black/48">
                      {log.event_type.replaceAll("_", " ")} · {formatDate(log.created_at)}
                    </p>
                  </div>
                ))}
                {logs.length === 0 && <p className="p-4 text-sm text-black/48">Settings changes will appear here.</p>}
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
          <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
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

function ReadOnlyFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-black/10 bg-[#f8faf5] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/38">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold text-black/70">{value}</p>
    </div>
  );
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
