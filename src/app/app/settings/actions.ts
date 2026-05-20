"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

  const { error } = await supabase.from("organizations").update({ name }).eq("id", organizationId);

  if (error) {
    throw error;
  }

  await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    actor_user_id: userData.user.id,
    event_type: "workspace_updated",
    event_summary: "Workspace settings updated",
    metadata: { source: "settings_page" },
  });

  revalidatePath("/app");
  revalidatePath("/app/settings");
}
