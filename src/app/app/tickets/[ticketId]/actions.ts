"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function decideApproval(formData: FormData) {
  const approvalId = String(formData.get("approvalId") ?? "");
  const ticketId = String(formData.get("ticketId") ?? "");
  const decision = String(formData.get("decision") ?? "");

  if (!approvalId || !ticketId || !["approved", "rejected"].includes(decision)) {
    throw new Error("Invalid approval decision.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("You must be signed in to decide approvals.");
  }

  const { error } = await supabase
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

  if (error) {
    throw error;
  }

  await supabase.from("audit_logs").insert({
    organization_id: String(formData.get("organizationId") ?? ""),
    actor_user_id: userData.user.id,
    ticket_id: ticketId,
    event_type: decision,
    event_summary: decision === "approved" ? "Approval request approved" : "Approval request rejected",
    metadata: { source: "ticket_detail" },
  });

  revalidatePath(`/app/tickets/${ticketId}`);
  revalidatePath("/app");
}
