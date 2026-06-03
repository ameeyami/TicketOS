import { createHmac } from "node:crypto";

/**
 * Best-effort outbound webhook delivery. Pure with respect to Supabase — the
 * caller reads the org's webhook config with whatever client it has and passes
 * it here, so this never needs to know about client types. Signs the payload
 * with HMAC-SHA256 (x-ticketos-signature) when a secret is set.
 */

export type WebhookConfig = { url: string | null; secret: string | null; events: string[] | null };

export async function deliverWebhook(config: WebhookConfig, event: string, data: unknown): Promise<void> {
  if (!config.url) return;
  if (config.events && config.events.length > 0 && !config.events.includes(event)) return;

  const body = JSON.stringify({ event, data, sent_at: new Date().toISOString() });
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-ticketos-event": event,
  };
  if (config.secret) {
    headers["x-ticketos-signature"] = createHmac("sha256", config.secret).update(body).digest("hex");
  }

  try {
    await fetch(config.url, { method: "POST", headers, body, signal: AbortSignal.timeout(4000) });
  } catch {
    // Webhook delivery is best-effort — never let it break the originating action.
  }
}
