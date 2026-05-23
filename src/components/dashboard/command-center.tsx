"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  Filter,
  MoreHorizontal,
  Plus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { ticketIcons } from "@/lib/dashboard-data";
import { cn } from "@/lib/utils";
import { decideApproval } from "@/app/app/actions";
import type { DashboardData } from "@/lib/supabase/bootstrap";
import { PendingButton } from "@/components/ui/pending-button";

export function CommandCenter({ data }: { data: DashboardData }) {
  return (
    <div className="ticketos-dashboard-content">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/42">
                  Command center
                </p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
                  IT work, agents, and approvals.
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
                    <p className="mt-1 text-sm text-black/48">
                      {data.filters.query
                        ? `Search results for "${data.filters.query}"`
                        : data.filters.view === "approvals"
                          ? "Waiting on approval"
                          : `${data.tickets.length} active requests`}
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
                      <Link
                        key={agent.name}
                        href="/app/agents"
                        className="block rounded-lg border border-black/10 p-4 transition hover:bg-[#f8faf5]"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold">{agent.name}</p>
                          <span className="rounded-md bg-[#edf5e9] px-2 py-1 text-xs font-semibold text-[#315f4f]">
                            {agent.state}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-black/52">{agent.load}</p>
                      </Link>
                    ))}
                  </div>
                </Panel>

                <Panel title="Approval queue" icon={BadgeCheck}>
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <p className="font-semibold text-amber-950">
                      {data.approval?.title ?? "No approvals waiting"}
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
    </div>
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
