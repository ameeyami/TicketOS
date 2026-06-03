import { authenticateRequest } from "@/lib/api/auth";
import { deliverWebhook } from "@/lib/api/webhooks";
import { createTicketViaApi } from "@/lib/tickets/create-via-api";
import { createSupabaseAdminClient, hasServiceRole } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const NOT_ENABLED = {
  error: "API not enabled",
  detail: "Set SUPABASE_SERVICE_ROLE_KEY in the deployment environment to enable the public API.",
};

// POST /api/v1/tickets — create a ticket from any system.
export async function POST(req: Request): Promise<Response> {
  if (!hasServiceRole()) return json(503, NOT_ENABLED);

  const auth = await authenticateRequest(req);
  if (!auth) return json(401, { error: "Unauthorized", detail: "Missing or invalid API key. Send 'Authorization: Bearer <key>'." });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return json(400, { error: "Invalid JSON body." });
  }

  const title = String(body.title ?? "").trim();
  const description = String(body.description ?? body.body ?? "").trim();
  if (!title || !description) {
    return json(400, { error: "Bad request", detail: "'title' and 'description' are required." });
  }

  try {
    const admin = createSupabaseAdminClient();
    const ticket = await createTicketViaApi(admin, auth.organizationId, {
      title,
      description,
      requesterName: body.requester_name ? String(body.requester_name) : null,
      requesterEmail: body.requester_email ? String(body.requester_email) : null,
      category: body.category ? String(body.category) : null,
      priority: body.priority ? String(body.priority) : null,
    });

    const { data: org } = await admin
      .from("organizations")
      .select("webhook_url, webhook_secret, webhook_events")
      .eq("id", auth.organizationId)
      .maybeSingle();
    await deliverWebhook(
      { url: org?.webhook_url ?? null, secret: org?.webhook_secret ?? null, events: org?.webhook_events ?? null },
      "ticket.created",
      ticket,
    );

    return json(201, { ticket });
  } catch (error) {
    return json(500, { error: "Failed to create ticket", detail: (error as Error).message });
  }
}

// GET /api/v1/tickets — list recent tickets for the authenticated org.
export async function GET(req: Request): Promise<Response> {
  if (!hasServiceRole()) return json(503, NOT_ENABLED);

  const auth = await authenticateRequest(req);
  if (!auth) return json(401, { error: "Unauthorized", detail: "Missing or invalid API key." });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 25) || 25));

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("tickets")
    .select("id, external_id, title, status, priority, category, created_at, resolved_at")
    .eq("organization_id", auth.organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return json(500, { error: "Failed to list tickets", detail: error.message });
  return json(200, { tickets: data ?? [] });
}
