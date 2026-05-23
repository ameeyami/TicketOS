import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  CircleAlert,
  FileText,
  LockKeyhole,
  ShieldAlert,
  ShieldCheck,
  Workflow,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { acknowledgeSecurityRisk, requestSecurityReview } from "@/app/app/security/actions";
import { PendingButton } from "@/components/ui/pending-button";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type TicketRow = {
  id: string;
  external_id: string | null;
  title: string;
  status: string;
  priority: string;
  category: string | null;
  requester_name: string | null;
  requester_email: string | null;
  ai_confidence: number | null;
  ai_summary: string | null;
  created_at: string;
};

type AuditRow = {
  id: string;
  event_type: string;
  event_summary: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
  tickets?: Relation<{ external_id: string | null; title: string | null }>;
};

type PolicyEvaluationRow = {
  id: string;
  decision: string;
  reason: string | null;
  confidence: number | null;
  created_at: string;
  tickets?: Relation<{ external_id: string | null; title: string | null }>;
  policy_rules?: Relation<{ name: string | null }>;
};

type IntegrationActionRow = {
  id: string;
  display_name: string;
  action_key: string;
  risk_level: string;
  requires_approval: boolean;
  integrations?: Relation<{ display_name: string | null }>;
};

type Relation<T> = T | T[] | null;

const priorityStyles: Record<string, string> = {
  critical: "border-rose-200 bg-rose-50 text-rose-700",
  high: "border-amber-200 bg-amber-50 text-amber-800",
  medium: "border-sky-200 bg-sky-50 text-sky-700",
  low: "border-zinc-200 bg-zinc-50 text-zinc-700",
};

