"use server";

import { revalidatePath } from "next/cache";
import { getCatalogForProvider } from "@/lib/integration-action-catalog";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function updateIntegrationStatus(formData: FormData) {
  const integrationId = String(formData.get("integrationId") ?? "");
  const status = String(formData.get("status") ?? "");
  const connectionId = String(formData.get("connectionId") ?? "").trim();
  const adminEmail = String(formData.get("adminEmail") ?? "").trim();

  if (!integrationId || !["connected", "disabled", "not_connected"].includes(status)) {
    throw new Error("Invalid integration update.");
  }

  if (status === "connected" && !connectionId) {
    throw new Error("Enter the workspace, tenant, or app ID before connecting.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("You must be signed in to manage integrations.");
  }

  const { data: integration, error: readError } = await supabase
    .from("integrations")
    .select("id, organization_id, display_name, config")
    .eq("id", integrationId)
    .single();

  if (readError) {
    throw readError;
  }

  const { error } = await supabase
    .from("integrations")
    .update({
      status,
      connected_by: status === "connected" ? userData.user.id : null,
      connected_at: status === "connected" ? new Date().toISOString() : null,
      config:
        status === "connected"
          ? {
              ...(integration.config ?? {}),
              connection_id: connectionId,
              admin_email: adminEmail || null,
              connection_mode: "manual_scoped_setup",
            }
          : integration.config ?? {},
    })
    .eq("id", integrationId);

  if (error) {
    throw error;
  }

  await supabase.from("audit_logs").insert({
    organization_id: integration.organization_id,
    actor_user_id: userData.user.id,
    event_type: "integration_updated",
    event_summary: `${integration.display_name} marked ${status.replaceAll("_", " ")}`,
    metadata: {
      source: "integrations_page",
      connection_id: status === "connected" ? connectionId : null,
      admin_email: status === "connected" ? adminEmail || null : null,
    },
  });

  revalidatePath("/app");
  revalidatePath("/app/integrations");
  revalidatePath(`/app/integrations/${integrationId}`);
  revalidatePath("/app/intelligence");
}

export async function syncIntegrationActions(formData: FormData) {
  const integrationId = String(formData.get("integrationId") ?? "");

  if (!integrationId) {
    throw new Error("Integration is required.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("You must be signed in to sync integration actions.");
  }

  const { data: integration, error: readError } = await supabase
    .from("integrations")
    .select("id, organization_id, provider_key, display_name")
    .eq("id", integrationId)
    .single();

  if (readError) {
    throw readError;
  }

  const catalog = getCatalogForProvider(integration.provider_key);
  const { error: upsertError } = await supabase.from("integration_actions").upsert(
    catalog.map((action) => ({
      organization_id: integration.organization_id,
      integration_id: integration.id,
      action_key: action.action_key,
      display_name: action.display_name,
      risk_level: action.risk_level,
      requires_approval: action.requires_approval,
      schema: action.schema,
    })),
    { onConflict: "integration_id,action_key" },
  );

  if (upsertError) {
    throw upsertError;
  }

  await supabase.from("audit_logs").insert({
    organization_id: integration.organization_id,
    actor_user_id: userData.user.id,
    event_type: "integration_actions_synced",
    event_summary: `${integration.display_name} action catalog synced`,
    metadata: { source: "integration_detail", action_count: catalog.length },
  });

  revalidatePath("/app");
  revalidatePath("/app/integrations");
  revalidatePath(`/app/integrations/${integrationId}`);
  revalidatePath("/app/audit");
  revalidatePath("/app/intelligence");
}

export async function updateIntegrationActionApproval(formData: FormData) {
  const actionId = String(formData.get("actionId") ?? "");
  const integrationId = String(formData.get("integrationId") ?? "");
  const requiresApproval = String(formData.get("requiresApproval") ?? "") === "true";

  if (!actionId || !integrationId) {
    throw new Error("Integration action is required.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("You must be signed in to manage action approvals.");
  }

  const { data: action, error } = await supabase
    .from("integration_actions")
    .update({ requires_approval: requiresApproval })
    .eq("id", actionId)
    .select("id, organization_id, display_name")
    .single();

  if (error) {
    throw error;
  }

  await supabase.from("audit_logs").insert({
    organization_id: action.organization_id,
    actor_user_id: userData.user.id,
    event_type: "integration_action_policy_updated",
    event_summary: `${action.display_name} ${requiresApproval ? "now requires approval" : "can run autonomously"}`,
    metadata: { source: "integration_detail", integration_id: integrationId },
  });

  revalidatePath(`/app/integrations/${integrationId}`);
  revalidatePath("/app/audit");
}
