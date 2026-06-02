import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { reportToCsv, reportToPdf, type Report } from "@/lib/reports/export";
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

function percent(part: number, total: number) {
  return total ? Math.round((part / total) * 100) : 0;
}

function titleCase(value: string) {
  return value
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export async function GET(request: Request) {
  const format = new URL(request.url).searchParams.get("format") === "pdf" ? "pdf" : "csv";

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return new Response("Sign in to export reports.", { status: 401 });
  }

  const organization = await ensureWorkspace(supabase, userData.user);
  const [{ data: tickets }, { data: workflowRuns }, { data: approvals }, { data: integrations }] = await Promise.all([
    supabase
      .from("tickets")
      .select("id, status, category, ai_confidence, assigned_agent_id")
      .eq("organization_id", organization.id),
    supabase.from("workflow_runs").select("id, status, ticket_id").eq("organization_id", organization.id),
    supabase.from("approval_requests").select("id, status").eq("organization_id", organization.id),
    supabase.from("integrations").select("id, status").eq("organization_id", organization.id),
  ]);

  const ticketRows = tickets ?? [];
  const runRows = workflowRuns ?? [];
  const approvalRows = approvals ?? [];
  const integrationRows = integrations ?? [];

  const blockedTickets = ticketRows.filter((t) => t.status === "blocked" || t.status === "failed").length;
  const pendingApprovals = approvalRows.filter((a) => a.status === "pending").length;
  const automatedTickets = ticketRows.filter(
    (t) => t.assigned_agent_id || runRows.some((r) => r.ticket_id === t.id),
  ).length;
  const completedRuns = runRows.filter((r) => ["succeeded", "failed", "blocked", "cancelled"].includes(r.status));
  const successfulRuns = runRows.filter((r) => r.status === "succeeded").length;
  const connectedIntegrations = integrationRows.filter((i) => i.status === "connected").length;
  const confidences = ticketRows.map((t) => Number(t.ai_confidence ?? 0)).filter((n) => Number.isFinite(n));
  const avgConfidence = confidences.length
    ? Math.round(confidences.reduce((sum, n) => sum + n, 0) / confidences.length)
    : 0;

  const statusCounts = ticketRows.reduce<Record<string, number>>((acc, t) => {
    const key = String(t.status ?? "unknown");
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const report: Report = {
    workspace: organization.name,
    generatedAt: new Date().toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }),
    sections: [
      {
        title: "Summary",
        rows: [
          { label: "Automation coverage", value: `${percent(automatedTickets, ticketRows.length)}% (${automatedTickets}/${ticketRows.length})` },
          { label: "Workflow success", value: `${percent(successfulRuns, completedRuns.length || runRows.length)}% (${successfulRuns} runs)` },
          { label: "Avg AI confidence", value: `${avgConfidence}%` },
          { label: "Connected apps", value: `${connectedIntegrations}/${integrationRows.length}` },
        ],
      },
      {
        title: "Ticket mix",
        rows:
          Object.keys(statusCounts).length > 0
            ? Object.entries(statusCounts).map(([status, count]) => ({
                label: statusLabels[status] ?? titleCase(status.replaceAll("_", " ")),
                value: String(count),
              }))
            : [{ label: "No tickets yet", value: "0" }],
      },
      {
        title: "Needs attention",
        rows: [
          { label: "Pending approvals", value: String(pendingApprovals) },
          { label: "Blocked or failed", value: String(blockedTickets) },
        ],
      },
    ],
  };

  // Best-effort audit trail; never block the download on it.
  await supabase
    .from("audit_logs")
    .insert({
      organization_id: organization.id,
      actor_user_id: userData.user.id,
      event_type: "report_exported",
      event_summary: `Operations report exported (${format.toUpperCase()})`,
      metadata: { source: "reports", format },
    })
    .then(
      () => undefined,
      () => undefined,
    );

  const datestamp = new Date().toISOString().slice(0, 10);
  const filename = `ticketos-report-${datestamp}`;

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
