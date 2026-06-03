import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BookOpen, Check, MessageCircleQuestion, Sparkles, ThumbsUp, Trash2, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { approveArticle, createArticle, deleteArticle } from "@/app/app/knowledge/actions";
import { PageHeader } from "@/components/dashboard/page-header";
import { PendingButton } from "@/components/ui/pending-button";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ArticleRow = {
  id: string;
  title: string;
  body: string;
  category: string | null;
  updated_at: string;
  status?: string | null;
};

type QueryRow = { status: string; csat: string | null };

const fieldClass = "h-10 w-full rounded-lg border border-black/10 bg-white px-3 text-sm outline-none focus:border-[#0b2a4a]";

export default async function KnowledgePage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect("/auth/sign-in?message=Sign in to manage the knowledge base.");
  }

  const organization = await ensureWorkspace(supabase, userData.user);
  const [{ data: articles }, { data: queries }, { data: membership }] = await Promise.all([
    supabase
      .from("knowledge_articles")
      .select("*")
      .eq("organization_id", organization.id)
      .order("updated_at", { ascending: false }),
    supabase.from("kb_queries").select("status, csat").eq("organization_id", organization.id),
    supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", organization.id)
      .eq("user_id", userData.user.id)
      .maybeSingle(),
  ]);

  const allArticles = (articles ?? []) as ArticleRow[];
  const suggestedRows = allArticles.filter((a) => a.status === "suggested");
  const articleRows = allArticles.filter((a) => a.status !== "suggested");
  const queryRows = (queries ?? []) as QueryRow[];
  const canEdit = (membership?.role ?? "operator") !== "viewer";

  const resolved = queryRows.filter((q) => q.status === "resolved").length;
  const escalated = queryRows.filter((q) => q.status === "escalated").length;
  const decided = resolved + escalated;
  const deflectionRate = decided ? Math.round((resolved / decided) * 100) : 0;
  const csatUp = queryRows.filter((q) => q.csat === "up").length;
  const csatDown = queryRows.filter((q) => q.csat === "down").length;
  const csat = csatUp + csatDown ? Math.round((csatUp / (csatUp + csatDown)) * 100) : 0;

  return (
    <main className="min-h-screen px-4 py-6 text-[#151914] md:px-8">
      <div className="mx-auto max-w-6xl">
        <PageHeader
          crumbs={[{ label: "IT" }, { label: "Knowledge" }]}
          title="Knowledge base"
          description="Articles the self-service assistant answers from. The more you add, the more it deflects."
          actions={
            <Link
              href="/app/ask"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#0b2a4a] px-3 text-sm font-semibold text-white transition hover:bg-[#07111f]"
            >
              Open Ask
              <ArrowRight size={15} />
            </Link>
          }
        />

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Articles" value={String(articleRows.length)} icon={BookOpen} />
          <MetricCard label="Questions asked" value={String(queryRows.length)} icon={MessageCircleQuestion} />
          <MetricCard label="Deflection rate" value={`${deflectionRate}%`} icon={TrendingUp} />
          <MetricCard label="CSAT" value={csatUp + csatDown ? `${csat}%` : "—"} icon={ThumbsUp} />
        </section>

        {canEdit && suggestedRows.length > 0 && (
          <section className="mt-5 rounded-xl border border-[#c9defb] bg-[#f1f7ff] p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-[#dbeafe] text-[#0b5f91]">
                <Sparkles size={15} />
              </span>
              <h2 className="text-sm font-semibold">
                AI-suggested from resolved tickets
                <span className="ml-2 rounded-full bg-[#0b5f91] px-1.5 py-0.5 text-[11px] font-bold text-white">
                  {suggestedRows.length}
                </span>
              </h2>
            </div>
            <p className="mb-3 text-xs leading-5 text-slate-500">
              Drafted automatically when a ticket is resolved. Review, then publish so the Ask assistant can answer
              from it — or dismiss.
            </p>
            <div className="space-y-2.5">
              {suggestedRows.map((article) => (
                <article key={article.id} className="rounded-lg border border-[#c9defb] bg-white p-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold tracking-tight">{article.title}</h3>
                    {article.category && (
                      <span className="rounded-md border border-black/10 bg-[#f5f8fc] px-2 py-0.5 text-xs font-semibold text-slate-600">
                        {article.category}
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-slate-600">{article.body}</p>
                  <div className="mt-3 flex gap-2">
                    <form action={approveArticle}>
                      <input type="hidden" name="id" value={article.id} />
                      <PendingButton
                        pendingText="Publishing..."
                        className="h-8 rounded-md bg-[#0b2a4a] px-3 text-xs font-semibold text-white"
                      >
                        <Check size={14} />
                        Publish
                      </PendingButton>
                    </form>
                    <form action={deleteArticle}>
                      <input type="hidden" name="id" value={article.id} />
                      <PendingButton
                        pendingText="..."
                        className="h-8 rounded-md border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-700"
                      >
                        <Trash2 size={14} />
                        Dismiss
                      </PendingButton>
                    </form>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="mt-5 grid gap-5 xl:grid-cols-[330px_1fr]">
          <div>
            {canEdit ? (
              <Panel title="Add article" icon={BookOpen}>
                <form action={createArticle} className="space-y-3">
                  <input name="title" required placeholder="Article title" className={fieldClass} />
                  <input name="category" placeholder="Category (optional)" className={fieldClass} />
                  <textarea
                    name="body"
                    required
                    rows={8}
                    placeholder="Write the answer/steps. The assistant grounds its replies in this text and cites the title."
                    className="w-full resize-none rounded-lg border border-black/10 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-[#0b2a4a]"
                  />
                  <PendingButton pendingText="Saving..." className="h-10 w-full rounded-lg bg-[#0b2a4a] px-3 text-sm font-semibold text-white">
                    Add to knowledge base
                  </PendingButton>
                </form>
              </Panel>
            ) : (
              <Panel title="Add article" icon={BookOpen}>
                <p className="text-sm text-slate-500">Viewers can read the knowledge base but can&apos;t edit it.</p>
              </Panel>
            )}
          </div>

          <div className="space-y-3">
            {articleRows.map((article) => (
              <article key={article.id} className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold tracking-tight">{article.title}</h2>
                      {article.category && (
                        <span className="rounded-md border border-black/10 bg-[#f5f8fc] px-2 py-0.5 text-xs font-semibold text-slate-600">
                          {article.category}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{article.body}</p>
                  </div>
                  {canEdit && (
                    <form action={deleteArticle}>
                      <input type="hidden" name="id" value={article.id} />
                      <PendingButton
                        pendingText="..."
                        className="h-8 shrink-0 rounded-md border border-rose-200 bg-white px-2 text-xs font-semibold text-rose-700"
                      >
                        <Trash2 size={14} />
                      </PendingButton>
                    </form>
                  )}
                </div>
              </article>
            ))}

            {articleRows.length === 0 && (
              <div className="rounded-xl border border-dashed border-black/15 bg-white p-8 text-center">
                <BookOpen size={26} className="mx-auto text-[#0b5f91]" />
                <p className="mt-3 font-semibold">No articles yet.</p>
                <p className="mt-1 text-sm text-slate-500">Add your first article so the Ask assistant can answer from it.</p>
              </div>
            )}
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
