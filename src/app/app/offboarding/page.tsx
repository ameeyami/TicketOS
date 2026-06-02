import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Mail, Sparkles, UserX } from "lucide-react";
import { createOffboardingRun } from "@/app/app/offboarding/actions";
import { PageHeader } from "@/components/dashboard/page-header";
import { PendingButton } from "@/components/ui/pending-button";
import { isEmailConfigured } from "@/lib/email/send";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const appOptions = ["Okta", "Google Workspace", "Slack", "GitHub", "Jira", "Figma", "Finance app", "Production access"];
const fieldClass = "h-10 w-full rounded-md border border-[#d8e4ee] bg-white px-3 text-sm outline-none focus:border-[#0b5f91]";

export default async function OffboardingPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect("/auth/sign-in?message=Sign in to manage offboarding.");
  }

  const organization = await ensureWorkspace(supabase, userData.user);
  const { data: tickets } = await supabase
    .from("tickets")
    .select("status, priority")
    .eq("organization_id", organization.id)
    .eq("source", "offboarding_workspace");

  const rows = tickets ?? [];
  const total = rows.length;
  const open = rows.filter((ticket) => !["resolved", "failed"].includes(ticket.status)).length;
  const critical = rows.filter((ticket) => ticket.priority === "critical").length;
  const emailReady = isEmailConfigured();

  return (
    <main className="min-h-screen px-4 py-6 text-[#07111f] md:px-8">
      <div className="mx-auto max-w-3xl">
        <PageHeader
          crumbs={[{ label: "Operations" }, { label: "Offboarding" }]}
          title="Offboarding"
          description="Create an access-revocation run — TicketOS files the ticket and notifies the departing employee."
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
          <StatChip label="Critical" value={critical} />
        </div>

        {!emailReady && <EmailBanner />}

        <div className="mt-4 rounded-xl border border-black/10 bg-white p-5 shadow-sm md:p-6">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[#e7f0ff] text-[#0b5f91]">
              <UserX size={17} />
            </span>
            <h2 className="text-base font-semibold">Access-revocation run</h2>
          </div>

          <form action={createOffboardingRun} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Labeled label="Employee name">
                <input name="employeeName" required placeholder="Jordan Lee" className={fieldClass} />
              </Labeled>
              <Labeled label="Last working day">
                <input name="lastDay" required type="date" className={fieldClass} />
              </Labeled>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Labeled label="Employee email">
                <input name="employeeEmail" required type="email" placeholder="jordan@company.com" className={fieldClass} />
              </Labeled>
              <Labeled label="Manager email">
                <input name="managerEmail" required type="email" placeholder="manager@company.com" className={fieldClass} />
              </Labeled>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Labeled label="Urgency">
                <select name="urgency" defaultValue="standard" className={cn(fieldClass, "font-semibold")}>
                  <option value="standard">Standard</option>
                  <option value="immediate">Immediate</option>
                </select>
              </Labeled>
              <Labeled label="Reason">
                <select name="reason" defaultValue="Voluntary departure" className={cn(fieldClass, "font-semibold")}>
                  <option>Voluntary departure</option>
                  <option>Contract ended</option>
                  <option>Role change</option>
                  <option>Security incident</option>
                </select>
              </Labeled>
              <Labeled label="Transfer owner">
                <input name="transferOwner" type="email" placeholder="owner@company.com" className={fieldClass} />
              </Labeled>
            </div>

            <details className="rounded-md border border-[#d8e4ee] bg-[#f8fbfe] p-3">
              <summary className="cursor-pointer text-sm font-semibold">Access to revoke</summary>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {appOptions.map((app) => (
                  <label key={app} className="flex min-h-9 items-center gap-2 rounded-md border border-[#d8e4ee] bg-white px-3 text-sm font-medium">
                    <input type="checkbox" name="apps" value={app} className="size-4 accent-[#0b2a4a]" />
                    {app}
                  </label>
                ))}
              </div>
            </details>

            <label className="flex min-h-10 items-center gap-2 rounded-md border border-[#d8e4ee] bg-[#f8fbfe] px-3 text-sm font-semibold">
              <input type="checkbox" name="legalHold" className="size-4 accent-[#0b2a4a]" />
              Preserve data for legal or security review
            </label>

            <textarea
              name="note"
              rows={2}
              placeholder="Optional note, HR reference, or device-return detail"
              className="w-full resize-none rounded-md border border-[#d8e4ee] bg-white px-3 py-2 text-sm outline-none focus:border-[#0b5f91]"
            />

            <label className="flex items-center gap-2 rounded-md border border-[#d8e4ee] bg-[#f8fbfe] px-3 py-2.5 text-sm font-semibold">
              <input type="checkbox" name="notifyEmployee" defaultChecked className="size-4 accent-[#0b2a4a]" />
              <Mail size={15} className="text-[#0b5f91]" />
              Email an offboarding notice to the employee
            </label>

            <PendingButton
              pendingText="Creating..."
              className="h-10 w-full rounded-md bg-[#0b2a4a] px-3 text-sm font-semibold text-white transition hover:bg-[#07111f]"
            >
              <UserX size={16} />
              Create run
            </PendingButton>
          </form>
        </div>

        <WhatHappensNext
          steps={[
            "TicketOS files an offboarding ticket and assigns the Security Agent.",
            "The employee gets an email with their last day and the access affected.",
            "Sensitive or immediate revocations pause for approval before execution.",
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
        <span className="font-semibold">Email delivery isn&apos;t set up yet.</span> Runs and tickets are still created,
        but employees won&apos;t receive notifications until an admin adds the email keys.
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