const decisionStyles: Record<string, string> = {
  block: "border-rose-200 bg-rose-50 text-rose-700",
  approval_required: "border-amber-200 bg-amber-50 text-amber-800",
  allow: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

export default async function SecurityPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect("/auth/sign-in?message=Sign in to review security.");
  }

  const organization = await ensureWorkspace(supabase, userData.user);
  const [{ data: tickets }, { data: policyEvaluations }, { data: integrationActions }, { data: auditLogs }, { data: approvals }] =
    await Promise.all([
      supabase
        .from("tickets")
        .select("id, external_id, title, status, priority, category, requester_name, requester_email, ai_confidence, ai_summary, created_at")
        .eq("organization_id", organization.id)
        .or("category.eq.Security,priority.eq.critical,priority.eq.high,status.eq.blocked,status.eq.failed")
        .order("created_at", { ascending: false })
        .limit(24),
      supabase
        .from("policy_evaluations")
        .select("id, decision, reason, confidence, created_at, tickets(external_id, title), policy_rules(name)")
        .eq("organization_id", organization.id)
        .in("decision", ["block", "approval_required"])
        .order("created_at", { ascending: false })
        .limit(12),
      supabase
        .from("integration_actions")
        .select("id, display_name, action_key, risk_level, requires_approval, integrations(display_name)")
        .eq("organization_id", organization.id)
        .or("risk_level.eq.high,requires_approval.eq.true")
        .order("risk_level", { ascending: false })
        .limit(12),
      supabase
        .from("audit_logs")
        .select("id, event_type, event_summary, created_at, metadata, tickets(external_id, title)")
        .eq("organization_id", organization.id)
        .in("event_type", ["blocked", "ticket_blocked", "security_risk_acknowledged", "security_review_requested", "policy_rule_created", "incident_opened"])
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("approval_requests")
        .select("id, title, status, created_at")
        .eq("organization_id", organization.id)
        .ilike("title", "Security review:%")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

  const securityTickets = (tickets ?? []) as TicketRow[];
  const evaluations = (policyEvaluations ?? []) as unknown as PolicyEvaluationRow[];
  const actions = (integrationActions ?? []) as unknown as IntegrationActionRow[];
  const logs = (auditLogs ?? []) as unknown as AuditRow[];
  const pendingSecurityReviews = (approvals ?? []).filter((approval) => approval.status === "pending").length;
  const blockedTickets = securityTickets.filter((ticket) => ["blocked", "failed"].includes(ticket.status)).length;
  const highRiskActions = actions.filter((action) => action.risk_level === "high").length;

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
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#47685d]">Security</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Security review center.</h1>
          </div>
          <Link
            href="/app/policies"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#17211c] px-3 text-sm font-semibold text-white"
          >
            Policies
            <ShieldAlert size={16} />
          </Link>
        </div>

        <section className="mt-6 grid gap-3 md:grid-cols-4">
          <MetricCard label="Risk tickets" value={String(securityTickets.length)} icon={LockKeyhole} />
          <MetricCard label="Blocked" value={String(blockedTickets)} icon={XCircle} />
          <MetricCard label="High-risk actions" value={String(highRiskActions)} icon={CircleAlert} />
          <MetricCard label="Reviews" value={String(pendingSecurityReviews)} icon={BadgeCheck} />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_.38fr]">
          <div className="space-y-4">
            {securityTickets.map((ticket) => (
              <article key={ticket.id} className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Pill className={priorityStyles[ticket.priority] ?? priorityStyles.medium}>{ticket.priority}</Pill>
                      <Pill>{ticket.status.replaceAll("_", " ")}</Pill>
                      <Pill>{ticket.category ?? "Security"}</Pill>
                    </div>
                    <h2 className="mt-3 text-xl font-semibold tracking-tight">{ticket.title}</h2>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-black/55">
                      {ticket.ai_summary ?? "Security signal captured from ticket, policy, or workflow context."}
                    </p>
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-black/38">
                    {ticket.external_id ?? "Ticket"} · {formatDate(ticket.created_at)}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-4">
                  <Fact label="Requester" value={ticket.requester_name ?? ticket.requester_email ?? "Unknown"} />
                  <Fact label="Confidence" value={`${Math.round((ticket.ai_confidence ?? 0) * 100)}%`} />
                  <Fact label="Risk" value={riskLabel(ticket)} />
                  <Fact label="Next step" value={ticket.status === "blocked" ? "Human review" : "Monitor"} />
                </div>

                <div className="mt-5 grid gap-3 lg:grid-cols-2">
                  <form action={acknowledgeSecurityRisk} className="rounded-lg border border-black/10 bg-[#f8faf5] p-4">
                    <input type="hidden" name="organizationId" value={organization.id} />
                    <input type="hidden" name="ticketId" value={ticket.id} />
                    <input type="hidden" name="title" value={ticket.external_id ?? ticket.title} />
                    <textarea
                      name="note"
                      rows={3}
                      placeholder="Optional acknowledgement note..."
                      className="w-full resize-none rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none"
                    />
                    <PendingButton pendingText="Logging..." className="mt-3 h-10 rounded-lg bg-[#17211c] px-3 text-sm font-semibold text-white">
                      <ShieldCheck size={16} />
                      Acknowledge
                    </PendingButton>
                  </form>

                  <form action={requestSecurityReview} className="rounded-lg border border-black/10 bg-white p-4">
                    <input type="hidden" name="organizationId" value={organization.id} />
                    <input type="hidden" name="ticketId" value={ticket.id} />
                    <input type="hidden" name="title" value={ticket.external_id ?? ticket.title} />
                    <div className="grid gap-3 sm:grid-cols-[.55fr_1fr]">
                      <select name="severity" defaultValue={ticket.priority === "critical" ? "critical" : "high"} className="h-10 rounded-lg border border-black/10 bg-white px-3 text-sm font-semibold outline-none">
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                      <input
                        name="note"
                        placeholder="Optional review note"
                        className="h-10 rounded-lg border border-black/10 bg-white px-3 text-sm outline-none"
                      />
                    </div>
                    <PendingButton pendingText="Requesting..." className="mt-3 h-10 rounded-lg border border-black/10 bg-white px-3 text-sm font-semibold text-[#17211c]">
                      Request security review
                    </PendingButton>
                  </form>
                </div>
              </article>
            ))}

            {securityTickets.length === 0 && (
              <div className="rounded-xl border border-dashed border-black/15 bg-white p-8 text-center">
                <ShieldCheck size={28} className="mx-auto text-[#2f6f60]" />
                <p className="mt-3 font-semibold">No active security risks.</p>
                <p className="mt-2 text-sm text-black/52">Blocked tickets, critical requests, and security policy hits will appear here.</p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <Panel title="High-risk actions" icon={Workflow}>
              <div className="divide-y divide-black/8 rounded-lg border border-black/10">
                {actions.map((action) => (
                  <div key={action.id} className="p-4">
                    <p className="font-semibold">{action.display_name}</p>
                    <p className="mt-1 text-sm text-black/48">
                      {one(action.integrations)?.display_name ?? "Integration"} · {action.action_key}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Pill className={priorityStyles[action.risk_level] ?? priorityStyles.medium}>{action.risk_level}</Pill>
                      {action.requires_approval && <Pill>approval</Pill>}
                    </div>
                  </div>
                ))}
                {actions.length === 0 && <p className="p-4 text-sm text-black/48">No high-risk integration actions configured.</p>}
              </div>
            </Panel>

            <Panel title="Policy decisions" icon={ShieldAlert}>
              <div className="space-y-3">
                {evaluations.slice(0, 6).map((evaluation) => (
                  <div key={evaluation.id} className="rounded-lg border border-black/10 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold">{one(evaluation.policy_rules)?.name ?? "Runtime policy"}</p>
                      <Pill className={decisionStyles[evaluation.decision] ?? "border-zinc-200 bg-zinc-50 text-zinc-700"}>
                        {evaluation.decision.replaceAll("_", " ")}
                      </Pill>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-black/52">{evaluation.reason ?? "Policy decision recorded."}</p>
                  </div>
                ))}
                {evaluations.length === 0 && <p className="rounded-lg border border-dashed border-black/15 p-4 text-sm text-black/48">Policy stops will appear here.</p>}
              </div>
            </Panel>

            <Panel title="Security audit" icon={FileText}>
              <div className="divide-y divide-black/8 rounded-lg border border-black/10">
                {logs.slice(0, 8).map((log) => (
                  <div key={log.id} className="p-4">
                    <p className="font-semibold">{log.event_summary}</p>
                    <p className="mt-1 text-sm text-black/48">
                      {log.event_type.replaceAll("_", " ")} · {formatDate(log.created_at)}
                    </p>
                  </div>
                ))}
                {logs.length === 0 && <p className="p-4 text-sm text-black/48">Security events will appear here.</p>}
              </div>
            </Panel>
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricCard({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) {
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

function Panel({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }) {
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
      <p className="mt-2 text-sm font-semibold text-black/70">{value}</p>
    </div>
  );
}

function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("rounded-md border border-black/10 bg-white px-2 py-1 text-xs font-semibold text-black/52", className)}>
      {children}
    </span>
  );
}

function riskLabel(ticket: TicketRow) {
  if (ticket.priority === "critical") return "Critical";
  if (ticket.status === "blocked" || ticket.status === "failed" || ticket.priority === "high") return "High";
  return "Medium";
}

function one<T>(value: Relation<T>) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not recorded";

  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
