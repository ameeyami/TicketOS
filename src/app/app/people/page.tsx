import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  MessageSquareText,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { recordPeopleReview, requestAccessReview } from "@/app/app/people/actions";
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
  created_at: string;
  resolved_at: string | null;
};

type AuditRow = {
  id: string;
  event_type: string;
  event_summary: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

type Person = {
  name: string;
  email: string;
  tickets: TicketRow[];
  openCount: number;
  blockedCount: number;
  approvalCount: number;
  avgConfidence: number;
  lastSeen: string;
  topCategory: string;
  accessReviews: number;
};

const statusStyles: Record<string, string> = {
  resolved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  blocked: "border-rose-200 bg-rose-50 text-rose-700",
  failed: "border-rose-200 bg-rose-50 text-rose-700",
  pending_approval: "border-amber-200 bg-amber-50 text-amber-800",
  in_progress: "border-sky-200 bg-sky-50 text-sky-700",
  triaged: "border-zinc-200 bg-zinc-50 text-zinc-700",
};

export default async function PeoplePage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect("/auth/sign-in?message=Sign in to view people.");
  }

  const organization = await ensureWorkspace(supabase, userData.user);
  const [{ data: tickets }, { data: auditLogs }] = await Promise.all([
    supabase
      .from("tickets")
      .select("id, external_id, title, status, priority, category, requester_name, requester_email, ai_confidence, created_at, resolved_at")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false })
      .limit(80),
    supabase
      .from("audit_logs")
      .select("id, event_type, event_summary, created_at, metadata")
      .eq("organization_id", organization.id)
      .in("event_type", ["person_reviewed", "access_review_requested", "team_invite_sent", "team_role_updated", "team_member_removed"])
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const ticketRows = (tickets ?? []) as TicketRow[];
  const logs = (auditLogs ?? []) as AuditRow[];
  const people = buildPeople(ticketRows, logs);

  return (
    <main className="min-h-screen bg-[#fbfaf8] px-4 py-5 text-[#151914] md:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/app"
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-black/10 bg-white px-3 text-sm font-semibold"
        >
          <ArrowLeft size={16} />
          Command center
        </Link>

        <div className="mt-5 flex flex-col gap-4 border-b border-black/10 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">People</h1>
            <p className="mt-2 text-sm text-black/54">Review requesters and access review actions.</p>
          </div>
          <Link
            href="/app/team"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#17211c] px-3 text-sm font-semibold text-white"
          >
            Team
            <UsersRound size={16} />
          </Link>
        </div>

        <section className="mt-5">
          <div className="space-y-4">
            {people.map((person) => (
              <article key={person.email} className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex gap-3">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#e7f0e4] text-base font-semibold text-[#2e6658]">
                      {initials(person.name || person.email)}
                    </span>
                    <div>
                      <h2 className="text-xl font-semibold tracking-tight">{person.name}</h2>
                      <p className="mt-1 text-sm text-black/52">{person.email}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Pill>{person.topCategory}</Pill>
                        <Pill>{person.openCount} open</Pill>
                        <Pill>{person.accessReviews} reviews</Pill>
                        <Pill>{riskLabel(person)} risk</Pill>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-black/38">
                    Last request {formatDate(person.lastSeen)}
                  </span>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_.85fr]">
                  <div className="rounded-lg border border-black/10">
                    {person.tickets.slice(0, 3).map((ticket) => (
                      <Link key={ticket.id} href={`/app/tickets/${ticket.id}`} className="block border-b border-black/8 p-4 last:border-b-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={cn("rounded-md border px-2 py-1 text-xs font-semibold", statusStyles[ticket.status] ?? "border-zinc-200 bg-zinc-50 text-zinc-700")}>
                            {ticket.status.replaceAll("_", " ")}
                          </span>
                          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-black/38">
                            {ticket.external_id ?? ticket.priority}
                          </span>
                        </div>
                        <p className="mt-2 font-semibold">{ticket.title}</p>
                      </Link>
                    ))}
                  </div>

                  <details className="group rounded-lg border border-black/10 bg-[#f8faf5]">
                    <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-3 text-sm font-semibold">
                      Review actions
                      <ChevronDown size={15} className="text-black/38 transition group-open:rotate-180" />
                    </summary>
                    <div className="space-y-3 border-t border-black/10 p-3">
                    <form action={recordPeopleReview} className="rounded-lg border border-black/10 bg-[#f8faf5] p-4">
                      <input type="hidden" name="organizationId" value={organization.id} />
                      <input type="hidden" name="personEmail" value={person.email} />
                      <input type="hidden" name="personName" value={person.name} />
                      <textarea
                        name="note"
                        rows={3}
                        placeholder="Optional review note..."
                        className="w-full resize-none rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none"
                      />
                      <PendingButton pendingText="Logging..." className="mt-3 h-10 rounded-lg bg-[#17211c] px-3 text-sm font-semibold text-white">
                        <ShieldCheck size={16} />
                        Log review
                      </PendingButton>
                    </form>

                    <form action={requestAccessReview} className="rounded-lg border border-black/10 bg-white p-4">
                      <input type="hidden" name="organizationId" value={organization.id} />
                      <input type="hidden" name="personEmail" value={person.email} />
                      <input type="hidden" name="personName" value={person.name} />
                      <div className="grid gap-3 sm:grid-cols-[.6fr_1fr]">
                        <select name="risk" defaultValue={defaultRisk(person)} className="h-10 rounded-lg border border-black/10 bg-white px-3 text-sm font-semibold outline-none">
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="critical">Critical</option>
                        </select>
                        <input
                          name="note"
                          placeholder="Optional note"
                          className="h-10 rounded-lg border border-black/10 bg-white px-3 text-sm outline-none"
                        />
                      </div>
                      <PendingButton pendingText="Requesting..." className="mt-3 h-10 rounded-lg border border-black/10 bg-white px-3 text-sm font-semibold text-[#17211c]">
                        Request access review
                      </PendingButton>
                    </form>
                    </div>
                  </details>
                </div>
              </article>
            ))}

            {people.length === 0 && (
              <div className="rounded-xl border border-dashed border-black/15 bg-white p-8 text-center">
                <MessageSquareText size={28} className="mx-auto text-[#2f6f60]" />
                <p className="mt-3 font-semibold">No requesters yet.</p>
                <p className="mt-2 text-sm text-black/52">People will appear here after tickets are created.</p>
              </div>
            )}
          </div>

        </section>
      </div>
    </main>
  );
}

