import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Plus, Sparkles } from "lucide-react";
import { createTicket } from "@/app/app/tickets/new/actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function NewTicketPage() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    redirect("/auth/sign-in?message=Sign in to create tickets.");
  }

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

        <section className="mt-6 rounded-xl border border-black/10 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex size-10 items-center justify-center rounded-lg bg-[#eef5ea] text-[#2e6658]">
              <Sparkles size={18} />
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">New IT request</h1>
              <p className="mt-1 text-sm text-black/52">
                TicketOS will classify the request, assign an agent, and create an audit entry.
              </p>
            </div>
          </div>

          <form action={createTicket} className="mt-8 grid gap-5">
            <label className="block">
              <span className="text-sm font-semibold">Request title</span>
              <input
                required
                name="title"
                className="mt-2 h-12 w-full rounded-lg border border-black/10 px-3 text-sm outline-none focus:border-[#2f6f60] focus:ring-4 focus:ring-[#2f6f60]/10"
                placeholder="Reset Okta password for employee"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold">Description</span>
              <textarea
                required
                name="description"
                rows={5}
                className="mt-2 w-full rounded-lg border border-black/10 px-3 py-3 text-sm outline-none focus:border-[#2f6f60] focus:ring-4 focus:ring-[#2f6f60]/10"
                placeholder="Describe the issue, requester, system, and desired outcome."
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold">Requester name</span>
                <input
                  name="requesterName"
                  className="mt-2 h-12 w-full rounded-lg border border-black/10 px-3 text-sm outline-none focus:border-[#2f6f60] focus:ring-4 focus:ring-[#2f6f60]/10"
                  placeholder="Priya Shah"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold">Requester email</span>
                <input
                  name="requesterEmail"
                  type="email"
                  className="mt-2 h-12 w-full rounded-lg border border-black/10 px-3 text-sm outline-none focus:border-[#2f6f60] focus:ring-4 focus:ring-[#2f6f60]/10"
                  placeholder="priya@company.com"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold">Category</span>
                <select
                  name="category"
                  className="mt-2 h-12 w-full rounded-lg border border-black/10 bg-white px-3 text-sm outline-none focus:border-[#2f6f60] focus:ring-4 focus:ring-[#2f6f60]/10"
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
                  className="mt-2 h-12 w-full rounded-lg border border-black/10 bg-white px-3 text-sm outline-none focus:border-[#2f6f60] focus:ring-4 focus:ring-[#2f6f60]/10"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </label>
            </div>

            <button
              type="submit"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#17211c] px-4 text-sm font-semibold text-white"
            >
              <Plus size={17} />
              Create ticket
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
