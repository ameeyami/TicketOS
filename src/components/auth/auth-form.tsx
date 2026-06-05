"use client";

import { FormEvent, type ReactNode, useState, useTransition } from "react";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Bot, CheckCircle2, Coins, Eye, EyeOff, FileText, Loader2, ScrollText, Undo2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { signInWithProvider } from "@/app/auth/actions";
import { TicketOSLogo } from "@/components/brand/ticketos-logo";
import { PendingButton } from "@/components/ui/pending-button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthMode = "sign-in" | "sign-up";

const pillars: Array<[string, LucideIcon]> = [
  ["Audit", ScrollText],
  ["Undo", Undo2],
  ["Afford", Coins],
];

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [oktaDomain, setOktaDomain] = useState("");
  const [message, setMessage] = useState(searchParams.get("message") ?? "");
  const [error, setError] = useState(searchParams.get("error") ?? "");

  const isSignUp = mode === "sign-up";
  const authRedirectUrl = () => `${window.location.origin}/auth/callback?next=/app`;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();

      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName }, emailRedirectTo: authRedirectUrl() },
        });
        if (signUpError) {
          setError(signUpError.message);
          return;
        }
        setMessage("Account created. Check your email if Supabase asks you to confirm before signing in.");
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(signInError.message);
        return;
      }
      router.push("/app");
      router.refresh();
    });
  }

  function handleOktaSSO() {
    const domain = oktaDomain.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
    setError("");
    setMessage("");
    if (!domain) {
      setError("Enter your Okta company domain first, for example company.okta.com.");
      return;
    }
    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const { error: ssoError } = await supabase.auth.signInWithSSO({ domain, options: { redirectTo: authRedirectUrl() } });
      if (ssoError) {
        setError("Okta SSO could not start. Check that Okta SSO is enabled in Supabase Auth settings for this domain.");
      }
    });
  }

  const inputClass =
    "h-12 w-full rounded-xl border border-black/10 bg-white px-4 text-sm outline-none transition placeholder:text-black/35 focus:border-[#0b5f91] focus:ring-4 focus:ring-[#0b5f91]/10";

  return (
    <main className="relative min-h-screen bg-white text-[#07111f] lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* Left — brand-blue panel */}
      <aside className="relative hidden overflow-hidden bg-[#07111f] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
        {/* hero-matched gradient mesh (green / blue / violet) */}
        <div className="pointer-events-none absolute inset-0" aria-hidden style={{ background: "radial-gradient(70% 55% at 25% 0%, rgba(34,197,94,0.16), transparent 70%)" }} />
        <div className="pointer-events-none absolute inset-0" aria-hidden style={{ background: "radial-gradient(55% 50% at 90% 12%, rgba(56,189,248,0.18), transparent 70%)" }} />
        <div className="pointer-events-none absolute inset-0" aria-hidden style={{ background: "radial-gradient(50% 45% at 5% 95%, rgba(168,85,247,0.16), transparent 70%)" }} />
        {/* drifting ambient glows */}
        <div
          className="tos-anim-float-slow pointer-events-none absolute -left-20 top-1/3 size-72 rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(56,189,248,0.35), transparent 70%)" }}
          aria-hidden
        />
        <div
          className="tos-anim-drift pointer-events-none absolute -right-10 top-10 size-72 rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(168,85,247,0.28), transparent 70%)" }}
          aria-hidden
        />
        {/* sweeping sheen */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 overflow-hidden" aria-hidden>
          <div className="tos-anim-sheen h-full w-full bg-gradient-to-r from-white/0 via-white/12 to-white/0" />
        </div>
        {/* big circuit-T watermark — slow rotate + draw-in */}
        <svg viewBox="0 0 48 48" className="tos-anim-spin pointer-events-none absolute -bottom-16 -right-16 size-[460px] text-white opacity-[0.09]" fill="none" aria-hidden>
          <g stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            {["M15 13 H41", "M31 13 V34 L25 40", "M10 13 H15", "M8 22 H31", "M13 31 H25"].map((d, i) => (
              <motion.path
                key={d}
                d={d}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.4, delay: 0.2 + i * 0.15, ease: "easeInOut" }}
              />
            ))}
          </g>
          <g fill="currentColor">
            {[[7, 13], [5, 22], [10, 31]].map(([cx, cy], i) => (
              <motion.circle
                key={i}
                cx={cx}
                cy={cy}
                r="2.7"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.9 + i * 0.15, type: "spring", stiffness: 200 }}
                style={{ transformOrigin: `${cx}px ${cy}px` }}
              />
            ))}
          </g>
        </svg>

        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="relative w-fit">
          <Link href="/">
            <TicketOSLogo markSize="md" tone="dark" />
          </Link>
        </motion.div>

        <div className="relative w-full max-w-md">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-4xl font-semibold leading-[1.1] tracking-tight xl:text-5xl"
          >
            The control room for AI-run IT.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="mt-3 max-w-sm text-base leading-7 text-white/70"
          >
            Triage, approve, and execute on real systems — audit, undo, and afford every action.
          </motion.p>

          {/* animated dashboard preview */}
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="relative mt-8"
          >
            <motion.div
              className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] blur-2xl"
              style={{ background: "radial-gradient(circle, rgba(34,197,94,0.30), rgba(56,189,248,0.18) 55%, transparent 75%)" }}
              animate={{ opacity: [0.45, 0.85, 0.45], scale: [0.96, 1.02, 0.96] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              aria-hidden
            />
            <div className="rounded-2xl border border-white/12 bg-white/[0.06] p-4 shadow-2xl backdrop-blur">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-2 text-sm font-semibold text-white">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#22c55e] to-[#0b5f91] text-white">
                    <Bot size={15} />
                  </span>
                  AI activity
                </p>
                <span className="flex items-center gap-1 text-[10px] font-semibold text-[#7ef0a8]">
                  <span className="size-1.5 animate-pulse rounded-full bg-[#22c55e]" /> live
                </span>
              </div>

              <div className="mt-4 flex items-center gap-4">
                {/* animated progress ring */}
                <div className="relative size-16 shrink-0">
                  <svg viewBox="0 0 40 40" className="size-16 -rotate-90">
                    <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="4" />
                    <motion.circle
                      cx="20" cy="20" r="16" fill="none" stroke="#22c55e" strokeWidth="4" strokeLinecap="round"
                      pathLength={1}
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: [0, 0.58, 0.58, 0] }}
                      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                    />
                  </svg>
                  <span className="absolute inset-0 grid place-items-center text-sm font-bold text-white">58%</span>
                </div>
                {/* animated bar chart */}
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">Auto-resolved / wk</p>
                  <div className="mt-2 flex h-12 items-end gap-1.5">
                    {[[16, 28], [26, 16], [30, 22], [18, 32], [36, 24], [24, 36]].map(([a, c], i) => (
                      <motion.span
                        key={i}
                        className="flex-1 rounded-sm bg-gradient-to-t from-[#22c55e]/60 to-[#5eead4]"
                        animate={{ height: [a, c, a] }}
                        transition={{ duration: 2.2 + i * 0.1, repeat: Infinity, ease: "easeInOut", delay: i * 0.12 }}
                        style={{ height: a }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* feed */}
              <div className="mt-4 space-y-2">
                {[
                  { Icon: CheckCircle2, tone: "text-[#7ef0a8]", title: "Triaged TOS-1923", sub: "Network · high" },
                  { Icon: FileText, tone: "text-[#7dd3fc]", title: "Drafted resolution", sub: "Password reset" },
                  { Icon: Undo2, tone: "text-[#c4b5fd]", title: "Action reversed", sub: "Slack message" },
                ].map((row, i) => (
                  <motion.div
                    key={row.title}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.18 }}
                    className="flex items-center gap-2.5 rounded-lg border border-white/8 bg-white/[0.04] px-2.5 py-2"
                  >
                    <row.Icon size={15} className={`shrink-0 ${row.tone}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-white">{row.title}</p>
                      <p className="truncate text-[10px] text-white/45">{row.sub}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* value pills */}
          <div className="mt-6 flex flex-wrap gap-2">
            {pillars.map(([label, Icon], i) => (
              <motion.span
                key={label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 + i * 0.08 }}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold backdrop-blur"
              >
                <Icon size={13} className="text-[#7ef0a8]" />
                {label}
              </motion.span>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-white/45">© {new Date().getFullYear()} TicketOS</p>
      </aside>

      {/* Right — clean white form */}
      <section className="flex min-h-screen flex-col px-5 py-8 md:px-10">
        <div className="flex flex-1 items-center justify-center py-10">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-[400px]"
          >
            <div className="mb-8 flex justify-center lg:justify-start">
              <Link href="/">
                <TicketOSLogo markSize="lg" />
              </Link>
            </div>

            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              {isSignUp ? "Create your workspace" : "Welcome back"}
            </h1>
            <p className="mt-2 text-sm leading-6 text-black/52">
              {isSignUp ? "Set up TicketOS in a couple of minutes." : "Sign in to your TicketOS workspace."}
            </p>

            <div className="mt-7 space-y-3">
              <ProviderLoginForm provider="google" label="Continue with Google" icon={<GoogleMark />} />
              <ProviderLoginForm provider="github" label="Continue with GitHub" icon={<GitHubMark />} />
              <ProviderLoginForm provider="azure" label="Continue with Microsoft / Teams" icon={<MicrosoftMark />} />
              <div className="rounded-xl border border-black/10 bg-[#f8fbfe] p-3">
                <label className="block text-xs font-semibold text-black/56">Okta company domain</label>
                <div className="mt-2 flex gap-2">
                  <input
                    value={oktaDomain}
                    onChange={(e) => setOktaDomain(e.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-[#0b5f91]"
                    placeholder="company.okta.com"
                  />
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={handleOktaSSO}
                    className="h-10 rounded-lg bg-[#0b2a4a] px-3 text-sm font-semibold text-white transition hover:bg-[#07111f] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Okta SSO
                  </button>
                </div>
              </div>
            </div>

            <div className="my-7 flex items-center gap-3">
              <span className="h-px flex-1 bg-black/10" />
              <span className="text-xs font-medium uppercase tracking-[0.12em] text-black/38">or</span>
              <span className="h-px flex-1 bg-black/10" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <label className="block">
                  <span className="text-sm font-semibold">Full name</span>
                  <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className={`mt-2 ${inputClass}`} placeholder="Amee Yami" />
                </label>
              )}
              <label className="block">
                <span className="text-sm font-semibold">Work email</span>
                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`mt-2 ${inputClass}`} placeholder="name@company.com" />
              </label>
              <label className="block">
                <span className="text-sm font-semibold">Password</span>
                <div className="mt-2 flex h-12 overflow-hidden rounded-xl border border-black/10 bg-white transition focus-within:border-[#0b5f91] focus-within:ring-4 focus-within:ring-[#0b5f91]/10">
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="min-w-0 flex-1 bg-transparent px-4 text-sm outline-none"
                    placeholder="Enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((c) => !c)}
                    className="flex h-full items-center gap-2 px-4 text-sm font-semibold text-black/56 hover:text-black"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </label>

              {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</div>}
              {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</div>}

              <button
                type="submit"
                disabled={isPending}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0b5f91] to-[#1d4ed8] px-4 text-sm font-semibold text-white shadow-lg shadow-[#1d4ed8]/25 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isPending && <Loader2 size={17} className="animate-spin" />}
                {isSignUp ? "Create account" : "Log in"}
                {!isPending && <ArrowRight size={17} />}
              </button>
            </form>

            <p className="mt-6 text-sm text-black/56">
              {isSignUp ? "Already have an account?" : "New to TicketOS?"}{" "}
              <Link href={isSignUp ? "/auth/sign-in" : "/auth/sign-up"} className="font-semibold text-[#0b5f91] hover:text-[#07111f]">
                {isSignUp ? "Log in" : "Create account"}
              </Link>
            </p>
          </motion.div>
        </div>
      </section>
    </main>
  );
}

function ProviderLoginForm({ provider, label, icon }: { provider: "google" | "github" | "azure"; label: string; icon: ReactNode }) {
  return (
    <form action={signInWithProvider}>
      <input type="hidden" name="provider" value={provider} />
      <PendingButton
        pendingText="Checking..."
        className="h-12 w-full rounded-xl border border-black/10 bg-white px-4 text-sm font-semibold shadow-sm transition hover:bg-[#f4f8fb] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {icon}
        {label}
      </PendingButton>
    </form>
  );
}

function GoogleMark() {
  return (
    <span className="grid size-5 place-items-center rounded-full bg-white">
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
        <path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9c-.3 1.3-1 2.4-2.1 3.1v2.6h3.4c2-1.8 3.4-4.5 3.4-7.7z" />
        <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.4-2.6c-.9.6-2.2 1-3.9 1-3 0-5.5-2-6.4-4.7H2.1v2.7C3.9 20.4 7.6 23 12 23z" />
        <path fill="#FBBC05" d="M5.6 14c-.2-.6-.4-1.3-.4-2s.1-1.4.4-2V7.3H2.1C1.4 8.7 1 10.3 1 12s.4 3.3 1.1 4.7L5.6 14z" />
        <path fill="#EA4335" d="M12 5.3c1.6 0 3.1.6 4.2 1.7l3.1-3.1C17.5 2.1 15 1 12 1 7.6 1 3.9 3.6 2.1 7.3L5.6 10C6.5 7.3 9 5.3 12 5.3z" />
      </svg>
    </span>
  );
}

function GitHubMark() {
  return (
    <span className="grid size-5 place-items-center rounded-full bg-white">
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-[#181717]">
        <path d="M12 1.4c-5.9 0-10.6 4.8-10.6 10.7 0 4.7 3 8.7 7.3 10.1.5.1.7-.2.7-.5v-2c-3 .7-3.6-1.3-3.6-1.3-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 0 1.6 1.1 1.6 1.1.9 1.6 2.4 1.1 3 .9.1-.7.4-1.1.7-1.4-2.4-.3-4.9-1.2-4.9-5.3 0-1.2.4-2.1 1.1-2.9-.1-.3-.5-1.4.1-2.8 0 0 .9-.3 2.9 1.1.8-.2 1.8-.4 2.7-.4s1.9.1 2.7.4c2-1.4 2.9-1.1 2.9-1.1.6 1.4.2 2.5.1 2.8.7.8 1.1 1.7 1.1 2.9 0 4.1-2.5 5-4.9 5.3.4.3.7 1 .7 2v2.9c0 .3.2.6.7.5 4.3-1.4 7.3-5.4 7.3-10.1C22.6 6.2 17.9 1.4 12 1.4z" />
      </svg>
    </span>
  );
}

function MicrosoftMark() {
  return (
    <span className="grid size-5 grid-cols-2 gap-0.5">
      <span className="rounded-[2px] bg-[#f25022]" />
      <span className="rounded-[2px] bg-[#7fba00]" />
      <span className="rounded-[2px] bg-[#00a4ef]" />
      <span className="rounded-[2px] bg-[#ffb900]" />
    </span>
  );
}
