"use client";

import "@xyflow/react/dist/style.css";

import { Background, Controls, Edge, Handle, MarkerType, Node, Position, ReactFlow } from "@xyflow/react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  Bot,
  ChevronDown,
  Clock3,
  Command,
  Filter,
  GitBranch,
  LockKeyhole,
  MessageSquareText,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { insights, navItems, ticketIcons, timelineIcons } from "@/lib/dashboard-data";
import { cn } from "@/lib/utils";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { decideApproval } from "@/app/app/actions";
import type { DashboardData } from "@/lib/supabase/bootstrap";
import { PendingButton } from "@/components/ui/pending-button";

const graphNodes: Node[] = [
  { id: "intake", position: { x: 0, y: 64 }, data: { label: "Intake" }, type: "ticketNode" },
  { id: "analyze", position: { x: 180, y: 12 }, data: { label: "Analyze" }, type: "ticketNode" },
  { id: "policy", position: { x: 360, y: 64 }, data: { label: "Policy" }, type: "ticketNode" },
  { id: "execute", position: { x: 540, y: 12 }, data: { label: "Execute" }, type: "ticketNode" },
  { id: "verify", position: { x: 720, y: 64 }, data: { label: "Verify" }, type: "ticketNode" },
];

const graphEdges: Edge[] = [
  { id: "e1", source: "intake", target: "analyze", animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: "e2", source: "analyze", target: "policy", animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: "e3", source: "policy", target: "execute", animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: "e4", source: "execute", target: "verify", markerEnd: { type: MarkerType.ArrowClosed } },
];

function TicketNode({ data }: { data: { label: string } }) {
  return (
    <div className="rounded-lg border border-[#c9d7cd] bg-white px-4 py-3 text-sm font-semibold text-[#152019] shadow-sm">
      <Handle type="target" position={Position.Left} className="!bg-[#2f6f60]" />
      {data.label}
      <Handle type="source" position={Position.Right} className="!bg-[#2f6f60]" />
    </div>
  );
}

const nodeTypes = { ticketNode: TicketNode };

