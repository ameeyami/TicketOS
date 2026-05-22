import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bell,
  CheckCircle2,
  CircleAlert,
  Clock3,
  FileText,
  Loader2,
  ShieldAlert,
  Siren,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { reviewAttentionItem } from "@/app/app/notifications/actions";
import { PendingButton } from "@/components/ui/pending-button";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type AttentionItem = {
  id: string;
  type: string;
  title: string;
  detail: string;
  severity: "critical" | "high" | "medium" | "low";
  href: string;
  ticketId?: string | null;
  createdAt?: string | null;
  icon: LucideIcon;
};

const severityStyles: Record<AttentionItem["severity"], string> = {
  critical: "border-rose-200 bg-rose-50 text-rose-700",
  high: "border-amber-200 bg-amber-50 text-amber-800",
  medium: "border-sky-200 bg-sky-50 text-sky-700",
  low: "border-zinc-200 bg-zinc-50 text-zinc-700",
};

export default async function NotificationsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect("/auth/sign-in?message=Sign in to view notifications.");
  }

  const organization = await ensureWorkspace(supabase, userData.user);
  const [{ data: approvals }, { data: tickets }, { data: actions }, { data: runs }, { data: auditLogs }] =
    await Promise.all([
      supabase
        .from("approval_requests")
        .select("*, tickets(id, external_id, title, priority)")
        .eq("organization_id", organization.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("tickets")
        .select("id, external_id, title, status, priority, ai_confidence, created_at")
        .eq("organization_id", organization.id)
        .in("status", ["blocked", "failed", "approval_required"])
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("execution_actions")
        .select("*, workflow_runs(tickets(id, external_id, title), workflows(name))")
        .eq("organization_id", organization.id)
        .in("status", ["failed", "blocked", "pending"])
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("workflow_runs")
        .select("*, tickets(id, external_id, title), workflows(name)")
        .eq("organization_id", organization.id)
        .in("status", ["running", "waiting_for_approval", "failed", "blocked"])
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("audit_logs")
        .select("*, tickets(external_id, title)")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

  const attentionItems = buildAttentionItems({ approvals, tickets, actions, runs });
  const criticalCount = attentionItems.filter((item) => item.severity === "critical").length;
  const highCount = attentionItems.filter((item) => item.severity === "high").length;
  const approvalCount = attentionItems.filter((item) => item.type === "Approval").length;
  const executionCount = attentionItems.filter((item) => item.type === "Execution").length;

  return (
    <main className="min-h-screen bg-[#f6f7f2] px-4 py-6 text-[#151914] md:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/app"
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-black/10 bg-white px-3 text-sm font-semibold"
        >
          <ArrowLeft size={16} />
          Command center
        </Link>

        <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#47685d]">Notifications</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">Focus the operator’s attention.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-black/56">
              A unified attention feed for approvals, blocked tickets, failed execution actions, and workflow risk.
            </p>
          </div>
          <div className="rounded-lg border border-black/10 bg-white px-4 py-3 text-sm font-semibold">
            {organization.name}
          </div>
        </div>

        <section className="mt-6 grid gap-3 md:grid-cols-4">
          <MetricCard label="Attention items" value={String(attentionItems.length)} icon={Bell} />
          <MetricCard label="Critical" value={String(criticalCount)} icon={Siren} />
          <MetricCard label="High priority" value={String(highCount)} icon={ShieldAlert} />
          <MetricCard label="Approvals" value={String(approvalCount)} icon={BadgeCheck} />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_.68fr]">
          <div className="space-y-4">
            {attentionItems.map((item) => (
              <article key={item.id} className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 gap-4">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#eef5ea] text-[#2e6658]">
                      <item.icon size={20} />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn("rounded-md border px-2 py-1 text-xs font-semibold", severityStyles[item.severity])}>
                          {item.severity}
                        </span>
                        <span className="rounded-md border border-black/10 px-2 py-1 text-xs font-semibold text-black/52">
                          {item.type}
                        </span>
                        <span className="text-xs font-semibold text-black/38">{formatDate(item.createdAt)}</span>
                      </div>
                      <h2 className="mt-3 text-xl font-semibold tracking-tight">{item.title}</h2>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-black/56">{item.detail}</p>
                    </div>
                  </div>
                  <Link
                    href={item.href}
                    className="inline-flex h-10 w-fit items-center gap-2 rounded-lg border border-black/10 px-3 text-sm font-semibold"
                  >
                    Open
                    <ArrowRight size={15} />
                  </Link>
                </div>

                <form action={reviewAttentionItem} className="mt-5 rounded-lg border border-black/10 bg-[#f8faf5] p-4">
                  <input type="hidden" name="organizationId" value={organization.id} />
                  <input type="hidden" name="ticketId" value={item.ticketId ?? ""} />
                  <input type="hidden" name="itemType" value={item.type} />
                  <input type="hidden" name="itemTitle" value={item.title} />
                  <textarea
                    name="note"
                    rows={3}
                    className="w-full resize-none rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none placeholder:text-black/38 focus:border-[#2f6f60]"
                    placeholder="Optional review note, owner, or follow-up reference..."
                  />
                  <PendingButton pendingText="Marking..." className="mt-3 h-10 rounded-lg bg-[#17211c] px-3 text-sm font-semibold text-white">
                    <CheckCircle2 size={16} />
                    Mark reviewed
                  </PendingButton>
                </form>
              </article>
            ))}

            {attentionItems.length === 0 && (
              <div className="rounded-xl border border-dashed border-black/15 bg-white p-8 text-center">
                <CheckCircle2 size={28} className="mx-auto text-[#2f6f60]" />
                <p className="mt-3 font-semibold">No urgent attention items.</p>
                <p className="mt-2 text-sm text-black/52">Approvals, failures, and blocked workflows will appear here.</p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <Panel title="Attention mix" icon={FileText}>
              <div className="grid gap-3">
                <Fact label="Execution items" value={String(executionCount)} />
                <Fact label="Approval items" value={String(approvalCount)} />
                <Fact label="Recent audit events" value={String(auditLogs?.length ?? 0)} />
              </div>
            </Panel>

            <Panel title="Recent activity" icon={Clock3}>
              <div className="divide-y divide-black/8 rounded-lg border border-black/10">
                {(auditLogs ?? []).map((log) => (
                  <div key={log.id} className="p-4">
                    <p className="font-semibold">{log.event_summary}</p>
                    <p className="mt-1 text-sm text-black/50">
                      {log.tickets?.external_id ?? "workspace"} · {log.event_type.replaceAll("_", " ")} · {formatDate(log.created_at)}
                    </p>
                  </div>
                ))}
                {(auditLogs ?? []).length === 0 && (
                  <p className="p-4 text-sm text-black/48">Audit events will appear here.</p>
                )}
              </div>
            </Panel>
          </div>
        </section>
      </div>
    </main>
  );
}

function buildAttentionItems({
  approvals,
  tickets,
  actions,
  runs,
}: {
  approvals: unknown[] | null;
  tickets: unknown[] | null;
  actions: unknown[] | null;
  runs: unknown[] | null;
}) {
  const approvalItems = (approvals ?? []).map((approval) => {
    const row = approval as {
      id: string;
      title: string;
      description: string | null;
      ticket_id: string | null;
      created_at: string | null;
      tickets?: { id?: string; external_id?: string | null; title?: string | null; priority?: string | null } | null;
    };

    return {
      id: `approval-${row.id}`,
      type: "Approval",
      title: row.title,
      detail: row.description ?? `Approval needed for ${row.tickets?.external_id ?? "ticket"}.`,
      severity: row.tickets?.priority === "critical" ? "critical" : "high",
      href: "/app/approvals",
      ticketId: row.ticket_id,
      createdAt: row.created_at,
      icon: BadgeCheck,
    } satisfies AttentionItem;
  });

  const ticketItems = (tickets ?? []).map((ticket) => {
    const row = ticket as {
      id: string;
      external_id: string | null;
      title: string;
      status: string;
      priority: string;
      ai_confidence: number | null;
      created_at: string | null;
    };

    return {
      id: `ticket-${row.id}`,
      type: "Ticket",
      title: `${row.external_id ?? "Ticket"}: ${row.title}`,
      detail: `${row.status.replaceAll("_", " ")} · ${Number(row.ai_confidence ?? 0)}% AI confidence.`,
      severity: row.priority === "critical" || row.status === "failed" ? "critical" : row.priority === "high" ? "high" : "medium",
      href: `/app/tickets/${row.id}`,
      ticketId: row.id,
      createdAt: row.created_at,
      icon: row.status === "approval_required" ? BadgeCheck : CircleAlert,
    } satisfies AttentionItem;
  });

  const actionItems = (actions ?? []).map((action) => {
    const row = action as {
      id: string;
      status: string;
      integration_key: string;
      action_key: string;
      created_at: string | null;
      workflow_runs?: {
        tickets?: { id?: string; external_id?: string | null; title?: string | null } | null;
        workflows?: { name?: string | null } | null;
      } | null;
    };

    return {
      id: `action-${row.id}`,
      type: "Execution",
      title: `${row.integration_key}.${row.action_key} is ${row.status}`,
      detail: `${row.workflow_runs?.workflows?.name ?? "Workflow"} · ${row.workflow_runs?.tickets?.external_id ?? "unlinked ticket"}`,
      severity: row.status === "failed" || row.status === "blocked" ? "critical" : "medium",
      href: "/app/executions",
      ticketId: row.workflow_runs?.tickets?.id ?? null,
      createdAt: row.created_at,
      icon: row.status === "pending" ? Loader2 : ShieldAlert,
    } satisfies AttentionItem;
  });

  const runItems = (runs ?? []).map((run) => {
    const row = run as {
      id: string;
      status: string;
      confidence: number | null;
      created_at: string | null;
      ticket_id: string | null;
      tickets?: { id?: string; external_id?: string | null; title?: string | null } | null;
      workflows?: { name?: string | null } | null;
    };

    return {
      id: `run-${row.id}`,
      type: "Workflow",
      title: `${row.workflows?.name ?? "Workflow run"} is ${row.status}`,
      detail: `${row.tickets?.external_id ?? "Ticket"} · ${Number(row.confidence ?? 0)}% confidence.`,
      severity: row.status === "failed" || row.status === "blocked" ? "critical" : row.status === "waiting_for_approval" ? "high" : "low",
      href: "/app/audit",
      ticketId: row.ticket_id,
      createdAt: row.created_at,
      icon: Workflow,
    } satisfies AttentionItem;
  });

  return [...approvalItems, ...ticketItems, ...actionItems, ...runItems]
    .sort((a, b) => severityRank(a.severity) - severityRank(b.severity) || toTime(b.createdAt) - toTime(a.createdAt))
    .slice(0, 16);
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-black/52">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
        </div>
        <span className="flex size-11 items-center justify-center rounded-lg bg-[#eef5ea] text-[#2e6658]">
          <Icon size={20} />
        </span>
      </div>
    </div>
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
      <div className="mb-5 flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-lg bg-[#eef5ea] text-[#2e6658]">
          <Icon size={18} />
        </span>
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-black/10 bg-[#f8faf5] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/38">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function severityRank(severity: AttentionItem["severity"]) {
  return { critical: 0, high: 1, medium: 2, low: 3 }[severity];
}

function toTime(value: string | null | undefined) {
  return value ? new Date(value).getTime() : 0;
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Not recorded";
  }

  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
