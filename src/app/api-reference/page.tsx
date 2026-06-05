import type { Metadata } from "next";
import { KeyRound, Webhook, MessageSquareText } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { MarketingFooter, MarketingNav } from "@/components/marketing/marketing-chrome";
import { PageHero } from "@/components/marketing/page-parts";

export const metadata: Metadata = {
  title: "API reference — TicketOS",
  description: "Create tickets over REST, list them, and receive signed webhooks on ticket events.",
};

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-xl bg-[#07111f] p-4 text-xs leading-6 text-[#d7e3f0]">
      <code>{children}</code>
    </pre>
  );
}

function Endpoint({
  method,
  path,
  children,
}: {
  method: string;
  path: string;
  children: React.ReactNode;
}) {
  const tone =
    method === "POST"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-sky-50 text-sky-700 border-sky-200";
  return (
    <div className="rounded-2xl border border-[#d8e4ee] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-md border px-2 py-0.5 text-xs font-bold ${tone}`}>{method}</span>
        <code className="font-mono text-sm font-semibold text-[#0b2a4a]">{path}</code>
      </div>
      <div className="mt-3 space-y-3 text-sm leading-6 text-slate-600">{children}</div>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
        <span className="flex size-8 items-center justify-center rounded-lg bg-[#e7f0ff] text-[#0b5f91]">
          <Icon size={16} />
        </span>
        {title}
      </h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

export default function ApiReference() {
  return (
    <main className="min-h-screen bg-[#f4f8fb] text-[#07111f]">
      <MarketingNav />
      <PageHero
        eyebrow="Developers"
        title="API reference"
        subtitle="A small, predictable REST API to create tickets from any system and receive events back. Tickets created via the API are AI-triaged on your workspace key, just like the in-app form."
      />

      <div className="mx-auto max-w-3xl px-5 py-14 md:px-8">
        <Section title="Authentication" icon={KeyRound}>
          <p>
            Create an API key in <strong>Other → API &amp; webhooks</strong>. Send it as a bearer token. Keys are stored
            hashed and shown only once.
          </p>
          <Code>{`Authorization: Bearer tos_live_xxxxxxxxxxxxxxxx`}</Code>
        </Section>

        <Section title="Tickets" icon={MessageSquareText}>
          <Endpoint method="POST" path="/api/v1/tickets">
            <p>Create a ticket. Returns the created ticket with its reference.</p>
            <Code>{`curl -X POST https://ticketos.vercel.app/api/v1/tickets \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Laptop won'\\''t boot",
    "description": "No power after the latest update",
    "priority": "high",
    "requester_email": "sam@acme.com"
  }'`}</Code>
            <Code>{`201 Created
{ "ticket": { "id": "…", "external_id": "TOS-1923", "status": "triaging" } }`}</Code>
          </Endpoint>

          <Endpoint method="GET" path="/api/v1/tickets">
            <p>List recent tickets for the authenticated workspace (optional <code>?limit=</code>, max 100).</p>
            <Code>{`curl https://ticketos.vercel.app/api/v1/tickets?limit=25 \\
  -H "Authorization: Bearer YOUR_API_KEY"`}</Code>
          </Endpoint>
        </Section>

        <Section title="Webhooks" icon={Webhook}>
          <p>
            Set a webhook URL in <strong>API &amp; webhooks</strong>. TicketOS POSTs an event when a ticket is created or
            resolved, signed with HMAC-SHA256 in <code>x-ticketos-signature</code>.
          </p>
          <Code>{`POST https://your-system.example.com/hooks/ticketos
x-ticketos-event: ticket.resolved
x-ticketos-signature: <hmac-sha256 of the body>

{ "event": "ticket.resolved", "data": { "external_id": "TOS-1923", "status": "resolved" }, "sent_at": "…" }`}</Code>
        </Section>

        <p className="mt-10 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          The public API and widget require <code>SUPABASE_SERVICE_ROLE_KEY</code> to be set on the deployment. Until
          then these endpoints return <code>503</code>.
        </p>
      </div>

      <MarketingFooter />
    </main>
  );
}
