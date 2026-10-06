"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, Droplets, HandPlatter, Loader2, ReceiptText, Soup, UtensilsCrossed, Wind } from "lucide-react";
import { SERVICE_KINDS } from "@/domain/requests";
import { relativeTime } from "@/domain/time";
import type { ServiceKind, ServiceRequest } from "@/domain/types";

const ICONS: Record<ServiceKind, typeof Droplets> = {
  waiter: HandPlatter,
  bill: ReceiptText,
  water: Droplets,
  napkins: Wind,
  cutlery: UtensilsCrossed,
  sauce: Soup,
};

export function ServiceSheetBody({
  tableLabel,
  requests,
  pending,
  now,
  onRequest,
}: {
  tableLabel: string;
  requests: ServiceRequest[];
  pending: ServiceKind | null;
  now: number;
  onRequest: (kind: ServiceKind) => void;
}) {
  const latest = (kind: ServiceKind) =>
    requests.filter((r) => r.kind === kind).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

  return (
    <div className="overflow-y-auto px-5 pb-8 pt-6">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-deep">{tableLabel}</p>
      <h2 className="font-display text-[1.7rem] font-extrabold tracking-tight">Need anything?</h2>
      <p className="text-ink-soft">We&apos;ve got you. One tap and the team is on it.</p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        {SERVICE_KINDS.map((k) => {
          const Icon = ICONS[k.kind];
          const r = latest(k.kind);
          const open = r && r.status !== "done";
          const doneRecently = r && r.status === "done" && r.completedAt && now - new Date(r.completedAt).getTime() < 60_000;
          const busy = pending === k.kind;
          return (
            <button
              key={k.kind}
              onClick={() => onRequest(k.kind)}
              disabled={busy || !!open}
              className={`relative flex min-h-[7.5rem] flex-col justify-between overflow-hidden rounded-3xl p-4 text-left transition active:scale-[0.98] ${
                open ? "bg-ink text-cream" : k.kind === "bill" ? "bg-orange text-white shadow-orange" : "bg-white text-ink shadow-soft"
              }`}
              aria-label={open ? `${k.label}: ${r!.status === "acknowledged" ? "on it" : "sent"}` : k.label}
            >
              <span className="flex items-center justify-between">
                <Icon className={`h-6 w-6 ${open ? "text-powder" : k.kind === "bill" ? "text-white" : "text-orange"}`} />
                {busy && <Loader2 className="h-5 w-5 animate-spin" />}
              </span>
              <span>
                <span className="block font-display text-[17px] font-bold leading-tight">{k.label}</span>
                <AnimatePresence mode="wait" initial={false}>
                  {open ? (
                    <motion.span key={r!.status} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-0.5 flex items-center gap-1.5 text-[13px] font-semibold text-powder">
                      <span className="h-2 w-2 animate-blink rounded-full bg-powder" />
                      {r!.status === "acknowledged" ? "On it — heading over" : `Sent · ${relativeTime(r!.createdAt, now)}`}
                    </motion.span>
                  ) : doneRecently ? (
                    <motion.span key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-0.5 flex items-center gap-1 text-[13px] font-semibold text-mint">
                      <Check className="h-3.5 w-3.5" strokeWidth={3} /> Done
                    </motion.span>
                  ) : (
                    <span className={`mt-0.5 block text-[13px] ${k.kind === "bill" ? "text-white/85" : "text-ink-soft"}`}>Tap to ask</span>
                  )}
                </AnimatePresence>
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-5 text-center text-xs text-ink-mute">Requests go straight to the team&apos;s screen at the counter.</p>
    </div>
  );
}
