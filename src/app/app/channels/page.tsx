import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AtSign, CheckCircle2, CircleAlert, Link2, MessagesSquare, Send, Terminal } from "lucide-react";
import { saveSlackTeamId, submitChatRequest } from "@/app/app/channels/actions";
import { PageHeader } from "@/components/dashboard/page-header";
import { PendingButton } from "@/components/ui/pending-button";
import { hasServiceRole } from "@/lib/supabase/admin";
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
  const [{ data: integrations }, { data: tickets }, { data: orgRow }] = await Promise.all([
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
    supabase.from("organizations").select("slack_team_id").eq("id", organization.id).maybeSingle(),
  ]);

  const integrationRows = integrations ?? [];
  const statusByProvider = new Map(integrationRows.map((row) => [row.provider_key, row.status]));
  const conversations = tickets ?? [];

  // Two-way Slack assistant config (env lives only in the deployment).
  const slackTeamId = (orgRow?.slack_team_id as string | null) ?? "";
  const serviceReady = hasServiceRole();
  const signingReady = Boolean(process.env.SLACK_SIGNING_SECRET);
  const botReady = Boolean(process.env.SLACK_BOT_TOKEN);
  const assistantEnabled = serviceReady && signingReady;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "your-deployment.vercel.app";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const origin = `${proto}://${host}`;

  return (
    <main className="min-h-screen px-4 py-6 text-[#151914] md:px-8">
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
                  <span className="flex size-9 items-center justify-center rounded-lg bg-[#e7f0ff] text-[#0b5f91]">
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

        {/* Two-way Slack assistant */}
        <section className="mt-6 rounded-xl border border-[#d8e4ee] bg-gradient-to-br from-[#f1f7ff] to-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-[#dbeafe] text-[#0b5f91]">
                <AtSign size={18} />
              </span>
              <div>
                <h2 className="text-lg font-semibold">Slack assistant (two-way)</h2>
                <p className="text-sm text-black/52">
                  Employees ask in Slack — TicketOS answers from your knowledge base or opens a ticket, right in-thread.
                </p>
              </div>
            </div>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold",
                assistantEnabled
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-amber-200 bg-amber-50 text-amber-800",
              )}
            >
              {assistantEnabled ? <CheckCircle2 size={12} /> : <CircleAlert size={12} />}
              {assistantEnabled ? "Live" : "Needs setup"}
            </span>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <ConfigChip label="Service role key" ready={serviceReady} hint="SUPABASE_SERVICE_ROLE_KEY" />
            <ConfigChip label="Signing secret" ready={signingReady} hint="SLACK_SIGNING_SECRET" />
            <ConfigChip label="Bot token (for @-mentions)" ready={botReady} hint="SLACK_BOT_TOKEN" />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-black/10 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-black/40">Slack request URLs</p>
              <UrlRow icon={Terminal} label="Slash command" url={`${origin}/api/slack/command`} />
              <UrlRow icon={AtSign} label="Event subscriptions" url={`${origin}/api/slack/events`} />
              <p className="mt-3 text-xs leading-5 text-black/48">
                In your Slack app: add a slash command (e.g. <span className="font-semibold">/ticketos</span>) pointing at the
                command URL, and under Event Subscriptions enable <span className="font-semibold">app_mention</span> with the
                events URL. Add the <span className="font-semibold">chat:write</span> scope so the bot can reply in-thread.
              </p>
            </div>

            <div className="rounded-lg border border-black/10 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-black/40">Link your workspace</p>
              <p className="mt-2 text-sm leading-6 text-black/55">
                Enter your Slack <span className="font-semibold">Team ID</span> (looks like <code>T01ABCD23</code>, from
                Slack → workspace settings) so requests route to this organization.
              </p>
              <form action={saveSlackTeamId} className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  name="slackTeamId"
                  defaultValue={slackTeamId}
                  placeholder="T01ABCD23"
                  className="h-10 flex-1 rounded-md border border-black/10 bg-white px-3 text-sm outline-none focus:border-[#0b2a4a]"
                />
                <PendingButton
                  pendingText="Saving..."
                  className="h-10 shrink-0 rounded-md bg-[#0b2a4a] px-3 text-sm font-semibold text-white"
                >
                  <Link2 size={15} />
                  {slackTeamId ? "Update link" : "Link workspace"}
                </PendingButton>
              </form>
              {slackTeamId ? (
                <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 size={12} />
                  Linked to {slackTeamId}
                </p>
              ) : (
                <p className="mt-2 text-xs text-black/45">Not linked yet.</p>
              )}
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[.85fr_1.15fr]">
          <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-lg bg-[#e7f0ff] text-[#0b5f91]">
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
              <span className="flex size-9 items-center justify-center rounded-lg bg-[#e7f0ff] text-[#0b5f91]">
                <MessagesSquare size={18} />
              </span>
              <h2 className="text-lg font-semibold">Conversations</h2>
            </div>
            <div className="divide-y divide-black/8">
              {conversations.length > 0 ? (
                conversations.map((ticket) => {
                  const meta = channelMeta[ticket.source] ?? { label: ticket.source, handle: "" };
                  return (
                    <Link
                      key={ticket.id}
                      href={`/app/tickets/${ticket.id}`}
                      className="flex items-start justify-between gap-3 py-3 transition hover:opacity-80"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md border border-black/10 bg-white px-2 py-0.5 text-xs font-semibold text-black/55">
                            {meta.label}
                          </span>
                          <span className="text-xs font-semibold text-black/40">{ticket.external_id}</span>
                          <span className="text-xs text-black/45">{ticket.requester_name ?? "Employee"}</span>
                        </div>
                        <p className="mt-1 truncate text-sm text-black/70">{ticket.description ?? ticket.title}</p>
                      </div>
                      <span className="shrink-0 rounded-md bg-[#e7f0ff] px-2 py-0.5 text-xs font-semibold text-[#0b5f91]">
                        {statusLabels[ticket.status] ?? ticket.status}
                      </span>
                    </Link>
                  );
                })
              ) : (
                <p className="py-6 text-center text-sm text-black/48">
                  No chat requests yet. Send one on the left to see it here.
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
  "mt-2 h-10 w-full rounded-md border border-black/10 bg-white px-3 text-sm outline-none focus:border-[#0b2a4a]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-black/40">
      {label}
      {children}
    </label>
  );
}

function ConfigChip({ label, ready, hint }: { label: string; ready: boolean; hint: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs",
        ready ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50",
      )}
    >
      {ready ? (
        <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
      ) : (
        <CircleAlert size={14} className="shrink-0 text-amber-600" />
      )}
      <div className="min-w-0">
        <p className={cn("font-semibold", ready ? "text-emerald-800" : "text-amber-900")}>{label}</p>
        <p className="truncate font-mono text-[11px] text-black/45">{hint}</p>
      </div>
    </div>
  );
}

function UrlRow({ icon: Icon, label, url }: { icon: typeof Terminal; label: string; url: string }) {
  return (
    <div className="mt-3 first:mt-2">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-black/55">
        <Icon size={13} className="text-[#0b5f91]" />
        {label}
      </p>
      <code className="mt-1 block overflow-x-auto rounded-md border border-black/10 bg-[#f5f8fc] px-2.5 py-1.5 text-[12px] text-[#0b2a4a]">
        {url}
      </code>
    </div>
  );
}
