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
}
