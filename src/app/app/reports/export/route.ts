import { csatStats, deflectionStats, mttrStats } from "@/lib/analytics";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { reportToCsv, reportToPdf, type Report, type ReportTable } from "@/lib/reports/export";
import { computeSla } from "@/lib/sla";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const statusLabels: Record<string, string> = {
  new: "New",
  triaging: "Investigating",
  approval_required: "Approval",
  executing: "Resolving",
  resolved: "Resolved",
  failed: "Failed",
  blocked: "Blocked",
};

type TicketRow = {
  id: string;
  external_id: string | null;
  title: string;
  status: string;
  priority: string;
  category: string | null;
  requester_name: string | null;
  requester_email: string | null;
  ai_confidence: number | null;
  assigned_agent_id: string | null;
  created_at: string;
  resolved_at: string | null;
  agents?: { name: string | null } | { name: string | null }[] | null;
};

function percent(part: number, total: number) {
  return total ? Math.round((part / total) * 100) : 0;
}

function titleCase(value: string) {
  return value
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString([], { month: "short", day: "numeric", year: "numeric" });
}

function agentName(row: TicketRow): string {
  const rel = Array.isArray(row.agents) ? row.agents[0] : row.agents;
  return rel?.name ?? (row.assigned_agent_id ? "Assigned" : "Unassigned");
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const format = params.get("format") === "pdf" ? "pdf" : "csv";
  const type = params.get("type") === "tickets" ? "tickets" : "summary";
  const statusFilter = params.get("status") ?? "all";
  const rangeDays = Number(params.get("range") ?? "0");

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return new Response("Sign in to export reports.", { status: 401 });
  }

  const organization = await ensureWorkspace(supabase, userData.user);
  const [{ data: tickets }, { data: workflowRuns }, { data: approvals }, { data: integrations }, { data: kbQueries }] =
    await Promise.all([
      supabase
        .from("tickets")
        .select(
          "id, external_id, title, status, priority, category, requester_name, requester_email, ai_confidence, assigned_agent_id, created_at, resolved_at, agents(name)",
        )
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false }),
      supabase.from("workflow_runs").select("id, status, ticket_id").eq("organization_id", organization.id),
      supabase.from("approval_requests").select("id, status").eq("organization_id", organization.id),
      supabase.from("integrations").select("id, status").eq("organization_id", organization.id),
      supabase.from("kb_queries").select("status, csat").eq("organization_id", organization.id),
    ]);

  const allTickets = (tickets ?? []) as TicketRow[];
  const runRows = workflowRuns ?? [];
  const approvalRows = approvals ?? [];
  const integrationRows = integrations ?? [];

  // --- summary metrics (always included for context) ---
  const blockedTickets = allTickets.filter((t) => t.status === "blocked" || t.status === "failed").length;
  const pendingApprovals = approvalRows.filter((a) => a.status === "pending").length;
  const automatedTickets = allTickets.filter(
    (t) => t.assigned_agent_id || runRows.some((r) => r.ticket_id === t.id),
  ).length;
  const completedRuns = runRows.filter((r) => ["succeeded", "failed", "blocked", "cancelled"].includes(r.status));
  const successfulRuns = runRows.filter((r) => r.status === "succeeded").length;
  const connectedIntegrations = integrationRows.filter((i) => i.status === "connected").length;
  const confidences = allTickets.map((t) => Number(t.ai_confidence ?? 0)).filter((n) => Number.isFinite(n));
  const avgConfidence = confidences.length
    ? Math.round(confidences.reduce((sum, n) => sum + n, 0) / confidences.length)
    : 0;

  const deflection = deflectionStats(kbQueries ?? []);
  const csat = csatStats(kbQueries ?? []);
  const mttr = mttrStats(allTickets);

  const summarySection = {
    title: "Summary",
    rows: [
      { label: "Total tickets", value: String(allTickets.length) },
      { label: "Automation coverage", value: `${percent(automatedTickets, allTickets.length)}% (${automatedTickets}/${allTickets.length})` },
      { label: "Workflow success", value: `${percent(successfulRuns, completedRuns.length || runRows.length)}% (${successfulRuns} runs)` },
      { label: "Avg AI confidence", value: `${avgConfidence}%` },
      { label: "Connected apps", value: `${connectedIntegrations}/${integrationRows.length}` },
      { label: "Pending approvals", value: String(pendingApprovals) },
      { label: "Blocked or failed", value: String(blockedTickets) },
      { label: "Deflection rate", value: deflection.total ? `${deflection.rate}% (${deflection.resolved}/${deflection.resolved + deflection.escalated})` : "n/a" },
      { label: "CSAT", value: csat.up + csat.down ? `${csat.score}% (${csat.up} up / ${csat.down} down)` : "n/a" },
      { label: "Mean time to resolve", value: mttr.label },
    ],
  };

  // --- apply filters for the detailed table ---
  const sinceMs = rangeDays > 0 ? Date.now() - rangeDays * 24 * 60 * 60 * 1000 : 0;
  const matchesStatus = (t: TicketRow) => {
    switch (statusFilter) {
      case "open":
        return t.status !== "resolved";
      case "resolved":
        return t.status === "resolved";
      case "blocked":
        return t.status === "blocked" || t.status === "failed";
      case "approval":
        return t.status === "approval_required";
      default:
        return true;
    }
  };
  const filtered = allTickets.filter(
    (t) => matchesStatus(t) && (sinceMs === 0 || new Date(t.created_at).getTime() >= sinceMs),
  );

  const rangeLabel = rangeDays > 0 ? `last ${rangeDays} days` : "all time";
  const statusFilterLabel =
    { open: "open", resolved: "resolved", blocked: "blocked/failed", approval: "needs approval" }[statusFilter] ??
    "all statuses";

  const sections = [summarySection];
  let table: ReportTable | undefined;
  let reportTitle = "TicketOS Operations Report";

  if (type === "tickets") {
    reportTitle = "TicketOS Ticket Report";
    sections.push({
      title: "Filters",
      rows: [
        { label: "Status", value: statusFilterLabel },
        { label: "Time range", value: rangeLabel },
        { label: "Tickets in report", value: String(filtered.length) },
      ],
    });
    table = {
      title: `Tickets (${filtered.length})`,
      columns: [
        { header: "Ticket ID", width: 56 },
        { header: "Title", width: 128 },
        { header: "Status", width: 62 },
        { header: "Priority", width: 48 },
        { header: "Category", width: 62 },
        { header: "Assignee", width: 82 },
        { header: "Requester", width: 80 },
        { header: "Created", width: 56 },
        { header: "SLA", width: 86 },
        { header: "Confidence", width: 52 },
      ],
      rows: filtered.map((t) => [
        t.external_id ?? t.id.slice(0, 8),
        t.title,
        statusLabels[t.status] ?? titleCase(t.status.replaceAll("_", " ")),
        t.priority,
        t.category ?? "—",
        agentName(t),
        t.requester_name ?? t.requester_email ?? "—",
        formatDate(t.created_at),
        computeSla({ priority: t.priority, createdAt: t.created_at, status: t.status, resolvedAt: t.resolved_at }).label,
        `${Math.round(Number(t.ai_confidence ?? 0))}%`,
      ]),
    };
  } else {
    const statusCounts = allTickets.reduce<Record<string, number>>((acc, t) => {
      const key = String(t.status ?? "unknown");
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
    sections.push({
      title: "Ticket mix",
      rows:
        Object.keys(statusCounts).length > 0
          ? Object.entries(statusCounts).map(([status, count]) => ({
              label: statusLabels[status] ?? titleCase(status.replaceAll("_", " ")),
              value: String(count),
            }))
          : [{ label: "No tickets yet", value: "0" }],
    });
  }

  const report: Report = {
    workspace: organization.name,
    title: reportTitle,
    generatedAt: new Date().toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }),
    sections,
    table,
  };

  // Best-effort audit trail; never block the download on it.
  await supabase
    .from("audit_logs")
    .insert({
      organization_id: organization.id,
      actor_user_id: userData.user.id,
      event_type: "report_exported",
      event_summary: `${type === "tickets" ? "Ticket" : "Summary"} report exported (${format.toUpperCase()})`,
      metadata: { source: "reports", format, type, status: statusFilter, range: rangeLabel },
    })
    .then(
      () => undefined,
      () => undefined,
    );

  const datestamp = new Date().toISOString().slice(0, 10);
  const filename = `ticketos-${type}-report-${datestamp}`;

  if (format === "pdf") {
    const pdf = new Uint8Array(reportToPdf(report));
    return new Response(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  }

  return new Response(reportToCsv(report), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
