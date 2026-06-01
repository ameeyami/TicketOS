"use client";

import {
  Activity,
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
  MessagesSquare,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UserPlus,
  UserRound,
  UserX,
  Wallet,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { TicketOSLogo } from "@/components/brand/ticketos-logo";
import { cn } from "@/lib/utils";

const teams = [
  {
    name: "IT",
    initial: "I",
    tone: "bg-[#e7f0ff] text-[#0b5f91]",
    links: [
      { label: "Tickets", href: "/app/tickets", icon: MessageSquareText },
      { label: "Channels", href: "/app/channels", icon: MessagesSquare },
      { label: "Suggestions", href: "/app", icon: Sparkles },
      { label: "Workflows", href: "/app/workflows", icon: Workflow },
      { label: "Applications", href: "/app/integrations", icon: Cable },
    ],
  },
  {
    name: "Operations",
    initial: "O",
    tone: "bg-[#e8f8ef] text-[#0f7a5f]",
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
    tone: "bg-[#efeaff] text-[#5b4bc4]",
    links: [
      { label: "Security", href: "/app/security", icon: LockKeyhole },
      { label: "Policies", href: "/app/policies", icon: ShieldCheck },
      { label: "Costs", href: "/app/costs", icon: Wallet },
      { label: "Reports", href: "/app/reports", icon: FileText },
      { label: "Audit", href: "/app/audit", icon: ChartNoAxesColumn },
    ],
  },
];

const utilityTeam = {
  name: "Other",
  initial: "•",
  tone: "bg-[#eef1f5] text-[#5b6b7e]",
  links: [
    { label: "Agents", href: "/app/agents", icon: Bot },
    { label: "Copilot", href: "/app/copilot", icon: Sparkles },
    { label: "Autonomy", href: "/app/autonomy", icon: SlidersHorizontal },
    { label: "Apps", href: "/app/apps", icon: BriefcaseBusiness },
    { label: "People", href: "/app/people", icon: UserRound },
    { label: "Memory", href: "/app/memory", icon: GitBranch },
    { label: "AI status", href: "/app/diagnostics", icon: Activity },
  ],
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const isSectionOpen = (name: string, active: boolean) => openSections[name] ?? active;
  const toggleSection = (name: string, active: boolean) => {
    setOpenSections((sections) => ({
      ...sections,
      [name]: !(sections[name] ?? active),
    }));
  };

  return (
    <div className="ticketos-app-shell min-h-screen bg-[#f4f8fb] text-[#07111f]">
      <div className="flex min-h-screen">
        <aside className="hidden w-[240px] shrink-0 border-r border-[#e8edf3] bg-[#fbfcfe] px-3 py-4 lg:block">
          <Link href="/app" className="flex h-9 items-center gap-2 rounded-md px-2 transition hover:bg-[#f1f4f8]">
            <TicketOSLogo markSize="sm" />
            <ChevronDown size={14} className="ml-auto text-slate-400" />
          </Link>

          <div className="mt-5 space-y-3">
            {[...teams, utilityTeam].map((team) => (
              <SidebarSection
                key={team.name}
                name={team.name}
                initial={team.initial}
                tone={team.tone}
                open={isSectionOpen(team.name, team.links.some((item) => isActivePath(item.href, pathname)))}
                onToggle={() => toggleSection(team.name, team.links.some((item) => isActivePath(item.href, pathname)))}
              >
                {team.links.map((item) => (
                  <NavLink key={item.href} item={item} pathname={pathname} />
                ))}
              </SidebarSection>
            ))}
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-[#d8e4ee] bg-white/92 px-4 backdrop-blur md:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <Link href="/app" className="flex items-center gap-2 text-sm font-semibold text-black/72 lg:hidden">
                <TicketOSLogo markSize="sm" />
              </Link>
              <form action="/app" className="hidden h-8 w-[320px] items-center gap-2 rounded-md border border-[#d8e4ee] bg-white px-2 md:flex">
                <Search size={14} className="text-black/35" />
                <input
                  name="q"
                  className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-black/30"
                  placeholder="Search tickets, workflows, apps..."
                />
              </form>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/app/copilot"
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#0b2a4a] px-2.5 text-xs font-semibold text-white transition hover:bg-[#07111f]"
                title="Operations Copilot"
              >
                <Sparkles size={14} />
                <span className="hidden sm:inline">Copilot</span>
              </Link>
              <Link href="/app/notifications" className="app-icon-button" title="Notifications">
                <Bell size={15} />
              </Link>
              <Link href="/app/settings" className="app-icon-button" title="Settings">
                <Settings size={15} />
              </Link>
              <SignOutButton />
              <Link href="/app/team" className="hidden h-8 items-center gap-2 rounded-md border border-[#d8e4ee] bg-white px-2 text-xs font-semibold md:inline-flex">
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
  tone,
  open,
  onToggle,
  children,
}: {
  name: string;
  initial: string;
  tone: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex h-8 w-full items-center gap-2 rounded-md px-1.5 text-sm font-semibold text-slate-700 transition hover:bg-[#f1f4f8]"
      >
        <span className={cn("flex size-5 items-center justify-center rounded text-[11px] font-bold", tone)}>
          {initial}
        </span>
        <span className="min-w-0 flex-1 truncate text-left">{name}</span>
        <ChevronDown size={13} className={cn("text-slate-400 transition", open && "rotate-180")} />
      </button>
      {open && <div className="mt-0.5 space-y-0.5">{children}</div>}
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
        "flex h-8 items-center gap-2.5 rounded-md py-1 pl-[34px] pr-2 text-sm transition",
        active
          ? "bg-[#eaf2fb] font-medium text-[#0b2a4a]"
          : "text-slate-500 hover:bg-[#f1f4f8] hover:text-slate-800",
      )}
    >
      <item.icon size={15} className={active ? "text-[#0b5f91]" : "text-slate-400"} />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.label === "Approvals" && (
        <span className="rounded-full bg-[#22c55e] px-1.5 py-0.5 text-[10px] font-semibold text-[#03120a]">2</span>
      )}
    </Link>
  );
}

function isActivePath(href: string, pathname: string) {
  return href === "/app" ? pathname === "/app" : pathname.startsWith(href);
}
