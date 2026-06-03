import { cleanApiKey } from "@/lib/ai/client";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Resolve an org from a public widget key. Returns null unless the key matches
 * and the widget is enabled. Used only by the public widget endpoints, which
 * have already checked hasServiceRole().
 */
export async function resolveWidgetOrg(
  key: string,
): Promise<{ organizationId: string; name: string; anthropicKey: string | null } | null> {
  const trimmed = key.trim();
  if (!trimmed) return null;

  const admin = createSupabaseAdminClient();
  const { data: org } = await admin
    .from("organizations")
    .select("id, name, widget_enabled")
    .eq("widget_key", trimmed)
    .maybeSingle();

  if (!org || !org.widget_enabled) return null;

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
