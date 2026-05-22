"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function escalateTicket(formData: FormData) {
  const ticketId = String(formData.get("ticketId") ?? "");
  const organizationId = String(formData.get("organizationId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!ticketId || !organizationId || !title) {
    throw new Error("Ticket, workspace, and escalation title are required.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("You must be signed in to escalate tickets.");
  }

  const { data: ticket, error: ticketError } = await supabase
    .from("tickets")
    .update({ status: "approval_required" })
    .eq("id", ticketId)
    .eq("organization_id", organizationId)
    .select("id, external_id, title, assigned_agent_id")
    .single();

  if (ticketError) {
    throw ticketError;
  }

  const { data: existingApproval } = await supabase
    .from("approval_requests")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("ticket_id", ticketId)
    .eq("status", "pending")
    .limit(1)
    .maybeSingle();

  if (!existingApproval) {
    await supabase.from("approval_requests").insert({
      organization_id: organizationId,
      ticket_id: ticketId,
      requested_by_agent_id: ticket.assigned_agent_id,
      title,
      description:
        note ||
        `Escalation opened for ${ticket.external_id ?? ticket.title} because the workflow needs human intervention.`,
      status: "pending",
      due_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    });
  }

  await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    actor_user_id: userData.user.id,
    ticket_id: ticketId,
    event_type: "ticket_escalated",
    event_summary: `${ticket.external_id ?? "Ticket"} escalated`,
    metadata: { source: "escalation_workspace", note: note || null, reused_approval: Boolean(existingApproval) },
  });

  if (note) {
    await supabase.from("ticket_comments").insert({
      organization_id: organizationId,
      ticket_id: ticketId,
      author_user_id: userData.user.id,
      body: note,
      metadata: { source: "escalation_workspace", action: "escalated" },
    });
  }

  revalidateEscalationPaths(ticketId);
}

export async function acknowledgeEscalation(formData: FormData) {
  const ticketId = String(formData.get("ticketId") ?? "");
  const organizationId = String(formData.get("organizationId") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (!ticketId || !organizationId) {
    throw new Error("Ticket and workspace are required.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("You must be signed in to acknowledge escalations.");
  }

  const { data: ticket, error } = await supabase
    .from("tickets")
    .update({ status: "executing" })
    .eq("id", ticketId)
    .eq("organization_id", organizationId)
    .select("id, external_id, title")
    .single();

  if (error) {
    throw error;
  }

  await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    actor_user_id: userData.user.id,
    ticket_id: ticketId,
    event_type: "escalation_acknowledged",
    event_summary: `${ticket.external_id ?? "Ticket"} escalation acknowledged`,
    metadata: { source: "escalation_workspace", note: note || null },
  });

  if (note) {
    await supabase.from("ticket_comments").insert({
      organization_id: organizationId,
      ticket_id: ticketId,
      author_user_id: userData.user.id,
      body: note,
      metadata: { source: "escalation_workspace", action: "acknowledged" },
    });
  }

  revalidateEscalationPaths(ticketId);
}

function revalidateEscalationPaths(ticketId: string) {
  revalidatePath("/app");
  revalidatePath("/app/tickets");
  revalidatePath(`/app/tickets/${ticketId}`);
  revalidatePath("/app/approvals");
  revalidatePath("/app/escalations");
  revalidatePath("/app/audit");
  revalidatePath("/app/intelligence");
}
