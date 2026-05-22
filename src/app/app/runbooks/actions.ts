"use server";

import { revalidatePath } from "next/cache";
import { policyRuleTemplates } from "@/lib/policy-rule-templates";
import { runbookPacks, type RunbookPackKey } from "@/lib/runbook-packs";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { workflowTemplates } from "@/lib/workflow-templates";

export async function installRunbookPack(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "");
  const packKey = String(formData.get("packKey") ?? "") as RunbookPackKey;
  const pack = runbookPacks[packKey];

  if (!organizationId || !pack) {
    throw new Error("Choose a valid runbook pack.");
  }

  const workflowTemplate = workflowTemplates[pack.workflowTemplate];
  const policyTemplate = policyRuleTemplates[pack.policyTemplate];

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("You must be signed in to install runbooks.");
  }

  const { data: workflow, error: workflowError } = await supabase
    .from("workflows")
    .upsert(
      {
        organization_id: organizationId,
        name: workflowTemplate.name,
        description: workflowTemplate.description,
        trigger_type: workflowTemplate.trigger_type,
        is_active: true,
      },
      { onConflict: "organization_id,name" },
    )
    .select("id, name")
    .single();

  if (workflowError) {
    throw workflowError;
  }

  const { data: existingVersion } = await supabase
    .from("workflow_versions")
    .select("id")
    .eq("workflow_id", workflow.id)
    .eq("version", 1)
    .maybeSingle();

  if (!existingVersion) {
    const { error: versionError } = await supabase.from("workflow_versions").insert({
      organization_id: organizationId,
      workflow_id: workflow.id,
      version: 1,
      created_by: userData.user.id,
      graph: {
        ...workflowTemplate.graph,
        template: pack.workflowTemplate,
        runbook_pack: packKey,
        created_from: "runbook_library",
      },
    });

    if (versionError) {
      throw versionError;
    }
  }

  const { data: policy, error: policyError } = await supabase
    .from("policy_rules")
    .insert({
      organization_id: organizationId,
      name: policyTemplate.name,
      description: policyTemplate.description,
      action_pattern: policyTemplate.action_pattern,
      decision: policyTemplate.decision,
      conditions: {
        ...policyTemplate.conditions,
        runbook_pack: packKey,
      },
      is_active: true,
    })
    .select("id, name")
    .single();

  if (policyError) {
    throw policyError;
  }

  await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    actor_user_id: userData.user.id,
    event_type: "runbook_pack_installed",
    event_summary: `${pack.title} runbook installed`,
    metadata: {
      source: "runbook_library",
      pack: packKey,
      workflow_id: workflow.id,
      policy_id: policy.id,
    },
  });

  revalidatePath("/app");
  revalidatePath("/app/runbooks");
  revalidatePath("/app/workflows");
  revalidatePath(`/app/workflows/${workflow.id}`);
  revalidatePath("/app/policies");
  revalidatePath("/app/audit");
  revalidatePath("/app/intelligence");
}
