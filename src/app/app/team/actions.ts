"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const memberRoles = new Set(["owner", "admin", "operator", "viewer"]);
const managerRoles = new Set(["owner", "admin"]);

export async function inviteMember(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "viewer");
  const note = String(formData.get("note") ?? "").trim();

  if (!organizationId || !email.includes("@") || !memberRoles.has(role)) {
    throw new Error("Enter a valid email address and role.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("You must be signed in to invite team members.");
  }

  await requireTeamManager(supabase, organizationId, userData.user.id);

  const inviteToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    actor_user_id: userData.user.id,
    event_type: "team_invite_sent",
    event_summary: `Invite prepared for ${email}`,
    metadata: {
      source: "team_workspace",
      invite_email: email,
      role,
      note: note || null,
      state: "pending",
      invite_token: inviteToken,
      expires_at: expiresAt,
    },
  });

  if (error) {
    throw error;
  }

  revalidateTeamViews();
}

export async function updateMemberRole(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "");
  const memberId = String(formData.get("memberId") ?? "");
  const role = String(formData.get("role") ?? "");

  if (!organizationId || !memberId || !memberRoles.has(role)) {
    throw new Error("A valid member and role are required.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("You must be signed in to manage team roles.");
  }

  const { data: targetMember, error: targetError } = await supabase
    .from("organization_members")
    .select("id, user_id, role")
    .eq("id", memberId)
    .eq("organization_id", organizationId)
    .single();

  if (targetError) {
    throw targetError;
  }

  await requireTeamManager(supabase, organizationId, userData.user.id);

  if (targetMember.role === "owner" && role !== "owner") {
    const { count } = await supabase
      .from("organization_members")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("role", "owner");

    if ((count ?? 0) <= 1) {
      throw new Error("Keep at least one owner in the workspace.");
    }
  }

  const { error } = await supabase
    .from("organization_members")
    .update({ role })
    .eq("id", memberId)
    .eq("organization_id", organizationId);

  if (error) {
    throw error;
  }

  await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    actor_user_id: userData.user.id,
    event_type: "team_role_updated",
    event_summary: `Member role changed to ${role}`,
    metadata: {
      source: "team_workspace",
      member_id: memberId,
      target_user_id: targetMember.user_id,
      previous_role: targetMember.role,
      role,
    },
  });

  revalidateTeamViews();
}

export async function removeMember(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "");
  const memberId = String(formData.get("memberId") ?? "");

  if (!organizationId || !memberId) {
    throw new Error("A valid member is required.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("You must be signed in to remove team members.");
  }

  const { data: targetMember, error: targetError } = await supabase
    .from("organization_members")
    .select("id, user_id, role")
    .eq("id", memberId)
    .eq("organization_id", organizationId)
    .single();

  if (targetError) {
    throw targetError;
  }

  await requireTeamManager(supabase, organizationId, userData.user.id);

  if (targetMember.user_id === userData.user.id) {
    throw new Error("You cannot remove your own active session from this workspace.");
  }

  if (targetMember.role === "owner") {
    const { count } = await supabase
      .from("organization_members")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("role", "owner");

    if ((count ?? 0) <= 1) {
      throw new Error("Keep at least one owner in the workspace.");
    }
  }

  const { error } = await supabase
    .from("organization_members")
    .delete()
    .eq("id", memberId)
    .eq("organization_id", organizationId);

  if (error) {
    throw error;
  }

  await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    actor_user_id: userData.user.id,
    event_type: "team_member_removed",
    event_summary: "Team member removed",
    metadata: {
      source: "team_workspace",
      member_id: memberId,
      target_user_id: targetMember.user_id,
      role: targetMember.role,
    },
  });

  revalidateTeamViews();
}

export async function cancelInvite(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "");
  const inviteToken = String(formData.get("inviteToken") ?? "");
  const inviteEmail = String(formData.get("inviteEmail") ?? "");

  if (!organizationId || !inviteToken) {
    throw new Error("A valid invite is required.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("You must be signed in to cancel invites.");
  }

  await requireTeamManager(supabase, organizationId, userData.user.id);

  const { error } = await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    actor_user_id: userData.user.id,
    event_type: "team_invite_cancelled",
    event_summary: `Invite cancelled for ${inviteEmail || "teammate"}`,
    metadata: {
      source: "team_workspace",
      invite_email: inviteEmail || null,
      invite_token: inviteToken,
      state: "cancelled",
    },
  });

  if (error) {
    throw error;
  }

  revalidateTeamViews();
}

