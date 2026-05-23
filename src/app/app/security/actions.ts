"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const severities = new Set(["medium", "high", "critical"]);

export async function acknowledgeSecurityRisk(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "");
  const ticketId = String(formData.get("ticketId") ?? "");
  const title = String(formData.get("title") ?? "Security signal").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!organizationId || !ticketId) {
    throw new Error("A ticket is required to acknowledge risk.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("You must be signed in to acknowledge security risk.");
  }

  const { error } = await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    actor_user_id: userData.user.id,
    ticket_id: ticketId,
    event_type: "security_risk_acknowledged",
    event_summary: `${title} acknowledged`,
    metadata: {
      source: "security_center",
      note: note || null,
    },
  });

  if (error) {
    throw error;
  }

  if (note) {
    await supabase.from("ticket_comments").insert({
      organization_id: organizationId,
      ticket_id: ticketId,
      author_user_id: userData.user.id,
      body: note,
      metadata: { source: "security_center", action: "acknowledged" },
    });
  }

  revalidateSecurityPaths(ticketId);
}

export async function requestSecurityReview(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "");
  const ticketId = String(formData.get("ticketId") ?? "");
  const title = String(formData.get("title") ?? "Security review").trim();
  const severity = String(formData.get("severity") ?? "high");
  const note = String(formData.get("note") ?? "").trim();

  if (!organizationId || !ticketId || !severities.has(severity)) {
    throw new Error("Ticket and severity are required.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("You must be signed in to request security review.");
  }

  const { data: approval, error: approvalError } = await supabase
    .from("approval_requests")
    .insert({
      organization_id: organizationId,
      ticket_id: ticketId,
      title: `Security review: ${title}`,
      description: note || "Review the security risk before the AI agent continues execution.",
      status: "pending",
      due_at: new Date(Date.now() + dueHoursForSeverity(severity) * 60 * 60 * 1000).toISOString(),
    })
    .select("id")
    .single();

  if (approvalError) {
    throw approvalError;
  }

  const { error: auditError } = await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    actor_user_id: userData.user.id,
    ticket_id: ticketId,
    event_type: "security_review_requested",
    event_summary: `${title} sent to security review`,
    metadata: {
      source: "security_center",
      approval_id: approval.id,
      severity,
      note: note || null,
    },
  });

  if (auditError) {
    throw auditError;
  }

  if (note) {
    await supabase.from("ticket_comments").insert({
      organization_id: organizationId,
      ticket_id: ticketId,
      author_user_id: userData.user.id,
      body: note,
      metadata: { source: "security_center", action: "review_requested", severity },
    });
  }

  revalidateSecurityPaths(ticketId);
}

function dueHoursForSeverity(severity: string) {
  if (severity === "critical") return 2;
  if (severity === "high") return 8;
  return 24;
}

function revalidateSecurityPaths(ticketId: string) {
  revalidatePath("/app");
  revalidatePath("/app/security");
  revalidatePath("/app/approvals");
  revalidatePath("/app/audit");
  revalidatePath("/app/tickets");
  revalidatePath(`/app/tickets/${ticketId}`);
}
