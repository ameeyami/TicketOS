"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";
import { TicketOSLogo } from "@/components/brand/ticketos-logo";

const navLinks = [
  ["Product", "/product"],
  ["Use cases", "/use-cases"],
  ["Integrations", "/#integrations"],
  ["Docs", "/docs"],
  ["Pricing", "/pricing"],
  ["Trust", "/trust"],
] as const;

const ACCENT_LINE = "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-[#22c55e] via-[#38bdf8] to-[#a855f7]";

export function MarketingNav() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#07111f]/70 backdrop-blur-xl">
      <span className={ACCENT_LINE} aria-hidden />
      <div className="relative mx-auto flex h-14 max-w-7xl items-center justify-between px-5 md:px-8">
        <Link href="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <TicketOSLogo markSize="md" tone="dark" />
        </Link>

        {/* Centered glass pill nav */}
        <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-0.5 rounded-full border border-white/10 bg-white/[0.05] p-1 backdrop-blur lg:flex">
          {navLinks.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="rounded-full px-3 py-1.5 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <Link
            href="/auth/sign-in"
            className="hidden rounded-full px-3 py-1.5 text-sm font-semibold text-white/75 transition hover:text-white sm:inline-flex"
          >
            Log in
          </Link>
          <Link
            href="/auth/sign-in"
            className="group inline-flex h-9 items-center gap-1.5 rounded-full bg-gradient-to-r from-[#22c55e] to-[#5eead4] px-4 text-sm font-semibold text-[#03120a] shadow-lg shadow-[#22c55e]/25 transition hover:opacity-95"
          >
            Get started
            <ArrowRight size={15} className="transition group-hover:translate-x-0.5" />
          </Link>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="inline-flex size-9 items-center justify-center rounded-full border border-white/15 text-white/80 transition hover:bg-white/10 lg:hidden"
          >
            {open ? <X size={17} /> : <Menu size={17} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-white/10 bg-[#07111f]/95 backdrop-blur-xl lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-0.5 px-4 py-3">
            {navLinks.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-white/75 transition hover:bg-white/10 hover:text-white"
              >
                {label}
              </Link>
            ))}
            <Link
              href="/auth/sign-in"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-semibold text-white/90 transition hover:bg-white/10"
            >
              Log in
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}

function FooterColumn({ title, links }: { title: string; links: ReadonlyArray<readonly [string, string]> }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-white/40">{title}</p>
      <ul className="mt-3 space-y-2.5">
        {links.map(([label, href]) => (
          <li key={href}>
            <Link href={href} className="text-sm text-white/65 transition hover:text-white">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MarketingFooter() {
  return (
    <footer className="relative overflow-hidden bg-[#07111f] text-white">
      <span className={ACCENT_LINE} aria-hidden />
      {/* glow blobs */}
      <div
        className="pointer-events-none absolute -left-32 -top-24 size-[420px] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(34,197,94,0.18), transparent 70%)" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-32 bottom-0 size-[420px] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(99,102,241,0.18), transparent 70%)" }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-7xl px-5 py-14 md:px-8">
        {/* Columns */}
        <div className="grid gap-8 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
          <div>
            <TicketOSLogo markSize="sm" tone="dark" />
            <p className="mt-3 max-w-xs text-sm leading-6 text-white/55">
              AI-native IT operations you can audit, undo, and afford.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex gap-2" aria-hidden>
                {["#22c55e", "#38bdf8", "#a855f7"].map((c) => (
                  <span key={c} className="size-2.5 rounded-full" style={{ background: c }} />
                ))}
              </div>
              <a
                href="https://github.com/ameeyami/TicketOS"
                target="_blank"
                rel="noreferrer"
                aria-label="GitHub"
                className="inline-flex size-8 items-center justify-center rounded-lg border border-white/12 text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                <svg viewBox="0 0 24 24" aria-hidden className="size-4 fill-current">
                  <path d="M12 1.4c-5.9 0-10.6 4.8-10.6 10.7 0 4.7 3 8.7 7.3 10.1.5.1.7-.2.7-.5v-2c-3 .7-3.6-1.3-3.6-1.3-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 0 1.6 1.1 1.6 1.1.9 1.6 2.4 1.1 3 .9.1-.7.4-1.1.7-1.4-2.4-.3-4.9-1.2-4.9-5.3 0-1.2.4-2.1 1.1-2.9-.1-.3-.5-1.4.1-2.8 0 0 .9-.3 2.9 1.1.8-.2 1.8-.4 2.7-.4s1.9.1 2.7.4c2-1.4 2.9-1.1 2.9-1.1.6 1.4.2 2.5.1 2.8.7.8 1.1 1.7 1.1 2.9 0 4.1-2.5 5-4.9 5.3.4.3.7 1 .7 2v2.9c0 .3.2.6.7.5 4.3-1.4 7.3-5.4 7.3-10.1C22.6 6.2 17.9 1.4 12 1.4z" />
                </svg>
              </a>
            </div>
          </div>
          <FooterColumn
            title="Product"
            links={[
              ["Overview", "/product"],
              ["Use cases", "/use-cases"],
              ["Integrations", "/#integrations"],
              ["Pricing", "/pricing"],
            ]}
          />
          <FooterColumn
            title="Resources"
            links={[
              ["Docs", "/docs"],
              ["API", "/api-reference"],
              ["Status", "/status"],
              ["Roadmap", "/roadmap"],
            ]}
          />
          <FooterColumn
            title="Trust"
            links={[
              ["Security", "/trust"],
              ["Governance", "/#security"],
            ]}
          />
          <FooterColumn
            title="Get started"
            links={[
              ["Log in", "/auth/sign-in"],
              ["Create account", "/auth/sign-up"],
            ]}
          />
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/45 md:flex-row">
          <p>© {new Date().getFullYear()} TicketOS · AI-native IT operations</p>
          <Link
            href="/status"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1 font-medium text-white/70 transition hover:border-white/20 hover:text-white"
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
            </span>
            Status
          </Link>
          <p className="flex items-center gap-2 font-medium">
            <span className="text-[#7ef0a8]">Audit</span>
            <span className="text-white/25">·</span>
            <span className="text-[#7dd3fc]">Undo</span>
            <span className="text-white/25">·</span>
            <span className="text-[#c4b5fd]">Afford</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
