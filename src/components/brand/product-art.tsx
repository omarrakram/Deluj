// Deluj-branded product illustrations. Line art on flat brand colour, echoing the
// white-on-orange pastry drawings in Deluj's own posts. Used instead of stock
// photography so no dish is ever shown as something it isn't.

import type { ArtKind, ArtSpec, ArtTone } from "@/domain/types";

const TONES: Record<ArtTone, { bg: string; line: string; spark: string }> = {
  orange: { bg: "#FB4E12", line: "#FFF7EE", spark: "#ABD1E9" },
  powder: { bg: "#ABD1E9", line: "#C2380A", spark: "#FB4E12" },
  cream: { bg: "#FBEBDA", line: "#E2470F", spark: "#ABD1E9" },
  peach: { bg: "#FFD8C4", line: "#C2380A", spark: "#FFF7EE" },
  ink: { bg: "#231C18", line: "#FFF7EE", spark: "#FB4E12" },
};

function Sparkle({ x, y, s = 1, color }: { x: number; y: number; s?: number; color: string }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M0-6c.3 0 .5.2.6.5l1 2.6 2.8.3c.6 0 .8.8.4 1.1L2.6.3l.6 2.7c.2.6-.5 1-1 .7L0 2.2l-2.3 1.5c-.5.3-1.1-.1-1-.7l.7-2.7-2.2-1.8c-.4-.4-.2-1.1.4-1.1l2.8-.3 1-2.6c.1-.3.3-.5.6-.5Z"
      fill={color}
    />
  );
}

