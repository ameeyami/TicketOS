"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function syncInventory(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (!organizationId) {
    throw new Error("Workspace is required.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("You must be signed in to sync inventory.");
  }

  const [{ data: integrations }, { count: ticketCount }, { count: actionCount }] = await Promise.all([
    supabase.from("integrations").select("id, status").eq("organization_id", organizationId),
    supabase.from("tickets").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
    supabase.from("integration_actions").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
  ]);

  const connectedCount = (integrations ?? []).filter((integration) => integration.status === "connected").length;

  await supabase
    .from("integrations")
    .update({ connected_at: new Date().toISOString(), connected_by: userData.user.id })
    .eq("organization_id", organizationId)
    .eq("status", "connected");

  await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    actor_user_id: userData.user.id,
    event_type: "inventory_synced",
    event_summary: "Inventory snapshot synced",
    metadata: {
      source: "inventory_workspace",
      connected_integrations: connectedCount,
      ticket_count: ticketCount ?? 0,
      action_count: actionCount ?? 0,
      note: note || null,
    },
  });

  revalidatePath("/app");
  revalidatePath("/app/inventory");
  revalidatePath("/app/integrations");
  revalidatePath("/app/audit");
  revalidatePath("/app/notifications");
}
