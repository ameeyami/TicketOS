import { redirect } from "next/navigation";
import {
  BadgeCheck,
  CheckCircle2,
  Clock3,
  Eye,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  Trash2,
  UserCog,
  UserPlus,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cancelInvite, inviteMember, removeMember, updateMemberRole } from "@/app/app/team/actions";
import { PageHeader } from "@/components/dashboard/page-header";
import { PendingButton } from "@/components/ui/pending-button";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const roleStyles: Record<string, string> = {
  owner: "border-[#0b2a4a]/20 bg-[#e7f0ff] text-[#0b2a4a]",
  admin: "border-sky-200 bg-sky-50 text-sky-700",
  operator: "border-amber-200 bg-amber-50 text-amber-800",
  viewer: "border-zinc-200 bg-zinc-50 text-zinc-700",
};

const roleCards = [
  {
    role: "owner",
    title: "Owner",
    detail: "Full control",
    icon: KeyRound,
  },
  {
    role: "admin",
    title: "Admin",
    detail: "Manage workspace",
    icon: ShieldCheck,
  },
  {
    role: "operator",
    title: "Operator",
    detail: "Run operations",
    icon: UserCog,
  },
  {
    role: "viewer",
    title: "Viewer",
    detail: "Read only",
    icon: Eye,
  },
];

