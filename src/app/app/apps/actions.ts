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

  const { error: upsertError } = await supabase.from("integrations").upsert(
    {
      organization_id: organization.id,
      provider_key: slug,
      display_name: name,
      status: "connected",
      scopes: ["read", "execute"],
      config: { source: "app_catalog", category },
      connected_by: userData.user.id,
      connected_at: new Date().toISOString(),
    },
    { onConflict: "organization_id,provider_key" },
  );

  if (upsertError) {
    back.set("notice", "error");
    redirect(`/app/apps?${back.toString()}`);
  }

  await supabase.from("audit_logs").insert({
    organization_id: organization.id,
    actor_user_id: userData.user.id,
    event_type: "app_connected",
    event_summary: `${name} connected`,
    metadata: { source: "app_catalog", provider_key: slug, category },
  });

  revalidatePath("/app/apps");
  revalidatePath("/app/integrations");
  back.set("notice", "connected");
  redirect(`/app/apps?${back.toString()}`);
}
