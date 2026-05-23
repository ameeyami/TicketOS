import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  FileText,
  KeyRound,
  ShieldCheck,
  UserRound,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { decideAccessReview, logAccessCertification } from "@/app/app/access-reviews/actions";
import { PendingButton } from "@/components/ui/pending-button";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type ApprovalRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  due_at: string | null;
  created_at: string;
  decision_note: string | null;
};

type AuditRow = {
  id: string;
  event_type: string;
  event_summary: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

type TicketRow = {
  id: string;
  requester_name: string | null;
  requester_email: string | null;
  category: string | null;
  status: string;
  priority: string;
  created_at: string;
};

type PersonAccess = {
  name: string;
  email: string;
  requestCount: number;
  openCount: number;
  highRiskCount: number;
  lastSeen: string;
  topCategory: string;
  reviewCount: number;
  certifiedCount: number;
};

const statusStyles: Record<string, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-800",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  rejected: "border-rose-200 bg-rose-50 text-rose-700",
  cancelled: "border-zinc-200 bg-zinc-50 text-zinc-700",
};

export default async function AccessReviewsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect("/auth/sign-in?message=Sign in to review access.");
  }

  const organization = await ensureWorkspace(supabase, userData.user);
  const [{ data: approvals }, { data: audits }, { data: tickets }] = await Promise.all([
    supabase
      .from("approval_requests")
      .select("id, title, description, status, due_at, created_at, decision_note")
      .eq("organization_id", organization.id)
      .ilike("title", "Access review:%")
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("audit_logs")
      .select("id, event_type, event_summary, created_at, metadata")
      .eq("organization_id", organization.id)
      .in("event_type", ["access_review_requested", "access_review_completed", "access_certified"])
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("tickets")
      .select("id, requester_name, requester_email, category, status, priority, created_at")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false })
      .limit(120),
  ]);

  const approvalRows = (approvals ?? []) as ApprovalRow[];
  const auditRows = (audits ?? []) as AuditRow[];
  const people = buildPeople((tickets ?? []) as TicketRow[], auditRows);
  const pendingReviews = approvalRows.filter((approval) => approval.status === "pending");
  const decidedReviews = approvalRows.filter((approval) => approval.status !== "pending");
  const certifiedCount = auditRows.filter((audit) => audit.event_type === "access_certified").length;

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
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#47685d]">Access reviews</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Review access before agents proceed.</h1>
          </div>
          <Link
            href="/app/people"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#17211c] px-3 text-sm font-semibold text-white"
          >
            People
            <UserRound size={16} />
          </Link>
        </div>

        <section className="mt-6 grid gap-3 md:grid-cols-4">
          <MetricCard label="Pending" value={String(pendingReviews.length)} icon={Clock3} />
          <MetricCard label="Decided" value={String(decidedReviews.length)} icon={BadgeCheck} />
          <MetricCard label="People" value={String(people.length)} icon={UserRound} />
          <MetricCard label="Certified" value={String(certifiedCount)} icon={ShieldCheck} />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_.42fr]">
          <div className="space-y-6">
            <Panel title="Pending reviews" icon={KeyRound}>
              <div className="space-y-4">
                {pendingReviews.map((approval) => {
                  const audit = auditRows.find((row) => row.metadata?.approval_id === approval.id);
                  const personEmail = typeof audit?.metadata?.person_email === "string" ? audit.metadata.person_email : "";
                  const personName = typeof audit?.metadata?.person_name === "string" ? audit.metadata.person_name : titleFromApproval(approval.title);

                  return (
                    <article key={approval.id} className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusPill status={approval.status} />
                            <span className="rounded-md border border-black/10 px-2 py-1 text-xs font-semibold text-black/52">
                              {String(audit?.metadata?.risk ?? "medium")}
                            </span>
                          </div>
                          <h2 className="mt-3 text-xl font-semibold tracking-tight">{approval.title}</h2>
                          <p className="mt-2 max-w-3xl text-sm leading-6 text-black/55">
                            {approval.description ?? "Review whether this person should keep or receive access."}
                          </p>
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-black/38">
                          Due {formatDate(approval.due_at)}
                        </span>
                      </div>

                      <div className="mt-5 grid gap-3 md:grid-cols-3">
                        <Fact label="Person" value={personName || personEmail || "Unknown"} />
                        <Fact label="Email" value={personEmail || "Not recorded"} />
                        <Fact label="Requested" value={formatDate(approval.created_at)} />
                      </div>

                      <div className="mt-5 grid gap-3 lg:grid-cols-2">
                        <DecisionForm
                          approval={approval}
                          organizationId={organization.id}
                          personEmail={personEmail}
                          personName={personName}
                          decision="approved"
                        />
                        <DecisionForm
                          approval={approval}
                          organizationId={organization.id}
                          personEmail={personEmail}
                          personName={personName}
                          decision="rejected"
                        />
                      </div>
                    </article>
                  );
                })}
                {pendingReviews.length === 0 && (
                  <p className="rounded-xl border border-dashed border-black/15 bg-white p-5 text-sm text-black/48">
                    No access reviews are waiting right now.
                  </p>
                )}
              </div>
            </Panel>

            <Panel title="People access context" icon={UserRound}>
              <div className="grid gap-4 lg:grid-cols-2">
                {people.slice(0, 8).map((person) => (
                  <article key={person.email} className="rounded-xl border border-black/10 bg-white p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">{person.name}</h3>
                        <p className="mt-1 text-sm text-black/52">{person.email}</p>
                      </div>
                      <span className="rounded-md border border-black/10 px-2 py-1 text-xs font-semibold text-black/52">
                        {person.topCategory}
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <MiniFact label="Requests" value={String(person.requestCount)} />
                      <MiniFact label="Open" value={String(person.openCount)} />
                      <MiniFact label="High risk" value={String(person.highRiskCount)} />
                    </div>
                    <form action={logAccessCertification} className="mt-4 rounded-lg border border-black/10 bg-[#f8faf5] p-3">
                      <input type="hidden" name="organizationId" value={organization.id} />
                      <input type="hidden" name="personEmail" value={person.email} />
                      <input type="hidden" name="personName" value={person.name} />
                      <input
                        name="note"
                        placeholder="Optional certification note"
                        className="h-10 w-full rounded-lg border border-black/10 bg-white px-3 text-sm outline-none"
                      />
                      <PendingButton pendingText="Certifying..." className="mt-3 h-9 rounded-lg bg-[#17211c] px-3 text-sm font-semibold text-white">
                        <CheckCircle2 size={15} />
                        Certify access
                      </PendingButton>
                    </form>
                  </article>
                ))}
                {people.length === 0 && (
                  <p className="rounded-lg border border-dashed border-black/15 p-4 text-sm text-black/48">
                    Requester access context appears after tickets are created.
                  </p>
                )}
              </div>
            </Panel>
          </div>

          <div className="space-y-6">
            <Panel title="Review history" icon={BadgeCheck}>
              <div className="space-y-3">
                {decidedReviews.map((approval) => (
                  <div key={approval.id} className="rounded-lg border border-black/10 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold">{approval.title}</p>
                      <StatusPill status={approval.status} />
                    </div>
                    {approval.decision_note && <p className="mt-3 text-sm leading-6 text-black/55">{approval.decision_note}</p>}
                  </div>
                ))}
                {decidedReviews.length === 0 && (
                  <p className="rounded-lg border border-dashed border-black/15 p-4 text-sm text-black/48">
                    Completed access reviews will appear here.
                  </p>
                )}
              </div>
            </Panel>

            <Panel title="Access audit" icon={FileText}>
              <div className="divide-y divide-black/8 rounded-lg border border-black/10">
                {auditRows.slice(0, 12).map((audit) => (
                  <div key={audit.id} className="p-4">
                    <p className="font-semibold">{audit.event_summary}</p>
                    <p className="mt-1 text-sm text-black/48">
                      {audit.event_type.replaceAll("_", " ")} · {formatDate(audit.created_at)}
                    </p>
                  </div>
                ))}
                {auditRows.length === 0 && <p className="p-4 text-sm text-black/48">Access review events will appear here.</p>}
              </div>
            </Panel>
          </div>
        </section>
      </div>
    </main>
  );
}

