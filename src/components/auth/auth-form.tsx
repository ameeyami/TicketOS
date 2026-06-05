"use client";

import { FormEvent, type ReactNode, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, Loader2, Search, Sparkles } from "lucide-react";
import { signInWithProvider } from "@/app/auth/actions";
import { TicketOSLogo } from "@/components/brand/ticketos-logo";
import { PendingButton } from "@/components/ui/pending-button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthMode = "sign-in" | "sign-up";

const dots = (color: string): React.CSSProperties => ({
  backgroundImage: `radial-gradient(${color} 1.1px, transparent 1.6px)`,
  backgroundSize: "11px 11px",
});

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
    "h-12 w-full rounded-xl border border-white/12 bg-white/[0.04] px-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-white/30 focus:ring-4 focus:ring-white/[0.06]";

  return (
    <main className="relative min-h-screen bg-[#0d0d12] text-white lg:grid lg:grid-cols-[1.05fr_1fr]">
      <span
        className="absolute inset-x-0 top-0 z-20 h-0.5 bg-gradient-to-r from-[#22c55e] via-[#38bdf8] to-[#a855f7]"
        aria-hidden
      />

      {/* Left — illustrative indigo panel */}
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-[#272451] to-[#191832] p-10 lg:flex lg:flex-col lg:justify-center xl:p-16">
        <div
          className="pointer-events-none absolute -left-12 -top-12 size-72 opacity-70"
          style={{ ...dots("rgba(199,232,107,0.55)"), maskImage: "linear-gradient(135deg, #000, transparent 65%)", WebkitMaskImage: "linear-gradient(135deg, #000, transparent 65%)" }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-12 -right-12 size-80 opacity-60"
          style={{ ...dots("rgba(165,180,252,0.5)"), maskImage: "linear-gradient(315deg, #000, transparent 65%)", WebkitMaskImage: "linear-gradient(315deg, #000, transparent 65%)" }}
          aria-hidden
        />

        <div className="relative max-w-md">
          <h2 className="font-serif text-4xl leading-[1.12] tracking-tight text-white xl:text-5xl">Resolve more, worry less.</h2>
          <p className="mt-4 max-w-sm text-base leading-7 text-white/55">
            TicketOS triages, routes, and resolves IT requests for you — and every action stays reversible and audited.
          </p>

          {/* search + stacked result cards */}
          <div className="relative mt-12 h-60">
            <div className="flex w-full max-w-sm items-center gap-2.5 rounded-xl border border-white/12 bg-white/[0.07] px-3.5 py-3 backdrop-blur">
              <Search size={16} className="text-white/50" />
              <span className="h-2 w-44 rounded-full bg-white/25" />
            </div>
            <div className="absolute left-2 top-16 h-16 w-72 -rotate-[3deg] rounded-2xl bg-[#f7c59f] shadow-2xl" />
            <div className="absolute left-6 top-28 h-16 w-72 rotate-[1.5deg] rounded-2xl bg-[#c7e86b] shadow-2xl" />
            <div className="absolute left-10 top-40 h-16 w-72 rotate-[4deg] rounded-2xl bg-[#a5b4fc] shadow-2xl">
              <Sparkles size={16} className="absolute right-3 top-3 text-white/80" />
            </div>
          </div>
        </div>
      </aside>

      {/* Right — near-black form */}
      <section className="flex min-h-screen flex-col bg-[#101014] px-5 py-8 md:px-10">
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[400px]">
            <div className="mb-8 flex justify-center">
              <Link href="/">
                <TicketOSLogo markSize="lg" tone="dark" />
              </Link>
            </div>

            <h1 className="text-center text-2xl font-semibold tracking-tight md:text-3xl">
              {isSignUp ? "Create your workspace" : "Welcome back"}
            </h1>
            <p className="mt-2 text-center text-sm leading-6 text-white/50">
              {isSignUp ? "Set up TicketOS in a couple of minutes." : "Sign in to your TicketOS workspace."}
            </p>

            <div className="mt-8 space-y-3">
              <ProviderLoginForm provider="google" label="Continue with Google" icon={<GoogleMark />} />
              <ProviderLoginForm provider="github" label="Continue with GitHub" icon={<GitHubMark />} />
              <ProviderLoginForm provider="azure" label="Continue with Microsoft / Teams" icon={<MicrosoftMark />} />
              <div className="rounded-xl border border-white/12 bg-white/[0.04] p-3">
                <label className="block text-xs font-semibold text-white/60">Okta company domain</label>
                <div className="mt-2 flex gap-2">
                  <input
                    value={oktaDomain}
                    onChange={(e) => setOktaDomain(e.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-white/12 bg-white/[0.04] px-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-white/30"
                    placeholder="company.okta.com"
                  />
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={handleOktaSSO}
                    className="h-10 rounded-lg bg-white/[0.08] px-3 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Okta SSO
                  </button>
                </div>
              </div>
            </div>

            <div className="my-7 flex items-center gap-3">
              <span className="h-px flex-1 bg-white/10" />
              <span className="text-xs font-medium uppercase tracking-[0.12em] text-white/35">or</span>
              <span className="h-px flex-1 bg-white/10" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <label className="block">
                  <span className="text-sm font-semibold text-white/85">Full name</span>
                  <input
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={`mt-2 ${inputClass}`}
                    placeholder="Amee Yami"
                  />
                </label>
              )}
              <label className="block">
                <span className="text-sm font-semibold text-white/85">Work email</span>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`mt-2 ${inputClass}`}
                  placeholder="name@company.com"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-white/85">Password</span>
                <div className="mt-2 flex h-12 overflow-hidden rounded-xl border border-white/12 bg-white/[0.04] transition focus-within:border-white/30 focus-within:ring-4 focus-within:ring-white/[0.06]">
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="min-w-0 flex-1 bg-transparent px-4 text-sm text-white outline-none placeholder:text-white/35"
                    placeholder="Enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((c) => !c)}
                    className="flex h-full items-center gap-2 px-4 text-sm font-semibold text-white/55 hover:text-white"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </label>

              {error && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</div>
              )}
              {message && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={isPending}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#a5b4fc] px-4 text-sm font-semibold text-[#0b1020] shadow-lg shadow-[#a5b4fc]/20 transition hover:bg-[#b8c2ff] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isPending && <Loader2 size={17} className="animate-spin" />}
                {isSignUp ? "Create account" : "Log in"}
                {!isPending && <ArrowRight size={17} />}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-white/50">
              {isSignUp ? "Already have an account?" : "New to TicketOS?"}{" "}
              <Link href={isSignUp ? "/auth/sign-in" : "/auth/sign-up"} className="font-semibold text-[#a5b4fc] hover:text-white">
                {isSignUp ? "Log in" : "Create account"}
              </Link>
            </p>
          </div>
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
        className="h-12 w-full rounded-xl border border-white/12 bg-white/[0.05] px-4 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
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
