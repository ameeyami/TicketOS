"use server";

import { revalidatePath } from "next/cache";
import { embedDocument } from "@/lib/ai/embeddings";
import { getOrgVoyageKey } from "@/lib/ai/org-key";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

async function requireEditor(supabase: ServerClient, organizationId: string, userId: string) {
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

async function requireAdmin(supabase: ServerClient, organizationId: string, userId: string) {
  const { data } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();
  if (data?.role !== "owner" && data?.role !== "admin") {
    throw new Error("Only an owner or admin can change this.");
  }
}

/** Best-effort: embed an article and store its vector. Silent when no Voyage key. */
async function embedArticle(supabase: ServerClient, organizationId: string, articleId: string, title: string, body: string) {
  try {
    const voyageKey = await getOrgVoyageKey(supabase, organizationId);
    if (!voyageKey) return;
    const vector = await embedDocument(`${title}\n\n${body}`, voyageKey);
    if (!vector) return;
    await supabase
      .from("knowledge_articles")
      .update({ embedding: vector })
      .eq("id", articleId)
      .eq("organization_id", organizationId);
  } catch {
    // semantic indexing is optional — never block the write
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

  const { data: created, error } = await supabase
    .from("knowledge_articles")
    .insert({
      organization_id: organization.id,
      title,
      body,
      category: category || null,
      created_by: userData.user.id,
    })
    .select("id")
    .single();
  if (error) {
    throw error;
  }

  await embedArticle(supabase, organization.id, created.id, title, body);

  revalidatePath("/app/knowledge");
  revalidatePath("/app/ask");
}

export async function approveArticle(formData: FormData) {
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
    .update({ status: "published" })
    .eq("id", id)
    .eq("organization_id", organization.id);
  if (error) {
    throw error;
  }

  const { data: article } = await supabase
    .from("knowledge_articles")
    .select("title, body")
    .eq("id", id)
    .eq("organization_id", organization.id)
    .maybeSingle();
  if (article) {
    await embedArticle(supabase, organization.id, id, article.title, article.body);
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

export async function saveVoyageKey(formData: FormData) {
  const apiKey = String(formData.get("voyageKey") ?? "").trim();
  if (!apiKey) {
    throw new Error("Enter a Voyage API key.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new Error("You must be signed in.");
  }

  const organization = await ensureWorkspace(supabase, userData.user);
  await requireAdmin(supabase, organization.id, userData.user.id);

  await supabase.from("integrations").upsert(
    {
      organization_id: organization.id,
      provider_key: "voyage",
      display_name: "Voyage Embeddings",
      status: "connected",
      scopes: ["embeddings"],
      config: { api_key: apiKey, last_four: apiKey.slice(-4) },
      connected_by: userData.user.id,
      connected_at: new Date().toISOString(),
    },
    { onConflict: "organization_id,provider_key" },
  );

  await supabase.from("audit_logs").insert({
    organization_id: organization.id,
    actor_user_id: userData.user.id,
    event_type: "voyage_key_connected",
    event_summary: "Voyage embeddings key connected",
    metadata: { source: "knowledge" },
  });

  // Index everything now that we have a key.
  await reindexAll(supabase, organization.id);

  revalidatePath("/app/knowledge");
  revalidatePath("/app/ask");
}

export async function reindexArticles() {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new Error("You must be signed in.");
  }
  const organization = await ensureWorkspace(supabase, userData.user);
  await requireEditor(supabase, organization.id, userData.user.id);
  await reindexAll(supabase, organization.id);
  revalidatePath("/app/knowledge");
  revalidatePath("/app/ask");
}

async function reindexAll(supabase: ServerClient, organizationId: string) {
  const voyageKey = await getOrgVoyageKey(supabase, organizationId);
  if (!voyageKey) return;
  const { data: articles } = await supabase
    .from("knowledge_articles")
    .select("id, title, body")
    .eq("organization_id", organizationId)
    .eq("status", "published");
  for (const article of articles ?? []) {
    const vector = await embedDocument(`${article.title}\n\n${article.body}`, voyageKey);
    if (vector) {
      await supabase.from("knowledge_articles").update({ embedding: vector }).eq("id", article.id);
    }
  }
}
