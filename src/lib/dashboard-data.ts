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
} from "lucide-react";

export const navItems = [
  { label: "Overview", icon: Activity, href: "/app" },
  { label: "Queue", icon: MessageSquareText, href: "/app" },
  { label: "Agents", icon: Bot, href: "/app" },
  { label: "Workflows", icon: Workflow, href: "/app/workflows" },
  { label: "Approvals", icon: BadgeCheck, href: "/app?view=approvals" },
  { label: "Copilot", icon: Sparkles, href: "/app/copilot" },
  { label: "Audit", icon: ShieldCheck, href: "/app" },
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
