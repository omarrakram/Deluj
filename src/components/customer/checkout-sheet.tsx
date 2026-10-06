"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Banknote, Check, CreditCard, Loader2, Lock, ShieldCheck, Smartphone } from "lucide-react";
import { formatEGP } from "@/domain/money";
import type { PaymentMethod } from "@/domain/types";

const METHODS: { id: PaymentMethod; label: string; sub: string; icon: typeof CreditCard }[] = [
  { id: "card", label: "Card", sub: "Visa · Mastercard · Meeza", icon: CreditCard },
  { id: "apple_pay", label: "Apple Pay", sub: "Pay with your phone", icon: Smartphone },
  { id: "cash", label: "Cash at the table", sub: "Pay when you're ready to leave", icon: Banknote },
];

export type CheckoutPhase = "choose" | "processing" | "error";

export function CheckoutSheetBody({
  total,
  count,
  tableLabel,
  onPay,
  phase,
  error,
}: {
  total: number;
  count: number;
  tableLabel: string;
  onPay: (method: PaymentMethod) => void;
  phase: CheckoutPhase;
  error: string | null;
}) {
  const [method, setMethod] = useState<PaymentMethod>("card");
  const busy = phase === "processing";

  return (
    <div className="flex min-h-0 flex-col">
      <div className="overflow-y-auto px-5 pb-4 pt-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-deep">{tableLabel} · Checkout</p>
        <h2 className="font-display text-[1.7rem] font-extrabold tracking-tight">How would you like to pay?</h2>

        <div className="mt-4 space-y-2.5" role="radiogroup" aria-label="Payment method">
          {METHODS.map((m) => {
            const on = method === m.id;
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                role="radio"
                aria-checked={on}
                disabled={busy}
                onClick={() => setMethod(m.id)}
                className={`flex w-full items-center gap-3.5 rounded-3xl border-2 bg-white p-4 text-left transition active:scale-[0.99] ${
                  on ? "border-orange shadow-soft" : "border-transparent shadow-soft"
                }`}
              >
                <span className={`grid h-11 w-11 place-items-center rounded-2xl ${on ? "bg-orange text-white" : "bg-stone text-ink"}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="flex-1">
                  <span className="block font-display text-[17px] font-bold">{m.label}</span>
                  <span className="block text-[13px] text-ink-soft">{m.sub}</span>
                </span>
                <span className={`grid h-6 w-6 place-items-center rounded-full border-2 ${on ? "border-orange bg-orange text-white" : "border-line"}`}>
                  {on && <Check className="h-3.5 w-3.5" strokeWidth={3.5} />}
                </span>
              </button>
            );
          })}
        </div>

        <AnimatePresence initial={false}>
          {method !== "cash" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 rounded-3xl bg-ink p-4 text-cream">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <ShieldCheck className="h-4 w-4 text-powder" /> Demo payment
                  </span>
                  <span className="rounded-full bg-powder px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-ink">No real charge</span>
                </div>
                <p className="mt-2 text-[13px] leading-snug text-cream/75">
                  This demo simulates an approved {method === "card" ? "card" : "Apple Pay"} payment. No card details are collected or stored.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <p role="alert" className="mt-4 rounded-2xl bg-alert-soft px-4 py-3 text-sm font-semibold text-alert">
            {error}
          </p>
        )}
      </div>

      <div className="safe-bottom border-t border-line bg-cream px-5 pt-3">
        <button
          onClick={() => onPay(method)}
          disabled={busy}
          className={`relative flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-full text-[17px] font-bold text-white transition active:scale-[0.98] ${
            method === "apple_pay" ? "bg-black" : "bg-orange shadow-orange"
          }`}
        >
          {busy ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              {method === "cash" ? "Sending to the kitchen…" : "Confirming payment…"}
            </>
          ) : (
            <>
              {method === "cash" ? null : <Lock className="h-4 w-4" />}
              {method === "cash" ? `Place order · ${formatEGP(total)}` : `Pay ${formatEGP(total)}`}
            </>
          )}
        </button>
        <p className="mt-2 text-center text-xs text-ink-mute">
          {count} {count === 1 ? "item" : "items"} · goes straight to the Deluj kitchen
        </p>
      </div>
    </div>
  );
}
