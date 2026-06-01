"use server";

import { redirect } from "next/navigation";
import { createAnthropicClient, hasAnthropicKey } from "@/lib/ai/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function testAiConnection() {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    redirect("/auth/sign-in?message=Sign in to test AI status.");
  }

  if (!hasAnthropicKey()) {
    redirect("/app/diagnostics?status=nokey");
  }

  const model = process.env.TICKETOS_TRIAGE_MODEL ?? "claude-opus-4-8";
  let status = "ok";
  let detail = "";

  try {
    const client = createAnthropicClient();
    const response = await client.messages.create({
      model,
      max_tokens: 16,
      messages: [{ role: "user", content: "Reply with just the word: OK" }],
    });
    const text = response.content.find((block) => block.type === "text");
    detail = text && text.type === "text" ? text.text.trim().slice(0, 60) : "(connected, no text returned)";
  } catch (error) {
    status = "error";
    const e = error as { name?: string; status?: number; message?: string };
    detail = `${e.name ?? "Error"}${e.status ? ` (${e.status})` : ""}: ${(e.message ?? "unknown error").slice(0, 240)}`;
  }

  redirect(`/app/diagnostics?status=${status}&model=${encodeURIComponent(model)}&detail=${encodeURIComponent(detail)}`);
}
