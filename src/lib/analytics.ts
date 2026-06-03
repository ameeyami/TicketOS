import { formatSlaDuration } from "@/lib/sla";

/**
 * Shared service-desk analytics so the Reports page and the report export
 * compute deflection / CSAT / MTTR the same way.
 */

export function deflectionStats(queries: Array<{ status: string }>): {
  rate: number;
  resolved: number;
  escalated: number;
  total: number;
} {
  const resolved = queries.filter((q) => q.status === "resolved").length;
  const escalated = queries.filter((q) => q.status === "escalated").length;
  const decided = resolved + escalated;
  return { rate: decided ? Math.round((resolved / decided) * 100) : 0, resolved, escalated, total: queries.length };
}

export function csatStats(queries: Array<{ csat: string | null }>): { score: number; up: number; down: number } {
  const up = queries.filter((q) => q.csat === "up").length;
  const down = queries.filter((q) => q.csat === "down").length;
  return { score: up + down ? Math.round((up / (up + down)) * 100) : 0, up, down };
}

export function mttrStats(
  tickets: Array<{ status: string; created_at: string; resolved_at: string | null }>,
): { minutes: number; label: string; count: number } {
  const resolved = tickets.filter((t) => t.status === "resolved" && t.resolved_at);
  if (resolved.length === 0) {
    return { minutes: 0, label: "—", count: 0 };
  }
  const totalMinutes = resolved.reduce((sum, t) => {
    const ms = new Date(t.resolved_at as string).getTime() - new Date(t.created_at).getTime();
    return sum + Math.max(0, ms / 60000);
  }, 0);
  const minutes = Math.round(totalMinutes / resolved.length);
  return { minutes, label: formatSlaDuration(minutes), count: resolved.length };
}
