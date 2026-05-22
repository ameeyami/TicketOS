export type IntegrationActionDefinition = {
  action_key: string;
  display_name: string;
  risk_level: "low" | "medium" | "high";
  requires_approval: boolean;
  schema: {
    inputs: string[];
    output: string;
    approval_reason?: string;
  };
};

export const integrationActionCatalog: Record<string, IntegrationActionDefinition[]> = {
  slack: [
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
      schema: { inputs: ["group_email", "user_email"], output: "membership_id" },
    },
    {
      action_key: "suspend_workspace_user",
      display_name: "Suspend Workspace user",
      risk_level: "high",
      requires_approval: true,
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
      schema: {
        inputs: ["org", "username", "reason"],
        output: "removal_event_id",
        approval_reason: "Removing a member can break ownership and deployments.",
      },
    },
  ],
};

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
