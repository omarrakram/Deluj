"use client";

import { motion } from "motion/react";
import { TABLE_STATE_LABEL, type TableState, type TableStatus } from "@/domain/analytics";
import { formatEGP } from "@/domain/money";
import { tableNumber } from "@/domain/tables";
import { relativeTime } from "@/domain/time";

export const TABLE_STYLE: Record<TableState, { tile: string; dot: string }> = {
  available: { tile: "bg-white text-ink-mute", dot: "bg-line" },
  browsing: { tile: "bg-powder-soft text-ink", dot: "bg-powder-deep" },
  ordered: { tile: "bg-orange text-white", dot: "bg-orange" },
  preparing: { tile: "bg-orange-wash text-ink", dot: "bg-orange-deep" },
  ready: { tile: "bg-mint-soft text-ink", dot: "bg-mint" },
  dining: { tile: "bg-cream-deep text-ink", dot: "bg-ink-soft" },
  attention: { tile: "bg-ink text-cream", dot: "bg-alert" },
};

const SHORT: Record<TableState, string> = {
  available: "Free",
  browsing: "Browsing",
  ordered: "Ordered",
  preparing: "Prep",
  ready: "Ready",
  dining: "Dining",
  attention: "Help",
};

export function FloorGrid({ tables, now, large = false }: { tables: TableStatus[]; now: number; large?: boolean }) {
  return (
    <div>
      <ul className={`grid gap-2 ${large ? "grid-cols-2 sm:grid-cols-4 xl:grid-cols-7" : "grid-cols-4 sm:grid-cols-7"}`} data-testid="floor">
        {tables.map((t) => {
          const s = TABLE_STYLE[t.state];
          return (
            <motion.li
              key={t.tableCode}
              layout
              className={`relative rounded-2xl ${large ? "p-3.5" : "p-2.5"} ${s.tile} ${t.state === "attention" ? "ring-2 ring-alert" : ""}`}
              data-testid={`floor-${t.tableCode}`}
              data-state={t.state}
              title={`${t.label}: ${t.detail}`}
            >
              <div className="flex items-center justify-between">
                <span className={`font-display font-extrabold leading-none ${large ? "text-2xl" : "text-lg"}`}>{tableNumber(t.tableCode)}</span>
                <span className={`h-2 w-2 rounded-full ${s.dot} ${t.state === "attention" || t.state === "ordered" ? "animate-blink" : ""}`} />
              </div>
              <p className={`mt-1 truncate font-semibold ${large ? "text-[13px]" : "text-[10px] uppercase tracking-wide"}`}>
                {large ? t.detail : SHORT[t.state]}
              </p>
              {large && t.state !== "available" && (
                <p className="mt-0.5 truncate text-xs opacity-75">
                  {t.since ? relativeTime(t.since, now) : ""}
                  {t.spend ? ` · ${formatEGP(t.spend)}` : ""}
                </p>
              )}
            </motion.li>
          );
        })}
      </ul>
      <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold text-ink-soft">
        {(Object.keys(TABLE_STYLE) as TableState[]).map((k) => (
          <li key={k} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${TABLE_STYLE[k].dot}`} /> {TABLE_STATE_LABEL[k]}
          </li>
        ))}
      </ul>
    </div>
  );
}
