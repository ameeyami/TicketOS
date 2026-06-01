"use server";

import { revalidatePath } from "next/cache";
import { getOrgAnthropicKey } from "@/lib/ai/org-key";
import { triageTicket } from "@/lib/ai/triage";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const chatChannels = new Set(["slack", "teams"]);
const categoryAgents: Record<string, string> = {
  Identity: "Access Agent",
  Onboarding: "Onboarding Agent",
  Network: "Network Agent",
  Security: "Security Agent",
};

export async function submitChatRequest(formData: FormData) {
  const channel = String(formData.get("channel") ?? "");
  const requesterName = String(formData.get("requesterName") ?? "").trim();
  const requesterEmail = String(formData.get("requesterEmail") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const fallbackCategory = String(formData.get("category") ?? "Identity");

  if (!chatChannels.has(channel)) {
    throw new Error("Choose a chat channel.");
  }
  if (!requesterName) {
    throw new Error("Enter the employee name.");
  }
  if (!message) {
    throw new Error("Enter the employee's message.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("You must be signed in to capture chat requests.");
  }

  const organization = await ensureWorkspace(supabase, userData.user);

  // Real LLM triage using THIS org's own Claude key; otherwise use the chosen category.
  const title = deriveTitle(message);
  const apiKey = await getOrgAnthropicKey(supabase, organization.id);
  const triage = await triageTicket({ title, description: message }, apiKey);
  const category = triage?.category ?? fallbackCategory;

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

  const channelLabel = channel === "slack" ? "Slack" : "Microsoft Teams";
  const confidence = triage ? triage.confidence : category === "Security" ? 72 : category === "Network" ? 82 : 91;
  const status = category === "Security" ? "approval_required" : "triaging";
  const summary = triage
    ? `${triage.summary} (Opened ${externalId} from ${channelLabel}, assigned ${agentName}.)`
    : `TicketOS picked up this ${channelLabel} request, classified it as ${category.toLowerCase()} work with ${confidence}% confidence, opened ${externalId}, and assigned ${agentName}.`;

  const { data: ticket, error: ticketError } = await supabase
    .from("tickets")
    .insert({
      organization_id: organization.id,
      external_id: externalId,
      title,
      description: message,
      requester_name: requesterName,
      requester_email: requesterEmail || null,
      source: channel,
      category,
      priority: "medium",
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

  // The agent's in-channel acknowledgement, stored as a comment so it appears in
  // the conversation thread and on the ticket's Notes timeline.
  await supabase.from("ticket_comments").insert({
    organization_id: organization.id,
    ticket_id: ticket.id,
    author_user_id: userData.user.id,
    body: `Thanks ${requesterName.split(" ")[0]} — I've opened ${externalId} and ${
      status === "approval_required" ? "flagged it for approval" : "started triaging"
    }. I'll keep you posted right here.`,
    metadata: { source: `chat_${channel}`, channel, auto_reply: true },
  });

  await supabase.from("audit_logs").insert({
    organization_id: organization.id,
    actor_user_id: userData.user.id,
    actor_agent_id: agent?.id,
    ticket_id: ticket.id,
    event_type: "chat_intake",
    event_summary: `${channelLabel} request captured and ${triage ? "AI-triaged" : "classified"}`,
    metadata: { source: `chat_${channel}`, channel, category, confidence, ai_triage: Boolean(triage), reasoning: triage?.reasoning ?? null },
  });

  if (status === "approval_required") {
    await supabase.from("approval_requests").insert({
      organization_id: organization.id,
      ticket_id: ticket.id,
      requested_by_agent_id: agent?.id,
      title: `${category} request requires approval`,
      description: `Captured from ${channelLabel}. TicketOS paused execution because this category may affect sensitive access.`,
      status: "pending",
    });
  }

  revalidatePath("/app/channels");
  revalidatePath("/app/tickets");
  revalidatePath("/app");
}

function deriveTitle(message: string) {
  const firstLine = message.split("\n")[0].trim();
  return firstLine.length > 80 ? `${firstLine.slice(0, 77)}…` : firstLine;
}