export function CommandCenter({ data }: { data: DashboardData }) {
  return (
    <main className="min-h-screen bg-[#f6f7f2] text-[#151914]">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-black/10 bg-[#111713] p-4 text-white lg:block">
          <div className="flex h-12 items-center gap-3 px-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-[#d7ff78] text-[#111713]">
              <Workflow size={18} />
            </span>
            <div>
              <p className="text-sm font-semibold">TicketOS</p>
              <p className="text-xs text-white/42">AI operations layer</p>
            </div>
          </div>
          <nav className="mt-8 space-y-1">
            {navItems.map((item, index) => (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-white/62 transition hover:bg-white/8 hover:text-white",
                  index === 0 && "bg-white/10 text-white",
                )}
              >
                <item.icon size={17} />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-8 rounded-xl border border-white/10 bg-white/[.06] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles size={16} className="text-[#d7ff78]" />
              Agent policy mode
            </div>
            <p className="mt-3 text-sm leading-6 text-white/52">
              Autonomous actions are limited to low-risk identity and routing workflows.
            </p>
            <Link
              href="/app/workflows"
              className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-white px-3 text-sm font-semibold text-[#111713]"
            >
              Review rules
              <ArrowRight size={15} />
            </Link>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-black/10 bg-[#f6f7f2]/88 px-4 backdrop-blur md:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button className="flex size-10 items-center justify-center rounded-lg border border-black/10 bg-white lg:hidden">
                <Command size={18} />
              </button>
              <form
                action="/app"
                className="hidden min-w-0 items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2 md:flex"
              >
                <Search size={16} className="text-black/42" />
                <input
                  name="q"
                  defaultValue={data.filters.query ?? ""}
                  className="w-72 bg-transparent text-sm outline-none placeholder:text-black/42"
                  placeholder="Search tickets, agents, workflows..."
                />
              </form>
            </div>
            <div className="flex items-center gap-2">
              <button className="hidden h-10 items-center gap-2 rounded-lg border border-black/10 bg-white px-3 text-sm font-semibold md:inline-flex">
                <Bell size={16} />
                {data.metrics.find((metric) => metric.label === "Needs approval")?.value ?? "0"} approvals
              </button>
              <SignOutButton />
              <Link
                href="/app/settings"
                className="flex size-10 items-center justify-center rounded-lg border border-black/10 bg-white"
                title="Workspace settings"
              >
                <Settings size={17} />
              </Link>
              <Link
                href="/app/settings"
                className="flex h-10 items-center gap-2 rounded-lg bg-[#17211c] px-3 text-sm font-semibold text-white"
              >
                {data.organizationName}
                <ChevronDown size={15} />
              </Link>
            </div>
          </header>

          <div className="px-4 py-6 md:px-6 lg:px-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#47685d]">
                  Operations command center
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
                  AI agents are resolving IT work in real time.
                </h1>
              </div>
              <div className="flex gap-2">
                <Link
                  href="/app?view=approvals"
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-black/10 bg-white px-3 text-sm font-semibold"
                >
                  <Filter size={16} />
                  Filter
                </Link>
                <Link
                  href="/app/tickets/new"
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#17211c] px-3 text-sm font-semibold text-white"
                >
                  <Plus size={16} />
                  New ticket
                </Link>
              </div>
            </div>

            <section className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {data.metrics.map((metric, index) => (
                <motion.div
                  key={metric.label}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="rounded-xl border border-black/10 bg-white p-5 shadow-sm"
                >
                  <p className="text-sm font-medium text-black/52">{metric.label}</p>
                  <div className="mt-4 flex items-end justify-between">
                    <p className="text-3xl font-semibold tracking-tight">{metric.value}</p>
                    <span className="rounded-md bg-[#edf5e9] px-2 py-1 text-xs font-semibold text-[#315f4f]">
                      {metric.delta}
                    </span>
                  </div>
                </motion.div>
              ))}
            </section>

            <section className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
              <div className="rounded-xl border border-black/10 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-black/10 p-5">
                  <div>
                    <h2 className="text-lg font-semibold">AI operations queue</h2>
                    <p className="mt-1 text-sm text-black/52">
                      {data.filters.query
                        ? `Search results for "${data.filters.query}"`
                        : data.filters.view === "approvals"
                          ? "Showing tickets waiting on approval."
                          : "Requests grouped by execution state, not just status."}
                    </p>
                  </div>
                  <button className="flex size-9 items-center justify-center rounded-lg border border-black/10">
                    <MoreHorizontal size={17} />
                  </button>
                </div>
                <div className="divide-y divide-black/8">
                  {data.tickets.map((ticket) => {
                    const TicketIcon =
                      ticketIcons[ticket.category as keyof typeof ticketIcons] ?? ticketIcons.Default;

                    return (
                    <div key={ticket.id} className="grid gap-4 p-5 transition hover:bg-[#f8faf5] lg:grid-cols-[1fr_180px]">
                      <div className="flex gap-4">
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#eef5ea] text-[#2e6658]">
                          <TicketIcon size={19} />
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold text-black/42">{ticket.id}</span>
                            <StatusPill status={ticket.status} />
                            <span className="rounded-md border border-black/10 px-2 py-1 text-xs font-semibold text-black/52">
                              {ticket.priority}
                            </span>
                          </div>
                          <h3 className="mt-2 font-semibold tracking-tight">{ticket.title}</h3>
                          <p className="mt-2 max-w-3xl text-sm leading-6 text-black/56">{ticket.summary}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-3 lg:flex-col lg:items-end">
                        <div className="text-left lg:text-right">
                          <p className="text-sm font-semibold">{ticket.agent}</p>
                          <p className="text-xs text-black/48">{ticket.confidence}% confidence</p>
                        </div>
                        <Link
                          href={`/app/tickets/${ticket.databaseId}`}
                          className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#17211c] px-3 text-sm font-semibold text-white"
                        >
                          Inspect
                          <ArrowRight size={15} />
                        </Link>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-6">
                <Panel title="Active agents" icon={Bot}>
                  <div className="space-y-3">
                    {data.agents.map((agent) => (
                      <div key={agent.name} className="rounded-lg border border-black/10 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold">{agent.name}</p>
                          <span className="rounded-md bg-[#edf5e9] px-2 py-1 text-xs font-semibold text-[#315f4f]">
                            {agent.state}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-black/52">{agent.load}</p>
                        <p className="mt-1 text-xs text-black/42">{agent.memory}</p>
                      </div>
                    ))}
                  </div>
                </Panel>

                <Panel title="Approval queue" icon={BadgeCheck}>
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <p className="font-semibold text-amber-950">
                      {data.approval?.title ?? "No approvals waiting"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-amber-900/72">
                      {data.approval?.description ?? "TicketOS has no paused workflows right now."}
                    </p>
                    {data.approval?.status === "pending" && (
                      <div className="mt-4 flex gap-2">
                        <ApprovalForm approval={data.approval} decision="approved" />
                        <ApprovalForm approval={data.approval} decision="rejected" />
                      </div>
                    )}
                  </div>
                </Panel>
              </div>
            </section>

            <section className="mt-6 grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
              <Panel title="Execution timeline" icon={Clock3}>
                <div className="space-y-4">
                  {data.timeline.map((step, index) => {
                    const StepIcon =
                      timelineIcons[step.label as keyof typeof timelineIcons] ?? Clock3;

                    return (
                    <div key={step.label} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <span
                          className={cn(
                            "flex size-9 items-center justify-center rounded-lg border",
                            step.status === "active"
                              ? "border-[#2f6f60] bg-[#e7f5ee] text-[#2f6f60]"
                              : "border-black/10 bg-white text-black/52",
                          )}
                        >
                          <StepIcon size={17} />
                        </span>
                        {index !== data.timeline.length - 1 && <span className="mt-2 h-10 w-px bg-black/10" />}
                      </div>
                      <div className="min-w-0 pb-3">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{step.label}</p>
                          <span className="text-xs text-black/42">{step.time}</span>
                        </div>
                        <p className="mt-1 text-sm leading-6 text-black/55">{step.detail}</p>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </Panel>

              <Panel title="Workflow visualization" icon={GitBranch}>
                <div className="h-[330px] overflow-hidden rounded-lg border border-black/10 bg-[#f8faf5]">
                  <ReactFlow
                    nodes={graphNodes}
                    edges={graphEdges}
                    nodeTypes={nodeTypes}
                    fitView
                    proOptions={{ hideAttribution: true }}
                  >
                    <Background gap={18} size={1} color="#d5ded5" />
                    <Controls showInteractive={false} />
                  </ReactFlow>
                </div>
              </Panel>
            </section>

            <section className="mt-6 grid gap-6 xl:grid-cols-[.95fr_1.05fr]">
              <Panel title="Operational intelligence" icon={Sparkles}>
                <div className="grid gap-3">
                  {insights.map((insight) => (
                    <div key={insight.title} className="flex gap-4 rounded-lg border border-black/10 p-4">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#eef5ea] text-[#2e6658]">
                        <insight.icon size={18} />
                      </span>
                      <div>
                        <h3 className="font-semibold">{insight.title}</h3>
                        <p className="mt-1 text-sm leading-6 text-black/55">{insight.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel title="Copilot and audit" icon={MessageSquareText}>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-lg border border-black/10 bg-[#111713] p-4 text-white">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Bot size={16} className="text-[#d7ff78]" />
                      Copilot
                    </div>
                    <p className="mt-4 text-sm leading-6 text-white/62">
                      “Why did contractor deactivation fail?”
                    </p>
                    <div className="mt-4 rounded-lg bg-white/8 p-3 text-sm leading-6 text-white/72">
                      Policy blocked autonomous deactivation because one contractor owns active production API keys.
                    </div>
                    <Link
                      href="/app/copilot"
                      className="mt-4 flex h-10 items-center gap-2 rounded-lg border border-white/10 px-3 text-sm text-white/58 transition hover:bg-white/8 hover:text-white"
                    >
                      Ask about unresolved tickets
                      <Send size={15} className="ml-auto" />
                    </Link>
                  </div>
                  <div className="overflow-hidden rounded-lg border border-black/10">
                    {data.auditRows.map((row) => (
                      <div key={`${row[0]}-${row[2]}`} className="grid grid-cols-[52px_1fr] gap-3 border-b border-black/8 p-3 last:border-b-0">
                        <span className="text-xs font-semibold text-black/42">{row[0]}</span>
                        <div>
                          <p className="text-sm font-semibold">{row[2]}</p>
                          <p className="mt-1 text-xs text-black/45">
                            {row[1]} · {row[3]} · {row[4]}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Panel>
            </section>

            <section className="mt-6 rounded-xl border border-black/10 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Integration catalog</h2>
                  <p className="mt-1 text-sm text-black/52">Prepared UI for the systems TicketOS will execute against.</p>
                </div>
                <Link
                  href="/app/integrations"
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-black/10 px-3 text-sm font-semibold"
                >
                  <LockKeyhole size={16} />
                  Manage scopes
                </Link>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                {data.integrations.map((integration) => (
                  <Link
                    href="/app/integrations"
                    key={integration.name}
                    className="rounded-lg border border-black/10 p-4 transition hover:bg-[#f8faf5]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{integration.name}</span>
                      <ShieldCheck size={17} className="text-[#2f6f60]" />
                    </div>
                    <p className="mt-3 text-xs leading-5 text-black/45">{integration.status}</p>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function ApprovalForm({
  approval,
  decision,
}: {
  approval: NonNullable<DashboardData["approval"]>;
  decision: "approved" | "rejected";
}) {
  return (
    <form action={decideApproval}>
      <input type="hidden" name="approvalId" value={approval.id} />
      <input type="hidden" name="ticketId" value={approval.ticketId} />
      <input type="hidden" name="organizationId" value={approval.organizationId} />
      <input type="hidden" name="decision" value={decision} />
      <PendingButton
        pendingText={decision === "approved" ? "Approving..." : "Rejecting..."}
        className={cn(
          "h-9 rounded-lg px-3 text-sm font-semibold",
          decision === "approved"
            ? "bg-[#17211c] text-white"
            : "border border-black/10 bg-white text-[#151914]",
        )}
      >
        {decision === "approved" ? "Approve" : "Reject"}
      </PendingButton>
    </form>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Resolving: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Approval: "bg-amber-50 text-amber-800 border-amber-200",
    Investigating: "bg-sky-50 text-sky-700 border-sky-200",
    Blocked: "bg-rose-50 text-rose-700 border-rose-200",
  };

  return (
    <span className={cn("rounded-md border px-2 py-1 text-xs font-semibold", styles[status])}>
      {status}
    </span>
  );
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-[#eef5ea] text-[#2e6658]">
            <Icon size={18} />
          </span>
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
        <button className="flex size-9 items-center justify-center rounded-lg border border-black/10">
          <MoreHorizontal size={17} />
        </button>
      </div>
      {children}
    </div>
  );
}
