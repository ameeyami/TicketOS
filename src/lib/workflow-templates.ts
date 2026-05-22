export const workflowTemplates = {
  identity_password_reset: {
    name: "Identity password reset",
    description: "Verify identity, check policy, reset password, notify employee, and verify result.",
    trigger_type: "ticket_intent",
    graph: {
      nodes: ["intake", "identity_check", "policy", "reset", "notify", "verify"],
      edges: [
        "intake->identity_check",
        "identity_check->policy",
        "policy->reset",
        "reset->notify",
        "notify->verify",
      ],
    },
  },
  employee_onboarding: {
    name: "Employee onboarding access",
    description: "Provision workspace apps, request approval for sensitive access, and document completion.",
    trigger_type: "onboarding_request",
    graph: {
      nodes: ["intake", "manager_check", "app_bundle", "approval_gate", "provision", "audit"],
      edges: [
        "intake->manager_check",
        "manager_check->app_bundle",
        "app_bundle->approval_gate",
        "approval_gate->provision",
        "provision->audit",
      ],
    },
  },
  contractor_deactivation: {
    name: "Contractor deactivation",
    description: "Check asset ownership, revoke access, rotate sessions, and escalate risky dependencies.",
    trigger_type: "security_request",
    graph: {
      nodes: ["intake", "ownership_scan", "risk_policy", "revoke", "rotate", "security_review"],
      edges: [
        "intake->ownership_scan",
        "ownership_scan->risk_policy",
        "risk_policy->revoke",
        "risk_policy->security_review",
        "revoke->rotate",
      ],
    },
  },
  vpn_troubleshooting: {
    name: "VPN troubleshooting",
    description: "Collect device posture, inspect gateway status, apply workaround, and verify connectivity.",
    trigger_type: "incident_signal",
    graph: {
      nodes: ["intake", "device_posture", "gateway_check", "workaround", "verify"],
      edges: ["intake->device_posture", "device_posture->gateway_check", "gateway_check->workaround", "workaround->verify"],
    },
  },
};

export type WorkflowTemplateKey = keyof typeof workflowTemplates;
