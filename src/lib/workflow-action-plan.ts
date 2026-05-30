/**
 * The plan of provider actions a workflow executes, keyed by trigger type.
 *
 * This is the single source of truth shared by two callers:
 *  - the real run (`executionActionsForWorkflow` in workflows/actions.ts), and
 *  - the dry-run blast-radius preview on the workflow detail page.
 * Keeping them on the same data guarantees the preview matches what actually runs.
 */

export type PlannedAction = {
  integration_key: string;
  action_key: string;
  /** Initial status the action gets when the run starts. */
  status: "running" | "pending";
  display_name: string;
  risk_level: "low" | "medium" | "high";
  requires_approval: boolean;
  reversible: boolean;
  /** Plain-English description of the change this action makes. */
  changes: string;
  /** The system/resource the change lands on. */
  target: string;
};

const integrationLabels: Record<string, string> = {
  okta: "Okta",
  slack: "Slack",
  teams: "Microsoft Teams",
  "google-workspace": "Google Workspace",
  github: "GitHub",
  "cisco-meraki": "Cisco Meraki",
};

export function integrationLabel(key: string): string {
  return integrationLabels[key] ?? key;
}

export const workflowActionPlans: Record<string, PlannedAction[]> = {
  ticket_intent: [
    {
      integration_key: "okta",
      action_key: "reset_password",
      status: "running",
      display_name: "Reset password",
      risk_level: "medium",
      requires_approval: false,
      reversible: false,
      changes: "Reset the password and rotate all active sessions.",
      target: "Okta account",
    },
    {
      integration_key: "slack",
      action_key: "notify_requester",
      status: "pending",
      display_name: "Notify requester",
      risk_level: "low",
      requires_approval: false,
      reversible: false,
      changes: "Send the requester a confirmation message.",
      target: "Slack DM",
    },
  ],
  onboarding_request: [
    {
      integration_key: "google-workspace",
      action_key: "create_user",
      status: "running",
      display_name: "Create Workspace user",
      risk_level: "medium",
      requires_approval: false,
      reversible: true,
      changes: "Create the employee's Google Workspace account.",
      target: "Google Workspace",
    },
    {
      integration_key: "github",
      action_key: "invite_to_team",
      status: "pending",
      display_name: "Invite to team",
      risk_level: "medium",
      requires_approval: true,
      reversible: true,
      changes: "Invite the employee to the GitHub team.",
      target: "GitHub team",
    },
    {
      integration_key: "slack",
      action_key: "send_onboarding_message",
      status: "pending",
      display_name: "Send onboarding message",
      risk_level: "low",
      requires_approval: false,
      reversible: false,
      changes: "Send the onboarding welcome message.",
      target: "Slack DM",
    },
  ],
  security_request: [
    {
      integration_key: "okta",
      action_key: "suspend_user",
      status: "running",
      display_name: "Suspend user",
      risk_level: "high",
      requires_approval: true,
      reversible: true,
      changes: "Suspend the Okta account and revoke active sessions.",
      target: "Okta account",
    },
    {
      integration_key: "github",
      action_key: "review_owned_repositories",
      status: "pending",
      display_name: "Review owned repositories",
      risk_level: "medium",
      requires_approval: false,
      reversible: false,
      changes: "Scan repositories the contractor owns (read-only).",
      target: "GitHub repositories",
    },
    {
      integration_key: "google-workspace",
      action_key: "transfer_drive_files",
      status: "pending",
      display_name: "Transfer Drive files",
      risk_level: "high",
      requires_approval: true,
      reversible: false,
      changes: "Transfer ownership of the contractor's Drive files.",
      target: "Google Drive",
    },
  ],
  incident_signal: [
    {
      integration_key: "cisco-meraki",
      action_key: "inspect_gateway",
      status: "running",
      display_name: "Inspect gateway",
      risk_level: "low",
      requires_approval: false,
      reversible: false,
      changes: "Read gateway and tunnel status (read-only).",
      target: "Meraki gateway",
    },
    {
      integration_key: "teams",
      action_key: "notify_incident_channel",
      status: "pending",
      display_name: "Notify incident channel",
      risk_level: "low",
      requires_approval: false,
      reversible: false,
      changes: "Post a status update to the incident channel.",
      target: "Teams channel",
    },
  ],
};

export function getWorkflowActionPlan(triggerType: string): PlannedAction[] {
  return workflowActionPlans[triggerType] ?? workflowActionPlans.ticket_intent;
}

export type BlastRadius = {
  actions: PlannedAction[];
  total: number;
  approvalCount: number;
  highRiskCount: number;
  reversibleCount: number;
  irreversibleCount: number;
  systems: string[];
};

export function computeBlastRadius(triggerType: string): BlastRadius {
  const actions = getWorkflowActionPlan(triggerType);
  return {
    actions,
    total: actions.length,
    approvalCount: actions.filter((action) => action.requires_approval).length,
    highRiskCount: actions.filter((action) => action.risk_level === "high").length,
    reversibleCount: actions.filter((action) => action.reversible).length,
    irreversibleCount: actions.filter((action) => !action.reversible).length,
    systems: Array.from(new Set(actions.map((action) => integrationLabel(action.integration_key)))),
  };
}
