"use client";

import { motion } from "motion/react";
import { ArrowRight, Banknote, CreditCard, RotateCcw, ShoppingBag, Smartphone, Timer, Truck, UtensilsCrossed } from "lucide-react";
import { formatEGP } from "@/domain/money";
import { NEXT_ACTION_LABEL, nextStatus, previousStatus, STATUS_LABEL, urgency, type Urgency } from "@/domain/orders";
import { tableNumber } from "@/domain/tables";
import { elapsedClock, relativeTime } from "@/domain/time";
import type { Order, OrderStatus } from "@/domain/types";

const URGENCY_STYLE = {
  fresh: { timer: "bg-mint-soft text-mint", bar: "bg-mint" },
  warn: { timer: "bg-amber-soft text-amber", bar: "bg-amber" },
  late: { timer: "bg-alert text-white", bar: "bg-alert" },
};

const ACTION_STYLE: Partial<Record<OrderStatus, string>> = {
  new: "bg-orange text-white shadow-orange",
  accepted: "bg-ink text-cream",
  preparing: "bg-powder text-ink",
  ready: "bg-mint text-white",
};

export function OrderCard({
  order,
  now,
  fresh,
  dark,
  onMove,
}: {
  order: Order;
  now: number;
  fresh: boolean;
  dark: boolean;
  onMove: (order: Order, to: OrderStatus) => void;
}) {
  // Ready orders are judged by how long they've waited for a runner, not total age.
  const u: Urgency =
    order.status === "ready"
      ? (() => {
          const waited = (now - new Date(order.readyAt ?? order.createdAt).getTime()) / 60_000;
          return waited >= 6 ? "late" : waited >= 3 ? "warn" : "fresh";
        })()
      : urgency(order, now);
  const style = URGENCY_STYLE[u];
  const next = nextStatus(order.status);
  const prev = previousStatus(order.status);
  const ChannelIcon = order.channel === "dine_in" ? UtensilsCrossed : order.channel === "pickup" ? ShoppingBag : Truck;
  const PayIcon = order.paymentMethod === "cash" ? Banknote : order.paymentMethod === "apple_pay" ? Smartphone : CreditCard;
  const title = order.tableCode ? `TABLE ${tableNumber(order.tableCode)}` : order.channel === "pickup" ? "PICKUP" : "DELIVERY";

  return (
    <motion.article
      layout
      initial={{ opacity: 0, scale: 0.9, y: -12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      className={`relative overflow-hidden rounded-2xl ${dark ? "bg-kitchen-card text-cream" : "bg-white text-ink"} shadow-soft ${
        fresh ? "ring-4 ring-orange animate-pulse-ring" : order.status === "new" ? "ring-2 ring-orange/60" : ""
      }`}
      data-testid={`order-${order.number}`}
      aria-label={`Order ${order.number}, ${title}, ${STATUS_LABEL[order.status]}`}
    >
      <span className={`absolute inset-y-0 left-0 w-1.5 ${order.status === "served" ? "bg-ink-mute/40" : style.bar}`} />
      <div className="py-3.5 pl-5 pr-4">
        <header>
          <div className="flex items-center justify-between gap-2">
            <p className="font-display text-[1.4rem] font-extrabold leading-none tracking-tight">{title}</p>
            {order.status === "served" ? (
              <span className={`shrink-0 text-xs font-semibold ${dark ? "text-cream/50" : "text-ink-mute"}`}>{relativeTime(order.servedAt ?? order.updatedAt, now)}</span>
            ) : (
              <span
                className={`tabular flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[13px] font-bold ${style.timer} ${u === "late" ? "animate-blink" : ""}`}
                title={order.status === "ready" ? "Waiting to be served" : "Time since order"}
              >
                <Timer className="h-3.5 w-3.5" />
                {elapsedClock(order.status === "ready" ? order.readyAt ?? order.createdAt : order.createdAt, now)}
              </span>
            )}
          </div>
          <p className={`mt-1 flex items-center gap-1.5 whitespace-nowrap text-[13px] font-semibold ${dark ? "text-cream/60" : "text-ink-mute"}`}>
            #{order.number}
            <span aria-hidden>·</span>
            <ChannelIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{order.customerName ?? (order.channel === "dine_in" ? "Dine-in" : order.channel === "pickup" ? "Pickup" : "Delivery")}</span>
          </p>
        </header>

        {(fresh || order.status === "new" || order.status === "accepted" || u === "late") && order.status !== "served" && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {order.status === "new" && <span className="rounded-full bg-orange px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-white">New</span>}
            {order.status === "accepted" && <span className="rounded-full bg-powder px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-ink">Accepted</span>}
            {u === "late" && (
              <span className="rounded-full bg-alert-soft px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-alert">
                {order.status === "ready" ? "Waiting to serve" : "Running late"}
              </span>
            )}
          </div>
        )}

        {order.status !== "served" && (
          <ul className={`mt-3 space-y-2 border-t pt-3 ${dark ? "border-white/10" : "border-line"}`}>
            {order.lines.map((l) => (
              <li key={l.lineId}>
                <p className="text-[17px] font-bold leading-snug">
                  <span className="tabular text-orange">{l.quantity} ×</span> {l.name}
                </p>
                {l.modifiers.length > 0 && (
                  <p className={`pl-7 text-[14px] font-medium ${dark ? "text-cream/75" : "text-ink-soft"}`}>{l.modifiers.map((m) => m.label).join(" · ")}</p>
                )}
                {l.note && <p className="ml-7 mt-1 rounded-lg bg-amber-soft px-2 py-1 text-[13px] font-semibold text-amber">“{l.note}”</p>}
              </li>
            ))}
          </ul>
        )}
        {order.status === "served" && (
          <p className={`mt-1.5 truncate text-[13px] ${dark ? "text-cream/60" : "text-ink-soft"}`}>{order.lines.map((l) => `${l.quantity}× ${l.name}`).join(", ")}</p>
        )}

        {order.status !== "served" && (
          <div className={`mt-3 flex items-center justify-between text-[13px] font-semibold ${dark ? "text-cream/70" : "text-ink-soft"}`}>
            <span className={`flex items-center gap-1.5 ${order.paymentStatus === "pay_at_table" ? "text-amber" : "text-mint"}`}>
              <PayIcon className="h-4 w-4 shrink-0" />
              {order.paymentStatus === "pay_at_table" ? "Cash at table" : order.paymentStatus === "paid_marketplace" ? "Paid · marketplace" : "Paid"}
            </span>
            <span className="tabular">{formatEGP(order.total)}</span>
          </div>
        )}

        {next && (
          <div className="mt-3 flex gap-2">
            {prev && order.status !== "new" && (
              <button
                onClick={() => onMove(order, prev)}
                className={`grid h-12 w-10 shrink-0 place-items-center rounded-xl ${dark ? "bg-white/10 text-cream/80" : "bg-stone text-ink-soft"} transition active:scale-95`}
                aria-label={`Move order ${order.number} back to ${STATUS_LABEL[prev]}`}
                title={`Back to ${STATUS_LABEL[prev]}`}
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => onMove(order, next)}
              className={`flex h-12 min-w-0 flex-1 items-center justify-between gap-1 whitespace-nowrap rounded-xl px-3.5 text-[15px] font-bold transition active:scale-[0.98] ${ACTION_STYLE[order.status]}`}
              data-testid={`advance-${order.number}`}
            >
              {NEXT_ACTION_LABEL[order.status]}
              <ArrowRight className="h-5 w-5 shrink-0" />
            </button>
          </div>
        )}
        {!next && order.status === "served" && prev && (
          <button
            onClick={() => onMove(order, prev)}
            className={`mt-2 flex items-center gap-1 text-xs font-semibold ${dark ? "text-cream/50" : "text-ink-mute"}`}
          >
            <RotateCcw className="h-3 w-3" /> Recall
          </button>
        )}
      </div>
    </motion.article>
  );
}
