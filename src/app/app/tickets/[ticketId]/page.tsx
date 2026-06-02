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

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", detail.ticket.organization_id)
    .eq("user_id", data.user.id)
    .maybeSingle();
  const canApprove = membership ? ["owner", "admin"].includes(membership.role) : false;

  return <TicketDetailView data={detail} canApprove={canApprove} />;
}
