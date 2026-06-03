"use server";

import { revalidatePath } from "next/cache";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function requireEditor(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, organizationId: string, userId: string) {
  const { data } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();
  if ((data?.role ?? "operator") === "viewer") {
    throw new Error("Viewers can't edit the knowledge base.");
  }
}

export async function createArticle(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();

  if (!title || !body) {
    throw new Error("Title and body are required.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new Error("You must be signed in to edit the knowledge base.");
  }

  const organization = await ensureWorkspace(supabase, userData.user);
  await requireEditor(supabase, organization.id, userData.user.id);

  const { error } = await supabase.from("knowledge_articles").insert({
    organization_id: organization.id,
    title,
    body,
    category: category || null,
    created_by: userData.user.id,
  });
  if (error) {
    throw error;
  }

  revalidatePath("/app/knowledge");
  revalidatePath("/app/ask");
}

export async function deleteArticle(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) {
    throw new Error("A valid article is required.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new Error("You must be signed in to edit the knowledge base.");
  }

  const organization = await ensureWorkspace(supabase, userData.user);
  await requireEditor(supabase, organization.id, userData.user.id);

  const { error } = await supabase
    .from("knowledge_articles")
    .delete()
    .eq("id", id)
    .eq("organization_id", organization.id);
  if (error) {
    throw error;
  }

  revalidatePath("/app/knowledge");
  revalidatePath("/app/ask");
}
