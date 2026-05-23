import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  BarChart3,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Download,
  FileText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { exportReport } from "@/app/app/reports/actions";
import { PendingButton } from "@/components/ui/pending-button";
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
  const [{ data: tickets }, { data: workflowRuns }, { data: approvals }, { data: auditLogs }, { data: integrations }] =
    await Promise.all([
      supabase
        .from("tickets")
        .select("id, external_id, title, status, priority, category, ai_confidence, assigned_agent_id, created_at, resolved_at")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("workflow_runs")
        .select("id, status, confidence, ticket_id, created_at, completed_at")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("approval_requests")
        .select("id, status, title, created_at, decided_at")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("audit_logs")
        .select("id, event_type, event_summary, created_at, metadata")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false })
        .limit(12),
      supabase.from("integrations").select("id, display_name, status").eq("organization_id", organization.id).order("display_name"),
    ]);

  const ticketRows = tickets ?? [];
  const runRows = workflowRuns ?? [];
  const approvalRows = approvals ?? [];
  const auditRows = auditLogs ?? [];
  const integrationRows = integrations ?? [];

  const resolvedTickets = ticketRows.filter((ticket) => ticket.status === "resolved").length;
  const blockedTickets = ticketRows.filter((ticket) => ticket.status === "blocked" || ticket.status === "failed").length;
  const pendingApprovals = approvalRows.filter((approval) => approval.status === "pending").length;
  const automatedTickets = ticketRows.filter((ticket) => ticket.assigned_agent_id || runRows.some((run) => run.ticket_id === ticket.id)).length;
  const completedRuns = runRows.filter((run) => ["succeeded", "failed", "blocked", "cancelled"].includes(run.status));
  const successfulRuns = runRows.filter((run) => run.status === "succeeded").length;
  const connectedIntegrations = integrationRows.filter((integration) => integration.status === "connected").length;
  const avgConfidence = average(ticketRows.map((ticket) => Number(ticket.ai_confidence ?? 0)));
  const reportDate = new Date().toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  const statusCounts = countBy(ticketRows, "status");
  const categoryCounts = countBy(ticketRows, "category");
  const topCategory = topEntry(categoryCounts);
  const latestExport = auditRows.find((log) => log.event_type === "report_exported");

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
      detail: "Across ticket AI summaries",
      icon: BarChart3,
    },
    {
      title: "Systems ready",
      value: `${connectedIntegrations}/${integrationRows.length}`,
      detail: "Connected integrations",
      icon: ShieldCheck,
    },
  ];

  const risks = [
    {
      label: "Pending approvals",
      value: pendingApprovals,
      tone: pendingApprovals > 0 ? "amber" : "green",
    },
    {
      label: "Blocked or failed",
      value: blockedTickets,
      tone: blockedTickets > 0 ? "rose" : "green",
    },
    {
      label: "Disconnected systems",
      value: integrationRows.length - connectedIntegrations,
      tone: connectedIntegrations < integrationRows.length ? "amber" : "green",
    },
  ];

  return (
    <main className="min-h-screen bg-[#f6f7f2] px-4 py-6 text-[#151914] md:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/app"
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-black/10 bg-white px-3 text-sm font-semibold"
        >
          <ArrowLeft size={16} />
          Command center
        </Link>

        <section className="mt-6 rounded-xl border border-black/10 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#47685d]">Reports</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Operations briefing.</h1>
              <p className="mt-2 text-sm text-black/48">{organization.name} · {reportDate}</p>
            </div>
            <form action={exportReport}>
              <input type="hidden" name="organizationId" value={organization.id} />
              <input type="hidden" name="reportName" value="Operations briefing" />
              <PendingButton
                pendingText="Exporting..."
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#17211c] px-3 text-sm font-semibold text-white"
              >
                <Download size={16} />
                Export
              </PendingButton>
            </form>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {highlights.map((item) => (
              <MetricCard key={item.title} {...item} />
            ))}
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[.92fr_1.08fr]">
          <div className="space-y-6">
            <Panel title="Executive summary" icon={FileText}>
              <div className="space-y-3">
                <SummaryLine label="Queue" value={`${ticketRows.length} tickets tracked, ${resolvedTickets} resolved`} />
                <SummaryLine label="Demand" value={topCategory ? `${topCategory[0]} is the largest category` : "No demand mix yet"} />
                <SummaryLine label="Control" value={`${pendingApprovals} approvals waiting, ${blockedTickets} blocked`} />
                <SummaryLine
                  label="Export"
                  value={latestExport ? `Last exported ${formatDate(latestExport.created_at)}` : "No report exported yet"}
                />
              </div>
            </Panel>

            <Panel title="Risk watch" icon={CircleAlert}>
              <div className="grid gap-3">
                {risks.map((risk) => (
                  <div key={risk.label} className={cn("rounded-lg border p-4", riskTone(risk.tone))}>
                    <p className="text-sm font-semibold">{risk.label}</p>
                    <p className="mt-2 text-2xl font-semibold">{risk.value}</p>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <div className="space-y-6">
            <Panel title="Ticket mix" icon={BadgeCheck}>
              <div className="grid gap-3 md:grid-cols-2">
                {Object.entries(statusCounts).map(([status, count]) => (
                  <div key={status} className="rounded-lg border border-black/10 p-4">
                    <p className="text-sm font-semibold">{statusLabels[status] ?? titleCase(status.replaceAll("_", " "))}</p>
                    <p className="mt-2 text-2xl font-semibold">{count}</p>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Recommended actions" icon={Clock3}>
              <div className="space-y-3">
                {recommendations({ pendingApprovals, blockedTickets, connectedIntegrations, integrationTotal: integrationRows.length }).map((item) => (
                  <div key={item.title} className="rounded-lg border border-black/10 p-4">
                    <p className="font-semibold">{item.title}</p>
                    <p className="mt-1 text-sm text-black/50">{item.detail}</p>
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

function MetricCard({
  title,
  value,
  detail,
  icon: Icon,
}: {
  title: string;
  value: string;
  detail: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-lg border border-black/10 bg-[#fbfcf8] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-black/52">{title}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
          <p className="mt-2 text-sm text-black/45">{detail}</p>
        </div>
        <span className="flex size-10 items-center justify-center rounded-lg bg-[#eef5ea] text-[#2e6658]">
          <Icon size={18} />
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

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-black/10 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/38">{label}</p>
      <p className="mt-2 font-semibold">{value}</p>
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

function topEntry(counts: Record<string, number>) {
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
}

function riskTone(tone: string) {
  if (tone === "rose") return "border-rose-200 bg-rose-50 text-rose-800";
  if (tone === "amber") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function recommendations({
  pendingApprovals,
  blockedTickets,
  connectedIntegrations,
  integrationTotal,
}: {
  pendingApprovals: number;
  blockedTickets: number;
  connectedIntegrations: number;
  integrationTotal: number;
}) {
  const items = [];

  if (pendingApprovals > 0) {
    items.push({ title: "Clear approvals", detail: "Resume paused workflows and reduce operator wait time." });
  }

  if (blockedTickets > 0) {
    items.push({ title: "Review blocked work", detail: "Resolve missing ownership, risky access, or incomplete context." });
  }

  if (connectedIntegrations < integrationTotal) {
    items.push({ title: "Connect systems", detail: "More integrations increase end-to-end automation coverage." });
  }

  return items.length ? items : [{ title: "Expand coverage", detail: "Add workflows for repeated identity and onboarding requests." }];
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

function titleCase(value: string) {
  return value
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
