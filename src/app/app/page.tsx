import { CommandCenter } from "@/components/dashboard/command-center";
import type { SetupStep } from "@/components/dashboard/setup-checklist";
import { getOrgAnthropicKeyMeta, getOrgVoyageMeta } from "@/lib/ai/org-key";
import { hasServiceRole } from "@/lib/supabase/admin";
import { ensureWorkspace, getDashboardData } from "@/lib/supabase/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AppPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; view?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    redirect("/auth/sign-in?message=Sign in to open the TicketOS command center.");
  }

  const params = await searchParams;
  const organization = await ensureWorkspace(supabase, data.user);
  const dashboardData = await getDashboardData(data.user, {
    query: params.q,
    view: params.view,
  });
  const { connected: aiKeyConnected } = await getOrgAnthropicKeyMeta(supabase, organization.id);

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organization.id)
    .eq("user_id", data.user.id)
    .maybeSingle();
  const canApprove = membership ? ["owner", "admin"].includes(membership.role) : false;

  const [{ count: kbCount }, { count: memberCount }, voyage] = await Promise.all([
    supabase.from("knowledge_articles").select("id", { count: "exact", head: true }).eq("organization_id", organization.id),
    supabase.from("organization_members").select("user_id", { count: "exact", head: true }).eq("organization_id", organization.id),
    getOrgVoyageMeta(supabase, organization.id),
  ]);

  const setup: SetupStep[] = [
    { key: "claude", label: "Connect Claude", done: aiKeyConnected, href: "/app/diagnostics", hint: "Powers triage, Copilot, Ask & drafts" },
    { key: "kb", label: "Add knowledge", done: (kbCount ?? 0) > 0, href: "/app/knowledge", hint: "So the assistant can deflect" },
    { key: "team", label: "Invite your team", done: (memberCount ?? 0) > 1, href: "/app/team", hint: "Add operators & set roles" },
    { key: "app", label: "Connect Slack or Jira", done: Boolean(process.env.SLACK_BOT_TOKEN || process.env.JIRA_BASE_URL), href: "/app/apps", hint: "Real execution with rollback" },
    { key: "api", label: "Turn on API & widget", done: hasServiceRole(), href: "/app/api-keys", hint: "Headless API + embeddable widget" },
    { key: "semantic", label: "Semantic search", done: voyage.active, href: "/app/knowledge", hint: "Match questions by meaning" },
  ];

  return <CommandCenter data={dashboardData} aiKeyConnected={aiKeyConnected} canApprove={canApprove} setup={setup} />;
}
