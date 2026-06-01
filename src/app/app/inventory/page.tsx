import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Boxes,
  Cable,
  FileText,
  KeyRound,
  LockKeyhole,
  PackageSearch,
  RefreshCw,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { syncInventory } from "@/app/app/inventory/actions";
import { PageHeader } from "@/components/dashboard/page-header";
import { PendingButton } from "@/components/ui/pending-button";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  connected: "border-emerald-200 bg-emerald-50 text-emerald-700",
  degraded: "border-amber-200 bg-amber-50 text-amber-800",
  disabled: "border-rose-200 bg-rose-50 text-rose-700",
  not_connected: "border-zinc-200 bg-zinc-50 text-zinc-700",
};

const riskStyles: Record<string, string> = {
  low: "border-emerald-200 bg-emerald-50 text-emerald-700",
  medium: "border-amber-200 bg-amber-50 text-amber-800",
  high: "border-rose-200 bg-rose-50 text-rose-700",
};

export default async function InventoryPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect("/auth/sign-in?message=Sign in to inspect inventory.");
  }

  const organization = await ensureWorkspace(supabase, userData.user);
  const [{ data: integrations }, { data: actions }, { data: tickets }, { data: agents }, { data: auditLogs }] =
    await Promise.all([
      supabase.from("integrations").select("*").eq("organization_id", organization.id).order("display_name"),
      supabase
        .from("integration_actions")
        .select("*, integrations(display_name, provider_key)")
        .eq("organization_id", organization.id)
        .order("risk_level", { ascending: false }),
      supabase
        .from("tickets")
        .select("id, external_id, title, requester_name, requester_email, category, status, priority, assigned_agent_id, created_at")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false })
        .limit(14),
      supabase.from("agents").select("id, name, status, capabilities").eq("organization_id", organization.id).order("created_at"),
      supabase
        .from("audit_logs")
        .select("*")
        .eq("organization_id", organization.id)
        .in("event_type", ["inventory_synced", "integration_updated", "integration_actions_synced", "catalog_request_created"])
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

  const integrationRows = integrations ?? [];
  const actionRows = actions ?? [];
  const ticketRows = tickets ?? [];
  const connectedIntegrations = integrationRows.filter((integration) => integration.status === "connected").length;
  const protectedActions = actionRows.filter((action) => action.requires_approval || action.risk_level === "high").length;
  const people = readPeople(ticketRows);
  const assets = readAssets(ticketRows, integrationRows);

  return (
    <main className="min-h-screen bg-[#f6f7f2] px-4 py-6 text-[#151914] md:px-8">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          crumbs={[{ label: "IT" }, { label: "Inventory" }]}
          title="Inventory"
          description="Inspect the operational inventory agents use when provisioning, revoking, or escalating IT work."
          actions={
            <form action={syncInventory} className="flex items-center gap-2">
              <input type="hidden" name="organizationId" value={organization.id} />
              <input
                name="note"
                className="h-10 w-44 rounded-lg border border-black/10 px-3 text-sm outline-none placeholder:text-black/38 focus:border-[#2f6f60]"
                placeholder="Optional sync note"
              />
              <PendingButton pendingText="Syncing..." className="h-10 rounded-lg bg-[#17211c] px-3 text-sm font-semibold text-white">
                <RefreshCw size={16} />
                Sync inventory
              </PendingButton>
            </form>
          }
        />

        <section className="mt-6 grid gap-3 md:grid-cols-4">
          <MetricCard label="Connected systems" value={`${connectedIntegrations}/${integrationRows.length}`} icon={Cable} />
          <MetricCard label="Known people" value={String(people.length)} icon={UserRound} />
          <MetricCard label="Assets & apps" value={String(assets.length)} icon={Boxes} />
          <MetricCard label="Protected actions" value={String(protectedActions)} icon={ShieldAlert} />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_.68fr]">
          <div className="space-y-6">
            <Panel title="Connected systems" icon={Cable}>
              <div className="grid gap-3 lg:grid-cols-2">
                {integrationRows.map((integration) => (
                  <Link
                    key={integration.id}
                    href={`/app/integrations/${integration.id}`}
                    className="rounded-lg border border-black/10 bg-white p-4 transition hover:bg-[#f8faf5]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{integration.display_name}</p>
                        <p className="mt-1 text-sm text-black/52">{integration.scopes?.join(", ") || "No scopes configured"}</p>
                      </div>
                      <StatusPill value={integration.status} />
                    </div>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-black/38">
                      Last sync {formatDate(integration.connected_at)}
                    </p>
                  </Link>
                ))}
              </div>
            </Panel>

            <Panel title="People context" icon={UserRound}>
              <div className="grid gap-3 lg:grid-cols-2">
                {people.map((person) => (
                  <div key={person.email} className="rounded-lg border border-black/10 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{person.name}</p>
                        <p className="mt-1 text-sm text-black/52">{person.email}</p>
                      </div>
                      <span className="rounded-md border border-black/10 bg-[#f8faf5] px-2 py-1 text-xs font-semibold text-black/52">
                        {person.tickets} tickets
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {person.categories.map((category) => (
                        <span key={category} className="rounded-md border border-black/10 bg-[#f8faf5] px-2 py-1 text-xs font-semibold text-black/52">
                          {category}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Action exposure" icon={KeyRound}>
              <div className="divide-y divide-black/8 rounded-lg border border-black/10 bg-white">
                {actionRows.slice(0, 10).map((action) => (
                  <div key={action.id} className="grid gap-3 p-4 md:grid-cols-[1fr_130px_130px] md:items-center">
                    <div>
                      <p className="font-semibold">{action.display_name}</p>
                      <p className="mt-1 text-sm text-black/52">
                        {action.integrations?.display_name ?? action.integrations?.provider_key ?? "Integration"} · {action.action_key}
                      </p>
                    </div>
                    <span className={cn("w-fit rounded-md border px-2 py-1 text-xs font-semibold", riskStyles[action.risk_level] ?? riskStyles.low)}>
                      {action.risk_level}
                    </span>
                    <span className="w-fit rounded-md border border-black/10 bg-[#f8faf5] px-2 py-1 text-xs font-semibold text-black/52">
                      {action.requires_approval ? "approval" : "autonomous"}
                    </span>
                  </div>
                ))}
                {actionRows.length === 0 && (
                  <p className="p-4 text-sm text-black/48">Sync integration actions to populate execution exposure.</p>
                )}
              </div>
            </Panel>
          </div>

          <div className="space-y-6">
            <Panel title="Assets & apps" icon={PackageSearch}>
              <div className="space-y-3">
                {assets.map((asset) => (
                  <div key={asset.name} className="rounded-lg border border-black/10 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{asset.name}</p>
                        <p className="mt-1 text-sm text-black/52">{asset.kind}</p>
                      </div>
                      <span className={cn("rounded-md border px-2 py-1 text-xs font-semibold", riskStyles[asset.risk])}>
                        {asset.risk}
                      </span>
                    </div>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-black/38">
                      {asset.owner}
                    </p>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Agent ownership" icon={LockKeyhole}>
              <div className="space-y-3">
                {(agents ?? []).map((agent) => (
                  <div key={agent.id} className="rounded-lg border border-black/10 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{agent.name}</p>
                        <p className="mt-1 text-sm text-black/52">{agent.capabilities?.join(", ") || "General operations"}</p>
                      </div>
                      <span className="rounded-md border border-black/10 bg-[#f8faf5] px-2 py-1 text-xs font-semibold text-black/52">
                        {agent.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Inventory audit" icon={FileText}>
              <div className="divide-y divide-black/8 rounded-lg border border-black/10 bg-white">
                {(auditLogs ?? []).map((log) => (
                  <div key={log.id} className="p-4">
                    <p className="font-semibold">{log.event_summary}</p>
                    <p className="mt-1 text-sm text-black/50">
                      {log.event_type.replaceAll("_", " ")} · {formatDate(log.created_at)}
                    </p>
                  </div>
                ))}
                {(auditLogs ?? []).length === 0 && (
                  <p className="p-4 text-sm text-black/48">Inventory sync events will appear here.</p>
                )}
              </div>
            </Panel>
          </div>
        </section>
      </div>
    </main>
  );
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

function StatusPill({ value }: { value: string }) {
  return (
    <span className={cn("shrink-0 rounded-md border px-2 py-1 text-xs font-semibold", statusStyles[value] ?? statusStyles.not_connected)}>
      {value.replaceAll("_", " ")}
    </span>
  );
}

function readPeople(
  tickets: Array<{
    requester_name: string | null;
    requester_email: string | null;
    category: string | null;
  }>,
) {
  const people = new Map<string, { name: string; email: string; tickets: number; categories: Set<string> }>();

  for (const ticket of tickets) {
    const email = ticket.requester_email ?? "unknown@ticketos.local";
    const existing = people.get(email) ?? {
      name: ticket.requester_name ?? email,
      email,
      tickets: 0,
      categories: new Set<string>(),
    };

    existing.tickets += 1;
    if (ticket.category) {
      existing.categories.add(ticket.category);
    }
    people.set(email, existing);
  }

  return Array.from(people.values()).map((person) => ({
    ...person,
    categories: Array.from(person.categories),
  }));
}

function readAssets(
  tickets: Array<{ category: string | null; priority: string; title: string }>,
  integrations: Array<{ display_name: string; status: string }>,
) {
  const integrationAssets = integrations.map((integration) => ({
    name: integration.display_name,
    kind: "Connected SaaS system",
    owner: integration.status === "connected" ? "Integration active" : "Needs connection",
    risk: integration.status === "connected" ? "medium" : "low",
  }));

  const ticketAssets = tickets
    .filter((ticket) => ticket.category)
    .slice(0, 6)
    .map((ticket) => ({
      name: ticket.title,
      kind: `${ticket.category} request context`,
      owner: `${ticket.priority} priority`,
      risk: ticket.priority === "critical" || ticket.priority === "high" ? "high" : "medium",
    }));

  return [...integrationAssets, ...ticketAssets].slice(0, 12);
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
