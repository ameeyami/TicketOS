"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function updateCostBudget(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "");
  const budget = Number(String(formData.get("monthlyBudget") ?? "").trim());

  if (!organizationId || !Number.isFinite(budget) || budget < 0 || budget > 10_000_000) {
    throw new Error("Enter a valid monthly budget between 0 and 10,000,000.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("You must be signed in to update the budget.");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", userData.user.id)
    .single();

  if (membershipError) {
    throw membershipError;
  }

  if (membership.role !== "owner" && membership.role !== "admin") {
    throw new Error("Only owners and admins can update the budget.");
  }

  const { error: budgetError } = await supabase
    .from("organizations")
    .update({ monthly_ai_budget_usd: budget })
    .eq("id", organizationId);

  if (budgetError) {
    throw budgetError;
  }

  // Also keep an audit-log entry as a change history of budget edits.
  const { error } = await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    actor_user_id: userData.user.id,
    event_type: "cost_budget_updated",
    event_summary: `Monthly AI budget set to $${Math.round(budget).toLocaleString()}`,
    metadata: { source: "costs_page", monthly_budget_usd: budget },
  });

  if (error) {
    throw error;
  }

  revalidatePath("/app/costs");
  revalidatePath("/app/audit");
}
