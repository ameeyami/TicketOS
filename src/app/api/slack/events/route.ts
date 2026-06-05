import { slackPostMessage } from "@/lib/integrations/slack";
import { handleSlackMessage } from "@/lib/slack/assistant";
import { resolveSlackOrg } from "@/lib/slack/resolve";
import { hasSlackSigning, verifySlackRequest } from "@/lib/slack/verify";
import { createSupabaseAdminClient, hasServiceRole } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type SlackEnvelope = {
  type?: string;
  challenge?: string;
  team_id?: string;
  event?: {
    type?: string;
    text?: string;
    channel?: string;
    ts?: string;
    thread_ts?: string;
    bot_id?: string;
    user?: string;
  };
};

function ok(body = ""): Response {
  return new Response(body, { status: 200 });
}

function stripMention(text: string): string {
  return text.replace(/<@[A-Z0-9]+>/gi, " ").replace(/\s+/g, " ").trim();
}

/**
 * POST /api/slack/events — Slack Events API. Handles the one-time URL
 * verification handshake and @-mentions of the TicketOS bot: it answers from the
 * org's KB (or opens a ticket) and replies in-thread via the bot token.
 */
export async function POST(req: Request): Promise<Response> {
  if (!hasServiceRole() || !hasSlackSigning()) return ok();

  const raw = await req.text();
  let payload: SlackEnvelope;
  try {
    payload = JSON.parse(raw) as SlackEnvelope;
  } catch {
    return ok();
  }

  const verified = verifySlackRequest(
    raw,
    req.headers.get("x-slack-request-timestamp"),
    req.headers.get("x-slack-signature"),
  );
  if (!verified) return new Response("invalid signature", { status: 401 });

  // URL verification handshake.
  if (payload.type === "url_verification") {
    return new Response(String(payload.challenge ?? ""), {
      status: 200,
      headers: { "content-type": "text/plain" },
    });
  }

  // Ignore Slack's automatic retries so we never double-post.
  if (req.headers.get("x-slack-retry-num")) return ok();

  const event = payload.event;
  // Only respond to user @-mentions; never to the bot's own messages.
  if (payload.type !== "event_callback" || !event || event.type !== "app_mention" || event.bot_id) {
    return ok();
  }

  const org = await resolveSlackOrg(String(payload.team_id ?? ""));
  if (!org || !event.channel) return ok();

  const question = stripMention(String(event.text ?? ""));
  const admin = createSupabaseAdminClient();
  const reply = await handleSlackMessage(admin, org, question, { name: null });

  // Reply in-thread. Best-effort: needs SLACK_BOT_TOKEN with chat:write.
  await slackPostMessage(reply.text, event.channel, event.thread_ts ?? event.ts);

  return ok();
}
