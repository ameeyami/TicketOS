"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function exportReport(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "");
  const reportName = String(formData.get("reportName") ?? "Operations briefing").trim();

  if (!organizationId) {
    throw new Error("Workspace is required.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("You must be signed in to export reports.");
  }

  const { error } = await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    actor_user_id: userData.user.id,
    event_type: "report_exported",
    event_summary: `${reportName} exported`,
    metadata: {
      source: "reports",
      format: "executive_briefing",
      exported_at: new Date().toISOString(),
    },
  });

  if (error) {
    throw error;
  }

  revalidatePath("/app/reports");
  revalidatePath("/app/audit");
}