function DecisionForm({
  approval,
  organizationId,
  personEmail,
  personName,
  decision,
}: {
  approval: ApprovalRow;
  organizationId: string;
  personEmail: string;
  personName: string;
  decision: "approved" | "rejected";
}) {
  return (
    <form action={decideAccessReview} className="rounded-lg border border-black/10 bg-[#f8faf5] p-4">
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="approvalId" value={approval.id} />
      <input type="hidden" name="personEmail" value={personEmail} />
      <input type="hidden" name="personName" value={personName} />
      <input type="hidden" name="decision" value={decision} />
      <textarea
        name="note"
        rows={3}
        placeholder={decision === "approved" ? "Optional approval note..." : "Optional rejection reason..."}
        className="w-full resize-none rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none"
      />
      <PendingButton
        pendingText={decision === "approved" ? "Approving..." : "Rejecting..."}
        className={cn(
          "mt-3 h-10 rounded-lg px-3 text-sm font-semibold",
          decision === "approved" ? "bg-[#17211c] text-white" : "border border-black/10 bg-white text-[#17211c]",
        )}
      >
        {decision === "approved" ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
        {decision === "approved" ? "Approve access" : "Reject access"}
      </PendingButton>
    </form>
  );
}

function buildPeople(tickets: TicketRow[], audits: AuditRow[]) {
  const grouped = new Map<string, TicketRow[]>();

  for (const ticket of tickets) {
    const email = ticket.requester_email?.trim().toLowerCase();
    if (!email) continue;
    grouped.set(email, [...(grouped.get(email) ?? []), ticket]);
  }

  return Array.from(grouped.entries())
    .map(([email, rows]) => {
      const categories = rows.reduce<Record<string, number>>((acc, ticket) => {
        const category = ticket.category ?? "General";
        acc[category] = (acc[category] ?? 0) + 1;
        return acc;
      }, {});

      return {
        name: rows[0]?.requester_name || email,
        email,
        requestCount: rows.length,
        openCount: rows.filter((ticket) => !["resolved", "closed"].includes(ticket.status)).length,
        highRiskCount: rows.filter((ticket) => ["high", "critical"].includes(ticket.priority)).length,
        lastSeen: rows[0]?.created_at ?? new Date().toISOString(),
        topCategory: Object.entries(categories).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "General",
        reviewCount: audits.filter((audit) => audit.metadata?.person_email === email && audit.event_type === "access_review_requested").length,
        certifiedCount: audits.filter((audit) => audit.metadata?.person_email === email && audit.event_type === "access_certified").length,
      } satisfies PersonAccess;
    })
    .sort((a, b) => b.highRiskCount - a.highRiskCount || b.openCount - a.openCount || new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());
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
      <p className="mt-2 break-words text-sm font-semibold text-black/70">{value}</p>
    </div>
  );
}

function MiniFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-black/10 bg-[#f8faf5] p-3">
      <p className="text-xs text-black/42">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className={cn("rounded-md border px-2 py-1 text-xs font-semibold", statusStyles[status] ?? "border-zinc-200 bg-zinc-50 text-zinc-700")}>
      {status}
    </span>
  );
}

function titleFromApproval(title: string) {
  return title.replace(/^Access review:\s*/i, "");
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
