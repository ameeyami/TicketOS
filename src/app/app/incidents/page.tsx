import { redirect } from "next/navigation";
import { Radar, Layers, AlertTriangle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { IncidentBoard, type ClusterDTO } from "@/app/app/incidents/incident-board";
import { clusterTickets, type AiopsTicket } from "@/lib/aiops";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const WINDOW_DAYS = 14;

function sinceIso(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function windowLabel(firstAt: string, lastAt: string): string {
  const ms = new Date(lastAt).getTime() - new Date(firstAt).getTime();
  const hours = ms / 3_600_000;
  if (!Number.isFinite(hours) || hours < 1) return "within the hour";
  if (hours < 48) return `over ~${Math.round(hours)}h`;
  return `over ${Math.round(hours / 24)} days`;
}

export default async function IncidentsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    redirect("/auth/sign-in?message=Sign in to view incident signals.");
  }

  const organization = await ensureWorkspace(supabase, userData.user);

  const since = sinceIso(WINDOW_DAYS);
  const { data: tickets } = await supabase
    .from("tickets")
    .select("id, external_id, title, ai_summary, category, priority, status, created_at")
    .eq("organization_id", organization.id)
    .neq("status", "resolved")
    .neq("status", "failed")
    .neq("category", "Incident")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(200);

  const clusters = clusterTickets((tickets ?? []) as AiopsTicket[]);

  const clusterDtos: ClusterDTO[] = clusters.map((c) => ({
    id: c.id,
    theme: c.theme,
    topCategory: c.topCategory,
    topPriority: c.topPriority,
    windowLabel: windowLabel(c.firstAt, c.lastAt),
    tickets: c.tickets.map((t) => ({
      id: t.id,
      ref: t.external_id ?? t.id.slice(0, 8),
      title: t.title,
      priority: t.priority,
    })),
  }));

  const ticketsInSpikes = clusterDtos.reduce((sum, c) => sum + c.tickets.length, 0);

  return (
    <main className="min-h-screen px-4 py-6 text-[#151914] md:px-8">
      <div className="mx-auto max-w-5xl">
        <PageHeader
          crumbs={[{ label: "IT" }, { label: "Incidents" }]}
          title="Incident signals"
          description="TicketOS watches recent tickets for spikes of similar reports, clusters them, and helps you declare one major incident with an AI runbook — instead of triaging the same thing ten times."
        />

        <section className="mb-5 grid gap-3 sm:grid-cols-3">
          <MetricCard label="Spikes detected" value={String(clusterDtos.length)} icon={Radar} />
          <MetricCard label="Tickets in spikes" value={String(ticketsInSpikes)} icon={Layers} />
          <MetricCard label="Window scanned" value={`${WINDOW_DAYS} days`} icon={AlertTriangle} />
        </section>

        <IncidentBoard clusters={clusterDtos} />
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
