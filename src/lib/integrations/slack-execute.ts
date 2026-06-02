import type { createSupabaseServerClient } from "@/lib/supabase/server";
import { slackPostMessage } from "@/lib/integrations/slack";

type SupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/**
 * Posts a real Slack message and records it as a first-class execution action
 * (so it shows in the Executions console and is reversible). Best-effort:
 * callers should check isSlackConfigured() first to avoid noisy failures.
 */
export async function executeSlackPost(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  text: string,
  options: { source?: string; extraRequest?: Record<string, unknown> } = {},
) {
  const result = await slackPostMessage(text);
  await supabase.from("execution_actions").insert({
    organization_id: organizationId,
    integration_key: "slack",
    action_key: "post_message",
    status: result.ok ? "succeeded" : "failed",
    request_payload: { text, ...(options.extraRequest ?? {}) },
    response_payload: result.ok ? { detail: "Posted message to Slack.", channel: result.channel, ts: result.ts } : {},
    error_message: result.ok ? null : `Slack error: ${result.error}`,
  });
  await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    actor_user_id: userId,
    event_type: `execution_action_${result.ok ? "succeeded" : "failed"}`,
    event_summary: `slack.post_message ${result.ok ? "succeeded" : "failed"}`,
    metadata: { source: options.source ?? "workflow", real: true },
  });
  return result;
}

type PendingAction = { id: string; request_payload: { approval_id?: string; text?: string } | null };

/** When an approval is granted, post the real Slack message(s) that were paused. */
export async function fulfillPendingSlackApproval(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  approvalId: string,
): Promise<number> {
  const { data: pending } = await supabase
    .from("execution_actions")
    .select("id, request_payload")
    .eq("organization_id", organizationId)
    .eq("integration_key", "slack")
    .eq("action_key", "post_message")
    .eq("status", "pending");

  const matches = ((pending ?? []) as PendingAction[]).filter((a) => a.request_payload?.approval_id === approvalId);

  for (const action of matches) {
    const text = String(action.request_payload?.text ?? "");
    const result = await slackPostMessage(text);
    await supabase
      .from("execution_actions")
      .update({
        status: result.ok ? "succeeded" : "failed",
        response_payload: result.ok
          ? { detail: "Posted to Slack after approval.", channel: result.channel, ts: result.ts }
          : {},
        error_message: result.ok ? null : `Slack error: ${result.error}`,
      })
      .eq("id", action.id)
      .eq("organization_id", organizationId);

    await supabase.from("audit_logs").insert({
      organization_id: organizationId,
      actor_user_id: userId,
      event_type: `execution_action_${result.ok ? "succeeded" : "failed"}`,
      event_summary: `slack.post_message ${result.ok ? "succeeded" : "failed"} after approval`,
      metadata: { source: "approval_action", real: true, approval_id: approvalId },
    });
  }

  return matches.length;
}

/** When an approval is rejected, mark the paused Slack action(s) as blocked. */
export async function cancelPendingSlackApproval(
  supabase: SupabaseClient,
  organizationId: string,
  approvalId: string,
): Promise<void> {
  const { data: pending } = await supabase
    .from("execution_actions")
    .select("id, request_payload")
    .eq("organization_id", organizationId)
    .eq("integration_key", "slack")
    .eq("action_key", "post_message")
    .eq("status", "pending");

  const matches = ((pending ?? []) as PendingAction[]).filter((a) => a.request_payload?.approval_id === approvalId);

  for (const action of matches) {
    await supabase
      .from("execution_actions")
      .update({ status: "blocked", error_message: "Rejected by approver." })
      .eq("id", action.id)
      .eq("organization_id", organizationId);
  }
}
