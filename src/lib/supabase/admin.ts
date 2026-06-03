import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client for trusted server-side contexts that have NO
 * user session — specifically the public REST API (authenticated by an org API
 * key) and the embeddable widget endpoint. It bypasses RLS, so it must only ever
 * be used after the caller's org has been resolved from a validated secret.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY. When it's absent, hasServiceRole() is false
 * and the API/widget endpoints return 503 instead of crashing.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function hasServiceRole(): boolean {
  return Boolean(url && serviceRoleKey);
}

let cached: SupabaseClient | null = null;

export function createSupabaseAdminClient(): SupabaseClient {
  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  }
  if (!cached) {
    cached = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}

export type AdminClient = SupabaseClient;
