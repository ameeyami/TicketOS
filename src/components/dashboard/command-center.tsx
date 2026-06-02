"use client";

import { motion } from "framer-motion";
import { ArrowRight, BadgeCheck, Filter, MoreHorizontal, Plus, ShieldCheck, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { decideApproval } from "@/app/app/actions";
import { PendingButton } from "@/components/ui/pending-button";
import { ticketIcons } from "@/lib/dashboard-data";
import type { DashboardData } from "@/lib/supabase/bootstrap";
import { cn } from "@/lib/utils";

export function CommandCenter({ data, aiKeyConnected }: { data: DashboardData; aiKeyConnected: boolean }) {
  const primaryMetrics = data.metrics.slice(0, 3);
  const hasFilter = Boolean(data.filters.query) || data.filters.view === "approvals";
  // The full ticket list lives on the inbox. On the dashboard, show only the
  // requests actually waiting on a person (skip ones already resolving).
  const attentionTickets = hasFilter
    ? data.tickets
    : data.tickets.filter((ticket) => ticket.status !== "Resolving").slice(0, 5);

  return (
    <div className="ticketos-dashboard-content">
      {!aiKeyConnected && (
        <Link
          href="/app/diagnostics"
          className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
        >
          <span className="flex items-center gap-2">
            <Sparkles size={16} />
            Connect your Claude API key to turn on AI triage and Copilot.
          </span>
          <span className="inline-flex items-center gap-1">
            Connect
            <ArrowRight size={15} />
          </span>
        </Link>
      )}
      <section className="rounded-lg border border-black/10 bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1fr_320px]">
          <div className="p-5 md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#0b5f91]">Service workspace</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#07111f] md:text-4xl">
                  IT requests ready for action
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                  Review live requests, route approvals, and inspect agent execution from one clean operations view.
                </p>
              </div>
              <div className="flex gap-2">
                <Link href="/app?view=approvals" className="inline-flex h-10 items-center gap-2 rounded-md border border-black/10 bg-white px-3 text-sm font-semibold">
                  <Filter size={16} />
                  Approvals
                </Link>
                <Link href="/app/tickets/new" className="inline-flex h-10 items-center gap-2 rounded-md bg-[#0b2a4a] px-3 text-sm font-semibold text-white">
                  <Plus size={16} />
                  New ticket
                </Link>
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {primaryMetrics.map((metric, index) => (
                <motion.div
                  key={metric.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className="rounded-md border border-black/10 bg-[#f8fbfe] p-4"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{metric.label}</p>
                  <p className="mt-3 text-3xl font-semibold tracking-tight text-[#07111f]">{metric.value}</p>
                  <p className="mt-1 text-xs font-semibold text-[#0f7a5f]">{metric.delta}</p>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="border-t border-black/10 bg-[#07111f] p-5 text-white lg:border-l lg:border-t-0">
            <div className="flex items-center justify-between">
              <p className="font-semibold">Agent status</p>
              <span className="rounded-md bg-[#22c55e] px-2 py-1 text-xs font-semibold text-[#03120a]">Live</span>
            </div>
            <div className="mt-4 space-y-3">
              {data.agents.slice(0, 3).map((agent) => (
                <Link key={agent.name} href="/app/autonomy" className="block rounded-md border border-white/10 bg-white/[0.06] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">{agent.name}</p>
                    <span className="text-xs text-white/58">{agent.state}</span>
                  </div>
                  <p className="mt-1 text-sm text-white/58">{agent.load}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className="rounded-lg border border-black/10 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
            <div>
              <h2 className="font-semibold">{hasFilter ? "Service queue" : "Needs your attention"}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {data.filters.query
                  ? `Search results for "${data.filters.query}"`
                  : data.filters.view === "approvals"
                    ? "Requests waiting on approval"
                    : attentionTickets.length
                      ? `${attentionTickets.length} request${attentionTickets.length === 1 ? "" : "s"} waiting on a person`
                      : "Queue is clear"}
              </p>
            </div>
            <Link href="/app/tickets" className="inline-flex h-9 items-center gap-2 rounded-md border border-black/10 px-3 text-sm font-semibold">
              Open inbox
              <ArrowRight size={15} />
            </Link>
          </div>

          <div className="divide-y divide-black/8">
            {attentionTickets.map((ticket) => {
              const TicketIcon = ticketIcons[ticket.category as keyof typeof ticketIcons] ?? ticketIcons.Default;

              return (
                <div key={ticket.id} className="grid gap-3 px-4 py-3 transition hover:bg-[#f8fbfe] lg:grid-cols-[1fr_170px]">
                  <div className="flex min-w-0 gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#e7f3ff] text-[#0b5f91]">
                      <TicketIcon size={17} />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-slate-500">{ticket.id}</span>
                        <StatusPill status={ticket.status} />
                        <span className="rounded border border-black/10 px-2 py-0.5 text-xs font-semibold text-slate-600">
                          {ticket.priority}
                        </span>
                      </div>
                      <h3 className="mt-1 truncate font-semibold tracking-tight">{ticket.title}</h3>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 lg:justify-end">
                    <div className="text-sm text-slate-500 lg:text-right">
                      <p className="font-semibold text-[#07111f]">{ticket.agent}</p>
                      <p className="text-xs">{ticket.confidence}% confidence</p>
                    </div>
                    <Link href={`/app/tickets/${ticket.databaseId}`} className="inline-flex h-8 items-center gap-2 rounded-md bg-[#0b2a4a] px-3 text-xs font-semibold text-white">
                      Inspect
                    </Link>
                  </div>
                </div>
              );
            })}

            {attentionTickets.length === 0 && (
              <div className="px-4 py-10 text-center">
                <p className="text-sm font-semibold text-[#07111f]">Queue is clear</p>
                <p className="mt-1 text-sm text-slate-500">Nothing is waiting on a person right now.</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <Panel title="Approval queue" icon={BadgeCheck}>
            <div className="rounded-md border border-black/10 bg-[#f8fbfe] p-3">
              <p className="font-semibold text-[#07111f]">{data.approval?.title ?? "No approvals waiting"}</p>
              {data.approval?.status === "pending" && (
                <div className="mt-4 flex gap-2">
                  <ApprovalForm approval={data.approval} decision="approved" />
                  <ApprovalForm approval={data.approval} decision="rejected" />
                </div>
              )}
            </div>
          </Panel>

          <Panel title="Controls" icon={ShieldCheck}>
            <div className="grid gap-2">
              <Link href="/app/workflows" className="flex items-center justify-between rounded-md border border-black/10 p-3 text-sm font-semibold hover:bg-[#f8fbfe]">
                Workflows
                <ArrowRight size={14} />
              </Link>
              <Link href="/app/integrations" className="flex items-center justify-between rounded-md border border-black/10 p-3 text-sm font-semibold hover:bg-[#f8fbfe]">
                Applications
                <ArrowRight size={14} />
              </Link>
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
          "h-9 rounded-md px-3 text-sm font-semibold",
          decision === "approved" ? "bg-[#0b2a4a] text-white" : "border border-black/10 bg-white text-[#07111f]",
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
    Approval: "bg-[#e7f3ff] text-[#0b5f91] border-[#b7d8f2]",
    Investigating: "bg-sky-50 text-sky-700 border-sky-200",
    Blocked: "bg-rose-50 text-rose-700 border-rose-200",
  };

  return <span className={cn("rounded border px-2 py-0.5 text-xs font-semibold", styles[status])}>{status}</span>;
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
    <div className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-md bg-[#e7f3ff] text-[#0b5f91]">
            <Icon size={16} />
          </span>
          <h2 className="font-semibold">{title}</h2>
        </div>
        <button className="flex size-8 items-center justify-center rounded-md border border-black/10">
          <MoreHorizontal size={15} />
        </button>
      </div>
      {children}
    </div>
  );
}
