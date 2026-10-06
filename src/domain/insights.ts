// Deluj Smart Insights: a deterministic rules engine over live demo state.
// Each rule reads real rows (orders, requests, menu) and only speaks when the
// data supports it. Wording can later be polished by a language model, but the
// insight itself never depends on one.

import { avgPrepMinutes, ordersByHour, pairingStats, peakWindow, productStats, todaysOrders } from "./analytics";
import { contextName, courseOf } from "./menu";
import { formatEGP, formatPercent } from "./money";
import { isActive, LATE_AFTER_MINUTES } from "./orders";
import { isOpen } from "./requests";
import { tableLabel } from "./tables";
import { formatHourLabel, minutesBetween } from "./time";
import type { DemoState, Order } from "./types";

export type InsightTone = "live" | "alert" | "opportunity" | "trend";

export interface Insight {
  id: string;
  tone: InsightTone;
  title: string;
  body: string;
  metric?: string;
  priority: number;
}

type Rule = (ctx: RuleContext) => Insight | null;

interface RuleContext {
  state: DemoState;
  now: number;
  today: Order[];
}

const LIVE_WINDOW_MINUTES = 20;

const liveOrder: Rule = ({ today, now }) => {
  const latest = today
    .filter((o) => o.source === "live" && minutesBetween(o.createdAt, now) < LIVE_WINDOW_MINUTES)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  if (!latest) return null;
  const where = latest.tableCode ? tableLabel(latest.tableCode) : "A guest";
  const drinks = latest.lines.filter((l) => courseOf(l.category) === "drink");
  const foods = latest.lines.filter((l) => courseOf(l.category) === "food");
  const p = pairingStats(today);
  if (drinks.length && foods.length && p.drinkOnlyAov > 0) {
    const lift = p.pairedAov - p.drinkOnlyAov;
    return {
      id: `live-pair-${latest.id}`,
      tone: "live",
      title: `${where} just paired ${drinks[0].name} with ${foods[0].name}`,
      body: `Drink-and-food orders average ${formatEGP(p.pairedAov)} today, versus ${formatEGP(p.drinkOnlyAov)} for drinks alone. Table pairings are working.`,
      metric: `+${formatEGP(lift)} per order`,
      priority: 100,
    };
  }
  if (drinks.length && !foods.length) {
    return {
      id: `live-drinks-${latest.id}`,
      tone: "live",
      title: `${where} ordered drinks only`,
      body: `${p.drinkOnlyCount} drink-only orders today. A pairing suggestion at the table is the easiest way to lift the average order.`,
      metric: `${formatEGP(latest.total)} order`,
      priority: 96,
    };
  }
  return {
    id: `live-food-${latest.id}`,
    tone: "live",
    title: `${where} placed an ${formatEGP(latest.total)} order`,
    body: `It went straight from the table to the kitchen — no waiter round-trip, no re-keying.`,
    priority: 94,
  };
};

const lateOrders: Rule = ({ today, now }) => {
  const late = today
    .filter((o) => isActive(o) && o.status !== "ready" && minutesBetween(o.createdAt, now) >= LATE_AFTER_MINUTES)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  if (!late.length) return null;
  const o = late[0];
  const mins = Math.floor(minutesBetween(o.createdAt, now));
  return {
    id: `late-${late.map((x) => x.id).join(".")}`,
    tone: "alert",
    title: late.length === 1 ? `Order #${o.number} is running late` : `${late.length} orders waiting over ${LATE_AFTER_MINUTES} min`,
    body: `${o.tableCode ? tableLabel(o.tableCode) : o.customerName ? `Pickup for ${o.customerName}` : "An order"} has been waiting ${mins} min. Worth a quick check with the kitchen.`,
    priority: 92,
  };
};

