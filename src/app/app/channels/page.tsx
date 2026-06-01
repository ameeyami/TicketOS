import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Bot, CheckCircle2, MessagesSquare, Send, UserRound } from "lucide-react";
import { submitChatRequest } from "@/app/app/channels/actions";
import { PageHeader } from "@/components/dashboard/page-header";
import { PendingButton } from "@/components/ui/pending-button";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const channelMeta: Record<string, { label: string; handle: string }> = {
  slack: { label: "Slack", handle: "#it-help" },
  teams: { label: "Microsoft Teams", handle: "IT Support" },
};

const statusLabels: Record<string, string> = {
  new: "New",
  triaging: "Triaging",
  approval_required: "Approval",
  executing: "Resolving",
  resolved: "Resolved",
  failed: "Failed",
  blocked: "Blocked",
};

export default async function ChannelsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect("/auth/sign-in?message=Sign in to manage chat intake.");
  }

  const organization = await ensureWorkspace(supabase, userData.user);
  const [{ data: integrations }, { data: tickets }] = await Promise.all([
    supabase
      .from("integrations")
      .select("provider_key, display_name, status")
      .eq("organization_id", organization.id)
      .in("provider_key", ["slack", "teams"]),
    supabase
      .from("tickets")
      .select("id, external_id, title, description, status, source, requester_name, ai_summary, created_at, agents(name)")
      .eq("organization_id", organization.id)
      .in("source", ["slack", "teams"])
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  const integrationRows = integrations ?? [];
  const statusByProvider = new Map(integrationRows.map((row) => [row.provider_key, row.status]));
  const conversations = tickets ?? [];

  return (
    <main className="min-h-screen bg-[#f6f7f2] px-4 py-6 text-[#151914] md:px-8">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          crumbs={[{ label: "IT" }, { label: "Channels" }]}
          title="Channels"
          description="Requests arrive from Slack and Teams, get classified, and the agent replies in-thread."
        />

        <section className="mt-6 grid gap-3 sm:grid-cols-2">
          {(["slack", "teams"] as const).map((provider) => {
            const status = String(statusByProvider.get(provider) ?? "not_connected");
            const connected = status === "connected";
            return (
              <div key={provider} className="flex items-center justify-between rounded-xl border border-black/10 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="flex size-11 items-center justify-center rounded-lg bg-[#eef5ea] text-[#2e6658]">
                    <MessagesSquare size={20} />
                  </span>
                  <div>
                    <p className="font-semibold">{channelMeta[provider].label}</p>
                    <p className="text-sm text-black/50">{channelMeta[provider].handle}</p>
                  </div>
                </div>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold",
                    connected
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-amber-200 bg-amber-50 text-amber-800",
                  )}
                >
                  {connected && <CheckCircle2 size={12} />}
                  {connected ? "Connected" : status.replaceAll("_", " ")}
                </span>
              </div>
            );
          })}
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[.85fr_1.15fr]">
          <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-lg bg-[#eef5ea] text-[#2e6658]">
                <Send size={18} />
              </span>
              <h2 className="text-lg font-semibold">Simulate an inbound message</h2>
            </div>
            <p className="-mt-2 mb-4 text-sm leading-6 text-black/52">
              Post a message as an employee would in chat. TicketOS classifies it, opens a ticket, and replies in-thread.
            </p>
            <form action={submitChatRequest} className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Channel">
                  <select name="channel" defaultValue="slack" className={inputClass}>
                    <option value="slack">Slack · #it-help</option>
                    <option value="teams">Teams · IT Support</option>
                  </select>
                </Field>
                <Field label="Category">
                  <select name="category" defaultValue="Identity" className={inputClass}>
                    <option value="Identity">Identity</option>
                    <option value="Onboarding">Onboarding</option>
                    <option value="Network">Network</option>
                    <option value="Security">Security</option>
                  </select>
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Employee name">
                  <input name="requesterName" required placeholder="Jordan Lee" className={inputClass} />
                </Field>
                <Field label="Employee email (optional)">
                  <input name="requesterEmail" type="email" placeholder="jordan@example.com" className={inputClass} />
                </Field>
              </div>
              <Field label="Message">
                <textarea
                  name="message"
                  required
                  rows={4}
                  placeholder="I can't log into Okta after resetting my laptop — can someone help?"
                  className={cn(inputClass, "h-auto py-2 leading-6")}
                />
              </Field>
              <PendingButton
                pendingText="Sending..."
                className="h-11 rounded-lg bg-[#0b2a4a] px-3 text-sm font-semibold text-white"
              >
                <Send size={16} />
                Send to TicketOS
              </PendingButton>
            </form>
          </div>

          <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-lg bg-[#eef5ea] text-[#2e6658]">
                <MessagesSquare size={18} />
              </span>
              <h2 className="text-lg font-semibold">Conversations</h2>
            </div>
            <div className="space-y-4">
              {conversations.length > 0 ? (
                conversations.map((ticket) => {
                  const meta = channelMeta[ticket.source] ?? { label: ticket.source, handle: "" };
                  return (
                    <div key={ticket.id} className="rounded-xl border border-black/10 bg-[#f8faf5] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md border border-black/10 bg-white px-2 py-0.5 text-xs font-semibold text-black/55">
                            {meta.label} · {meta.handle}
                          </span>
                          <span className="text-xs font-semibold text-black/40">{ticket.external_id}</span>
                        </div>
                        <span className="rounded-md bg-[#edf5e9] px-2 py-0.5 text-xs font-semibold text-[#315f4f]">
                          {statusLabels[ticket.status] ?? ticket.status}
                        </span>
                      </div>

                      <div className="mt-3 flex gap-2">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#dbe7f2] text-[#0b4f7a]">
                          <UserRound size={14} />
                        </span>
                        <div className="rounded-2xl rounded-tl-sm border border-black/10 bg-white px-3 py-2 text-sm leading-6">
                          <p className="text-xs font-semibold text-black/45">{ticket.requester_name ?? "Employee"}</p>
                          <p className="mt-0.5">{ticket.description ?? ticket.title}</p>
                        </div>
                      </div>

                      <div className="mt-2 flex flex-row-reverse gap-2">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#e7f5ee] text-[#2e6658]">
                          <Bot size={14} />
                        </span>
                        <div className="rounded-2xl rounded-tr-sm border border-[#cfe8da] bg-[#eef7f1] px-3 py-2 text-sm leading-6">
                          <p className="text-xs font-semibold text-[#2e6658]">{agentName(ticket.agents)}</p>
                          <p className="mt-0.5 text-black/72">{ticket.ai_summary ?? "Working on it."}</p>
                        </div>
                      </div>

                      <Link
                        href={`/app/tickets/${ticket.id}`}
                        className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#0b5f91]"
                      >
                        Open ticket
                        <ArrowRight size={14} />
                      </Link>
                    </div>
                  );
                })
              ) : (
                <p className="rounded-lg border border-dashed border-black/15 p-6 text-center text-sm text-black/48">
                  No chat requests yet. Send one on the left to see it appear here.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

const inputClass =
  "mt-2 h-10 w-full rounded-md border border-black/10 bg-white px-3 text-sm outline-none focus:border-[#2f6f60]";

// Supabase types embedded relations as an array or object depending on inference.
function agentName(relation: unknown): string {
  if (Array.isArray(relation)) return relation[0]?.name ?? "TicketOS";
  if (relation && typeof relation === "object") return (relation as { name?: string }).name ?? "TicketOS";
  return "TicketOS";
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-black/40">
      {label}
      {children}
    </label>
  );
}
