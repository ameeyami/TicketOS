"use server";

import { embedQuery } from "@/lib/ai/embeddings";
import { groundedAnswer, rankArticles, type KbArticle } from "@/lib/ai/knowledge";
import { getOrgAnthropicKey, getOrgVoyageKey } from "@/lib/ai/org-key";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AskResult = {
  answer: string;
  sources: Array<{ id: string; title: string }>;
  queryId: string | null;
  grounded: boolean;
};

export async function askKnowledge(question: string): Promise<AskResult> {
  const q = question.trim();
  if (!q) {
    throw new Error("Enter a question.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new Error("You must be signed in to ask the help desk.");
  }

  const organization = await ensureWorkspace(supabase, userData.user);
  const { data: rawArticles } = await supabase
    .from("knowledge_articles")
    .select("id, title, body, category, source_url, status")
    .eq("organization_id", organization.id);

  // Only published articles are answerable — AI-suggested drafts stay out until
  // an operator reviews them. (status is absent before the migration → treat as published.)
  const articles = (rawArticles ?? []).filter(
    (a: { status?: string | null }) => !a.status || a.status === "published",
  ) as KbArticle[];

  // Semantic retrieval first (vector similarity) when a Voyage key is available;
  // otherwise — or if it returns nothing — fall back to keyword ranking.
  let top: KbArticle[] = [];
  const voyageKey = await getOrgVoyageKey(supabase, organization.id);
  if (voyageKey) {
    const queryEmbedding = await embedQuery(q, voyageKey);
    if (queryEmbedding) {
      const { data: matches } = await supabase.rpc("match_knowledge_articles", {
        query_embedding: queryEmbedding,
        match_org: organization.id,
        match_count: 4,
      });
      if (Array.isArray(matches)) {
        top = matches.map((m: { id: string; title: string; body: string; category: string | null; source_url: string | null }) => ({
          id: m.id,
          title: m.title,
          body: m.body,
          category: m.category,
          source_url: m.source_url,
        }));
      }
    }
  }
  if (top.length === 0) {
    top = rankArticles(q, articles);
  }

  const apiKey = await getOrgAnthropicKey(supabase, organization.id);
  const result = await groundedAnswer(q, top, apiKey);

  const { data: row } = await supabase
    .from("kb_queries")
    .insert({
      organization_id: organization.id,
      asked_by: userData.user.id,
      question: q,
      answer: result.answer,
      status: "answered",
      source_article_ids: result.sourceIds,
    })
    .select("id")
    .single();

  const byId = new Map(articles.map((a: { id: string; title: string }) => [a.id, a.title]));
  const sources = result.sourceIds.map((id) => ({ id, title: byId.get(id) ?? "Article" }));

  return { answer: result.answer, sources, queryId: row?.id ?? null, grounded: result.grounded };
}

export async function markResolved(queryId: string): Promise<void> {
  if (!queryId) return;
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return;
  const organization = await ensureWorkspace(supabase, userData.user);
  await supabase
    .from("kb_queries")
    .update({ status: "resolved", csat: "up" })
    .eq("id", queryId)
    .eq("organization_id", organization.id);
}

export async function escalateQuery(queryId: string): Promise<void> {
  if (!queryId) return;
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return;
  const organization = await ensureWorkspace(supabase, userData.user);
  await supabase
    .from("kb_queries")
    .update({ status: "escalated", csat: "down" })
    .eq("id", queryId)
    .eq("organization_id", organization.id);
}