const billRequests: Rule = ({ state, now }) => {
  const bills = state.requests.filter((r) => r.kind === "bill" && isOpen(r));
  if (!bills.length) return null;
  const r = bills.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const mins = Math.floor(minutesBetween(r.createdAt, now));
  return {
    id: `bill-${r.id}`,
    tone: "alert",
    title: `${tableLabel(r.tableCode)} asked for the bill`,
    body: `Requested ${mins < 1 ? "just now" : `${mins} min ago`}. Closing quickly keeps tables turning at peak.`,
    priority: 88,
  };
};

const soldOut: Rule = ({ state, today }) => {
  const out = state.menu.filter((m) => !m.available);
  if (!out.length) return null;
  const first = out[0];
  const sold = productStats(today).find((p) => p.itemId === first.id)?.quantity ?? 0;
  return {
    id: `soldout-${out.map((m) => m.id).join(".")}`,
    tone: "alert",
    title: out.length === 1 ? `${contextName(first)} is sold out` : `${out.length} items are sold out`,
    body: `Guests now see it as Sold Out on every table, and pairing suggestions steer around it automatically.${sold ? ` It sold ${sold} today before running out.` : ""}`,
    priority: 86,
  };
};

const breakfastWithoutDrink: Rule = ({ today }) => {
  const breakfast = today.filter((o) => o.lines.some((l) => l.category === "breakfast"));
  if (breakfast.length < 4) return null;
  const noDrink = breakfast.filter((o) => !o.lines.some((l) => courseOf(l.category) === "drink"));
  if (!noDrink.length) return null;
  const share = noDrink.length / breakfast.length;
  return {
    id: "breakfast-no-drink",
    tone: "opportunity",
    title: `${noDrink.length} breakfast orders today came without a drink`,
    body: `That's ${formatPercent(share)} of Breakfast Club orders. Offering a Flat White (EGP 115) with every breakfast could have added about ${formatEGP(noDrink.length * 115)} today.`,
    metric: formatPercent(share),
    priority: 70,
  };
};

const coldFoam: Rule = ({ state, today }) => {
  const compatible = new Set(state.menu.filter((m) => m.modifierGroupIds.includes("cold-foam")).map((m) => m.id));
  let eligible = 0;
  let withFoam = 0;
  for (const o of today) for (const l of o.lines) {
    if (!compatible.has(l.itemId)) continue;
    eligible += l.quantity;
    if (l.modifiers.some((m) => m.optionId === "cold-foam")) withFoam += l.quantity;
  }
  if (eligible < 8) return null;
  const rate = withFoam / eligible;
  return {
    id: "cold-foam",
    tone: "opportunity",
    title: `Cold Foam is on ${formatPercent(rate)} of compatible drinks`,
    body: `Each one adds EGP 45. ${eligible - withFoam} iced drinks went out without it today — a one-tap suggestion on the phone could change that.`,
    metric: `+EGP 45 each`,
    priority: 62,
  };
};

const peakHours: Rule = ({ state, now }) => {
  const points = ordersByHour(state, now);
  const peak = peakWindow(points, 3, "typical");
  return {
    id: `peak-${peak.start}`,
    tone: "trend",
    title: `Table orders peak between ${formatHourLabel(peak.start)} and ${formatHourLabel(peak.end)}`,
    body: `${formatPercent(peak.share)} of a typical day's orders land in that window. Full bar staffing then protects prep times.`,
    priority: 55,
  };
};

const bestSeller: Rule = ({ today }) => {
  const top = productStats(today)[0];
  if (!top) return null;
  return {
    id: `best-${top.itemId}`,
    tone: "trend",
    title: `${top.name} is today's best seller`,
    body: `${top.quantity} sold so far for ${formatEGP(top.revenue)}.`,
    metric: `${top.quantity} sold`,
    priority: 50,
  };
};

