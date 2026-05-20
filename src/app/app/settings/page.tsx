import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Building2, ShieldCheck } from "lucide-react";
import { updateWorkspaceSettings } from "@/app/app/settings/actions";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PendingButton } from "@/components/ui/pending-button";

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect("/auth/sign-in?message=Sign in to manage settings.");
  }

  const organization = await ensureWorkspace(supabase, userData.user);
  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organization.id)
    .eq("user_id", userData.user.id)
    .maybeSingle();

  return (
    <main className="min-h-screen bg-[#f6f7f2] px-4 py-6 text-[#151914] md:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/app"
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-black/10 bg-white px-3 text-sm font-semibold"
        >
          <ArrowLeft size={16} />
          Command center
        </Link>

        <section className="mt-6 rounded-xl border border-black/10 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-[#eef5ea] text-[#2e6658]">
              <Building2 size={18} />
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Workspace settings</h1>
              <p className="mt-1 text-sm text-black/52">Update the operational workspace used across TicketOS.</p>
            </div>
          </div>

          <form action={updateWorkspaceSettings} className="mt-8 space-y-5">
            <input type="hidden" name="organizationId" value={organization.id} />
            <label className="block">
              <span className="text-sm font-semibold">Workspace name</span>
              <input
                name="name"
                defaultValue={organization.name}
                required
                className="mt-2 h-12 w-full rounded-lg border border-black/10 px-3 text-sm outline-none focus:border-[#2f6f60] focus:ring-4 focus:ring-[#2f6f60]/10"
              />
            </label>
            <PendingButton
              pendingText="Saving..."
              className="h-10 rounded-lg bg-[#17211c] px-4 text-sm font-semibold text-white"
            >
              Save settings
            </PendingButton>
          </form>
        </section>

        <section className="mt-6 rounded-xl border border-black/10 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-[#2f6f60]" />
            <h2 className="text-lg font-semibold">Access profile</h2>
          </div>
          <div className="mt-4 grid gap-3 text-sm text-black/58">
            <p>Email: {userData.user.email}</p>
            <p>Role: {membership?.role ?? "operator"}</p>
            <p>Tenant isolation: active through Supabase Row Level Security</p>
          </div>
        </section>
      </div>
    </main>
  );
}
