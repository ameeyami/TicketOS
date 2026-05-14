import {
  Activity,
  BadgeCheck,
  Bell,
  Bot,
  CheckCircle2,
  CircleAlert,
  Clock3,
  KeyRound,
  LockKeyhole,
  MessageSquareText,
  Network,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Workflow,
  XCircle,
} from "lucide-react";

export const navItems = [
  { label: "Overview", icon: Activity },
  { label: "Queue", icon: MessageSquareText },
  { label: "Agents", icon: Bot },
  { label: "Workflows", icon: Workflow },
  { label: "Approvals", icon: BadgeCheck },
  { label: "Intelligence", icon: Sparkles },
  { label: "Audit", icon: ShieldCheck },
];

export const metrics = [
  { label: "AI resolved", value: "74%", delta: "+12%", tone: "emerald" },
  { label: "Median resolution", value: "4.8m", delta: "-31%", tone: "blue" },
  { label: "Hours saved", value: "186", delta: "this month", tone: "violet" },
  { label: "Needs approval", value: "9", delta: "3 urgent", tone: "amber" },
];

export const tickets = [
  {
    id: "TOS-1842",
    title: "Reset Okta password for Priya Shah",
    team: "Identity",
    priority: "High",
    status: "Resolving",
    confidence: 96,
    summary:
      "Identity verified through HRIS and Slack. Password reset workflow is executing with policy-compliant notification.",
    agent: "Access Agent",
    icon: KeyRound,
  },
  {
    id: "TOS-1838",
    title: "Provision Figma and GitHub for new designer",
    team: "Onboarding",
    priority: "Medium",
    status: "Approval",
    confidence: 88,
    summary:
      "Matched onboarding workflow. GitHub access requires manager approval because repository scope includes production assets.",
    agent: "Onboarding Agent",
    icon: UserPlus,
  },
  {
    id: "TOS-1829",
    title: "VPN failure for Singapore sales team",
    team: "Network",
    priority: "High",
    status: "Investigating",
    confidence: 81,
    summary:
      "Detected regional gateway errors. Agent is collecting logs and preparing a routing workaround.",
    agent: "Network Agent",
    icon: Network,
  },
  {
    id: "TOS-1821",
    title: "Deactivate contractor accounts",
    team: "Security",
    priority: "Critical",
    status: "Blocked",
    confidence: 64,
    summary:
      "Policy blocked autonomous deactivation because one account owns active production API keys.",
    agent: "Security Agent",
    icon: LockKeyhole,
  },
];

export const timeline = [
  {
    label: "Request received",
    detail: "Parsed Slack request and linked employee record.",
    status: "complete",
    time: "09:41",
    icon: Bell,
  },
  {
    label: "Intent analyzed",
    detail: "Classified as identity/password reset with 96% confidence.",
    status: "complete",
    time: "09:41",
    icon: Bot,
  },
  {
    label: "Permission checked",
    detail: "Confirmed requester, manager relationship, and Okta scope.",
    status: "complete",
    time: "09:42",
    icon: ShieldCheck,
  },
  {
    label: "Workflow executing",
    detail: "Resetting password, rotating sessions, and preparing Slack notice.",
    status: "active",
    time: "09:43",
    icon: Workflow,
  },
  {
    label: "Resolution verified",
    detail: "Awaiting Okta confirmation event.",
    status: "pending",
    time: "Next",
    icon: CheckCircle2,
  },
];

export const agents = [
  {
    name: "Access Agent",
    state: "Executing",
    load: "8 tasks",
    memory: "Identity, Okta, Google Workspace",
  },
  {
    name: "Onboarding Agent",
    state: "Waiting",
    load: "3 approvals",
    memory: "HRIS, Slack, Jira, device policy",
  },
  {
    name: "Network Agent",
    state: "Investigating",
    load: "5 tasks",
    memory: "VPN, device posture, office gateways",
  },
];

export const integrations = [
  "Slack",
  "Microsoft Teams",
  "Okta",
  "Jira",
  "Google Workspace",
  "GitHub",
];

export const insights = [
  {
    title: "Access requests are the automation wedge",
    body: "Password resets and app provisioning account for 46% of queue volume and resolve with the highest confidence.",
    icon: CheckCircle2,
  },
  {
    title: "Approval latency is now the bottleneck",
    body: "Manager approvals add a median 2.7 hours after AI classification, mostly for repository and finance-system access.",
    icon: Clock3,
  },
  {
    title: "Security policies prevented 4 risky actions",
    body: "TicketOS blocked autonomous deactivation and escalated to security when ownership or API keys were ambiguous.",
    icon: CircleAlert,
  },
];

export const auditRows = [
  ["09:43", "Access Agent", "Okta password reset", "Allowed", "policy.identity.reset.v2"],
  ["09:42", "Policy Engine", "Manager relationship check", "Passed", "hris.manager.match"],
  ["09:40", "Security Agent", "Contractor deactivation", "Blocked", "api_key.owner.active"],
  ["09:36", "Onboarding Agent", "GitHub team invite", "Approval", "repo_scope.production"],
];

export const statusIcons = {
  complete: CheckCircle2,
  active: Activity,
  pending: Clock3,
  blocked: XCircle,
};
