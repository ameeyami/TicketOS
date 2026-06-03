"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { generateApiKey } from "@/lib/api/keys";
import { createSupabaseAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function requireAdminOrg() {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user) {
    throw new Error("You must be signed in.");
  }
  const organization = await ensureWorkspace(supabase, userData.user);
  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organization.id)
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (membership?.role !== "owner" && membership?.role !== "admin") {
    throw new Error("Only an owner or admin can manage API access.");
  }
  return { organization, userId: userData.user.id };
}

export async function createApiKey(name: string): Promise<{ ok: boolean; token?: string; lastFour?: string; error?: string }> {
  if (!hasServiceRole()) {
    return { ok: false, error: "API not enabled — add SUPABASE_SERVICE_ROLE_KEY first." };
  }
  try {
    const { organization, userId } = await requireAdminOrg();
    const { token, hash, lastFour } = generateApiKey();
    const admin = createSupabaseAdminClient();
    const { error } = await admin.from("api_keys").insert({
      organization_id: organization.id,
      name: name.trim() || "API key",
      key_hash: hash,
      last_four: lastFour,
      created_by: userId,
    });
    if (error) return { ok: false, error: error.message };

    await admin.from("audit_logs").insert({
      organization_id: organization.id,
      actor_user_id: userId,
      event_type: "api_key_created",
      event_summary: `API key created (••••${lastFour})`,
      metadata: { source: "api_keys" },
    });

    revalidatePath("/app/api-keys");
    return { ok: true, token, lastFour };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

export async function revokeApiKey(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id || !hasServiceRole()) return;
  const { organization, userId } = await requireAdminOrg();
  const admin = createSupabaseAdminClient();
  await admin
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", organization.id);
  await admin.from("audit_logs").insert({
    organization_id: organization.id,
    actor_user_id: userId,
    event_type: "api_key_revoked",
    event_summary: "API key revoked",
    metadata: { source: "api_keys" },
  });
  revalidatePath("/app/api-keys");
}

export async function saveWebhook(formData: FormData) {
  if (!hasServiceRole()) return;
  const url = String(formData.get("webhookUrl") ?? "").trim();
  const regenerate = String(formData.get("regenerate") ?? "") === "on";
  const { organization, userId } = await requireAdminOrg();
  const admin = createSupabaseAdminClient();

  const update: Record<string, unknown> = { webhook_url: url || null };
  if (regenerate || (url && !(await hasSecret(admin, organization.id)))) {
    update.webhook_secret = `whsec_${randomBytes(24).toString("base64url")}`;
  }
  if (!url) {
    update.webhook_secret = null;
  }

  await admin.from("organizations").update(update).eq("id", organization.id);
  await admin.from("audit_logs").insert({
    organization_id: organization.id,
    actor_user_id: userId,
    event_type: "webhook_updated",
    event_summary: url ? "Webhook endpoint saved" : "Webhook endpoint cleared",
    metadata: { source: "api_keys" },
  });
  revalidatePath("/app/api-keys");
}

export async function enableWidget() {
  if (!hasServiceRole()) return;
  const { organization, userId } = await requireAdminOrg();
  const admin = createSupabaseAdminClient();
  const { data: org } = await admin.from("organizations").select("widget_key").eq("id", organization.id).maybeSingle();
  const update: Record<string, unknown> = { widget_enabled: true };
  if (!org?.widget_key) {
    update.widget_key = `wgt_${randomBytes(18).toString("base64url")}`;
  }
  await admin.from("organizations").update(update).eq("id", organization.id);
  await admin.from("audit_logs").insert({
    organization_id: organization.id,
    actor_user_id: userId,
    event_type: "widget_enabled",
    event_summary: "Self-service widget enabled",
    metadata: { source: "api_keys" },
  });
  revalidatePath("/app/api-keys");
}

export async function disableWidget() {
  if (!hasServiceRole()) return;
  const { organization, userId } = await requireAdminOrg();
  const admin = createSupabaseAdminClient();
  await admin.from("organizations").update({ widget_enabled: false }).eq("id", organization.id);
  await admin.from("audit_logs").insert({
    organization_id: organization.id,
    actor_user_id: userId,
    event_type: "widget_disabled",
    event_summary: "Self-service widget disabled",
    metadata: { source: "api_keys" },
  });
  revalidatePath("/app/api-keys");
}

async function hasSecret(admin: ReturnType<typeof createSupabaseAdminClient>, orgId: string): Promise<boolean> {
  const { data } = await admin.from("organizations").select("webhook_secret").eq("id", orgId).maybeSingle();
  return Boolean(data?.webhook_secret);
}
