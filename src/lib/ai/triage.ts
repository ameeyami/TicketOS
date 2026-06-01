import Anthropic from "@anthropic-ai/sdk";
import { createAnthropicClient, hasAnthropicKey } from "@/lib/ai/client";

/**
 * Real LLM triage for incoming tickets.
 *
 * Returns a structured classification by calling Claude through a single forced
 * tool call (reliable structured output across SDK versions). If no API key is
 * configured, returns null so callers fall back to the existing heuristic — the
 * app keeps working with or without a key.
 *
 * Set ANTHROPIC_API_KEY to enable. Override the model with TICKETOS_TRIAGE_MODEL.
 */

export type TriageCategory = "Identity" | "Onboarding" | "Network" | "Security";
export type TriagePriority = "low" | "medium" | "high" | "critical";

export type TriageResult = {
  category: TriageCategory;
  priority: TriagePriority;
  summary: string;
  confidence: number; // 0-100
  reasoning: string;
};

const CATEGORIES: TriageCategory[] = ["Identity", "Onboarding", "Network", "Security"];
const PRIORITIES: TriagePriority[] = ["low", "medium", "high", "critical"];

const TRIAGE_MODEL = process.env.TICKETOS_TRIAGE_MODEL ?? "claude-opus-4-8";

const SYSTEM_PROMPT = `You are the triage agent for TicketOS, an AI-native IT service desk.
Classify each incoming IT request into exactly one category and a priority, then write a short operator summary.

Categories:
- Identity: passwords, MFA, SSO, locked accounts, login/access recovery.
- Onboarding: new hires, app provisioning, granting access or licenses, equipment for joiners.
- Network: VPN, connectivity, Wi-Fi, device/posture, gateways, outages.
- Security: deactivation/offboarding, suspicious activity, risky or over-broad access, contractor exits.

Priority:
- critical: active security incident or broad outage affecting many people.
- high: blocks one person's work right now, or is time-sensitive.
- medium: a normal request with no urgency.
- low: minor, cosmetic, or purely informational.

Be concise and decisive. Confidence (0-100) reflects how clearly the request maps to the category.
Always respond by calling the submit_triage tool.`;

const TRIAGE_TOOL: Anthropic.Tool = {
  name: "submit_triage",
  description: "Submit the triage classification for the IT request.",
  input_schema: {
    type: "object",
    properties: {
      category: { type: "string", enum: CATEGORIES, description: "The single best category." },
      priority: { type: "string", enum: PRIORITIES, description: "The urgency level." },
      summary: { type: "string", description: "One or two sentences for an IT operator." },
      confidence: { type: "integer", description: "0-100 confidence in the classification." },
      reasoning: { type: "string", description: "One sentence: why this category and priority." },
    },
    required: ["category", "priority", "summary", "confidence", "reasoning"],
    additionalProperties: false,
  },
};

export function isTriageEnabled() {
  return hasAnthropicKey();
}

export async function triageTicket(input: { title: string; description: string }): Promise<TriageResult | null> {
  if (!hasAnthropicKey()) {
    return null;
  }

  try {
    const client = createAnthropicClient();
    const response = await client.messages.create({
      model: TRIAGE_MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: [TRIAGE_TOOL],
      tool_choice: { type: "tool", name: "submit_triage" },
      messages: [
        {
          role: "user",
          content: `Title: ${input.title}\n\nDescription: ${input.description || "(no description provided)"}`,
        },
      ],
    });

    const toolUse = response.content.find((block) => block.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return null;
    }

    const data = toolUse.input as Partial<TriageResult>;
    const category = CATEGORIES.includes(data.category as TriageCategory) ? (data.category as TriageCategory) : null;
    const priority = PRIORITIES.includes(data.priority as TriagePriority) ? (data.priority as TriagePriority) : null;
    if (!category || !priority || typeof data.summary !== "string") {
      return null;
    }

    const confidence = Math.max(0, Math.min(100, Math.round(Number(data.confidence ?? 0))));
    return {
      category,
      priority,
      summary: data.summary,
      confidence,
      reasoning: typeof data.reasoning === "string" ? data.reasoning : "",
    };
  } catch {
    // Any API/parse error → fall back to the caller's heuristic.
    return null;
  }
}
