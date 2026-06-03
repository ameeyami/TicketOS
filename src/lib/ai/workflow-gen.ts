import { createAnthropicClient } from "@/lib/ai/client";

/**
 * Plain-English -> workflow graph, using the org's own Claude key with a forced
 * tool call so the output is always a valid, structured graph. Returns null when
 * no key is set or the model can't produce a usable graph (caller falls back to
 * templates).
 */

export const WORKFLOW_TRIGGERS = ["ticket_intent", "onboarding_request", "security_request", "incident_signal"] as const;
export type WorkflowTrigger = (typeof WORKFLOW_TRIGGERS)[number];

export type GeneratedWorkflow = {
  name: string;
  description: string;
  trigger_type: WorkflowTrigger;
  nodes: string[];
  edges: string[];
};

const MODEL = process.env.TICKETOS_COPILOT_MODEL ?? process.env.TICKETOS_TRIAGE_MODEL ?? "claude-opus-4-8";

export async function generateWorkflow(description: string, apiKey: string | null): Promise<GeneratedWorkflow | null> {
  if (!apiKey) return null;

  try {
    const client = createAnthropicClient(apiKey);
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 900,
      tool_choice: { type: "tool", name: "draft_workflow" },
      tools: [
        {
          name: "draft_workflow",
          description: "Draft a governed TicketOS automation workflow as a directed graph of steps.",
          input_schema: {
            type: "object",
            properties: {
              name: { type: "string", description: "Short, specific workflow name (max ~6 words)." },
              description: { type: "string", description: "One-sentence summary of what the workflow does." },
              trigger_type: { type: "string", enum: [...WORKFLOW_TRIGGERS] },
              nodes: {
                type: "array",
                items: { type: "string" },
                description:
                  "Ordered step keys in snake_case (e.g. intake, identity_check, policy, approval_gate, provision, notify, verify). Always start with 'intake'. Add a 'policy' check and an 'approval_gate' when access is sensitive or the user mentions manager approval. End with 'verify' or 'audit'. Use 4-8 steps.",
              },
              edges: {
                type: "array",
                items: { type: "string" },
                description: "Directed edges as 'from->to' using the node keys, connecting the steps in order (branching allowed).",
              },
            },
            required: ["name", "description", "trigger_type", "nodes", "edges"],
          },
        },
      ],
      system:
        "You design IT automation workflows for TicketOS, an AI-native service desk. Given a plain-English description, produce a clear, governed step graph via the draft_workflow tool. Always start with an 'intake' step, include a 'policy' check and an 'approval_gate' whenever the request involves sensitive access or mentions approval, and end with 'verify' or 'audit'. Keep it to 4-8 snake_case steps with edges that connect them in logical order.",
      messages: [{ role: "user", content: description }],
    });

    const tool = response.content.find((block) => block.type === "tool_use");
    if (!tool || tool.type !== "tool_use") return null;

    const input = tool.input as Partial<GeneratedWorkflow>;
    const nodes = Array.isArray(input.nodes) ? input.nodes.map(String).map((n) => n.trim()).filter(Boolean) : [];
    const validNodes = new Set(nodes);
    const edges = Array.isArray(input.edges)
      ? input.edges
          .map(String)
          .filter((e) => e.includes("->"))
          .filter((e) => {
            const [from, to] = e.split("->").map((p) => p.trim());
            return validNodes.has(from) && validNodes.has(to);
          })
      : [];
    const trigger = (WORKFLOW_TRIGGERS as readonly string[]).includes(String(input.trigger_type))
      ? (input.trigger_type as WorkflowTrigger)
      : "ticket_intent";

    if (nodes.length < 2) return null;

    return {
      name: String(input.name ?? "Generated workflow").slice(0, 80),
      description: String(input.description ?? description).slice(0, 220),
      trigger_type: trigger,
      nodes,
      edges,
    };
  } catch {
    return null;
  }
}
