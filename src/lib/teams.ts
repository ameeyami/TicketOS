import type { User } from "@supabase/supabase-js";
import type { createSupabaseServerClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export const DEFAULT_TEAMS = [
  { name: "IT", slug: "it", description: "Helpdesk, identity, and device support.", color: "#0b5f91" },
  { name: "Operations", slug: "operations", description: "Onboarding, offboarding, and access operations.", color: "#0f7a5f" },
  { name: "Governance", slug: "governance", description: "Security, policy, and audit oversight.", color: "#5b4bc4" },
] as const;

export const TEAM_ROLES = ["owner", "admin", "operator", "viewer"] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];

export const roleLabels: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  operator: "Operator",
  viewer: "Viewer",
};

export const roleDescriptions: Record<string, string> = {
  owner: "Full control of the team and its members.",
  admin: "Manage the team, members, and tickets.",
  operator: "Create and work tickets for the team.",
  viewer: "Read-only access to the team's tickets.",
};

/** Owner/Admin can manage a team's settings + members. */
export function canManageRole(role: string | null | undefined): boolean {
  return role === "owner" || role === "admin";
}

/** Anyone except a viewer can act on tickets (create, resolve, run). */
export function canActRole(role: string | null | undefined): boolean {
  return Boolean(role) && role !== "viewer";
}

export type TeamRecord = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
};

export type TeamMemberRecord = {
  id: string;
  team_id: string;
  user_id: string | null;
  member_email: string;
  member_name: string | null;
  role: string;
  created_at: string;
};

export type TeamContext = {
  teams: TeamRecord[];
  members: TeamMemberRecord[];
  myTeamIds: Set<string>;
  orgRole: string;
  isOrgManager: boolean;
  email: string;
};

export async function loadTeamContext(
  supabase: SupabaseClient,
  organizationId: string,
  user: User,
): Promise<TeamContext> {
  const email = (user.email ?? "").toLowerCase();
  const [{ data: teams }, { data: members }, { data: orgMember }] = await Promise.all([
    supabase
      .from("teams")
      .select("id, name, slug, description, color")
      .eq("organization_id", organizationId)
      .order("name"),
    supabase
      .from("team_members")
      .select("id, team_id, user_id, member_email, member_name, role, created_at")
      .eq("organization_id", organizationId)
      .order("created_at"),
    supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", organizationId)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const memberRows = (members ?? []) as TeamMemberRecord[];
  const myTeamIds = new Set(
    memberRows
      .filter((m) => m.user_id === user.id || (m.member_email ?? "").toLowerCase() === email)
      .map((m) => m.team_id),
  );
  const orgRole = orgMember?.role ?? "operator";

  return {
    teams: (teams ?? []) as TeamRecord[],
    members: memberRows,
    myTeamIds,
    orgRole,
    isOrgManager: orgRole === "owner" || orgRole === "admin",
    email,
  };
}

/** App-level scoping: who can see a ticket given their team context. */
export function canSeeTicket(
  ticket: { requesting_team_id?: string | null; assigned_team_id?: string | null },
  ctx: Pick<TeamContext, "myTeamIds" | "isOrgManager">,
): boolean {
  if (ctx.isOrgManager) return true;
  if (!ticket.requesting_team_id && !ticket.assigned_team_id) return true; // unassigned / legacy
  return (
    (ticket.requesting_team_id ? ctx.myTeamIds.has(ticket.requesting_team_id) : false) ||
    (ticket.assigned_team_id ? ctx.myTeamIds.has(ticket.assigned_team_id) : false)
  );
}
