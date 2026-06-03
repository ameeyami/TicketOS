import { createAnthropicClient } from "@/lib/ai/client";

/**
 * Plain-English -> workflow graph. The org's own Claude key drafts a structured
 * graph via a forced tool call; if no key is set or the model can't produce a
 * usable graph, we fall back to a keyword-based draft so the feature never
 * dead-ends. generateWorkflow surfaces the failure reason for diagnostics.
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

export async function generateWorkflow(
  description: string,
  apiKey: string,
): Promise<{ draft: GeneratedWorkflow | null; error: string | null }> {
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
                  "Ordered step keys in snake_case (e.g. intake, identity_check, policy, approval_gate, provision, notify, verify). Always start with 'intake'. Add 'policy' and 'approval_gate' when access is sensitive or approval is mentioned. End with 'verify' or 'audit'. Use 4-8 steps.",
              },
              edges: {
                type: "array",
                items: { type: "string" },
                description: "Directed edges as 'from->to' using the node keys, connecting the steps in order.",
              },
            },
            required: ["name", "description", "trigger_type", "nodes", "edges"],
          },
        },
      ],
      system:
        "You design IT automation workflows for TicketOS, an AI-native service desk. Given a plain-English description, produce a clear, governed step graph via the draft_workflow tool. Always start with 'intake', include 'policy' and 'approval_gate' whenever the request involves sensitive access or mentions approval, and end with 'verify' or 'audit'. Keep it to 4-8 snake_case steps with edges connecting them in logical order.",
      messages: [{ role: "user", content: description }],
    });

    const tool = response.content.find((block) => block.type === "tool_use");
    if (!tool || tool.type !== "tool_use") {
      return { draft: null, error: "model returned no workflow" };
    }

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

    if (nodes.length < 2) {
      return { draft: null, error: "model produced too few steps" };
    }

    return {
      draft: {
        name: String(input.name ?? "Generated workflow").slice(0, 80),
        description: String(input.description ?? description).slice(0, 220),
        trigger_type: trigger,
        nodes,
        edges: edges.length ? edges : nodes.slice(0, -1).map((n, i) => `${n}->${nodes[i + 1]}`),
      },
      error: null,
    };
  } catch (error) {
    return { draft: null, error: error instanceof Error ? error.message.slice(0, 160) : "request failed" };
  }
}

/** Keyword-based draft so generation always returns something usable. */
export function heuristicWorkflow(description: string): GeneratedWorkflow {
  const text = description.toLowerCase();
  const sensitive = /(approval|approve|manager|sensitive|admin|finance|production|security|legal)/.test(text);

  let trigger: WorkflowTrigger = "ticket_intent";
  let nodes: string[];

  if (/(onboard|new ?hire|new employee|joins|joining|provision|day one)/.test(text)) {
    trigger = "onboarding_request";
    nodes = ["intake", "manager_check", "app_bundle", ...(sensitive ? ["approval_gate"] : []), "provision", "notify", "audit"];
  } else if (/(offboard|deactivat|revoke|terminat|leaving|last day|lost|stolen)/.test(text)) {
    trigger = "security_request";
    nodes = ["intake", "ownership_scan", "policy", ...(sensitive ? ["approval_gate"] : []), "revoke", "rotate", "security_review"];
  } else if (/(password|reset|locked|sign ?in|login|mfa|access)/.test(text)) {
    trigger = "ticket_intent";
    nodes = ["intake", "identity_check", "policy", ...(sensitive ? ["approval_gate"] : []), "execute", "notify", "verify"];
  } else if (/(vpn|network|outage|incident|connectivity|down|degraded)/.test(text)) {
    trigger = "incident_signal";
    nodes = ["intake", "device_posture", "gateway_check", "workaround", "verify"];
  } else {
    nodes = ["intake", "triage", "policy", ...(sensitive ? ["approval_gate"] : []), "execute", "verify"];
  }

  const edges = nodes.slice(0, -1).map((node, index) => `${node}->${nodes[index + 1]}`);
  const firstLine = description.trim().split(/[.\n]/)[0]?.trim() ?? "";
  const name = (firstLine || "New workflow").slice(0, 60);

  return {
    name: name.charAt(0).toUpperCase() + name.slice(1),
    description: description.trim().slice(0, 220),
    trigger_type: trigger,
    nodes,
    edges,
  };
}
