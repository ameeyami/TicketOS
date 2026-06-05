export const serviceCatalogItems = {
  password_reset: {
    title: "Password reset",
    category: "Identity",
    priority: "high",
    agent: "Access Agent",
    summary: "Verify identity, reset password, rotate sessions, and notify the employee.",
    prompt: "Who needs the reset, which identity provider is affected, and how was identity verified?",
    confidence: 94,
    status: "triaging",
  },
  app_access: {
    title: "App access request",
    category: "Onboarding",
    priority: "medium",
    agent: "Onboarding Agent",
    summary: "Validate requester, check access scope, route approvals, and provision selected apps.",
    prompt: "Which app, user, access level, business reason, and manager approval are involved?",
    confidence: 88,
    status: "approval_required",
  },
  employee_onboarding: {
    title: "Employee onboarding",
    category: "Onboarding",
    priority: "high",
    agent: "Onboarding Agent",
    summary: "Create onboarding ticket for app bundle, identity setup, device readiness, and audit trail.",
    prompt: "Employee name, start date, department, manager, app bundle, and device needs.",
    confidence: 90,
    status: "triaging",
  },
  vpn_troubleshooting: {
    title: "VPN troubleshooting",
    category: "Network",
    priority: "high",
    agent: "Network Agent",
    summary: "Collect device posture, inspect gateway status, propose workaround, and verify connection.",
    prompt: "Location, device type, error message, affected users, and connection time.",
    confidence: 82,
    status: "triaging",
  },
  contractor_deactivation: {
    title: "Contractor deactivation",
    category: "Security",
    priority: "critical",
    agent: "Security Agent",
    summary: "Pause for approval, scan ownership dependencies, revoke access, and document completion.",
    prompt: "Contractor name, last day, owned systems, repositories, API keys, and approving manager.",
    confidence: 74,
    status: "approval_required",
  },
} as const;

export type ServiceCatalogKey = keyof typeof serviceCatalogItems;

import { Cable, KeyRound, LifeBuoy, MessagesSquare, Network, ShieldCheck, UserPlus, UserX } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Service / request catalog — structured request types employees can pick from.
 * Each item prefills the new-ticket form (title/description/category/priority) so
 * intake is consistent and routed correctly, then flows through triage + workflows.
 */
export type CatalogItem = {
  slug: string;
  name: string;
  blurb: string;
  category: "Identity" | "Onboarding" | "Network" | "Security";
  priority: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  icon: LucideIcon;
};

export const serviceCatalog: CatalogItem[] = [
  {
    slug: "access-request",
    name: "Access request",
    blurb: "Request access to an app, system, or shared resource.",
    category: "Identity",
    priority: "medium",
    title: "Access request",
    description: "I need access to <app/system>. My role: <role>. Reason: <why it's needed>.",
    icon: ShieldCheck,
  },
  {
    slug: "password-reset",
    name: "Password / MFA reset",
    blurb: "Locked out, or need a password or MFA reset.",
    category: "Identity",
    priority: "high",
    title: "Password / MFA reset",
    description: "I'm locked out of <account>. Last successful login: <when>. Preferred contact: <email/phone>.",
    icon: KeyRound,
  },
  {
    slug: "onboarding",
    name: "New hire onboarding",
    blurb: "Provision accounts, apps, and a device for a new joiner.",
    category: "Onboarding",
    priority: "medium",
    title: "New hire onboarding",
    description: "New hire: <name>. Start date: <date>. Team/role: <team>. Apps/access needed: <list>.",
    icon: UserPlus,
  },
  {
    slug: "offboarding",
    name: "Employee offboarding",
    blurb: "Revoke access and deactivate accounts for a leaver.",
    category: "Security",
    priority: "high",
    title: "Employee offboarding",
    description: "Departing employee: <name>. Last day: <date>. Systems to revoke: <list>.",
    icon: UserX,
  },
  {
    slug: "software",
    name: "Software & licenses",
    blurb: "Install software or request a license seat.",
    category: "Identity",
    priority: "low",
    title: "Software / license request",
    description: "Software: <name>. Version: <if specific>. Business justification: <why>.",
    icon: Cable,
  },
  {
    slug: "vpn-network",
    name: "VPN / network access",
    blurb: "VPN, Wi-Fi, or connectivity problems and access.",
    category: "Network",
    priority: "medium",
    title: "VPN / network access",
    description: "Issue or request: <describe>. Location: <where>. Device: <laptop/phone>.",
    icon: Network,
  },
  {
    slug: "email-dl",
    name: "Email / distribution list",
    blurb: "New mailbox, alias, or distribution-list change.",
    category: "Identity",
    priority: "low",
    title: "Email / distribution list change",
    description: "Request: <new mailbox / alias / DL add-remove>. Members: <list>.",
    icon: MessagesSquare,
  },
  {
    slug: "security-concern",
    name: "Report a security concern",
    blurb: "Phishing, suspicious activity, or a possible breach.",
    category: "Security",
    priority: "critical",
    title: "Security concern",
    description: "What happened: <describe>. When: <time>. Affected account/system: <which>.",
    icon: LifeBuoy,
  },
];
