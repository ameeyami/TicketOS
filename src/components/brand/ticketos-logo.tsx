import { cn } from "@/lib/utils";

type TicketOSLogoProps = {
  markSize?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  tone?: "light" | "dark";
  className?: string;
};

/**
 * TicketOS brand lockup — a blue circuit-"T" mark + the Ticket/OS wordmark.
 * Source of truth for the logo across the whole app; the matching standalone
 * assets live in /public/images (ticketos-mark.svg, ticketos-logo.svg).
 */
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
    <span className={cn("inline-flex items-center gap-2.5", className)} aria-label="TicketOS">
      <svg viewBox="0 0 48 48" className={cn("shrink-0", sizeClass)} fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="ticketos-mark-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
        </defs>
        <g
          stroke="url(#ticketos-mark-grad)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 13 H41" />
          <path d="M31 13 V34 L25 40" />
          <path d="M10 13 H15" />
          <path d="M8 22 H31" />
          <path d="M13 31 H25" />
        </g>
        <g fill="url(#ticketos-mark-grad)">
          <circle cx="7" cy="13" r="2.7" />
          <circle cx="5" cy="22" r="2.7" />
          <circle cx="10" cy="31" r="2.7" />
        </g>
      </svg>
      {showWordmark && (
        <span className="font-semibold tracking-tight">
          <span className={tone === "dark" ? "text-white" : "text-[#0b1220]"}>Ticket</span>
          <span className={tone === "dark" ? "text-[#38bdf8]" : "text-[#1d4ed8]"}>OS</span>
        </span>
      )}
    </span>
  );
}
