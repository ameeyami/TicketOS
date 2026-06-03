import { redirect } from "next/navigation";
import { CheckCircle2, CircleAlert, Cpu, KeyRound, PlugZap, Sparkles, Trash2 } from "lucide-react";
import { deleteAnthropicKey, saveAnthropicKey, testAiConnection } from "@/app/app/diagnostics/actions";
import { PageHeader } from "@/components/dashboard/page-header";
import { PendingButton } from "@/components/ui/pending-button";
import { getOrgAnthropicKeyMeta } from "@/lib/ai/org-key";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export default async function DiagnosticsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; model?: string; detail?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user) {
    redirect("/auth/sign-in?message=Sign in to manage the Claude API key.");
  }

  const organization = await ensureWorkspace(supabase, userData.user);
  const [{ data: membership }, keyMeta] = await Promise.all([
    supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", organization.id)
      .eq("user_id", userData.user.id)
      .maybeSingle(),
    getOrgAnthropicKeyMeta(supabase, organization.id),
  ]);

  const params = await searchParams;
  const canManage = membership?.role === "owner" || membership?.role === "admin";
  const model = params.model ?? process.env.TICKETOS_TRIAGE_MODEL ?? "claude-opus-4-8";

  return (
    <main className="min-h-screen px-4 py-6 text-[#151914] md:px-8">
      <div className="mx-auto max-w-3xl">
        <PageHeader
          crumbs={[{ label: "Other" }, { label: "Claude API" }]}
          title="Claude API key"
          description="TicketOS uses your own Anthropic key for all AI — triage, Copilot, and summaries. Connect it to turn AI on."
        />

        {params.status && <Banner status={params.status} detail={params.detail ?? ""} model={model} />}

        {/* Connect key */}
        <section className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-lg bg-[#e7f0ff] text-[#0b5f91]">
                <KeyRound size={18} />
              </span>
              <h2 className="text-lg font-semibold">Anthropic API key</h2>
            </div>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold",
                keyMeta.connected
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-amber-200 bg-amber-50 text-amber-800",
              )}
            >
              {keyMeta.connected ? <CheckCircle2 size={12} /> : <CircleAlert size={12} />}
              {keyMeta.connected ? `Connected · ••••${keyMeta.lastFour ?? ""}` : "Not connected"}
            </span>
          </div>

          {canManage ? (
            <>
              <form action={saveAnthropicKey} className="mt-4 grid gap-2">
                <label className="text-xs font-semibold uppercase tracking-[0.12em] text-black/40">
                  {keyMeta.connected ? "Enter a new key to replace the current one" : "Paste your key (starts with sk-ant-…)"}
                  <input
                    name="apiKey"
                    type="password"
                    required
                    autoComplete="off"
                    placeholder="sk-ant-..."
                    className="mt-2 h-11 w-full rounded-md border border-black/10 bg-white px-3 text-sm outline-none focus:border-[#0b2a4a]"
                  />
                </label>
                <PendingButton
                  pendingText="Saving..."
                  className="h-11 rounded-lg bg-[#0b2a4a] px-3 text-sm font-semibold text-white"
                >
                  <PlugZap size={16} />
                  {keyMeta.connected ? "Update key" : "Connect Claude"}
                </PendingButton>
              </form>

              {keyMeta.connected && (
                <form action={deleteAnthropicKey} className="mt-2">
                  <PendingButton
                    pendingText="Removing..."
                    className="h-9 rounded-lg border border-rose-200 bg-white px-3 text-sm font-semibold text-rose-700"
                  >
                    <Trash2 size={15} />
                    Disconnect &amp; delete key
                  </PendingButton>
                </form>
              )}

              <p className="mt-2 text-xs leading-5 text-black/45">
                Get a key at console.anthropic.com → API Keys. It is stored for this workspace only and used to bill
                your own Anthropic account. Saved once — every member and every login reuses it automatically.
              </p>
            </>
          ) : (
            <p className="mt-4 rounded-lg border border-dashed border-black/15 p-4 text-sm text-black/48">
              Ask an owner or admin to connect the workspace&apos;s Claude API key.
            </p>
          )}
        </section>

        {/* Test */}
        <section className="mt-4 rounded-xl border border-black/10 bg-white p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-[#e7f0ff] text-[#0b5f91]">
              <Cpu size={18} />
            </span>
            <h2 className="text-lg font-semibold">Test the connection</h2>
          </div>
          <p className="mb-4 text-sm leading-6 text-black/55">
            Sends one tiny message to Claude with the saved key and reports the exact result. Model: {model}.
          </p>
          <form action={testAiConnection}>
            <PendingButton
              pendingText="Testing..."
              className="h-11 rounded-lg border border-black/10 bg-white px-4 text-sm font-semibold text-[#0b2a4a]"
            >
              <Sparkles size={16} />
              Run connection test
            </PendingButton>
          </form>
        </section>
      </div>
    </main>
  );
}

function Banner({ status, detail, model }: { status: string; detail: string; model: string }) {
  const map: Record<string, { tone: "good" | "warn" | "bad"; title: string; body: string }> = {
    saved: { tone: "good", title: "Key saved", body: "Run the connection test below to confirm it works." },
    ok: { tone: "good", title: "Connected — AI is active", body: `${model} replied: “${detail}”. Triage and Copilot now use your key.` },
    nokey: { tone: "warn", title: "No key connected", body: "Add your Anthropic API key below to enable AI." },
    removed: { tone: "warn", title: "Key removed", body: "The Claude key was deleted. Paste a new sk-ant- key below to re-enable AI." },
    invalidkey: { tone: "warn", title: "That doesn't look like a Claude key", body: "Keys start with sk-ant-. Paste the full key and try again." },
    forbidden: { tone: "warn", title: "Owners/admins only", body: "Only an owner or admin can change the workspace key." },
    error: { tone: "bad", title: "Connection failed", body: `${detail} — 401 = wrong key, 403/404 = model access, 429 = no credit.` },
  };
  const cfg = map[status];
  if (!cfg) return null;

  const styles =
    cfg.tone === "good"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : cfg.tone === "bad"
        ? "border-rose-200 bg-rose-50 text-rose-900"
        : "border-amber-200 bg-amber-50 text-amber-900";

  return (
    <div className={cn("mb-4 rounded-xl border p-4", styles)}>
      <p className="flex items-center gap-2 font-semibold">
        {cfg.tone === "good" ? <CheckCircle2 size={17} /> : <CircleAlert size={17} />}
        {cfg.title}
      </p>
      <p className="mt-1 break-words text-sm opacity-80">{cfg.body}</p>
    </div>
  );
}
