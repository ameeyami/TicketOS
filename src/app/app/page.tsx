import { CommandCenter } from "@/components/dashboard/command-center";
import { getOrgAnthropicKeyMeta } from "@/lib/ai/org-key";
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

  return <CommandCenter data={dashboardData} aiKeyConnected={aiKeyConnected} />;
}
