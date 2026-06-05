/**
 * Minimal real Slack Web API client (no SDK). Credentials come from env so a
 * workspace connects Slack the same way it connects email:
 *   SLACK_BOT_TOKEN       = xoxb-...  (a bot token with chat:write)
 *   SLACK_DEFAULT_CHANNEL = C0123...  (channel id, or #channel-name)
 *
 * Best-effort: when not configured, callers get { ok:false, error:"not_configured" }.
 */

const SLACK_API = "https://slack.com/api";

export function isSlackConfigured(): boolean {
  return Boolean(process.env.SLACK_BOT_TOKEN && process.env.SLACK_DEFAULT_CHANNEL);
}

export function slackDefaultChannel(): string {
  return process.env.SLACK_DEFAULT_CHANNEL ?? "";
}

export type SlackPostResult =
  | { ok: true; ts: string; channel: string }
  | { ok: false; error: string };

export async function slackPostMessage(
  text: string,
  channel?: string,
  threadTs?: string,
): Promise<SlackPostResult> {
  const token = process.env.SLACK_BOT_TOKEN;
  const targetChannel = channel || process.env.SLACK_DEFAULT_CHANNEL;
  if (!token || !targetChannel) {
    return { ok: false, error: "not_configured" };
  }

  try {
    const response = await fetch(`${SLACK_API}/chat.postMessage`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(
        threadTs
          ? { channel: targetChannel, text, thread_ts: threadTs }
          : { channel: targetChannel, text },
      ),
    });
    const data = (await response.json()) as { ok: boolean; ts?: string; channel?: string; error?: string };
    if (!data.ok || !data.ts) {
      return { ok: false, error: data.error ?? "unknown_error" };
    }
    return { ok: true, ts: data.ts, channel: data.channel ?? targetChannel };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "request_failed" };
  }
}

export type SlackDeleteResult = { ok: true } | { ok: false; error: string };

export async function slackDeleteMessage(channel: string, ts: string): Promise<SlackDeleteResult> {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    return { ok: false, error: "not_configured" };
  }

  try {
    const response = await fetch(`${SLACK_API}/chat.delete`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({ channel, ts }),
    });
    const data = (await response.json()) as { ok: boolean; error?: string };
    return data.ok ? { ok: true } : { ok: false, error: data.error ?? "unknown_error" };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "request_failed" };
  }
}
