import { redirect } from "next/navigation";
import {
  CheckCircle2,
  CirclePause,
  FileJson,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import {
  createPolicyFromTemplate,
  createPolicyRule,
  updatePolicyRuleStatus,
} from "@/app/app/policies/actions";
import { PageHeader } from "@/components/dashboard/page-header";
import { PendingButton } from "@/components/ui/pending-button";
import { policyRuleTemplates } from "@/lib/policy-rule-templates";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const decisionStyles: Record<string, string> = {
  allow: "border-emerald-200 bg-emerald-50 text-emerald-700",
  approval_required: "border-amber-200 bg-amber-50 text-amber-800",
  block: "border-rose-200 bg-rose-50 text-rose-700",
};

export default async function PoliciesPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect("/auth/sign-in?message=Sign in to manage policy guardrails.");
  }

  const organization = await ensureWorkspace(supabase, userData.user);
  const [{ data: policies }, { data: evaluations }] = await Promise.all([
    supabase
      .from("policy_rules")
      .select("*")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("policy_evaluations")
      .select("*, policy_rules(name), tickets(external_id)")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const policyRows = policies ?? [];
  const evaluationRows = evaluations ?? [];
  const activePolicies = policyRows.filter((policy) => policy.is_active).length;
  const approvalPolicies = policyRows.filter((policy) => policy.decision === "approval_required").length;
  const blockPolicies = policyRows.filter((policy) => policy.decision === "block").length;

  return (
    <main className="min-h-screen bg-[#fbfaf8] px-4 py-5 text-[#151914] md:px-8">
      <div className="mx-auto max-w-6xl">
        <PageHeader
          crumbs={[{ label: "Governance" }, { label: "Policies" }]}
          title="Policies"
          description="Keep only the rules agents must check before approving, blocking, or executing work."
          actions={
            <div className="grid grid-cols-3 gap-2 md:w-[360px]">
              <PolicyStat label="Active" value={`${activePolicies}/${policyRows.length}`} />
              <PolicyStat label="Approval" value={String(approvalPolicies)} />
              <PolicyStat label="Blocked" value={String(blockPolicies)} />
            </div>
          }
        />

        <section className="mt-5 grid gap-3 md:grid-cols-2">
          <ActionDrawer title="Add from template" icon={<ShieldAlert size={17} />}>
            <div className="grid gap-2">
              {Object.entries(policyRuleTemplates).map(([key, template]) => (
                <form
                  key={key}
                  action={createPolicyFromTemplate}
                  className="flex flex-col gap-3 rounded-lg border border-black/10 bg-white p-3 md:flex-row md:items-center md:justify-between"
                >
                  <input type="hidden" name="organizationId" value={organization.id} />
                  <input type="hidden" name="templateKey" value={key} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{template.name}</p>
                      <DecisionPill decision={template.decision} />
                    </div>
                    <p className="mt-1 text-sm text-black/50">{template.action_pattern}</p>
                  </div>
                  <PendingButton
                    pendingText="Adding..."
                    className="h-9 rounded-lg border border-black/10 bg-white px-3 text-sm font-semibold"
                  >
                    <Plus size={15} />
                    Add
                  </PendingButton>
                </form>
              ))}
            </div>
          </ActionDrawer>

          <ActionDrawer title="Create custom rule" icon={<FileJson size={17} />}>
            <form action={createPolicyRule} className="grid gap-3 rounded-lg border border-black/10 bg-white p-4">
              <input type="hidden" name="organizationId" value={organization.id} />
              <TextField name="name" label="Rule name" placeholder="Finance app approval" />
              <TextField name="description" label="Description" placeholder="Require approval before finance access." />
              <TextField name="actionPattern" label="Action pattern" placeholder="okta.assign_app" />
              <label className="text-sm font-semibold">
                Decision
                <select
                  name="decision"
                  defaultValue="approval_required"
                  className="mt-2 h-10 w-full rounded-lg border border-black/10 bg-[#fbfaf8] px-3 text-sm outline-none focus:border-black/25"
                >
                  <option value="allow">Allow</option>
                  <option value="approval_required">Require approval</option>
                  <option value="block">Block</option>
                </select>
              </label>
              <input type="hidden" name="isActive" value="on" />
              <input type="hidden" name="conditions" value="{}" />
              <PendingButton
                pendingText="Creating..."
                className="h-10 rounded-lg bg-black px-3 text-sm font-semibold text-white"
              >
                <Plus size={16} />
                Create rule
              </PendingButton>
            </form>
          </ActionDrawer>
        </section>

        <section className="mt-5 rounded-xl border border-black/10 bg-white">
          <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-[#f6eee8] text-[#e4611f]">
                <ShieldCheck size={17} />
              </span>
              <h2 className="font-semibold">Guardrail rules</h2>
            </div>
            <span className="text-sm text-black/42">{policyRows.length} total</span>
          </div>

          <div className="divide-y divide-black/8">
            {policyRows.map((policy) => (
              <article key={policy.id} className="grid gap-4 px-4 py-4 md:grid-cols-[1fr_auto] md:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{policy.name}</h3>
                    <DecisionPill decision={policy.decision} />
                    <span
                      className={cn(
                        "rounded-md border px-2 py-1 text-xs font-semibold",
                        policy.is_active
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-zinc-200 bg-zinc-50 text-zinc-700",
                      )}
                    >
                      {policy.is_active ? "active" : "paused"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-black/54">{policy.description}</p>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-black/36">
                    {policy.action_pattern}
                  </p>
                </div>
                <form action={updatePolicyRuleStatus}>
                  <input type="hidden" name="policyId" value={policy.id} />
                  <input type="hidden" name="organizationId" value={organization.id} />
                  <input type="hidden" name="isActive" value={policy.is_active ? "false" : "true"} />
                  <PendingButton
                    pendingText={policy.is_active ? "Pausing..." : "Activating..."}
                    className="h-9 rounded-lg border border-black/10 bg-white px-3 text-sm font-semibold"
                  >
                    {policy.is_active ? <CirclePause size={15} /> : <CheckCircle2 size={15} />}
                    {policy.is_active ? "Pause" : "Activate"}
                  </PendingButton>
                </form>
              </article>
            ))}

            {policyRows.length === 0 && (
              <p className="px-4 py-8 text-sm text-black/48">No rules yet. Add a template or create one custom rule.</p>
            )}
          </div>
        </section>

        <ActionDrawer title="Recent policy checks" icon={<Workflow size={17} />} className="mt-5">
          <div className="divide-y divide-black/8 rounded-lg border border-black/10 bg-white">
            {evaluationRows.map((evaluation) => (
              <div key={evaluation.id} className="grid gap-2 p-4 md:grid-cols-[1fr_auto]">
                <div>
                  <p className="font-semibold">{evaluation.policy_rules?.name ?? "Runtime policy"}</p>
                  <p className="mt-1 text-sm text-black/52">{evaluation.reason}</p>
                </div>
                <div className="flex items-start gap-2">
                  <DecisionPill decision={evaluation.decision} />
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-black/36">
                    {evaluation.tickets?.external_id ?? "Ticket"} · {Number(evaluation.confidence ?? 0)}%
                  </span>
                </div>
              </div>
            ))}
            {evaluationRows.length === 0 && (
              <p className="p-4 text-sm text-black/48">Checks appear here after workflows run.</p>
            )}
          </div>
        </ActionDrawer>
      </div>
    </main>
  );
}

function PolicyStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-black/10 bg-white px-3 py-2">
      <p className="text-xs font-medium text-black/42">{label}</p>
      <p className="mt-1 text-xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function ActionDrawer({
  title,
  icon,
  className,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <details className={cn("group rounded-xl border border-black/10 bg-white", className)}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
        <span className="flex items-center gap-2 font-semibold">
          <span className="grid size-8 place-items-center rounded-lg bg-[#f6eee8] text-[#e4611f]">{icon}</span>
          {title}
        </span>
        <Plus size={16} className="text-black/38 transition group-open:rotate-45" />
      </summary>
      <div className="border-t border-black/10 p-4">{children}</div>
    </details>
  );
}

function TextField({ name, label, placeholder }: { name: string; label: string; placeholder: string }) {
  return (
    <label className="text-sm font-semibold">
      {label}
      <input
        required
        name={name}
        className="mt-2 h-10 w-full rounded-lg border border-black/10 bg-[#fbfaf8] px-3 text-sm outline-none focus:border-black/25"
        placeholder={placeholder}
      />
    </label>
  );
}

function DecisionPill({ decision }: { decision: string }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-md border px-2 py-1 text-xs font-semibold",
        decisionStyles[decision] ?? "border-zinc-200 bg-zinc-50 text-zinc-700",
      )}
    >
      {decision.replaceAll("_", " ")}
    </span>
  );
}
