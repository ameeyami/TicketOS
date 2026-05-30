import { cn } from "@/lib/utils";

/**
 * Lightweight, image-free abstract art used as page backdrops.
 * Everything is SVG + CSS gradients so it stays crisp at any size and ships no
 * raster assets. Inline `style` gradients are used deliberately so they survive
 * the app-shell colour-normalisation rules in globals.css.
 */

/** Soft field of blurred colour blobs — the "aurora". */
export function AuroraField({
  className,
  intensity = "bold",
}: {
  className?: string;
  intensity?: "bold" | "soft";
}) {
  const alpha = intensity === "bold" ? 1 : 0.5;
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden="true">
      <div
        className="tos-anim-float-slow absolute -left-24 -top-28 size-[440px] rounded-full blur-3xl"
        style={{ background: `radial-gradient(circle, rgba(34,197,94,${0.42 * alpha}), transparent 70%)` }}
      />
      <div
        className="tos-anim-drift absolute -right-24 top-[18%] size-[520px] rounded-full blur-3xl"
        style={{ background: `radial-gradient(circle, rgba(11,95,145,${0.5 * alpha}), transparent 70%)` }}
      />
      <div
        className="tos-anim-float absolute -bottom-32 left-1/3 size-[460px] rounded-full blur-3xl"
        style={{ background: `radial-gradient(circle, rgba(99,102,241,${0.36 * alpha}), transparent 70%)` }}
      />
    </div>
  );
}

/** Faint grid texture that fades toward the edges. */
export function GridOverlay({
  className,
  tone = "dark",
}: {
  className?: string;
  tone?: "dark" | "light";
}) {
  const line = tone === "dark" ? "rgba(255,255,255,0.07)" : "rgba(7,17,31,0.06)";
  return (
    <div
      className={cn("pointer-events-none absolute inset-0", className)}
      aria-hidden="true"
      style={{
        backgroundImage: `linear-gradient(${line} 1px, transparent 1px), linear-gradient(90deg, ${line} 1px, transparent 1px)`,
        backgroundSize: "46px 46px",
        maskImage: "radial-gradient(ellipse 85% 75% at 50% 25%, #000 35%, transparent 100%)",
        WebkitMaskImage: "radial-gradient(ellipse 85% 75% at 50% 25%, #000 35%, transparent 100%)",
      }}
    />
  );
}

/** Flowing orbit rings + signal nodes — the "art" centrepiece for hero/auth panels. */
export function OrbitArt({ className }: { className?: string }) {
  return (
    <svg
      className={cn("pointer-events-none absolute", className)}
      viewBox="0 0 600 600"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="tos-orbit-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="tos-orbit-stroke" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.55" />
          <stop offset="55%" stopColor="#38bdf8" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.2" />
        </linearGradient>
      </defs>

      <g className="tos-anim-spin" style={{ transformOrigin: "300px 300px" }}>
        <circle cx="300" cy="300" r="150" stroke="url(#tos-orbit-stroke)" strokeWidth="1.5" />
        <circle cx="300" cy="300" r="215" stroke="url(#tos-orbit-stroke)" strokeWidth="1.5" />
        <circle cx="300" cy="300" r="280" stroke="url(#tos-orbit-stroke)" strokeWidth="1.5" strokeDasharray="3 9" />
        <circle cx="450" cy="300" r="6" fill="#22c55e" />
        <circle cx="300" cy="85" r="4.5" fill="#38bdf8" />
        <circle cx="85" cy="300" r="4" fill="#6366f1" />
        <circle cx="300" cy="515" r="5" fill="#22c55e" opacity="0.8" />
      </g>

      <circle cx="300" cy="300" r="110" fill="url(#tos-orbit-core)" opacity="0.55" />
      <path
        d="M180 300 C 240 220, 360 220, 420 300 S 540 380, 470 430"
        stroke="url(#tos-orbit-stroke)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
