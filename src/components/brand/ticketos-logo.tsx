import Image from "next/image";
import { cn } from "@/lib/utils";

type TicketOSLogoProps = {
  markSize?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  tone?: "light" | "dark";
  className?: string;
};

const HEIGHT = { sm: "h-8", md: "h-10", lg: "h-12" } as const;
const MARK = { sm: "size-6", md: "size-8", lg: "size-10" } as const;

/**
 * TicketOS logo. Renders the brand PNG lockup (/public/images/logo.png) via
 * next/image so it's auto-optimised. On dark surfaces the lockup is rendered as
 * a white silhouette (the source artwork has dark text). showWordmark={false}
 * falls back to the standalone circuit-"T" mark.
 */
export function TicketOSLogo({
  markSize = "md",
  showWordmark = true,
  tone = "light",
  className,
}: TicketOSLogoProps) {
  if (!showWordmark) {
    return (
      <span className={cn("inline-flex", className)} aria-label="TicketOS">
        <svg viewBox="0 0 48 48" className={cn(MARK[markSize], tone === "dark" && "brightness-0 invert")} fill="none" aria-hidden="true">
          <defs>
            <linearGradient id="ticketos-mark-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
          </defs>
          <g stroke="url(#ticketos-mark-grad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
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
      </span>
    );
  }

  // The brand PNG is transparent: render it plainly on light surfaces, and as a
  // clean white silhouette on dark ones (so it merges with the background).
  return (
    <Image
      src="/images/logo.png"
      alt="TicketOS"
      width={1536}
      height={1024}
      className={cn("w-auto", HEIGHT[markSize], tone === "dark" && "brightness-0 invert", className)}
    />
  );
}
