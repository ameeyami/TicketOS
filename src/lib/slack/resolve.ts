import { cleanApiKey } from "@/lib/ai/client";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type SlackOrg = { organizationId: string; name: string; anthropicKey: string | null };

/**
 * Resolve a TicketOS org from a Slack workspace id (team_id). Returns null when
 * the workspace hasn't been linked. Used only by the signed Slack endpoints,
 * which have already checked hasServiceRole() + verified the request signature.
 */
export async function resolveSlackOrg(teamId: string): Promise<SlackOrg | null> {
  const trimmed = teamId.trim();
  if (!trimmed) return null;

  const admin = createSupabaseAdminClient();
  const { data: org } = await admin
    .from("organizations")
    .select("id, name")
    .eq("slack_team_id", trimmed)
    .maybeSingle();
  if (!org) return null;

  const { data: integration } = await admin
    .from("integrations")
    .select("config, status")
    .eq("organization_id", org.id)
    .eq("provider_key", "anthropic")
    .maybeSingle();

  const anthropicKey =
    integration?.status === "connected"
      ? cleanApiKey((integration.config as { api_key?: string } | null)?.api_key)
      : null;

  return { organizationId: org.id, name: org.name, anthropicKey };
}
