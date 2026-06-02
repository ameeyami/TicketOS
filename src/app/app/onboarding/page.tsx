import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Mail, Sparkles, UserPlus } from "lucide-react";
import { createOnboardingPlan } from "@/app/app/onboarding/actions";
import { PageHeader } from "@/components/dashboard/page-header";
import { PendingButton } from "@/components/ui/pending-button";
import { isEmailConfigured } from "@/lib/email/send";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const appOptions = ["Slack", "Google Workspace", "GitHub", "Jira", "Figma", "Okta", "Finance app", "Production access"];
const fieldClass = "h-10 w-full rounded-md border border-[#d8e4ee] bg-white px-3 text-sm outline-none focus:border-[#0b5f91]";

export default async function OnboardingPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect("/auth/sign-in?message=Sign in to manage onboarding.");
  }

  const organization = await ensureWorkspace(supabase, userData.user);
  const { data: tickets } = await supabase
    .from("tickets")
    .select("status")
    .eq("organization_id", organization.id)
    .eq("category", "Onboarding");

  const rows = tickets ?? [];
  const total = rows.length;
  const open = rows.filter((ticket) => !["resolved", "failed"].includes(ticket.status)).length;
  const emailReady = isEmailConfigured();

  return (
    <main className="min-h-screen px-4 py-6 text-[#07111f] md:px-8">
      <div className="mx-auto max-w-3xl">
        <PageHeader
          crumbs={[{ label: "Operations" }, { label: "Onboarding" }]}
          title="Onboarding"
          description="Create a new-hire plan — TicketOS files the ticket and emails the new employee."
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
          <StatChip label="Plans" value={total} />
          <StatChip label="Open" value={open} />
        </div>

        {!emailReady && <EmailBanner />}

        <div className="mt-4 rounded-xl border border-black/10 bg-white p-5 shadow-sm md:p-6">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[#e7f0ff] text-[#0b5f91]">
              <UserPlus size={17} />
            </span>
            <h2 className="text-base font-semibold">New-hire plan</h2>
          </div>

          <form action={createOnboardingPlan} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Labeled label="Employee name">
                <input name="employeeName" required placeholder="Jordan Lee" className={fieldClass} />
              </Labeled>
              <Labeled label="Start date">
                <input name="startDate" required type="date" className={fieldClass} />
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
              <Labeled label="Department">
                <input name="department" placeholder="Engineering" className={fieldClass} />
              </Labeled>
              <Labeled label="Employment type">
                <select name="employmentType" defaultValue="Employee" className={cn(fieldClass, "font-semibold")}>
                  <option>Employee</option>
                  <option>Contractor</option>
                  <option>Intern</option>
                </select>
              </Labeled>
              <Labeled label="Device">
                <select name="deviceType" defaultValue="MacBook" className={cn(fieldClass, "font-semibold")}>
                  <option>MacBook</option>
                  <option>Windows laptop</option>
                  <option>Existing device</option>
                  <option>No device</option>
                </select>
              </Labeled>
            </div>

            <details className="rounded-md border border-[#d8e4ee] bg-[#f8fbfe] p-3">
              <summary className="cursor-pointer text-sm font-semibold">App access</summary>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {appOptions.map((app) => (
                  <label key={app} className="flex min-h-9 items-center gap-2 rounded-md border border-[#d8e4ee] bg-white px-3 text-sm font-medium">
                    <input type="checkbox" name="apps" value={app} className="size-4 accent-[#0b2a4a]" />
                    {app}
                  </label>
                ))}
              </div>
            </details>

            <textarea
              name="note"
              rows={2}
              placeholder="Optional note or hardware detail"
              className="w-full resize-none rounded-md border border-[#d8e4ee] bg-white px-3 py-2 text-sm outline-none focus:border-[#0b5f91]"
            />

            <label className="flex items-center gap-2 rounded-md border border-[#d8e4ee] bg-[#f8fbfe] px-3 py-2.5 text-sm font-semibold">
              <input type="checkbox" name="notifyEmployee" defaultChecked className="size-4 accent-[#0b2a4a]" />
              <Mail size={15} className="text-[#0b5f91]" />
              Email a welcome message to the employee
            </label>

            <PendingButton
              pendingText="Creating..."
              className="h-10 w-full rounded-md bg-[#0b2a4a] px-3 text-sm font-semibold text-white transition hover:bg-[#07111f]"
            >
              <UserPlus size={16} />
              Create plan
            </PendingButton>
          </form>
        </div>

        <WhatHappensNext
          steps={[
            "TicketOS files an onboarding ticket and assigns the Onboarding Agent.",
            "The new hire gets a welcome email with their start date and apps.",
            "Standard access is queued; sensitive apps wait for approval.",
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
        <span className="font-semibold">Email delivery isn&apos;t set up yet.</span> Plans and tickets are still created,
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
