import { redirect } from "next/navigation";
import { BadgeCheck, Clock3, Gauge, ShieldAlert, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { mttrStats } from "@/lib/analytics";
import { computeSla } from "@/lib/sla";
import { canSeeTicket, loadTeamContext } from "@/lib/teams";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type TicketRow = {
  id: string;
  status: string;
  category: string | null;
  priority: string;
  created_at: string;
  resolved_at: string | null;
  assigned_team_id: string | null;
  requesting_team_id: string | null;
  assigned_agent_id: string | null;
  agents?: { name: string } | null;
};

type Bucket = { key: string; label: string; total: number; open: number; resolved: number; breachedOpen: number; mttr: string };

const METRIC_CHIP = [
  "from-[#e0f2fe] to-[#dbeafe] text-[#0b5f91]",
  "from-[#ede9fe] to-[#fae8ff] text-[#7c3aed]",
  "from-[#dcfce7] to-[#d1fae5] text-[#0f7a5f]",
  "from-[#ffedd5] to-[#fef3c7] text-[#b45309]",
];

export default async function PerformancePage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    redirect("/auth/sign-in?message=Sign in to view performance.");
  }

  const organization = await ensureWorkspace(supabase, userData.user);
  const ctx = await loadTeamContext(supabase, organization.id, userData.user);
  const { data: rawTickets } = await supabase
    .from("tickets")
    .select("id, status, category, priority, created_at, resolved_at, assigned_team_id, requesting_team_id, assigned_agent_id, agents(name)")
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: false });

  const tickets = ((rawTickets ?? []) as unknown as TicketRow[]).filter((t) => canSeeTicket(t, ctx));

  const isBreachedOpen = (t: TicketRow) =>
    t.status !== "resolved" &&
    computeSla({ priority: t.priority, createdAt: t.created_at, status: t.status, resolvedAt: t.resolved_at }).state === "breached";

  const bucket = (key: string, label: string, rows: TicketRow[]): Bucket => ({
    key,
    label,
    total: rows.length,
    open: rows.filter((t) => t.status !== "resolved").length,
    resolved: rows.filter((t) => t.status === "resolved").length,
    breachedOpen: rows.filter(isBreachedOpen).length,
    mttr: mttrStats(rows).label,
  });

  // Per team (+ unassigned)
  const teamBuckets: Bucket[] = ctx.teams.map((team) =>
    bucket(team.id, team.name, tickets.filter((t) => t.assigned_team_id === team.id)),
  );
  const unassigned = tickets.filter((t) => !t.assigned_team_id);
  if (unassigned.length) teamBuckets.push(bucket("unassigned", "Unassigned", unassigned));
  teamBuckets.sort((a, b) => b.total - a.total);

  // Per category
  const categories = Array.from(new Set(tickets.map((t) => t.category ?? "Uncategorized")));
  const categoryBuckets: Bucket[] = categories
    .map((category) => bucket(category, category, tickets.filter((t) => (t.category ?? "Uncategorized") === category)))
    .sort((a, b) => b.total - a.total);

  // Per AI agent (automation coverage)
  const agentCounts = new Map<string, number>();
  for (const t of tickets) {
    if (t.assigned_agent_id && t.agents?.name) agentCounts.set(t.agents.name, (agentCounts.get(t.agents.name) ?? 0) + 1);
  }
  const agentRows = [...agentCounts.entries()].sort((a, b) => b[1] - a[1]);

  // Headline
  const resolved = tickets.filter((t) => t.status === "resolved");
  const met = resolved.filter(
    (t) => computeSla({ priority: t.priority, createdAt: t.created_at, status: t.status, resolvedAt: t.resolved_at }).state === "met",
  ).length;
  const slaMetRate = resolved.length ? Math.round((met / resolved.length) * 100) : 0;
  const breachedOpenTotal = tickets.filter(isBreachedOpen).length;
  const overallMttr = mttrStats(tickets).label;

  return (
    <main className="min-h-screen px-4 py-6 text-[#151914] md:px-8">
      <div className="mx-auto max-w-6xl">
        <PageHeader
          crumbs={[{ label: "Governance" }, { label: "Performance" }]}
          title="Performance"
          description="How work is distributed and how fast it clears — by team, category, and AI agent."
        />

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Resolved" value={String(resolved.length)} icon={BadgeCheck} accent={METRIC_CHIP[0]} />
          <MetricCard label="Mean time to resolve" value={overallMttr} icon={Clock3} accent={METRIC_CHIP[1]} />
          <MetricCard label="SLA met (resolved)" value={resolved.length ? `${slaMetRate}%` : "—"} icon={TrendingUp} accent={METRIC_CHIP[2]} />
          <MetricCard
            label="Open breached"
            value={String(breachedOpenTotal)}
            icon={ShieldAlert}
            tone={breachedOpenTotal > 0 ? "rose" : "default"}
            accent={METRIC_CHIP[3]}
          />
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-2">
          <BucketTable title="By team" buckets={teamBuckets} />
          <BucketTable title="By category" buckets={categoryBuckets} />
        </section>

        <section className="mt-5">
          <Panel title="AI agent coverage" icon={Gauge}>
            {agentRows.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {agentRows.map(([name, count]) => (
                  <div key={name} className="flex items-center justify-between rounded-lg border border-black/10 px-3 py-2">
                    <span className="text-sm font-medium text-slate-700">{name}</span>
                    <span className="text-sm font-semibold">{count} tickets</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-black/15 p-4 text-sm text-slate-500">
                No tickets have been routed to an AI agent yet.
              </p>
            )}
          </Panel>
        </section>
      </div>
    </main>
  );
}

function BucketTable({ title, buckets }: { title: string; buckets: Bucket[] }) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {buckets.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              <tr>
                <th className="pb-2">Name</th>
                <th className="pb-2 text-right">Open</th>
                <th className="pb-2 text-right">Resolved</th>
                <th className="pb-2 text-right">MTTR</th>
                <th className="pb-2 text-right">Breached</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {buckets.map((b) => (
                <tr key={b.key}>
                  <td className="py-2 font-medium text-slate-700">{b.label}</td>
                  <td className="py-2 text-right tabular-nums">{b.open}</td>
                  <td className="py-2 text-right tabular-nums">{b.resolved}</td>
                  <td className="py-2 text-right tabular-nums text-slate-500">{b.mttr}</td>
                  <td className={cn("py-2 text-right font-semibold tabular-nums", b.breachedOpen > 0 ? "text-rose-600" : "text-slate-400")}>
                    {b.breachedOpen}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-black/15 p-4 text-sm text-slate-500">No data yet.</p>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  tone = "default",
  accent = METRIC_CHIP[0],
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: "default" | "rose";
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className={cn("mt-1.5 text-2xl font-semibold tracking-tight", tone === "rose" && value !== "0" ? "text-rose-600" : "")}>
            {value}
          </p>
        </div>
        <span className={`flex size-9 items-center justify-center rounded-lg bg-gradient-to-br ${accent}`}>
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
