import Link from "next/link";
import { redirect } from "next/navigation";
import { Eye, Plus } from "lucide-react";
import { createTicket } from "@/app/app/tickets/new/actions";
import { PageHeader } from "@/components/dashboard/page-header";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { loadTeamContext } from "@/lib/teams";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PendingButton } from "@/components/ui/pending-button";

const fieldClass =
  "mt-2 h-12 w-full rounded-lg border border-black/10 bg-white px-3 text-sm outline-none focus:border-[#0b2a4a] focus:ring-4 focus:ring-[#0b2a4a]/10";

export default async function NewTicketPage({
  searchParams,
}: {
  searchParams: Promise<{ title?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    redirect("/auth/sign-in?message=Sign in to create tickets.");
  }

  const prefillTitle = (await searchParams).title?.slice(0, 200) ?? "";

  const organization = await ensureWorkspace(supabase, data.user);
  const ctx = await loadTeamContext(supabase, organization.id, data.user);
  const myTeams = ctx.teams.filter((team) => ctx.myTeamIds.has(team.id));
  const defaultRequesting = myTeams[0]?.id ?? "";

  if (ctx.orgRole === "viewer") {
    return (
      <main className="min-h-screen px-4 py-6 text-[#151914] md:px-8">
        <div className="mx-auto max-w-3xl">
          <PageHeader
            crumbs={[{ label: "IT" }, { label: "Tickets", href: "/app/tickets" }, { label: "New ticket" }]}
            title="New ticket"
            description="TicketOS will classify the request, assign an agent, and create an audit entry."
          />
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
            <Eye size={18} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">You have viewer access.</p>
              <p className="mt-1">
                Viewers can read tickets but can&apos;t create them. Ask a workspace owner or admin to change your role on
                the <Link href="/app/team" className="font-semibold underline">Team</Link> page.
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-6 text-[#151914] md:px-8">
      <div className="mx-auto max-w-3xl">
        <PageHeader
          crumbs={[{ label: "IT" }, { label: "Tickets", href: "/app/tickets" }, { label: "New ticket" }]}
          title="New ticket"
          description="TicketOS will classify the request, assign an agent, and create an audit entry."
        />

        <section className="rounded-xl border border-black/10 bg-white p-6 shadow-sm">
          <form action={createTicket} className="grid gap-5">
            <label className="block">
              <span className="text-sm font-semibold">Request title</span>
              <input required name="title" defaultValue={prefillTitle} className={fieldClass} placeholder="Reset Okta password for employee" />
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
                <input name="requesterName" className={fieldClass} placeholder="Priya Shah" />
              </label>
              <label className="block">
                <span className="text-sm font-semibold">Requester email</span>
                <input name="requesterEmail" type="email" className={fieldClass} placeholder="priya@company.com" />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold">Raised by team</span>
                <select name="requestingTeamId" defaultValue={defaultRequesting} className={fieldClass}>
                  <option value="">— Not specified —</option>
                  {ctx.teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-semibold">Assigned to team (processes it)</span>
                <select name="assignedTeamId" defaultValue="" className={fieldClass}>
                  <option value="">— Unassigned —</option>
                  {ctx.teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold">Category</span>
                <select name="category" className={fieldClass}>
                  <option>Identity</option>
                  <option>Onboarding</option>
                  <option>Network</option>
                  <option>Security</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-semibold">Priority</span>
                <select name="priority" className={fieldClass}>
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
              className="h-12 rounded-lg bg-[#0b2a4a] px-4 text-sm font-semibold text-white transition hover:bg-[#07111f]"
            >
              <Plus size={17} />
              Create ticket
            </PendingButton>
          </form>
        </section>

        {ctx.teams.length === 0 && (
          <p className="mt-4 text-center text-sm text-slate-500">
            No teams yet — <Link href="/app/team" className="font-semibold text-[#0b2a4a] underline">create teams</Link> to route tickets between them.
          </p>
        )}
      </div>
    </main>
  );
}
