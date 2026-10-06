"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";
import { ArrowLeft, Bell, Check, ChefHat, CookingPot, PartyPopper, ReceiptText, Sparkles, Send } from "lucide-react";
import { CroissantDoodle, Star, Wave, Wordmark } from "@/components/brand/logo";
import { LinkDot } from "@/components/ui/link-status";
import { formatEGP } from "@/domain/money";
import { CUSTOMER_STEPS, customerStage, customerStepIndex, estimatePrepMinutes, type CustomerStage } from "@/domain/orders";
import { tableLabel } from "@/domain/tables";
import { formatCairoTime, minutesBetween } from "@/domain/time";
import type { Order } from "@/domain/types";
import type { LinkStatus } from "@/client/store";

const STAGE_COPY: Record<CustomerStage, { title: string; sub: (t: string) => string; icon: typeof Check }> = {
  sent: { title: "Sending to the kitchen", sub: () => "Hang tight — this takes a second.", icon: Send },
  confirmed: { title: "Order confirmed", sub: () => "The kitchen has your order. Good food is on the way.", icon: ChefHat },
  preparing: { title: "Preparing", sub: () => "Freshly made for you.", icon: CookingPot },
  almost: { title: "Almost ready", sub: () => "Just the finishing touches.", icon: Sparkles },
  ready: { title: "Ready — coming to you", sub: (t) => `Your order is on its way to ${t}.`, icon: Bell },
  served: { title: "Enjoy!", sub: () => "Served. Need anything else? We've got you.", icon: PartyPopper },
  cancelled: { title: "Order cancelled", sub: () => "Please ask our team at the counter.", icon: ReceiptText },
};

const STAMP: Partial<Record<CustomerStage, keyof Order>> = {
  confirmed: "acceptedAt",
  preparing: "preparingAt",
  ready: "readyAt",
  served: "servedAt",
};

