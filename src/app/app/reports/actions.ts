"use server";

import { getOrgAnthropicKey } from "@/lib/ai/org-key";
import { summarizeTrends, type TrendInsight } from "@/lib/ai/insights";
import { weeklyTrends } from "@/lib/analytics";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** On-demand AI narrative of the weekly service-desk trends. */
export async function generateTrendInsight(): Promise<TrendInsight> {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return { text: "Sign in to generate insights.", aiWritten: false };
  }

  const organization = await ensureWorkspace(supabase, userData.user);
  const [{ data: tickets }, { data: queries }] = await Promise.all([
    supabase.from("tickets").select("status, created_at, resolved_at").eq("organization_id", organization.id),
    supabase.from("kb_queries").select("status, csat, created_at").eq("organization_id", organization.id),
  ]);

  const trends = weeklyTrends(tickets ?? [], queries ?? []);
  const apiKey = await getOrgAnthropicKey(supabase, organization.id);
  return summarizeTrends(trends, apiKey);
}