export default async function TeamPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect("/auth/sign-in?message=Sign in to manage the TicketOS team.");
  }

  const organization = await ensureWorkspace(supabase, userData.user);
  const [{ data: memberships }, { data: auditLogs }, { data: currentMembership }] = await Promise.all([
    supabase
      .from("organization_members")
      .select("id, user_id, role, invited_by, created_at, updated_at")
      .eq("organization_id", organization.id)
      .order("created_at"),
    supabase
      .from("audit_logs")
      .select("*")
      .eq("organization_id", organization.id)
      .in("event_type", ["team_role_updated", "team_member_removed", "team_invite_sent", "team_invite_cancelled", "workspace_updated"])
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", organization.id)
      .eq("user_id", userData.user.id)
      .maybeSingle(),
  ]);

  const memberRows = memberships ?? [];
  const currentRole = currentMembership?.role ?? "operator";
  const canManage = currentRole === "owner" || currentRole === "admin";
  const ownerCount = memberRows.filter((member) => member.role === "owner").length;
  const elevatedCount = memberRows.filter((member) => member.role === "owner" || member.role === "admin").length;
  const cancelledInviteTokens = new Set(
    (auditLogs ?? [])
      .filter((log) => log.event_type === "team_invite_cancelled")
      .map((log) => String(log.metadata?.invite_token ?? ""))
      .filter(Boolean),
  );
  const pendingInvites = (auditLogs ?? []).filter(
    (log) =>
      log.event_type === "team_invite_sent" &&
      !cancelledInviteTokens.has(String(log.metadata?.invite_token ?? "")),
  );

  return (
    <main className="min-h-screen px-4 py-6 text-[#151914] md:px-8">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          crumbs={[{ label: "Settings" }, { label: "Team" }]}
          title="Team"
          description="Members and roles."
        />

        <section className="mt-6 grid gap-3 md:grid-cols-4">
          <MetricCard label="Members" value={String(memberRows.length)} icon={UsersRound} />
          <MetricCard label="Owners" value={String(ownerCount)} icon={KeyRound} />
          <MetricCard label="Privileged" value={String(elevatedCount)} icon={ShieldCheck} />
          <MetricCard label="Policy state" value={canManage ? "Editable" : "Read only"} icon={CheckCircle2} />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_.68fr]">
          <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 border-b border-black/8 pb-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Workspace members</h2>
                <p className="mt-1 text-sm text-black/52">{organization.name} access is enforced by Supabase RLS.</p>
              </div>
              <span
                className={cn(
                  "inline-flex w-fit items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold",
                  canManage ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-zinc-200 bg-zinc-50 text-zinc-700",
                )}
              >
                <LockKeyhole size={14} />
                {canManage ? "Role management enabled" : "Viewing permissions"}
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {memberRows.map((member) => {
                const isCurrentUser = member.user_id === userData.user.id;
                const cannotRemove = isCurrentUser || (member.role === "owner" && ownerCount <= 1);

                return (
                  <article key={member.id} className="rounded-lg border border-black/10 bg-[#fbfcf8] p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex min-w-0 gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#0b2a4a] text-sm font-semibold text-white">
                          {initials(isCurrentUser ? userData.user.email : member.user_id)}
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold">{isCurrentUser ? userData.user.email : `Member ${member.user_id.slice(0, 8)}`}</h3>
                            {isCurrentUser && (
                              <span className="rounded-md border border-black/10 bg-white px-2 py-1 text-xs font-semibold text-black/52">
                                You
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-black/50">
                            Joined {formatDate(member.created_at)} · Updated {formatDate(member.updated_at)}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <span
                          className={cn(
                            "inline-flex w-fit rounded-md border px-2 py-1 text-xs font-semibold",
                            roleStyles[member.role] ?? roleStyles.operator,
                          )}
                        >
                          {titleCase(member.role)}
                        </span>

                        <form action={updateMemberRole} className="flex flex-wrap gap-2">
                          <input type="hidden" name="organizationId" value={organization.id} />
                          <input type="hidden" name="memberId" value={member.id} />
                          <select
                            name="role"
                            defaultValue={member.role}
                            disabled={!canManage}
                            className="h-10 rounded-lg border border-black/10 bg-white px-3 text-sm font-semibold outline-none disabled:opacity-50"
                          >
                            <option value="owner">Owner</option>
                            <option value="admin">Admin</option>
                            <option value="operator">Operator</option>
                            <option value="viewer">Viewer</option>
                          </select>
                          <PendingButton
                            pendingText="Saving..."
                            disabled={!canManage}
                            className="h-10 rounded-lg bg-[#0b2a4a] px-3 text-sm font-semibold text-white disabled:opacity-50"
                          >
                            Save
                          </PendingButton>
                        </form>

                        <form action={removeMember}>
                          <input type="hidden" name="organizationId" value={organization.id} />
                          <input type="hidden" name="memberId" value={member.id} />
                          <PendingButton
                            pendingText="Removing..."
                            disabled={!canManage || cannotRemove}
                            className="h-10 rounded-lg border border-rose-200 bg-white px-3 text-sm font-semibold text-rose-700 disabled:opacity-45"
                          >
                            <Trash2 size={16} />
                            Remove
                          </PendingButton>
                        </form>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="space-y-6">
            <Panel title="Invite member" icon={UserPlus}>
              <form action={inviteMember} className="space-y-3">
                <input type="hidden" name="organizationId" value={organization.id} />
                <input
                  name="email"
                  type="email"
                  required
                  disabled={!canManage}
                  placeholder="teammate@company.com"
                  className="h-10 w-full rounded-lg border border-black/10 bg-white px-3 text-sm outline-none disabled:opacity-50"
                />
                <input
                  name="note"
                  disabled={!canManage}
                  placeholder="Optional note or access reason"
                  className="h-10 w-full rounded-lg border border-black/10 bg-white px-3 text-sm outline-none disabled:opacity-50"
                />
                <div className="flex gap-2">
                  <select
                    name="role"
                    defaultValue="operator"
                    disabled={!canManage}
                    className="h-10 min-w-0 flex-1 rounded-lg border border-black/10 bg-white px-3 text-sm font-semibold outline-none disabled:opacity-50"
                  >
                    <option value="admin">Admin</option>
                    <option value="operator">Operator</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <PendingButton
                    pendingText="Inviting..."
                    disabled={!canManage}
                    className="h-10 rounded-lg bg-[#0b2a4a] px-3 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    Invite
                  </PendingButton>
                </div>
              </form>
              <div className="mt-4 space-y-2">
                {pendingInvites.slice(0, 3).map((invite) => (
                  <div key={invite.id} className="rounded-lg border border-black/10 bg-[#fbfcf8] p-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold">{String(invite.metadata?.invite_email ?? "Pending invite")}</p>
                        <p className="mt-1 text-xs text-black/48">
                          {titleCase(String(invite.metadata?.role ?? "viewer"))} · Expires {formatDate(String(invite.metadata?.expires_at ?? ""))}
                        </p>
                      </div>
                      <form action={cancelInvite}>
                        <input type="hidden" name="organizationId" value={organization.id} />
                        <input type="hidden" name="inviteToken" value={String(invite.metadata?.invite_token ?? "")} />
                        <input type="hidden" name="inviteEmail" value={String(invite.metadata?.invite_email ?? "")} />
                        <PendingButton
                          pendingText="Canceling..."
                          disabled={!canManage}
                          className="h-8 rounded-md border border-black/10 bg-white px-2 text-xs font-semibold text-black/62 disabled:opacity-50"
                        >
                          Cancel
                        </PendingButton>
                      </form>
                    </div>
                    {invite.metadata?.note && (
                      <p className="mt-2 rounded-md border border-black/10 bg-white px-2 py-1 text-xs text-black/52">
                        {String(invite.metadata.note)}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-black/48">
                      Token: {String(invite.metadata?.invite_token ?? "not generated").slice(0, 8)}
                    </p>
                  </div>
                ))}
                {pendingInvites.length === 0 && <p className="text-sm text-black/48">No pending invites.</p>}
              </div>
            </Panel>

            <Panel title="Role boundaries" icon={BadgeCheck}>
              <div className="grid gap-3">
                {roleCards.map((role) => (
                  <div key={role.role} className="flex items-center justify-between rounded-lg border border-black/10 p-3">
                    <div className="flex items-center gap-2">
                      <span className="flex size-8 items-center justify-center rounded-lg bg-[#e7f0ff] text-[#0b5f91]">
                        <role.icon size={16} />
                      </span>
                      <div>
                        <p className="font-semibold">{role.title}</p>
                        <p className="text-xs text-black/48">{role.detail}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Access audit" icon={Clock3}>
              <div className="divide-y divide-black/8 rounded-lg border border-black/10">
                {(auditLogs ?? []).map((log) => (
                  <div key={log.id} className="p-4">
                    <p className="font-semibold">{log.event_summary}</p>
                    <p className="mt-1 text-sm text-black/50">
                      {titleCase(log.event_type.replaceAll("_", " "))} · {formatDate(log.created_at)}
                    </p>
                  </div>
                ))}
                {(auditLogs ?? []).length === 0 && (
                  <p className="p-4 text-sm text-black/48">Team changes will appear here.</p>
                )}
              </div>
            </Panel>
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-black/52">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
        </div>
        <span className="flex size-9 items-center justify-center rounded-lg bg-[#e7f0ff] text-[#0b5f91]">
          <Icon size={20} />
        </span>
      </div>
    </div>
  );
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-lg bg-[#e7f0ff] text-[#0b5f91]">
          <Icon size={18} />
        </span>
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function initials(value: string | null | undefined) {
  if (!value) {
    return "TO";
  }

  const cleanValue = value.includes("@") ? value.split("@")[0] : value;
  return cleanValue
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Not recorded";
  }

  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function titleCase(value: string) {
  return value
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
