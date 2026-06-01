import { AppShell } from "@/components/dashboard/app-shell";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function TicketOSAppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  let orgName = "Workspace";
  if (data?.user) {
    const organization = await ensureWorkspace(supabase, data.user);
    orgName = organization.name;
  }

  return <AppShell orgName={orgName}>{children}</AppShell>;
}
