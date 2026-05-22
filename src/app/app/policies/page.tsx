import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  CirclePause,
  FileJson,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Workflow,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  createPolicyFromTemplate,
  createPolicyRule,
  updatePolicyRuleStatus,
} from "@/app/app/policies/actions";
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
  const [{ data: policies }, { data: evaluations }, { data: integrationActions }, { data: auditLogs }] = await Promise.all([
    supabase.from("policy_rules").select("*").eq("organization_id", organization.id).order("created_at", { ascending: false }),
    supabase
      .from("policy_evaluations")
      .select("*, policy_rules(name), tickets(external_id, title)")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("integration_actions")
      .select("id, action_key, display_name, risk_level, requires_approval, integrations(display_name)")
      .eq("organization_id", organization.id)
      .order("risk_level"),
    supabase
      .from("audit_logs")
      .select("*")
      .eq("organization_id", organization.id)
      .in("event_type", ["policy_rule_created", "policy_rule_activated", "policy_rule_paused"])
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const policyRows = policies ?? [];
  const evaluationRows = evaluations ?? [];
  const actionRows = integrationActions ?? [];
  const activePolicies = policyRows.filter((policy) => policy.is_active).length;
  const approvalPolicies = policyRows.filter((policy) => policy.decision === "approval_required").length;
  const blockPolicies = policyRows.filter((policy) => policy.decision === "block").length;
  const highRiskActions = actionRows.filter((action) => action.risk_level === "high").length;

  return (
    <main className="min-h-screen bg-[#f6f7f2] px-4 py-6 text-[#151914] md:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/app"
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-black/10 bg-white px-3 text-sm font-semibold"
        >
          <ArrowLeft size={16} />
          Command center
        </Link>

        <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#47685d]">Policy guardrails</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">Control what agents can execute.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-black/56">
              Define the approval and blocking rules that make autonomous IT operations transparent and safe.
            </p>
          </div>
          <div className="rounded-lg border border-black/10 bg-white px-4 py-3 text-sm font-semibold">
            {organization.name}
          </div>
        </div>

        <section className="mt-6 grid gap-3 md:grid-cols-4">
          <MetricCard label="Active policies" value={`${activePolicies}/${policyRows.length}`} icon={ShieldCheck} />
          <MetricCard label="Approval rules" value={String(approvalPolicies)} icon={BadgeCheck} />
          <MetricCard label="Block rules" value={String(blockPolicies)} icon={XCircle} />
          <MetricCard label="High-risk actions" value={String(highRiskActions)} icon={ShieldAlert} />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[.82fr_1.18fr]">
          <aside className="space-y-6">
            <Panel title="Policy templates" icon={ShieldAlert}>
              <div className="space-y-3">
                {Object.entries(policyRuleTemplates).map(([key, template]) => (
                  <form key={key} action={createPolicyFromTemplate} className="rounded-lg border border-black/10 p-4">
                    <input type="hidden" name="organizationId" value={organization.id} />
                    <input type="hidden" name="templateKey" value={key} />
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{template.name}</p>
                        <p className="mt-1 text-sm leading-6 text-black/55">{template.description}</p>
                      </div>
                      <DecisionPill decision={template.decision} />
                    </div>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-black/38">
                      {template.action_pattern}
                    </p>
                    <PendingButton
                      pendingText="Adding..."
                      className="mt-4 h-9 rounded-lg border border-black/10 bg-white px-3 text-sm font-semibold"
                    >
                      <Plus size={15} />
                      Add template
                    </PendingButton>
                  </form>
                ))}
              </div>
            </Panel>

            <Panel title="Create custom rule" icon={FileJson}>
              <form action={createPolicyRule} className="grid gap-4">
                <input type="hidden" name="organizationId" value={organization.id} />
                <TextField name="name" label="Rule name" placeholder="Finance app access approval" />
                <TextField name="description" label="Description" placeholder="Require approval before finance system access." />
                <TextField name="actionPattern" label="Action pattern" placeholder="okta.assign_app" />
                <label className="text-sm font-semibold">
                  Decision
                  <select
                    name="decision"
                    defaultValue="approval_required"
                    className="mt-2 h-11 w-full rounded-lg border border-black/10 bg-[#f8faf5] px-3 text-sm outline-none focus:border-[#2f6f60]"
                  >
                    <option value="allow">Allow</option>
                    <option value="approval_required">Require approval</option>
                    <option value="block">Block</option>
                  </select>
                </label>
                <label className="text-sm font-semibold">
                  Conditions
                  <textarea
                    name="conditions"
                    rows={4}
                    className="mt-2 w-full resize-none rounded-lg border border-black/10 bg-[#f8faf5] px-3 py-2 text-sm leading-6 outline-none focus:border-[#2f6f60]"
                    placeholder='{"risk":"sensitive_app","approver_role":"admin"}'
                  />
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold text-black/62">
                  <input name="isActive" type="checkbox" defaultChecked className="size-4 accent-[#2f6f60]" />
                  Activate rule after creation
                </label>
                <PendingButton
                  pendingText="Creating..."
                  className="h-10 rounded-lg bg-[#17211c] px-3 text-sm font-semibold text-white"
                >
                  <Plus size={16} />
                  Create rule
                </PendingButton>
              </form>
            </Panel>
          </aside>

          <div className="space-y-6">
            <Panel title="Active guardrail rules" icon={ShieldCheck}>
              <div className="space-y-3">
                {policyRows.map((policy) => (
                  <article key={policy.id} className="rounded-lg border border-black/10 bg-white p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
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
                        <h2 className="mt-3 text-lg font-semibold">{policy.name}</h2>
                        <p className="mt-1 text-sm leading-6 text-black/55">{policy.description}</p>
                        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-black/38">
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
                    </div>
                    <div className="mt-4 rounded-lg border border-black/10 bg-[#f8faf5] p-3">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-black/38">
                        <FileJson size={14} />
                        Conditions
                      </div>
                      <p className="mt-2 break-words text-sm leading-6 text-black/58">{formatConditions(policy.conditions)}</p>
                    </div>
                  </article>
                ))}
                {policyRows.length === 0 && (
                  <p className="rounded-lg border border-dashed border-black/15 p-4 text-sm text-black/48">
                    Add a policy template or create a custom rule to start governing agent execution.
                  </p>
                )}
              </div>
            </Panel>

            <section className="grid gap-6 lg:grid-cols-2">
              <Panel title="Recent evaluations" icon={Workflow}>
                <div className="space-y-3">
                  {evaluationRows.map((evaluation) => (
                    <div key={evaluation.id} className="rounded-lg border border-black/10 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{evaluation.policy_rules?.name ?? "Runtime policy"}</p>
                          <p className="mt-1 text-sm leading-6 text-black/55">{evaluation.reason}</p>
                        </div>
                        <DecisionPill decision={evaluation.decision} />
                      </div>
                      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-black/38">
                        {evaluation.tickets?.external_id ?? "Ticket"} · {Number(evaluation.confidence ?? 0)}% confidence
                      </p>
                    </div>
                  ))}
                  {evaluationRows.length === 0 && (
                    <p className="rounded-lg border border-dashed border-black/15 p-4 text-sm text-black/48">
                      Policy evaluations appear as workflows run.
                    </p>
                  )}
                </div>
              </Panel>

              <Panel title="Policy audit" icon={ShieldAlert}>
                <div className="divide-y divide-black/8 rounded-lg border border-black/10">
                  {(auditLogs ?? []).map((log) => (
                    <div key={log.id} className="p-4">
                      <p className="font-semibold">{log.event_summary}</p>
                      <p className="mt-1 text-sm text-black/50">{formatDate(log.created_at)}</p>
                    </div>
                  ))}
                  {(auditLogs ?? []).length === 0 && (
                    <p className="p-4 text-sm text-black/48">Policy changes will appear here.</p>
                  )}
                </div>
              </Panel>
            </section>
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
    <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-black/52">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
        </div>
        <span className="flex size-11 items-center justify-center rounded-lg bg-[#eef5ea] text-[#2e6658]">
          <Icon size={20} />
        </span>
      </div>
    </div>
  );
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-lg bg-[#eef5ea] text-[#2e6658]">
          <Icon size={18} />
        </span>
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function TextField({ name, label, placeholder }: { name: string; label: string; placeholder: string }) {
  return (
    <label className="text-sm font-semibold">
      {label}
      <input
        required
        name={name}
        className="mt-2 h-11 w-full rounded-lg border border-black/10 bg-[#f8faf5] px-3 text-sm outline-none focus:border-[#2f6f60]"
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

function formatConditions(value: unknown) {
  if (!value || typeof value !== "object") {
    return "No conditions configured.";
  }

  return Object.entries(value as Record<string, unknown>)
    .map(([key, entry]) => `${key}: ${String(entry)}`)
    .join(" · ");
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Not recorded";
  }

  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
