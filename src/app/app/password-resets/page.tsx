import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, KeyRound, Mail, Sparkles } from "lucide-react";
import { createPasswordResetRun } from "@/app/app/password-resets/actions";
import { PageHeader } from "@/components/dashboard/page-header";
import { PendingButton } from "@/components/ui/pending-button";
import { isEmailConfigured } from "@/lib/email/send";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const systems = ["Okta", "Google Workspace", "Slack", "Microsoft Teams", "GitHub", "Okta admin", "Google admin", "GitHub admin", "Finance app"];
const fieldClass = "h-10 w-full rounded-md border border-[#d8e4ee] bg-white px-3 text-sm outline-none focus:border-[#0b5f91]";

export default async function PasswordResetsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect("/auth/sign-in?message=Sign in to manage password resets.");
  }

  const organization = await ensureWorkspace(supabase, userData.user);
  const [{ data: tickets }, { data: approvals }] = await Promise.all([
    supabase
      .from("tickets")
      .select("status")
      .eq("organization_id", organization.id)
      .eq("source", "password_reset_workspace"),
    supabase
      .from("approval_requests")
      .select("status")
      .eq("organization_id", organization.id)
      .ilike("title", "Password reset approval:%"),
  ]);

  const rows = tickets ?? [];
  const total = rows.length;
  const open = rows.filter((ticket) => !["resolved", "failed"].includes(ticket.status)).length;
  const pendingApprovals = (approvals ?? []).filter((approval) => approval.status === "pending").length;
  const emailReady = isEmailConfigured();

  return (
    <main className="min-h-screen px-4 py-6 text-[#07111f] md:px-8">
      <div className="mx-auto max-w-3xl">
        <PageHeader
          crumbs={[{ label: "Operations" }, { label: "Passwords" }]}
          title="Password resets"
          description="Run a verified reset — TicketOS files the ticket, checks risk, and notifies the user."
          actions={
            <Link
              href="/app/tickets"
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-black/10 bg-white px-3 text-sm font-semibold transition hover:bg-black/[0.04]"
            >
              Ticket queue
              <ArrowRight size={15} />
            </Link>
          }
        />

        <div className="flex flex-wrap gap-2">
          <StatChip label="Runs" value={total} />
          <StatChip label="Open" value={open} />
          <StatChip label="Pending approvals" value={pendingApprovals} />
        </div>

        {!emailReady && <EmailBanner />}

        <div className="mt-4 rounded-xl border border-black/10 bg-white p-5 shadow-sm md:p-6">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[#e7f0ff] text-[#0b5f91]">
              <KeyRound size={17} />
            </span>
            <h2 className="text-base font-semibold">New reset run</h2>
          </div>

          <form action={createPasswordResetRun} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Labeled label="Employee name">
                <input name="employeeName" required placeholder="Jordan Lee" className={fieldClass} />
              </Labeled>
              <Labeled label="System">
                <select name="system" defaultValue="Okta" className={cn(fieldClass, "font-semibold")}>
                  {systems.map((system) => (
                    <option key={system}>{system}</option>
                  ))}
                </select>
              </Labeled>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Labeled label="Employee email">
                <input name="employeeEmail" required type="email" placeholder="jordan@company.com" className={fieldClass} />
              </Labeled>
              <Labeled label="Requester email">
                <input name="requesterEmail" required type="email" placeholder="manager@company.com" className={fieldClass} />
              </Labeled>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Labeled label="Verification">
                <select name="verification" defaultValue="Manager confirmed" className={cn(fieldClass, "font-semibold")}>
                  <option>Manager confirmed</option>
                  <option>HR record matched</option>
                  <option>MFA challenge passed</option>
                  <option>Not verified</option>
                </select>
              </Labeled>
              <Labeled label="Urgency">
                <select name="urgency" defaultValue="standard" className={cn(fieldClass, "font-semibold")}>
                  <option value="standard">Standard</option>
                  <option value="urgent">Urgent</option>
                </select>
              </Labeled>
            </div>

            <label className="flex min-h-10 items-center gap-2 rounded-md border border-[#d8e4ee] bg-[#f8fbfe] px-3 text-sm font-semibold">
              <input type="checkbox" name="rotateSessions" className="size-4 accent-[#0b2a4a]" />
              Rotate active sessions after reset
            </label>
            <label className="flex min-h-10 items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 text-sm font-semibold text-amber-900">
              <input type="checkbox" name="suspicious" className="size-4 accent-[#0b2a4a]" />
              Suspicious login or account-takeover concern
            </label>

            <textarea
              name="note"
              rows={2}
              placeholder="Optional note, ticket reference, or user context"
              className="w-full resize-none rounded-md border border-[#d8e4ee] bg-white px-3 py-2 text-sm outline-none focus:border-[#0b5f91]"
            />

            <label className="flex items-center gap-2 rounded-md border border-[#d8e4ee] bg-[#f8fbfe] px-3 py-2.5 text-sm font-semibold">
              <input type="checkbox" name="notifyEmployee" defaultChecked className="size-4 accent-[#0b2a4a]" />
              <Mail size={15} className="text-[#0b5f91]" />
              Email the user that a reset was requested
            </label>

            <PendingButton
              pendingText="Creating..."
              className="h-10 w-full rounded-md bg-[#0b2a4a] px-3 text-sm font-semibold text-white transition hover:bg-[#07111f]"
            >
              <KeyRound size={16} />
              Create reset run
            </PendingButton>
          </form>
        </div>

        <WhatHappensNext
          steps={[
            "TicketOS files an identity ticket and assigns the Access Agent.",
            "The user gets an email confirming a reset was requested on their account.",
            "Admin systems or unverified requests pause for approval before the reset.",
          ]}
        />
      </div>
    </main>
  );
}

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-1.5 text-sm shadow-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function EmailBanner() {
  return (
    <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <Mail size={16} className="mt-0.5 shrink-0" />
      <span>
        <span className="font-semibold">Email delivery isn&apos;t set up yet.</span> Reset runs and tickets are still
        created, but users won&apos;t be notified until an admin adds the email keys.
      </span>
    </div>
  );
}

function WhatHappensNext({ steps }: { steps: string[] }) {
  return (
    <div className="mt-4 rounded-xl border border-black/10 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-[#e7f0ff] text-[#0b5f91]">
          <Sparkles size={17} />
        </span>
        <h2 className="text-base font-semibold">What happens next</h2>
      </div>
      <ol className="space-y-2">
        {steps.map((step, index) => (
          <li key={step} className="flex gap-3 text-sm text-slate-600">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#0b2a4a] text-[11px] font-bold text-white">
              {index + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
    </div>
  );
}
