"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const allowedAgentStatuses = ["Executing", "Waiting", "Investigating", "Paused", "Blocked"];

export async function updateAgentStatus(formData: FormData) {
  const agentId = String(formData.get("agentId") ?? "");
  const organizationId = String(formData.get("organizationId") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!agentId || !organizationId || !allowedAgentStatuses.includes(status)) {
    throw new Error("Invalid agent status update.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("You must be signed in to manage agents.");
  }

  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .update({ status })
    .eq("id", agentId)
    .eq("organization_id", organizationId)
    .select("id, name")
    .single();

  if (agentError) {
    throw agentError;
  }

  await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    actor_user_id: userData.user.id,
    actor_agent_id: agent.id,
    event_type: "agent_status_updated",
    event_summary: `${agent.name} marked ${status}`,
    metadata: { source: "agents_workspace", status },
  });

  revalidatePath("/app");
  revalidatePath("/app/agents");
}

export async function assignTicketToAgent(formData: FormData) {
  const agentId = String(formData.get("agentId") ?? "");
  const ticketId = String(formData.get("ticketId") ?? "");
  const organizationId = String(formData.get("organizationId") ?? "");

  if (!agentId || !ticketId || !organizationId) {
    throw new Error("Ticket and agent are required.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("You must be signed in to assign tickets.");
  }

  const [{ data: agent, error: agentError }, { data: ticket, error: ticketError }] = await Promise.all([
    supabase
      .from("agents")
      .select("id, name")
      .eq("id", agentId)
      .eq("organization_id", organizationId)
      .single(),
    supabase
      .from("tickets")
      .update({ assigned_agent_id: agentId, status: "triaging" })
      .eq("id", ticketId)
      .eq("organization_id", organizationId)
      .select("id, external_id, title")
      .single(),
  ]);

  if (agentError) {
    throw agentError;
  }

  if (ticketError) {
    throw ticketError;
  }

  await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    actor_user_id: userData.user.id,
    actor_agent_id: agent.id,
    ticket_id: ticket.id,
    event_type: "ticket_assigned",
    event_summary: `${ticket.external_id ?? "Ticket"} assigned to ${agent.name}`,
    metadata: { source: "agents_workspace", ticket_title: ticket.title },
  });

  await supabase.from("agent_runs").insert({
    organization_id: organizationId,
    agent_id: agent.id,
    ticket_id: ticket.id,
    status: "running",
    model: "ticketos-simulator",
    input: { source: "manual_assignment", ticket_title: ticket.title },
    output: { detail: "Agent accepted the ticket and started triage." },
    started_at: new Date().toISOString(),
  });

  revalidatePath("/app");
  revalidatePath("/app/agents");
  revalidatePath("/app/memory");
  revalidatePath(`/app/tickets/${ticket.id}`);
}

export async function updateAgentMemory(formData: FormData) {
  const agentId = String(formData.get("agentId") ?? "");
  const organizationId = String(formData.get("organizationId") ?? "");
  const memoryScope = String(formData.get("memoryScope") ?? "").trim();
  const capabilities = String(formData.get("capabilities") ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (!agentId || !organizationId || !memoryScope) {
    throw new Error("Agent and memory scope are required.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("You must be signed in to update agent memory.");
  }

  const { data: agent, error } = await supabase
    .from("agents")
    .update({
      memory_scope: memoryScope,
      capabilities,
    })
    .eq("id", agentId)
    .eq("organization_id", organizationId)
    .select("id, name")
    .single();

  if (error) {
    throw error;
  }

  await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    actor_user_id: userData.user.id,
    actor_agent_id: agent.id,
    event_type: "agent_memory_updated",
    event_summary: `${agent.name} memory scope updated`,
    metadata: { source: "memory_workspace", capabilities },
  });

  revalidatePath("/app");
  revalidatePath("/app/agents");
  revalidatePath("/app/memory");
  revalidatePath("/app/audit");
}
