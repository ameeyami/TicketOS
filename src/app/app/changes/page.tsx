import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BadgeCheck,
  CheckCircle2,
  Clock3,
  FilePenLine,
  FileText,
  GitBranch,
  ShieldAlert,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { markChangeReady, requestChange } from "@/app/app/changes/actions";
import { PageHeader } from "@/components/dashboard/page-header";
import { PendingButton } from "@/components/ui/pending-button";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const riskStyles: Record<string, string> = {
  low: "border-zinc-200 bg-zinc-50 text-zinc-700",
  medium: "border-sky-200 bg-sky-50 text-sky-700",
  high: "border-amber-200 bg-amber-50 text-amber-800",
  critical: "border-rose-200 bg-rose-50 text-rose-700",
};

export default async function ChangesPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect("/auth/sign-in?message=Sign in to manage change requests.");
  }

  const organization = await ensureWorkspace(supabase, userData.user);
  const [{ data: approvals }, { data: changeLogs }, { data: workflows }, { data: integrations }, { data: policies }] =
    await Promise.all([
      supabase
        .from("approval_requests")
        .select("id, title, description, status, due_at, created_at")
        .eq("organization_id", organization.id)
        .is("ticket_id", null)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("audit_logs")
        .select("*")
        .eq("organization_id", organization.id)
        .in("event_type", ["change_requested", "change_ready", "approved", "rejected"])
        .order("created_at", { ascending: false })
        .limit(30),
      supabase.from("workflows").select("id, name, trigger_type, updated_at").eq("organization_id", organization.id).order("updated_at", { ascending: false }),
      supabase.from("integrations").select("id, display_name, status, updated_at").eq("organization_id", organization.id).order("updated_at", { ascending: false }),
      supabase.from("policy_rules").select("id, name, decision, is_active, updated_at").eq("organization_id", organization.id).order("updated_at", { ascending: false }),
    ]);

  const approvalRows = approvals ?? [];
  const logs = changeLogs ?? [];
  const requestByApproval = new Map(
    logs
      .filter((log) => log.event_type === "change_requested" && typeof log.metadata?.approval_id === "string")
      .map((log) => [String(log.metadata.approval_id), log]),
  );
  const readyApprovalIds = new Set(
    logs.filter((log) => log.event_type === "change_ready" && typeof log.metadata?.approval_id === "string").map((log) => String(log.metadata.approval_id)),
  );
  const changes = approvalRows.map((approval) => ({
    approval,
    request: requestByApproval.get(approval.id),
    isReady: readyApprovalIds.has(approval.id),
  }));

  const pendingCount = changes.filter((change) => change.approval.status === "pending").length;
  const readyCount = changes.filter((change) => change.isReady).length;
  const highRiskCount = changes.filter((change) => ["high", "critical"].includes(String(change.request?.metadata?.risk ?? ""))).length;

  return (
    <main className="min-h-screen bg-[#f6f7f2] px-4 py-6 text-[#151914] md:px-8">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          crumbs={[{ label: "IT" }, { label: "Changes" }]}
          title="Changes"
          description="Govern operational changes with review and rollback."
          actions={
            <Link
              href="/app/approvals"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#17211c] px-3 text-sm font-semibold text-white"
            >
              Approvals
              <BadgeCheck size={16} />
            </Link>
          }
        />

        <section className="mt-6 grid gap-3 md:grid-cols-4">
          <MetricCard label="Open changes" value={String(changes.length)} icon={FilePenLine} />
          <MetricCard label="Pending approval" value={String(pendingCount)} icon={Clock3} />
          <MetricCard label="Ready" value={String(readyCount)} icon={CheckCircle2} />
          <MetricCard label="High risk" value={String(highRiskCount)} icon={ShieldAlert} />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[.75fr_1fr]">
          <div className="space-y-6">
            <Panel title="Request change" icon={FilePenLine}>
              <form action={requestChange} className="space-y-3">
                <input type="hidden" name="organizationId" value={organization.id} />
                <input
                  name="title"
                  required
                  placeholder="Change title"
                  className="h-10 w-full rounded-lg border border-black/10 bg-white px-3 text-sm outline-none"
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <select name="changeType" defaultValue="workflow" className="h-10 rounded-lg border border-black/10 bg-white px-3 text-sm font-semibold outline-none">
                    <option value="workflow">Workflow</option>
                    <option value="policy">Policy</option>
                    <option value="integration">Integration</option>
                    <option value="automation">Automation</option>
                  </select>
                  <select name="risk" defaultValue="medium" className="h-10 rounded-lg border border-black/10 bg-white px-3 text-sm font-semibold outline-none">
                    <option value="low">Low risk</option>
                    <option value="medium">Medium risk</option>
                    <option value="high">High risk</option>
                    <option value="critical">Critical risk</option>
                  </select>
                </div>
                <input
                  name="owner"
                  placeholder="Owner (optional)"
                  className="h-10 w-full rounded-lg border border-black/10 bg-white px-3 text-sm outline-none"
                />
                <textarea
                  name="reason"
                  required
                  rows={4}
                  placeholder="Why is this change needed?"
                  className="w-full resize-none rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none"
                />
                <textarea
                  name="rollback"
                  rows={3}
                  placeholder="Rollback plan (optional)"
                  className="w-full resize-none rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none"
                />
                <PendingButton pendingText="Requesting..." className="h-10 rounded-lg bg-[#17211c] px-3 text-sm font-semibold text-white">
                  Request change
                </PendingButton>
              </form>
            </Panel>

            <Panel title="Recent config" icon={GitBranch}>
              <div className="grid gap-3">
                <ConfigFact label="Workflows" value={String(workflows?.length ?? 0)} detail={workflows?.[0]?.name ?? "No workflow changes"} />
                <ConfigFact label="Integrations" value={String(integrations?.length ?? 0)} detail={integrations?.[0]?.display_name ?? "No integration changes"} />
                <ConfigFact label="Policies" value={String(policies?.length ?? 0)} detail={policies?.[0]?.name ?? "No policy changes"} />
              </div>
            </Panel>
          </div>

          <div className="space-y-4">
            {changes.map(({ approval, request, isReady }) => {
              const risk = String(request?.metadata?.risk ?? "medium");
              const changeType = String(request?.metadata?.change_type ?? "change");

              return (
                <article key={approval.id} className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn("rounded-md border px-2 py-1 text-xs font-semibold", riskStyles[risk] ?? riskStyles.medium)}>
                          {risk}
                        </span>
                        <span className="rounded-md border border-black/10 px-2 py-1 text-xs font-semibold text-black/52">
                          {changeType}
                        </span>
                        <span className="rounded-md border border-black/10 px-2 py-1 text-xs font-semibold text-black/52">
                          {approval.status}
                        </span>
                        {isReady && (
                          <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                            ready
                          </span>
                        )}
                      </div>
                      <h2 className="mt-3 text-xl font-semibold tracking-tight">{approval.title}</h2>
                      <p className="mt-2 text-sm text-black/52">{approval.description}</p>
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-black/38">
                      Due {formatDate(approval.due_at)}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-3">
                    <Fact label="Owner" value={String(request?.metadata?.owner ?? "Unassigned")} />
                    <Fact label="Requested" value={formatDate(approval.created_at)} />
                    <Fact label="Rollback" value={request?.metadata?.rollback ? "Provided" : "Missing"} />
                  </div>

                  <form action={markChangeReady} className="mt-5 rounded-lg border border-black/10 bg-[#f8faf5] p-4">
                    <input type="hidden" name="organizationId" value={organization.id} />
                    <input type="hidden" name="approvalId" value={approval.id} />
                    <input type="hidden" name="title" value={approval.title} />
                    <textarea
                      name="note"
                      rows={3}
                      className="w-full resize-none rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none"
                      placeholder="Optional implementation note..."
                    />
                    <PendingButton
                      pendingText="Marking..."
                      disabled={isReady}
                      className="mt-3 h-10 rounded-lg bg-[#17211c] px-3 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      <CheckCircle2 size={16} />
                      Mark ready
                    </PendingButton>
                  </form>
                </article>
              );
            })}

            {changes.length === 0 && (
              <div className="rounded-xl border border-dashed border-black/15 bg-white p-8 text-center">
                <Workflow size={28} className="mx-auto text-[#2f6f60]" />
                <p className="mt-3 font-semibold">No change requests yet.</p>
                <p className="mt-2 text-sm text-black/52">Workflow, policy, and integration changes will appear here.</p>
              </div>
            )}

            <Panel title="Change audit" icon={FileText}>
              <div className="divide-y divide-black/8 rounded-lg border border-black/10">
                {logs.slice(0, 8).map((log) => (
                  <div key={log.id} className="p-4">
                    <p className="font-semibold">{log.event_summary}</p>
                    <p className="mt-1 text-sm text-black/48">
                      {log.event_type.replaceAll("_", " ")} · {formatDate(log.created_at)}
                    </p>
                  </div>
                ))}
                {logs.length === 0 && <p className="p-4 text-sm text-black/48">Change events will appear here.</p>}
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
      <p className="mt-2 text-sm font-semibold text-black/70">{value}</p>
    </div>
  );
}

function ConfigFact({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-lg border border-black/10 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold">{label}</p>
        <span className="text-2xl font-semibold">{value}</span>
      </div>
      <p className="mt-2 text-sm text-black/50">{detail}</p>
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
