import { cn } from "@/lib/utils";

type TicketOSLogoProps = {
  markSize?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  tone?: "light" | "dark";
  className?: string;
};

export function TicketOSLogo({
  markSize = "md",
  showWordmark = true,
  tone = "light",
  className,
}: TicketOSLogoProps) {
  const sizeClass = {
    sm: "size-6",
    md: "size-8",
    lg: "size-10",
  }[markSize];

  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <span
        className={cn(
          "relative inline-flex shrink-0 items-center justify-center rounded-lg bg-[#22c55e] text-[#03120a]",
          sizeClass,
        )}
        aria-hidden="true"
      >
        <svg viewBox="0 0 40 40" className="h-[72%] w-[72%]" fill="none">
          <path
            d="M10 14.5C10 11.5 12.5 9 15.5 9h9C27.5 9 30 11.5 30 14.5v11C30 28.5 27.5 31 24.5 31h-9C12.5 31 10 28.5 10 25.5v-11Z"
            stroke="currentColor"
            strokeWidth="3.2"
          />
          <path
            d="M14.5 15.5h6.75c2.35 0 4.25 1.9 4.25 4.25S23.6 24 21.25 24H18"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3.2"
          />
          <path
            d="M14.5 24h3.25c2.35 0 4.25-1.9 4.25-4.25"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="3.2"
          />
        </svg>
      </span>
      {showWordmark && (
        <span className={cn("font-semibold tracking-tight", tone === "dark" ? "text-white" : "text-[#07111f]")}>
          TicketOS
        </span>
      )}
    </span>
  );
}
