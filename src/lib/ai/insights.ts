import { createAnthropicClient } from "@/lib/ai/client";
import type { TrendWeek } from "@/lib/analytics";

/**
 * Turn weekly service-desk metrics into a short executive narrative ("what
 * changed and why") using the org's own Claude key. Falls back to a deterministic
 * summary built from the deltas when no key is set.
 */

const MODEL = process.env.TICKETOS_COPILOT_MODEL ?? process.env.TICKETOS_TRIAGE_MODEL ?? "claude-opus-4-8";

export type TrendInsight = { text: string; aiWritten: boolean };

export async function summarizeTrends(trends: TrendWeek[], apiKey: string | null): Promise<TrendInsight> {
  if (trends.length < 2) {
    return { text: "Insights appear once there are at least two weeks of activity to compare.", aiWritten: false };
  }
  if (!apiKey) {
    return { text: heuristicTrendSummary(trends), aiWritten: false };
  }

  try {
    const table = trends
      .map(
        (w) =>
          `${w.label}: created ${w.created}, resolved ${w.resolved}, MTTR ${w.mttrMinutes}m, deflection ${w.deflectionRate}%, CSAT ${w.csatScore}%, KB questions ${w.asked}`,
      )
      .join("\n");

    const client = createAnthropicClient(apiKey);
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 400,
      system:
        "You are an IT service-desk analyst. Given weekly metrics (oldest to newest), write a SHORT executive insight of 3-4 sentences: what changed most in the latest week vs prior weeks, the most likely driver, and one concrete recommendation. Use the actual numbers. Plain prose, no preamble, no bullet points, no headers.",
      messages: [{ role: "user", content: `Weekly service-desk metrics:\n${table}` }],
    });

    const text = response.content.find((block) => block.type === "text");
    const out = text && text.type === "text" ? text.text.trim() : "";
    return { text: out || heuristicTrendSummary(trends), aiWritten: Boolean(out) };
  } catch {
    return { text: heuristicTrendSummary(trends), aiWritten: false };
  }
}

function heuristicTrendSummary(trends: TrendWeek[]): string {
  const last = trends[trends.length - 1];
  const prev = trends[trends.length - 2];

  const parts: string[] = [];

  const volDelta = last.created - prev.created;
  if (volDelta !== 0) {
    parts.push(`Ticket volume ${volDelta > 0 ? "rose" : "fell"} to ${last.created} this week (${prev.created} prior).`);
  } else {
    parts.push(`Ticket volume held steady at ${last.created} this week.`);
  }

  const defDelta = last.deflectionRate - prev.deflectionRate;
  if (last.asked > 0 && defDelta !== 0) {
    parts.push(`Self-service deflection ${defDelta > 0 ? "improved" : "dropped"} to ${last.deflectionRate}% (${defDelta > 0 ? "+" : ""}${defDelta} pts).`);
  }

  if (last.mttrMinutes > 0 && prev.mttrMinutes > 0) {
    const faster = last.mttrMinutes < prev.mttrMinutes;
    parts.push(`Mean time to resolve ${faster ? "improved" : "slipped"} this week.`);
  }

  parts.push("Connect a valid Claude key for an AI-written root-cause narrative and recommendation.");
  return parts.join(" ");
}
