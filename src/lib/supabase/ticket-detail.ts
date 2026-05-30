import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type TicketDetailData = Awaited<ReturnType<typeof getTicketDetail>>;

export async function getTicketDetail(ticketId: string) {
  const supabase = await createSupabaseServerClient();

  const { data: ticket, error: ticketError } = await supabase
    .from("tickets")
    .select("*, agents(id, name, status, memory_scope)")
    .eq("id", ticketId)
    .maybeSingle();

  if (ticketError) {
    throw ticketError;
  }

  if (!ticket) {
    notFound();
  }

  const [
    { data: workflowRuns },
    { data: approvalRequests },
    { data: policyEvaluations },
    { data: auditLogs },
    { data: comments },
  ] = await Promise.all([
    supabase
      .from("workflow_runs")
      .select("*, workflows(name), workflow_versions(graph)")
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("approval_requests")
      .select("*")
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("policy_evaluations")
      .select("*, policy_rules(name)")
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("audit_logs")
      .select("*, agents(name)")
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("ticket_comments")
      .select("*")
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: false }),
  ]);

  const latestRun = workflowRuns?.[0] ?? null;
  const { data: steps } = latestRun
    ? await supabase
        .from("workflow_run_steps")
        .select("*")
        .eq("workflow_run_id", latestRun.id)
        .order("created_at")
    : { data: [] };

  const runIds = (workflowRuns ?? []).map((run) => run.id);
  const { data: executionActions } = runIds.length
    ? await supabase
        .from("execution_actions")
        .select("*")
        .eq("organization_id", ticket.organization_id)
        .in("workflow_run_id", runIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  return {
    ticket,
    latestRun,
    workflowRuns: workflowRuns ?? [],
    steps: steps ?? [],
    approval: approvalRequests?.[0] ?? null,
    policies: policyEvaluations ?? [],
    auditLogs: auditLogs ?? [],
    comments: comments ?? [],
    executionActions: executionActions ?? [],
  };
}

export function displayTicketStatus(status: string) {
  const labels: Record<string, string> = {
    new: "New",
    triaging: "Investigating",
    approval_required: "Approval",
    executing: "Resolving",
    resolved: "Resolved",
    failed: "Failed",
    blocked: "Blocked",
  };

  return labels[status] ?? titleCase(status.replaceAll("_", " "));
}

export function displayStepStatus(status: string) {
  if (status === "succeeded") return "Complete";
  if (status === "running") return "Running";
  if (status === "blocked") return "Blocked";
  if (status === "failed") return "Failed";
  return "Pending";
}

export function titleCase(value: string) {
  return value
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
