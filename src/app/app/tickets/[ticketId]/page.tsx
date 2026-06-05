import { redirect } from "next/navigation";
import { TicketDetailView } from "@/components/tickets/ticket-detail-view";
import { loadAssist } from "@/lib/ai/assist";
import { getOrgVoyageKey } from "@/lib/ai/org-key";
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

  const voyageKey = await getOrgVoyageKey(supabase, detail.ticket.organization_id);
  const assistData = await loadAssist(supabase, detail.ticket, voyageKey);
  const assist = {
    mode: assistData.mode,
    similarTickets: assistData.similarTickets,
    suggestedArticles: assistData.suggestedArticles.map((a) => ({
      id: a.id,
      title: a.title,
      snippet: a.body.length > 160 ? `${a.body.slice(0, 160)}…` : a.body,
    })),
  };

  return <TicketDetailView data={detail} canApprove={canApprove} assist={assist} />;
}
