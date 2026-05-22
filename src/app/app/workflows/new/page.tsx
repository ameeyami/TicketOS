import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, GitBranch, ShieldCheck, Workflow } from "lucide-react";
import { createWorkflowFromTemplate } from "@/app/app/workflows/actions";
import { PendingButton } from "@/components/ui/pending-button";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { workflowTemplates } from "@/lib/workflow-templates";

export default async function NewWorkflowPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect("/auth/sign-in?message=Sign in to create workflows.");
  }

  const organization = await ensureWorkspace(supabase, userData.user);

  return (
    <main className="min-h-screen bg-[#f6f7f2] px-4 py-6 text-[#151914] md:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/app/workflows"
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-black/10 bg-white px-3 text-sm font-semibold"
        >
          <ArrowLeft size={16} />
          Workflow library
        </Link>

        <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#47685d]">Workflow templates</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">Create governed automations.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-black/56">
              Start from an IT operations template, then inspect the generated graph and execution guardrails.
            </p>
          </div>
          <div className="rounded-lg border border-black/10 bg-white px-4 py-3 text-sm font-semibold">
            {organization.name}
          </div>
        </div>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          {Object.entries(workflowTemplates).map(([key, template]) => (
            <form key={key} action={createWorkflowFromTemplate} className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
              <input type="hidden" name="organizationId" value={organization.id} />
              <input type="hidden" name="templateKey" value={key} />
              <div className="flex gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#eef5ea] text-[#2e6658]">
                  <Workflow size={20} />
                </span>
                <div>
                  <h2 className="text-lg font-semibold">{template.name}</h2>
                  <p className="mt-1 text-sm leading-6 text-black/55">{template.description}</p>
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                <label className="text-sm font-semibold">
                  Workflow name
                  <input
                    name="name"
                    defaultValue={template.name}
                    className="mt-2 h-11 w-full rounded-lg border border-black/10 bg-[#f8faf5] px-3 text-sm font-medium outline-none focus:border-[#2f6f60]"
                  />
                </label>
                <label className="text-sm font-semibold">
                  Description
                  <textarea
                    name="description"
                    defaultValue={template.description}
                    rows={3}
                    className="mt-2 w-full resize-none rounded-lg border border-black/10 bg-[#f8faf5] px-3 py-2 text-sm font-medium leading-6 outline-none focus:border-[#2f6f60]"
                  />
                </label>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <Fact icon={GitBranch} label="Graph" value={`${template.graph.nodes.length} steps`} />
                <Fact icon={ShieldCheck} label="Trigger" value={template.trigger_type} />
                <Fact icon={CheckCircle2} label="Mode" value="active" />
              </div>

              <label className="mt-5 flex items-center gap-2 text-sm font-semibold text-black/62">
                <input name="isActive" type="checkbox" defaultChecked className="size-4 accent-[#2f6f60]" />
                Activate after creation
              </label>

              <PendingButton
                pendingText="Creating..."
                className="mt-5 h-10 w-full rounded-lg bg-[#17211c] px-3 text-sm font-semibold text-white"
              >
                Create workflow
              </PendingButton>
            </form>
          ))}
        </section>
      </div>
    </main>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Workflow;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-black/10 bg-[#f8faf5] p-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-black/38">
        <Icon size={14} />
        {label}
      </div>
      <p className="mt-2 truncate text-sm font-semibold text-black/68">{value}</p>
    </div>
  );
}
