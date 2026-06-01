"use server";

import { redirect } from "next/navigation";
import { cleanApiKey, createAnthropicClient } from "@/lib/ai/client";
import { getOrgAnthropicKey } from "@/lib/ai/org-key";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function saveAnthropicKey(formData: FormData) {
  const apiKey = cleanApiKey(String(formData.get("apiKey") ?? ""));

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    redirect("/auth/sign-in?message=Sign in to connect Claude.");
  }

  const organization = await ensureWorkspace(supabase, userData.user);
  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organization.id)
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (membership?.role !== "owner" && membership?.role !== "admin") {
    redirect("/app/diagnostics?status=forbidden");
  }
  if (!apiKey || !apiKey.startsWith("sk-ant")) {
    redirect("/app/diagnostics?status=invalidkey");
  }

  const { error } = await supabase.from("integrations").upsert(
    {
      organization_id: organization.id,
      provider_key: "anthropic",
      display_name: "Anthropic Claude",
      status: "connected",
      scopes: ["messages"],
      config: { api_key: apiKey, last_four: apiKey.slice(-4) },
      connected_by: userData.user.id,
      connected_at: new Date().toISOString(),
    },
    { onConflict: "organization_id,provider_key" },
  );

  if (error) {
    redirect(`/app/diagnostics?status=error&detail=${encodeURIComponent(error.message.slice(0, 200))}`);
  }

  await supabase.from("audit_logs").insert({
    organization_id: organization.id,
    actor_user_id: userData.user.id,
    event_type: "anthropic_key_connected",
    event_summary: "Claude API key connected",
    metadata: { source: "diagnostics", last_four: apiKey.slice(-4) },
  });

  redirect("/app/diagnostics?status=saved");
}

export async function testAiConnection() {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    redirect("/auth/sign-in?message=Sign in to test AI status.");
  }

  const organization = await ensureWorkspace(supabase, userData.user);
  const apiKey = await getOrgAnthropicKey(supabase, organization.id);
  if (!apiKey) {
    redirect("/app/diagnostics?status=nokey");
  }

  const model = process.env.TICKETOS_TRIAGE_MODEL ?? "claude-opus-4-8";
  let status = "ok";
  let detail = "";

  try {
    const client = createAnthropicClient(apiKey);
    const response = await client.messages.create({
      model,
      max_tokens: 16,
      messages: [{ role: "user", content: "Reply with just the word: OK" }],
    });
    const text = response.content.find((block) => block.type === "text");
    detail = text && text.type === "text" ? text.text.trim().slice(0, 60) : "(connected, no text returned)";
  } catch (error) {
    status = "error";
    const e = error as { name?: string; status?: number; message?: string };
    detail = `${e.name ?? "Error"}${e.status ? ` (${e.status})` : ""}: ${(e.message ?? "unknown error").slice(0, 240)}`;
  }

  redirect(`/app/diagnostics?status=${status}&model=${encodeURIComponent(model)}&detail=${encodeURIComponent(detail)}`);
}
