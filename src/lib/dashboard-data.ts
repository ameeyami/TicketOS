import {
  Activity,
  BadgeCheck,
  BarChart3,
  Bell,
  BookOpenCheck,
  Bot,
  Brain,
  CheckCircle2,
  CircleAlert,
  Clock3,
  ClipboardList,
  Cpu,
  KeyRound,
  LockKeyhole,
  MessageSquareText,
  Network,
  ShieldAlert,
  ShieldCheck,
  Siren,
  SlidersHorizontal,
  Sparkles,
  UsersRound,
  UserPlus,
  Workflow,
} from "lucide-react";

export const navItems = [
  { label: "Overview", icon: Activity, href: "/app" },
  { label: "Queue", icon: MessageSquareText, href: "/app/tickets" },
  { label: "Catalog", icon: ClipboardList, href: "/app/catalog" },
  { label: "Agents", icon: Bot, href: "/app/agents" },
  { label: "Autonomy", icon: SlidersHorizontal, href: "/app/autonomy" },
  { label: "Memory", icon: Brain, href: "/app/memory" },
  { label: "Executions", icon: Cpu, href: "/app/executions" },
  { label: "Escalations", icon: Siren, href: "/app/escalations" },
  { label: "Workflows", icon: Workflow, href: "/app/workflows" },
  { label: "Runbooks", icon: BookOpenCheck, href: "/app/runbooks" },
  { label: "Policies", icon: ShieldAlert, href: "/app/policies" },
  { label: "Approvals", icon: BadgeCheck, href: "/app/approvals" },
  { label: "Notifications", icon: Bell, href: "/app/notifications" },
  { label: "Intelligence", icon: BarChart3, href: "/app/intelligence" },
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
