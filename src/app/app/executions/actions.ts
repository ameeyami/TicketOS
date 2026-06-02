"use server";

import { revalidatePath } from "next/cache";
import { getInverseAction } from "@/lib/integration-action-catalog";
import { isSlackConfigured, slackDeleteMessage, slackPostMessage } from "@/lib/integrations/slack";
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

export async function reverseExecutionAction(formData: FormData) {
  const actionId = String(formData.get("actionId") ?? "");
  const organizationId = String(formData.get("organizationId") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (!actionId || !organizationId) {
    throw new Error("Invalid rollback request.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("You must be signed in to roll back execution actions.");
  }

  const { data: action, error: readError } = await supabase
    .from("execution_actions")
    .select(
      "id, organization_id, workflow_run_id, workflow_run_step_id, integration_key, action_key, status, request_payload, response_payload, reversed_at, reverses_action_id",
    )
    .eq("id", actionId)
    .eq("organization_id", organizationId)
    .single();

  if (readError) {
    throw readError;
  }

  if (action.status !== "succeeded") {
    throw new Error("Only successfully executed actions can be rolled back.");
  }

  const existingResponse = (action.response_payload ?? {}) as Record<string, unknown>;
  if (action.reversed_at || existingResponse.reversed_at) {
    throw new Error("This action has already been rolled back.");
  }

  if (action.reverses_action_id || action.request_payload?.reverses_action_id) {
    throw new Error("A rollback action cannot itself be rolled back.");
  }

  const inverse = getInverseAction(action.integration_key, action.action_key);
  if (!inverse) {
    throw new Error("This action is not reversible.");
  }

  // Real provider rollback: actually delete the Slack message we posted.
  if (action.integration_key === "slack" && action.action_key === "post_message") {
    const payload = (action.response_payload ?? {}) as { channel?: string; ts?: string };
    if (payload.channel && payload.ts) {
      const deleted = await slackDeleteMessage(payload.channel, payload.ts);
      if (!deleted.ok) {
        throw new Error(`Couldn't delete the Slack message (${deleted.error}).`);
      }
    }
  }

  const reversedAt = new Date().toISOString();
  const reversalNote =
    note || `Rolled back ${action.integration_key}.${action.action_key} from the execution console.`;

  // The rollback is recorded as a real, first-class execution action so it shows
  // up in the console and audit trail exactly like the action it reverses.
  const { data: reversal, error: reversalError } = await supabase
    .from("execution_actions")
    .insert({
      organization_id: organizationId,
      workflow_run_id: action.workflow_run_id,
      workflow_run_step_id: action.workflow_run_step_id,
      integration_key: action.integration_key,
      action_key: inverse.action_key,
      status: "succeeded",
      reverses_action_id: action.id,
      request_payload: {
        reverses_action_id: action.id,
        original_action_key: action.action_key,
        inputs: action.request_payload ?? {},
        note: note || null,
      },
      response_payload: { detail: inverse.description, reversed_at: reversedAt },
      idempotency_key: `reverse-${action.id}`,
    })
    .select("id")
    .single();

  if (reversalError) {
    throw reversalError;
  }

  // Keep the original action's status as succeeded — it did run; the reversal is a
  // separate event. We only stamp the reversal lineage onto its response payload.
  const { error: updateError } = await supabase
    .from("execution_actions")
    .update({
      reversed_at: reversedAt,
      reversed_by: userData.user.id,
      reversal_action_id: reversal.id,
      response_payload: {
        ...existingResponse,
        reversed_at: reversedAt,
        reversed_by: userData.user.id,
        reversal_action_id: reversal.id,
        reversal_note: reversalNote,
      },
    })
    .eq("id", action.id)
    .eq("organization_id", organizationId);

  if (updateError) {
    throw updateError;
  }

  let ticketId: string | null = null;
  if (action.workflow_run_id) {
    const { data: run } = await supabase
      .from("workflow_runs")
      .select("ticket_id")
      .eq("id", action.workflow_run_id)
      .eq("organization_id", organizationId)
      .maybeSingle();
    ticketId = run?.ticket_id ?? null;
  }

  await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    actor_user_id: userData.user.id,
    ticket_id: ticketId,
    workflow_run_id: action.workflow_run_id,
    event_type: "execution_action_reversed",
    event_summary: `${action.integration_key}.${action.action_key} rolled back via ${inverse.action_key}`,
    metadata: {
      source: "execution_console",
      note: note || null,
      reversed_action_id: action.id,
      reversal_action_id: reversal.id,
    },
  });

  if (note && ticketId) {
    await supabase.from("ticket_comments").insert({
      organization_id: organizationId,
      ticket_id: ticketId,
      author_user_id: userData.user.id,
      body: note,
      metadata: { source: "execution_rollback", reversed_action_id: action.id },
    });
  }

  revalidatePath("/app");
  revalidatePath("/app/executions");
  revalidatePath("/app/audit");
  revalidatePath("/app/intelligence");
  if (ticketId) {
    revalidatePath(`/app/tickets/${ticketId}`);
  }
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

type PolicyRule = { name: string; decision: string; action_pattern: string | null };

function evaluateSlackPolicy(rules: PolicyRule[]): { decision: "allow" | "approval_required" | "block"; name: string | null } {
  const matches = rules.filter((rule) => {
    const pattern = (rule.action_pattern ?? "").toLowerCase();
    return pattern === "slack" || pattern === "slack.*" || pattern.startsWith("slack.");
  });
  const blocking = matches.find((m) => m.decision === "block");
  if (blocking) return { decision: "block", name: blocking.name };
  const approval = matches.find((m) => m.decision === "approval_required");
  if (approval) return { decision: "approval_required", name: approval.name };
  return { decision: "allow", name: null };
}

async function recordSlackAction(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  organizationId: string,
  userId: string,
  opts: { status: string; request: Record<string, unknown>; response?: Record<string, unknown>; error?: string | null },
) {
  await supabase.from("execution_actions").insert({
    organization_id: organizationId,
    integration_key: "slack",
    action_key: "post_message",
    status: opts.status,
    request_payload: opts.request,
    response_payload: opts.response ?? {},
    error_message: opts.error ?? null,
  });
  await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    actor_user_id: userId,
    event_type: `execution_action_${opts.status}`,
    event_summary: `slack.post_message ${opts.status}`,
    metadata: { source: "execution_console", real: true },
  });
}

