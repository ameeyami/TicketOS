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

export type TrendWeek = {
  label: string;
  created: number;
  resolved: number;
  mttrMinutes: number;
  deflectionRate: number;
  csatScore: number;
  asked: number;
};

function formatWeek(ts: number): string {
  return new Date(ts).toLocaleDateString([], { month: "short", day: "numeric" });
}

/**
 * Bucket tickets + KB queries into the last `weeks` 7-day windows (oldest →
 * newest) so the Reports page can show how volume, resolution speed, deflection
 * and CSAT are trending. Pure aside from the clock (defaulted, so the page
 * doesn't call Date.now() during render).
 */
export function weeklyTrends(
  tickets: Array<{ status: string; created_at: string; resolved_at: string | null }>,
  queries: Array<{ status: string; csat: string | null; created_at: string }>,
  weeks = 6,
  now = Date.now(),
): TrendWeek[] {
  const weekMs = 7 * 86_400_000;
  const idxOf = (iso: string) => Math.floor((now - new Date(iso).getTime()) / weekMs);

  const acc = Array.from({ length: weeks }, () => ({
    created: 0,
    resolved: 0,
    mttrSum: 0,
    mttrCount: 0,
    up: 0,
    down: 0,
    resolvedQ: 0,
    escalatedQ: 0,
    asked: 0,
  }));

  for (const t of tickets) {
    const ci = idxOf(t.created_at);
    if (ci >= 0 && ci < weeks) acc[ci].created += 1;
    if (t.status === "resolved" && t.resolved_at) {
      const ri = idxOf(t.resolved_at);
      if (ri >= 0 && ri < weeks) {
        acc[ri].resolved += 1;
        const ms = new Date(t.resolved_at).getTime() - new Date(t.created_at).getTime();
        acc[ri].mttrSum += Math.max(0, ms / 60000);
        acc[ri].mttrCount += 1;
      }
    }
  }

  for (const q of queries) {
    const qi = idxOf(q.created_at);
    if (qi < 0 || qi >= weeks) continue;
    acc[qi].asked += 1;
    if (q.status === "resolved") acc[qi].resolvedQ += 1;
    if (q.status === "escalated") acc[qi].escalatedQ += 1;
    if (q.csat === "up") acc[qi].up += 1;
    if (q.csat === "down") acc[qi].down += 1;
  }

  const result: TrendWeek[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const a = acc[i];
    const decided = a.resolvedQ + a.escalatedQ;
    result.push({
      label: formatWeek(now - (i + 1) * weekMs),
      created: a.created,
      resolved: a.resolved,
      mttrMinutes: a.mttrCount ? Math.round(a.mttrSum / a.mttrCount) : 0,
      deflectionRate: decided ? Math.round((a.resolvedQ / decided) * 100) : 0,
      csatScore: a.up + a.down ? Math.round((a.up / (a.up + a.down)) * 100) : 0,
      asked: a.asked,
    });
  }
  return result;
}
