import { cleanApiKey } from "@/lib/ai/client";
import type { createSupabaseServerClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/**
 * Each organization brings its own Anthropic key. We store it on the org's
 * "anthropic" integration row (config.api_key). All AI features use this key —
 * there is no shared/owner key, so every workspace must connect their own.
 */
export async function getOrgAnthropicKey(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("integrations")
    .select("config, status")
    .eq("organization_id", organizationId)
    .eq("provider_key", "anthropic")
    .maybeSingle();

  if (!data || data.status !== "connected") {
    return null;
  }
  return cleanApiKey((data.config as { api_key?: string } | null)?.api_key);
}

export async function getOrgAnthropicKeyMeta(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<{ connected: boolean; lastFour: string | null }> {
  const { data } = await supabase
    .from("integrations")
    .select("config, status")
    .eq("organization_id", organizationId)
    .eq("provider_key", "anthropic")
    .maybeSingle();

  const connected = Boolean(data && data.status === "connected" && (data.config as { api_key?: string } | null)?.api_key);
  const lastFour = connected ? String((data!.config as { last_four?: string }).last_four ?? "") || null : null;
  return { connected, lastFour };
}
