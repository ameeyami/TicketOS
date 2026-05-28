import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/app";
  const providerError = requestUrl.searchParams.get("error_description") ?? requestUrl.searchParams.get("error");

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  const message = providerError
    ? `Could not complete sign in: ${providerError.replace(/\s+/g, " ")}`
    : "Could not complete sign in. Please try again.";

  return NextResponse.redirect(new URL(`/auth/sign-in?error=${encodeURIComponent(message)}`, requestUrl.origin));
}
