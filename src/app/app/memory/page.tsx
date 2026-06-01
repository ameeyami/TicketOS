import { redirect } from "next/navigation";
import {
  Bot,
  Brain,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { updateAgentMemory } from "@/app/app/agents/actions";
import { PageHeader } from "@/components/dashboard/page-header";
import { PendingButton } from "@/components/ui/pending-button";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  Executing: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Waiting: "border-zinc-200 bg-zinc-50 text-zinc-700",
  Investigating: "border-sky-200 bg-sky-50 text-sky-700",
  Paused: "border-amber-200 bg-amber-50 text-amber-800",
  Blocked: "border-rose-200 bg-rose-50 text-rose-700",
};

export default async function MemoryPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect("/auth/sign-in?message=Sign in to manage agent memory.");
  }

  const organization = await ensureWorkspace(supabase, userData.user);
  const { data: agents } = await supabase
    .from("agents")
    .select("*")
    .eq("organization_id", organization.id)
    .order("created_at");

  const agentRows = agents ?? [];
  const scopedAgents = agentRows.filter((agent) => Boolean(agent.memory_scope)).length;
  const uniqueCapabilities = new Set(agentRows.flatMap((agent) => agent.capabilities ?? [])).size;

  return (
    <main className="min-h-screen bg-[#fbfaf8] px-4 py-5 text-[#151914] md:px-8">
      <div className="mx-auto max-w-6xl">
        <PageHeader
          crumbs={[{ label: "Other" }, { label: "Memory" }]}
          title="Memory"
          description="Edit the context each agent can use."
        />

        <section className="mt-5 grid gap-3 md:grid-cols-2">
          <MetricCard label="Scoped agents" value={`${scopedAgents}/${agentRows.length}`} icon={Brain} />
          <MetricCard label="Capabilities" value={String(uniqueCapabilities)} icon={Sparkles} />
        </section>

        <section className="mt-5">
          <div className="grid gap-4 lg:grid-cols-2">
            {agentRows.map((agent) => {
              return (
                <article key={agent.id} className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-4">
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#eef5ea] text-[#2e6658]">
                        <Bot size={20} />
                      </span>
                      <div>
                        <h2 className="text-lg font-semibold">{agent.name}</h2>
                        <p className="mt-1 text-sm leading-6 text-black/55">{agent.description}</p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "rounded-md border px-2 py-1 text-xs font-semibold",
                        statusStyles[agent.status] ?? "border-zinc-200 bg-zinc-50 text-zinc-700",
                      )}
                    >
                      {agent.status}
                    </span>
                  </div>

                  <div className="mt-5 rounded-lg border border-black/10 bg-[#111713] p-4 text-white">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Brain size={16} className="text-[#d7ff78]" />
                      Memory scope
                    </div>
                    <p className="mt-3 text-sm leading-6 text-white/62">
                      {agent.memory_scope ?? "No memory scope defined."}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(agent.capabilities ?? []).map((capability: string) => (
                        <span key={capability} className="rounded-md border border-white/10 bg-white/8 px-2 py-1 text-xs text-white/68">
                          {capability}
                        </span>
                      ))}
                    </div>
                  </div>

                  <form action={updateAgentMemory} className="mt-5 grid gap-4">
                    <input type="hidden" name="agentId" value={agent.id} />
                    <input type="hidden" name="organizationId" value={organization.id} />
                    <label className="text-sm font-semibold">
                      Memory scope
                      <textarea
                        required
                        name="memoryScope"
                        defaultValue={agent.memory_scope ?? ""}
                        rows={3}
                        className="mt-2 w-full resize-none rounded-lg border border-black/10 bg-[#f8faf5] px-3 py-2 text-sm leading-6 outline-none focus:border-[#2f6f60]"
                        placeholder="Systems, policies, and operational context this agent can use..."
                      />
                    </label>
                    <label className="text-sm font-semibold">
                      Capabilities
                      <input
                        name="capabilities"
                        defaultValue={(agent.capabilities ?? []).join(", ")}
                        className="mt-2 h-11 w-full rounded-lg border border-black/10 bg-[#f8faf5] px-3 text-sm outline-none focus:border-[#2f6f60]"
                        placeholder="Okta, Slack, Google Workspace"
                      />
                    </label>
                    <PendingButton
                      pendingText="Saving..."
                      className="h-10 rounded-lg bg-[#17211c] px-3 text-sm font-semibold text-white"
                    >
                      <ShieldCheck size={16} />
                      Save memory
                    </PendingButton>
                  </form>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-black/52">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
        </div>
        <span className="flex size-11 items-center justify-center rounded-lg bg-[#eef5ea] text-[#2e6658]">
          <Icon size={20} />
        </span>
      </div>
    </div>
  );
}
