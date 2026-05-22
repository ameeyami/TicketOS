"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const autonomyModes = {
  autonomous: {
    status: "Executing",
    decision: "allow",
    summary: "Autonomous execution enabled",
  },
  supervised: {
    status: "Investigating",
    decision: "approval_required",
    summary: "Supervised execution enabled",
  },
  approval_only: {
    status: "Paused",
    decision: "approval_required",
    summary: "Approval-only execution enabled",
  },
  off: {
    status: "Blocked",
    decision: "block",
    summary: "Autonomous execution disabled",
  },
} as const;

export async function updateAgentAutonomy(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "");
  const agentId = String(formData.get("agentId") ?? "");
  const mode = String(formData.get("mode") ?? "") as keyof typeof autonomyModes;
  const note = String(formData.get("note") ?? "").trim();
  const config = autonomyModes[mode];

  if (!organizationId || !agentId || !config) {
    throw new Error("Choose a valid autonomy mode.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("You must be signed in to manage autonomy.");
  }

  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .update({ status: config.status })
    .eq("id", agentId)
    .eq("organization_id", organizationId)
    .select("id, name, capabilities")
    .single();

  if (agentError) {
    throw agentError;
  }

  const policyNames = [
    `${agent.name} autonomy approval gate`,
    `${agent.name} autonomy block`,
    `${agent.name} autonomy allow`,
  ];

  await supabase
    .from("policy_rules")
    .update({ is_active: false })
    .eq("organization_id", organizationId)
    .in("name", policyNames);

  if (mode !== "autonomous") {
    const policyName =
      mode === "off"
        ? `${agent.name} autonomy block`
        : `${agent.name} autonomy approval gate`;

    const { data: existingPolicy } = await supabase
      .from("policy_rules")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("name", policyName)
      .maybeSingle();

    const policyPayload = {
      organization_id: organizationId,
      name: policyName,
      description:
        mode === "off"
          ? `Block ${agent.name} from autonomous execution until an admin re-enables it.`
          : `Require human approval before ${agent.name} executes sensitive actions.`,
      action_pattern: `${slugify(agent.name)}.*`,
      decision: config.decision,
      conditions: {
        source: "autonomy_workspace",
        agent_id: agent.id,
        autonomy_mode: mode,
        note: note || null,
      },
      is_active: true,
    };

    const { error: policyError } = existingPolicy
      ? await supabase.from("policy_rules").update(policyPayload).eq("id", existingPolicy.id)
      : await supabase.from("policy_rules").insert(policyPayload);

    if (policyError) {
      throw policyError;
    }
  }

  await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    actor_user_id: userData.user.id,
    actor_agent_id: agent.id,
    event_type: "agent_autonomy_updated",
    event_summary: `${agent.name}: ${config.summary}`,
    metadata: {
      source: "autonomy_workspace",
      mode,
      status: config.status,
      note: note || null,
    },
  });

  revalidatePath("/app");
  revalidatePath("/app/agents");
  revalidatePath("/app/autonomy");
  revalidatePath("/app/policies");
  revalidatePath("/app/audit");
  revalidatePath("/app/notifications");
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
