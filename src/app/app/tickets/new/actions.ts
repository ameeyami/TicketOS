"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";

const categoryAgents: Record<string, string> = {
  Identity: "Access Agent",
  Onboarding: "Onboarding Agent",
  Network: "Network Agent",
  Security: "Security Agent",
};

export async function createTicket(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const requesterName = String(formData.get("requesterName") ?? "").trim();
  const requesterEmail = String(formData.get("requesterEmail") ?? "").trim();
  const category = String(formData.get("category") ?? "Identity");
  const priority = String(formData.get("priority") ?? "medium");

  if (!title || !description) {
    throw new Error("Title and description are required.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("You must be signed in to create tickets.");
  }

  const organization = await ensureWorkspace(supabase, userData.user);
  const { count } = await supabase
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organization.id);

  const externalId = `TOS-${1900 + Number(count ?? 0) + 1}`;
  const agentName = categoryAgents[category] ?? "Access Agent";
  const { data: agent } = await supabase
    .from("agents")
    .select("id")
    .eq("organization_id", organization.id)
    .eq("name", agentName)
    .maybeSingle();

  const confidence = category === "Security" ? 72 : category === "Network" ? 82 : 91;
  const status = category === "Security" ? "approval_required" : "triaging";
  const summary = `TicketOS classified this as ${category.toLowerCase()} work with ${confidence}% confidence and queued it for ${agentName}.`;

  const { data: ticket, error: ticketError } = await supabase
    .from("tickets")
    .insert({
      organization_id: organization.id,
      external_id: externalId,
      title,
      description,
      requester_name: requesterName || userData.user.email,
      requester_email: requesterEmail || userData.user.email,
      source: "manual",
      category,
      priority,
      status,
      ai_summary: summary,
      ai_confidence: confidence,
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
    event_type: "created",
    event_summary: "Manual ticket created and classified",
    metadata: { source: "new_ticket_form", category, confidence },
  });

  if (status === "approval_required") {
    await supabase.from("approval_requests").insert({
      organization_id: organization.id,
      ticket_id: ticket.id,
      requested_by_agent_id: agent?.id,
      title: `${category} request requires approval`,
      description: "TicketOS paused execution because this category may affect sensitive access.",
      status: "pending",
    });
  }

  redirect(`/app/tickets/${ticket.id}`);
}
