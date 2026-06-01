import Anthropic from "@anthropic-ai/sdk";

/**
 * Read ANTHROPIC_API_KEY, tolerating common copy-paste mistakes from env config:
 * surrounding quotes and leading/trailing whitespace or newlines (which would
 * otherwise cause a 401 even when the underlying key is correct).
 */
export function anthropicApiKey(): string | undefined {
  const raw = process.env.ANTHROPIC_API_KEY;
  if (!raw) {
    return undefined;
  }
  const cleaned = raw.trim().replace(/^['"]+|['"]+$/g, "").trim();
  return cleaned || undefined;
}

export function hasAnthropicKey(): boolean {
  return Boolean(anthropicApiKey());
}

export function createAnthropicClient(): Anthropic {
  return new Anthropic({ apiKey: anthropicApiKey() });
}
