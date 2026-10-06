"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { AnimatedNumber } from "@/components/ui/animated-number";

/** A live stat tile. When the value rises it flashes and floats the delta. */
export function KpiTile({
  label,
  value,
  format,
  deltaFormat,
  compare,
  sub,
  accent = false,
  testId,
}: {
  label: string;
  value: number;
  format: (n: number) => string;
  deltaFormat?: (n: number) => string;
  compare?: number | null;
  sub?: string;
  accent?: boolean;
  testId?: string;
}) {
  const prev = useRef(value);
  const [bump, setBump] = useState<{ id: number; delta: number } | null>(null);

  useEffect(() => {
    const delta = value - prev.current;
    prev.current = value;
    if (Math.abs(delta) < 1e-9) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reacting to a live value change
    setBump({ id: Date.now(), delta });
    const t = setTimeout(() => setBump(null), 2600);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <div
      className={`relative overflow-hidden rounded-3xl p-4 transition-shadow duration-500 sm:p-5 ${
        accent ? "bg-orange text-white" : "bg-white text-ink"
      } ${bump && bump.delta > 0 ? (accent ? "shadow-orange ring-4 ring-orange/30" : "shadow-lift ring-4 ring-orange/40") : "shadow-soft"}`}
      data-testid={testId}
    >
      <p className={`text-[13px] font-semibold ${accent ? "text-white/85" : "text-ink-soft"}`}>{label}</p>
      <p className="mt-1.5 text-[1.7rem] font-bold leading-none tracking-tight sm:text-[2rem]" data-testid={testId ? `${testId}-value` : undefined}>
        <AnimatedNumber value={value} format={format} proportional />
      </p>
      <div className="mt-2 flex min-h-5 items-center gap-2 text-xs font-semibold">
        {compare !== undefined && compare !== null && Number.isFinite(compare) ? (
          <span className={`flex items-center gap-1 ${accent ? "text-white/90" : compare >= 0 ? "text-mint" : "text-alert"}`}>
            {compare >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {compare >= 0 ? "+" : ""}
            {(compare * 100).toFixed(0)}% vs usual
          </span>
        ) : sub ? (
          <span className={accent ? "text-white/85" : "text-ink-mute"}>{sub}</span>
        ) : null}
      </div>
      <AnimatePresence>
        {bump && bump.delta > 0 && deltaFormat && (
          <motion.span
            key={bump.id}
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ type: "spring", stiffness: 420, damping: 22 }}
            className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-xs font-bold ${accent ? "bg-white text-orange-deep" : "bg-orange text-white"}`}
          >
            {deltaFormat(bump.delta)}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
