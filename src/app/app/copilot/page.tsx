import Link from "next/link";
import { redirect } from "next/navigation";
import { MessagesSquare, Plus, Send, Sparkles } from "lucide-react";
import { askCopilot } from "@/app/app/copilot/actions";
import { PageHeader } from "@/components/dashboard/page-header";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PendingButton } from "@/components/ui/pending-button";
import { cn } from "@/lib/utils";

export default async function CopilotPage({
  searchParams,
}: {
  searchParams: Promise<{ thread?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect("/auth/sign-in?message=Sign in to use Copilot.");
  }

  const organization = await ensureWorkspace(supabase, userData.user);
  const params = await searchParams;

  const { data: threads } = await supabase
    .from("copilot_threads")
    .select("id, title, created_at, updated_at")
    .eq("organization_id", organization.id)
    .eq("created_by", userData.user.id)
    .order("updated_at", { ascending: false })
    .limit(50);

  const threadList = threads ?? [];
  const activeThreadId =
    params.thread && threadList.some((thread) => thread.id === params.thread) ? params.thread : null;

  const { data: messages } = activeThreadId
    ? await supabase
        .from("copilot_messages")
        .select("*")
        .eq("thread_id", activeThreadId)
        .order("created_at", { ascending: true })
    : { data: [] };
  const messageList = messages ?? [];

  return (
    <main className="min-h-screen bg-[#f6f7f2] px-4 py-6 text-[#151914] md:px-8">
      <div className="mx-auto max-w-6xl">
        <PageHeader
          crumbs={[{ label: "Other" }, { label: "Copilot" }]}
          title="Operations Copilot"
          description="Ask about tickets, approvals, and recent activity."
          actions={
            <Link
              href="/app/copilot"
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#0b2a4a] px-3 text-sm font-semibold text-white"
            >
              <Plus size={16} />
              New chat
            </Link>
          }
        />

        <section className="mt-6 grid gap-5 lg:grid-cols-[260px_1fr]">
          {/* Chat history */}
          <aside className="rounded-xl border border-black/10 bg-white p-3 shadow-sm">
            <p className="px-2 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-black/40">Chat history</p>
            <div className="mt-1 space-y-1">
              {threadList.length > 0 ? (
                threadList.map((thread) => (
                  <Link
                    key={thread.id}
                    href={`/app/copilot?thread=${thread.id}`}
                    className={cn(
                      "block rounded-md px-3 py-2 transition",
                      thread.id === activeThreadId ? "bg-[#eef5ea] text-[#1c3b32]" : "hover:bg-[#f3f6f0]",
                    )}
                  >
                    <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                      <MessagesSquare size={13} className="shrink-0 text-black/35" />
                      {thread.title ?? "Chat"}
                    </p>
                    <p className="mt-0.5 pl-5 text-xs text-black/40">{formatDate(thread.updated_at ?? thread.created_at)}</p>
                  </Link>
                ))
              ) : (
                <p className="px-3 py-2 text-xs text-black/40">No chats yet. Ask something to start one.</p>
              )}
            </div>
          </aside>

          {/* Active conversation */}
          <div className="flex min-h-[460px] flex-col rounded-xl border border-black/10 bg-white shadow-sm">
            <div className="flex-1 space-y-4 p-5">
              {messageList.length > 0 ? (
                messageList.map((message) => (
                  <div
                    key={message.id}
                    className={
                      message.role === "user"
                        ? "ml-auto max-w-2xl whitespace-pre-wrap rounded-xl bg-[#17211c] p-4 text-sm leading-6 text-white"
                        : "max-w-2xl whitespace-pre-wrap rounded-xl border border-black/10 bg-[#f8faf5] p-4 text-sm leading-6 text-black/72"
                    }
                  >
                    {message.content}
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-black/15 bg-[#f8faf5] p-5">
                  <div className="flex items-center gap-2 font-semibold">
                    <Sparkles size={17} className="text-[#2f6f60]" />
                    {activeThreadId ? "This chat is empty" : "New chat — try asking"}
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
              <input type="hidden" name="threadId" value={activeThreadId ?? ""} />
              <input type="hidden" name="organizationId" value={organization.id} />
              <input
                name="question"
                required
                autoComplete="off"
                className="h-12 min-w-0 flex-1 rounded-lg border border-black/10 px-3 text-sm outline-none focus:border-[#2f6f60] focus:ring-4 focus:ring-[#2f6f60]/10"
                placeholder={activeThreadId ? "Reply in this chat..." : "Start a new chat with Copilot..."}
              />
              <PendingButton
                pendingText="Asking..."
                className="h-12 rounded-lg bg-[#17211c] px-4 text-sm font-semibold text-white"
              >
                <Send size={17} />
                Ask
              </PendingButton>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "";
  }
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
