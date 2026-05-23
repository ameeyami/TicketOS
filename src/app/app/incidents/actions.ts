"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function openIncident(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "");
  const ticketId = String(formData.get("ticketId") ?? "");
  const severity = String(formData.get("severity") ?? "high");
  const commander = String(formData.get("commander") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!organizationId || !ticketId || !["critical", "high", "medium"].includes(severity)) {
    throw new Error("Ticket, workspace, and severity are required.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("You must be signed in to open incidents.");
  }

  const { data: ticket, error: ticketError } = await supabase
    .from("tickets")
    .update({ status: "blocked", priority: severity === "critical" ? "critical" : "high" })
    .eq("id", ticketId)
    .eq("organization_id", organizationId)
    .select("id, external_id, title")
    .single();

  if (ticketError) {
    throw ticketError;
  }

  await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    actor_user_id: userData.user.id,
    ticket_id: ticketId,
    event_type: "incident_opened",
    event_summary: `Incident opened for ${ticket.external_id ?? ticket.title}`,
    metadata: {
      source: "incident_room",
      severity,
      commander: commander || null,
      note: note || null,
    },
  });

  if (note) {
    await supabase.from("ticket_comments").insert({
      organization_id: organizationId,
      ticket_id: ticketId,
      author_user_id: userData.user.id,
      body: note,
      metadata: { source: "incident_room", action: "opened", severity, commander: commander || null },
    });
  }

  revalidateIncidentPaths(ticketId);
}

export async function resolveIncident(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "");
  const ticketId = String(formData.get("ticketId") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (!organizationId || !ticketId) {
    throw new Error("Ticket and workspace are required.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("You must be signed in to resolve incidents.");
  }

  const { data: ticket, error } = await supabase
    .from("tickets")
    .update({ status: "executing" })
    .eq("id", ticketId)
    .eq("organization_id", organizationId)
    .select("id, external_id, title")
    .single();

  if (error) {
    throw error;
  }

  await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    actor_user_id: userData.user.id,
    ticket_id: ticketId,
    event_type: "incident_resolved",
    event_summary: `Incident resolved for ${ticket.external_id ?? ticket.title}`,
    metadata: { source: "incident_room", note: note || null },
  });

  if (note) {
    await supabase.from("ticket_comments").insert({
      organization_id: organizationId,
      ticket_id: ticketId,
      author_user_id: userData.user.id,
      body: note,
      metadata: { source: "incident_room", action: "resolved" },
    });
  }

  revalidateIncidentPaths(ticketId);
}

function revalidateIncidentPaths(ticketId: string) {
  revalidatePath("/app");
  revalidatePath("/app/incidents");
  revalidatePath("/app/tickets");
  revalidatePath(`/app/tickets/${ticketId}`);
  revalidatePath("/app/escalations");
  revalidatePath("/app/audit");
  revalidatePath("/app/reports");
}
