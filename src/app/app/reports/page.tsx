import { redirect } from "next/navigation";
import { BadgeCheck, BarChart3, CheckCircle2, CircleAlert, FileText, Sheet, ShieldCheck, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const statusLabels: Record<string, string> = {
  new: "New",
  triaging: "Investigating",
  approval_required: "Approval",
  executing: "Resolving",
  resolved: "Resolved",
  failed: "Failed",
  blocked: "Blocked",
};

export default async function ReportsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect("/auth/sign-in?message=Sign in to open reports.");
  }

  const organization = await ensureWorkspace(supabase, userData.user);
  const [{ data: tickets }, { data: workflowRuns }, { data: approvals }, { data: integrations }] = await Promise.all([
    supabase
      .from("tickets")
      .select("id, status, category, ai_confidence, assigned_agent_id")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("workflow_runs")
      .select("id, status, ticket_id")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("approval_requests")
      .select("id, status")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false }),
    supabase.from("integrations").select("id, status").eq("organization_id", organization.id).order("display_name"),
  ]);

  const ticketRows = tickets ?? [];
  const runRows = workflowRuns ?? [];
  const approvalRows = approvals ?? [];
  const integrationRows = integrations ?? [];
  const blockedTickets = ticketRows.filter((ticket) => ticket.status === "blocked" || ticket.status === "failed").length;
  const pendingApprovals = approvalRows.filter((approval) => approval.status === "pending").length;
  const automatedTickets = ticketRows.filter((ticket) => ticket.assigned_agent_id || runRows.some((run) => run.ticket_id === ticket.id)).length;
  const completedRuns = runRows.filter((run) => ["succeeded", "failed", "blocked", "cancelled"].includes(run.status));
  const successfulRuns = runRows.filter((run) => run.status === "succeeded").length;
  const connectedIntegrations = integrationRows.filter((integration) => integration.status === "connected").length;
  const avgConfidence = average(ticketRows.map((ticket) => Number(ticket.ai_confidence ?? 0)));
  const reportDate = new Date().toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  const statusCounts = countBy(ticketRows, "status");

  const highlights = [
    {
      title: "Automation coverage",
      value: `${percent(automatedTickets, ticketRows.length)}%`,
      detail: `${automatedTickets}/${ticketRows.length} tickets touched by agents`,
      icon: Sparkles,
    },
    {
      title: "Workflow success",
      value: `${percent(successfulRuns, completedRuns.length || runRows.length)}%`,
      detail: `${successfulRuns} successful runs`,
      icon: CheckCircle2,
    },
    {
      title: "Avg confidence",
      value: `${avgConfidence}%`,
      detail: "Across AI summaries",
      icon: BarChart3,
    },
    {
      title: "Connected apps",
      value: `${connectedIntegrations}/${integrationRows.length}`,
      detail: "Ready for execution",
      icon: ShieldCheck,
    },
  ];

  const risks = [
    { label: "Pending approvals", value: pendingApprovals, tone: pendingApprovals > 0 ? "amber" : "green" },
    { label: "Blocked or failed", value: blockedTickets, tone: blockedTickets > 0 ? "rose" : "green" },
  ];

  return (
    <main className="min-h-screen px-4 py-6 text-[#151914] md:px-8">
      <div className="mx-auto max-w-6xl">
        <PageHeader
          crumbs={[{ label: "Governance" }, { label: "Reports" }]}
          title="Reports"
          description={reportDate}
          actions={
            <div className="flex items-center gap-2">
              <a
                href="/app/reports/export?format=csv"
                download
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-black/10 bg-white px-3 text-sm font-semibold text-[#0b2a4a] transition hover:bg-black/[0.04]"
              >
                <Sheet size={15} />
                CSV
              </a>
              <a
                href="/app/reports/export?format=pdf"
                download
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#0b2a4a] px-3 text-sm font-semibold text-white transition hover:bg-[#07111f]"
              >
                <FileText size={15} />
                PDF
              </a>
            </div>
          }
        />

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {highlights.map((item) => (
            <MetricCard key={item.title} {...item} />
          ))}
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-[1fr_340px]">
          <Panel title="Ticket mix" icon={BadgeCheck}>
            <div className="grid gap-3 md:grid-cols-2">
              {Object.entries(statusCounts).map(([status, count]) => (
                <div key={status} className="rounded-lg border border-black/10 p-3">
                  <p className="text-sm font-semibold">{statusLabels[status] ?? titleCase(status.replaceAll("_", " "))}</p>
                  <p className="mt-1 text-2xl font-semibold">{count}</p>
                </div>
              ))}
              {Object.entries(statusCounts).length === 0 && (
                <p className="rounded-lg border border-dashed border-black/15 p-3 text-sm text-black/48">No ticket data yet.</p>
              )}
            </div>
          </Panel>

          <Panel title="Needs attention" icon={CircleAlert}>
            <div className="space-y-3">
              {risks.map((risk) => (
                <div key={risk.label} className={cn("rounded-lg border p-3", riskTone(risk.tone))}>
                  <p className="text-sm font-semibold">{risk.label}</p>
                  <p className="mt-1 text-2xl font-semibold">{risk.value}</p>
                </div>
              ))}
            </div>
          </Panel>
        </section>
      </div>
    </main>
  );
}

function MetricCard({ title, value, detail, icon: Icon }: { title: string; value: string; detail: string; icon: LucideIcon }) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500">{title}</p>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight">{value}</p>
          <p className="mt-1 text-xs text-slate-400">{detail}</p>
        </div>
        <span className="flex size-9 items-center justify-center rounded-lg bg-[#e7f0ff] text-[#0b5f91]">
          <Icon size={17} />
        </span>
      </div>
    </div>
  );
}

function Panel({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-lg bg-[#e7f0ff] text-[#0b5f91]">
          <Icon size={15} />
        </span>
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function average(values: number[]) {
  const cleanValues = values.filter((value) => Number.isFinite(value));
  return cleanValues.length ? Math.round(cleanValues.reduce((sum, value) => sum + value, 0) / cleanValues.length) : 0;
}

function percent(part: number, total: number) {
  return total ? Math.round((part / total) * 100) : 0;
}

function countBy<T extends Record<string, unknown>>(rows: T[], key: keyof T) {
  return rows.reduce<Record<string, number>>((counts, row) => {
    const value = String(row[key] ?? "Unknown");
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function riskTone(tone: string) {
  if (tone === "rose") return "border-rose-200 bg-rose-50 text-rose-800";
  if (tone === "amber") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function titleCase(value: string) {
  return value
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
