"use client";

import { AnimatePresence, motion } from "motion/react";
import { BellRing, ChefHat, CircleDot, QrCode, ShoppingBag, Utensils } from "lucide-react";
import { formatEGP } from "@/domain/money";
import { relativeTime } from "@/domain/time";
import type { ActivityEvent, ActivityKind } from "@/domain/types";

const ICON: Record<ActivityKind, typeof BellRing> = {
  order_placed: ShoppingBag,
  order_status: ChefHat,
  request_created: BellRing,
  request_status: Utensils,
  menu_updated: CircleDot,
  table_opened: QrCode,
};

const TONE: Record<ActivityKind, string> = {
  order_placed: "bg-orange text-white",
  order_status: "bg-powder-soft text-powder-deep",
  request_created: "bg-orange-wash text-orange-deep",
  request_status: "bg-mint-soft text-mint",
  menu_updated: "bg-ink text-cream",
  table_opened: "bg-stone text-ink",
};

export function LiveFeed({ events, now, limit = 12, freshIds }: { events: ActivityEvent[]; now: number; limit?: number; freshIds: Set<string> }) {
  const list = events.slice(0, limit);
  return (
    <ol className="relative space-y-1" aria-live="polite" data-testid="live-feed">
      <AnimatePresence initial={false}>
        {list.map((e) => {
          const Icon = ICON[e.kind];
          const fresh = freshIds.has(e.id);
          return (
            <motion.li
              key={e.id}
              layout
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="overflow-hidden"
            >
              <div className={`flex items-start gap-3 rounded-2xl px-2.5 py-2.5 transition-colors duration-1000 ${fresh ? "bg-orange-wash" : ""}`}>
                <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${TONE[e.kind]}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-[14px] font-bold leading-snug">{e.title}</p>
                    <span className="shrink-0 text-[11px] font-semibold text-ink-mute">{relativeTime(e.createdAt, now)}</span>
                  </div>
                  {e.amount !== undefined && <p className="text-[14px] font-bold text-orange-deep">{formatEGP(e.amount)}</p>}
                  {e.detail && <p className="truncate text-[13px] text-ink-soft">{e.detail}</p>}
                </div>
              </div>
            </motion.li>
          );
        })}
      </AnimatePresence>
      {list.length === 0 && <li className="py-8 text-center text-sm text-ink-mute">Activity appears here the moment it happens.</li>}
    </ol>
  );
}
