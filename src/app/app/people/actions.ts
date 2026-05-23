"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const riskLevels = new Set(["low", "medium", "high", "critical"]);

export async function recordPeopleReview(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "");
  const personEmail = String(formData.get("personEmail") ?? "").trim().toLowerCase();
  const personName = String(formData.get("personName") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!organizationId || !personEmail.includes("@")) {
    throw new Error("A valid person is required.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("You must be signed in to review people.");
  }

  const { error } = await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    actor_user_id: userData.user.id,
    event_type: "person_reviewed",
    event_summary: `${personName || personEmail} profile reviewed`,
    metadata: {
      source: "people_workspace",
      person_email: personEmail,
      person_name: personName || null,
      note: note || null,
    },
  });

  if (error) {
    throw error;
  }

  revalidatePeoplePaths();
}

export async function requestAccessReview(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "");
  const personEmail = String(formData.get("personEmail") ?? "").trim().toLowerCase();
  const personName = String(formData.get("personName") ?? "").trim();
  const risk = String(formData.get("risk") ?? "medium");
  const note = String(formData.get("note") ?? "").trim();

  if (!organizationId || !personEmail.includes("@") || !riskLevels.has(risk)) {
    throw new Error("A valid person and risk level are required.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("You must be signed in to request access reviews.");
  }

  const displayName = personName || personEmail;
  const { data: approval, error: approvalError } = await supabase
    .from("approval_requests")
    .insert({
      organization_id: organizationId,
      title: `Access review: ${displayName}`,
      description: note || `Review application and workflow access for ${displayName}.`,
      status: "pending",
      due_at: new Date(Date.now() + dueHoursForRisk(risk) * 60 * 60 * 1000).toISOString(),
    })
    .select("id")
    .single();

  if (approvalError) {
    throw approvalError;
  }

  const { error: auditError } = await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    actor_user_id: userData.user.id,
    event_type: "access_review_requested",
    event_summary: `${displayName} access review requested`,
    metadata: {
      source: "people_workspace",
      approval_id: approval.id,
      person_email: personEmail,
      person_name: personName || null,
      risk,
      note: note || null,
    },
  });

  if (auditError) {
    throw auditError;
  }

  revalidatePeoplePaths();
}

function dueHoursForRisk(risk: string) {
  if (risk === "critical") return 4;
  if (risk === "high") return 12;
  if (risk === "medium") return 24;
  return 72;
}

function revalidatePeoplePaths() {
  revalidatePath("/app");
  revalidatePath("/app/people");
  revalidatePath("/app/approvals");
  revalidatePath("/app/audit");
}
