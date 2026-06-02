"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isEmailConfigured, sendEmail } from "@/lib/email/send";
import { passwordResetEmail } from "@/lib/email/templates";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const sensitiveSystems = new Set(["Okta admin", "Google admin", "GitHub admin", "Finance app"]);

export async function createPasswordResetRun(formData: FormData) {
  const employeeName = String(formData.get("employeeName") ?? "").trim();
  const employeeEmail = String(formData.get("employeeEmail") ?? "").trim();
  const requesterEmail = String(formData.get("requesterEmail") ?? "").trim();
  const system = String(formData.get("system") ?? "Okta");
  const verification = String(formData.get("verification") ?? "Manager confirmed");
  const urgency = String(formData.get("urgency") ?? "standard");
  const note = String(formData.get("note") ?? "").trim();
  const rotateSessions = formData.get("rotateSessions") === "on";
  const suspicious = formData.get("suspicious") === "on";
  const notifyEmployee = formData.get("notifyEmployee") === "on";

  if (!employeeName || !employeeEmail || !requesterEmail) {
    throw new Error("Employee and requester details are required.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("You must be signed in to create password reset runs.");
  }

  const organization = await ensureWorkspace(supabase, userData.user);
  const { count } = await supabase
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organization.id);

  const { data: agent } = await supabase
    .from("agents")
    .select("id")
    .eq("organization_id", organization.id)
    .eq("name", "Access Agent")
    .maybeSingle();

  const requiresApproval = sensitiveSystems.has(system) || suspicious || verification === "Not verified";
  const priority = urgency === "urgent" || suspicious ? "high" : requiresApproval ? "high" : "medium";
  const status = requiresApproval ? "approval_required" : "triaging";
  const externalId = `TOS-${1900 + Number(count ?? 0) + 1}`;
  const description = [
    `Employee: ${employeeName} <${employeeEmail}>`,
    `Requester: ${requesterEmail}`,
    `System: ${system}`,
    `Verification: ${verification}`,
    `Urgency: ${urgency}`,
    rotateSessions ? "Session action: rotate active sessions after reset" : "Session action: password reset only",
    suspicious ? "Security signal: suspicious login or account takeover concern" : "",
    note ? `Note: ${note}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const { data: ticket, error: ticketError } = await supabase
    .from("tickets")
    .insert({
      organization_id: organization.id,
      external_id: externalId,
      title: `Reset ${system} password for ${employeeName}`,
      description,
      requester_name: requesterEmail,
      requester_email: requesterEmail,
      source: "password_reset_workspace",
      category: "Identity",
      priority,
      status,
      ai_summary: `TicketOS prepared a ${system} password reset for ${employeeName}. ${requiresApproval ? "Execution is paused for approval because identity or system risk is elevated." : "Identity checks passed and the reset is ready for execution."}`,
      ai_confidence: requiresApproval ? 82 : 95,
      assigned_agent_id: agent?.id,
    })
    .select("id")
    .single();

  if (ticketError) {
    throw ticketError;
  }

  await supabase.from("audit_logs").insert({
    organization_id: organization.id,
    actor_user_id: userData.user.id,
    actor_agent_id: agent?.id,
    ticket_id: ticket.id,
    event_type: "password_reset_run_created",
    event_summary: `${system} password reset prepared for ${employeeName}`,
    metadata: {
      employee_name: employeeName,
      employee_email: employeeEmail,
      requester_email: requesterEmail,
      system,
      verification,
      urgency,
      rotate_sessions: rotateSessions,
      suspicious,
      requires_approval: requiresApproval,
    },
  });

  await supabase.from("ticket_comments").insert({
    organization_id: organization.id,
    ticket_id: ticket.id,
    author_user_id: userData.user.id,
    body: `Password reset run\n${description}`,
    metadata: { source: "password_reset_workspace", system, verification, requires_approval: requiresApproval },
  });

  if (requiresApproval) {
    await supabase.from("approval_requests").insert({
      organization_id: organization.id,
      ticket_id: ticket.id,
      requested_by_agent_id: agent?.id,
      title: `Password reset approval: ${employeeName}`,
      description: `Review identity and risk signals before TicketOS resets ${system}.`,
      status: "pending",
      due_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    });
  }

  if (notifyEmployee && employeeEmail) {
    let emailNote: string;
    if (!isEmailConfigured()) {
      emailNote = `Reset email skipped — email delivery is not configured.`;
    } else {
      const template = passwordResetEmail({
        employeeName,
        workspace: organization.name,
        system,
        requiresApproval,
      });
      const result = await sendEmail({
        to: employeeEmail,
        subject: template.subject,
        html: template.html,
        replyTo: requesterEmail || undefined,
      });
      emailNote = result.sent
        ? `Reset email sent to ${employeeEmail}.`
        : `Reset email could not be sent (${result.error ?? result.reason}).`;
    }

    await supabase.from("audit_logs").insert({
      organization_id: organization.id,
      actor_user_id: userData.user.id,
      actor_agent_id: agent?.id,
      ticket_id: ticket.id,
      event_type: "password_reset_email",
      event_summary: emailNote,
      metadata: { employee_email: employeeEmail, system },
    });
    await supabase.from("ticket_comments").insert({
      organization_id: organization.id,
      ticket_id: ticket.id,
      author_user_id: userData.user.id,
      body: emailNote,
      metadata: { source: "password_reset_email" },
    });
  }

  revalidatePath("/app/password-resets");
  revalidatePath("/app/tickets");
  revalidatePath("/app/approvals");
  redirect(`/app/tickets/${ticket.id}`);
}

export async function logPasswordResetStep(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "");
  const ticketId = String(formData.get("ticketId") ?? "");
  const employeeName = String(formData.get("employeeName") ?? "Employee").trim();
  const step = String(formData.get("step") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!organizationId || !ticketId || !step) {
    throw new Error("Choose a password reset step to log.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("You must be signed in to log password reset steps.");
  }

  const organization = await ensureWorkspace(supabase, userData.user);
  if (organization.id !== organizationId) {
    throw new Error("You do not have access to this workspace.");
  }

  await supabase.from("audit_logs").insert({
    organization_id: organization.id,
    actor_user_id: userData.user.id,
    ticket_id: ticketId,
    event_type: "password_reset_step_logged",
    event_summary: `${step} logged for ${employeeName}`,
    metadata: { employee_name: employeeName, step, note: note || null },
  });

  if (note) {
    await supabase.from("ticket_comments").insert({
      organization_id: organization.id,
      ticket_id: ticketId,
      author_user_id: userData.user.id,
      body: `${step}: ${note}`,
      metadata: { source: "password_reset_step" },
    });
  }

  revalidatePath("/app/password-resets");
  revalidatePath("/app/audit");
  revalidatePath(`/app/tickets/${ticketId}`);
}
