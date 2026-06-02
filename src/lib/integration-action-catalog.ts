export type InverseActionDefinition = {
  action_key: string;
  display_name: string;
  description: string;
};

export type IntegrationActionDefinition = {
  action_key: string;
  display_name: string;
  risk_level: "low" | "medium" | "high";
  requires_approval: boolean;
  /**
   * The action that restores the prior state. Present only when the action is
   * safely reversible — this is what powers one-click rollback in TicketOS.
   */
  inverse?: InverseActionDefinition;
  schema: {
    inputs: string[];
    output: string;
    approval_reason?: string;
  };
};

export const integrationActionCatalog: Record<string, IntegrationActionDefinition[]> = {
  slack: [
    {
      action_key: "post_message",
      display_name: "Post Slack message",
      risk_level: "low",
      requires_approval: false,
      inverse: {
        action_key: "delete_message",
        display_name: "Delete Slack message",
        description: "Delete the message TicketOS posted to Slack.",
      },
      schema: { inputs: ["channel", "text"], output: "message_ts" },
    },
    {
      action_key: "send_ephemeral_message",
      display_name: "Send employee message",
      risk_level: "low",
      requires_approval: false,
      schema: { inputs: ["user_id", "message"], output: "message_ts" },
    },
    {
      action_key: "create_it_channel",
      display_name: "Create incident channel",
      risk_level: "medium",
      requires_approval: false,
      inverse: {
        action_key: "archive_it_channel",
        display_name: "Archive incident channel",
        description: "Archive the channel TicketOS created.",
      },
      schema: { inputs: ["channel_name", "members"], output: "channel_id" },
    },
  ],
  teams: [
    {
      action_key: "send_user_notification",
      display_name: "Send user notification",
      risk_level: "low",
      requires_approval: false,
      schema: { inputs: ["user_email", "message"], output: "message_id" },
    },
    {
      action_key: "create_support_thread",
      display_name: "Create support thread",
      risk_level: "medium",
      requires_approval: false,
      inverse: {
        action_key: "close_support_thread",
        display_name: "Close support thread",
        description: "Close the support thread TicketOS opened.",
      },
      schema: { inputs: ["team_id", "subject"], output: "thread_id" },
    },
  ],
  okta: [
    {
      action_key: "reset_password",
      display_name: "Reset password",
      risk_level: "medium",
      requires_approval: false,
      schema: { inputs: ["user_id", "notify_user"], output: "reset_event_id" },
    },
    {
      action_key: "suspend_user",
      display_name: "Suspend user",
      risk_level: "high",
      requires_approval: true,
      inverse: {
        action_key: "unsuspend_user",
        display_name: "Unsuspend user",
        description: "Restore the suspended Okta account and re-enable access.",
      },
      schema: {
        inputs: ["user_id", "reason"],
        output: "suspension_event_id",
        approval_reason: "Account suspension can interrupt business access.",
      },
    },
  ],
  jira: [
    {
      action_key: "create_it_ticket",
      display_name: "Create IT ticket",
      risk_level: "low",
      requires_approval: false,
      schema: { inputs: ["project_key", "summary", "description"], output: "issue_key" },
    },
    {
      action_key: "transition_ticket",
      display_name: "Transition ticket",
      risk_level: "low",
      requires_approval: false,
      schema: { inputs: ["issue_key", "status"], output: "transition_id" },
    },
  ],
  "google-workspace": [
    {
      action_key: "add_group_member",
      display_name: "Add group member",
      risk_level: "medium",
      requires_approval: false,
      inverse: {
        action_key: "remove_group_member",
        display_name: "Remove group member",
        description: "Remove the member TicketOS added to the group.",
      },
      schema: { inputs: ["group_email", "user_email"], output: "membership_id" },
    },
    {
      action_key: "suspend_workspace_user",
      display_name: "Suspend Workspace user",
      risk_level: "high",
      requires_approval: true,
      inverse: {
        action_key: "restore_workspace_user",
        display_name: "Restore Workspace user",
        description: "Restore the Workspace account and re-enable email and file access.",
      },
      schema: {
        inputs: ["user_email", "reason"],
        output: "admin_event_id",
        approval_reason: "Workspace suspension can affect email and file access.",
      },
    },
  ],
  github: [
    {
      action_key: "invite_to_team",
      display_name: "Invite to team",
      risk_level: "medium",
      requires_approval: true,
      inverse: {
        action_key: "remove_from_team",
        display_name: "Remove from team",
        description: "Remove the team membership TicketOS granted.",
      },
      schema: {
        inputs: ["org", "team_slug", "username"],
        output: "invitation_id",
        approval_reason: "Repository access can expose source code and production assets.",
      },
    },
    {
      action_key: "remove_org_member",
      display_name: "Remove organization member",
      risk_level: "high",
      requires_approval: true,
      inverse: {
        action_key: "invite_to_team",
        display_name: "Re-invite organization member",
        description: "Re-invite the member TicketOS removed from the organization.",
      },
      schema: {
        inputs: ["org", "username", "reason"],
        output: "removal_event_id",
        approval_reason: "Removing a member can break ownership and deployments.",
      },
    },
  ],
};

/**
 * Returns the inverse (rollback) definition for a provider action, or null when
 * the action is not safely reversible (e.g. a password reset or a notification).
 */
export function getInverseAction(providerKey: string, actionKey: string): InverseActionDefinition | null {
  const match = (integrationActionCatalog[providerKey] ?? []).find((action) => action.action_key === actionKey);
  return match?.inverse ?? null;
}

export function getCatalogForProvider(providerKey: string) {
  return integrationActionCatalog[providerKey] ?? [
    {
      action_key: "read_resource",
      display_name: "Read resource",
      risk_level: "low",
      requires_approval: false,
      schema: { inputs: ["resource_id"], output: "resource" },
    },
  ];
}