const icedSpanish: Rule = ({ today, state }) => {
  const isl = state.menu.find((m) => m.id === "iced-spanish-latte");
  if (!isl) return null;
  const icedCoffees = state.menu.filter((m) => m.category === "iced" && m.tags.includes("coffee"));
  const maxPrice = Math.max(...icedCoffees.map((m) => m.price));
  if (isl.category !== "iced" || isl.price < maxPrice) return null;
  const stats = productStats(today).filter((s) => icedCoffees.some((m) => m.id === s.itemId));
  const qty = stats.find((s) => s.itemId === isl.id)?.quantity ?? 0;
  const ties = icedCoffees.filter((m) => m.id !== isl.id && m.price === maxPrice).map((m) => m.name);
  const isTopSeller = stats[0]?.itemId === isl.id;
  return {
    id: "iced-spanish",
    tone: "trend",
    title: "Iced Spanish Latte is the highest-value iced coffee",
    body: `At ${formatEGP(isl.price)}${ties.length ? ` (matched only by ${ties.join(", ")})` : ""} it's ${isTopSeller ? "also the most-ordered iced coffee" : "a strong seller"} today with ${qty} sold. A natural one to feature at the top of the menu.`,
    priority: 46,
  };
};

const matchaReturning: Rule = ({ today }) => {
  const matchaOrders = today.filter((o) => o.lines.some((l) => l.category === "matcha"));
  if (matchaOrders.length < 4) return null;
  const share = matchaOrders.filter((o) => o.returning).length / matchaOrders.length;
  const overall = today.filter((o) => o.returning).length / (today.length || 1);
  if (share <= overall) return null;
  return {
    id: "matcha-returning",
    tone: "trend",
    title: "Matcha is performing strongly with returning guests",
    body: `${formatPercent(share)} of today's matcha orders came from returning guests, versus ${formatPercent(overall)} overall.`,
    priority: 44,
  };
};

const directShare: Rule = ({ today }) => {
  if (today.length < 10) return null;
  const direct = today.filter((o) => o.via !== "marketplace").length / today.length;
  const delivery = today.filter((o) => o.channel === "delivery");
  const marketplace = delivery.filter((o) => o.via === "marketplace").length;
  return {
    id: "direct-share",
    tone: "trend",
    title: `${formatPercent(direct)} of today's orders came in direct`,
    body: `Only ${marketplace} of ${today.length} orders went through a delivery marketplace. Every direct order keeps the full margin and the guest relationship.`,
    priority: 48,
  };
};

const breakfastPremium: Rule = ({ state, today }) => {
  const items = state.menu.filter((m) => m.category === "breakfast").sort((a, b) => b.price - a.price).slice(0, 2);
  if (items.length < 2) return null;
  const qty = productStats(today).filter((s) => items.some((i) => i.id === s.itemId)).reduce((s, p) => s + p.quantity, 0);
  return {
    id: "breakfast-premium",
    tone: "opportunity",
    title: `${items[1].name} and ${items[0].name} lead the Breakfast Club`,
    body: `At ${formatEGP(items[1].price)} and ${formatEGP(items[0].price)} they're the highest-priced breakfast plates — ${qty} sold today. Featuring them before noon raises the morning average.`,
    priority: 40,
  };
};

const prepTime: Rule = ({ today }) => {
  const avg = avgPrepMinutes(today);
  if (!avg) return null;
  return {
    id: "prep-time",
    tone: "trend",
    title: `Average time to ready: ${avg.toFixed(1)} min`,
    body: `Measured from the moment an order is placed to the moment the kitchen marks it ready.`,
    priority: 35,
  };
};

const RULES: Rule[] = [
  liveOrder,
  lateOrders,
  billRequests,
  soldOut,
  breakfastWithoutDrink,
  coldFoam,
  peakHours,
  directShare,
  bestSeller,
  icedSpanish,
  matchaReturning,
  breakfastPremium,
  prepTime,
];

export function computeInsights(state: DemoState, now: number, limit = 6): Insight[] {
  const ctx: RuleContext = { state, now, today: todaysOrders(state.orders, now) };
  const out: Insight[] = [];
  for (const rule of RULES) {
    try {
      const insight = rule(ctx);
      if (insight) out.push(insight);
    } catch {
      // A broken rule must never take the dashboard down.
    }
  }
  return out.sort((a, b) => b.priority - a.priority).slice(0, limit);
}
