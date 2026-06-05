import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { TicketOSLogo } from "@/components/brand/ticketos-logo";

const navLinks = [
  ["Product", "/#features"],
  ["Integrations", "/#integrations"],
  ["Trust", "/trust"],
  ["Pricing", "/pricing"],
] as const;

const ACCENT_LINE = "absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-[#22c55e] via-[#38bdf8] to-[#a855f7]";

export function MarketingNav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#07111f]/85 backdrop-blur-xl">
      <span className={ACCENT_LINE} aria-hidden />
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5 md:px-8">
        <Link href="/" className="flex items-center gap-3">
          <TicketOSLogo markSize="md" tone="dark" />
        </Link>
        <div className="hidden items-center gap-7 text-sm font-medium text-white/64 md:flex">
          {navLinks.map(([label, href]) => (
            <Link key={href} href={href} className="transition hover:text-white">
              {label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <Link
            href="/auth/sign-in"
            className="hidden h-9 items-center rounded-full px-3 text-sm font-semibold text-white/75 transition hover:text-white sm:inline-flex"
          >
            Log in
          </Link>
          <Link
            href="/auth/sign-in"
            className="inline-flex h-9 items-center gap-2 rounded-full bg-gradient-to-r from-[#22c55e] to-[#5eead4] px-4 text-sm font-semibold text-[#03120a] shadow-lg shadow-[#22c55e]/25 transition hover:opacity-95"
          >
            Get started
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </nav>
  );
}

function FooterColumn({ title, links }: { title: string; links: ReadonlyArray<readonly [string, string]> }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
      <ul className="mt-3 space-y-2">
        {links.map(([label, href]) => (
          <li key={href}>
            <Link href={href} className="text-sm text-slate-600 transition hover:text-[#0b2a4a]">
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
    <footer className="relative border-t border-[#e3ebf3] bg-gradient-to-b from-white to-[#f1f7ff]">
      <span className={ACCENT_LINE} aria-hidden />
      <div className="mx-auto max-w-7xl px-5 py-12 md:px-8">
        <div className="grid gap-8 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <TicketOSLogo markSize="sm" />
            <p className="mt-3 max-w-xs text-sm leading-6 text-slate-500">
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
              ["Features", "/#features"],
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
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-[#e3ebf3] pt-6 text-xs text-slate-400 md:flex-row">
          <p>© {new Date().getFullYear()} TicketOS · AI-native IT operations</p>
          <p className="flex items-center gap-2 font-medium">
            <span className="text-[#0f7a5f]">Audit</span>
            <span className="text-slate-300">·</span>
            <span className="text-[#0b5f91]">Undo</span>
            <span className="text-slate-300">·</span>
            <span className="text-[#5b4bc4]">Afford</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
