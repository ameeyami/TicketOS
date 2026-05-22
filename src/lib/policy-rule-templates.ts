export const policyRuleTemplates = {
  production_repo_access: {
    name: "Production repository access",
    description: "Require approval before agents grant access to production source code or deployment assets.",
    action_pattern: "github.invite_to_team",
    decision: "approval_required",
    conditions: {
      risk: "production_assets",
      requester_relationship: "manager_or_owner_required",
    },
  },
  contractor_deactivation_block: {
    name: "Contractor ownership dependency",
    description: "Block autonomous deactivation if the account owns API keys, repositories, or active automations.",
    action_pattern: "okta.suspend_user",
    decision: "block",
    conditions: {
      ownership_scan: "must_be_clear",
      escalation: "security_review",
    },
  },
  password_reset_allow: {
    name: "Verified password reset",
    description: "Allow password reset when identity, manager relationship, and notification checks pass.",
    action_pattern: "okta.reset_password",
    decision: "allow",
    conditions: {
      identity_verified: true,
      notify_user: true,
      session_rotation: true,
    },
  },
  workspace_suspension_approval: {
    name: "Workspace user suspension",
    description: "Require approval before suspending Google Workspace users.",
    action_pattern: "google-workspace.suspend_workspace_user",
    decision: "approval_required",
    conditions: {
      business_impact: "email_and_files",
      approver_role: "admin",
    },
  },
} as const;

export type PolicyRuleTemplateKey = keyof typeof policyRuleTemplates;
