"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, KeyRound, Loader2, Plus, Trash2, TriangleAlert } from "lucide-react";
import { createApiKey, revokeApiKey } from "@/app/app/api-keys/actions";
import { PendingButton } from "@/components/ui/pending-button";

export type ApiKeyRow = {
  id: string;
  name: string;
  last_four: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

export function ApiKeyManager({ keys, enabled }: { keys: ApiKeyRow[]; enabled: boolean }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function onCreate() {
    if (creating) return;
    setCreating(true);
    setError(null);
    setNewToken(null);
    try {
      const result = await createApiKey(name);
      if (result.ok && result.token) {
        setNewToken(result.token);
        setName("");
        router.refresh();
      } else {
        setError(result.error ?? "Couldn't create the key.");
      }
    } finally {
      setCreating(false);
    }
  }

  async function copyToken() {
    if (!newToken) return;
    await navigator.clipboard.writeText(newToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div>
      {enabled && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Key name (e.g. Zapier, internal portal)"
            className="h-10 flex-1 rounded-lg border border-black/10 bg-white px-3 text-sm outline-none focus:border-[#0b2a4a]"
          />
          <button
            type="button"
            onClick={onCreate}
            disabled={creating}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#0b2a4a] px-4 text-sm font-semibold text-white transition hover:bg-[#07111f] disabled:opacity-50"
          >
            {creating ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            Create key
          </button>
        </div>
      )}

      {error && (
        <p className="mt-3 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          <TriangleAlert size={15} />
          {error}
        </p>
      )}

      {newToken && (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
            <Check size={15} />
            Key created — copy it now. You won&apos;t see it again.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-md border border-emerald-200 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-700">
              {newToken}
            </code>
            <button
              type="button"
              onClick={copyToken}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-emerald-600 px-2.5 text-xs font-semibold text-white"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 space-y-2">
        {keys.length === 0 && (
          <p className="rounded-lg border border-dashed border-black/15 p-4 text-sm text-slate-500">
            No API keys yet.{enabled ? " Create one above to start calling the API." : ""}
          </p>
        )}
        {keys.map((key) => (
          <div
            key={key.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-black/10 bg-white p-3"
          >
            <div className="flex items-center gap-3">
              <span className="flex size-8 items-center justify-center rounded-lg bg-[#e7f0ff] text-[#0b5f91]">
                <KeyRound size={15} />
              </span>
              <div>
                <p className="text-sm font-semibold">
                  {key.name} <span className="font-mono text-xs text-slate-400">••••{key.last_four}</span>
                </p>
                <p className="text-xs text-slate-400">
                  Created {new Date(key.created_at).toLocaleDateString()} ·{" "}
                  {key.revoked_at
                    ? "Revoked"
                    : key.last_used_at
                      ? `Last used ${new Date(key.last_used_at).toLocaleDateString()}`
                      : "Never used"}
                </p>
              </div>
            </div>
            {key.revoked_at ? (
              <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-500">
                Revoked
              </span>
            ) : (
              enabled && (
                <form action={revokeApiKey}>
                  <input type="hidden" name="id" value={key.id} />
                  <PendingButton
                    pendingText="..."
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-rose-200 bg-white px-2.5 text-xs font-semibold text-rose-700"
                  >
                    <Trash2 size={13} />
                    Revoke
                  </PendingButton>
                </form>
              )
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
