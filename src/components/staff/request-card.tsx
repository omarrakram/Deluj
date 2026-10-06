"use client";

import { motion } from "motion/react";
import { Check, Droplets, HandPlatter, ReceiptText, Soup, UtensilsCrossed, Wind } from "lucide-react";
import { SERVICE_KIND_META } from "@/domain/requests";
import { tableNumber } from "@/domain/tables";
import { relativeTime } from "@/domain/time";
import type { ServiceKind, ServiceRequest, ServiceStatus } from "@/domain/types";

const ICONS: Record<ServiceKind, typeof Droplets> = {
  waiter: HandPlatter,
  bill: ReceiptText,
  water: Droplets,
  napkins: Wind,
  cutlery: UtensilsCrossed,
  sauce: Soup,
};

export function RequestCard({
  request,
  now,
  fresh,
  dark,
  onMove,
}: {
  request: ServiceRequest;
  now: number;
  fresh: boolean;
  dark: boolean;
  onMove: (r: ServiceRequest, to: ServiceStatus) => void;
}) {
  const Icon = ICONS[request.kind];
  const meta = SERVICE_KIND_META[request.kind];
  const isBill = request.kind === "bill";
  const ack = request.status === "acknowledged";
  const tone = isBill && !ack ? "bg-orange text-white" : dark ? "bg-kitchen-card text-cream" : "bg-white text-ink";
  return (
    <motion.article
      layout
      initial={{ opacity: 0, x: 40, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, transition: { duration: 0.25 } }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      className={`rounded-2xl p-4 shadow-soft ${tone} ${fresh ? "ring-4 ring-powder animate-pulse-ring" : ""}`}
      data-testid={`request-${request.tableCode}-${request.kind}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-display text-[1.35rem] font-extrabold leading-none tracking-tight">TABLE {tableNumber(request.tableCode)}</p>
          <p className={`mt-1.5 font-display text-[1.05rem] font-extrabold tracking-wide ${isBill && !ack ? "text-white" : "text-orange"}`}>{meta.staffLabel}</p>
          <p className={`mt-1 text-xs font-bold uppercase tracking-wider ${isBill && !ack ? "text-white/80" : dark ? "text-cream/55" : "text-ink-mute"}`}>
            {ack ? `On it · ${relativeTime(request.acknowledgedAt ?? request.updatedAt, now)}` : relativeTime(request.createdAt, now)}
          </p>
        </div>
        <span className={`grid h-11 w-11 place-items-center rounded-2xl ${isBill && !ack ? "bg-white/20" : dark ? "bg-white/10" : "bg-orange-wash"}`}>
          <Icon className={`h-5 w-5 ${isBill && !ack ? "text-white" : "text-orange"}`} />
        </span>
      </div>
      <div className="mt-3 flex gap-2">
        {!ack && (
          <button
            onClick={() => onMove(request, "acknowledged")}
            className={`h-11 flex-1 rounded-xl text-sm font-bold transition active:scale-[0.98] ${isBill ? "bg-white/20 text-white" : dark ? "bg-white/10 text-cream" : "bg-stone text-ink"}`}
          >
            On it
          </button>
        )}
        <button
          onClick={() => onMove(request, "done")}
          className={`flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-bold transition active:scale-[0.98] ${
            isBill && !ack ? "bg-white text-orange-deep" : "bg-mint text-white"
          }`}
          data-testid={`complete-${request.tableCode}-${request.kind}`}
        >
          <Check className="h-4 w-4" strokeWidth={3} /> Done
        </button>
      </div>
    </motion.article>
  );
}
