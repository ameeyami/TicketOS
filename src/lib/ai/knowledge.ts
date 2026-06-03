import { createAnthropicClient } from "@/lib/ai/client";

/**
 * Knowledge-grounded answers for the self-service assistant. Retrieval is
 * keyword-overlap scoring over the org's knowledge articles — no embeddings or
 * extra provider needed — then the org's own Claude key synthesises a concise,
 * cited answer from only the retrieved articles. Falls back to the top article
 * snippet when no key is set.
 */

export type KbArticle = {
  id: string;
  title: string;
  body: string;
  category: string | null;
  source_url: string | null;
};

export type KbAnswer = { answer: string; sourceIds: string[]; grounded: boolean };

const KB_MODEL = process.env.TICKETOS_COPILOT_MODEL ?? process.env.TICKETOS_TRIAGE_MODEL ?? "claude-opus-4-8";

/** Rank articles by keyword overlap with the question (title hits weigh more). */
export function rankArticles(question: string, articles: KbArticle[], limit = 4): KbArticle[] {
  const terms = Array.from(new Set((question.toLowerCase().match(/[a-z0-9]{3,}/g) ?? [])));
  if (terms.length === 0) return [];

  const scored = articles.map((article) => {
    const title = article.title.toLowerCase();
    const haystack = `${title} ${article.category ?? ""} ${article.body}`.toLowerCase();
    let score = 0;
    for (const term of terms) {
      if (title.includes(term)) score += 3;
      else if (haystack.includes(term)) score += 1;
    }
    return { article, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.article);
}

export type DraftedArticle = { title: string; body: string; category: string | null };

/**
 * Auto-knowledge: turn a just-resolved ticket into a reusable KB article draft.
 * The model decides whether it's worth an article at all (returns null for
 * one-offs / chit-chat / no real resolution) and strips names + PII so the
 * result is reusable. Returns null when there's no key or nothing worth saving.
 */
export async function draftArticleFromTicket(
  input: { title: string; description?: string | null; summary?: string | null; resolutionNote?: string | null },
  apiKey: string | null,
): Promise<DraftedArticle | null> {
  if (!apiKey) return null;

  const context = [
    `Ticket title: ${input.title}`,
    input.description ? `Original request: ${input.description}` : "",
    input.summary ? `AI summary: ${input.summary}` : "",
    input.resolutionNote ? `How it was resolved: ${input.resolutionNote}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const client = createAnthropicClient(apiKey);
    const response = await client.messages.create({
      model: KB_MODEL,
      max_tokens: 800,
      tool_choice: { type: "tool", name: "draft_article" },
      tools: [
        {
          name: "draft_article",
          description: "Turn a resolved IT support ticket into a reusable knowledge-base article.",
          input_schema: {
            type: "object",
            properties: {
              worth_article: {
                type: "boolean",
                description:
                  "True ONLY if the resolution is a repeatable how-to or answer that would help other employees self-serve. False for one-offs, social chatter, or tickets with no real resolution.",
              },
              title: { type: "string", description: "Clear, search-friendly article title." },
              body: {
                type: "string",
                description:
                  "Concise, reusable answer or numbered steps. Generalize fully — no employee names, emails, ticket IDs, or other PII.",
              },
              category: { type: "string", description: "Short category, e.g. Identity, Access, Network, Hardware, Software." },
            },
            required: ["worth_article", "title", "body", "category"],
          },
        },
      ],
      system:
        "You convert a resolved IT support ticket into a reusable knowledge-base article so future employees can self-serve. Only mark worth_article=true when the resolution is a repeatable how-to or answer that helps others. Always remove specific names, emails, and PII, and keep the body concise and step-oriented.",
      messages: [{ role: "user", content: context }],
    });

    const tool = response.content.find((block) => block.type === "tool_use");
    if (!tool || tool.type !== "tool_use") return null;

    const data = tool.input as { worth_article?: boolean; title?: string; body?: string; category?: string };
    if (!data.worth_article || !data.title?.trim() || !data.body?.trim()) return null;

    return {
      title: data.title.trim().slice(0, 120),
      body: data.body.trim().slice(0, 4000),
      category: data.category?.trim() ? data.category.trim().slice(0, 40) : null,
    };
  } catch {
    return null;
  }
}

export async function answerFromKnowledge(
  question: string,
  articles: KbArticle[],
  apiKey: string | null,
): Promise<KbAnswer> {
  const top = rankArticles(question, articles);

  if (top.length === 0) {
    return {
      answer:
        "I couldn't find anything in the knowledge base about that. You can create a ticket and a person will pick it up.",
      sourceIds: [],
      grounded: false,
    };
  }

  if (!apiKey) {
    const article = top[0];
    const snippet = article.body.length > 600 ? `${article.body.slice(0, 600)}…` : article.body;
    return { answer: `From "${article.title}":\n\n${snippet}`, sourceIds: [article.id], grounded: true };
  }

  try {
    const client = createAnthropicClient(apiKey);
    const sources = top.map((a, index) => `[#${index + 1}] ${a.title}\n${a.body}`).join("\n\n---\n\n");
    const system = `You are TicketOS's self-service IT help assistant. Answer the employee's question using ONLY the knowledge articles below. Be concise, practical, and friendly. Use short steps when helpful and name the article(s) you used. If the articles do not actually answer the question, say you couldn't find it and suggest creating a ticket — do not invent steps, tools, or policies.

=== KNOWLEDGE ARTICLES ===
${sources}
=== END ===`;

    const response = await client.messages.create({
      model: KB_MODEL,
      max_tokens: 700,
      system,
      messages: [{ role: "user", content: question }],
    });

    const text = response.content.find((block) => block.type === "text");
    const answer = text && text.type === "text" ? text.text.trim() : "";
    return {
      answer: answer || "I couldn't find a clear answer — consider creating a ticket.",
      sourceIds: top.map((a) => a.id),
      grounded: true,
    };
  } catch {
    const article = top[0];
    const snippet = article.body.length > 600 ? `${article.body.slice(0, 600)}…` : article.body;
    return { answer: `From "${article.title}":\n\n${snippet}`, sourceIds: [article.id], grounded: true };
  }
}
