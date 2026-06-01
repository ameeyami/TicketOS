"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function connectApp(formData: FormData) {
  const slug = String(formData.get("slug") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "All");

  if (!slug || !name) {
    throw new Error("App is required.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    redirect("/auth/sign-in?message=Sign in to connect apps.");
  }

  const organization = await ensureWorkspace(supabase, userData.user);
  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organization.id)
    .eq("user_id", userData.user.id)
    .maybeSingle();

  const back = new URLSearchParams();
  if (category && category !== "All") {
    back.set("category", category);
  }

  if (membership?.role !== "owner" && membership?.role !== "admin") {
    back.set("notice", "admins-only");
    redirect(`/app/apps?${back.toString()}`);
  }

  // If it already exists, just go to its setup/manage page — never silently flip
  // a real connection.
  const { data: existing } = await supabase
    .from("integrations")
    .select("id")
    .eq("organization_id", organization.id)
    .eq("provider_key", slug)
    .maybeSingle();

  if (existing) {
    redirect(`/app/integrations/${existing.id}`);
  }

  // Add the app as NOT connected — connecting requires real setup (a workspace /
  // tenant ID) on the integration page. Clicking "Connect" must not fake it.
  const { data: created, error: insertError } = await supabase
    .from("integrations")
    .insert({
      organization_id: organization.id,
      provider_key: slug,
      display_name: name,
      status: "not_connected",
      scopes: ["read", "execute"],
      config: { source: "app_catalog", category },
    })
    .select("id")
    .single();

  if (insertError || !created) {
    back.set("notice", "error");
    redirect(`/app/apps?${back.toString()}`);
  }

  await supabase.from("audit_logs").insert({
    organization_id: organization.id,
    actor_user_id: userData.user.id,
    event_type: "app_added",
    event_summary: `${name} added — connection setup required`,
    metadata: { source: "app_catalog", provider_key: slug, category },
  });

  revalidatePath("/app/apps");
  redirect(`/app/integrations/${created.id}`);
}
