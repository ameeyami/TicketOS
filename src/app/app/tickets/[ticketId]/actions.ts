"use server";

import { draftResolution, loadAssist, type ResolutionDraft } from "@/lib/ai/assist";
import { getOrgAnthropicKey, getOrgVoyageKey } from "@/lib/ai/org-key";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** AI-draft a suggested resolution for a ticket, grounded in similar tickets + KB. */
export async function draftTicketResolution(ticketId: string): Promise<ResolutionDraft> {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user) {
    return { text: "Sign in to draft a resolution.", aiWritten: false };
  }

  const organization = await ensureWorkspace(supabase, userData.user);
  const { data: ticket } = await supabase
    .from("tickets")
    .select("id, organization_id, title, description, ai_summary")
    .eq("id", ticketId)
    .eq("organization_id", organization.id)
    .maybeSingle();

  if (!ticket) {
    return { text: "Ticket not found.", aiWritten: false };
  }

  const voyageKey = await getOrgVoyageKey(supabase, organization.id);
  const assist = await loadAssist(supabase, ticket, voyageKey);
  const anthropicKey = await getOrgAnthropicKey(supabase, organization.id);

  return draftResolution(
    { ticket, articles: assist.suggestedArticles, similarTickets: assist.similarTickets },
    anthropicKey,
  );
}
