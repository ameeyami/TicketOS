"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const allowedActionStatuses = ["pending", "running", "succeeded", "failed", "blocked", "skipped"];

export async function updateExecutionActionStatus(formData: FormData) {
  const actionId = String(formData.get("actionId") ?? "");
  const organizationId = String(formData.get("organizationId") ?? "");
  const status = String(formData.get("status") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (!actionId || !organizationId || !allowedActionStatuses.includes(status)) {
    throw new Error("Invalid execution action update.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("You must be signed in to update execution actions.");
  }

  const { data: action, error } = await supabase
    .from("execution_actions")
    .update({
      status,
      error_message: status === "failed" || status === "blocked" ? note || "Operator marked action." : null,
      response_payload:
        status === "succeeded"
          ? { detail: note || "Operator verified action output.", verified_at: new Date().toISOString() }
          : {},
    })
    .eq("id", actionId)
    .eq("organization_id", organizationId)
    .select("id, workflow_run_id, integration_key, action_key")
    .single();

  if (error) {
    throw error;
  }

  await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    actor_user_id: userData.user.id,
    workflow_run_id: action.workflow_run_id,
    event_type: `execution_action_${status}`,
    event_summary: `${action.integration_key}.${action.action_key} marked ${status}`,
    metadata: { source: "execution_console", note: note || null },
  });

  revalidatePath("/app");
  revalidatePath("/app/executions");
  revalidatePath("/app/audit");
  revalidatePath("/app/intelligence");
}
