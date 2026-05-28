"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { TicketOSLogo } from "@/components/brand/ticketos-logo";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthMode = "sign-in" | "sign-up";
type OAuthProvider = "google" | "github" | "azure";

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
          options: {
            data: { full_name: fullName },
            emailRedirectTo: authRedirectUrl(),
          },
        });

        if (signUpError) {
          setError(signUpError.message);
          return;
        }

        setMessage("Account created. Check your email if Supabase asks you to confirm before signing in.");
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      router.push("/app");
      router.refresh();
    });
  }

  function handleOAuth(provider: OAuthProvider, label: string) {
    setError("");
    setMessage("");

    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: authRedirectUrl(),
        },
      });

      if (oauthError) {
        setError(`${label} sign in could not start. Check that ${label} is enabled in Supabase Auth settings.`);
      }
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
      const { error: ssoError } = await supabase.auth.signInWithSSO({
        domain,
        options: {
          redirectTo: authRedirectUrl(),
        },
      });

      if (ssoError) {
        setError("Okta SSO could not start. Check that Okta SSO is enabled in Supabase Auth settings for this domain.");
      }
    });
  }

  return (
    <main className="min-h-screen bg-[#f4f8fb] text-[#07111f]">
      <section className="flex min-h-screen flex-col px-5 py-5 md:px-8">
        <Link href="/" className="flex w-fit items-center gap-3">
          <TicketOSLogo markSize="lg" />
        </Link>

        <div className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-[420px]">
            <div className="mb-8 text-center">
              <h1 className="text-4xl font-semibold tracking-tight">
                {isSignUp ? "Create account" : "Log in"}
              </h1>
              <p className="mt-3 text-sm leading-6 text-black/52">
                {isSignUp ? "Create your TicketOS workspace." : "Continue to your TicketOS workspace."}
              </p>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleOAuth("google", "Google")}
                className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-black/10 bg-white px-4 text-sm font-semibold shadow-sm transition hover:bg-[#f4f8fb] disabled:cursor-not-allowed disabled:opacity-70"
              >
                <GoogleMark />
                Continue with Google
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleOAuth("github", "GitHub")}
                className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-black/10 bg-white px-4 text-sm font-semibold shadow-sm transition hover:bg-[#f4f8fb] disabled:cursor-not-allowed disabled:opacity-70"
              >
                <GitHubMark />
                Continue with GitHub
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleOAuth("azure", "Microsoft")}
                className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-black/10 bg-white px-4 text-sm font-semibold shadow-sm transition hover:bg-[#f4f8fb] disabled:cursor-not-allowed disabled:opacity-70"
              >
                <MicrosoftMark />
                Continue with Microsoft / Teams
              </button>
              <div className="rounded-xl border border-black/10 bg-white p-3 shadow-sm">
                <label className="block text-xs font-semibold text-black/56">Okta company domain</label>
                <div className="mt-2 flex gap-2">
                  <input
                    value={oktaDomain}
                    onChange={(event) => setOktaDomain(event.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-black/10 px-3 text-sm outline-none transition focus:border-black/25 focus:ring-4 focus:ring-black/5"
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
                  <input
                    required
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className="mt-2 h-12 w-full rounded-xl border border-black/10 bg-white px-4 text-sm outline-none transition focus:border-black/25 focus:ring-4 focus:ring-black/5"
                    placeholder="Amee Yami"
                  />
                </label>
              )}
              <label className="block">
                <span className="text-sm font-semibold">Login ID</span>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-2 h-12 w-full rounded-xl border border-black/10 bg-white px-4 text-sm outline-none transition focus:border-black/25 focus:ring-4 focus:ring-black/5"
                  placeholder="name@company.com"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold">Password</span>
                <div className="mt-2 flex h-12 overflow-hidden rounded-xl border border-black/10 bg-white transition focus-within:border-black/25 focus-within:ring-4 focus-within:ring-black/5">
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    minLength={6}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="min-w-0 flex-1 bg-transparent px-4 text-sm outline-none"
                    placeholder="Enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="flex h-full items-center gap-2 px-4 text-sm font-semibold text-black/56 hover:text-black"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </label>

              {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                  {error}
                </div>
              )}
              {message && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={isPending}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-black px-4 text-sm font-semibold text-white shadow-lg shadow-black/10 transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isPending && <Loader2 size={17} className="animate-spin" />}
                {isSignUp ? "Create account" : "Log in"}
                {!isPending && <ArrowRight size={17} />}
              </button>
            </form>

            <p className="mt-6 text-sm text-black/56">
              {isSignUp ? "Already have an account?" : "New to TicketOS?"}{" "}
              <Link
                href={isSignUp ? "/auth/sign-in" : "/auth/sign-up"}
                className="font-semibold text-black"
              >
                {isSignUp ? "Log in" : "Create account"}
              </Link>
            </p>
          </div>
        </div>

        <p className="text-xs text-black/38">TicketOS</p>
      </section>
    </main>
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
