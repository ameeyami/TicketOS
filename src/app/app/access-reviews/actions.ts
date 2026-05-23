"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function decideAccessReview(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "");
  const approvalId = String(formData.get("approvalId") ?? "");
  const personEmail = String(formData.get("personEmail") ?? "").trim().toLowerCase();
  const personName = String(formData.get("personName") ?? "").trim();
  const decision = String(formData.get("decision") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (!organizationId || !approvalId || !["approved", "rejected"].includes(decision)) {
    throw new Error("A valid access-review decision is required.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("You must be signed in to decide access reviews.");
  }

  const { error: approvalError } = await supabase
    .from("approval_requests")
    .update({
      status: decision,
      decided_by: userData.user.id,
      decided_at: new Date().toISOString(),
      decision_note:
        note || (decision === "approved" ? "Access review approved." : "Access review rejected."),
    })
    .eq("id", approvalId)
    .eq("organization_id", organizationId);

  if (approvalError) {
    throw approvalError;
  }

  const displayName = personName || personEmail || "Access review";
  const { error: auditError } = await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    actor_user_id: userData.user.id,
    event_type: "access_review_completed",
    event_summary: `${displayName} ${decision === "approved" ? "approved" : "rejected"}`,
    metadata: {
      source: "access_review_workspace",
      approval_id: approvalId,
      person_email: personEmail || null,
      person_name: personName || null,
      decision,
      note: note || null,
    },
  });

  if (auditError) {
    throw auditError;
  }

  revalidateAccessReviewPaths();
}

export async function logAccessCertification(formData: FormData) {
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
    throw new Error("You must be signed in to certify access.");
  }

  const displayName = personName || personEmail;
  const { error } = await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    actor_user_id: userData.user.id,
    event_type: "access_certified",
    event_summary: `${displayName} access certified`,
    metadata: {
      source: "access_review_workspace",
      person_email: personEmail,
      person_name: personName || null,
      note: note || null,
    },
  });

  if (error) {
    throw error;
  }

  revalidateAccessReviewPaths();
}

function revalidateAccessReviewPaths() {
  revalidatePath("/app");
  revalidatePath("/app/access-reviews");
  revalidatePath("/app/approvals");
  revalidatePath("/app/people");
  revalidatePath("/app/audit");
}
