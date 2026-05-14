import { CommandCenter } from "@/components/dashboard/command-center";
import { getDashboardData } from "@/lib/supabase/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AppPage() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    redirect("/auth/sign-in?message=Sign in to open the TicketOS command center.");
  }

  const dashboardData = await getDashboardData(data.user);

  return <CommandCenter data={dashboardData} />;
}
