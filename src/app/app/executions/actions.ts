"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const allowedActionStatuses = ["pending", "running", "succeeded", "failed", "blocked", "skipped"];
const terminalActionStatuses = ["succeeded", "failed", "blocked", "skipped"];

export async function updateExecutionActionStatus(formData: FormData) {
  const actionId = String(formData.get("actionId") ?? "");
  const organizationId = String(formData.get("organizationId") ?? "");
  const status = String(formData.get("status") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (!actionId || !organizationId || !allowedActionStatuses.includes(status)) {
    throw new Error("Invalid execution action update.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("You must be signed in to update execution actions.");
  }

  const { data: action, error } = await supabase
    .from("execution_actions")
    .update({
      status,
      error_message: status === "failed" || status === "blocked" ? note || "Operator marked action." : null,
      response_payload:
        status === "succeeded"
          ? { detail: note || "Operator verified action output.", verified_at: new Date().toISOString() }
          : {},
    })
    .eq("id", actionId)
    .eq("organization_id", organizationId)
    .select("id, workflow_run_id, integration_key, action_key")
    .single();

  if (error) {
    throw error;
  }

  const nextRunStatus = await rollUpWorkflowRun({
    organizationId,
    workflowRunId: action.workflow_run_id,
  });

  await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    actor_user_id: userData.user.id,
    workflow_run_id: action.workflow_run_id,
    event_type: `execution_action_${status}`,
    event_summary: `${action.integration_key}.${action.action_key} marked ${status}`,
    metadata: { source: "execution_console", note: note || null, workflow_status: nextRunStatus },
  });

  revalidatePath("/app");
  revalidatePath("/app/executions");
  revalidatePath("/app/audit");
  revalidatePath("/app/intelligence");
}

async function rollUpWorkflowRun({
  organizationId,
  workflowRunId,
}: {
  organizationId: string;
  workflowRunId: string | null;
}) {
  if (!workflowRunId) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data: actions, error } = await supabase
    .from("execution_actions")
    .select("status")
    .eq("organization_id", organizationId)
    .eq("workflow_run_id", workflowRunId);

  if (error) {
    throw error;
  }

  const actionStatuses = (actions ?? []).map((action) => action.status);
  const nextRunStatus = getWorkflowRunStatus(actionStatuses);
  const completedAt = ["succeeded", "failed", "blocked"].includes(nextRunStatus) ? new Date().toISOString() : null;

  const { error: runError } = await supabase
    .from("workflow_runs")
    .update({
      status: nextRunStatus,
      completed_at: completedAt,
    })
    .eq("id", workflowRunId)
    .eq("organization_id", organizationId);

  if (runError) {
    throw runError;
  }

  if (completedAt) {
    const { error: stepError } = await supabase
      .from("workflow_run_steps")
      .update({
        status: nextRunStatus === "succeeded" ? "succeeded" : nextRunStatus,
        completed_at: completedAt,
        output: {
          detail:
            nextRunStatus === "succeeded"
              ? "All provider actions completed successfully."
              : "Workflow stopped because at least one provider action needs operator attention.",
          action_statuses: actionStatuses,
        },
      })
      .eq("organization_id", organizationId)
      .eq("workflow_run_id", workflowRunId)
      .in("status", ["pending", "running"]);

    if (stepError) {
      throw stepError;
    }
  }

  const { data: run, error: runLookupError } = await supabase
    .from("workflow_runs")
    .select("ticket_id")
    .eq("id", workflowRunId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (runLookupError) {
    throw runLookupError;
  }

  if (run?.ticket_id && completedAt) {
    const { error: ticketError } = await supabase
      .from("tickets")
      .update({
        status: nextRunStatus === "succeeded" ? "resolved" : "blocked",
        resolved_at: nextRunStatus === "succeeded" ? completedAt : null,
        ai_summary:
          nextRunStatus === "succeeded"
            ? "TicketOS completed every provider action for this workflow."
            : "TicketOS paused this request because a workflow action failed or was blocked.",
      })
      .eq("id", run.ticket_id)
      .eq("organization_id", organizationId);

    if (ticketError) {
      throw ticketError;
    }

    revalidatePath(`/app/tickets/${run.ticket_id}`);
  }

  return nextRunStatus;
}

function getWorkflowRunStatus(actionStatuses: string[]) {
  if (actionStatuses.includes("failed")) {
    return "failed";
  }

  if (actionStatuses.includes("blocked")) {
    return "blocked";
  }

  if (actionStatuses.length > 0 && actionStatuses.every((status) => terminalActionStatuses.includes(status))) {
    return "succeeded";
  }

  if (actionStatuses.includes("running") || actionStatuses.includes("pending")) {
    return "running";
  }

  return "queued";
}
