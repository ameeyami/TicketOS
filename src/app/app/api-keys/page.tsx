import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { CheckCircle2, Code2, KeyRound, MessageCircle, TriangleAlert, Webhook } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { PendingButton } from "@/components/ui/pending-button";
import { ApiKeyManager, type ApiKeyRow } from "@/app/app/api-keys/api-key-manager";
import { disableWidget, enableWidget, saveWebhook } from "@/app/app/api-keys/actions";
import { createSupabaseAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ApiKeysPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    redirect("/auth/sign-in?message=Sign in to manage API access.");
  }

  const organization = await ensureWorkspace(supabase, userData.user);
  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organization.id)
    .eq("user_id", userData.user.id)
    .maybeSingle();

  const canManage = membership?.role === "owner" || membership?.role === "admin";
  const enabled = hasServiceRole();

  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  const origin = host ? `${proto}://${host}` : "https://your-domain";

  let keys: ApiKeyRow[] = [];
  let webhookUrl = "";
  let hasWebhookSecret = false;
  let widgetEnabled = false;
  let widgetKey = "";
  if (enabled) {
    const admin = createSupabaseAdminClient();
    const [{ data: keyRows }, { data: org }] = await Promise.all([
      admin
        .from("api_keys")
        .select("id, name, last_four, created_at, last_used_at, revoked_at")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false }),
      admin
        .from("organizations")
        .select("webhook_url, webhook_secret, widget_enabled, widget_key")
        .eq("id", organization.id)
        .maybeSingle(),
    ]);
    keys = (keyRows ?? []) as ApiKeyRow[];
    webhookUrl = org?.webhook_url ?? "";
    hasWebhookSecret = Boolean(org?.webhook_secret);
    widgetEnabled = Boolean(org?.widget_enabled);
    widgetKey = org?.widget_key ?? "";
  }

  const embedSnippet = `<script src="${origin}/api/widget/loader?key=${widgetKey}" async></script>`;

  const curl = `curl -X POST ${origin}/api/v1/tickets \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"title":"Laptop won'\\''t boot","description":"Won'\\''t power on after update","priority":"high"}'`;

  return (
    <main className="min-h-screen px-4 py-6 text-[#151914] md:px-8">
      <div className="mx-auto max-w-4xl">
        <PageHeader
          crumbs={[{ label: "Other" }, { label: "API & webhooks" }]}
          title="API & webhooks"
          description="Create tickets from any system over a REST API, and get a webhook when tickets are created or resolved."
        />

        {!canManage ? (
          <p className="rounded-xl border border-dashed border-black/15 bg-white p-5 text-sm text-slate-500">
            Ask an owner or admin to manage API keys and webhooks.
          </p>
        ) : (
          <>
            {!enabled && (
              <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="flex items-center gap-2 font-semibold text-amber-900">
                  <TriangleAlert size={17} />
                  Turn the API on
                </p>
                <p className="mt-1 text-sm text-amber-900/80">
                  The public API needs a server-only Supabase key. In Vercel → Project → Settings → Environment
                  Variables, add <code className="rounded bg-white/70 px-1">SUPABASE_SERVICE_ROLE_KEY</code> (Supabase →
                  Project Settings → API → <em>service_role</em> secret), then redeploy. Keys &amp; webhooks unlock here
                  automatically.
                </p>
              </div>
            )}

            {enabled && (
              <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
                <span className="flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  API enabled
                </span>
              </div>
            )}

            {/* API keys */}
            <section className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-[#e7f0ff] text-[#0b5f91]">
                  <KeyRound size={15} />
                </span>
                <h2 className="text-sm font-semibold">API keys</h2>
              </div>
              <ApiKeyManager keys={keys} enabled={enabled} />
            </section>

            {/* Webhook */}
            <section className="mt-4 rounded-xl border border-black/10 bg-white p-5 shadow-sm">
              <div className="mb-1 flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-[#e7f0ff] text-[#0b5f91]">
                  <Webhook size={15} />
                </span>
                <h2 className="text-sm font-semibold">Webhook endpoint</h2>
              </div>
              <p className="mb-3 text-xs text-slate-500">
                We POST <code className="rounded bg-black/[0.04] px-1">ticket.created</code> and{" "}
                <code className="rounded bg-black/[0.04] px-1">ticket.resolved</code> events here, signed with{" "}
                <code className="rounded bg-black/[0.04] px-1">x-ticketos-signature</code> (HMAC-SHA256).
              </p>
              <form action={saveWebhook} className="space-y-3">
                <input
                  name="webhookUrl"
                  type="url"
                  defaultValue={webhookUrl}
                  disabled={!enabled}
                  placeholder="https://your-system.example.com/hooks/ticketos"
                  className="h-10 w-full rounded-lg border border-black/10 bg-white px-3 text-sm outline-none focus:border-[#0b2a4a] disabled:opacity-60"
                />
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input type="checkbox" name="regenerate" disabled={!enabled} className="size-4" />
                  Regenerate signing secret {hasWebhookSecret ? "(a secret is set)" : "(none yet)"}
                </label>
                <PendingButton
                  pendingText="Saving..."
                  className="h-10 rounded-lg bg-[#0b2a4a] px-4 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Save webhook
                </PendingButton>
              </form>
            </section>

            {/* Docs */}
            <section className="mt-4 rounded-xl border border-black/10 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-[#e7f0ff] text-[#0b5f91]">
                  <Code2 size={15} />
                </span>
                <h2 className="text-sm font-semibold">Create a ticket from anywhere</h2>
              </div>
              <pre className="overflow-x-auto rounded-lg bg-[#07111f] p-4 text-xs leading-6 text-[#d7e3f0]">
                <code>{curl}</code>
              </pre>
              <p className="mt-2 text-xs text-slate-500">
                <code className="rounded bg-black/[0.04] px-1">GET {origin}/api/v1/tickets</code> lists recent tickets.
                Tickets created via the API are AI-triaged on your workspace key, just like the in-app form.
              </p>
            </section>

            {/* Self-service widget */}
            <section className="mt-4 rounded-xl border border-black/10 bg-white p-5 shadow-sm">
              <div className="mb-1 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-[#e7f0ff] text-[#0b5f91]">
                    <MessageCircle size={15} />
                  </span>
                  <h2 className="text-sm font-semibold">Self-service widget</h2>
                </div>
                {enabled && widgetEnabled ? (
                  <form action={disableWidget}>
                    <PendingButton
                      pendingText="..."
                      className="h-8 rounded-md border border-rose-200 bg-white px-2.5 text-xs font-semibold text-rose-700"
                    >
                      Turn off
                    </PendingButton>
                  </form>
                ) : (
                  <form action={enableWidget}>
                    <PendingButton
                      pendingText="..."
                      className="h-8 rounded-md bg-[#0b2a4a] px-2.5 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      Enable widget
                    </PendingButton>
                  </form>
                )}
              </div>
              <p className="mb-3 text-xs text-slate-500">
                A floating help bubble for any intranet or portal page. It answers from your published knowledge base
                and escalates to a ticket when it can&apos;t — deflection, anywhere.
              </p>

              {enabled && widgetEnabled ? (
                <>
                  <p className="mb-1 text-xs font-semibold text-slate-500">Paste before &lt;/body&gt; on any page:</p>
                  <pre className="overflow-x-auto rounded-lg bg-[#07111f] p-4 text-xs leading-6 text-[#d7e3f0]">
                    <code>{embedSnippet}</code>
                  </pre>
                  <a
                    href={`/widget/${widgetKey}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-xs font-semibold text-[#0b5f91] hover:underline"
                  >
                    Open a live preview →
                  </a>
                </>
              ) : (
                <p className="rounded-lg border border-dashed border-black/15 p-3 text-sm text-slate-500">
                  {enabled ? "Turn the widget on to get your embed snippet." : "Enable the API first (service-role key) to use the widget."}
                </p>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
