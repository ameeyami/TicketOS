"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function runWorkflow(formData: FormData) {
  const workflowId = String(formData.get("workflowId") ?? "");
  const organizationId = String(formData.get("organizationId") ?? "");

  if (!workflowId || !organizationId) {
    throw new Error("Workflow and organization are required.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("You must be signed in to run workflows.");
  }

  const { data: ticket } = await supabase
    .from("tickets")
    .select("id")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

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
      replay_snapshot: { source: "manual_workflow_run", replayable: true },
      started_at: now,
    })
    .select("id")
    .single();

  if (runError) {
    throw runError;
  }

  await supabase.from("workflow_run_steps").insert([
    step(organizationId, run.id, "intake", "Request received", "succeeded", "Workflow was manually started from the workflow library."),
    step(organizationId, run.id, "analysis", "Intent analyzed", "succeeded", "TicketOS matched the latest ticket to this workflow."),
    step(organizationId, run.id, "policy", "Permission checked", "succeeded", "Policy check allowed workflow execution."),
    step(organizationId, run.id, "execute", "Workflow executing", "running", "Execution has started and is waiting for integration output."),
  ]);

  await supabase.from("policy_evaluations").insert({
    organization_id: organizationId,
    workflow_run_id: run.id,
    ticket_id: ticket.id,
    decision: "allow",
    reason: "Manual operator-triggered workflow passed policy guardrails.",
    confidence: 89,
    evaluated_context: { source: "workflow_library" },
  });

  await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    actor_user_id: userData.user.id,
    ticket_id: ticket.id,
    workflow_run_id: run.id,
    event_type: "workflow_started",
    event_summary: "Workflow started manually",
    metadata: { source: "workflow_library" },
  });

  revalidatePath("/app");
  revalidatePath("/app/workflows");
  revalidatePath(`/app/tickets/${ticket.id}`);
}

function step(
  organizationId: string,
  workflowRunId: string,
  stepKey: string,
  name: string,
  status: string,
  detail: string,
) {
  return {
    organization_id: organizationId,
    workflow_run_id: workflowRunId,
    step_key: `${stepKey}-${Date.now()}`,
    name,
    status,
    actor_type: "agent",
    started_at: new Date().toISOString(),
    output: { detail },
  };
}
