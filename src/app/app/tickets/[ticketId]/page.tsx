import { redirect } from "next/navigation";
import { TicketDetailView } from "@/components/tickets/ticket-detail-view";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getTicketDetail } from "@/lib/supabase/ticket-detail";

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    redirect("/auth/sign-in?message=Sign in to inspect ticket execution.");
  }

  const { ticketId } = await params;
  const detail = await getTicketDetail(ticketId);

  return <TicketDetailView data={detail} />;
}
