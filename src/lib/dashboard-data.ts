import {
  Activity,
  BadgeCheck,
  Bell,
  Bot,
  Brain,
  Cable,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Cpu,
  FileText,
  KeyRound,
  LockKeyhole,
  MessageSquareText,
  Network,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UserRound,
  UsersRound,
  UserPlus,
  UserX,
  Workflow,
} from "lucide-react";

export const navItems = [
  { label: "Overview", icon: Activity, href: "/app" },
  { label: "Queue", icon: MessageSquareText, href: "/app/tickets" },
  { label: "Passwords", icon: KeyRound, href: "/app/password-resets" },
  { label: "Onboarding", icon: UserPlus, href: "/app/onboarding" },
  { label: "Offboarding", icon: UserX, href: "/app/offboarding" },
  { label: "Apps", icon: Cable, href: "/app/apps" },
  { label: "People", icon: UserRound, href: "/app/people" },
  { label: "Autonomy", icon: SlidersHorizontal, href: "/app/autonomy" },
  { label: "Memory", icon: Brain, href: "/app/memory" },
  { label: "Executions", icon: Cpu, href: "/app/executions" },
  { label: "Workflows", icon: Workflow, href: "/app/workflows" },
  { label: "Policies", icon: ShieldAlert, href: "/app/policies" },
  { label: "Approvals", icon: BadgeCheck, href: "/app/approvals" },
  { label: "Notifications", icon: Bell, href: "/app/notifications" },
  { label: "Reports", icon: FileText, href: "/app/reports" },
  { label: "Copilot", icon: Sparkles, href: "/app/copilot" },
  { label: "Audit", icon: ShieldCheck, href: "/app/audit" },
  { label: "Team", icon: UsersRound, href: "/app/team" },
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

export const ticketIcons = {
  Identity: KeyRound,
  Onboarding: UserPlus,
  Network,
  Security: LockKeyhole,
  Default: MessageSquareText,
};

export const timelineIcons = {
  "Request received": Bell,
  "Intent analyzed": Bot,
  "Permission checked": ShieldCheck,
  "Workflow executing": Workflow,
  "Resolution verified": CheckCircle2,
};
