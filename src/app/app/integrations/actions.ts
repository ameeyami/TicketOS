"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function updateIntegrationStatus(formData: FormData) {
  const integrationId = String(formData.get("integrationId") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!integrationId || !["connected", "disabled", "not_connected"].includes(status)) {
    throw new Error("Invalid integration update.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("You must be signed in to manage integrations.");
  }

  const { data: integration, error: readError } = await supabase
    .from("integrations")
    .select("id, organization_id, display_name")
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
    metadata: { source: "integrations_page" },
  });

  revalidatePath("/app");
  revalidatePath("/app/integrations");
}
