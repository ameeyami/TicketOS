import type { SupabaseClient } from "@supabase/supabase-js";
import { cleanApiKey } from "@/lib/ai/client";
import { triageTicket } from "@/lib/ai/triage";

/**
 * Create a ticket the same way the in-app form does (real AI triage on the org's
 * own key, sequential external id, audit log, approval gate for Security) but
 * via the service-role client for the public API — no user session.
 */

export type ApiTicketInput = {
  title: string;
  description: string;
  requesterName?: string | null;
  requesterEmail?: string | null;
  category?: string | null;
  priority?: string | null;
  source?: string;
};

export type CreatedApiTicket = {
  id: string;
  external_id: string | null;
  status: string;
  priority: string;
  category: string | null;
  created_at: string;
};

export async function createTicketViaApi(
  admin: SupabaseClient,
  organizationId: string,
  input: ApiTicketInput,
): Promise<CreatedApiTicket> {
  const { data: integration } = await admin
    .from("integrations")
    .select("config, status")
    .eq("organization_id", organizationId)
    .eq("provider_key", "anthropic")
    .maybeSingle();

  const apiKey =
    integration?.status === "connected"
      ? cleanApiKey((integration.config as { api_key?: string } | null)?.api_key)
      : null;

  const triage = await triageTicket({ title: input.title, description: input.description }, apiKey);
  const category = triage?.category ?? input.category ?? "Identity";
  const priority = triage?.priority ?? input.priority ?? "medium";

  const { count } = await admin
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId);
  const externalId = `TOS-${1900 + Number(count ?? 0) + 1}`;

  const confidence = triage ? triage.confidence : 80;
  const status = category === "Security" ? "approval_required" : "triaging";
  const summary = triage ? triage.summary : `Classified as ${category.toLowerCase()} via API.`;

  const { data: ticket, error } = await admin
    .from("tickets")
    .insert({
      organization_id: organizationId,
      external_id: externalId,
      title: input.title,
      description: input.description,
      requester_name: input.requesterName ?? null,
      requester_email: input.requesterEmail ?? null,
      source: input.source ?? "api",
      category,
      priority,
      status,
      ai_summary: summary,
      ai_confidence: confidence,
    })
    .select("id, external_id, status, priority, category, created_at")
    .single();

  if (error) throw error;

  await admin.from("audit_logs").insert({
    organization_id: organizationId,
    ticket_id: ticket.id,
    event_type: "created",
    event_summary: triage ? "Ticket created via API and AI-triaged" : "Ticket created via API",
    metadata: { source: "api", category, confidence, ai_triage: Boolean(triage) },
  });

  if (status === "approval_required") {
    await admin.from("approval_requests").insert({
      organization_id: organizationId,
      ticket_id: ticket.id,
      title: `${category} request requires approval`,
      description: "TicketOS paused execution because this category may affect sensitive access.",
      status: "pending",
    });
  }

  return ticket as CreatedApiTicket;
}
