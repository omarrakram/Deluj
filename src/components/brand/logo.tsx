import type { CSSProperties } from "react";

/**
 * The real Deluj wordmark, rendered from a faithful trace of the supplied logo.
 * It is drawn through a CSS mask so it can take any brand colour via `color`.
 */
export function Wordmark({ className = "", style, title = "Deluj" }: { className?: string; style?: CSSProperties; title?: string }) {
  return (
    <span
      role="img"
      aria-label={title}
      className={`inline-block align-middle ${className}`}
      style={{
        aspectRatio: "2048 / 744",
        backgroundColor: "currentColor",
        WebkitMask: "url(/brand/deluj-wordmark.svg) center / contain no-repeat",
        mask: "url(/brand/deluj-wordmark.svg) center / contain no-repeat",
        ...style,
      }}
    />
  );
}

/** The circular Deluj badge exactly as it appears on @deluj.eg. */
export function Badge({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/brand/deluj-badge.png" alt="Deluj" width={size} height={size} className={`rounded-full ${className}`} style={{ width: size, height: size }} />
  );
}

/** Five-point star, the motif that crowns the j in the wordmark. */
export function Star({ className = "", filled = true }: { className?: string; filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M12 1.8c.6 0 1 .4 1.2 1l2.1 5.2 5.5.5c1.2.1 1.6 1.5.7 2.2l-4.2 3.6 1.3 5.4c.3 1.1-.9 2-1.9 1.4L12 18.2l-4.7 2.9c-1 .6-2.2-.3-1.9-1.4l1.3-5.4-4.2-3.6c-.9-.7-.5-2.1.7-2.2l5.5-.5 2.1-5.2c.2-.6.6-1 1.2-1Z"
        fill={filled ? "currentColor" : "none"}
        stroke={filled ? "none" : "currentColor"}
        strokeWidth={filled ? 0 : 1.8}
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Playful wavy edge used under orange hero blocks. */
export function Wave({ className = "", flip = false }: { className?: string; flip?: boolean }) {
  return (
    <svg viewBox="0 0 1440 48" preserveAspectRatio="none" className={className} aria-hidden="true" style={flip ? { transform: "scaleY(-1)" } : undefined}>
      <path d="M0 0h1440v20c-60 0-60 22-120 22S1260 20 1200 20s-60 22-120 22S1020 20 960 20s-60 22-120 22S780 20 720 20s-60 22-120 22S540 20 480 20s-60 22-120 22S300 20 240 20s-60 22-120 22S60 20 0 20Z" fill="currentColor" />
    </svg>
  );
}

/** Line-art croissant in the style of Deluj's "Baked Fresh Daily" posts. */
export function CroissantDoodle({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 80" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 52c4-18 20-34 52-34s48 16 52 34c-6 4-14 4-20 0-4-12-14-20-32-20S32 40 28 52c-6 4-14 4-20 0Z" />
      <path d="M28 52c2-14 14-24 32-24s30 10 32 24" />
      <path d="M44 30c2 8 4 16 4 26M76 30c-2 8-4 16-4 26M60 28v30" />
    </svg>
  );
}
