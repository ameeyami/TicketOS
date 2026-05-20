"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function decideApproval(formData: FormData) {
  const approvalId = String(formData.get("approvalId") ?? "");
  const ticketId = String(formData.get("ticketId") ?? "");
  const organizationId = String(formData.get("organizationId") ?? "");
  const decision = String(formData.get("decision") ?? "");

  if (!approvalId || !ticketId || !organizationId || !["approved", "rejected"].includes(decision)) {
    throw new Error("Invalid approval decision.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("You must be signed in to decide approvals.");
  }

  const { error: approvalError } = await supabase
    .from("approval_requests")
    .update({
      status: decision,
      decided_by: userData.user.id,
      decided_at: new Date().toISOString(),
      decision_note:
        decision === "approved"
          ? "Approved from TicketOS execution detail."
          : "Rejected from TicketOS execution detail.",
    })
    .eq("id", approvalId);

  if (approvalError) {
    throw approvalError;
  }

  const { error: ticketError } = await supabase
    .from("tickets")
    .update({
      status: decision === "approved" ? "executing" : "blocked",
    })
    .eq("id", ticketId);

  if (ticketError) {
    throw ticketError;
  }

  const { error: auditError } = await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    actor_user_id: userData.user.id,
    ticket_id: ticketId,
    event_type: decision,
    event_summary: decision === "approved" ? "Approval request approved" : "Approval request rejected",
    metadata: { source: "approval_action" },
  });

  if (auditError) {
    throw auditError;
  }

  revalidatePath(`/app/tickets/${ticketId}`);
  revalidatePath("/app");
}

export async function updateTicketStatus(formData: FormData) {
  const ticketId = String(formData.get("ticketId") ?? "");
  const organizationId = String(formData.get("organizationId") ?? "");
  const status = String(formData.get("status") ?? "");

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
    metadata: { source: "ticket_status_action" },
  });

  revalidatePath(`/app/tickets/${ticketId}`);
  revalidatePath("/app");
}
