"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const memberRoles = new Set(["owner", "admin", "operator", "viewer"]);

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

function revalidateTeamViews() {
  revalidatePath("/app");
  revalidatePath("/app/team");
  revalidatePath("/app/settings");
  revalidatePath("/app/audit");
}
