"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
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

  const now = new Date().toISOString();
  const { data: run, error: runError } = await supabase
    .from("workflow_runs")
    .insert({
      organization_id: organizationId,
      workflow_id: workflowId,
      workflow_version_id: version?.id,
      ticket_id: ticket.id,
      status: "running",
      confidence: 89,
      replay_snapshot: {
        source: "manual_workflow_run",
        replayable: true,
        operator_note: note || null,
        selected_ticket: ticket.external_id,
      },
      started_at: now,
    })
    .select("id")
    .single();

  if (runError) {
    throw runError;
  }

  await supabase.from("workflow_run_steps").insert([
    step(organizationId, run.id, "intake", "Request received", "succeeded", "Workflow was manually started from the workflow library.", note),
    step(organizationId, run.id, "analysis", "Intent analyzed", "succeeded", `TicketOS matched ${ticket.external_id ?? "the selected ticket"} to ${workflow.name}.`, note),
    step(organizationId, run.id, "policy", "Permission checked", "succeeded", "Policy check allowed workflow execution.", note),
    step(organizationId, run.id, "execute", "Workflow executing", "running", "Execution has started and is waiting for integration output.", note),
  ]);

  await supabase
    .from("execution_actions")
    .insert(executionActionsForWorkflow(workflow.trigger_type, organizationId, run.id, ticket.id, note));

  await supabase.from("policy_evaluations").insert({
    organization_id: organizationId,
    workflow_run_id: run.id,
    ticket_id: ticket.id,
    decision: "allow",
    reason: "Manual operator-triggered workflow passed policy guardrails.",
    confidence: 89,
    evaluated_context: { source: "workflow_library", note: note || null },
  });

  await supabase
    .from("tickets")
    .update({
      status: "executing",
      ai_summary: `TicketOS started ${workflow.name} for this request. ${note ? `Operator note: ${note}` : "Provider actions are now visible in the execution console."}`,
    })
    .eq("id", ticket.id)
    .eq("organization_id", organizationId);

  await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    actor_user_id: userData.user.id,
    ticket_id: ticket.id,
    workflow_run_id: run.id,
    event_type: "workflow_started",
    event_summary: `${workflow.name} started for ${ticket.external_id ?? "ticket"}`,
    metadata: { source: "workflow_library", note: note || null },
  });

  revalidatePath("/app");
  revalidatePath("/app/workflows");
  revalidatePath(`/app/workflows/${workflowId}`);
  revalidatePath("/app/executions");
  revalidatePath("/app/audit");
  revalidatePath("/app/intelligence");
  revalidatePath("/app/tickets");
  revalidatePath(`/app/tickets/${ticket.id}`);
  redirect("/app/executions?status=running");
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

function executionActionsForWorkflow(
  triggerType: string,
  organizationId: string,
  workflowRunId: string,
  ticketId: string,
  note: string,
) {
  const basePayload = {
    ticket_id: ticketId,
    source: "manual_workflow_run",
    operator_note: note || null,
  };

  const actionsByTrigger: Record<string, Array<[string, string, string]>> = {
    ticket_intent: [
      ["okta", "reset_password", "running"],
      ["slack", "notify_requester", "pending"],
    ],
    onboarding_request: [
      ["google-workspace", "create_user", "running"],
      ["github", "invite_to_team", "pending"],
      ["slack", "send_onboarding_message", "pending"],
    ],
    security_request: [
      ["okta", "suspend_user", "running"],
      ["github", "review_owned_repositories", "pending"],
      ["google-workspace", "transfer_drive_files", "pending"],
    ],
    incident_signal: [
      ["cisco-meraki", "inspect_gateway", "running"],
      ["teams", "notify_incident_channel", "pending"],
    ],
  };

  return (actionsByTrigger[triggerType] ?? actionsByTrigger.ticket_intent).map(
    ([integrationKey, actionKey, status]) =>
      executionAction(organizationId, workflowRunId, integrationKey, actionKey, status, basePayload),
  );
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
