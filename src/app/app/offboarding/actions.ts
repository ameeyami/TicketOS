"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isEmailConfigured, sendEmail } from "@/lib/email/send";
import { offboardingNoticeEmail } from "@/lib/email/templates";
import { runGatedAction } from "@/lib/integrations/execute";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const criticalApps = new Set(["Okta", "Google Workspace", "GitHub", "Finance app", "Production access"]);

export async function createOffboardingRun(formData: FormData) {
  const employeeName = String(formData.get("employeeName") ?? "").trim();
  const employeeEmail = String(formData.get("employeeEmail") ?? "").trim();
  const managerEmail = String(formData.get("managerEmail") ?? "").trim();
  const lastDay = String(formData.get("lastDay") ?? "").trim();
  const urgency = String(formData.get("urgency") ?? "standard");
  const reason = String(formData.get("reason") ?? "Voluntary departure");
  const transferOwner = String(formData.get("transferOwner") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const apps = formData.getAll("apps").map(String).filter(Boolean);
  const legalHold = formData.get("legalHold") === "on";
  const notifyEmployee = formData.get("notifyEmployee") === "on";

  if (!employeeName || !employeeEmail || !managerEmail || !lastDay) {
    throw new Error("Employee, manager, and last working day are required.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("You must be signed in to create offboarding runs.");
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
    .eq("name", "Security Agent")
    .maybeSingle();

  const hasCriticalAccess = apps.some((app) => criticalApps.has(app));
  const isEmergency = urgency === "immediate";
  const priority = isEmergency || legalHold ? "critical" : hasCriticalAccess ? "high" : "medium";
  const status = isEmergency || legalHold || hasCriticalAccess ? "approval_required" : "triaging";
  const externalId = `TOS-${1900 + Number(count ?? 0) + 1}`;
  const selectedApps = apps.length ? apps.join(", ") : "All connected workspace apps";
  const description = [
    `Employee: ${employeeName} <${employeeEmail}>`,
    `Manager: ${managerEmail}`,
    `Last working day: ${lastDay}`,
    `Urgency: ${urgency}`,
    `Reason: ${reason}`,
    `Access to revoke: ${selectedApps}`,
    transferOwner ? `Transfer ownership to: ${transferOwner}` : "",
    legalHold ? "Legal hold: preserve data and sessions for review" : "",
    note ? `Note: ${note}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const { data: ticket, error: ticketError } = await supabase
    .from("tickets")
    .insert({
      organization_id: organization.id,
      external_id: externalId,
      title: `Offboard ${employeeName}`,
      description,
      requester_name: managerEmail,
      requester_email: managerEmail,
      source: "offboarding_workspace",
      category: "Security",
      priority,
      status,
      ai_summary: `TicketOS prepared offboarding for ${employeeName}. ${status === "approval_required" ? "Execution is paused for approval because the request touches sensitive access." : "Standard revocation steps are ready for execution."}`,
      ai_confidence: status === "approval_required" ? 84 : 92,
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
    event_type: "offboarding_run_created",
    event_summary: `${employeeName} offboarding run created`,
    metadata: {
      employee_name: employeeName,
      employee_email: employeeEmail,
      manager_email: managerEmail,
      last_day: lastDay,
      urgency,
      reason,
      transfer_owner: transferOwner || null,
      legal_hold: legalHold,
      apps,
      priority,
      status,
    },
  });

  await supabase.from("ticket_comments").insert({
    organization_id: organization.id,
    ticket_id: ticket.id,
    author_user_id: userData.user.id,
    body: `Offboarding run\n${description}`,
    metadata: { source: "offboarding_workspace", apps, legal_hold: legalHold },
  });

  if (status === "approval_required") {
    await supabase.from("approval_requests").insert({
      organization_id: organization.id,
      ticket_id: ticket.id,
      requested_by_agent_id: agent?.id,
      title: `Offboarding approval: ${employeeName}`,
      description: `Approve revocation and data-preservation steps for ${selectedApps}.`,
      status: "pending",
      due_at: isEmergency ? new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() : lastDay,
    });
  }

  if (notifyEmployee && employeeEmail) {
    let emailNote: string;
    if (!isEmailConfigured()) {
      emailNote = `Offboarding email skipped — email delivery is not configured.`;
    } else {
      const template = offboardingNoticeEmail({
        employeeName,
        workspace: organization.name,
        lastDay,
        managerEmail,
        apps: selectedApps,
      });
      const result = await sendEmail({
        to: employeeEmail,
        subject: template.subject,
        html: template.html,
        replyTo: managerEmail || undefined,
      });
      emailNote = result.sent
        ? `Offboarding email sent to ${employeeEmail}.`
        : `Offboarding email could not be sent (${result.error ?? result.reason}).`;
    }

    await supabase.from("audit_logs").insert({
      organization_id: organization.id,
      actor_user_id: userData.user.id,
      actor_agent_id: agent?.id,
      ticket_id: ticket.id,
      event_type: "offboarding_email",
      event_summary: emailNote,
      metadata: { employee_email: employeeEmail },
    });
    await supabase.from("ticket_comments").insert({
      organization_id: organization.id,
      ticket_id: ticket.id,
      author_user_id: userData.user.id,
      body: emailNote,
      metadata: { source: "offboarding_email" },
    });
  }

  // Real provider actions, gated by policy + role (no-ops if not configured;
  // parked for approval if a policy requires it):
  //   1. announce the offboarding in Slack
  //   2. open a Jira de-provisioning task
  const { data: offboardMembership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organization.id)
    .eq("user_id", userData.user.id)
    .maybeSingle();
  const offboardRole = offboardMembership?.role ?? "operator";

  await runGatedAction(supabase, organization.id, userData.user.id, offboardRole, {
    integrationKey: "slack",
    actionKey: "post_message",
    request: {
      text: `:warning: Offboarding ${employeeName} — last day ${lastDay}. Revoking: ${selectedApps}. Reason: ${reason}.`,
    },
    source: "offboarding",
  });

  await runGatedAction(supabase, organization.id, userData.user.id, offboardRole, {
    integrationKey: "jira",
    actionKey: "create_issue",
    request: {
      summary: `Revoke access for ${employeeName}`,
      description: `Offboarding ${employeeName}. Last day ${lastDay}. Revoke: ${selectedApps}. Reason: ${reason}.`,
    },
    source: "offboarding",
  });

  revalidatePath("/app/offboarding");
  revalidatePath("/app/security");
  revalidatePath("/app/tickets");
  revalidatePath("/app/executions");
  redirect(`/app/tickets/${ticket.id}`);
}

export async function logOffboardingStep(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "");
  const ticketId = String(formData.get("ticketId") ?? "");
  const employeeName = String(formData.get("employeeName") ?? "Employee").trim();
  const step = String(formData.get("step") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!organizationId || !ticketId || !step) {
    throw new Error("Choose an offboarding step to log.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("You must be signed in to log offboarding steps.");
  }

  const organization = await ensureWorkspace(supabase, userData.user);
  if (organization.id !== organizationId) {
    throw new Error("You do not have access to this workspace.");
  }

  await supabase.from("audit_logs").insert({
    organization_id: organization.id,
    actor_user_id: userData.user.id,
    ticket_id: ticketId,
    event_type: "offboarding_step_logged",
    event_summary: `${step} logged for ${employeeName}`,
    metadata: { employee_name: employeeName, step, note: note || null },
  });

  if (note) {
    await supabase.from("ticket_comments").insert({
      organization_id: organization.id,
      ticket_id: ticketId,
      author_user_id: userData.user.id,
      body: `${step}: ${note}`,
      metadata: { source: "offboarding_step" },
    });
  }

  revalidatePath("/app/offboarding");
  revalidatePath("/app/audit");
  revalidatePath(`/app/tickets/${ticketId}`);
}
