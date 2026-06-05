import { handleSlackMessage } from "@/lib/slack/assistant";
import { resolveSlackOrg } from "@/lib/slack/resolve";
import { hasSlackSigning, verifySlackRequest } from "@/lib/slack/verify";
import { createSupabaseAdminClient, hasServiceRole } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function slack(text: string, inChannel = false): Response {
  return new Response(
    JSON.stringify({ response_type: inChannel ? "in_channel" : "ephemeral", text }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

/**
 * POST /api/slack/command — a Slack slash command (e.g. `/ticketos <question>`).
 * Verifies the request signature, resolves the org from the workspace id, then
 * answers from the KB or opens a ticket and replies in the same channel.
 */
export async function POST(req: Request): Promise<Response> {
  if (!hasServiceRole() || !hasSlackSigning()) {
    return slack("The TicketOS Slack assistant isn't enabled on this deployment yet.");
  }

  const raw = await req.text();
  const verified = verifySlackRequest(
    raw,
    req.headers.get("x-slack-request-timestamp"),
    req.headers.get("x-slack-signature"),
  );
  if (!verified) return new Response("invalid signature", { status: 401 });

  const params = new URLSearchParams(raw);
  const teamId = params.get("team_id") ?? "";
  const text = params.get("text") ?? "";
  const userName = params.get("user_name");

  const org = await resolveSlackOrg(teamId);
  if (!org) {
    return slack(
      "This Slack workspace isn't linked to a TicketOS organization yet. An admin can link it under *Channels → Slack assistant* in TicketOS.",
    );
  }

  const admin = createSupabaseAdminClient();
  const reply = await handleSlackMessage(admin, org, text, { name: userName });
  return slack(reply.text);
}
