import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Bot, Send, Sparkles } from "lucide-react";
import { askCopilot } from "@/app/app/copilot/actions";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PendingButton } from "@/components/ui/pending-button";

export default async function CopilotPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect("/auth/sign-in?message=Sign in to use Copilot.");
  }

  const organization = await ensureWorkspace(supabase, userData.user);
  let { data: thread } = await supabase
    .from("copilot_threads")
    .select("*")
    .eq("organization_id", organization.id)
    .eq("created_by", userData.user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!thread) {
    const { data: createdThread, error } = await supabase
      .from("copilot_threads")
      .insert({
        organization_id: organization.id,
        created_by: userData.user.id,
        title: "Operations Copilot",
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    thread = createdThread;
  }

  const { data: messages } = await supabase
    .from("copilot_messages")
    .select("*")
    .eq("thread_id", thread.id)
    .order("created_at", { ascending: true });

  return (
    <main className="min-h-screen bg-[#f6f7f2] px-4 py-6 text-[#151914] md:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/app"
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-black/10 bg-white px-3 text-sm font-semibold"
        >
          <ArrowLeft size={16} />
          Command center
        </Link>

        <section className="mt-6 rounded-xl border border-black/10 bg-white shadow-sm">
          <div className="border-b border-black/10 p-5">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-lg bg-[#eef5ea] text-[#2e6658]">
                <Bot size={19} />
              </span>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Operations Copilot</h1>
                <p className="mt-1 text-sm text-black/52">
                  Ask about tickets, approvals, blocked workflows, and recent audit context.
                </p>
              </div>
            </div>
          </div>

          <div className="min-h-[420px] space-y-4 p-5">
            {(messages ?? []).length > 0 ? (
              messages?.map((message) => (
                <div
                  key={message.id}
                  className={
                    message.role === "user"
                      ? "ml-auto max-w-2xl rounded-xl bg-[#17211c] p-4 text-sm leading-6 text-white"
                      : "max-w-2xl rounded-xl border border-black/10 bg-[#f8faf5] p-4 text-sm leading-6 text-black/68"
                  }
                >
                  {message.content}
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-black/15 bg-[#f8faf5] p-5">
                <div className="flex items-center gap-2 font-semibold">
                  <Sparkles size={17} className="text-[#2f6f60]" />
                  Try asking
                </div>
                <div className="mt-4 grid gap-2 text-sm text-black/58 md:grid-cols-3">
                  <p>Summarize unresolved tickets</p>
                  <p>Show blocked workflows</p>
                  <p>What approvals are pending?</p>
                </div>
              </div>
            )}
          </div>

          <form action={askCopilot} className="flex gap-3 border-t border-black/10 p-5">
            <input type="hidden" name="threadId" value={thread.id} />
            <input type="hidden" name="organizationId" value={organization.id} />
            <input
              name="question"
              required
              className="h-12 min-w-0 flex-1 rounded-lg border border-black/10 px-3 text-sm outline-none focus:border-[#2f6f60] focus:ring-4 focus:ring-[#2f6f60]/10"
              placeholder="Ask TicketOS Copilot..."
            />
            <PendingButton
              pendingText="Asking..."
              className="h-12 rounded-lg bg-[#17211c] px-4 text-sm font-semibold text-white"
            >
              <Send size={17} />
              Ask
            </PendingButton>
          </form>
        </section>
      </div>
    </main>
  );
}
