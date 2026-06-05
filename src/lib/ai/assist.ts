import type { SupabaseClient } from "@supabase/supabase-js";
import { createAnthropicClient } from "@/lib/ai/client";
import { embedDocument, embedQuery } from "@/lib/ai/embeddings";
import { rankArticles, type KbArticle } from "@/lib/ai/knowledge";

/**
 * Assisted resolution: for the ticket an operator is looking at, surface the
 * most similar RESOLVED tickets and the most relevant KB articles, and draft a
 * suggested resolution. Uses vector search when a Voyage key is present, and
 * falls back to keyword matching otherwise — it always returns something useful.
 */

const MODEL = process.env.TICKETOS_COPILOT_MODEL ?? process.env.TICKETOS_TRIAGE_MODEL ?? "claude-opus-4-8";

export type AssistTicket = {
  id: string;
  organization_id: string;
  title: string;
  description?: string | null;
  ai_summary?: string | null;
};

export type SimilarTicket = { id: string; ref: string; title: string; similarity: number | null };
export type ArticleHit = { id: string; title: string; body: string; category: string | null };
export type Assist = { similarTickets: SimilarTicket[]; suggestedArticles: ArticleHit[]; mode: "semantic" | "keyword" };

const STOPWORDS = new Set([
  "the", "and", "for", "with", "this", "that", "from", "have", "has", "are", "was", "will", "your", "you",
  "issue", "problem", "error", "need", "help", "unable", "cannot", "cant", "please", "ticket", "request", "user",
]);

function tokenize(text: string): Set<string> {
  return new Set((text.toLowerCase().match(/[a-z0-9]{4,}/g) ?? []).filter((w) => !STOPWORDS.has(w)));
}

/** Best-effort: store/update a ticket's embedding (the resolved-ticket corpus). */
export async function upsertTicketEmbedding(
  supabase: SupabaseClient,
  organizationId: string,
  ticketId: string,
  text: string,
  voyageKey: string | null,
): Promise<void> {
  try {
    if (!voyageKey) return;
    const vector = await embedDocument(text, voyageKey);
    if (!vector) return;
    await supabase
      .from("ticket_embeddings")
      .upsert({ ticket_id: ticketId, organization_id: organizationId, embedding: vector }, { onConflict: "ticket_id" });
  } catch {
    // optional — never block the ticket write
  }
}

export async function loadAssist(supabase: SupabaseClient, ticket: AssistTicket, voyageKey: string | null): Promise<Assist> {
  const text = `${ticket.title}\n\n${ticket.ai_summary ?? ticket.description ?? ""}`.trim();

  let similarTickets: SimilarTicket[] = [];
  let suggestedArticles: ArticleHit[] = [];
  let mode: "semantic" | "keyword" = "keyword";

  if (voyageKey) {
    const queryEmbedding = await embedQuery(text, voyageKey);
    if (queryEmbedding) {
      mode = "semantic";
      const [{ data: tRows }, { data: aRows }] = await Promise.all([
        supabase.rpc("match_tickets", {
          query_embedding: queryEmbedding,
          match_org: ticket.organization_id,
          exclude_ticket: ticket.id,
          match_count: 4,
        }),
        supabase.rpc("match_knowledge_articles", {
          query_embedding: queryEmbedding,
          match_org: ticket.organization_id,
          match_count: 3,
        }),
      ]);
      similarTickets = (tRows ?? []).map((r: { id: string; external_id: string | null; title: string; similarity: number }) => ({
        id: r.id,
        ref: r.external_id ?? r.id.slice(0, 8),
        title: r.title,
        similarity: typeof r.similarity === "number" ? Math.round(r.similarity * 100) : null,
      }));
      suggestedArticles = (aRows ?? []).map((r: { id: string; title: string; body: string; category: string | null }) => ({
        id: r.id,
        title: r.title,
        body: r.body,
        category: r.category,
      }));
    }
  }

  if (similarTickets.length === 0) {
    similarTickets = await keywordSimilarTickets(supabase, ticket, text);
  }
  if (suggestedArticles.length === 0) {
    suggestedArticles = await keywordArticles(supabase, ticket.organization_id, text);
  }

  return { similarTickets, suggestedArticles, mode };
}