export function TrackingView({
  order,
  others,
  now,
  link,
  onBack,
  onService,
  onRequestBill,
  billState,
}: {
  order: Order;
  others: Order[];
  now: number;
  link: LinkStatus;
  onBack: () => void;
  onService: () => void;
  onRequestBill: () => void;
  billState: "idle" | "sent" | "acknowledged" | "pending";
}) {
  const stage = customerStage(order, now);
  const current = stage === "sent" ? 0 : customerStepIndex(stage);
  const copy = STAGE_COPY[stage];
  const Icon = copy.icon;
  const table = tableLabel(order.tableCode);
  const eta = Math.max(1, Math.round(estimatePrepMinutes(order.lines) - minutesBetween(order.acceptedAt ?? order.createdAt, now)));

  // A gentle buzz whenever the kitchen moves the order on.
  const lastStage = useRef(stage);
  useEffect(() => {
    if (lastStage.current !== stage) {
      navigator.vibrate?.([18, 40, 18]);
      lastStage.current = stage;
    }
  }, [stage]);

  return (
    <div className="min-h-dvh pb-10">
      <section className="relative overflow-hidden bg-orange text-cream">
        <CroissantDoodle className="absolute -right-8 top-16 w-40 rotate-12 text-cream/15" />
        <Star className="absolute left-8 top-28 h-3.5 w-3.5 text-powder" />
        <div className="relative mx-auto max-w-md px-5 pb-8 pt-3">
          <div className="flex items-center justify-between">
            <button onClick={onBack} className="flex h-10 items-center gap-1.5 rounded-full bg-white/15 pl-2.5 pr-4 text-sm font-semibold backdrop-blur transition active:scale-95">
              <ArrowLeft className="h-4 w-4" /> Menu
            </button>
            <span className="rounded-full bg-white/90 px-2 py-1">
              <LinkDot status={link} />
            </span>
          </div>
          <div className="mt-6 flex items-center gap-3">
            <Wordmark className="h-9 text-powder" />
            <div className="border-l border-cream/30 pl-3">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-cream/80">
                {table} · Order #{order.number}
              </p>
              <p className="text-sm text-cream/80">Placed at {formatCairoTime(order.createdAt)}</p>
            </div>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={stage}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35 }}
              className="mt-6"
            >
              <div className="flex items-start gap-4">
                <motion.span
                  initial={{ scale: 0.6, rotate: -12 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 16 }}
                  className="grid h-16 w-16 shrink-0 place-items-center rounded-3xl bg-cream text-orange shadow-lift"
                >
                  <Icon className="h-8 w-8" />
                </motion.span>
                <div>
                  <h1 className="font-display text-[2rem] font-extrabold leading-[1.05] tracking-tight" data-testid="order-stage">
                    {copy.title}
                  </h1>
                  <p className="mt-1 text-[15px] text-cream/90">{copy.sub(table)}</p>
                </div>
              </div>
              {(stage === "confirmed" || stage === "preparing" || stage === "almost" || stage === "sent") && (
                <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-ink/20 px-3 py-1.5 text-sm font-semibold">
                  <span className="h-2 w-2 animate-blink rounded-full bg-powder" /> Usually ready in about {eta} min
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>
      <Wave className="-mt-px block h-4 w-full text-orange" flip />

      <div className="mx-auto max-w-md px-5">
        {/* Timeline */}
        <ol className="mt-4 rounded-3xl bg-white p-5 shadow-soft" aria-label="Order progress">
          {CUSTOMER_STEPS.map((step, i) => {
            const done = i < current || stage === "served";
            const active = i === current && stage !== "served";
            const stampKey = STAMP[step.stage];
            const stamp = stampKey ? (order[stampKey] as string | undefined) : undefined;
            return (
              <li key={step.stage} className="relative flex gap-4 pb-5 last:pb-0">
                {i < CUSTOMER_STEPS.length - 1 && (
                  <span className="absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-0.5 overflow-hidden rounded bg-line">
                    <motion.span
                      className="block w-full bg-orange"
                      initial={false}
                      animate={{ height: done ? "100%" : "0%" }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    />
                  </span>
                )}
                <motion.span
                  initial={false}
                  animate={{ scale: active ? [1, 1.12, 1] : 1 }}
                  transition={active ? { repeat: Infinity, duration: 1.6 } : {}}
                  className={`relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 ${
                    done ? "border-orange bg-orange text-white" : active ? "border-orange bg-orange-wash text-orange" : "border-line bg-white text-ink-mute"
                  }`}
                >
                  {done ? <Check className="h-4 w-4" strokeWidth={3} /> : <span className={`h-2 w-2 rounded-full ${active ? "bg-orange" : "bg-line"}`} />}
                </motion.span>
                <div className="flex flex-1 items-center justify-between pt-1">
                  <span className={`font-semibold ${done || active ? "text-ink" : "text-ink-mute"}`}>
                    {stage === "sent" && i === 0 ? "Waiting for the kitchen" : step.label}
                  </span>
                  {stamp && done && <span className="text-xs font-semibold text-ink-mute">{formatCairoTime(stamp)}</span>}
                  {active && <span className="text-xs font-bold uppercase tracking-wide text-orange-deep">Now</span>}
                </div>
              </li>
            );
          })}
        </ol>

        {/* Quick actions */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            onClick={onRequestBill}
            disabled={billState !== "idle"}
            className={`flex h-14 items-center justify-center gap-2 rounded-full font-bold transition active:scale-[0.98] ${
              billState === "idle" ? "bg-ink text-cream" : "bg-mint-soft text-mint"
            }`}
            data-testid="request-bill"
          >
            {billState === "idle" ? (
              <>
                <ReceiptText className="h-5 w-5" /> Request bill
              </>
            ) : (
              <>
                <Check className="h-5 w-5" strokeWidth={3} /> {billState === "acknowledged" ? "Bill on its way" : billState === "pending" ? "Sending…" : "Bill requested"}
              </>
            )}
          </button>
          <button onClick={onService} className="flex h-14 items-center justify-center gap-2 rounded-full bg-white font-bold shadow-soft transition active:scale-[0.98]">
            <Bell className="h-5 w-5 text-orange" /> Need anything?
          </button>
        </div>

        {/* Receipt */}
        <div className="mt-4 rounded-3xl bg-white p-5 shadow-soft">
          <p className="font-display text-lg font-bold">Your order</p>
          <ul className="mt-2 divide-y divide-line">
            {order.lines.map((l) => (
              <li key={l.lineId} className="flex justify-between gap-3 py-2.5">
                <div>
                  <p className="font-semibold">
                    {l.quantity} × {l.name}
                  </p>
                  {l.modifiers.length > 0 && <p className="text-[13px] text-ink-soft">{l.modifiers.map((m) => m.label).join(" · ")}</p>}
                  {l.note && <p className="text-[13px] italic text-ink-soft">“{l.note}”</p>}
                </div>
                <span className="tabular shrink-0 font-semibold">{formatEGP(l.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-1 flex justify-between border-t border-line pt-3 text-lg font-bold">
            <span>Total</span>
            <span className="tabular">{formatEGP(order.total)}</span>
          </div>
          <p className="mt-1 text-sm font-semibold text-mint">
            {order.paymentStatus === "paid"
              ? `Paid · ${order.paymentMethod === "apple_pay" ? "Apple Pay" : "Card"} (demo)`
              : "Pay at the table when you're ready"}
          </p>
        </div>

        {others.length > 0 && (
          <div className="mt-4 rounded-3xl bg-white/60 p-4">
            <p className="text-sm font-semibold text-ink-soft">Earlier at this table</p>
            {others.map((o) => (
              <p key={o.id} className="mt-1 flex justify-between text-sm">
                <span>
                  Order #{o.number} · {o.status === "served" ? "Served" : customerStage(o, now) === "ready" ? "Ready" : "In progress"}
                </span>
                <span className="tabular">{formatEGP(o.total)}</span>
              </p>
            ))}
          </div>
        )}

        <button onClick={onBack} className="mt-5 h-14 w-full rounded-full bg-orange font-bold text-white shadow-orange transition active:scale-[0.98]">
          Order something else
        </button>
      </div>
    </div>
  );
}
