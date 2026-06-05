import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BadgeCheck, Globe, KeyRound, ScrollText, ShieldCheck, SlidersHorizontal, Undo2, UsersRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const CHIP = [
  "from-[#e0f2fe] to-[#dbeafe] text-[#0b5f91]",
  "from-[#ede9fe] to-[#fae8ff] text-[#7c3aed]",
  "from-[#dcfce7] to-[#d1fae5] text-[#0f7a5f]",
  "from-[#ffedd5] to-[#fef3c7] text-[#b45309]",
  "from-[#cffafe] to-[#ccfbf1] text-[#0e7490]",
  "from-[#fce7f3] to-[#fae8ff] text-[#a21caf]",
];

const principles: Array<{ title: string; body: string; icon: LucideIcon }> = [
  { title: "Your data, your key", body: "AI runs on your own Anthropic key, stored only for this workspace. We never train on your data.", icon: KeyRound },
  { title: "Every action audited", body: "Triage, approvals, executions and rollbacks all write to a replayable audit log with actor, time and reasoning.", icon: ScrollText },
  { title: "One-click rollback", body: "Real changes in connected apps are reversible — undo an action in one click, no clean-up tickets.", icon: Undo2 },
  { title: "Role-based access", body: "Owner, admin, operator and viewer roles gate who can approve, execute and configure.", icon: UsersRound },
  { title: "Policy & approval gates", body: "Sensitive actions are blocked or held for manager approval before anything runs.", icon: SlidersHorizontal },
  { title: "Data residency", body: "TicketOS runs on your own Supabase project, in the region you choose.", icon: Globe },
];

const compliance = [
  ["SOC 2 Type II", "In progress"],
  ["GDPR-aligned data handling", "Supported"],
  ["No model training on your data", "Guaranteed"],
  ["Encryption in transit & at rest", "Supported"],
];

export default async function AppTrustPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user) {
    redirect("/auth/sign-in?message=Sign in to view trust & security.");
  }
  await ensureWorkspace(supabase, userData.user);

  return (
    <main className="min-h-screen px-4 py-6 text-[#151914] md:px-8">
      <div className="mx-auto max-w-6xl">
        <PageHeader
          crumbs={[{ label: "Governance" }, { label: "Trust" }]}
          title="Trust & security"
          description="How TicketOS keeps this workspace safe — auditable, reversible, and governed by default."
          actions={
            <Link
              href="/trust"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-black/10 bg-white px-3 text-sm font-semibold text-[#0b2a4a] transition hover:border-[#0b2a4a]"
            >
              Public trust page
              <ArrowRight size={15} />
            </Link>
          }
        />

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {principles.map((p, i) => (
            <div key={p.title} className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
              <span className={`flex size-10 items-center justify-center rounded-xl bg-gradient-to-br ${CHIP[i % CHIP.length]}`}>
                <p.icon size={19} />
              </span>
              <h2 className="mt-4 text-base font-semibold tracking-tight">{p.title}</h2>
              <p className="mt-1.5 text-sm leading-6 text-slate-600">{p.body}</p>
            </div>
          ))}
        </section>

        <section className="mt-5 rounded-xl border border-black/10 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-[#e7f0ff] text-[#0b5f91]">
              <ShieldCheck size={15} />
            </span>
            <h2 className="text-sm font-semibold">Compliance &amp; posture</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {compliance.map(([label, status]) => (
              <div key={label} className="rounded-lg border border-black/10 p-3">
                <p className="text-sm font-semibold text-[#07111f]">{label}</p>
                <p
                  className={
                    status === "In progress"
                      ? "mt-2 inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800"
                      : "mt-2 inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700"
                  }
                >
                  <BadgeCheck size={12} />
                  {status}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
