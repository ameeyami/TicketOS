import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Clock3,
  FileText,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  UserX,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createOffboardingRun, logOffboardingStep } from "@/app/app/offboarding/actions";
import { PendingButton } from "@/components/ui/pending-button";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type TicketRow = {
  id: string;
  external_id: string | null;
  title: string;
  status: string;
  priority: string;
  requester_email: string | null;
  ai_summary: string | null;
  ai_confidence: number | null;
  created_at: string;
};

type ApprovalRow = {
  id: string;
  title: string;
  status: string;
  due_at: string | null;
  created_at: string;
};

type AuditRow = {
  id: string;
  event_type: string;
  event_summary: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

type IntegrationRow = {
  id: string;
  display_name: string;
  status: string;
};

const appOptions = ["Okta", "Google Workspace", "Slack", "GitHub", "Jira", "Figma", "Finance app", "Production access"];
const fieldClass = "h-10 w-full rounded-lg border border-black/10 bg-white px-3 text-sm outline-none";

const statusStyles: Record<string, string> = {
  triaging: "border-sky-200 bg-sky-50 text-sky-700",
  approval_required: "border-amber-200 bg-amber-50 text-amber-800",
  executing: "border-indigo-200 bg-indigo-50 text-indigo-700",
  resolved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  blocked: "border-rose-200 bg-rose-50 text-rose-700",
  failed: "border-rose-200 bg-rose-50 text-rose-700",
  pending: "border-amber-200 bg-amber-50 text-amber-800",
  connected: "border-emerald-200 bg-emerald-50 text-emerald-700",
  not_connected: "border-zinc-200 bg-zinc-50 text-zinc-700",
  degraded: "border-amber-200 bg-amber-50 text-amber-800",
  disabled: "border-rose-200 bg-rose-50 text-rose-700",
};

export default async function OffboardingPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect("/auth/sign-in?message=Sign in to manage offboarding.");
  }

  const organization = await ensureWorkspace(supabase, userData.user);
  const [{ data: tickets }, { data: approvals }, { data: audits }, { data: integrations }] = await Promise.all([
    supabase
      .from("tickets")
      .select("id, external_id, title, status, priority, requester_email, ai_summary, ai_confidence, created_at")
      .eq("organization_id", organization.id)
      .eq("source", "offboarding_workspace")
      .order("created_at", { ascending: false })
      .limit(24),
    supabase
      .from("approval_requests")
      .select("id, title, status, due_at, created_at")
      .eq("organization_id", organization.id)
      .ilike("title", "Offboarding approval:%")
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("audit_logs")
      .select("id, event_type, event_summary, created_at, metadata")
      .eq("organization_id", organization.id)
      .in("event_type", ["offboarding_run_created", "offboarding_step_logged"])
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("integrations")
      .select("id, display_name, status")
      .eq("organization_id", organization.id)
      .order("display_name"),
  ]);

  const ticketRows = (tickets ?? []) as TicketRow[];
  const approvalRows = (approvals ?? []) as ApprovalRow[];
  const auditRows = (audits ?? []) as AuditRow[];
  const integrationRows = (integrations ?? []) as IntegrationRow[];
  const openRuns = ticketRows.filter((ticket) => !["resolved", "failed"].includes(ticket.status)).length;
  const pendingApprovals = approvalRows.filter((approval) => approval.status === "pending").length;
  const criticalRuns = ticketRows.filter((ticket) => ticket.priority === "critical").length;

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
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#47685d]">Offboarding</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Revoke access safely.</h1>
          </div>
          <Link
            href="/app/security"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#17211c] px-3 text-sm font-semibold text-white"
          >
            Security
            <ShieldAlert size={16} />
          </Link>
        </div>

        <section className="mt-6 grid gap-3 md:grid-cols-4">
          <MetricCard label="Runs" value={String(ticketRows.length)} icon={UserX} />
          <MetricCard label="Open" value={String(openRuns)} icon={Clock3} />
          <MetricCard label="Approvals" value={String(pendingApprovals)} icon={BadgeCheck} />
          <MetricCard label="Critical" value={String(criticalRuns)} icon={ShieldCheck} />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[.42fr_1fr]">
          <div className="space-y-6">
            <Panel title="Create run" icon={UserX}>
              <form action={createOffboardingRun} className="space-y-3">
                <input name="employeeName" required placeholder="Employee name" className={fieldClass} />
                <input name="employeeEmail" required type="email" placeholder="Employee email" className={fieldClass} />
                <input name="managerEmail" required type="email" placeholder="Manager email" className={fieldClass} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <input name="lastDay" required type="date" className={fieldClass} />
                  <select name="urgency" defaultValue="standard" className={cn(fieldClass, "font-semibold")}>
                    <option value="standard">Standard</option>
                    <option value="immediate">Immediate</option>
                  </select>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <select name="reason" defaultValue="Voluntary departure" className={cn(fieldClass, "font-semibold")}>
                    <option>Voluntary departure</option>
                    <option>Contract ended</option>
                    <option>Role change</option>
                    <option>Security incident</option>
                  </select>
                  <input name="transferOwner" type="email" placeholder="Transfer owner email" className={fieldClass} />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {appOptions.map((app) => (
                    <label key={app} className="flex min-h-10 items-center gap-2 rounded-lg border border-black/10 bg-[#f8faf5] px-3 text-sm font-semibold">
                      <input type="checkbox" name="apps" value={app} className="size-4 accent-[#17211c]" />
                      {app}
                    </label>
                  ))}
                </div>
                <label className="flex min-h-10 items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 text-sm font-semibold text-amber-900">
                  <input type="checkbox" name="legalHold" className="size-4 accent-[#17211c]" />
                  Preserve data for legal or security review
                </label>
                <textarea
                  name="note"
                  rows={3}
                  placeholder="Optional note, HR reference, or device return detail"
                  className="w-full resize-none rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none"
                />
                <PendingButton pendingText="Creating..." className="h-10 w-full rounded-lg bg-[#17211c] px-3 text-sm font-semibold text-white">
                  <UserX size={16} />
                  Create offboarding run
                </PendingButton>
              </form>
            </Panel>

            <Panel title="Connected systems" icon={KeyRound}>
              <div className="space-y-2">
                {integrationRows.slice(0, 6).map((integration) => (
                  <div key={integration.id} className="flex items-center justify-between gap-3 rounded-lg border border-black/10 bg-white p-3">
                    <span className="font-semibold">{integration.display_name}</span>
                    <StatusPill value={integration.status} />
                  </div>
                ))}
                {integrationRows.length === 0 && <p className="rounded-lg border border-dashed border-black/15 p-4 text-sm text-black/48">Connected systems will appear here.</p>}
              </div>
            </Panel>
          </div>

          <div className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-2">
              {ticketRows.map((ticket) => (
                <article key={ticket.id} className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusPill value={ticket.status} />
                        <span className="rounded-md border border-black/10 px-2 py-1 text-xs font-semibold text-black/42">
                          {ticket.priority}
                        </span>
                      </div>
                      <h2 className="mt-3 text-lg font-semibold tracking-tight">{ticket.title}</h2>
                      <p className="mt-2 line-clamp-2 text-sm text-black/52">{ticket.ai_summary ?? "Offboarding run queued."}</p>
                    </div>
                    <Link href={`/app/tickets/${ticket.id}`} className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-semibold">
                      Inspect
                    </Link>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <Fact label="AI" value={`${ticket.ai_confidence ?? 0}%`} />
                    <Fact label="Owner" value={ticket.requester_email ?? "Manager"} />
                    <Fact label="Created" value={formatDate(ticket.created_at)} />
                  </div>

                  <form action={logOffboardingStep} className="mt-4 rounded-lg border border-black/10 bg-[#f8faf5] p-4">
                    <input type="hidden" name="organizationId" value={organization.id} />
                    <input type="hidden" name="ticketId" value={ticket.id} />
                    <input type="hidden" name="employeeName" value={ticket.title.replace("Offboard ", "")} />
                    <div className="grid gap-3 sm:grid-cols-[.62fr_1fr]">
                      <select name="step" defaultValue="Sessions revoked" className={cn(fieldClass, "font-semibold")}>
                        <option>Sessions revoked</option>
                        <option>Apps disabled</option>
                        <option>Ownership transferred</option>
                        <option>Device return logged</option>
                        <option>Data retention verified</option>
                      </select>
                      <input name="note" placeholder="Optional note" className={fieldClass} />
                    </div>
                    <PendingButton pendingText="Logging..." className="mt-3 h-10 rounded-lg border border-black/10 bg-white px-3 text-sm font-semibold text-[#17211c]">
                      <Workflow size={16} />
                      Log step
                    </PendingButton>
                  </form>
                </article>
              ))}
            </div>

            {ticketRows.length === 0 && (
              <div className="rounded-xl border border-dashed border-black/15 bg-white p-8 text-center">
                <UserX size={28} className="mx-auto text-[#2f6f60]" />
                <p className="mt-3 font-semibold">No offboarding runs yet.</p>
                <p className="mt-2 text-sm text-black/52">Create a run to generate the ticket, approval, and audit trail.</p>
              </div>
            )}

            <section className="grid gap-6 lg:grid-cols-2">
              <Panel title="Approvals" icon={BadgeCheck}>
                <div className="divide-y divide-black/8 rounded-lg border border-black/10">
                  {approvalRows.map((approval) => (
                    <div key={approval.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-semibold">{approval.title}</p>
                        <StatusPill value={approval.status} />
                      </div>
                      <p className="mt-1 text-sm text-black/48">Due {formatDate(approval.due_at ?? approval.created_at)}</p>
                    </div>
                  ))}
                  {approvalRows.length === 0 && <p className="p-4 text-sm text-black/48">High-risk revocations will pause here.</p>}
                </div>
              </Panel>

              <Panel title="Audit" icon={FileText}>
                <div className="divide-y divide-black/8 rounded-lg border border-black/10">
                  {auditRows.slice(0, 8).map((audit) => (
                    <div key={audit.id} className="p-4">
                      <p className="font-semibold">{audit.event_summary}</p>
                      <p className="mt-1 text-sm text-black/48">
                        {audit.event_type.replaceAll("_", " ")} · {formatDate(audit.created_at)}
                      </p>
                    </div>
                  ))}
                  {auditRows.length === 0 && <p className="p-4 text-sm text-black/48">Offboarding activity will appear here.</p>}
                </div>
              </Panel>
            </section>
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
    <div className="rounded-lg border border-black/10 bg-[#f8faf5] p-3">
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

function formatDate(value: string | null | undefined) {
  if (!value) return "Not recorded";

  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
