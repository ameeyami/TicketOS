import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { serviceCatalog, type CatalogItem } from "@/lib/service-catalog";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const CATEGORY_TONE: Record<CatalogItem["category"], string> = {
  Identity: "bg-sky-50 text-sky-700 border-sky-200",
  Onboarding: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Network: "bg-violet-50 text-violet-700 border-violet-200",
  Security: "bg-rose-50 text-rose-700 border-rose-200",
};

const ICON_TONE: Record<CatalogItem["category"], string> = {
  Identity: "bg-sky-100 text-sky-700",
  Onboarding: "bg-emerald-100 text-emerald-700",
  Network: "bg-violet-100 text-violet-700",
  Security: "bg-rose-100 text-rose-700",
};

const PRIORITY_TONE: Record<CatalogItem["priority"], string> = {
  low: "text-slate-500",
  medium: "text-sky-600",
  high: "text-amber-600",
  critical: "text-rose-600",
};

const FILTERS = ["All", "Identity", "Onboarding", "Network", "Security"] as const;

function requestHref(item: CatalogItem): string {
  const params = new URLSearchParams({
    title: item.title,
    description: item.description,
    category: item.category,
    priority: item.priority,
  });
  return `/app/tickets/new?${params.toString()}`;
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    redirect("/auth/sign-in?message=Sign in to browse the service catalog.");
  }

  await ensureWorkspace(supabase, userData.user);
  const params = await searchParams;
  const activeFilter = (FILTERS as readonly string[]).includes(params.category ?? "")
    ? (params.category as (typeof FILTERS)[number])
    : "All";

  const items =
    activeFilter === "All" ? serviceCatalog : serviceCatalog.filter((i) => i.category === activeFilter);

  return (
    <main className="min-h-screen px-4 py-6 text-[#151914] md:px-8">
      <div className="mx-auto max-w-6xl">
        <PageHeader
          crumbs={[{ label: "IT" }, { label: "Service catalog" }]}
          title="Service catalog"
          description="Pick a request type and TicketOS prefills a clean, well-routed ticket — then triage, policy, and workflows take it from there."
        />

        <div className="mt-5 flex flex-wrap gap-1.5">
          {FILTERS.map((filter) => {
            const active = filter === activeFilter;
            const href = filter === "All" ? "/app/catalog" : `/app/catalog?category=${filter}`;
            return (
              <Link
                key={filter}
                href={href}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                  active
                    ? "border-[#0b2a4a] bg-[#0b2a4a] text-white"
                    : "border-black/10 bg-white text-slate-600 hover:border-[#0b2a4a]/40",
                )}
              >
                {filter}
              </Link>
            );
          })}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.slug}
                href={requestHref(item)}
                className="group flex flex-col rounded-xl border border-black/10 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[#b7d8f2] hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", ICON_TONE[item.category])}>
                    <Icon size={19} />
                  </span>
                  <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold", CATEGORY_TONE[item.category])}>
                    {item.category}
                  </span>
                </div>
                <p className="mt-3 font-semibold tracking-tight">{item.name}</p>
                <p className="mt-1 flex-1 text-sm leading-6 text-slate-500">{item.blurb}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className={cn("text-xs font-semibold uppercase tracking-[0.1em]", PRIORITY_TONE[item.priority])}>
                    {item.priority} priority
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0b5f91]">
                    Request
                    <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-5 flex items-start gap-3 rounded-xl border border-[#d8e4ee] bg-gradient-to-br from-[#f1f7ff] to-white p-4 text-sm text-slate-600 shadow-sm">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#dbeafe] text-[#0b5f91]">
            <Sparkles size={16} />
          </span>
          <p className="leading-6">
            Don&apos;t see what you need?{" "}
            <Link href="/app/tickets/new" className="font-semibold text-[#0b5f91] hover:underline">
              Open a custom ticket
            </Link>{" "}
            and the AI will classify and route it for you.
          </p>
        </div>
      </div>
    </main>
  );
}
