"use server";

import { redirect } from "next/navigation";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { serviceCatalogItems, type ServiceCatalogKey } from "@/lib/service-catalog";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function submitCatalogRequest(formData: FormData) {
  const itemKey = String(formData.get("itemKey") ?? "") as ServiceCatalogKey;
  const requesterName = String(formData.get("requesterName") ?? "").trim();
  const requesterEmail = String(formData.get("requesterEmail") ?? "").trim();
  const details = String(formData.get("details") ?? "").trim();
  const businessReason = String(formData.get("businessReason") ?? "").trim();
  const item = serviceCatalogItems[itemKey];

  if (!item || !details) {
    throw new Error("Choose a service and add request details.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("You must be signed in to submit catalog requests.");
  }

  const organization = await ensureWorkspace(supabase, userData.user);
  const { count } = await supabase
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organization.id);

  const { data: agent } = await supabase
    .from("agents")
    .select("id")
    .eq("organization_id", organization.id)
    .eq("name", item.agent)
    .maybeSingle();

  const externalId = `TOS-${1900 + Number(count ?? 0) + 1}`;
  const description = [
    details,
    businessReason ? `Business reason: ${businessReason}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const { data: ticket, error: ticketError } = await supabase
    .from("tickets")
    .insert({
      organization_id: organization.id,
      external_id: externalId,
      title: item.title,
      description,
      requester_name: requesterName || userData.user.email,
      requester_email: requesterEmail || userData.user.email,
      source: "service_catalog",
      category: item.category,
      priority: item.priority,
      status: item.status,
      ai_summary: `TicketOS catalog classified this as ${item.category.toLowerCase()} work. ${item.summary}`,
      ai_confidence: item.confidence,
      assigned_agent_id: agent?.id,
    })
    .select("id")
    .single();

  if (ticketError) {
    throw ticketError;
  }

  await supabase.from("audit_logs").insert({
    organization_id: organization.id,
    actor_user_id: userData.user.id,
    actor_agent_id: agent?.id,
    ticket_id: ticket.id,
    event_type: "catalog_request_created",
    event_summary: `${item.title} catalog request created`,
    metadata: {
      source: "service_catalog",
      catalog_item: itemKey,
      confidence: item.confidence,
      business_reason: businessReason || null,
    },
  });

  await supabase.from("ticket_comments").insert({
    organization_id: organization.id,
    ticket_id: ticket.id,
    author_user_id: userData.user.id,
    body: `Catalog request details:\n${description}`,
    metadata: { source: "service_catalog", catalog_item: itemKey },
  });

  if (item.status === "approval_required") {
    await supabase.from("approval_requests").insert({
      organization_id: organization.id,
      ticket_id: ticket.id,
      requested_by_agent_id: agent?.id,
      title: `${item.title} requires approval`,
      description: "TicketOS paused this catalog request because policy expects human approval before execution.",
      status: "pending",
    });
  }

  redirect(`/app/tickets/${ticket.id}`);
}
