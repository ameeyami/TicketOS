"use server";

import { redirect } from "next/navigation";
import { answerCopilot, type CopilotTurn } from "@/lib/ai/copilot";
import { getOrgAnthropicKey } from "@/lib/ai/org-key";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function askCopilot(formData: FormData) {
  const threadIdInput = String(formData.get("threadId") ?? "").trim();
  const organizationId = String(formData.get("organizationId") ?? "");
  const question = String(formData.get("question") ?? "").trim();

  if (!organizationId || !question) {
    throw new Error("Ask a question before sending.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("You must be signed in to use Copilot.");
  }

  // Start a fresh chat thread on the first message (lazy — avoids empty threads).
  let threadId = threadIdInput;
  if (!threadId) {
    const { data: created, error: threadError } = await supabase
      .from("copilot_threads")
      .insert({
        organization_id: organizationId,
        created_by: userData.user.id,
        title: deriveThreadTitle(question),
      })
      .select("id")
      .single();
    if (threadError) {
      throw threadError;
    }
    threadId = created.id;
  }

  await supabase.from("copilot_messages").insert({
    organization_id: organizationId,
    thread_id: threadId,
    role: "user",
    content: question,
  });

  const [{ data: tickets }, { data: approvals }, { data: audits }, { data: history }] = await Promise.all([
    supabase.from("tickets").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }),
    supabase
      .from("approval_requests")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase.from("audit_logs").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(5),
    supabase
      .from("copilot_messages")
      .select("role, content")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  // Most-recent-first → chronological, keep only user/assistant turns.
  const turns: CopilotTurn[] = [...(history ?? [])]
    .reverse()
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message) => ({ role: message.role as "user" | "assistant", content: message.content }));

  // Real Claude using THIS org's own key; otherwise the built-in heuristic.
  const apiKey = await getOrgAnthropicKey(supabase, organizationId);
  const aiAnswer = await answerCopilot(
    turns,
    {
      tickets: tickets ?? [],
      approvals: approvals ?? [],
      audits: audits ?? [],
    },
    apiKey,
  );
  const answer = aiAnswer ?? buildCopilotAnswer(question, tickets ?? [], approvals ?? [], audits ?? []);

  await supabase.from("copilot_messages").insert({
    organization_id: organizationId,
    thread_id: threadId,
    role: "assistant",
    content: answer,
    citations: [
      { type: "tickets", count: tickets?.length ?? 0 },
      { type: "approvals", count: approvals?.length ?? 0 },
      { type: "audit_logs", count: audits?.length ?? 0 },
      { type: "engine", value: aiAnswer ? "claude" : "heuristic" },
    ],
  });

  // Bump the thread so it sorts to the top of the chat history.
  await supabase
    .from("copilot_threads")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", threadId)
    .eq("organization_id", organizationId);

  redirect(`/app/copilot?thread=${threadId}`);
}

function deriveThreadTitle(question: string) {
  const cleaned = question.replace(/\s+/g, " ").trim();
  return cleaned.length > 48 ? `${cleaned.slice(0, 45)}…` : cleaned || "New chat";
}

function buildCopilotAnswer(
  question: string,
  tickets: Array<{ status: string; title: string; external_id: string | null; ai_confidence: number | null }>,
  approvals: Array<{ title: string }>,
  audits: Array<{ event_summary: string }>,
) {
  const normalized = question.toLowerCase();
  const unresolved = tickets.filter((ticket) => !["resolved"].includes(ticket.status));
  const failedOrBlocked = tickets.filter((ticket) => ["failed", "blocked"].includes(ticket.status));

  if (normalized.includes("failed") || normalized.includes("blocked")) {
    if (failedOrBlocked.length === 0) {
      return "I do not see failed or blocked tickets right now. The current operational risk is mostly pending approvals and in-progress execution.";
    }

    return `I found ${failedOrBlocked.length} blocked or failed ticket(s): ${failedOrBlocked
      .map((ticket) => `${ticket.external_id ?? "Ticket"}: ${ticket.title}`)
      .join("; ")}. Check the ticket detail page for policy and audit context.`;
  }

  if (normalized.includes("approval")) {
    if (approvals.length === 0) {
      return "There are no pending approvals. Agent workflows can continue without a human gate for the current queue.";
    }

    return `There ${approvals.length === 1 ? "is" : "are"} ${approvals.length} pending approval(s): ${approvals
      .map((approval) => approval.title)
      .join("; ")}.`;
  }

  if (normalized.includes("summarize") || normalized.includes("unresolved")) {
    return `There are ${unresolved.length} unresolved ticket(s). Top items: ${unresolved
      .slice(0, 4)
      .map((ticket) => `${ticket.external_id ?? "Ticket"}: ${ticket.title} (${ticket.status})`)
      .join("; ")}.`;
  }

  return `I reviewed ${tickets.length} ticket(s), ${approvals.length} pending approval(s), and ${audits.length} recent audit event(s). The queue is operational, with ${unresolved.length} unresolved item(s). Try asking “Summarize unresolved tickets” or “Show blocked workflows.”`;
}
