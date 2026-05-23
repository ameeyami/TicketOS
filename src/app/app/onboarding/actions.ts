"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const sensitiveApps = new Set(["GitHub", "Okta", "Finance app", "Production access"]);

export async function createOnboardingPlan(formData: FormData) {
  const employeeName = String(formData.get("employeeName") ?? "").trim();
  const employeeEmail = String(formData.get("employeeEmail") ?? "").trim();
  const managerEmail = String(formData.get("managerEmail") ?? "").trim();
  const department = String(formData.get("department") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "").trim();
  const employmentType = String(formData.get("employmentType") ?? "Employee");
  const deviceType = String(formData.get("deviceType") ?? "MacBook");
  const note = String(formData.get("note") ?? "").trim();
  const apps = formData.getAll("apps").map(String).filter(Boolean);

  if (!employeeName || !employeeEmail || !managerEmail || !startDate) {
    throw new Error("Employee, manager, and start date are required.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("You must be signed in to create onboarding plans.");
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
    .eq("name", "Onboarding Agent")
    .maybeSingle();

  const requiresApproval = apps.some((app) => sensitiveApps.has(app)) || employmentType === "Contractor";
  const externalId = `TOS-${1900 + Number(count ?? 0) + 1}`;
  const selectedApps = apps.length ? apps.join(", ") : "Standard workspace apps";
  const description = [
    `Employee: ${employeeName} <${employeeEmail}>`,
    `Manager: ${managerEmail}`,
    `Department: ${department || "Not specified"}`,
    `Start date: ${startDate}`,
    `Employment type: ${employmentType}`,
    `Device: ${deviceType}`,
    `Apps: ${selectedApps}`,
    note ? `Note: ${note}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const { data: ticket, error: ticketError } = await supabase
    .from("tickets")
    .insert({
      organization_id: organization.id,
      external_id: externalId,
      title: `Onboard ${employeeName}`,
      description,
      requester_name: managerEmail,
      requester_email: managerEmail,
      source: "onboarding_workspace",
      category: "Onboarding",
      priority: requiresApproval ? "high" : "medium",
      status: requiresApproval ? "approval_required" : "triaging",
      ai_summary: `TicketOS prepared onboarding for ${employeeName}. ${requiresApproval ? "Sensitive access requires approval before execution." : "Standard access can be queued for execution."}`,
      ai_confidence: requiresApproval ? 86 : 93,
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
    event_type: "onboarding_plan_created",
    event_summary: `${employeeName} onboarding plan created`,
    metadata: {
      employee_name: employeeName,
      employee_email: employeeEmail,
      manager_email: managerEmail,
      department: department || null,
      start_date: startDate,
      employment_type: employmentType,
      device_type: deviceType,
      apps,
      requires_approval: requiresApproval,
    },
  });

  await supabase.from("ticket_comments").insert({
    organization_id: organization.id,
    ticket_id: ticket.id,
    author_user_id: userData.user.id,
    body: `Onboarding plan\n${description}`,
    metadata: { source: "onboarding_workspace", apps, requires_approval: requiresApproval },
  });

  if (requiresApproval) {
    await supabase.from("approval_requests").insert({
      organization_id: organization.id,
      ticket_id: ticket.id,
      requested_by_agent_id: agent?.id,
      title: `Sensitive onboarding access: ${employeeName}`,
      description: `Review requested access before TicketOS provisions ${selectedApps}.`,
      status: "pending",
      due_at: startDate,
    });
  }

  revalidatePath("/app/onboarding");
  revalidatePath("/app/tickets");
  redirect(`/app/tickets/${ticket.id}`);
}

export async function logOnboardingStep(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "");
  const ticketId = String(formData.get("ticketId") ?? "");
  const employeeName = String(formData.get("employeeName") ?? "Employee").trim();
  const step = String(formData.get("step") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!organizationId || !ticketId || !step) {
    throw new Error("Choose an onboarding step to log.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("You must be signed in to log onboarding steps.");
  }

  const organization = await ensureWorkspace(supabase, userData.user);
  if (organization.id !== organizationId) {
    throw new Error("You do not have access to this workspace.");
  }

  await supabase.from("audit_logs").insert({
    organization_id: organization.id,
    actor_user_id: userData.user.id,
    ticket_id: ticketId,
    event_type: "onboarding_step_logged",
    event_summary: `${step} logged for ${employeeName}`,
    metadata: { employee_name: employeeName, step, note: note || null },
  });

  if (note) {
    await supabase.from("ticket_comments").insert({
      organization_id: organization.id,
      ticket_id: ticketId,
      author_user_id: userData.user.id,
      body: `${step}: ${note}`,
      metadata: { source: "onboarding_step" },
    });
  }

  revalidatePath("/app/onboarding");
  revalidatePath(`/app/tickets/${ticketId}`);
}
