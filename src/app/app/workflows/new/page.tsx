import { redirect } from "next/navigation";
import { CheckCircle2, GitBranch, ShieldCheck, Workflow } from "lucide-react";
import { createWorkflowFromTemplate } from "@/app/app/workflows/actions";
import { WorkflowGenerator } from "@/app/app/workflows/new/workflow-generator";
import { PageHeader } from "@/components/dashboard/page-header";
import { PendingButton } from "@/components/ui/pending-button";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { workflowTemplates } from "@/lib/workflow-templates";

export default async function NewWorkflowPage({
  searchParams,
}: {
  searchParams: Promise<{ desc?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect("/auth/sign-in?message=Sign in to create workflows.");
  }

  const organization = await ensureWorkspace(supabase, userData.user);
  const params = await searchParams;

  return (
    <main className="min-h-screen px-4 py-6 text-[#151914] md:px-8">
      <div className="mx-auto max-w-6xl">
        <PageHeader
          crumbs={[{ label: "IT" }, { label: "Workflows", href: "/app/workflows" }, { label: "New" }]}
          title="New workflow"
          description="Describe it in plain English and let AI draft it — or start from a template."
        />

        <div className="mt-6">
          <WorkflowGenerator organizationId={organization.id} initialDescription={params.desc ?? ""} />
        </div>

        <div className="mt-8 mb-3 flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-500">Or start from a template</span>
          <span className="h-px flex-1 bg-black/[0.08]" />
        </div>

        <section className="grid gap-4 md:grid-cols-2">
          {Object.entries(workflowTemplates).map(([key, template]) => (
            <form key={key} action={createWorkflowFromTemplate} className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
              <input type="hidden" name="organizationId" value={organization.id} />
              <input type="hidden" name="templateKey" value={key} />
              <div className="flex gap-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#e7f0ff] text-[#0b5f91]">
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
                    className="mt-2 h-11 w-full rounded-lg border border-black/10 bg-[#f5f8fc] px-3 text-sm font-medium outline-none focus:border-[#0b2a4a]"
                  />
                </label>
                <label className="text-sm font-semibold">
                  Description
                  <textarea
                    name="description"
                    defaultValue={template.description}
                    rows={3}
                    className="mt-2 w-full resize-none rounded-lg border border-black/10 bg-[#f5f8fc] px-3 py-2 text-sm font-medium leading-6 outline-none focus:border-[#0b2a4a]"
                  />
                </label>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <Fact icon={GitBranch} label="Graph" value={`${template.graph.nodes.length} steps`} />
                <Fact icon={ShieldCheck} label="Trigger" value={template.trigger_type} />
                <Fact icon={CheckCircle2} label="Mode" value="active" />
              </div>

              <label className="mt-5 flex items-center gap-2 text-sm font-semibold text-black/62">
                <input name="isActive" type="checkbox" defaultChecked className="size-4 accent-[#0b2a4a]" />
                Activate after creation
              </label>

              <PendingButton
                pendingText="Creating..."
                className="mt-5 h-10 w-full rounded-lg bg-[#0b2a4a] px-3 text-sm font-semibold text-white"
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
    <div className="rounded-lg border border-black/10 bg-[#f5f8fc] p-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-black/38">
        <Icon size={14} />
        {label}
      </div>
      <p className="mt-2 truncate text-sm font-semibold text-black/68">{value}</p>
    </div>
  );
}
