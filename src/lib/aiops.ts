/**
 * AIOps-lite: detect spikes of similar tickets so a flood of related reports can
 * be recognised as ONE underlying incident. Clustering is keyword-overlap +
 * same-category union-find over recent unresolved tickets — cheap, deterministic,
 * and needs no embeddings or AI. The org's Claude key is only used later, on
 * demand, to turn a detected cluster into an incident summary + runbook.
 */

export type AiopsTicket = {
  id: string;
  external_id: string | null;
  title: string;
  ai_summary: string | null;
  category: string | null;
  priority: string;
  status: string;
  created_at: string;
};

export type TicketCluster = {
  id: string;
  theme: string;
  terms: string[];
  tickets: AiopsTicket[];
  firstAt: string;
  lastAt: string;
  topCategory: string | null;
  topPriority: string;
};

// Generic English + ticket-noise words that shouldn't drive clustering.
const STOPWORDS = new Set([
  "the", "and", "for", "with", "this", "that", "from", "have", "has", "are", "was", "were", "will", "would",
  "issue", "issues", "problem", "problems", "error", "errors", "need", "needs", "help", "unable", "cannot",
  "cant", "wont", "please", "ticket", "tickets", "request", "requests", "user", "users", "team", "asap",
  "when", "what", "where", "which", "into", "your", "you", "our", "able", "some", "been", "they", "their",
  "since", "after", "before", "about", "getting", "trying", "still", "again", "today", "morning",
]);

function tokens(ticket: AiopsTicket): Set<string> {
  const text = `${ticket.title} ${ticket.ai_summary ?? ""}`.toLowerCase();
  const words = text.match(/[a-z0-9]{4,}/g) ?? [];
  return new Set(words.filter((w) => !STOPWORDS.has(w)));
}

function sharedCount(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const w of a) if (b.has(w)) n += 1;
  return n;
}

const PRIORITY_RANK: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };

/**
 * Group tickets that look like the same underlying issue. Two tickets join a
 * cluster when they share >= minShared significant terms, or share the same
 * category plus >= 1 term. Only clusters of >= minClusterSize are returned.
 */
export function clusterTickets(
  tickets: AiopsTicket[],
  opts?: { minClusterSize?: number; minShared?: number },
): TicketCluster[] {
  const minClusterSize = opts?.minClusterSize ?? 3;
  const minShared = opts?.minShared ?? 2;
  const n = tickets.length;
  if (n < minClusterSize) return [];

  const toks = tickets.map(tokens);

  // Union-find to connect related tickets transitively.
  const parent = tickets.map((_, i) => i);
  const find = (x: number): number => {
    let r = x;
    while (parent[r] !== r) r = parent[r];
    while (parent[x] !== r) {
      const next = parent[x];
      parent[x] = r;
      x = next;
    }
    return r;
  };
  const union = (a: number, b: number) => {
    parent[find(a)] = find(b);
  };

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const shared = sharedCount(toks[i], toks[j]);
      const sameCategory = Boolean(tickets[i].category) && tickets[i].category === tickets[j].category;
      if (shared >= minShared || (sameCategory && shared >= 1)) {
        union(i, j);
      }
    }
  }

  const groups = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    const arr = groups.get(root);
    if (arr) arr.push(i);
    else groups.set(root, [i]);
  }

  const clusters: TicketCluster[] = [];
  for (const idxs of groups.values()) {
    if (idxs.length < minClusterSize) continue;

    const clusterTicketsArr = idxs.map((i) => tickets[i]);

    const freq = new Map<string, number>();
    for (const i of idxs) for (const w of toks[i]) freq.set(w, (freq.get(w) ?? 0) + 1);
    const terms = [...freq.entries()]
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .map(([w]) => w)
      .slice(0, 5);

    const catFreq = new Map<string, number>();
    for (const t of clusterTicketsArr) if (t.category) catFreq.set(t.category, (catFreq.get(t.category) ?? 0) + 1);
    const topCategory = [...catFreq.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    const topPriority = clusterTicketsArr.reduce(
      (acc, t) => ((PRIORITY_RANK[t.priority] ?? 0) > (PRIORITY_RANK[acc] ?? 0) ? t.priority : acc),
      "low",
    );

    const sorted = [...clusterTicketsArr].sort((a, b) => a.created_at.localeCompare(b.created_at));

    clusters.push({
      id: idxs
        .map((i) => tickets[i].id)
        .sort()
        .join("|"),
      theme: terms.length ? terms.join(", ") : topCategory ?? "related tickets",
      terms,
      tickets: sorted,
      firstAt: sorted[0].created_at,
      lastAt: sorted[sorted.length - 1].created_at,
      topCategory,
      topPriority,
    });
  }

  return clusters.sort((a, b) => b.tickets.length - a.tickets.length);
}
