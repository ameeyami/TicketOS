"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type OAuthProvider = "google" | "github" | "azure";

const providerLabels: Record<OAuthProvider, string> = {
  google: "Google",
  github: "GitHub",
  azure: "Microsoft/Azure",
};

export async function signInWithProvider(formData: FormData) {
  const provider = String(formData.get("provider") ?? "") as OAuthProvider;
  const label = providerLabels[provider];

  if (!label) {
    redirectWithError("Unsupported login provider.");
  }

  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin") ?? "https://ticketos.vercel.app";
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/auth/callback?next=/app`,
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url) {
    redirectWithError(
      `${label} login could not start. Make sure ${label} is enabled in Supabase → Authentication → Providers.`,
    );
  }

  // Hand off to Supabase's OAuth authorize URL (it redirects to the provider).
  const redirectUrl = new URL(data.url);
  redirectUrl.searchParams.delete("skip_http_redirect");
  redirect(redirectUrl.toString());
}

function redirectWithError(message: string): never {
  redirect(`/auth/sign-in?error=${encodeURIComponent(message)}`);
}
