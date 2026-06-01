import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Clock3,
  ShieldCheck,
  UserX,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createOffboardingRun, logOffboardingStep } from "@/app/app/offboarding/actions";
import { PageHeader } from "@/components/dashboard/page-header";
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

const appOptions = ["Okta", "Google Workspace", "Slack", "GitHub", "Jira", "Figma", "Finance app", "Production access"];
const fieldClass = "h-10 w-full rounded-md border border-[#d8e4ee] bg-white px-3 text-sm outline-none focus:border-[#0b5f91]";

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
  const { data: tickets } = await supabase
    .from("tickets")
    .select("id, external_id, title, status, priority, requester_email, ai_summary, ai_confidence, created_at")
    .eq("organization_id", organization.id)
    .eq("source", "offboarding_workspace")
    .order("created_at", { ascending: false })
    .limit(24);

  const ticketRows = (tickets ?? []) as TicketRow[];
  const openRuns = ticketRows.filter((ticket) => !["resolved", "failed"].includes(ticket.status)).length;
  const criticalRuns = ticketRows.filter((ticket) => ticket.priority === "critical").length;

  return (
    <main className="min-h-screen bg-[#f4f8fb] px-4 py-5 text-[#07111f] md:px-8">
      <div className="mx-auto max-w-6xl">
        <PageHeader
          crumbs={[{ label: "Operations" }, { label: "Offboarding" }]}
          title="Offboarding"
          description="Create an access revocation run and track active exits."
        />

        <section className="mt-5 grid gap-3 md:grid-cols-3">
          <MetricCard label="Runs" value={String(ticketRows.length)} icon={UserX} />
          <MetricCard label="Open" value={String(openRuns)} icon={Clock3} />
          <MetricCard label="Critical" value={String(criticalRuns)} icon={ShieldCheck} />
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[320px_1fr]">
          <div>
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
                <details className="rounded-md border border-[#d8e4ee] bg-[#f8fbfe] p-3">
                  <summary className="cursor-pointer text-sm font-semibold">Access to revoke</summary>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {appOptions.map((app) => (
                      <label key={app} className="flex min-h-9 items-center gap-2 rounded-md border border-[#d8e4ee] bg-white px-3 text-sm font-medium">
                        <input type="checkbox" name="apps" value={app} className="size-4 accent-[#0b2a4a]" />
                        {app}
                      </label>
                    ))}
                  </div>
                </details>
                <label className="flex min-h-10 items-center gap-2 rounded-md border border-[#d8e4ee] bg-[#f8fbfe] px-3 text-sm font-semibold">
                  <input type="checkbox" name="legalHold" className="size-4 accent-[#0b2a4a]" />
                  Preserve data for legal or security review
                </label>
                <textarea
                  name="note"
                  rows={2}
                  placeholder="Optional note, HR reference, or device return detail"
                  className="w-full resize-none rounded-md border border-[#d8e4ee] bg-white px-3 py-2 text-sm outline-none focus:border-[#0b5f91]"
                />
                <PendingButton pendingText="Creating..." className="h-10 w-full rounded-md bg-[#0b2a4a] px-3 text-sm font-semibold text-white">
                  <UserX size={16} />
                  Create run
                </PendingButton>
              </form>
            </Panel>
          </div>

          <div className="space-y-5">
            <div className="space-y-3">
              {ticketRows.map((ticket) => (
                <article key={ticket.id} className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
                  <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusPill value={ticket.status} />
                        <span className="rounded-md border border-black/10 px-2 py-1 text-xs font-semibold text-black/42">
                          {ticket.priority}
                        </span>
                      </div>
                      <h2 className="mt-2 text-base font-semibold tracking-tight">{ticket.title}</h2>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-600">{ticket.ai_summary ?? "Offboarding run queued."}</p>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-black/42">
                        <span>{ticket.requester_email ?? "Manager"}</span>
                        <span>{ticket.ai_confidence ?? 0}% confidence</span>
                        <span>{formatDate(ticket.created_at)}</span>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Link href={`/app/tickets/${ticket.id}`} className="inline-flex h-9 items-center justify-center rounded-md border border-black/10 bg-white px-3 text-sm font-semibold">
                        Inspect
                      </Link>
                      <form action={logOffboardingStep} className="grid gap-2 rounded-md border border-[#d8e4ee] bg-[#f8fbfe] p-3">
                        <input type="hidden" name="organizationId" value={organization.id} />
                        <input type="hidden" name="ticketId" value={ticket.id} />
                        <input type="hidden" name="employeeName" value={ticket.title.replace("Offboard ", "")} />
                        <select name="step" defaultValue="Sessions revoked" className={cn(fieldClass, "font-semibold")}>
                          <option>Sessions revoked</option>
                          <option>Apps disabled</option>
                          <option>Ownership transferred</option>
                          <option>Device return logged</option>
                          <option>Data retention verified</option>
                        </select>
                        <input name="note" placeholder="Optional note" className={fieldClass} />
                        <PendingButton pendingText="Logging..." className="h-9 rounded-md bg-[#0b2a4a] px-3 text-sm font-semibold text-white">
                          <Workflow size={16} />
                          Log step
                        </PendingButton>
                      </form>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {ticketRows.length === 0 && (
              <div className="rounded-xl border border-dashed border-black/15 bg-white p-8 text-center">
                <UserX size={28} className="mx-auto text-[#2f6f60]" />
                <p className="mt-3 font-semibold">No offboarding runs yet.</p>
                <p className="mt-2 text-sm text-black/52">Create a run to generate the ticket and audit trail.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricCard({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) {
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

function Panel({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }) {
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
