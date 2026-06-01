import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, CircleAlert, Search } from "lucide-react";
import { connectApp } from "@/app/app/apps/actions";
import { PageHeader } from "@/components/dashboard/page-header";
import { PendingButton } from "@/components/ui/pending-button";
import { appCatalog, appCategories, categoryTone, type AppCategory } from "@/lib/app-catalog";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export default async function AppsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string; notice?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    redirect("/auth/sign-in?message=Sign in to browse apps.");
  }

  const organization = await ensureWorkspace(supabase, userData.user);
  const params = await searchParams;
  const activeCategory: AppCategory = (appCategories as readonly string[]).includes(params.category ?? "")
    ? (params.category as AppCategory)
    : "All";
  const query = (params.q ?? "").trim().toLowerCase();

  const { data: integrations } = await supabase
    .from("integrations")
    .select("id, provider_key, status")
    .eq("organization_id", organization.id);
  const connectedId = new Map(
    (integrations ?? [])
      .filter((row) => row.status === "connected")
      .map((row) => [row.provider_key, row.id as string]),
  );

  const apps = appCatalog.filter((app) => {
    if (activeCategory !== "All" && app.category !== activeCategory) return false;
    if (query && !app.name.toLowerCase().includes(query)) return false;
    return true;
  });

  return (
    <main className="min-h-screen px-4 py-6 text-[#151914] md:px-8">
      <div className="mx-auto max-w-6xl">
        <PageHeader
          crumbs={[{ label: "IT" }, { label: "Applications" }]}
          title="Applications"
          description="Browse and connect the tools your team uses."
        />

        {params.notice && <Notice notice={params.notice} />}

        <section className="grid gap-6 lg:grid-cols-[176px_1fr]">
          {/* Category nav */}
          <aside className="flex flex-row flex-wrap gap-1 lg:flex-col">
            {appCategories.map((category) => {
              const active = category === activeCategory;
              const href = category === "All" ? "/app/apps" : `/app/apps?category=${category}`;
              return (
                <Link
                  key={category}
                  href={href}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm transition",
                    active ? "bg-[#0b2a4a] font-semibold text-white" : "text-slate-600 hover:bg-black/[0.04]",
                  )}
                >
                  {category}
                </Link>
              );
            })}
          </aside>

          {/* Catalog */}
          <div>
            <form action="/app/apps" className="mb-4 flex h-10 items-center gap-2 rounded-lg border border-black/10 bg-white px-3 shadow-sm">
              {activeCategory !== "All" && <input type="hidden" name="category" value={activeCategory} />}
              <Search size={15} className="text-black/35" />
              <input
                name="q"
                defaultValue={params.q ?? ""}
                placeholder="Search applications..."
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-black/35"
              />
            </form>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {apps.map((app) => {
                const integrationId = connectedId.get(app.slug);
                return (
                  <div key={app.slug} className="flex flex-col justify-between rounded-xl border border-black/10 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <span
                        className={cn(
                          "flex size-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold",
                          categoryTone[app.category] ?? "bg-slate-100 text-slate-600",
                        )}
                      >
                        {app.name.charAt(0)}
                      </span>
                      {integrationId ? (
                        <Link
                          href={`/app/integrations/${integrationId}`}
                          className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                        >
                          <CheckCircle2 size={12} />
                          Connected
                        </Link>
                      ) : (
                        <form action={connectApp}>
                          <input type="hidden" name="slug" value={app.slug} />
                          <input type="hidden" name="name" value={app.name} />
                          <input type="hidden" name="category" value={activeCategory} />
                          <PendingButton
                            pendingText="..."
                            className="h-8 rounded-md bg-[#0b2a4a] px-3 text-xs font-semibold text-white"
                          >
                            Connect
                          </PendingButton>
                        </form>
                      )}
                    </div>
                    <p className="mt-3 font-semibold tracking-tight">{app.name}</p>
                  </div>
                );
              })}
            </div>

            {apps.length === 0 && (
              <p className="rounded-xl border border-dashed border-black/15 bg-white/60 p-8 text-center text-sm text-black/48">
                No apps match your search.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function Notice({ notice }: { notice: string }) {
  const map: Record<string, { tone: "good" | "warn"; text: string }> = {
    connected: { tone: "good", text: "App connected — manage it under Applications." },
    "admins-only": { tone: "warn", text: "Only owners and admins can connect apps." },
    error: { tone: "warn", text: "Couldn't connect that app. Please try again." },
  };
  const cfg = map[notice];
  if (!cfg) return null;
  return (
    <div
      className={cn(
        "mb-4 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold",
        cfg.tone === "good"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-amber-200 bg-amber-50 text-amber-800",
      )}
    >
      {cfg.tone === "good" ? <CheckCircle2 size={16} /> : <CircleAlert size={16} />}
      {cfg.text}
    </div>
  );
}