async function keywordSimilarTickets(supabase: SupabaseClient, ticket: AssistTicket, text: string): Promise<SimilarTicket[]> {
  const { data } = await supabase
    .from("tickets")
    .select("id, external_id, title, ai_summary")
    .eq("organization_id", ticket.organization_id)
    .eq("status", "resolved")
    .neq("id", ticket.id)
    .order("resolved_at", { ascending: false })
    .limit(60);

  const terms = tokenize(text);
  if (terms.size === 0) return [];

  return (data ?? [])
    .map((t: { id: string; external_id: string | null; title: string; ai_summary: string | null }) => {
      const hay = tokenize(`${t.title} ${t.ai_summary ?? ""}`);
      let score = 0;
      for (const term of terms) if (hay.has(term)) score += 1;
      return { id: t.id, ref: t.external_id ?? t.id.slice(0, 8), title: t.title, similarity: null, score };
    })
    .filter((t) => t.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ id, ref, title, similarity }) => ({ id, ref, title, similarity }));
}

async function keywordArticles(supabase: SupabaseClient, organizationId: string, text: string): Promise<ArticleHit[]> {
  const { data } = await supabase
    .from("knowledge_articles")
    .select("id, title, body, category, source_url, status")
    .eq("organization_id", organizationId);

  const published = (data ?? []).filter((a: { status?: string | null }) => !a.status || a.status === "published") as KbArticle[];
  return rankArticles(text, published, 3).map((a) => ({ id: a.id, title: a.title, body: a.body, category: a.category }));
}

export type PlanStep = { title: string; detail: string; system: string | null; needsApproval: boolean; reversible: boolean };
export type ResolutionPlan = { intents: string[]; steps: PlanStep[]; aiWritten: boolean };

const HEURISTIC_PLAN: ResolutionPlan = {
  intents: ["Resolve the request"],
  steps: [
    { title: "Verify identity & context", detail: "Confirm the requester and gather the details needed.", system: null, needsApproval: false, reversible: true },
    { title: "Check policy", detail: "Allow, require approval, or block per policy.", system: null, needsApproval: false, reversible: true },
    { title: "Apply the standard fix", detail: "Execute the resolution on the relevant system.", system: null, needsApproval: true, reversible: true },
    { title: "Notify the requester", detail: "Confirm resolution and next steps.", system: null, needsApproval: false, reversible: false },
  ],
  aiWritten: false,
};

/**
 * Agentic planner: read the ticket and produce the distinct intents plus an
 * ordered, governed plan of steps (with approval + reversibility flags). It
 * plans — it does not auto-execute, keeping a human in the loop.
 */
