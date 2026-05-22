import type { PolicyRuleTemplateKey } from "@/lib/policy-rule-templates";
import type { WorkflowTemplateKey } from "@/lib/workflow-templates";

export const runbookPacks = {
  access_recovery: {
    title: "Access recovery",
    domain: "Identity",
    workflowTemplate: "identity_password_reset",
    policyTemplate: "password_reset_allow",
    outcome: "Autonomous password reset with identity verification and notification.",
    risk: "Low",
    owner: "IT helpdesk",
    signals: ["Identity verified", "Manager relationship", "Session rotation"],
  },
  new_hire_access: {
    title: "New hire access",
    domain: "Onboarding",
    workflowTemplate: "employee_onboarding",
    policyTemplate: "production_repo_access",
    outcome: "Provision app bundles while pausing production access for approval.",
    risk: "Medium",
    owner: "IT operations",
    signals: ["Manager approval", "App bundle", "Production repo scope"],
  },
  contractor_exit: {
    title: "Contractor exit",
    domain: "Security",
    workflowTemplate: "contractor_deactivation",
    policyTemplate: "contractor_deactivation_block",
    outcome: "Revoke access only after ownership and automation dependencies are clear.",
    risk: "High",
    owner: "Security operations",
    signals: ["API key ownership", "Automation ownership", "Security review"],
  },
  vpn_recovery: {
    title: "VPN recovery",
    domain: "Network",
    workflowTemplate: "vpn_troubleshooting",
    policyTemplate: "workspace_suspension_approval",
    outcome: "Investigate posture and gateway issues before applying connectivity workarounds.",
    risk: "Medium",
    owner: "Network operations",
    signals: ["Device posture", "Gateway status", "Connectivity verification"],
  },
} as const satisfies Record<
  string,
  {
    title: string;
    domain: string;
    workflowTemplate: WorkflowTemplateKey;
    policyTemplate: PolicyRuleTemplateKey;
    outcome: string;
    risk: string;
    owner: string;
    signals: string[];
  }
>;

export type RunbookPackKey = keyof typeof runbookPacks;