async function requireTeamManager(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  organizationId: string,
  userId: string,
) {
  const { data: currentMembership, error: membershipError } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .single();

  if (membershipError) {
    throw membershipError;
  }

  if (!managerRoles.has(currentMembership.role)) {
    throw new Error("Only owners and admins can manage team members.");
  }
}

function revalidateTeamViews() {
  revalidatePath("/app");
  revalidatePath("/app/team");
  revalidatePath("/app/settings");
  revalidatePath("/app/audit");
  revalidatePath("/app/tickets");
  revalidatePath("/app/tickets/new");
}

const TEAM_COLORS = ["#0b5f91", "#0f7a5f", "#5b4bc4", "#b4612f", "#0b2a4a", "#a3215b"];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export async function createTeam(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!organizationId || name.length < 2) {
    throw new Error("Enter a team name (at least 2 characters).");
  }
  const slug = slugify(slugInput || name);
  if (slug.length < 2) {
    throw new Error("Identifier must be at least 2 characters (letters or numbers).");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new Error("You must be signed in to create a team.");
  }

  const color = TEAM_COLORS[slug.length % TEAM_COLORS.length];
  const { data: team, error } = await supabase
    .from("teams")
    .insert({
      organization_id: organizationId,
      name,
      slug,
      description: description || null,
      color,
      created_by: userData.user.id,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("A team with that identifier already exists.");
    }
    throw error;
  }

  await supabase.from("team_members").insert({
    team_id: team.id,
    organization_id: organizationId,
    user_id: userData.user.id,
    member_email: (userData.user.email ?? "").toLowerCase(),
    member_name: userData.user.email ?? "",
    role: "owner",
    added_by: userData.user.id,
  });

  await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    actor_user_id: userData.user.id,
    event_type: "team_created",
    event_summary: `Team "${name}" created`,
    metadata: { source: "teams", team_id: team.id, slug },
  });

  revalidateTeamViews();
}

export async function addTeamMember(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "");
  const teamId = String(formData.get("teamId") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const memberName = String(formData.get("memberName") ?? "").trim();
  const role = String(formData.get("role") ?? "operator");

  if (!organizationId || !teamId || !email.includes("@") || !memberRoles.has(role)) {
    throw new Error("Enter a valid email address and role.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new Error("You must be signed in to add team members.");
  }

  const linkedUserId = (userData.user.email ?? "").toLowerCase() === email ? userData.user.id : null;

  const { error } = await supabase.from("team_members").insert({
    team_id: teamId,
    organization_id: organizationId,
    user_id: linkedUserId,
    member_email: email,
    member_name: memberName || email,
    role,
    added_by: userData.user.id,
  });

  if (error) {
    if (error.code === "23505") {
      throw new Error("That person is already on this team.");
    }
    throw error;
  }

  await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    actor_user_id: userData.user.id,
    event_type: "team_member_added",
    event_summary: `${email} added to a team`,
    metadata: { source: "teams", team_id: teamId, email, role },
  });

  revalidateTeamViews();
}

export async function updateTeamMemberRole(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "");
  const teamMemberId = String(formData.get("teamMemberId") ?? "");
  const role = String(formData.get("role") ?? "");

  if (!organizationId || !teamMemberId || !memberRoles.has(role)) {
    throw new Error("A valid member and role are required.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new Error("You must be signed in to manage team roles.");
  }

  const { error } = await supabase
    .from("team_members")
    .update({ role })
    .eq("id", teamMemberId)
    .eq("organization_id", organizationId);

  if (error) {
    throw error;
  }

  revalidateTeamViews();
}

export async function removeTeamMember(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "");
  const teamMemberId = String(formData.get("teamMemberId") ?? "");

  if (!organizationId || !teamMemberId) {
    throw new Error("A valid member is required.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new Error("You must be signed in to remove team members.");
  }

  const { error } = await supabase
    .from("team_members")
    .delete()
    .eq("id", teamMemberId)
    .eq("organization_id", organizationId);

  if (error) {
    throw error;
  }

  revalidateTeamViews();
}

export async function deleteTeam(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "");
  const teamId = String(formData.get("teamId") ?? "");

  if (!organizationId || !teamId) {
    throw new Error("A valid team is required.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new Error("You must be signed in to delete a team.");
  }

  const { error } = await supabase
    .from("teams")
    .delete()
    .eq("id", teamId)
    .eq("organization_id", organizationId);

  if (error) {
    throw error;
  }

  await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    actor_user_id: userData.user.id,
    event_type: "team_deleted",
    event_summary: "Team deleted",
    metadata: { source: "teams", team_id: teamId },
  });

  revalidateTeamViews();
}
