import type { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSlackConfigured, slackDeleteMessage, slackPostMessage } from "@/lib/integrations/slack";
import { isJiraConfigured, jiraCreateIssue, jiraDeleteIssue } from "@/lib/integrations/jira";

type SupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;
type Json = Record<string, unknown>;

type PolicyRule = { name: string; decision: string; action_pattern: string | null };
type PendingRow = {
  id: string;
  integration_key: string;
  action_key: string;
  request_payload: ({ approval_id?: string } & Json) | null;
};

export function isProviderConfigured(integrationKey: string): boolean {
  if (integrationKey === "slack") return isSlackConfigured();
  if (integrationKey === "jira") return isJiraConfigured();
  return false;
}

/** Calls the real provider API for a known action. */
async function providerExecute(
  integrationKey: string,
  actionKey: string,
  request: Json,
): Promise<{ ok: boolean; response: Json; error?: string }> {
  if (integrationKey === "slack" && actionKey === "post_message") {
    const result = await slackPostMessage(String(request.text ?? ""));
    return result.ok
      ? { ok: true, response: { detail: "Posted message to Slack.", channel: result.channel, ts: result.ts } }
      : { ok: false, response: {}, error: result.error };
  }
  if (integrationKey === "jira" && actionKey === "create_issue") {
    const result = await jiraCreateIssue(
      String(request.summary ?? "TicketOS task"),
      request.description ? String(request.description) : undefined,
    );
    return result.ok
      ? { ok: true, response: { detail: `Created Jira issue ${result.key}.`, key: result.key, id: result.id, url: result.url } }
      : { ok: false, response: {}, error: result.error };
  }
  return { ok: false, response: {}, error: "unknown_action" };
}

/** Calls the real provider API to undo a known action. Unknown actions are no-ops. */
export async function providerReverse(
  integrationKey: string,
  actionKey: string,
  response: Json,
): Promise<{ ok: boolean; error?: string }> {
  if (integrationKey === "slack" && actionKey === "post_message") {
    const channel = String(response.channel ?? "");
    const ts = String(response.ts ?? "");
    if (!channel || !ts) return { ok: true };
    return slackDeleteMessage(channel, ts);
  }
  if (integrationKey === "jira" && actionKey === "create_issue") {
    const key = String(response.key ?? "");
    if (!key) return { ok: true };
    return jiraDeleteIssue(key);
  }
  return { ok: true };
}

function evaluatePolicy(rules: PolicyRule[], integrationKey: string, actionKey: string) {
  const full = `${integrationKey}.${actionKey}`.toLowerCase();
  const matches = rules.filter((rule) => {
    const pattern = (rule.action_pattern ?? "").toLowerCase();
    return pattern === integrationKey || pattern === `${integrationKey}.*` || pattern === full || pattern.startsWith(`${integrationKey}.`);
  });
  const block = matches.find((m) => m.decision === "block");
  if (block) return { decision: "block" as const, name: block.name };
  const approval = matches.find((m) => m.decision === "approval_required");
  if (approval) return { decision: "approval_required" as const, name: approval.name };
  return { decision: "allow" as const, name: null };
}

async function recordAction(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  args: { integrationKey: string; actionKey: string; status: string; request: Json; response?: Json; error?: string | null; source?: string },
) {
  await supabase.from("execution_actions").insert({
    organization_id: organizationId,
    integration_key: args.integrationKey,
    action_key: args.actionKey,
    status: args.status,
    request_payload: args.request,
    response_payload: args.response ?? {},
    error_message: args.error ?? null,
  });
  await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    actor_user_id: userId,
    event_type: `execution_action_${args.status}`,
    event_summary: `${args.integrationKey}.${args.actionKey} ${args.status}`,
    metadata: { source: args.source ?? "workflow", real: true },
  });
}

export type GateOutcome = { outcome: "not_configured" | "blocked" | "queued" | "executed" | "failed"; detail: string };

/**
 * The one gate every real provider action goes through:
 * policy (block / approval_required / allow) → role → execute / park / block.
 */
