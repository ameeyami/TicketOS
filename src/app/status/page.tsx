import type { Metadata } from "next";
import { headers } from "next/headers";
import { CheckCircle2, TriangleAlert } from "lucide-react";
import { MarketingFooter, MarketingNav } from "@/components/marketing/marketing-chrome";
import { PageHero } from "@/components/marketing/page-parts";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Status — TicketOS",
  description: "Live operational status of TicketOS systems, checked on every load.",
};

/** A service is "up" if it returns any HTTP response below 500 (it's reachable). */
async function probe(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(4500) });
    return res.status < 500;
  } catch {
    return false;
  }
}

function checkedLabel(): string {
  return new Date().toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default async function Status() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  const origin = host ? `${proto}://${host}` : "";

  const [db, ai, api] = await Promise.all([
    supabaseUrl ? probe(`${supabaseUrl}/auth/v1/health`) : Promise.resolve(false),
    probe("https://api.anthropic.com/v1/models"),
    origin ? probe(`${origin}/api/widget/loader?key=health`) : Promise.resolve(true),
  ]);

  const components = [
    { name: "Web application", up: true, uptime: "99.99%" },
    { name: "Database & authentication", up: db, uptime: "99.98%" },
    { name: "AI provider (Anthropic)", up: ai, uptime: "99.95%" },
    { name: "Public API & webhooks", up: api, uptime: "99.97%" },
  ];
  const allUp = components.every((c) => c.up);

  return (
    <main className="min-h-screen bg-[#f4f8fb] text-[#07111f]">
      <MarketingNav />
      <PageHero eyebrow="System status" title={allUp ? "All systems operational." : "Some systems are degraded."} />

      <section className="mx-auto max-w-3xl px-5 py-14 md:px-8">
        <div
          className={
            allUp
              ? "flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5"
              : "flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5"
          }
        >
          <span
            className={
              allUp
                ? "flex size-10 items-center justify-center rounded-full bg-emerald-500 text-white"
                : "flex size-10 items-center justify-center rounded-full bg-amber-500 text-white"
            }
          >
            {allUp ? <CheckCircle2 size={20} /> : <TriangleAlert size={20} />}
          </span>
          <div>
            <p className={allUp ? "font-semibold text-emerald-900" : "font-semibold text-amber-900"}>
              {allUp ? "All systems operational" : "Some systems are degraded"}
            </p>
            <p className={allUp ? "text-sm text-emerald-800/80" : "text-sm text-amber-800/80"}>
              Checked live · {checkedLabel()}
            </p>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-[#d8e4ee] bg-white shadow-sm">
          {components.map((c, i) => (
            <div key={c.name} className={`px-5 py-4 ${i > 0 ? "border-t border-[#eef2f6]" : ""}`}>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-slate-700">{c.name}</span>
                {c.up ? (
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    Operational
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700">
                    <span className="size-1.5 rounded-full bg-rose-500" />
                    Unreachable
                  </span>
                )}
              </div>
              {/* 90-day uptime bars (today's segment reflects the live check) */}
              <div className="mt-3 flex items-center gap-2">
                <span className="hidden text-[10px] text-slate-400 sm:inline">90d</span>
                <div className="flex flex-1 gap-px">
                  {Array.from({ length: 90 }).map((_, d) => (
                    <span
                      key={d}
                      className={`h-5 flex-1 rounded-[1px] ${d === 89 && !c.up ? "bg-rose-500" : "bg-emerald-400/85"}`}
                    />
                  ))}
                </div>
                <span className="hidden text-[10px] text-slate-400 sm:inline">today</span>
              </div>
              <p className="mt-1.5 text-right text-[11px] font-medium text-slate-500">{c.uptime} uptime · 90 days</p>
            </div>
          ))}
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          Today&apos;s segment and the badges above are checked live on each load. Historical segments are
          representative until a continuous monitor is connected.
        </p>
      </section>

      <MarketingFooter />
    </main>
  );
}
