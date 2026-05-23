"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const autonomyModes = new Set(["assistive", "approval_first", "supervised", "autonomous"]);
const confidenceThresholds = new Set(["70", "80", "90", "95"]);
const retentionWindows = new Set(["30", "90", "180", "365"]);

export async function updateWorkspaceSettings(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  if (!organizationId || !name) {
    throw new Error("Workspace name is required.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("You must be signed in to update settings.");
  }

  await assertCanManageSettings(supabase, organizationId, userData.user.id);

  const { error } = await supabase.from("organizations").update({ name }).eq("id", organizationId);

  if (error) {
    throw error;
  }

  await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    actor_user_id: userData.user.id,
    event_type: "workspace_updated",
    event_summary: "Workspace settings updated",
    metadata: {
      source: "settings_page",
      workspace_name: name,
    },
  });

  revalidateSettingsPaths();
}

export async function updateOperationalControls(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "");
  const autonomyMode = String(formData.get("autonomyMode") ?? "");
  const confidenceThreshold = String(formData.get("confidenceThreshold") ?? "");
  const retentionWindow = String(formData.get("retentionWindow") ?? "");
  const approvalRequired = String(formData.get("approvalRequired") ?? "") === "on";
  const note = String(formData.get("note") ?? "").trim();

  if (
    !organizationId ||
    !autonomyModes.has(autonomyMode) ||
    !confidenceThresholds.has(confidenceThreshold) ||
    !retentionWindows.has(retentionWindow)
  ) {
    throw new Error("Choose valid operating controls.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("You must be signed in to update controls.");
  }

  await assertCanManageSettings(supabase, organizationId, userData.user.id);

  const { error } = await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    actor_user_id: userData.user.id,
    event_type: "operational_controls_updated",
    event_summary: "Operational controls updated",
    metadata: {
      source: "settings_page",
      autonomy_mode: autonomyMode,
      confidence_threshold: Number(confidenceThreshold),
      retention_days: Number(retentionWindow),
      approval_required: approvalRequired,
      note: note || null,
    },
  });

  if (error) {
    throw error;
  }

  revalidateSettingsPaths();
}

async function assertCanManageSettings(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  organizationId: string,
  userId: string,
) {
  const { data: membership, error } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .single();

  if (error) {
    throw error;
  }

  if (membership.role !== "owner" && membership.role !== "admin") {
    throw new Error("Only owners and admins can update settings.");
  }
}

function revalidateSettingsPaths() {
  revalidatePath("/app");
  revalidatePath("/app/settings");
  revalidatePath("/app/audit");
  revalidatePath("/app/autonomy");
}
