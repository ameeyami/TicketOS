import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Cable, CheckCircle2, LockKeyhole } from "lucide-react";
import { updateIntegrationStatus } from "@/app/app/integrations/actions";
import { PageHeader } from "@/components/dashboard/page-header";
import { ensureWorkspace } from "@/lib/supabase/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { PendingButton } from "@/components/ui/pending-button";

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
    <main className="min-h-screen bg-[#f4f8fb] px-4 py-5 text-[#07111f] md:px-8">
      <div className="mx-auto max-w-6xl">
        <PageHeader
          crumbs={[{ label: "IT" }, { label: "Applications" }]}
          title="Applications"
          description="Connect IT systems with a verified workspace or tenant ID."
        />

        <section className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(integrations ?? []).filter((integration) => integration.provider_key !== "anthropic").map((integration) => {
            const config = integration.config as {
              connection_id?: string;
              admin_email?: string | null;
              connection_note?: string | null;
            } | null;
            const isConnected = integration.status === "connected";

            return (
              <div key={integration.id} className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Cable size={18} className="text-[#0b5f91]" />
                      <h2 className="text-lg font-semibold">{integration.display_name}</h2>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">{integration.scopes?.join(", ") || "No scopes"}</p>
                  </div>
                  <span
                    className={cn(
                      "rounded-md px-2 py-1 text-xs font-semibold",
                      isConnected
                        ? "bg-emerald-50 text-emerald-700"
                        : integration.status === "disabled"
                          ? "bg-rose-50 text-rose-700"
                          : "bg-[#e7f3ff] text-[#0b5f91]",
                    )}
                  >
                    {integration.status.replaceAll("_", " ")}
                  </span>
                </div>

                {isConnected ? (
                  <div className="mt-4 rounded-md border border-black/10 bg-[#f8fbfe] p-3 text-sm">
                    <p className="font-semibold">ID: {config?.connection_id ?? "Not saved"}</p>
                    {config?.admin_email && <p className="mt-1 text-black/50">{config.admin_email}</p>}
                    {config?.connection_note && <p className="mt-2 text-black/50">Note: {config.connection_note}</p>}
                  </div>
                ) : (
                  <form action={updateIntegrationStatus} className="mt-4 space-y-3">
                    <input type="hidden" name="integrationId" value={integration.id} />
                    <input type="hidden" name="status" value="connected" />
                    <input
                      name="connectionId"
                      required
                      placeholder={connectionPlaceholder(integration.provider_key)}
                      className="h-10 w-full rounded-md border border-black/10 bg-white px-3 text-sm outline-none"
                    />
                    <input
                      name="adminEmail"
                      type="email"
                      placeholder="Admin email (optional)"
                      className="h-10 w-full rounded-md border border-black/10 bg-white px-3 text-sm outline-none"
                    />
                    <input
                      name="note"
                      placeholder="Setup note or ticket reference (optional)"
                      className="h-10 w-full rounded-md border border-black/10 bg-white px-3 text-sm outline-none"
                    />
                    <PendingButton
                      pendingText="Connecting..."
                      className="inline-flex h-9 items-center gap-2 rounded-md bg-[#0b2a4a] px-3 text-sm font-semibold text-white"
                    >
                      <CheckCircle2 size={15} />
                      Connect
                    </PendingButton>
                  </form>
                )}

                <div className="mt-5 flex gap-2">
                  <Link
                    href={`/app/integrations/${integration.id}`}
                    className="inline-flex h-9 items-center gap-2 rounded-md border border-black/10 bg-white px-3 text-sm font-semibold"
                  >
                    Actions
                    <ArrowRight size={15} />
                  </Link>
                  <IntegrationButton id={integration.id} status="disabled" label="Disable" />
                </div>
              </div>
            );
          })}
        </section>
      </div>
    </main>
  );
}

function IntegrationButton({
  id,
  status,
  label,
}: {
  id: string;
  status: "connected" | "disabled";
  label: string;
}) {
  return (
    <form action={updateIntegrationStatus}>
      <input type="hidden" name="integrationId" value={id} />
      <input type="hidden" name="status" value={status} />
      <PendingButton
        pendingText={label === "Connect" ? "Connecting..." : "Disabling..."}
        className={cn(
          "inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold",
          status === "connected"
            ? "bg-[#0b2a4a] text-white"
            : "border border-black/10 bg-white text-[#07111f]",
        )}
      >
        {status === "connected" ? <CheckCircle2 size={15} /> : <LockKeyhole size={15} />}
        {label}
      </PendingButton>
    </form>
  );
}

function connectionPlaceholder(providerKey: string) {
  const labels: Record<string, string> = {
    github: "GitHub organization ID",
    slack: "Slack workspace ID",
    teams: "Microsoft tenant ID",
    okta: "Okta domain or tenant ID",
    jira: "Jira site ID",
    "google-workspace": "Google customer ID",
  };

  return labels[providerKey] ?? "Workspace or app ID";
}
