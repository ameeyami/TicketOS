import { CommandCenter } from "@/components/dashboard/command-center";
import { getDashboardData } from "@/lib/supabase/bootstrap";
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
  const dashboardData = await getDashboardData(data.user, {
    query: params.q,
    view: params.view,
  });

  return <CommandCenter data={dashboardData} />;
}
