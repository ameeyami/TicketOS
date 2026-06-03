"use server";

import { answerFromKnowledge, type KbArticle } from "@/lib/ai/knowledge";
import { getOrgAnthropicKey } from "@/lib/ai/org-key";
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
  const { data: articles } = await supabase
    .from("knowledge_articles")
    .select("id, title, body, category, source_url")
    .eq("organization_id", organization.id);

  const apiKey = await getOrgAnthropicKey(supabase, organization.id);
  const result = await answerFromKnowledge(q, (articles ?? []) as KbArticle[], apiKey);

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

  const byId = new Map((articles ?? []).map((a) => [a.id, a.title]));
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