export async function planResolution(
  input: { ticket: AssistTicket; articles: ArticleHit[]; similarTickets: SimilarTicket[] },
  anthropicKey: string | null,
): Promise<ResolutionPlan> {
  const { ticket, articles, similarTickets } = input;
  if (!anthropicKey) return HEURISTIC_PLAN;

  try {
    const client = createAnthropicClient(anthropicKey);
    const kb = articles.map((a) => `- ${a.title}`).join("\n");
    const priors = similarTickets.map((t) => `- ${t.ref}: ${t.title}`).join("\n");
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 900,
      tool_choice: { type: "tool", name: "resolution_plan" },
      tools: [
        {
          name: "resolution_plan",
          description: "Break a ticket into its distinct intents and an ordered, governed resolution plan.",
          input_schema: {
            type: "object",
            properties: {
              intents: { type: "array", items: { type: "string" }, description: "The distinct asks in the ticket (a single ticket may contain several)." },
              steps: {
                type: "array",
                description: "4-8 ordered, concrete steps to resolve it on real systems.",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    detail: { type: "string", description: "One concise line." },
                    system: { type: "string", description: "Target system (Okta, Slack, Jira, Google…) or empty." },
                    needs_approval: { type: "boolean", description: "True for sensitive access changes or destructive actions." },
                    reversible: { type: "boolean", description: "True if the step can be undone." },
                  },
                  required: ["title", "detail", "needs_approval", "reversible"],
                },
              },
            },
            required: ["intents", "steps"],
          },
        },
      ],
      system:
        "You are an IT resolution planner. Read the ticket and produce (1) its distinct intents and (2) an ordered, concrete plan to resolve it on real systems. For each step set needs_approval (sensitive access / destructive) and reversible honestly. Ground the plan in the knowledge articles and the pattern of similar past tickets. Be specific and practical.",
      messages: [
        {
          role: "user",
          content: [
            `Ticket: ${ticket.title}`,
            ticket.ai_summary ? `Summary: ${ticket.ai_summary}` : ticket.description ? `Details: ${ticket.description}` : "",
            priors ? `\nSimilar resolved tickets:\n${priors}` : "",
            kb ? `\nKnowledge articles:\n${kb}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
    });

    const tool = response.content.find((b) => b.type === "tool_use");
    if (!tool || tool.type !== "tool_use") return HEURISTIC_PLAN;
    const d = tool.input as {
      intents?: string[];
      steps?: Array<{ title?: string; detail?: string; system?: string; needs_approval?: boolean; reversible?: boolean }>;
    };
    const steps: PlanStep[] = (d.steps ?? [])
      .filter((s) => s.title)
      .slice(0, 10)
      .map((s) => ({
        title: String(s.title).slice(0, 120),
        detail: String(s.detail ?? "").slice(0, 200),
        system: s.system?.trim() ? String(s.system).slice(0, 40) : null,
        needsApproval: Boolean(s.needs_approval),
        reversible: Boolean(s.reversible),
      }));
    if (steps.length === 0) return HEURISTIC_PLAN;
    return {
      intents: (d.intents ?? []).map((i) => String(i).slice(0, 120)).filter(Boolean).slice(0, 6),
      steps,
      aiWritten: true,
    };
  } catch {
    return HEURISTIC_PLAN;
  }
}

export type ResolutionDraft = { text: string; aiWritten: boolean };

export async function draftResolution(
  input: { ticket: AssistTicket; articles: ArticleHit[]; similarTickets: SimilarTicket[] },
  anthropicKey: string | null,
): Promise<ResolutionDraft> {
  const { ticket, articles, similarTickets } = input;

  if (!anthropicKey) {
    if (articles.length > 0) {
      const top = articles[0];
      const snippet = top.body.length > 600 ? `${top.body.slice(0, 600)}…` : top.body;
      return {
        text: `Suggested from "${top.title}":\n\n${snippet}\n\n(Connect Claude on the Claude API page for an AI-written, ticket-specific draft.)`,
        aiWritten: false,
      };
    }
    return {
      text: "No knowledge articles matched this ticket yet. Add one, or connect Claude for an AI-drafted resolution.",
      aiWritten: false,
    };
  }

  try {
    const client = createAnthropicClient(anthropicKey);
    const kb = articles.map((a, i) => `[#${i + 1}] ${a.title}\n${a.body}`).join("\n\n---\n\n");
    const priors = similarTickets.map((t) => `- ${t.ref}: ${t.title}`).join("\n");
    const system =
      "You are an IT resolver assistant. Draft a concise, practical, step-by-step resolution for the operator to apply to this ticket. Ground it ONLY in the knowledge articles and the pattern of similar past tickets provided. If they don't fully cover it, say what to check next. No preamble, no sign-off.";
    const user = [
      `Ticket: ${ticket.title}`,
      ticket.ai_summary ? `Summary: ${ticket.ai_summary}` : ticket.description ? `Details: ${ticket.description}` : "",
      priors ? `\nSimilar resolved tickets:\n${priors}` : "",
      kb ? `\nKnowledge articles:\n${kb}` : "\n(No knowledge articles matched.)",
    ]
      .filter(Boolean)
      .join("\n");

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 600,
      system,
      messages: [{ role: "user", content: user }],
    });
    const block = response.content.find((b) => b.type === "text");
    const out = block && block.type === "text" ? block.text.trim() : "";
    return { text: out || "Couldn't draft a resolution — try again.", aiWritten: Boolean(out) };
  } catch {
    return { text: "Couldn't reach Claude to draft a resolution. Check the Claude API key.", aiWritten: false };
  }
}
