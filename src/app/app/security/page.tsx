import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BadgeCheck,
  CircleAlert,
  LockKeyhole,
  ShieldAlert,
  ShieldCheck,
  Workflow,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { acknowledgeSecurityRisk, requestSecurityReview } from "@/app/app/security/actions";
import { PageHeader } from "@/components/dashboard/page-header";
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
  const [{ data: tickets }, { data: policyEvaluations }, { data: integrationActions }, { data: approvals }] =
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
  const pendingSecurityReviews = (approvals ?? []).filter((approval) => approval.status === "pending").length;
  const blockedTickets = securityTickets.filter((ticket) => ["blocked", "failed"].includes(ticket.status)).length;
  const highRiskActions = actions.filter((action) => action.risk_level === "high").length;

  return (
    <main className="min-h-screen px-4 py-6 text-[#151914] md:px-8">
      <div className="mx-auto max-w-6xl">
        <PageHeader
          crumbs={[{ label: "Governance" }, { label: "Security" }]}
          title="Security"
          description="Review blocked and high-risk work."
          actions={
            <Link
              href="/app/policies"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#0b2a4a] px-3 text-sm font-semibold text-white transition hover:bg-[#07111f]"
            >
              <ShieldAlert size={15} />
              Policies
            </Link>
          }
        />

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Risk tickets" value={String(securityTickets.length)} icon={LockKeyhole} />
          <MetricCard label="Blocked" value={String(blockedTickets)} icon={XCircle} />
          <MetricCard label="High-risk actions" value={String(highRiskActions)} icon={CircleAlert} />
          <MetricCard label="Reviews" value={String(pendingSecurityReviews)} icon={BadgeCheck} />
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_320px]">
          <div className="space-y-3">
            {securityTickets.map((ticket) => (
              <article key={ticket.id} className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Pill className={priorityStyles[ticket.priority] ?? priorityStyles.medium}>{ticket.priority}</Pill>
                  <Pill>{ticket.status.replaceAll("_", " ")}</Pill>
                  <Pill>{ticket.category ?? "Security"}</Pill>
                  <span className="ml-auto text-xs font-medium text-slate-400">
                    {ticket.external_id ?? "Ticket"} · {formatDate(ticket.created_at)}
                  </span>
                </div>

                <h2 className="mt-2.5 text-base font-semibold tracking-tight">{ticket.title}</h2>
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">
                  {ticket.ai_summary ?? "Security signal captured from ticket, policy, or workflow context."}
                </p>

                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                  <Meta label="Requester" value={ticket.requester_name ?? ticket.requester_email ?? "Unknown"} />
                  <Meta label="Confidence" value={`${Math.round((ticket.ai_confidence ?? 0) * 100)}%`} />
                  <Meta label="Risk" value={riskLabel(ticket)} />
                  <Meta label="Next" value={ticket.status === "blocked" ? "Human review" : "Monitor"} />
                </div>

                <div className="mt-3 flex flex-col gap-2 border-t border-black/[0.06] pt-3 sm:flex-row sm:items-center">
                  <form action={acknowledgeSecurityRisk} className="flex flex-1 items-center gap-2">
                    <input type="hidden" name="organizationId" value={organization.id} />
                    <input type="hidden" name="ticketId" value={ticket.id} />
                    <input type="hidden" name="title" value={ticket.external_id ?? ticket.title} />
                    <input
                      name="note"
                      placeholder="Acknowledgement note (optional)"
                      className="h-9 min-w-0 flex-1 rounded-lg border border-black/10 bg-white px-3 text-sm outline-none placeholder:text-black/30 focus:border-[#0b2a4a]"
                    />
                    <PendingButton
                      pendingText="..."
                      className="h-9 shrink-0 rounded-lg bg-[#0b2a4a] px-3 text-sm font-semibold text-white"
                    >
                      <ShieldCheck size={15} />
                      Acknowledge
                    </PendingButton>
                  </form>

                  <form action={requestSecurityReview} className="flex items-center gap-2">
                    <input type="hidden" name="organizationId" value={organization.id} />
                    <input type="hidden" name="ticketId" value={ticket.id} />
                    <input type="hidden" name="title" value={ticket.external_id ?? ticket.title} />
                    <select
                      name="severity"
                      defaultValue={ticket.priority === "critical" ? "critical" : "high"}
                      className="h-9 rounded-lg border border-black/10 bg-white px-2 text-sm font-semibold outline-none"
                    >
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                    <PendingButton
                      pendingText="..."
                      className="h-9 shrink-0 rounded-lg border border-black/10 bg-white px-3 text-sm font-semibold text-[#0b2a4a]"
                    >
                      Request review
                    </PendingButton>
                  </form>
                </div>
              </article>
            ))}

            {securityTickets.length === 0 && (
              <div className="rounded-xl border border-dashed border-black/15 bg-white p-8 text-center">
                <ShieldCheck size={26} className="mx-auto text-[#0b5f91]" />
                <p className="mt-3 font-semibold">No active security risks.</p>
                <p className="mt-1 text-sm text-slate-500">Blocked tickets, critical requests, and policy hits will appear here.</p>
              </div>
            )}
          </div>

          <div className="space-y-5">
            <Panel title="High-risk actions" icon={Workflow}>
              <div className="space-y-2">
                {actions.map((action) => (
                  <div key={action.id} className="rounded-lg border border-black/10 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{action.display_name}</p>
                      <Pill className={priorityStyles[action.risk_level] ?? priorityStyles.medium}>{action.risk_level}</Pill>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {one(action.integrations)?.display_name ?? "Integration"} · {action.action_key}
                      {action.requires_approval && " · approval"}
                    </p>
                  </div>
                ))}
                {actions.length === 0 && <p className="rounded-lg border border-dashed border-black/15 p-3 text-sm text-slate-500">No high-risk integration actions configured.</p>}
              </div>
            </Panel>

            <Panel title="Policy decisions" icon={ShieldAlert}>
              <div className="space-y-2">
                {evaluations.slice(0, 6).map((evaluation) => (
                  <div key={evaluation.id} className="rounded-lg border border-black/10 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold">{one(evaluation.policy_rules)?.name ?? "Runtime policy"}</p>
                      <Pill className={decisionStyles[evaluation.decision] ?? "border-zinc-200 bg-zinc-50 text-zinc-700"}>
                        {evaluation.decision.replaceAll("_", " ")}
                      </Pill>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{evaluation.reason ?? "Policy decision recorded."}</p>
                  </div>
                ))}
                {evaluations.length === 0 && <p className="rounded-lg border border-dashed border-black/15 p-3 text-sm text-slate-500">Policy stops will appear here.</p>}
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
    <div className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight">{value}</p>
        </div>
        <span className="flex size-9 items-center justify-center rounded-lg bg-[#e7f0ff] text-[#0b5f91]">
          <Icon size={17} />
        </span>
      </div>
    </div>
  );
}

function Panel({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-lg bg-[#e7f0ff] text-[#0b5f91]">
          <Icon size={15} />
        </span>
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <span>
      <span className="text-slate-400">{label}:</span> <span className="font-semibold text-slate-600">{value}</span>
    </span>
  );
}

function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("rounded-md border border-black/10 bg-white px-2 py-0.5 text-xs font-semibold text-black/52", className)}>
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
