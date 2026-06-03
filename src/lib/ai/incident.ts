import { createAnthropicClient } from "@/lib/ai/client";

/**
 * Turn a detected cluster of similar tickets into an incident assessment +
 * runbook using the org's own Claude key. Falls back to a sensible heuristic
 * runbook when no key is set or the call fails — the feature still works, it's
 * just not AI-written.
 */

const MODEL = process.env.TICKETOS_COPILOT_MODEL ?? process.env.TICKETOS_TRIAGE_MODEL ?? "claude-opus-4-8";

export type IncidentSeverity = "sev1" | "sev2" | "sev3";

export type IncidentAnalysis = {
  isIncident: boolean;
  title: string;
  impact: string;
  severity: IncidentSeverity;
  rootCauseHypothesis: string;
  runbook: string[];
  aiWritten: boolean;
};

type IncidentInput = {
  tickets: Array<{ ref: string; title: string; summary?: string | null; category?: string | null }>;
};

export async function analyzeIncidentCluster(input: IncidentInput, apiKey: string | null): Promise<IncidentAnalysis> {
  if (!apiKey) return heuristicIncident(input);

  try {
    const client = createAnthropicClient(apiKey);
    const list = input.tickets
      .map((t) => `- [${t.ref}] ${t.title}${t.summary ? ` — ${t.summary}` : ""}`)
      .join("\n");

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 900,
      tool_choice: { type: "tool", name: "incident_analysis" },
      tools: [
        {
          name: "incident_analysis",
          description: "Decide whether a group of related tickets is one underlying major incident, and propose a runbook.",
          input_schema: {
            type: "object",
            properties: {
              is_incident: {
                type: "boolean",
                description:
                  "True if these tickets likely share ONE underlying root cause (a real incident). False if they're unrelated coincidences.",
              },
              title: { type: "string", description: "Short incident title, e.g. 'VPN authentication failures'." },
              impact: { type: "string", description: "One or two sentences: who/what is affected and how badly." },
              severity: {
                type: "string",
                enum: ["sev1", "sev2", "sev3"],
                description: "sev1 = broad outage, sev2 = major degradation, sev3 = limited impact.",
              },
              root_cause_hypothesis: { type: "string", description: "Best guess at the underlying cause from the symptoms." },
              runbook: {
                type: "array",
                items: { type: "string" },
                description: "4-8 ordered, concrete steps: triage → mitigate → communicate → resolve → verify.",
              },
            },
            required: ["is_incident", "title", "impact", "severity", "root_cause_hypothesis", "runbook"],
          },
        },
      ],
      system:
        "You are an IT operations incident commander. Given a cluster of recent support tickets, decide if they point to ONE underlying major incident (shared root cause) versus unrelated coincidences. If it's an incident, write a crisp title, impact, severity, a root-cause hypothesis, and a concrete numbered runbook (triage → mitigate → communicate → resolve → verify). Be specific and practical; do not invent product names you don't see in the tickets.",
      messages: [{ role: "user", content: `Recent related tickets:\n${list}` }],
    });

    const tool = response.content.find((block) => block.type === "tool_use");
    if (!tool || tool.type !== "tool_use") return heuristicIncident(input);

    const data = tool.input as {
      is_incident?: boolean;
      title?: string;
      impact?: string;
      severity?: string;
      root_cause_hypothesis?: string;
      runbook?: unknown[];
    };

    const severity: IncidentSeverity =
      data.severity === "sev1" || data.severity === "sev2" || data.severity === "sev3" ? data.severity : "sev2";

    return {
      isIncident: Boolean(data.is_incident),
      title: (data.title?.trim() || "Possible incident").slice(0, 120),
      impact: (data.impact?.trim() || "").slice(0, 600),
      severity,
      rootCauseHypothesis: (data.root_cause_hypothesis?.trim() || "").slice(0, 600),
      runbook: Array.isArray(data.runbook)
        ? data.runbook.map((s) => String(s).trim().slice(0, 300)).filter(Boolean).slice(0, 10)
        : [],
      aiWritten: true,
    };
  } catch {
    return heuristicIncident(input);
  }
}

function heuristicIncident(input: IncidentInput): IncidentAnalysis {
  const count = input.tickets.length;
  const category = input.tickets[0]?.category ?? "service";
  return {
    isIncident: count >= 3,
    title: `Possible ${category.toLowerCase()} incident`,
    impact: `${count} tickets reporting similar ${category.toLowerCase()} problems in a short window — likely a shared root cause.`,
    severity: count >= 6 ? "sev1" : "sev2",
    rootCauseHypothesis:
      "Connect a valid Claude key for an AI root-cause hypothesis. For now, investigate the component common to these tickets.",
    runbook: [
      "Acknowledge the incident and assign an incident commander.",
      "Confirm scope: list the affected users/services from the linked tickets.",
      "Check recent changes or deploys to the common component.",
      "Apply a mitigation or roll back the suspected change.",
      "Post a status update to affected users.",
      "Verify resolution across every linked ticket, then close.",
    ],
    aiWritten: false,
  };
}
