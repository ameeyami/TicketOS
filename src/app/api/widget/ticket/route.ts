import { deliverWebhook } from "@/lib/api/webhooks";
import { createTicketViaApi } from "@/lib/tickets/create-via-api";
import { resolveWidgetOrg } from "@/lib/widget/resolve";
import { createSupabaseAdminClient, hasServiceRole } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...CORS },
  });
}

export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: CORS });
}

// POST /api/widget/ticket — escalate a visitor's question to a real ticket.
export async function POST(req: Request): Promise<Response> {
  if (!hasServiceRole()) return json(503, { error: "Widget not enabled." });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return json(400, { error: "Invalid JSON body." });
  }

  const key = String(body.key ?? "");
  const question = String(body.question ?? "").trim();
  if (!question) return json(400, { error: "A description is required." });

  const org = await resolveWidgetOrg(key);
  if (!org) return json(401, { error: "Invalid widget key." });

  try {
    const admin = createSupabaseAdminClient();
    const title = question.length > 80 ? `${question.slice(0, 80)}…` : question;
    const ticket = await createTicketViaApi(admin, org.organizationId, {
      title,
      description: question,
      requesterName: body.name ? String(body.name) : null,
      requesterEmail: body.email ? String(body.email) : null,
      source: "widget",
    });

    const { data: orgRow } = await admin
      .from("organizations")
      .select("webhook_url, webhook_secret, webhook_events")
      .eq("id", org.organizationId)
      .maybeSingle();
    await deliverWebhook(
      { url: orgRow?.webhook_url ?? null, secret: orgRow?.webhook_secret ?? null, events: orgRow?.webhook_events ?? null },
      "ticket.created",
      ticket,
    );

    return json(201, { ok: true, reference: ticket.external_id });
  } catch (error) {
    return json(500, { error: "Couldn't create the ticket.", detail: (error as Error).message });
  }
}
