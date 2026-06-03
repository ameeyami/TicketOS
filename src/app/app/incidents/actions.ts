"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { analyzeIncidentCluster, type IncidentAnalysis } from "@/lib/ai/incident";
import { getOrgAnthropicKey } from "@/lib/ai/org-key";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** AI-assess a detected cluster (root cause + runbook). Returns null if blocked. */
export async function analyzeCluster(ticketIds: string[]): Promise<IncidentAnalysis | null> {
  const ids = ticketIds.filter(Boolean);
  if (ids.length === 0) return null;

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return null;

  const organization = await ensureWorkspace(supabase, userData.user);
  const { data: tickets } = await supabase
    .from("tickets")
    .select("id, external_id, title, ai_summary, category")
    .eq("organization_id", organization.id)
    .in("id", ids);

  if (!tickets || tickets.length === 0) return null;

  const apiKey = await getOrgAnthropicKey(supabase, organization.id);
  return analyzeIncidentCluster(
    {
      tickets: tickets.map((t) => ({
        ref: t.external_id ?? t.id.slice(0, 8),
        title: t.title,
        summary: t.ai_summary,
        category: t.category,
      })),
    },
    apiKey,
  );
}

/** Declare a major incident: parent ticket + linked child tickets + suggested runbook article. */
export async function declareIncident(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const impact = String(formData.get("impact") ?? "").trim();
  const severity = String(formData.get("severity") ?? "sev2").trim();
  const rootCause = String(formData.get("rootCause") ?? "").trim();

  let runbook: string[] = [];
  let ticketIds: string[] = [];
  try {
    const parsed = JSON.parse(String(formData.get("runbook") ?? "[]"));
    if (Array.isArray(parsed)) runbook = parsed.map((s) => String(s));
  } catch {
    runbook = [];
  }
  try {
    const parsed = JSON.parse(String(formData.get("ticketIds") ?? "[]"));
    if (Array.isArray(parsed)) ticketIds = parsed.map((s) => String(s)).filter(Boolean);
  } catch {
    ticketIds = [];
  }

  if (!title) {
    throw new Error("An incident title is required.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new Error("You must be signed in to declare an incident.");
  }

  const organization = await ensureWorkspace(supabase, userData.user);
  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organization.id)
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if ((membership?.role ?? "operator") === "viewer") {
    throw new Error("Viewers can't declare incidents.");
  }

  const { data: children } = await supabase
    .from("tickets")
    .select("id, external_id, title")
    .eq("organization_id", organization.id)
    .in("id", ticketIds.length ? ticketIds : ["00000000-0000-0000-0000-000000000000"]);

  const childRows = children ?? [];
  const refs = childRows.map((c) => c.external_id ?? c.id.slice(0, 8)).join(", ");

  const { count } = await supabase
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organization.id);
  const externalId = `INC-${1900 + Number(count ?? 0) + 1}`;

  const runbookText = runbook.map((s, i) => `${i + 1}. ${s}`).join("\n");
  const description = [
    impact,
    rootCause ? `\nRoot-cause hypothesis: ${rootCause}` : "",
    runbookText ? `\nRunbook:\n${runbookText}` : "",
    `\nLinked tickets: ${refs || "—"}`,
  ]
    .filter(Boolean)
    .join("\n");

  const { data: incident, error: incidentError } = await supabase
    .from("tickets")
    .insert({
      organization_id: organization.id,
      external_id: externalId,
      title: `[Major incident] ${title}`,
      description,
      requester_name: userData.user.email,
      requester_email: userData.user.email,
      source: "aiops",
      category: "Incident",
      priority: severity === "sev1" ? "critical" : "high",
      status: "executing",
      ai_summary: impact || `Major incident grouping ${childRows.length} related tickets.`,
      ai_confidence: 0,
    })
    .select("id, external_id")
    .single();

  if (incidentError) {
    throw incidentError;
  }

  // Link each child ticket to the incident with a comment trail.
  for (const child of childRows) {
    await supabase.from("ticket_comments").insert({
      organization_id: organization.id,
      ticket_id: child.id,
      author_user_id: userData.user.id,
      body: `Linked to major incident ${incident.external_id}: ${title}`,
      metadata: { source: "aiops_incident", incident_id: incident.id },
    });
  }

  // Save the runbook as a suggested knowledge article (reuses auto-knowledge).
  if (runbook.length > 0) {
    await supabase.from("knowledge_articles").insert({
      organization_id: organization.id,
      title: `Runbook: ${title}`,
      body: [impact, rootCause ? `Root-cause hypothesis: ${rootCause}` : "", `Steps:\n${runbookText}`]
        .filter(Boolean)
        .join("\n\n"),
      category: "Incident response",
      status: "suggested",
      source_ticket_id: incident.id,
      created_by: userData.user.id,
    });
  }

  await supabase.from("audit_logs").insert({
    organization_id: organization.id,
    actor_user_id: userData.user.id,
    ticket_id: incident.id,
    event_type: "incident_declared",
    event_summary: `Major incident declared: ${title}`,
    metadata: { source: "aiops", severity, linked_tickets: childRows.length, runbook_steps: runbook.length },
  });

  revalidatePath("/app/incidents");
  revalidatePath("/app/knowledge");
  revalidatePath("/app/tickets");
  redirect(`/app/tickets/${incident.id}`);
}
