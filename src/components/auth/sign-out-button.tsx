"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function signOut() {
    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      router.push("/auth/sign-in");
      router.refresh();
    });
  }

  return (
    <button
      onClick={signOut}
      disabled={isPending}
      className="flex h-10 items-center gap-2 rounded-lg border border-black/10 bg-white px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
    >
      <LogOut size={16} />
      Sign out
    </button>
  );
}
