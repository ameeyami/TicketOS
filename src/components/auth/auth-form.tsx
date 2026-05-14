"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Bot, Loader2, ShieldCheck, Workflow } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthMode = "sign-in" | "sign-up";

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [message, setMessage] = useState(searchParams.get("message") ?? "");
  const [error, setError] = useState(searchParams.get("error") ?? "");

  const isSignUp = mode === "sign-up";

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
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/app`,
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

  return (
    <main className="min-h-screen bg-[#f6f7f2] text-[#151914]">
      <div className="grid min-h-screen lg:grid-cols-[.95fr_1.05fr]">
        <section className="flex min-h-screen flex-col justify-between px-6 py-6 md:px-10">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-[#17211c] text-white">
              <Workflow size={18} />
            </span>
            <span className="text-lg font-semibold tracking-tight">TicketOS</span>
          </Link>

          <div className="mx-auto w-full max-w-md py-16">
            <div className="mb-7 inline-flex items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-medium text-black/62 shadow-sm">
              <ShieldCheck size={16} />
              Governed AI operations
            </div>
            <h1 className="text-4xl font-semibold tracking-tight">
              {isSignUp ? "Create your workspace." : "Welcome back."}
            </h1>
            <p className="mt-3 text-sm leading-6 text-black/58">
              {isSignUp
                ? "Start building the execution layer for IT operations."
                : "Sign in to inspect agents, approvals, workflows, and execution traces."}
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              {isSignUp && (
                <label className="block">
                  <span className="text-sm font-semibold">Full name</span>
                  <input
                    required
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className="mt-2 h-12 w-full rounded-lg border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-[#2f6f60] focus:ring-4 focus:ring-[#2f6f60]/10"
                    placeholder="Amee Yami"
                  />
                </label>
              )}
              <label className="block">
                <span className="text-sm font-semibold">Email</span>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-2 h-12 w-full rounded-lg border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-[#2f6f60] focus:ring-4 focus:ring-[#2f6f60]/10"
                  placeholder="you@company.com"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold">Password</span>
                <input
                  required
                  type="password"
                  minLength={6}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-2 h-12 w-full rounded-lg border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-[#2f6f60] focus:ring-4 focus:ring-[#2f6f60]/10"
                  placeholder="At least 6 characters"
                />
              </label>

              {error && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                  {error}
                </div>
              )}
              {message && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={isPending}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#17211c] px-4 text-sm font-semibold text-white shadow-lg shadow-black/10 transition hover:bg-[#26352d] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isPending && <Loader2 size={17} className="animate-spin" />}
                {isSignUp ? "Create account" : "Sign in"}
                {!isPending && <ArrowRight size={17} />}
              </button>
            </form>

            <p className="mt-6 text-sm text-black/56">
              {isSignUp ? "Already have an account?" : "New to TicketOS?"}{" "}
              <Link
                href={isSignUp ? "/auth/sign-in" : "/auth/sign-up"}
                className="font-semibold text-[#1d5548]"
              >
                {isSignUp ? "Sign in" : "Create account"}
              </Link>
            </p>
          </div>

          <p className="text-xs text-black/42">TicketOS Phase 1 prototype</p>
        </section>

        <section className="hidden min-h-screen border-l border-black/10 bg-[#111713] p-6 text-white lg:flex">
          <div className="flex w-full flex-col justify-between rounded-2xl border border-white/10 bg-white/[.04] p-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-lg bg-white/8 px-3 py-2 text-sm font-semibold text-[#d7ff78]">
                <Bot size={16} />
                AI agent workspace
              </div>
              <h2 className="mt-8 max-w-xl text-5xl font-semibold leading-tight tracking-tight">
                Every ticket becomes a governed execution trace.
              </h2>
            </div>
            <div className="grid gap-3">
              {["Permission checked", "Workflow executed", "Audit log written"].map((item) => (
                <div key={item} className="rounded-xl border border-white/10 bg-white/[.06] p-4">
                  <p className="font-semibold">{item}</p>
                  <p className="mt-2 text-sm text-white/52">Transparent, replayable, and ready for operators.</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
