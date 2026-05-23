"use client";

import { useState } from "react";
import {
  BadgeCheck,
  Bell,
  Bot,
  BriefcaseBusiness,
  Building2,
  Cable,
  ChartNoAxesColumn,
  ChevronDown,
  FileText,
  GitBranch,
  KeyRound,
  LockKeyhole,
  MessageSquareText,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  UserPlus,
  UserRound,
  UserX,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { cn } from "@/lib/utils";

const teams = [
  {
    name: "IT",
    initial: "I",
    links: [
      { label: "Tickets", href: "/app/tickets", icon: MessageSquareText },
      { label: "Suggestions", href: "/app", icon: Sparkles },
      { label: "Workflows", href: "/app/workflows", icon: Workflow },
      { label: "Applications", href: "/app/integrations", icon: Cable },
    ],
  },
  {
    name: "Operations",
    initial: "O",
    links: [
      { label: "Passwords", href: "/app/password-resets", icon: KeyRound },
      { label: "Onboarding", href: "/app/onboarding", icon: UserPlus },
      { label: "Offboarding", href: "/app/offboarding", icon: UserX },
      { label: "Approvals", href: "/app/approvals", icon: BadgeCheck },
    ],
  },
  {
    name: "Governance",
    initial: "G",
    links: [
      { label: "Security", href: "/app/security", icon: LockKeyhole },
      { label: "Policies", href: "/app/policies", icon: ShieldCheck },
      { label: "Reports", href: "/app/reports", icon: FileText },
      { label: "Audit", href: "/app/audit", icon: ChartNoAxesColumn },
    ],
  },
];

const utilityLinks = [
  { label: "Agents", href: "/app/agents", icon: Bot },
  { label: "Apps", href: "/app/apps", icon: BriefcaseBusiness },
  { label: "People", href: "/app/people", icon: UserRound },
  { label: "Memory", href: "/app/memory", icon: GitBranch },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [expandedSection, setExpandedSection] = useState<string | null>(() => {
    const activeTeam = teams.find((team) => team.links.some((item) => isActivePath(item.href, pathname)));
    if (activeTeam) {
      return activeTeam.name;
    }

    if (utilityLinks.some((item) => isActivePath(item.href, pathname))) {
      return "Other";
    }

    return null;
  });

  return (
    <div className="ticketos-app-shell min-h-screen bg-[#fbfaf8] text-[#1f1b16]">
      <div className="flex min-h-screen">
        <aside className="hidden w-[218px] shrink-0 border-r border-[#eee8e2] bg-[#faf7f5] px-3 py-4 lg:block">
          <Link href="/app" className="flex h-9 items-center gap-2 px-2 text-sm font-semibold">
            <span className="flex size-6 items-center justify-center rounded-md bg-[#d9f876] text-xs font-bold text-[#263011]">
              T
            </span>
            TicketOS
            <ChevronDown size={13} className="text-black/35" />
          </Link>

          <div className="mt-7 flex items-center justify-between px-2 text-xs font-medium text-black/45">
            <span>Workspace</span>
            <Plus size={14} />
          </div>

          <div className="mt-2 space-y-1">
            {teams.map((team) => (
              <SidebarSection
                key={team.name}
                name={team.name}
                initial={team.initial}
                expanded={expandedSection === team.name}
                onToggle={() => setExpandedSection((current) => (current === team.name ? null : team.name))}
              >
                {team.links.map((item) => (
                  <NavLink key={item.href} item={item} pathname={pathname} />
                ))}
              </SidebarSection>
            ))}

            <SidebarSection
              name="Other"
              initial="O"
              expanded={expandedSection === "Other"}
              onToggle={() => setExpandedSection((current) => (current === "Other" ? null : "Other"))}
            >
              {utilityLinks.map((item) => (
                <NavLink key={item.href} item={item} pathname={pathname} />
              ))}
            </SidebarSection>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-[#eee8e2] bg-[#fbfaf8]/92 px-4 backdrop-blur md:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <Link href="/app" className="flex items-center gap-2 text-sm font-semibold text-black/72 lg:hidden">
                <span className="flex size-6 items-center justify-center rounded-md bg-[#d9f876] text-xs font-bold">T</span>
                TicketOS
              </Link>
              <form action="/app" className="hidden h-8 w-[320px] items-center gap-2 rounded-md border border-[#eee8e2] bg-white px-2 md:flex">
                <Search size={14} className="text-black/35" />
                <input
                  name="q"
                  className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-black/30"
                  placeholder="Search tickets, workflows, apps..."
                />
              </form>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/app/notifications" className="app-icon-button" title="Notifications">
                <Bell size={15} />
              </Link>
              <Link href="/app/settings" className="app-icon-button" title="Settings">
                <Settings size={15} />
              </Link>
              <SignOutButton />
              <Link href="/app/team" className="hidden h-8 items-center gap-2 rounded-md border border-[#eee8e2] bg-white px-2 text-xs font-semibold md:inline-flex">
                <Building2 size={14} />
                Amee Labs
              </Link>
            </div>
          </header>

          <div className="app-content-frame">{children}</div>
        </section>
      </div>
    </div>
  );
}

function SidebarSection({
  name,
  initial,
  expanded,
  onToggle,
  children,
}: {
  name: string;
  initial: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm font-semibold text-black/78 transition hover:bg-[#f1ebe5]"
        aria-expanded={expanded}
      >
        <span className="flex size-5 items-center justify-center rounded bg-[#d8efff] text-[11px] font-bold text-[#357297]">
          {initial}
        </span>
        <span className="min-w-0 flex-1 truncate">{name}</span>
        <ChevronDown
          size={13}
          className={cn("text-black/35 transition", expanded && "rotate-180")}
        />
      </button>
      {expanded && <div className="mt-1 space-y-1 pb-3">{children}</div>}
    </div>
  );
}

function NavLink({
  item,
  pathname,
}: {
  item: { label: string; href: string; icon: LucideIcon };
  pathname: string;
}) {
  const active = item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);

  return (
    <Link
      href={item.href}
      className={cn(
        "flex h-8 items-center gap-2 rounded-md px-2 text-sm font-medium text-black/68 transition hover:bg-[#f1ebe5] hover:text-black",
        active && "bg-[#f1ebe5] text-black",
      )}
    >
      <item.icon size={14} className="text-black/56" />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.label === "Approvals" && <span className="rounded bg-white px-1.5 py-0.5 text-[11px] text-black/45">2</span>}
    </Link>
  );
}

function isActivePath(href: string, pathname: string) {
  return href === "/app" ? pathname === "/app" : pathname.startsWith(href);
}
