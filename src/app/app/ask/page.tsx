import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BookOpen } from "lucide-react";
import { AskAssistant } from "@/app/app/ask/ask-assistant";
import { PageHeader } from "@/components/dashboard/page-header";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { getOrgAnthropicKeyMeta } from "@/lib/ai/org-key";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AskPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect("/auth/sign-in?message=Sign in to use the help desk.");
  }

  const organization = await ensureWorkspace(supabase, userData.user);
  const [{ count: articleCount }, { connected: aiKeyConnected }] = await Promise.all([
    supabase
      .from("knowledge_articles")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organization.id),
    getOrgAnthropicKeyMeta(supabase, organization.id),
  ]);

  return (
    <main className="min-h-screen px-4 py-6 text-[#07111f] md:px-8">
      <div className="mx-auto max-w-3xl">
        <PageHeader
          crumbs={[{ label: "IT" }, { label: "Ask" }]}
          title="Ask the help desk"
          description="Get an instant, sourced answer from your knowledge base — and only open a ticket if you still need a person."
          actions={
            <Link
              href="/app/knowledge"
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-black/10 bg-white px-3 text-sm font-semibold transition hover:bg-black/[0.04]"
            >
              <BookOpen size={15} />
              Knowledge base
            </Link>
          }
        />

        <AskAssistant />

        {!aiKeyConnected && (
          <p className="mt-4 text-sm text-slate-500">
            Tip: connect your Claude API key on the{" "}
            <Link href="/app/diagnostics" className="font-semibold text-[#0b2a4a] underline">
              Claude API
            </Link>{" "}
            page for richer, synthesised answers. Until then, the assistant returns the best matching article.
          </p>
        )}

        {(articleCount ?? 0) === 0 && (
          <p className="mt-2 text-sm text-slate-500">
            Your knowledge base is empty —{" "}
            <Link href="/app/knowledge" className="inline-flex items-center gap-1 font-semibold text-[#0b2a4a] underline">
              add articles <ArrowRight size={13} />
            </Link>{" "}
            so the assistant can answer.
          </p>
        )}
      </div>
    </main>
  );
}