function buildPeople(tickets: TicketRow[], logs: AuditRow[]) {
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
      const avgConfidence = Math.round(
        rows.reduce((sum, ticket) => sum + Math.round((ticket.ai_confidence ?? 0) * 100), 0) / Math.max(rows.length, 1),
      );
      const accessReviews = logs.filter((log) => {
        const personEmail = typeof log.metadata?.person_email === "string" ? log.metadata.person_email.toLowerCase() : "";
        return log.event_type === "access_review_requested" && personEmail === email;
      }).length;

      return {
        name: rows[0]?.requester_name || email,
        email,
        tickets: rows,
        openCount: rows.filter((ticket) => !["resolved", "closed"].includes(ticket.status)).length,
        blockedCount: rows.filter((ticket) => ["blocked", "failed"].includes(ticket.status)).length,
        approvalCount: rows.filter((ticket) => ticket.status === "pending_approval").length,
        avgConfidence,
        lastSeen: rows[0]?.created_at ?? new Date().toISOString(),
        topCategory: Object.entries(categories).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "General",
        accessReviews,
      } satisfies Person;
    })
    .sort((a, b) => b.openCount - a.openCount || new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());
}

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="rounded-md border border-black/10 bg-white px-2 py-1 text-xs font-semibold text-black/52">{children}</span>;
}

function defaultRisk(person: Person) {
  if (person.blockedCount > 0) return "high";
  if (person.approvalCount > 0 || person.openCount > 2) return "medium";
  return "low";
}

function riskLabel(person: Person) {
  const risk = defaultRisk(person);
  return risk[0].toUpperCase() + risk.slice(1);
}

function initials(value: string) {
  return value
    .split(/[.\s@_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
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
