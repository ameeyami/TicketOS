import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Cable, CheckCircle2, LockKeyhole, Power } from "lucide-react";
import { updateIntegrationStatus } from "@/app/app/integrations/actions";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export default async function IntegrationsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect("/auth/sign-in?message=Sign in to manage integrations.");
  }

  const organization = await ensureWorkspace(supabase, userData.user);
  const { data: integrations } = await supabase
    .from("integrations")
    .select("*")
    .eq("organization_id", organization.id)
    .order("display_name");

  return (
    <main className="min-h-screen bg-[#f6f7f2] px-4 py-6 text-[#151914] md:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/app"
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-black/10 bg-white px-3 text-sm font-semibold"
        >
          <ArrowLeft size={16} />
          Command center
        </Link>

        <div className="mt-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#47685d]">Integration scopes</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">Control systems agents can execute against.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-black/56">
            These controls simulate connection state for the MVP. Later, each provider will open a real OAuth/scoped
            connection flow and expose typed actions to TicketOS agents.
          </p>
        </div>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(integrations ?? []).map((integration) => (
            <div key={integration.id} className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Cable size={18} className="text-[#2f6f60]" />
                    <h2 className="text-lg font-semibold">{integration.display_name}</h2>
                  </div>
                  <p className="mt-2 text-sm text-black/52">
                    {integration.scopes?.join(", ") || "No scopes configured"}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-md px-2 py-1 text-xs font-semibold",
                    integration.status === "connected"
                      ? "bg-emerald-50 text-emerald-700"
                      : integration.status === "disabled"
                        ? "bg-rose-50 text-rose-700"
                        : "bg-zinc-100 text-zinc-600",
                  )}
                >
                  {integration.status.replaceAll("_", " ")}
                </span>
              </div>

              <div className="mt-5 flex gap-2">
                <IntegrationButton id={integration.id} status="connected" label="Connect" icon="check" />
                <IntegrationButton id={integration.id} status="disabled" label="Disable" icon="power" />
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}

function IntegrationButton({
  id,
  status,
  label,
  icon,
}: {
  id: string;
  status: "connected" | "disabled";
  label: string;
  icon: "check" | "power";
}) {
  const Icon = icon === "check" ? CheckCircle2 : Power;

  return (
    <form action={updateIntegrationStatus}>
      <input type="hidden" name="integrationId" value={id} />
      <input type="hidden" name="status" value={status} />
      <button
        type="submit"
        className={cn(
          "inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold",
          status === "connected"
            ? "bg-[#17211c] text-white"
            : "border border-black/10 bg-white text-[#151914]",
        )}
      >
        {icon === "check" ? <Icon size={15} /> : <LockKeyhole size={15} />}
        {label}
      </button>
    </form>
  );
}
