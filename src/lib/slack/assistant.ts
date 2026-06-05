import type { SupabaseClient } from "@supabase/supabase-js";
import { answerFromKnowledge, type KbArticle } from "@/lib/ai/knowledge";
import { deliverWebhook } from "@/lib/api/webhooks";
import type { SlackOrg } from "@/lib/slack/resolve";
import { createTicketViaApi } from "@/lib/tickets/create-via-api";

/**
 * Shared brain for the two-way Slack assistant, used by both the slash command
 * and the @-mention (Events API) handlers. It decides whether a message is a
 * request to open a ticket or a question to answer from the org's knowledge base,
 * does the work via the service-role client, and returns Slack-ready mrkdwn text.
 */

export type SlackReply = { text: string };

const TICKET_TRIGGERS = [
  /^\s*ticket\s*[:\-]/i,
  /^\s*(new|open|raise|create|file|log)\s+(a\s+)?ticket\b/i,
];

function looksLikeTicket(text: string): boolean {
  return TICKET_TRIGGERS.some((re) => re.test(text));
}

function stripTicketPrefix(text: string): string {
  return text
    .replace(/^\s*(new|open|raise|create|file|log)\s+(a\s+)?ticket\s*[:\-]?\s*/i, "")
    .replace(/^\s*ticket\s*[:\-]\s*/i, "")
    .trim();
}

export async function handleSlackMessage(
  admin: SupabaseClient,
  org: SlackOrg,
  rawText: string,
  requester: { name?: string | null; email?: string | null },
): Promise<SlackReply> {
  const text = rawText.trim();

  if (!text) {
    return {
      text:
        "Hi! Ask me an IT question and I'll answer from your knowledge base — e.g. _how do I reset my VPN?_\nNeed a human? Open a ticket with `ticket: <describe your issue>`.",
    };
  }

  // --- Ticket path -----------------------------------------------------------
  if (looksLikeTicket(text)) {
    const description = stripTicketPrefix(text) || text;
    const title = description.length > 80 ? `${description.slice(0, 80)}…` : description;
    try {
      const ticket = await createTicketViaApi(admin, org.organizationId, {
        title,
        description,
        requesterName: requester.name ?? null,
        requesterEmail: requester.email ?? null,
        source: "slack",
      });

      const { data: orgRow } = await admin
        .from("organizations")
        .select("webhook_url, webhook_secret, webhook_events")
        .eq("id", org.organizationId)
        .maybeSingle();
      await deliverWebhook(
        {
          url: orgRow?.webhook_url ?? null,
          secret: orgRow?.webhook_secret ?? null,
          events: orgRow?.webhook_events ?? null,
        },
        "ticket.created",
        ticket,
      );

      return {
        text: `:white_check_mark: Opened *${ticket.external_id}* — _${title}_\nStatus: *${ticket.status.replaceAll(
          "_",
          " ",
        )}*. Someone will follow up here.`,
      };
    } catch {
      return { text: ":warning: I couldn't open that ticket just now. Please try again in a moment." };
    }
  }

  // --- Answer path -----------------------------------------------------------
  const { data: rawArticles } = await admin
    .from("knowledge_articles")
    .select("id, title, body, category, source_url, status")
    .eq("organization_id", org.organizationId);

  const articles = (rawArticles ?? []).filter(
    (a: { status?: string | null }) => !a.status || a.status === "published",
  ) as KbArticle[];

  const result = await answerFromKnowledge(text, articles, org.anthropicKey);

  await admin.from("kb_queries").insert({
    organization_id: org.organizationId,
    asked_by: null,
    question: text,
    answer: result.answer,
    status: "answered",
    source_article_ids: result.sourceIds,
  });

  const byId = new Map(articles.map((a) => [a.id, a.title]));
  const sources = result.sourceIds.map((id) => byId.get(id)).filter(Boolean) as string[];
  const sourceLine = sources.length ? `\n\n_Sources: ${sources.join(", ")}_` : "";
  const hint = "\n\nDidn't solve it? Open a ticket: `ticket: <describe your issue>`";

  return { text: `${result.answer}${sourceLine}${hint}` };
}
