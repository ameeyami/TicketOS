"use client";

import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  Bell,
  BookOpen,
  Cable,
  ChartNoAxesColumn,
  ChevronDown,
  FileText,
  Gauge,
  GitBranch,
  KeyRound,
  LifeBuoy,
  Lock,
  MessageSquareText,
  MessagesSquare,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Undo2,
  UserPlus,
  UserRound,
  UsersRound,
  UserX,
  Wallet,
  Webhook,
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
    accent: "#0b5f91",
    links: [
      { label: "Tickets", href: "/app/tickets", icon: MessageSquareText },
      { label: "Incidents", href: "/app/incidents", icon: AlertTriangle },
      { label: "Ask", href: "/app/ask", icon: LifeBuoy },
      { label: "Knowledge", href: "/app/knowledge", icon: BookOpen },
      { label: "Channels", href: "/app/channels", icon: MessagesSquare },
      { label: "Suggestions", href: "/app", icon: Sparkles },
      { label: "Workflows", href: "/app/workflows", icon: Workflow },
      { label: "Applications", href: "/app/apps", icon: Cable },
    ],
  },
  {
    name: "Operations",
    initial: "O",
    tone: "bg-[#e8f8ef] text-[#0f7a5f]",
    accent: "#0f7a5f",
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
    accent: "#5b4bc4",
    links: [
      { label: "Policies", href: "/app/policies", icon: ShieldCheck },
      { label: "Costs", href: "/app/costs", icon: Wallet },
      { label: "Reports", href: "/app/reports", icon: FileText },
      { label: "Performance", href: "/app/performance", icon: Gauge },
      { label: "Executions", href: "/app/executions", icon: Undo2 },
      { label: "Audit", href: "/app/audit", icon: ChartNoAxesColumn },
      { label: "Trust", href: "/app/trust", icon: Lock },
    ],
  },
];

const utilityTeam = {
  name: "Other",
  initial: "•",
  tone: "bg-[#eef1f5] text-[#5b6b7e]",
  accent: "#475569",
  links: [
    { label: "Copilot", href: "/app/copilot", icon: Sparkles },
    { label: "Team", href: "/app/team", icon: UsersRound },
    { label: "Autonomy", href: "/app/autonomy", icon: SlidersHorizontal },
    { label: "People", href: "/app/people", icon: UserRound },
    { label: "Memory", href: "/app/memory", icon: GitBranch },
    { label: "API & webhooks", href: "/app/api-keys", icon: Webhook },
    { label: "Claude API", href: "/app/diagnostics", icon: Activity },
  ],
};

export function AppShell({ children, orgName }: { children: React.ReactNode; orgName: string }) {
  const pathname = usePathname();
  const orgInitial = (orgName ?? "T").trim().charAt(0).toUpperCase() || "T";
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
          <Link href="/app" className="flex h-11 items-center gap-2 rounded-md px-2 transition hover:bg-[#f1f4f8]">
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
                  <NavLink key={item.href} item={item} pathname={pathname} accent={team.accent} />
                ))}
              </SidebarSection>
            ))}
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="tos-header sticky top-0 z-30 flex h-12 items-center justify-between border-b border-[#d8e4ee] px-4 backdrop-blur md:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <Link href="/app" className="flex items-center gap-2 text-sm font-semibold text-black/72 lg:hidden">
                <TicketOSLogo markSize="sm" />
              </Link>
              <form action="/app" className="hidden h-8 w-[300px] items-center gap-2 rounded-full border border-[#d8e4ee] bg-white/80 px-3 transition focus-within:border-[#0b5f91] focus-within:bg-white md:flex">
                <Search size={14} className="text-[#0b5f91]" />
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
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-gradient-to-r from-[#0b5f91] to-[#5b4bc4] px-3 text-xs font-semibold text-white shadow-[0_6px_16px_-7px_rgba(91,75,196,0.75)] transition hover:opacity-95"
                title="Operations Copilot"
              >
                <Sparkles size={14} />
                <span className="hidden sm:inline">Copilot</span>
              </Link>
              <Link href="/app/diagnostics" className="app-icon-button" title="Claude API key">
                <KeyRound size={15} />
              </Link>
              <Link href="/app/notifications" className="app-icon-button relative" title="Notifications">
                <Bell size={15} />
                <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-[#22c55e] ring-2 ring-white" />
              </Link>
              <Link href="/app/settings" className="app-icon-button" title="Settings">
                <Settings size={15} />
              </Link>
              <SignOutButton />
              <Link
                href="/app/team"
                className="hidden h-8 items-center gap-2 rounded-full border border-[#d8e4ee] bg-white py-0.5 pl-1 pr-2.5 text-xs font-semibold transition hover:border-[#cfe0ef] md:inline-flex"
                title={orgName}
              >
                <span className="flex size-6 items-center justify-center rounded-full bg-gradient-to-br from-[#0b5f91] to-[#5b4bc4] text-[11px] font-bold text-white">
                  {orgInitial}
                </span>
                <span className="max-w-[120px] truncate">{orgName}</span>
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
  accent,
}: {
  item: { label: string; href: string; icon: LucideIcon };
  pathname: string;
  accent: string;
}) {
  const active = item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);

  return (
    <Link
      href={item.href}
      style={active ? { backgroundColor: accent, color: "#fff", boxShadow: `0 6px 16px -7px ${accent}cc` } : undefined}
      className={cn(
        "flex h-8 items-center gap-2.5 rounded-md py-1 pl-[34px] pr-2 text-sm transition",
        active ? "font-semibold" : "text-slate-500 hover:bg-[#eef2f7] hover:text-slate-800",
      )}
    >
      <item.icon size={15} style={active ? { color: "#fff" } : undefined} className={active ? "" : "text-slate-400"} />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.label === "Approvals" && (
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
            active ? "bg-white/25 text-white" : "bg-[#22c55e] text-[#03120a]",
          )}
        >
          2
        </span>
      )}
    </Link>
  );
}

function isActivePath(href: string, pathname: string) {
  return href === "/app" ? pathname === "/app" : pathname.startsWith(href);
}
