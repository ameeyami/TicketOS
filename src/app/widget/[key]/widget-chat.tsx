"use client";

import { useRef, useState } from "react";
import { CheckCircle2, LifeBuoy, Loader2, Send } from "lucide-react";

type Message = { role: "user" | "assistant"; text: string; sources?: string[]; grounded?: boolean };

export function WidgetChat({ widgetKey, orgName }: { widgetKey: string; orgName: string }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", text: `Hi! I'm the ${orgName} help assistant. Ask me anything and I'll answer from our knowledge base.` },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [escalating, setEscalating] = useState(false);
  const [email, setEmail] = useState("");
  const [reference, setReference] = useState<string | null>(null);
  const [lastQuestion, setLastQuestion] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  function scrollDown() {
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }));
  }

  async function ask() {
    const question = input.trim();
    if (!question || loading) return;
    setMessages((m) => [...m, { role: "user", text: question }]);
    setInput("");
    setLastQuestion(question);
    setLoading(true);
    scrollDown();
    try {
      const res = await fetch("/api/widget/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key: widgetKey, question }),
      });
      const data = await res.json();
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: data.answer ?? "Something went wrong. Please try again.",
          sources: (data.sources ?? []).map((s: { title: string }) => s.title),
          grounded: data.grounded,
        },
      ]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: "Network error — please try again." }]);
    } finally {
      setLoading(false);
      scrollDown();
    }
  }

  async function escalate() {
    const description = lastQuestion || input.trim();
    if (!description) {
      setEscalating(true);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/widget/ticket", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key: widgetKey, question: description, email }),
      });
      const data = await res.json();
      if (res.ok && data.reference) {
        setReference(data.reference);
        setEscalating(false);
        setMessages((m) => [
          ...m,
          { role: "assistant", text: `Done — I've created ticket ${data.reference}. Someone will follow up${email ? ` at ${email}` : ""}.` },
        ]);
      } else {
        setMessages((m) => [...m, { role: "assistant", text: "Couldn't create a ticket just now. Please try again." }]);
      }
    } finally {
      setLoading(false);
      scrollDown();
    }
  }

  return (
    <div className="flex h-screen flex-col bg-[#f6f9fc] text-[#101720]">
      {/* header */}
      <header className="flex items-center gap-2 border-b border-black/10 bg-white px-4 py-3">
        <span className="flex size-8 items-center justify-center rounded-lg bg-[#e7f0ff] text-[#0b5f91]">
          <LifeBuoy size={17} />
        </span>
        <div>
          <p className="text-sm font-semibold leading-tight">{orgName} Help</p>
          <p className="text-xs text-slate-400">Answers from the knowledge base</p>
        </div>
      </header>

      {/* messages */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                m.role === "user"
                  ? "max-w-[85%] rounded-2xl rounded-br-sm bg-[#0b2a4a] px-3.5 py-2 text-sm text-white"
                  : "max-w-[88%] rounded-2xl rounded-bl-sm border border-black/10 bg-white px-3.5 py-2 text-sm leading-6 text-slate-700"
              }
            >
              <p className="whitespace-pre-wrap">{m.text}</p>
              {m.sources && m.sources.length > 0 && (
                <p className="mt-2 border-t border-black/5 pt-1.5 text-xs text-slate-400">Sources: {m.sources.join(", ")}</p>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl border border-black/10 bg-white px-3.5 py-2 text-sm text-slate-400">
              <Loader2 size={15} className="animate-spin" />
            </div>
          </div>
        )}
      </div>

      {/* escalate / footer */}
      {reference ? (
        <div className="border-t border-black/10 bg-white px-4 py-3 text-center text-sm text-emerald-700">
          <CheckCircle2 size={16} className="mr-1 inline" />
          Ticket {reference} created.
        </div>
      ) : escalating ? (
        <div className="space-y-2 border-t border-black/10 bg-white px-4 py-3">
          <p className="text-xs text-slate-500">We&apos;ll create a ticket for this. Add your email for updates (optional).</p>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="you@company.com"
            className="h-9 w-full rounded-lg border border-black/10 px-3 text-sm outline-none focus:border-[#0b2a4a]"
          />
          <div className="flex gap-2">
            <button
              onClick={escalate}
              disabled={loading}
              className="h-9 flex-1 rounded-lg bg-[#0b2a4a] text-sm font-semibold text-white disabled:opacity-50"
            >
              Create ticket
            </button>
            <button onClick={() => setEscalating(false)} className="h-9 rounded-lg border border-black/10 px-3 text-sm font-semibold text-slate-600">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="border-t border-black/10 bg-white px-3 py-3">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  ask();
                }
              }}
              rows={1}
              placeholder="Ask a question…"
              className="min-h-9 flex-1 resize-none rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-[#0b2a4a]"
            />
            <button
              onClick={ask}
              disabled={loading || !input.trim()}
              className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#0b2a4a] text-white disabled:opacity-50"
            >
              <Send size={16} />
            </button>
          </div>
          <button onClick={() => setEscalating(true)} className="mt-2 text-xs font-medium text-[#0b5f91] hover:underline">
            Can&apos;t find it? Create a ticket →
          </button>
        </div>
      )}
    </div>
  );
}