export async function runGatedAction(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  role: string,
  spec: { integrationKey: string; actionKey: string; request: Json; source?: string },
): Promise<GateOutcome> {
  if (!isProviderConfigured(spec.integrationKey)) {
    return { outcome: "not_configured", detail: `${spec.integrationKey} is not configured.` };
  }

  const { data: rules } = await supabase
    .from("policy_rules")
    .select("name, decision, action_pattern, is_active")
    .eq("organization_id", organizationId)
    .eq("is_active", true);
  const policy = evaluatePolicy((rules ?? []) as PolicyRule[], spec.integrationKey, spec.actionKey);
  const isManager = role === "owner" || role === "admin";

  if (policy.decision === "block") {
    await recordAction(supabase, organizationId, userId, {
      integrationKey: spec.integrationKey,
      actionKey: spec.actionKey,
      status: "blocked",
      request: { ...spec.request, decision: policy.decision, policy: policy.name },
      error: `Blocked by policy "${policy.name}".`,
      source: spec.source,
    });
    return { outcome: "blocked", detail: `Blocked by policy "${policy.name}".` };
  }

  if (policy.decision === "approval_required" && !isManager) {
    const { data: approvalRow } = await supabase
      .from("approval_requests")
      .insert({
        organization_id: organizationId,
        title: `${spec.integrationKey} action requires approval`,
        description: `Approve before TicketOS runs ${spec.integrationKey}.${spec.actionKey}.`,
        status: "pending",
      })
      .select("id")
      .single();

    await supabase.from("execution_actions").insert({
      organization_id: organizationId,
      integration_key: spec.integrationKey,
      action_key: spec.actionKey,
      status: "pending",
      request_payload: {
        ...spec.request,
        approval_id: approvalRow?.id ?? null,
        decision: policy.decision,
        policy: policy.name,
        source: spec.source,
        note: "Awaiting manager approval.",
      },
      response_payload: {},
    });
    await supabase.from("audit_logs").insert({
      organization_id: organizationId,
      actor_user_id: userId,
      event_type: "execution_action_pending",
      event_summary: `${spec.integrationKey}.${spec.actionKey} queued for approval`,
      metadata: { source: spec.source ?? "workflow", approval_id: approvalRow?.id ?? null },
    });
    return { outcome: "queued", detail: "Queued for manager approval." };
  }

  const result = await providerExecute(spec.integrationKey, spec.actionKey, spec.request);
  await recordAction(supabase, organizationId, userId, {
    integrationKey: spec.integrationKey,
    actionKey: spec.actionKey,
    status: result.ok ? "succeeded" : "failed",
    request: { ...spec.request, decision: policy.decision, policy: policy.name },
    response: result.response,
    error: result.ok ? null : `${spec.integrationKey} error: ${result.error}`,
    source: spec.source,
  });
  return result.ok
    ? { outcome: "executed", detail: String(result.response.detail ?? "Done.") }
    : { outcome: "failed", detail: `Failed: ${result.error}` };
}

/** On approval, run the real provider action(s) parked for this approval. */
export async function fulfillPendingApproval(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  approvalId: string,
): Promise<number> {
  const { data: pending } = await supabase
    .from("execution_actions")
    .select("id, integration_key, action_key, request_payload")
    .eq("organization_id", organizationId)
    .eq("status", "pending");

  const matches = ((pending ?? []) as PendingRow[]).filter((a) => a.request_payload?.approval_id === approvalId);

  for (const action of matches) {
    const result = await providerExecute(action.integration_key, action.action_key, (action.request_payload ?? {}) as Json);
    await supabase
      .from("execution_actions")
      .update({
        status: result.ok ? "succeeded" : "failed",
        response_payload: result.ok ? result.response : {},
        error_message: result.ok ? null : `${action.integration_key} error: ${result.error}`,
      })
      .eq("id", action.id)
      .eq("organization_id", organizationId);

    await supabase.from("audit_logs").insert({
      organization_id: organizationId,
      actor_user_id: userId,
      event_type: `execution_action_${result.ok ? "succeeded" : "failed"}`,
      event_summary: `${action.integration_key}.${action.action_key} ${result.ok ? "succeeded" : "failed"} after approval`,
      metadata: { source: "approval_action", real: true, approval_id: approvalId },
    });
  }

  return matches.length;
}

/** On rejection, mark the parked provider action(s) as blocked. */
export async function cancelPendingApproval(
  supabase: SupabaseClient,
  organizationId: string,
  approvalId: string,
): Promise<void> {
  const { data: pending } = await supabase
    .from("execution_actions")
    .select("id, integration_key, action_key, request_payload")
    .eq("organization_id", organizationId)
    .eq("status", "pending");

  const matches = ((pending ?? []) as PendingRow[]).filter((a) => a.request_payload?.approval_id === approvalId);

  for (const action of matches) {
    await supabase
      .from("execution_actions")
      .update({ status: "blocked", error_message: "Rejected by approver." })
      .eq("id", action.id)
      .eq("organization_id", organizationId);
  }
}
