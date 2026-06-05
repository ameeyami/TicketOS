import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { TicketOSLogo } from "@/components/brand/ticketos-logo";

const navLinks = [
  ["Product", "/product"],
  ["Integrations", "/#integrations"],
  ["Trust", "/trust"],
  ["Pricing", "/pricing"],
] as const;

const ACCENT_LINE = "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-[#22c55e] via-[#38bdf8] to-[#a855f7]";

export function MarketingNav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#07111f]/70 backdrop-blur-xl">
      <span className={ACCENT_LINE} aria-hidden />
      <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">
        <Link href="/" className="flex items-center gap-3">
          <TicketOSLogo markSize="md" tone="dark" />
        </Link>

        {/* Centered glass pill nav */}
        <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-0.5 rounded-full border border-white/10 bg-white/[0.05] p-1 backdrop-blur lg:flex">
          {navLinks.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="rounded-full px-3.5 py-1.5 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
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
        </div>
      </div>
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
        {/* CTA band */}
        <div className="flex flex-col gap-5 border-b border-white/10 pb-10 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="max-w-xl text-3xl font-semibold tracking-tight md:text-4xl">
              Run IT in the open —{" "}
              <span className="bg-gradient-to-r from-[#22c55e] via-[#5eead4] to-[#38bdf8] bg-clip-text text-transparent">
                audit, undo, afford.
              </span>
            </h2>
            <p className="mt-3 max-w-md text-sm leading-7 text-white/60">
              Triage, approve, and execute on real systems — then reverse any action and prove what happened.
            </p>
          </div>
          <Link
            href="/auth/sign-in"
            className="group inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#22c55e] to-[#5eead4] px-7 text-base font-semibold text-[#03120a] shadow-lg shadow-[#22c55e]/25 transition hover:opacity-95"
          >
            Get started free
            <ArrowRight size={18} className="transition group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Columns */}
        <div className="mt-10 grid gap-8 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <TicketOSLogo markSize="sm" tone="dark" />
            <p className="mt-3 max-w-xs text-sm leading-6 text-white/55">
              AI-native IT operations you can audit, undo, and afford.
            </p>
            <div className="mt-4 flex gap-2" aria-hidden>
              {["#22c55e", "#38bdf8", "#a855f7"].map((c) => (
                <span key={c} className="size-2.5 rounded-full" style={{ background: c }} />
              ))}
            </div>
          </div>
          <FooterColumn
            title="Product"
            links={[
              ["Overview", "/product"],
              ["Integrations", "/#integrations"],
              ["Pricing", "/pricing"],
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
