import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { createTicket } from "@/app/app/tickets/new/actions";
import { PageHeader } from "@/components/dashboard/page-header";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PendingButton } from "@/components/ui/pending-button";

export default async function NewTicketPage() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    redirect("/auth/sign-in?message=Sign in to create tickets.");
  }

  return (
    <main className="min-h-screen px-4 py-6 text-[#151914] md:px-8">
      <div className="mx-auto max-w-3xl">
        <PageHeader
          crumbs={[
            { label: "IT" },
            { label: "Tickets", href: "/app/tickets" },
            { label: "New ticket" },
          ]}
          title="New ticket"
          description="TicketOS will classify the request, assign an agent, and create an audit entry."
        />

        <section className="rounded-xl border border-black/10 bg-white p-6 shadow-sm">
          <form action={createTicket} className="grid gap-5">
            <label className="block">
              <span className="text-sm font-semibold">Request title</span>
              <input
                required
                name="title"
                className="mt-2 h-12 w-full rounded-lg border border-black/10 px-3 text-sm outline-none focus:border-[#0b2a4a] focus:ring-4 focus:ring-[#0b2a4a]/10"
                placeholder="Reset Okta password for employee"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold">Description</span>
              <textarea
                required
                name="description"
                rows={5}
                className="mt-2 w-full rounded-lg border border-black/10 px-3 py-3 text-sm outline-none focus:border-[#0b2a4a] focus:ring-4 focus:ring-[#0b2a4a]/10"
                placeholder="Describe the issue, requester, system, and desired outcome."
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold">Requester name</span>
                <input
                  name="requesterName"
                  className="mt-2 h-12 w-full rounded-lg border border-black/10 px-3 text-sm outline-none focus:border-[#0b2a4a] focus:ring-4 focus:ring-[#0b2a4a]/10"
                  placeholder="Priya Shah"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold">Requester email</span>
                <input
                  name="requesterEmail"
                  type="email"
                  className="mt-2 h-12 w-full rounded-lg border border-black/10 px-3 text-sm outline-none focus:border-[#0b2a4a] focus:ring-4 focus:ring-[#0b2a4a]/10"
                  placeholder="priya@company.com"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold">Category</span>
                <select
                  name="category"
                  className="mt-2 h-12 w-full rounded-lg border border-black/10 bg-white px-3 text-sm outline-none focus:border-[#0b2a4a] focus:ring-4 focus:ring-[#0b2a4a]/10"
                >
                  <option>Identity</option>
                  <option>Onboarding</option>
                  <option>Network</option>
                  <option>Security</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-semibold">Priority</span>
                <select
                  name="priority"
                  className="mt-2 h-12 w-full rounded-lg border border-black/10 bg-white px-3 text-sm outline-none focus:border-[#0b2a4a] focus:ring-4 focus:ring-[#0b2a4a]/10"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </label>
            </div>

            <div className="rounded-lg border border-[#d8e4ee] bg-[#f1f6fb] p-3 text-xs leading-5 text-slate-600">
              <span className="font-semibold text-[#0b1a2e]">SLA response targets:</span>{" "}
              Critical 2h · High 8h · Medium 24h · Low 72h. The SLA clock starts when the ticket is created and is tracked on the ticket and inbox.
            </div>

            <PendingButton
              pendingText="Creating..."
              className="h-12 rounded-lg bg-[#0b2a4a] px-4 text-sm font-semibold text-white"
            >
              <Plus size={17} />
              Create ticket
            </PendingButton>
          </form>
        </section>
      </div>
    </main>
  );
}
