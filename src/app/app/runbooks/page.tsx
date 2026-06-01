import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  FileText,
  GitBranch,
  Library,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { installRunbookPack } from "@/app/app/runbooks/actions";
import { PageHeader } from "@/components/dashboard/page-header";
import { PendingButton } from "@/components/ui/pending-button";
import { policyRuleTemplates } from "@/lib/policy-rule-templates";
import { runbookPacks } from "@/lib/runbook-packs";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { workflowTemplates } from "@/lib/workflow-templates";

const riskStyles: Record<string, string> = {
  Low: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Medium: "border-amber-200 bg-amber-50 text-amber-800",
  High: "border-rose-200 bg-rose-50 text-rose-700",
};

export default async function RunbooksPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect("/auth/sign-in?message=Sign in to manage runbooks.");
  }

  const organization = await ensureWorkspace(supabase, userData.user);
  const [{ data: workflows }, { data: policies }, { data: auditLogs }] = await Promise.all([
    supabase.from("workflows").select("id, name, is_active").eq("organization_id", organization.id),
    supabase.from("policy_rules").select("id, name, decision, is_active").eq("organization_id", organization.id),
    supabase
      .from("audit_logs")
      .select("*")
      .eq("organization_id", organization.id)
      .in("event_type", ["runbook_pack_installed", "workflow_created", "policy_rule_created"])
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const workflowNames = new Set((workflows ?? []).map((workflow) => workflow.name));
  const policyNames = new Set((policies ?? []).map((policy) => policy.name));
  const packRows = Object.entries(runbookPacks).map(([key, pack]) => {
    const workflowTemplate = workflowTemplates[pack.workflowTemplate];
    const policyTemplate = policyRuleTemplates[pack.policyTemplate];
    const workflowInstalled = workflowNames.has(workflowTemplate.name);
    const policyInstalled = policyNames.has(policyTemplate.name);

    return {
      key,
      pack,
      workflowTemplate,
      policyTemplate,
      workflowInstalled,
      policyInstalled,
      installed: workflowInstalled && policyInstalled,
    };
  });

  const installedCount = packRows.filter((pack) => pack.installed).length;
  const activePolicies = (policies ?? []).filter((policy) => policy.is_active).length;

  return (
    <main className="min-h-screen bg-[#f6f7f2] px-4 py-6 text-[#151914] md:px-8">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          crumbs={[{ label: "IT" }, { label: "Runbooks" }]}
          title="Runbooks"
          description="Install governed IT runbooks with matching workflow graphs, policy guardrails, and audit visibility."
          actions={
            <Link
              href="/app/workflows/new"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#17211c] px-3 text-sm font-semibold text-white"
            >
              Custom workflow
              <ArrowRight size={16} />
            </Link>
          }
        />

        <section className="mt-6 grid gap-3 md:grid-cols-4">
          <MetricCard label="Runbook packs" value={String(packRows.length)} icon={Library} />
          <MetricCard label="Installed" value={String(installedCount)} icon={CheckCircle2} />
          <MetricCard label="Workflows" value={String(workflows?.length ?? 0)} icon={Workflow} />
          <MetricCard label="Active policies" value={String(activePolicies)} icon={ShieldCheck} />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_.68fr]">
          <div className="grid gap-4 lg:grid-cols-2">
            {packRows.map(({ key, pack, workflowTemplate, policyTemplate, workflowInstalled, policyInstalled, installed }) => (
              <article key={key} className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-4">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#eef5ea] text-[#2e6658]">
                      <BookOpenCheck size={20} />
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold">{pack.title}</h2>
                        <span className={cn("rounded-md border px-2 py-1 text-xs font-semibold", riskStyles[pack.risk])}>
                          {pack.risk} risk
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-6 text-black/55">{pack.outcome}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <Fact label="Domain" value={pack.domain} />
                  <Fact label="Owner" value={pack.owner} />
                  <Fact label="Signals" value={String(pack.signals.length)} />
                </div>

                <div className="mt-5 rounded-lg border border-black/10 bg-[#111713] p-4 text-white">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <GitBranch size={16} className="text-[#d7ff78]" />
                    Execution recipe
                  </div>
                  <p className="mt-3 text-sm leading-6 text-white/62">{workflowTemplate.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {workflowTemplate.graph.nodes.map((node) => (
                      <span key={node} className="rounded-md border border-white/10 bg-white/8 px-2 py-1 text-xs text-white/68">
                        {node.replaceAll("_", " ")}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-5 rounded-lg border border-black/10 bg-[#f8faf5] p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <ShieldCheck size={16} className="text-[#2f6f60]" />
                    Guardrail: {policyTemplate.name}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-black/55">{policyTemplate.description}</p>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-black/38">
                    {policyTemplate.decision.replaceAll("_", " ")} · {policyTemplate.action_pattern}
                  </p>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <InstallState label="Workflow" active={workflowInstalled} />
                  <InstallState label="Policy" active={policyInstalled} />
                </div>

                <form action={installRunbookPack} className="mt-5">
                  <input type="hidden" name="organizationId" value={organization.id} />
                  <input type="hidden" name="packKey" value={key} />
                  <PendingButton
                    pendingText="Installing..."
                    className="h-10 rounded-lg bg-[#17211c] px-3 text-sm font-semibold text-white"
                  >
                    <Sparkles size={16} />
                    {installed ? "Reinstall guardrail" : "Install runbook"}
                  </PendingButton>
                </form>
              </article>
            ))}
          </div>

          <div className="space-y-6">
            <Panel title="Operational signals" icon={FileText}>
              <div className="space-y-3">
                {packRows.map(({ key, pack }) => (
                  <div key={key} className="rounded-lg border border-black/10 p-4">
                    <p className="font-semibold">{pack.title}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {pack.signals.map((signal) => (
                        <span key={signal} className="rounded-md border border-black/10 bg-[#f8faf5] px-2 py-1 text-xs font-semibold text-black/52">
                          {signal}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Runbook audit" icon={BookOpenCheck}>
              <div className="divide-y divide-black/8 rounded-lg border border-black/10">
                {(auditLogs ?? []).map((log) => (
                  <div key={log.id} className="p-4">
                    <p className="font-semibold">{log.event_summary}</p>
                    <p className="mt-1 text-sm text-black/50">
                      {log.event_type.replaceAll("_", " ")} · {formatDate(log.created_at)}
                    </p>
                  </div>
                ))}
                {(auditLogs ?? []).length === 0 && (
                  <p className="p-4 text-sm text-black/48">Runbook installations will appear here.</p>
                )}
              </div>
            </Panel>
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

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-black/10 bg-[#f8faf5] p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/38">{label}</p>
      <p className="mt-2 text-sm font-semibold text-black/70">{value}</p>
    </div>
  );
}

function InstallState({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md border px-2 py-1 text-xs font-semibold",
        active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-zinc-200 bg-zinc-50 text-zinc-700",
      )}
    >
      {label}: {active ? "installed" : "not installed"}
    </span>
  );
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
