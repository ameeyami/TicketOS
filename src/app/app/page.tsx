import { CommandCenter } from "@/components/dashboard/command-center";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AppPage() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/sign-in?message=Sign in to open the TicketOS command center.");
  }

  return <CommandCenter />;
}
