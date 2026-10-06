"use client";

// Lightweight SVG/HTML charts for the owner dashboard. Thin marks, rounded data
// ends anchored to the baseline, hairline solid grid, hover tooltips, and a
// screen-reader table for every chart. Categorical palette validated with the
// dataviz six-checks: orange #FB4E12 · blue #2878B5 · gold #A87A12.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { formatCompact } from "@/domain/money";

export const SERIES = { orange: "#FB4E12", blue: "#2878B5", gold: "#A87A12", muted: "#E4D8CA", grid: "#EFE6DB", axis: "#857A71" };

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.floor(e.contentRect.width)));
    ro.observe(el);
    setWidth(Math.floor(el.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * exp;
}

/** Bar with only the data-end rounded, anchored to the baseline. */
function barPath(x: number, y: number, w: number, h: number, r = 4): string {
  if (h <= 0) return "";
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

export interface BarDatum {
  key: string;
  label: string;
  value: number;
  /** Emphasised bar (e.g. today). */
  highlight?: boolean;
  /** Optional comparison value drawn as a line (same unit, same axis). */
  reference?: number;
  tooltip: ReactNode;
}

export function ColumnChart({
  data,
  height = 190,
  labelEvery = 1,
  referenceLabel,
  caption,
  emphasise = true,
}: {
  data: BarDatum[];
  height?: number;
  labelEvery?: number;
  referenceLabel?: string;
  caption: string;
  emphasise?: boolean;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const pad = { l: 34, r: 6, t: 10, b: 24 };
  const plotW = Math.max(0, width - pad.l - pad.r);
  const plotH = height - pad.t - pad.b;
  const max = niceMax(Math.max(...data.map((d) => Math.max(d.value, d.reference ?? 0)), 1));
  const band = data.length ? plotW / data.length : 0;
  const bw = Math.max(3, Math.min(28, band * 0.62));
  const y = (v: number) => pad.t + plotH - (v / max) * plotH;
  const ticks = [0, max / 2, max];
  const hasRef = data.some((d) => d.reference !== undefined);
  const refPoints = data.map((d, i) => `${pad.l + band * i + band / 2},${y(d.reference ?? 0)}`).join(" ");

  return (
    <figure className="relative">
      <div ref={ref} className="relative w-full" style={{ height }}>
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label={caption} onMouseLeave={() => setHover(null)}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={pad.l} x2={width - pad.r} y1={y(t)} y2={y(t)} stroke={SERIES.grid} strokeWidth={1} />
                <text x={pad.l - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill={SERIES.axis} className="tabular">
                  {formatCompact(t)}
                </text>
              </g>
            ))}
            {data.map((d, i) => {
              const x = pad.l + band * i + (band - bw) / 2;
              const h = (d.value / max) * plotH;
              const fill = emphasise
                ? d.highlight
                  ? SERIES.orange
                  : hover === i
                    ? "#D7C6B4"
                    : SERIES.muted
                : hover === i
                  ? "#E2440C"
                  : SERIES.orange;
              return (
                <g key={d.key}>
                  <path d={barPath(x, y(d.value), bw, h)} fill={fill} />
                  {i % labelEvery === 0 && (
                    <text x={x + bw / 2} y={height - 6} textAnchor="middle" fontSize={11} fill={d.highlight ? "#231C18" : SERIES.axis} fontWeight={d.highlight ? 700 : 400}>
                      {d.label}
                    </text>
                  )}
                  <rect
                    x={pad.l + band * i}
                    y={pad.t}
                    width={band}
                    height={plotH}
                    fill="transparent"
                    onMouseEnter={() => setHover(i)}
                    onFocus={() => setHover(i)}
                    tabIndex={-1}
                  />
                </g>
              );
            })}
            {hasRef && (
              <>
                <polyline points={refPoints} fill="none" stroke={SERIES.blue} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" pointerEvents="none" />
                {hover !== null && data[hover].reference !== undefined && (
                  <circle cx={pad.l + band * hover + band / 2} cy={y(data[hover].reference!)} r={4} fill={SERIES.blue} stroke="#fff" strokeWidth={2} pointerEvents="none" />
                )}
              </>
            )}
            {hover !== null && <line x1={pad.l + band * hover + band / 2} x2={pad.l + band * hover + band / 2} y1={pad.t} y2={pad.t + plotH} stroke="#231C18" strokeOpacity={0.12} pointerEvents="none" />}
          </svg>
        )}
        {hover !== null && width > 0 && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl bg-ink px-3 py-2 text-xs text-cream shadow-lift"
            style={{ left: Math.min(Math.max(pad.l + band * hover + band / 2, 70), width - 70), top: Math.max(y(Math.max(data[hover].value, data[hover].reference ?? 0)) - 8, 40) }}
          >
            {data[hover].tooltip}
          </div>
        )}
      </div>
      {hasRef && referenceLabel && (
        <figcaption className="mt-2 flex items-center gap-4 text-xs font-semibold text-ink-soft">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: SERIES.orange }} /> Today
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded" style={{ background: SERIES.blue }} /> {referenceLabel}
          </span>
        </figcaption>
      )}
      <table className="sr-only">
        <caption>{caption}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.key}>
              <th>{d.label}</th>
              <td>{d.value}</td>
              {hasRef && <td>{d.reference?.toFixed(1)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** Ranked horizontal bars rendered in HTML (always legible, any width). */
export function RankBars({
  rows,
  caption,
  color = SERIES.orange,
}: {
  rows: { key: string; label: string; value: number; display: string; sub?: string; flash?: boolean }[];
  caption: string;
  color?: string;
}) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <figure>
      <ul className="space-y-2.5" aria-label={caption}>
        {rows.map((r) => (
          <li key={r.key} className={`rounded-lg transition-colors duration-700 ${r.flash ? "bg-orange-wash" : ""}`}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate font-semibold">{r.label}</span>
              <span className="tabular shrink-0 font-semibold text-ink-soft">{r.display}</span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-stone">
              <div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${Math.max(2, (r.value / max) * 100)}%`, background: color }} />
            </div>
          </li>
        ))}
      </ul>
    </figure>
  );
}

/** Part-to-whole as one stacked bar with 2px gaps, plus a legend that carries the numbers. */
export function StackedShare({
  parts,
  caption,
}: {
  parts: { key: string; label: string; value: number; color: string; display: string }[];
  caption: string;
}) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  return (
    <figure aria-label={caption}>
      <div className="flex h-4 w-full gap-[2px] overflow-hidden rounded-full">
        {parts.map((p) =>
          p.value > 0 ? (
            <div key={p.key} className="h-full first:rounded-l-full last:rounded-r-full transition-[flex-grow] duration-700" style={{ flexGrow: p.value, flexBasis: 0, background: p.color }} title={`${p.label}: ${p.display}`} />
          ) : null,
        )}
      </div>
      <ul className="mt-3 space-y-1.5">
        {parts.map((p) => (
          <li key={p.key} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-semibold">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: p.color }} />
              {p.label}
            </span>
            <span className="tabular text-ink-soft">
              {Math.round((p.value / total) * 100)}% · {p.display}
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
