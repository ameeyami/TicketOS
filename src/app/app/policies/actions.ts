"use server";

import { revalidatePath } from "next/cache";
import { policyRuleTemplates, type PolicyRuleTemplateKey } from "@/lib/policy-rule-templates";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const allowedDecisions = ["allow", "approval_required", "block"];

export async function createPolicyRule(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const actionPattern = String(formData.get("actionPattern") ?? "").trim();
  const decision = String(formData.get("decision") ?? "");
  const conditionsText = String(formData.get("conditions") ?? "").trim();
  const isActive = String(formData.get("isActive") ?? "on") === "on";

  if (!organizationId || !name || !description || !actionPattern || !allowedDecisions.includes(decision)) {
    throw new Error("Policy name, action pattern, decision, and description are required.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("You must be signed in to create policy rules.");
  }

  const { data: policy, error } = await supabase
    .from("policy_rules")
    .insert({
      organization_id: organizationId,
      name,
      description,
      action_pattern: actionPattern,
      decision,
      conditions: readConditions(conditionsText),
      is_active: isActive,
    })
    .select("id, name")
    .single();

  if (error) {
    throw error;
  }

  await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    actor_user_id: userData.user.id,
    event_type: "policy_rule_created",
    event_summary: `${policy.name} policy created`,
    metadata: { source: "policy_workspace", decision, active: isActive },
  });

  revalidatePolicyPaths();
}

export async function createPolicyFromTemplate(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "");
  const templateKey = String(formData.get("templateKey") ?? "") as PolicyRuleTemplateKey;
  const template = policyRuleTemplates[templateKey];

  if (!organizationId || !template) {
    throw new Error("Choose a policy template.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("You must be signed in to create policy rules.");
  }

  const { data: policy, error } = await supabase
    .from("policy_rules")
    .insert({
      organization_id: organizationId,
      name: template.name,
      description: template.description,
      action_pattern: template.action_pattern,
      decision: template.decision,
      conditions: template.conditions,
      is_active: true,
    })
    .select("id, name")
    .single();

  if (error) {
    throw error;
  }

  await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    actor_user_id: userData.user.id,
    event_type: "policy_rule_created",
    event_summary: `${policy.name} policy created from template`,
    metadata: { source: "policy_templates", template: templateKey },
  });

  revalidatePolicyPaths();
}

export async function updatePolicyRuleStatus(formData: FormData) {
  const policyId = String(formData.get("policyId") ?? "");
  const organizationId = String(formData.get("organizationId") ?? "");
  const isActive = String(formData.get("isActive") ?? "") === "true";

  if (!policyId || !organizationId) {
    throw new Error("Policy rule and organization are required.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("You must be signed in to manage policy rules.");
  }

  const { data: policy, error } = await supabase
    .from("policy_rules")
    .update({ is_active: isActive })
    .eq("id", policyId)
    .eq("organization_id", organizationId)
    .select("id, name")
    .single();

  if (error) {
    throw error;
  }

  await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    actor_user_id: userData.user.id,
    event_type: isActive ? "policy_rule_activated" : "policy_rule_paused",
    event_summary: `${policy.name} ${isActive ? "activated" : "paused"}`,
    metadata: { source: "policy_workspace" },
  });

  revalidatePolicyPaths();
}

function readConditions(value: string) {
  if (!value) {
    return {};
  }

  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return { note: value };
  }
}

function revalidatePolicyPaths() {
  revalidatePath("/app");
  revalidatePath("/app/policies");
  revalidatePath("/app/workflows");
  revalidatePath("/app/audit");
  revalidatePath("/app/intelligence");
}
