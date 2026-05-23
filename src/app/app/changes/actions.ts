"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const changeTypes = new Set(["workflow", "policy", "integration", "automation"]);
const riskLevels = new Set(["low", "medium", "high", "critical"]);

export async function requestChange(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const changeType = String(formData.get("changeType") ?? "");
  const risk = String(formData.get("risk") ?? "");
  const owner = String(formData.get("owner") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const rollback = String(formData.get("rollback") ?? "").trim();

  if (!organizationId || !title || !changeTypes.has(changeType) || !riskLevels.has(risk) || !reason) {
    throw new Error("Change title, type, risk, and reason are required.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("You must be signed in to request changes.");
  }

  const { data: approval, error: approvalError } = await supabase
    .from("approval_requests")
    .insert({
      organization_id: organizationId,
      title,
      description: reason,
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
    event_type: "change_requested",
    event_summary: `${title} requested`,
    metadata: {
      source: "change_workspace",
      approval_id: approval.id,
      change_type: changeType,
      risk,
      owner: owner || null,
      reason,
      rollback: rollback || null,
    },
  });

  if (auditError) {
    throw auditError;
  }

  revalidateChangePaths();
}

export async function markChangeReady(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "");
  const approvalId = String(formData.get("approvalId") ?? "");
  const title = String(formData.get("title") ?? "Change").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!organizationId || !approvalId) {
    throw new Error("Change approval is required.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("You must be signed in to update changes.");
  }

  const { error: auditError } = await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    actor_user_id: userData.user.id,
    event_type: "change_ready",
    event_summary: `${title} marked ready for implementation`,
    metadata: {
      source: "change_workspace",
      approval_id: approvalId,
      note: note || null,
    },
  });

  if (auditError) {
    throw auditError;
  }

  revalidateChangePaths();
}

function dueHoursForRisk(risk: string) {
  if (risk === "critical") return 2;
  if (risk === "high") return 8;
  if (risk === "medium") return 24;
  return 72;
}

function revalidateChangePaths() {
  revalidatePath("/app");
  revalidatePath("/app/changes");
  revalidatePath("/app/approvals");
  revalidatePath("/app/audit");
  revalidatePath("/app/reports");
}
