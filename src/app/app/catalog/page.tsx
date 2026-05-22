import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  KeyRound,
  Laptop,
  LockKeyhole,
  Network,
  ShieldCheck,
  Sparkles,
  UserPlus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { submitCatalogRequest } from "@/app/app/catalog/actions";
import { PendingButton } from "@/components/ui/pending-button";
import { serviceCatalogItems } from "@/lib/service-catalog";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const categoryIcons: Record<string, LucideIcon> = {
  Identity: KeyRound,
  Onboarding: UserPlus,
  Network,
  Security: LockKeyhole,
};

const priorityStyles: Record<string, string> = {
  low: "border-zinc-200 bg-zinc-50 text-zinc-700",
  medium: "border-sky-200 bg-sky-50 text-sky-700",
  high: "border-amber-200 bg-amber-50 text-amber-800",
  critical: "border-rose-200 bg-rose-50 text-rose-700",
};

export default async function CatalogPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect("/auth/sign-in?message=Sign in to open the service catalog.");
  }

  const organization = await ensureWorkspace(supabase, userData.user);
  const [{ data: tickets }, { data: approvals }, { data: auditLogs }] = await Promise.all([
    supabase
      .from("tickets")
      .select("id, external_id, title, category, status, priority, created_at")
      .eq("organization_id", organization.id)
      .eq("source", "service_catalog")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("approval_requests")
      .select("id, ticket_id, status")
      .eq("organization_id", organization.id)
      .eq("status", "pending"),
    supabase
      .from("audit_logs")
      .select("*")
      .eq("organization_id", organization.id)
      .eq("event_type", "catalog_request_created")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const catalogEntries = Object.entries(serviceCatalogItems);
  const ticketRows = tickets ?? [];
  const pendingCatalogApprovals = new Set((approvals ?? []).map((approval) => approval.ticket_id).filter(Boolean));

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
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#47685d]">Service catalog</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">Submit IT requests as structured agent work.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-black/56">
              Give employees a clean request catalog while TicketOS classifies, assigns, and routes the work automatically.
            </p>
          </div>
          <Link
            href="/app/tickets/new"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#17211c] px-3 text-sm font-semibold text-white"
          >
            Manual ticket
            <ArrowRight size={16} />
          </Link>
        </div>

        <section className="mt-6 grid gap-3 md:grid-cols-4">
          <MetricCard label="Catalog items" value={String(catalogEntries.length)} icon={ClipboardList} />
          <MetricCard label="Catalog tickets" value={String(ticketRows.length)} icon={Laptop} />
          <MetricCard label="Pending approval" value={String(pendingCatalogApprovals.size)} icon={ShieldCheck} />
          <MetricCard label="Audit events" value={String(auditLogs?.length ?? 0)} icon={CheckCircle2} />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_.68fr]">
          <div className="grid gap-4 lg:grid-cols-2">
            {catalogEntries.map(([key, item]) => {
              const Icon = categoryIcons[item.category] ?? ClipboardList;

              return (
                <article key={key} className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-4">
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#eef5ea] text-[#2e6658]">
                        <Icon size={20} />
                      </span>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-semibold">{item.title}</h2>
                          <span className={cn("rounded-md border px-2 py-1 text-xs font-semibold", priorityStyles[item.priority])}>
                            {item.priority}
                          </span>
                        </div>
                        <p className="mt-1 text-sm leading-6 text-black/55">{item.summary}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <Fact label="Category" value={item.category} />
                    <Fact label="Agent" value={item.agent} />
                    <Fact label="Confidence" value={`${item.confidence}%`} />
                  </div>

                  <form action={submitCatalogRequest} className="mt-5 grid gap-4 rounded-lg border border-black/10 bg-[#f8faf5] p-4">
                    <input type="hidden" name="itemKey" value={key} />
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="text-sm font-semibold">
                        Requester name
                        <input
                          name="requesterName"
                          className="mt-2 h-10 w-full rounded-lg border border-black/10 bg-white px-3 text-sm outline-none focus:border-[#2f6f60]"
                          placeholder="Employee name"
                        />
                      </label>
                      <label className="text-sm font-semibold">
                        Requester email
                        <input
                          name="requesterEmail"
                          type="email"
                          className="mt-2 h-10 w-full rounded-lg border border-black/10 bg-white px-3 text-sm outline-none focus:border-[#2f6f60]"
                          placeholder="employee@company.com"
                        />
                      </label>
                    </div>
                    <label className="text-sm font-semibold">
                      Request details
                      <textarea
                        required
                        name="details"
                        rows={4}
                        className="mt-2 w-full resize-none rounded-lg border border-black/10 bg-white px-3 py-2 text-sm leading-6 outline-none placeholder:text-black/38 focus:border-[#2f6f60]"
                        placeholder={item.prompt}
                      />
                    </label>
                    <label className="text-sm font-semibold">
                      Business reason
                      <input
                        name="businessReason"
                        className="mt-2 h-10 w-full rounded-lg border border-black/10 bg-white px-3 text-sm outline-none focus:border-[#2f6f60]"
                        placeholder="Optional context for approvals or audit"
                      />
                    </label>
                    <PendingButton
                      pendingText="Submitting..."
                      className="h-10 rounded-lg bg-[#17211c] px-3 text-sm font-semibold text-white"
                    >
                      <Sparkles size={16} />
                      Submit request
                    </PendingButton>
                  </form>
                </article>
              );
            })}
          </div>

          <div className="space-y-6">
            <Panel title="Recent catalog tickets" icon={ClipboardList}>
              <div className="space-y-3">
                {ticketRows.map((ticket) => (
                  <Link
                    key={ticket.id}
                    href={`/app/tickets/${ticket.id}`}
                    className="block rounded-lg border border-black/10 bg-white p-4 transition hover:bg-[#f8faf5]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{ticket.title}</p>
                        <p className="mt-1 text-sm text-black/52">
                          {ticket.external_id ?? "Ticket"} · {ticket.category ?? "Uncategorized"}
                        </p>
                      </div>
                      <span className={cn("rounded-md border px-2 py-1 text-xs font-semibold", priorityStyles[ticket.priority])}>
                        {ticket.priority}
                      </span>
                    </div>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-black/38">
                      {ticket.status.replaceAll("_", " ")} · {formatDate(ticket.created_at)}
                    </p>
                  </Link>
                ))}
                {ticketRows.length === 0 && (
                  <p className="rounded-lg border border-dashed border-black/15 p-4 text-sm text-black/48">
                    Catalog-submitted tickets will appear here.
                  </p>
                )}
              </div>
            </Panel>

            <Panel title="Catalog audit" icon={CheckCircle2}>
              <div className="divide-y divide-black/8 rounded-lg border border-black/10">
                {(auditLogs ?? []).map((log) => (
                  <div key={log.id} className="p-4">
                    <p className="font-semibold">{log.event_summary}</p>
                    <p className="mt-1 text-sm text-black/50">{formatDate(log.created_at)}</p>
                  </div>
                ))}
                {(auditLogs ?? []).length === 0 && (
                  <p className="p-4 text-sm text-black/48">Catalog audit entries will appear here.</p>
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

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-black/10 bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/38">{label}</p>
      <p className="mt-2 text-sm font-semibold text-black/70">{value}</p>
    </div>
  );
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