function revalidateExecutionViews() {
  revalidatePath("/app/executions");
  revalidatePath("/app/audit");
  revalidatePath("/app");
}

/**
 * Runs a REAL Slack post, gated by policy + role:
 *  - policy "block"             -> records a blocked action, never calls Slack
 *  - policy "approval_required" -> non-managers get an approval request; managers proceed
 *  - otherwise                  -> posts to Slack for real (reversible via rollback)
 */
export async function runSlackAction(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "");
  const message = String(formData.get("message") ?? "").trim();

  if (!organizationId || !message) {
    throw new Error("Enter a message to post to Slack.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new Error("You must be signed in to run actions.");
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", userData.user.id)
    .maybeSingle();
  const role = membership?.role ?? "operator";
  if (role === "viewer") {
    throw new Error("Viewers can't run provider actions.");
  }

  if (!isSlackConfigured()) {
    throw new Error("Slack isn't connected. Add SLACK_BOT_TOKEN and SLACK_DEFAULT_CHANNEL in your environment.");
  }

  const { data: rules } = await supabase
    .from("policy_rules")
    .select("name, decision, action_pattern, is_active")
    .eq("organization_id", organizationId)
    .eq("is_active", true);
  const policy = evaluateSlackPolicy((rules ?? []) as PolicyRule[]);
  const isManager = role === "owner" || role === "admin";

  if (policy.decision === "block") {
    await recordSlackAction(supabase, organizationId, userData.user.id, {
      status: "blocked",
      request: { text: message, decision: policy.decision, policy: policy.name },
      error: `Blocked by policy "${policy.name}".`,
    });
    revalidateExecutionViews();
    return;
  }

  if (policy.decision === "approval_required" && !isManager) {
    const { data: approvalRow } = await supabase
      .from("approval_requests")
      .insert({
        organization_id: organizationId,
        title: "Slack message requires approval",
        description: `Approve before TicketOS posts to Slack: "${message.slice(0, 140)}"`,
        status: "pending",
      })
      .select("id")
      .single();

    // Park a PENDING execution action linked to the approval; decideApproval
    // posts it to Slack for real once a manager approves.
    await supabase.from("execution_actions").insert({
      organization_id: organizationId,
      integration_key: "slack",
      action_key: "post_message",
      status: "pending",
      request_payload: {
        text: message,
        approval_id: approvalRow?.id ?? null,
        decision: policy.decision,
        policy: policy.name,
        note: "Awaiting manager approval.",
      },
      response_payload: {},
    });
    await supabase.from("audit_logs").insert({
      organization_id: organizationId,
      actor_user_id: userData.user.id,
      event_type: "execution_action_pending",
      event_summary: "slack.post_message queued for approval",
      metadata: { source: "execution_console", approval_id: approvalRow?.id ?? null },
    });
    revalidateExecutionViews();
    return;
  }

  const result = await slackPostMessage(message);
  await recordSlackAction(supabase, organizationId, userData.user.id, {
    status: result.ok ? "succeeded" : "failed",
    request: { text: message, decision: policy.decision, policy: policy.name },
    response: result.ok ? { detail: "Posted message to Slack.", channel: result.channel, ts: result.ts } : {},
    error: result.ok ? null : `Slack error: ${result.error}`,
  });
  revalidateExecutionViews();
}
