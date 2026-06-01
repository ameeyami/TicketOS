import Anthropic from "@anthropic-ai/sdk";

/**
 * Real LLM answers for the Operations Copilot, grounded in the org's live data.
 * Returns null when no API key is set so the caller falls back to the heuristic.
 *
 * Set ANTHROPIC_API_KEY to enable. Override the model with TICKETOS_COPILOT_MODEL
 * (falls back to TICKETOS_TRIAGE_MODEL, then claude-opus-4-8).
 */

export type CopilotTurn = { role: "user" | "assistant"; content: string };

export type CopilotContext = {
  tickets: Array<{
    external_id: string | null;
    title: string;
    status: string;
    priority: string;
    category: string | null;
    ai_confidence: number | null;
  }>;
  approvals: Array<{ title: string }>;
  audits: Array<{ event_summary: string }>;
};

const COPILOT_MODEL =
  process.env.TICKETOS_COPILOT_MODEL ?? process.env.TICKETOS_TRIAGE_MODEL ?? "claude-opus-4-8";

function buildSystemPrompt(context: CopilotContext): string {
  const ticketLines =
    context.tickets
      .slice(0, 40)
      .map(
        (t) =>
          `- ${t.external_id ?? "TICKET"} [${t.status}, ${t.priority}, ${t.category ?? "uncategorized"}, ${Number(
            t.ai_confidence ?? 0,
          )}% conf] ${t.title}`,
      )
      .join("\n") || "- (none)";
  const approvalLines = context.approvals.map((a) => `- ${a.title}`).join("\n") || "- (none)";
  const auditLines = context.audits.map((a) => `- ${a.event_summary}`).join("\n") || "- (none)";

  return `You are the Operations Copilot for TicketOS, an AI-native IT service desk.
Answer the operator's question using ONLY the workspace snapshot below. Be concise and specific, cite ticket IDs (e.g. TOS-1842) where relevant, and if the snapshot doesn't contain the answer, say so plainly rather than guessing. Do not invent tickets, people, or events.

=== WORKSPACE SNAPSHOT ===
Tickets (${context.tickets.length}):
${ticketLines}

Pending approvals (${context.approvals.length}):
${approvalLines}

Recent audit events:
${auditLines}
=== END SNAPSHOT ===`;
}

export async function answerCopilot(history: CopilotTurn[], context: CopilotContext): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return null;
  }

  // The Messages API must start with a user turn; drop any leading assistant turns.
  const turns = [...history];
  while (turns.length > 0 && turns[0].role === "assistant") {
    turns.shift();
  }
  if (turns.length === 0) {
    return null;
  }

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: COPILOT_MODEL,
      max_tokens: 1024,
      system: buildSystemPrompt(context),
      messages: turns.map((turn) => ({ role: turn.role, content: turn.content })),
    });

    const text = response.content.find((block) => block.type === "text");
    if (text && text.type === "text" && text.text.trim()) {
      return text.text.trim();
    }
    return null;
  } catch {
    return null;
  }
}