function Drawing({ kind, line, accent }: { kind: ArtKind; line: string; accent: string }) {
  const s = { fill: "none", stroke: line, strokeWidth: 3.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (kind) {
    case "iced-cup":
      return (
        <g>
          <path d="M42 50h36l-4 50a5 5 0 0 1-5 4.5H51a5 5 0 0 1-5-4.5Z" fill={accent} opacity="0.95" />
          <path d="M37 38h46l-5.5 63a6 6 0 0 1-6 5.5H48.5a6 6 0 0 1-6-5.5Z" {...s} />
          <path d="M33 38h54M38 38c0-7 10-11 22-11s22 4 22 11" {...s} />
          <path d="M66 27l8-17h8" {...s} />
          <rect x="47" y="56" width="11" height="11" rx="2.5" transform="rotate(-12 52 61)" {...s} strokeWidth={2.6} />
          <rect x="61" y="64" width="11" height="11" rx="2.5" transform="rotate(14 66 69)" {...s} strokeWidth={2.6} />
        </g>
      );
    case "hot-cup":
      return (
        <g>
          <ellipse cx="57" cy="56" rx="23" ry="5.5" fill={accent} />
          <path d="M33 55h48v15a24 24 0 0 1-24 24 24 24 0 0 1-24-24Z" {...s} />
          <path d="M81 61h4a9 9 0 0 1 0 18h-6" {...s} />
          <path d="M24 100h66" {...s} />
          <path d="M49 42c-4-5 4-8 0-14M61 42c-4-5 4-8 0-14" {...s} strokeWidth={2.6} />
          <path d="M53 56.5c1.4-2.6 5.6-2.6 4 .6-.6 1.2-2 2-4 3-2-1-3.4-1.8-4-3-1.6-3.2 2.6-3.2 4-.6Z" fill={line} opacity="0.9" />
        </g>
      );
    case "espresso":
      return (
        <g>
          <ellipse cx="58" cy="62" rx="16" ry="4" fill={accent} />
          <path d="M42 61h32v10a16 16 0 0 1-16 16 16 16 0 0 1-16-16Z" {...s} />
          <path d="M74 65h3a6.5 6.5 0 0 1 0 13h-4" {...s} />
          <path d="M30 95c8 4 48 4 56 0" {...s} />
          <path d="M53 50c-3-4 3-6 0-11M63 50c-3-4 3-6 0-11" {...s} strokeWidth={2.6} />
        </g>
      );
    case "matcha":
      return (
        <g>
          <path d="M30 58h52a26 26 0 0 1-26 26 26 26 0 0 1-26-26Z" fill={accent} opacity="0.95" />
          <path d="M28 57h56a28 28 0 0 1-28 28 28 28 0 0 1-28-28Z" {...s} />
          <path d="M44 92h24" {...s} />
          <path d="M88 26l-12 26M84 24l10 5M80 50c2-6 6-12 12-20" {...s} strokeWidth={2.6} />
          <path d="M42 66c6 4 22 4 28 0" stroke={line} strokeWidth={2.4} strokeLinecap="round" fill="none" opacity="0.8" />
        </g>
      );
    case "mojito":
      return (
        <g>
          <path d="M43 48h34l-3 48a5 5 0 0 1-5 4.5H51a5 5 0 0 1-5-4.5Z" fill={accent} opacity="0.95" />
          <path d="M40 34h40l-4 64a6 6 0 0 1-6 5.5H50a6 6 0 0 1-6-5.5Z" {...s} />
          <circle cx="79" cy="34" r="10" {...s} />
          <path d="M79 26v16M71 34h16M73.5 28.5l11 11M84.5 28.5l-11 11" stroke={line} strokeWidth={1.8} strokeLinecap="round" />
          <path d="M55 34l-6-22h-7" {...s} />
          <path d="M50 62c4-6 10-6 12 0-4 4-8 4-12 0ZM60 76c4-6 10-6 12 0-4 4-8 4-12 0Z" {...s} strokeWidth={2.4} />
        </g>
      );
    case "teapot":
      return (
        <g>
          <path d="M34 60h44v12a22 22 0 0 1-44 0Z" fill={accent} opacity="0.35" />
          <path d="M32 58h48v14a24 24 0 0 1-48 0Z" {...s} />
          <path d="M44 58c0-8 6-12 12-12s12 4 12 12M56 46v-5M52 41h8" {...s} />
          <path d="M80 62l10-8c3-2 6 1 4 4l-10 16" {...s} />
          <path d="M32 64c-8 0-11 5-11 9s4 8 11 7" {...s} />
          <path d="M30 100h52" {...s} />
        </g>
      );
    case "bottle":
      return (
        <g>
          <path d="M46 56h28v40a6 6 0 0 1-6 6H52a6 6 0 0 1-6-6Z" fill={accent} opacity="0.95" />
          <path d="M53 16h14v8H53ZM55 24v10c-6 4-11 9-11 18v44a8 8 0 0 0 8 8h16a8 8 0 0 0 8-8V52c0-9-5-14-11-18V24" {...s} />
          <path d="M44 62h32M44 82h32" {...s} strokeWidth={2.6} />
          <circle cx="60" cy="72" r="4" fill={line} />
        </g>
      );
    case "eggs":
      return (
        <g>
          <circle cx="60" cy="64" r="38" {...s} />
          <rect x="34" y="44" width="40" height="38" rx="9" transform="rotate(-8 54 63)" {...s} />
          <path d="M58 52c10-6 26-2 26 10s-10 18-20 16-16-10-14-16 3-8 8-10Z" fill="#FFF7EE" stroke={line} strokeWidth={3} strokeLinejoin="round" />
          <circle cx="67" cy="64" r="7.5" fill={accent} />
        </g>
      );
    case "benedict":
      return (
        <g>
          <path d="M22 84h76" {...s} />
          <path d="M28 82c0-6 6-10 14-10s14 4 14 10M64 82c0-6 6-10 14-10s14 4 14 10" {...s} />
          <path d="M30 70c0-10 5-18 12-18s12 8 12 18ZM66 70c0-10 5-18 12-18s12 8 12 18Z" fill="#FFF7EE" stroke={line} strokeWidth={3} />
          <path d="M30 60c4 4 8 2 12 6 4-4 8-2 12-6M66 60c4 4 8 2 12 6 4-4 8-2 12-6" stroke={accent} strokeWidth={5} strokeLinecap="round" fill="none" />
          <path d="M40 40l2-6M78 40l2-6M59 38v-6" {...s} strokeWidth={2.4} />
        </g>
      );
    case "bagel":
      return (
        <g>
          <path d="M26 62c0-16 16-26 34-26s34 10 34 26Z" {...s} />
          <path d="M28 66c10 6 54 6 64 0" stroke={accent} strokeWidth={7} strokeLinecap="round" fill="none" />
          <path d="M26 74c6-4 10 4 16 0s10 4 16 0 10 4 16 0 10 4 16 0 6 2 6 2" {...s} strokeWidth={2.6} />
          <path d="M28 80h64c0 10-14 16-32 16s-32-6-32-16Z" {...s} />
          <path d="M46 46l2-1M58 43l2 1M70 46l2-1M52 52l2 1M64 52l2-1" {...s} strokeWidth={2.6} />
        </g>
      );
    case "sandwich":
      return (
        <g>
          <path d="M24 82 60 30l36 52Z" {...s} />
          <path d="M30 74c8-4 10 2 18-2s10 2 18-2 10 2 18-2 6 0 6 0" stroke={accent} strokeWidth={5} strokeLinecap="round" fill="none" />
          <path d="M24 88h72v6a6 6 0 0 1-6 6H30a6 6 0 0 1-6-6Z" {...s} />
          <path d="M42 44l6 2M70 42l6-3" {...s} strokeWidth={2.4} />
        </g>
      );
    case "focaccia":
      return (
        <g>
          <rect x="20" y="38" width="80" height="50" rx="14" {...s} />
          <circle cx="40" cy="56" r="5" fill={accent} />
          <circle cx="72" cy="52" r="5.5" fill={accent} />
          <circle cx="58" cy="72" r="5" fill={accent} />
          <circle cx="84" cy="74" r="4.5" fill={accent} />
          <path d="M34 72h.01M52 48h.01M86 60h.01M46 80h.01M70 80h.01" {...s} strokeWidth={4} />
          <path d="M28 96c8 3 56 3 64 0" {...s} strokeWidth={2.6} />
        </g>
      );
    case "salad":
      return (
        <g>
          <path d="M40 54c-4-12 6-20 14-14 2-10 16-10 18 0 8-6 18 2 14 14" fill={accent} opacity="0.95" />
          <path d="M40 54c-4-12 6-20 14-14 2-10 16-10 18 0 8-6 18 2 14 14" {...s} />
          <path d="M22 56h76a38 34 0 0 1-76 0Z" {...s} />
          <path d="M50 96h20" {...s} />
          <circle cx="50" cy="48" r="4" fill={line} />
          <circle cx="70" cy="46" r="3.5" fill={line} />
        </g>
      );
    case "pancakes":
      return (
        <g>
          <path d="M26 86c0-4 15-7 34-7s34 3 34 7-15 8-34 8-34-4-34-8Z" {...s} />
          <path d="M28 76c0-4 14-7 32-7s32 3 32 7-14 8-32 8-32-4-32-8Z" {...s} />
          <path d="M30 66c0-4 13-7 30-7s30 3 30 7-13 8-30 8-30-4-30-8Z" {...s} />
          <path d="M34 64c6 4 14 0 14 8 0 4 4 4 4 0 0-6 10-2 14-6s8 6 10 2c2-6 6-2 8-4" stroke={accent} strokeWidth={5} strokeLinecap="round" fill="none" />
          <rect x="52" y="46" width="16" height="11" rx="3" fill="#FFF7EE" stroke={line} strokeWidth={3} />
          <path d="M20 100h80" {...s} strokeWidth={2.6} />
        </g>
      );
  }
}

export function ProductArt({ art, className = "", sparkles = true, soldOut = false }: { art: ArtSpec; className?: string; sparkles?: boolean; soldOut?: boolean }) {
  const tone = TONES[art.tone] ?? TONES.orange;
  return (
    <svg viewBox="0 0 120 120" className={className} role="presentation" aria-hidden="true" style={soldOut ? { filter: "grayscale(1)", opacity: 0.55 } : undefined}>
      <rect width="120" height="120" fill={tone.bg} />
      <circle cx="60" cy="66" r="44" fill={tone.line} opacity="0.08" />
      {sparkles && (
        <>
          <Sparkle x={18} y={20} s={1.1} color={tone.spark} />
          <Sparkle x={102} y={96} s={0.9} color={tone.spark} />
        </>
      )}
      <Drawing kind={art.kind} line={tone.line} accent={art.accent ?? tone.spark} />
    </svg>
  );
}
