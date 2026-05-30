import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { TicketOSLogo } from "@/components/brand/ticketos-logo";

const navLinks = [
  ["Product", "/#features"],
  ["Integrations", "/#integrations"],
  ["Governance", "/#security"],
  ["Pricing", "/pricing"],
] as const;

export function MarketingNav() {
  return (
    <nav className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-white/10 bg-[#07111f]/85 px-5 backdrop-blur-xl md:px-8">
      <Link href="/" className="flex items-center gap-3">
        <TicketOSLogo markSize="md" tone="dark" />
      </Link>
      <div className="hidden items-center gap-8 text-sm font-medium text-white/64 md:flex">
        {navLinks.map(([label, href]) => (
          <Link key={href} href={href} className="transition hover:text-white">
            {label}
          </Link>
        ))}
      </div>
      <Link
        href="/auth/sign-in"
        className="inline-flex h-10 items-center gap-2 rounded-full bg-[#22c55e] px-5 text-sm font-semibold text-[#03120a] transition hover:bg-[#34d36b]"
      >
        Log in
        <ArrowRight size={16} />
      </Link>
    </nav>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-[#d8e4ee] bg-white">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-5 py-8 text-sm text-slate-500 md:flex-row md:justify-between md:px-8">
        <TicketOSLogo markSize="sm" />
        <div className="flex items-center gap-6">
          <Link href="/pricing" className="transition hover:text-[#07111f]">Pricing</Link>
          <Link href="/#features" className="transition hover:text-[#07111f]">Product</Link>
          <Link href="/auth/sign-in" className="transition hover:text-[#07111f]">Log in</Link>
        </div>
        <p>© {new Date().getFullYear()} TicketOS · AI-native IT operations</p>
      </div>
    </footer>
  );
}
