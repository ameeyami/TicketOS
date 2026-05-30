"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  autonomyLevelMeta,
  normalizeAutonomyLevel,
  planExecution,
} from "@/lib/autonomy";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWorkflowActionPlan } from "@/lib/workflow-action-plan";
import { workflowTemplates, type WorkflowTemplateKey } from "@/lib/workflow-templates";

export async function runWorkflow(formData: FormData) {
  const workflowId = String(formData.get("workflowId") ?? "");
  const organizationId = String(formData.get("organizationId") ?? "");
  const ticketId = String(formData.get("ticketId") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (!workflowId || !organizationId) {
    throw new Error("Workflow and organization are required.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("You must be signed in to run workflows.");
  }

  const { data: workflow, error: workflowError } = await supabase
    .from("workflows")
    .select("id, name, trigger_type")
    .eq("id", workflowId)
    .eq("organization_id", organizationId)
    .single();

  if (workflowError) {
    throw workflowError;
  }

  let ticketQuery = supabase
    .from("tickets")
    .select("id, external_id, title")
    .eq("organization_id", organizationId);

  ticketQuery = ticketId
    ? ticketQuery.eq("id", ticketId)
    : ticketQuery.order("created_at", { ascending: false }).limit(1);

  const { data: ticket } = await ticketQuery.maybeSingle();

  if (!ticket) {
    throw new Error("Create a ticket before running a workflow.");
  }

  const { data: version } = await supabase
    .from("workflow_versions")
    .select("id")
    .eq("workflow_id", workflowId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Earned autonomy: read the workflow's current level and let it decide how
  // much runs without a human (see src/lib/autonomy.ts).
  const { data: autonomyLogs } = await supabase
    .from("audit_logs")
    .select("metadata, created_at")
    .eq("organization_id", organizationId)
    .eq("event_type", "workflow_autonomy_updated")
    .order("created_at", { ascending: false })
    .limit(50);

  const level = normalizeAutonomyLevel(
    autonomyLogs?.find((log) => log.metadata?.workflow_id === workflowId)?.metadata?.level,
  );
  const levelLabel = autonomyLevelMeta[level].label;
  const plan = getWorkflowActionPlan(workflow.trigger_type);
  const decision = planExecution(level, plan);
  const started = decision.runStatus === "running";

  const now = new Date().toISOString();
  const { data: run, error: runError } = await supabase
    .from("workflow_runs")
    .insert({
      organization_id: organizationId,
      workflow_id: workflowId,
      workflow_version_id: version?.id,
      ticket_id: ticket.id,
      status: decision.runStatus,
      confidence: 89,
      replay_snapshot: {
        source: "manual_workflow_run",
        replayable: true,
        operator_note: note || null,
        selected_ticket: ticket.external_id,
        autonomy_level: level,
      },
      started_at: started ? now : null,
    })
    .select("id")
    .single();

  if (runError) {
    throw runError;
  }

  await supabase.from("workflow_run_steps").insert([
    step(organizationId, run.id, "intake", "Request received", "succeeded", "Workflow was manually started from the workflow library.", note),
    step(organizationId, run.id, "analysis", "Intent analyzed", "succeeded", `TicketOS matched ${ticket.external_id ?? "the selected ticket"} to ${workflow.name}.`, note),
    step(organizationId, run.id, "policy", "Permission checked", "succeeded", `Autonomy "${levelLabel}": ${decision.summary}.`, note),
    step(
      organizationId,
      run.id,
      "execute",
      "Workflow executing",
      started ? "running" : "pending",
      started ? "Execution has started and is waiting for integration output." : `Holding — autonomy "${levelLabel}" requires approval first.`,
      note,
    ),
  ]);

  const basePayload = { ticket_id: ticket.id, source: "manual_workflow_run", operator_note: note || null, autonomy_level: level };
  await supabase.from("execution_actions").insert(
    plan.map((action) =>
      executionAction(
        organizationId,
        run.id,
        action.integration_key,
        action.action_key,
        decision.gatedActionKeys.includes(action.action_key) ? "pending" : action.status,
        basePayload,
      ),
    ),
  );

  await supabase.from("policy_evaluations").insert({
    organization_id: organizationId,
    workflow_run_id: run.id,
    ticket_id: ticket.id,
    decision: decision.createApproval ? "approval_required" : "allow",
    reason: `Autonomy "${levelLabel}" — ${decision.summary}.`,
    confidence: 89,
    evaluated_context: { source: "workflow_library", note: note || null, autonomy_level: level },
  });

  if (decision.createApproval) {
    await supabase.from("approval_requests").insert({
      organization_id: organizationId,
      ticket_id: ticket.id,
      workflow_run_id: run.id,
      title: `Approve ${workflow.name}`,
      description: `Autonomy is set to "${levelLabel}". TicketOS ${decision.summary}.`,
      status: "pending",
    });
  }

  await supabase
    .from("tickets")
    .update({
      status: decision.ticketStatus,
      ai_summary: `TicketOS started ${workflow.name} at autonomy "${levelLabel}" and ${decision.summary}.${
        note ? ` Operator note: ${note}` : ""
      }`,
    })
    .eq("id", ticket.id)
    .eq("organization_id", organizationId);

  await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    actor_user_id: userData.user.id,
    ticket_id: ticket.id,
    workflow_run_id: run.id,
    event_type: "workflow_started",
    event_summary: `${workflow.name} started for ${ticket.external_id ?? "ticket"} at autonomy "${levelLabel}"`,
    metadata: { source: "workflow_library", note: note || null, autonomy_level: level, decision: decision.summary },
  });

  revalidatePath("/app");
  revalidatePath("/app/workflows");
  revalidatePath(`/app/workflows/${workflowId}`);
  revalidatePath("/app/executions");
  revalidatePath("/app/approvals");
  revalidatePath("/app/audit");
  revalidatePath("/app/intelligence");
  revalidatePath("/app/tickets");
  revalidatePath(`/app/tickets/${ticket.id}`);
  redirect(decision.createApproval ? "/app/approvals" : "/app/executions?status=running");
}

function executionAction(
  organizationId: string,
  workflowRunId: string,
  integrationKey: string,
  actionKey: string,
  status: string,
  requestPayload: Record<string, unknown>,
) {
  return {
    organization_id: organizationId,
    workflow_run_id: workflowRunId,
    integration_key: integrationKey,
    action_key: actionKey,
    status,
    request_payload: requestPayload,
    response_payload: {},
    idempotency_key: `${workflowRunId}-${integrationKey}-${actionKey}`,
  };
}

export async function createWorkflowFromTemplate(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "");
  const templateKey = String(formData.get("templateKey") ?? "") as WorkflowTemplateKey;
  const customName = String(formData.get("name") ?? "").trim();
  const customDescription = String(formData.get("description") ?? "").trim();
  const isActive = String(formData.get("isActive") ?? "on") === "on";
  const template = workflowTemplates[templateKey];

  if (!organizationId || !template) {
    throw new Error("Choose a workflow template.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("You must be signed in to create workflows.");
  }

  const { data: workflow, error: workflowError } = await supabase
    .from("workflows")
    .insert({
      organization_id: organizationId,
      name: customName || template.name,
      description: customDescription || template.description,
      trigger_type: template.trigger_type,
      is_active: isActive,
    })
    .select("id, name")
    .single();

  if (workflowError) {
    throw workflowError;
  }

  const { error: versionError } = await supabase.from("workflow_versions").insert({
    organization_id: organizationId,
    workflow_id: workflow.id,
    version: 1,
    created_by: userData.user.id,
    graph: {
      ...template.graph,
      template: templateKey,
      created_from: "workflow_template",
    },
  });

  if (versionError) {
    throw versionError;
  }

  await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    actor_user_id: userData.user.id,
    event_type: "workflow_created",
    event_summary: `${workflow.name} workflow created`,
    metadata: { source: "workflow_templates", template: templateKey, active: isActive },
  });

  revalidatePath("/app");
  revalidatePath("/app/workflows");
  revalidatePath("/app/audit");
  revalidatePath("/app/intelligence");
  redirect(`/app/workflows/${workflow.id}`);
}

