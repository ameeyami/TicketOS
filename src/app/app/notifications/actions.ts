"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function reviewAttentionItem(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "");
  const ticketId = String(formData.get("ticketId") ?? "");
  const itemId = String(formData.get("itemId") ?? "").trim();
  const itemType = String(formData.get("itemType") ?? "").trim();
  const itemTitle = String(formData.get("itemTitle") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!organizationId || !itemId || !itemType || !itemTitle) {
    throw new Error("Attention item details are required.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("You must be signed in to review attention items.");
  }

  await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    actor_user_id: userData.user.id,
    ticket_id: ticketId || null,
    event_type: "attention_item_reviewed",
    event_summary: `${itemTitle} reviewed`,
    metadata: {
      source: "notifications_center",
      item_id: itemId,
      item_type: itemType,
      note: note || null,
    },
  });

  if (ticketId && note) {
    await supabase.from("ticket_comments").insert({
      organization_id: organizationId,
      ticket_id: ticketId,
      author_user_id: userData.user.id,
      body: note,
      metadata: { source: "notifications_center", item_type: itemType },
    });
  }

  revalidatePath("/app");
  revalidatePath("/app/notifications");
  revalidatePath("/app/audit");
  if (ticketId) {
    revalidatePath(`/app/tickets/${ticketId}`);
  }
}
