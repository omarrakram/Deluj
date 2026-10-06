"use client";

import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, Lightbulb, Radio, TrendingUp } from "lucide-react";
import type { Insight, InsightTone } from "@/domain/insights";

const TONE: Record<InsightTone, { label: string; icon: typeof Lightbulb; chip: string }> = {
  live: { label: "Just now", icon: Radio, chip: "bg-orange text-white" },
  alert: { label: "Needs attention", icon: AlertTriangle, chip: "bg-alert-soft text-alert" },
  opportunity: { label: "Opportunity", icon: Lightbulb, chip: "bg-amber-soft text-amber" },
  trend: { label: "Trend", icon: TrendingUp, chip: "bg-powder-soft text-powder-deep" },
};

export function InsightList({ insights, compact = false }: { insights: Insight[]; compact?: boolean }) {
  return (
    <ul className="space-y-2.5" data-testid="insights">
      <AnimatePresence initial={false} mode="popLayout">
        {insights.map((i, idx) => {
          const t = TONE[i.tone];
          const Icon = t.icon;
          const lead = idx === 0 && !compact;
          return (
            <motion.li
              key={i.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className={`rounded-2xl p-4 ${lead ? "bg-ink text-cream" : "bg-cream"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${t.chip}`}>
                  <Icon className="h-3 w-3" /> {t.label}
                </span>
                {i.metric && <span className={`text-xs font-bold ${lead ? "text-powder" : "text-ink-soft"}`}>{i.metric}</span>}
              </div>
              <p className={`mt-2 font-display text-[15px] font-bold leading-snug ${lead ? "text-cream" : "text-ink"}`}>{i.title}</p>
              {!compact && <p className={`mt-1 text-[13px] leading-snug ${lead ? "text-cream/75" : "text-ink-soft"}`}>{i.body}</p>}
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}
