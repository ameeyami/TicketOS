import Link from "next/link";
import { ChevronRight } from "lucide-react";

type Crumb = { label: string; href?: string };

/**
 * Compact, breadcrumb-style page header used across the app — a small path,
 * a modest title, and an optional actions slot. Replaces the old
 * eyebrow + giant-heading + subtitle blocks for a cleaner, calmer look.
 */
export function PageHeader({
  crumbs = [],
  title,
  description,
  actions,
}: {
  crumbs?: Crumb[];
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 border-b border-black/[0.06] pb-4 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        {crumbs.length > 0 && (
          <nav className="mb-1 flex flex-wrap items-center gap-1 text-xs font-medium text-slate-400">
            {crumbs.map((crumb, index) => (
              <span key={`${crumb.label}-${index}`} className="flex items-center gap-1">
                {index > 0 && <ChevronRight size={12} className="text-slate-300" />}
                {crumb.href ? (
                  <Link href={crumb.href} className="transition hover:text-slate-600">
                    {crumb.label}
                  </Link>
                ) : (
                  <span>{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="flex items-center gap-2.5 text-lg font-semibold tracking-tight text-[#0b1a2e] md:text-xl">
          <span className="h-5 w-1 shrink-0 rounded-full bg-gradient-to-b from-[#38bdf8] to-[#5b4bc4]" aria-hidden />
          <span className="truncate">{title}</span>
        </h1>
        {description && <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
