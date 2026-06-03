import { answerFromKnowledge, type KbArticle } from "@/lib/ai/knowledge";
import { resolveWidgetOrg } from "@/lib/widget/resolve";
import { createSupabaseAdminClient, hasServiceRole } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...CORS },
  });
}

export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: CORS });
}

// POST /api/widget/ask — answer a visitor's question from the org's published KB.
export async function POST(req: Request): Promise<Response> {
  if (!hasServiceRole()) return json(503, { error: "Widget not enabled." });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return json(400, { error: "Invalid JSON body." });
  }

  const key = String(body.key ?? "");
  const question = String(body.question ?? "").trim();
  if (!question) return json(400, { error: "A question is required." });

  const org = await resolveWidgetOrg(key);
  if (!org) return json(401, { error: "Invalid widget key." });

  const admin = createSupabaseAdminClient();
  const { data: rawArticles } = await admin
    .from("knowledge_articles")
    .select("id, title, body, category, source_url, status")
    .eq("organization_id", org.organizationId);

  const articles = (rawArticles ?? []).filter(
    (a: { status?: string | null }) => !a.status || a.status === "published",
  ) as KbArticle[];

  const result = await answerFromKnowledge(question, articles, org.anthropicKey);

  await admin.from("kb_queries").insert({
    organization_id: org.organizationId,
    asked_by: null,
    question,
    answer: result.answer,
    status: "answered",
    source_article_ids: result.sourceIds,
  });

  const byId = new Map(articles.map((a) => [a.id, a.title]));
  const sources = result.sourceIds.map((id) => ({ title: byId.get(id) ?? "Article" }));

  return json(200, { answer: result.answer, sources, grounded: result.grounded });
}
