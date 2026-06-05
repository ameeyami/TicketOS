/**
 * Text embeddings via Voyage AI (Anthropic's recommended embeddings partner),
 * used for semantic knowledge-base search. Bring-your-own key (per-org or env).
 * Everything is best-effort: a null return means "no embedding available" and
 * callers fall back to keyword retrieval — semantic search is a pure upgrade,
 * never a hard dependency.
 */

const VOYAGE_MODEL = process.env.VOYAGE_EMBED_MODEL ?? "voyage-3.5-lite";
export const EMBED_DIM = 1024;

async function embed(input: string, voyageKey: string | null, inputType: "document" | "query"): Promise<number[] | null> {
  const text = input.trim();
  if (!voyageKey || !text) return null;

  try {
    const res = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${voyageKey}` },
      body: JSON.stringify({
        model: VOYAGE_MODEL,
        input: text.slice(0, 8000),
        input_type: inputType,
        output_dimension: EMBED_DIM,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { data?: Array<{ embedding?: number[] }> };
    const vector = data.data?.[0]?.embedding;
    return Array.isArray(vector) && vector.length === EMBED_DIM ? vector : null;
  } catch {
    return null;
  }
}

/** Embed an article body for storage. */
export function embedDocument(input: string, voyageKey: string | null): Promise<number[] | null> {
  return embed(input, voyageKey, "document");
}

/** Embed a user's question for search. */
export function embedQuery(input: string, voyageKey: string | null): Promise<number[] | null> {
  return embed(input, voyageKey, "query");
}
