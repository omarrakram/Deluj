// Order lifecycle shared by the kitchen display (which moves orders) and the
// customer tracker (which renders them).

import { minutesBetween } from "./time";
import type { Order, OrderLine, OrderStatus } from "./types";

export const STATUS_FLOW: OrderStatus[] = ["new", "accepted", "preparing", "ready", "served"];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  new: "New",
  accepted: "Accepted",
  preparing: "Preparing",
  ready: "Ready",
  served: "Served",
  cancelled: "Cancelled",
};

export const ACTIVE_STATUSES: OrderStatus[] = ["new", "accepted", "preparing", "ready"];

export function isActive(order: Pick<Order, "status">): boolean {
  return ACTIVE_STATUSES.includes(order.status);
}

/**
 * Forward moves may skip steps (a barista can go straight to Ready);
 * backward moves are limited to one step (a "recall" after a mis-tap);
 * cancelling is only possible before preparation starts.
 */
export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to) return false;
  if (to === "cancelled") return from === "new" || from === "accepted";
  if (from === "cancelled") return false;
  const a = STATUS_FLOW.indexOf(from);
  const b = STATUS_FLOW.indexOf(to);
  if (a < 0 || b < 0) return false;
  return b > a || b === a - 1;
}

/** The next step a kitchen button advances to. */
export function nextStatus(status: OrderStatus): OrderStatus | null {
  const i = STATUS_FLOW.indexOf(status);
  if (i < 0 || i >= STATUS_FLOW.length - 1) return null;
  return STATUS_FLOW[i + 1];
}

export function previousStatus(status: OrderStatus): OrderStatus | null {
  const i = STATUS_FLOW.indexOf(status);
  if (i <= 0) return null;
  return STATUS_FLOW[i - 1];
}

export const NEXT_ACTION_LABEL: Partial<Record<OrderStatus, string>> = {
  new: "Accept order",
  accepted: "Start preparing",
  preparing: "Mark ready",
  ready: "Mark served",
};

/** Returns a copy of the order moved to `to`, stamping the relevant timestamps. */
export function withStatus(order: Order, to: OrderStatus, nowIso: string): Order {
  const next: Order = { ...order, status: to, updatedAt: nowIso };
  const idx = STATUS_FLOW.indexOf(to);
  if (idx >= 1 && !next.acceptedAt) next.acceptedAt = nowIso;
  if (idx >= 2 && !next.preparingAt) next.preparingAt = nowIso;
  if (idx >= 3 && !next.readyAt) next.readyAt = nowIso;
  if (idx >= 4 && !next.servedAt) next.servedAt = nowIso;
  // A recall clears the stamps of the steps being undone.
  if (idx >= 0) {
    if (idx < 4) delete next.servedAt;
    if (idx < 3) delete next.readyAt;
    if (idx < 2) delete next.preparingAt;
    if (idx < 1) delete next.acceptedAt;
  }
  return next;
}

/** Rough kitchen estimate: drinks ~4 min, food ~11 min, a little extra for big orders. */
export function estimatePrepMinutes(lines: Pick<OrderLine, "category" | "quantity">[]): number {
  const drinks = new Set(["coffee", "iced", "matcha", "refreshers", "beyond", "essentials"]);
  let base = 0;
  let count = 0;
  for (const l of lines) {
    base = Math.max(base, drinks.has(l.category) ? 4 : 11);
    count += l.quantity;
  }
  return Math.min(25, base + Math.max(0, count - 2));
}

export const LATE_AFTER_MINUTES = 12;
export const WARN_AFTER_MINUTES = 8;

export type Urgency = "fresh" | "warn" | "late";

/** How long an active order has been waiting, for kitchen colour-coding. */
export function urgency(order: Pick<Order, "createdAt" | "status">, now: number): Urgency {
  if (!isActive(order)) return "fresh";
  const mins = minutesBetween(order.createdAt, now);
  if (mins >= LATE_AFTER_MINUTES) return "late";
  if (mins >= WARN_AFTER_MINUTES) return "warn";
  return "fresh";
}

// ── Customer-facing progress ────────────────────────────────────────────────

export type CustomerStage = "sent" | "confirmed" | "preparing" | "almost" | "ready" | "served" | "cancelled";

export const CUSTOMER_STEPS: { stage: CustomerStage; label: string }[] = [
  { stage: "confirmed", label: "Order confirmed" },
  { stage: "preparing", label: "Preparing" },
  { stage: "almost", label: "Almost ready" },
  { stage: "ready", label: "Ready · coming to you" },
  { stage: "served", label: "Served" },
];

/** "Almost ready" appears automatically once preparation is well under way. */
export const ALMOST_READY_AFTER_SECONDS = 75;

export function customerStage(order: Order, now: number): CustomerStage {
  switch (order.status) {
    case "new":
      return "sent";
    case "accepted":
      return "confirmed";
    case "preparing": {
      const since = order.preparingAt ? (now - new Date(order.preparingAt).getTime()) / 1000 : 0;
      const eta = estimatePrepMinutes(order.lines) * 60;
      return since >= Math.min(ALMOST_READY_AFTER_SECONDS, eta * 0.6) ? "almost" : "preparing";
    }
    case "ready":
      return "ready";
    case "served":
      return "served";
    default:
      return "cancelled";
  }
}

/** Index into CUSTOMER_STEPS of the step currently in progress (-1 before confirmation). */
export function customerStepIndex(stage: CustomerStage): number {
  return CUSTOMER_STEPS.findIndex((s) => s.stage === stage);
}

export function orderItemCount(order: Pick<Order, "lines">): number {
  return order.lines.reduce((s, l) => s + l.quantity, 0);
}

export function summarizeLines(lines: Pick<OrderLine, "name" | "quantity">[], max = 3): string {
  const parts = lines.slice(0, max).map((l) => `${l.name} ×${l.quantity}`);
  if (lines.length > max) parts.push(`+${lines.length - max} more`);
  return parts.join(" · ");
}
