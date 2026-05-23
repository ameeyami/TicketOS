"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const reviewTypes = new Set(["owner_review", "access_review", "risk_review"]);

export async function requestAppReview(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "");
  const integrationId = String(formData.get("integrationId") ?? "");
  const appName = String(formData.get("appName") ?? "").trim();
  const reviewType = String(formData.get("reviewType") ?? "access_review");
  const note = String(formData.get("note") ?? "").trim();

  if (!organizationId || !integrationId || !appName || !reviewTypes.has(reviewType)) {
    throw new Error("App and review type are required.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("You must be signed in to request app reviews.");
  }

  const { data: approval, error: approvalError } = await supabase
    .from("approval_requests")
    .insert({
      organization_id: organizationId,
      title: `App review: ${appName}`,
      description: note || `Review ${appName} ownership, access, and automation risk.`,
      status: "pending",
      due_at: new Date(Date.now() + dueHoursForType(reviewType) * 60 * 60 * 1000).toISOString(),
    })
    .select("id")
    .single();

  if (approvalError) {
    throw approvalError;
  }

  const { error: auditError } = await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    actor_user_id: userData.user.id,
    event_type: "app_review_requested",
    event_summary: `${appName} review requested`,
    metadata: {
      source: "apps_workspace",
      approval_id: approval.id,
      integration_id: integrationId,
      app_name: appName,
      review_type: reviewType,
      note: note || null,
    },
  });

  if (auditError) {
    throw auditError;
  }

  revalidateAppPaths();
}

export async function recordAppOwnerReview(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "");
  const integrationId = String(formData.get("integrationId") ?? "");
  const appName = String(formData.get("appName") ?? "").trim();
  const ownerEmail = String(formData.get("ownerEmail") ?? "").trim().toLowerCase();
  const note = String(formData.get("note") ?? "").trim();

  if (!organizationId || !integrationId || !appName || !ownerEmail.includes("@")) {
    throw new Error("App name and owner email are required.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("You must be signed in to record app ownership.");
  }

  const { error } = await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    actor_user_id: userData.user.id,
    event_type: "app_owner_reviewed",
    event_summary: `${appName} owner reviewed`,
    metadata: {
      source: "apps_workspace",
      integration_id: integrationId,
      app_name: appName,
      owner_email: ownerEmail,
      note: note || null,
    },
  });

  if (error) {
    throw error;
  }

  revalidateAppPaths();
}

function dueHoursForType(reviewType: string) {
  if (reviewType === "risk_review") return 8;
  if (reviewType === "access_review") return 24;
  return 72;
}

function revalidateAppPaths() {
  revalidatePath("/app");
  revalidatePath("/app/apps");
  revalidatePath("/app/approvals");
  revalidatePath("/app/access-reviews");
  revalidatePath("/app/audit");
}
