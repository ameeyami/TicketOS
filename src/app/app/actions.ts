"use server";

import { revalidatePath } from "next/cache";
import { cancelPendingApproval, fulfillPendingApproval } from "@/lib/integrations/execute";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function decideApproval(formData: FormData) {
  const approvalId = String(formData.get("approvalId") ?? "");
  const ticketId = String(formData.get("ticketId") ?? "");
  const workflowRunId = String(formData.get("workflowRunId") ?? "");
  const organizationId = String(formData.get("organizationId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (!approvalId || !organizationId || !["approved", "rejected"].includes(decision)) {
    throw new Error("Invalid approval decision.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("You must be signed in to decide approvals.");
  }

  // Only workspace owners/admins (managers) may approve or reject.
  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    throw new Error("Only workspace owners and admins can approve or reject requests.");
  }

  const safeTicketId = ticketId || null;
  const safeWorkflowRunId = workflowRunId || null;
  const decidedAt = new Date().toISOString();
  const decisionNote =
    note ||
    (decision === "approved"
      ? "Approved from TicketOS approvals workspace."
      : "Rejected from TicketOS approvals workspace.");

  const { data: updatedApproval, error: approvalError } = await supabase
    .from("approval_requests")
    .update({
      status: decision,
      decided_by: userData.user.id,
      decided_at: decidedAt,
      decision_note: decisionNote,
    })
    .eq("id", approvalId)
    .eq("organization_id", organizationId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (approvalError) {
    throw approvalError;
  }

  if (!updatedApproval) {
    throw new Error("This approval has already been decided.");
  }

  const { error: ticketError } = safeTicketId
    ? await supabase
        .from("tickets")
        .update({
          status: decision === "approved" ? "executing" : "blocked",
        })
        .eq("id", safeTicketId)
        .eq("organization_id", organizationId)
    : { error: null };

  if (ticketError) {
    throw ticketError;
  }

  if (safeWorkflowRunId) {
    const runStatus = decision === "approved" ? "running" : "blocked";

    const { error: runError } = await supabase
      .from("workflow_runs")
      .update({
        status: runStatus,
        completed_at: decision === "rejected" ? decidedAt : null,
      })
      .eq("id", safeWorkflowRunId)
      .eq("organization_id", organizationId);

    if (runError) {
      throw runError;
    }

    const { error: stepError } = await supabase
      .from("workflow_run_steps")
      .upsert(
        {
          organization_id: organizationId,
          workflow_run_id: safeWorkflowRunId,
          step_key: `approval-${approvalId}`,
          name: decision === "approved" ? "Approval granted" : "Approval rejected",
          status: decision === "approved" ? "succeeded" : "blocked",
          actor_type: "human",
          started_at: decidedAt,
          completed_at: decidedAt,
          output: { detail: decisionNote, decision, approval_id: approvalId },
        },
        { onConflict: "workflow_run_id,step_key" },
      );

    if (stepError) {
      throw stepError;
    }

    if (decision === "rejected") {
      const { error: actionError } = await supabase
        .from("execution_actions")
        .update({
          status: "blocked",
          error_message: decisionNote,
        })
        .eq("organization_id", organizationId)
        .eq("workflow_run_id", safeWorkflowRunId)
        .in("status", ["pending", "running"]);

      if (actionError) {
        throw actionError;
      }
    }
  }

  // Async execution: approving fires any real provider action that was parked
  // for this approval (e.g. a Slack post); rejecting cancels it.
  if (decision === "approved") {
    await fulfillPendingApproval(supabase, organizationId, userData.user.id, approvalId);
  } else {
    await cancelPendingApproval(supabase, organizationId, approvalId);
  }

  const { error: auditError } = await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    actor_user_id: userData.user.id,
    ticket_id: safeTicketId,
    workflow_run_id: safeWorkflowRunId,
    event_type: decision === "approved" ? "approval_approved" : "approval_rejected",
    event_summary: decision === "approved" ? "Approval request approved" : "Approval request rejected",
    metadata: { source: "approval_action", note: note || null, approval_id: approvalId },
  });

  if (auditError) {
    throw auditError;
  }

  revalidatePath("/app/executions");

  if (note && safeTicketId) {
    await supabase.from("ticket_comments").insert({
      organization_id: organizationId,
      ticket_id: safeTicketId,
      author_user_id: userData.user.id,
      body: note,
      metadata: { source: "approval_action", decision },
    });
  }

  if (safeTicketId) {
    revalidatePath(`/app/tickets/${safeTicketId}`);
  }
  if (safeWorkflowRunId) {
    revalidatePath("/app/executions");
    revalidatePath("/app/workflows");
  }
  revalidatePath("/app");
  revalidatePath("/app/approvals");
  revalidatePath("/app/audit");
  revalidatePath("/app/intelligence");
}

export async function updateTicketStatus(formData: FormData) {
  const ticketId = String(formData.get("ticketId") ?? "");
  const organizationId = String(formData.get("organizationId") ?? "");
  const status = String(formData.get("status") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (!ticketId || !organizationId || !["executing", "resolved", "blocked"].includes(status)) {
    throw new Error("Invalid ticket status update.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("You must be signed in to update tickets.");
  }

  const { error } = await supabase
    .from("tickets")
    .update({
      status,
      resolved_at: status === "resolved" ? new Date().toISOString() : null,
    })
    .eq("id", ticketId);

  if (error) {
    throw error;
  }

  await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    actor_user_id: userData.user.id,
    ticket_id: ticketId,
    event_type: `ticket_${status}`,
    event_summary:
      status === "resolved"
        ? "Ticket marked resolved"
        : status === "blocked"
          ? "Ticket marked blocked"
          : "Ticket reopened for execution",
    metadata: { source: "ticket_status_action", note: note || null },
  });

  if (note) {
    await supabase.from("ticket_comments").insert({
      organization_id: organizationId,
      ticket_id: ticketId,
      author_user_id: userData.user.id,
      body: note,
      metadata: { source: "ticket_status_action", status },
    });
  }

  revalidatePath(`/app/tickets/${ticketId}`);
  revalidatePath("/app");
  revalidatePath("/app/tickets");
}
