import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, CircleAlert, Cpu, KeyRound, PlugZap, Sparkles } from "lucide-react";
import { testAiConnection } from "@/app/app/diagnostics/actions";
import { PendingButton } from "@/components/ui/pending-button";
import { hasAnthropicKey } from "@/lib/ai/client";
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
    redirect("/auth/sign-in?message=Sign in to view AI status.");
  }

  const params = await searchParams;
  const keyDetected = hasAnthropicKey();
  const model = params.model ?? process.env.TICKETOS_TRIAGE_MODEL ?? "claude-opus-4-8";
  const status = params.status;

  return (
    <main className="min-h-screen bg-[#f6f7f2] px-4 py-6 text-[#151914] md:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/app"
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-black/10 bg-white px-3 text-sm font-semibold"
        >
          <ArrowLeft size={16} />
          Command center
        </Link>

        <div className="mt-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#47685d]">Diagnostics</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">AI status</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-black/56">
            Check whether real Claude triage and Copilot are active. If the API key isn&apos;t detected or the test
            fails, TicketOS falls back to the built-in heuristic (the app keeps working, just without real AI).
          </p>
        </div>

        <section className="mt-6 grid gap-3 sm:grid-cols-2">
          <StatusCard
            icon={KeyRound}
            label="Anthropic API key"
            value={keyDetected ? "Detected" : "Not set"}
            good={keyDetected}
            detail={keyDetected ? "Found in this deployment's environment." : "Add ANTHROPIC_API_KEY in Vercel, then redeploy."}
          />
          <StatusCard icon={Cpu} label="Triage model" value={model} good detail="Override with TICKETOS_TRIAGE_MODEL." />
        </section>

        <section className="mt-4 rounded-xl border border-black/10 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-[#eef5ea] text-[#2e6658]">
              <PlugZap size={18} />
            </span>
            <h2 className="text-lg font-semibold">Live connection test</h2>
          </div>
          <p className="-mt-1 mb-4 text-sm leading-6 text-black/55">
            Sends one tiny message to Claude and reports the exact result — the fastest way to confirm the key works
            and your account can use the model.
          </p>

          {status && <TestResult status={status} detail={params.detail ?? ""} model={model} />}

          <form action={testAiConnection} className="mt-4">
            <PendingButton
              pendingText="Testing..."
              className="h-11 rounded-lg bg-[#0b2a4a] px-4 text-sm font-semibold text-white"
            >
              <Sparkles size={16} />
              Run connection test
            </PendingButton>
          </form>
        </section>

        <p className="mt-4 text-xs leading-6 text-black/45">
          Note: environment variables only take effect on a <strong>new</strong> deployment. After adding or changing
          the key in Vercel, trigger a redeploy, then create a fresh ticket to see the AI summary.
        </p>
      </div>
    </main>
  );
}

function TestResult({ status, detail, model }: { status: string; detail: string; model: string }) {
  if (status === "ok") {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
        <p className="flex items-center gap-2 font-semibold text-emerald-800">
          <CheckCircle2 size={17} />
          Connected — real AI is active
        </p>
        <p className="mt-1 text-sm text-emerald-900/72">
          {model} replied: “{detail}”. New tickets and Copilot now use Claude.
        </p>
      </div>
    );
  }
  if (status === "nokey") {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="flex items-center gap-2 font-semibold text-amber-800">
          <CircleAlert size={17} />
          No API key in this deployment
        </p>
        <p className="mt-1 text-sm text-amber-900/72">
          Add <code>ANTHROPIC_API_KEY</code> in Vercel → Settings → Environment Variables (Production), then redeploy.
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
      <p className="flex items-center gap-2 font-semibold text-rose-800">
        <CircleAlert size={17} />
        Connection failed
      </p>
      <p className="mt-1 break-words text-sm text-rose-900/75">{detail}</p>
      <p className="mt-2 text-xs text-rose-900/60">
        401 = invalid key · 403/404 = your account can&apos;t use this model (try TICKETOS_TRIAGE_MODEL=claude-haiku-4-5)
        · 429 = rate limited / no credit.
      </p>
    </div>
  );
}

function StatusCard({
  icon: Icon,
  label,
  value,
  good,
  detail,
}: {
  icon: typeof KeyRound;
  label: string;
  value: string;
  good: boolean;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-[#eef5ea] text-[#2e6658]">
            <Icon size={18} />
          </span>
          <p className="text-sm font-medium text-black/52">{label}</p>
        </div>
        <span
          className={cn(
            "rounded-md border px-2 py-1 text-xs font-semibold",
            good ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-800",
          )}
        >
          {value}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-black/55">{detail}</p>
    </div>
  );
}
