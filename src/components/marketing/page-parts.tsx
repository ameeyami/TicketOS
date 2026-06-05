import type { ReactNode } from "react";

/** Shared dark hero header for secondary marketing pages. */
export function PageHero({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <header className="relative overflow-hidden bg-[#07111f] px-5 py-14 text-white md:px-8 md:py-16">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{ background: "radial-gradient(55% 80% at 18% 0%, rgba(34,197,94,0.13), transparent 70%)" }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{ background: "radial-gradient(45% 70% at 92% 10%, rgba(56,189,248,0.13), transparent 70%)" }}
      />
      <div className="relative mx-auto max-w-7xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7ef0a8]">{eyebrow}</p>
        <h1 className="mt-2.5 text-3xl font-semibold tracking-tight md:text-5xl">{title}</h1>
        {subtitle && <p className="mt-4 max-w-2xl text-sm leading-7 text-white/65 md:text-base">{subtitle}</p>}
        {children}
      </div>
    </header>
  );
}

export const PAGE_CHIPS = [
  "from-[#e0f2fe] to-[#dbeafe] text-[#0b5f91]",
  "from-[#ede9fe] to-[#fae8ff] text-[#7c3aed]",
  "from-[#dcfce7] to-[#d1fae5] text-[#0f7a5f]",
  "from-[#ffedd5] to-[#fef3c7] text-[#b45309]",
  "from-[#cffafe] to-[#ccfbf1] text-[#0e7490]",
  "from-[#fce7f3] to-[#fae8ff] text-[#a21caf]",
];