export async function updateWorkflowStatus(formData: FormData) {
  const workflowId = String(formData.get("workflowId") ?? "");
  const organizationId = String(formData.get("organizationId") ?? "");
  const isActive = String(formData.get("isActive") ?? "") === "true";

  if (!workflowId || !organizationId) {
    throw new Error("Workflow and organization are required.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("You must be signed in to manage workflows.");
  }

  const { data: workflow, error } = await supabase
    .from("workflows")
    .update({ is_active: isActive })
    .eq("id", workflowId)
    .eq("organization_id", organizationId)
    .select("id, name")
    .single();

  if (error) {
    throw error;
  }

  await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    actor_user_id: userData.user.id,
    event_type: isActive ? "workflow_activated" : "workflow_paused",
    event_summary: `${workflow.name} ${isActive ? "activated" : "paused"}`,
    metadata: { source: "workflow_detail" },
  });

  revalidatePath("/app");
  revalidatePath("/app/workflows");
  revalidatePath(`/app/workflows/${workflowId}`);
  revalidatePath("/app/audit");
  revalidatePath("/app/intelligence");
}


function step(
  organizationId: string,
  workflowRunId: string,
  stepKey: string,
  name: string,
  status: string,
  detail: string,
  note?: string,
) {
  return {
    organization_id: organizationId,
    workflow_run_id: workflowRunId,
    step_key: `${stepKey}-${Date.now()}`,
    name,
    status,
    actor_type: "agent",
    started_at: new Date().toISOString(),
    output: { detail, operator_note: note || null },
  };
}
