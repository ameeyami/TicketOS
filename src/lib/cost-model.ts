/**
 * Modeled AI economics for TicketOS.
 *
 * Agents are currently simulated, so there is no real per-call token usage yet.
 * Until a live LLM is wired in, costs are *modeled* deterministically from the
 * work each ticket/run represents (text read, steps planned, actions executed).
 * When real usage lands, the same {inputTokens, outputTokens, model} fields hold
 * actual numbers and every figure below becomes real with no rework.
 *
 * Prices are USD per 1M tokens. They are estimates kept here as a single editable
 * table — not authoritative vendor pricing.
 */

export type ModelKey = "claude-opus-4-8" | "claude-sonnet-4-6" | "claude-haiku-4-5";

export const MODEL_PRICING: Record<ModelKey, { label: string; inputPerM: number; outputPerM: number }> = {
  "claude-opus-4-8": { label: "Opus 4.8", inputPerM: 15, outputPerM: 75 },
  "claude-sonnet-4-6": { label: "Sonnet 4.6", inputPerM: 3, outputPerM: 15 },
  "claude-haiku-4-5": { label: "Haiku 4.5", inputPerM: 0.8, outputPerM: 4 },
};

export const DEFAULT_MODEL: ModelKey = "claude-sonnet-4-6";

export const DEFAULT_MONTHLY_BUDGET_USD = 500;

export type CostEstimate = {
  model: ModelKey;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
};

export function normalizeModel(model: string | null | undefined): ModelKey {
  return model && model in MODEL_PRICING ? (model as ModelKey) : DEFAULT_MODEL;
}

/** Higher-stakes work is modeled as running on a more capable (pricier) model. */
export function modelForPriority(priority: string | null | undefined): ModelKey {
  if (priority === "critical" || priority === "high") return "claude-opus-4-8";
  if (priority === "low") return "claude-haiku-4-5";
  return "claude-sonnet-4-6";
}

export function costForTokens(model: ModelKey, inputTokens: number, outputTokens: number): number {
  const price = MODEL_PRICING[model];
  return (inputTokens / 1_000_000) * price.inputPerM + (outputTokens / 1_000_000) * price.outputPerM;
}

/** A workflow run's cost scales with how much the agent reasoned: steps + actions. */
export function estimateWorkflowRunCost(model: ModelKey, stepCount: number, actionCount: number): CostEstimate {
  const inputTokens = 1500 + stepCount * 450 + actionCount * 350;
  const outputTokens = 600 + stepCount * 180 + actionCount * 120;
  return { model, inputTokens, outputTokens, costUsd: costForTokens(model, inputTokens, outputTokens) };
}

/** Triage cost (classification + summary), modeled from text read and written. */
export function estimateTicketTriageCost(
  model: ModelKey,
  description: string | null | undefined,
  aiSummary: string | null | undefined,
): CostEstimate {
  const readChars = (description?.length ?? 0) + 600;
  const writeChars = aiSummary?.length ?? 240;
  const inputTokens = 700 + Math.round(readChars / 3.5);
  const outputTokens = 180 + Math.round(writeChars / 3.5);
  return { model, inputTokens, outputTokens, costUsd: costForTokens(model, inputTokens, outputTokens) };
}

export function formatUsd(value: number): string {
  if (value < 1) return `$${value.toFixed(3)}`;
  if (value < 100) return `$${value.toFixed(2)}`;
  return `$${Math.round(value).toLocaleString()}`;
}
