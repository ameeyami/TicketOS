import { hashApiKey } from "@/lib/api/keys";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Resolve an org from a Bearer API key. Returns null for missing/invalid/revoked
 * keys. Bumps last_used_at. Assumes the service role is configured (callers
 * check hasServiceRole() first).
 */
export async function authenticateRequest(req: Request): Promise<{ organizationId: string; keyId: string } | null> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;

  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("api_keys")
    .select("id, organization_id, revoked_at")
    .eq("key_hash", hashApiKey(token))
    .maybeSingle();

  if (!data || data.revoked_at) return null;

  await admin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id);
  return { organizationId: data.organization_id, keyId: data.id };
}
