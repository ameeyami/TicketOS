import Anthropic from "@anthropic-ai/sdk";

/**
 * Strip accidental wrapping quotes / whitespace from a pasted API key — a common
 * copy-paste mistake that otherwise causes a 401 even with a correct key.
 */
export function cleanApiKey(raw: string | null | undefined): string | null {
  if (!raw) {
    return null;
  }
  const cleaned = String(raw).trim().replace(/^['"]+|['"]+$/g, "").trim();
  return cleaned || null;
}

export function createAnthropicClient(apiKey: string): Anthropic {
  return new Anthropic({ apiKey });
}
