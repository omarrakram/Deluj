// Owner analytics, computed from live state on every device. Today's numbers come
// from real order rows (seeded + live); past days come from the deterministic
// generator. Everything here is labelled "Demo Data" in the UI.

import { CATEGORIES, CATEGORY_BY_ID, courseOf, seedMenu } from "./menu";
import { isActive } from "./orders";
import { isOpen, SERVICE_KIND_META } from "./requests";
import { CLOSE_MINUTE, OPEN_MINUTE, summarizeDay, type DaySummary } from "./seed";
import { TABLE_CODES, tableLabel } from "./tables";
import { addDaysToKey, cairoDateKey, cairoHour, cairoMinuteOfDay, minutesBetween } from "./time";
import type { CategoryId, DemoState, Order, OrderChannel, ServiceKind } from "./types";

const HISTORY_MENU = seedMenu();
const historyCache = new Map<string, DaySummary>();

/** Past-day aggregates (memoised; history never changes). */
export function pastDay(dateKey: string, untilMinute = CLOSE_MINUTE): DaySummary {
  const k = `${dateKey}@${untilMinute}`;
  let v = historyCache.get(k);
  if (!v) {
    v = summarizeDay(HISTORY_MENU, dateKey, untilMinute);
    historyCache.set(k, v);
  }
  return v;
}

export function todaysOrders(orders: Order[], now: number): Order[] {
  const key = cairoDateKey(now);
  return orders.filter((o) => o.status !== "cancelled" && cairoDateKey(o.createdAt) === key);
}

export interface Kpis {
  revenue: number;
  orders: number;
  aov: number;
  activeTables: number;
  directOrders: number;
  directPct: number;
  newCustomers: number;
  returningCustomers: number;
  returningPct: number;
  /** vs the average of the same weekday over the previous 4 weeks, at the same time of day. null when the baseline is too thin to compare. */
  revenueDelta: number | null;
  ordersDelta: number | null;
  aovDelta: number | null;
}

export function computeKpis(state: DemoState, now: number): Kpis {
  const today = todaysOrders(state.orders, now);
  const revenue = today.reduce((s, o) => s + o.total, 0);
  const orders = today.length;
  const direct = today.filter((o) => o.via !== "marketplace").length;
  const returning = today.filter((o) => o.returning).length;
  const minute = Math.max(OPEN_MINUTE, cairoMinuteOfDay(now));
  const weeks = [1, 2, 3, 4].map((w) => pastDay(addDaysToKey(cairoDateKey(now), -7 * w), minute));
  const baseOrders = weeks.reduce((s, d) => s + d.orders, 0) / weeks.length;
  const baseRevenue = weeks.reduce((s, d) => s + d.revenue, 0) / weeks.length;
  const baseAov = baseOrders ? baseRevenue / baseOrders : 0;
  const aov = orders ? revenue / orders : 0;
  const comparable = baseOrders >= 12;
  const delta = (a: number, b: number) => (comparable && b > 0 ? (a - b) / b : null);
  return {
    revenue,
    orders,
    aov,
    activeTables: tableStatuses(state, now).filter((t) => t.state !== "available").length,
    directOrders: direct,
    directPct: orders ? direct / orders : 0,
    newCustomers: orders - returning,
    returningCustomers: returning,
    returningPct: orders ? returning / orders : 0,
    revenueDelta: delta(revenue, baseRevenue),
    ordersDelta: delta(orders, baseOrders),
    aovDelta: delta(aov, baseAov),
  };
}

export interface HourPoint {
  hour: number;
  orders: number;
  revenue: number;
  /** average orders in this hour over the previous 7 days */
  typical: number;
}

export function ordersByHour(state: DemoState, now: number): HourPoint[] {
  const today = todaysOrders(state.orders, now);
  const key = cairoDateKey(now);
  const prev = Array.from({ length: 7 }, (_, i) => pastDay(addDaysToKey(key, -(i + 1))));
  const points: HourPoint[] = [];
  // Opening hours, stretched if orders exist outside them (e.g. an early demo).
  const hours = today.map((o) => cairoHour(o.createdAt));
  const first = Math.min(OPEN_MINUTE / 60, ...hours);
  const last = Math.max(CLOSE_MINUTE / 60 - 1, ...hours);
  for (let h = first; h <= last; h++) {
    const inHour = today.filter((o) => cairoHour(o.createdAt) === h);
    points.push({
      hour: h,
      orders: inHour.length,
      revenue: inHour.reduce((s, o) => s + o.total, 0),
      typical: prev.reduce((s, d) => s + d.hourly[h], 0) / prev.length,
    });
  }
  return points;
}

/** Busiest consecutive window (default 3 h) of the typical day. */
export function peakWindow(points: HourPoint[], width = 3, field: "orders" | "typical" = "typical") {
  let best = { start: points[0]?.hour ?? 12, total: -1 };
  for (let i = 0; i + width <= points.length; i++) {
    const total = points.slice(i, i + width).reduce((s, p) => s + p[field], 0);
    if (total > best.total) best = { start: points[i].hour, total };
  }
  const all = points.reduce((s, p) => s + p[field], 0);
  return { start: best.start, end: best.start + width, share: all ? best.total / all : 0 };
}

export interface DayPoint {
  dateKey: string;
  revenue: number;
  orders: number;
  isToday: boolean;
}

export function revenueTrend(state: DemoState, now: number, days = 14): DayPoint[] {
  const key = cairoDateKey(now);
  const out: DayPoint[] = [];
  for (let i = days - 1; i >= 1; i--) {
    const k = addDaysToKey(key, -i);
    const d = pastDay(k);
    out.push({ dateKey: k, revenue: d.revenue, orders: d.orders, isToday: false });
  }
  const today = todaysOrders(state.orders, now);
  out.push({ dateKey: key, revenue: today.reduce((s, o) => s + o.total, 0), orders: today.length, isToday: true });
  return out;
}

export interface ProductStat {
  itemId: string;
  name: string;
  category: CategoryId;
  quantity: number;
  revenue: number;
}

export function productStats(orders: Order[]): ProductStat[] {
  const map = new Map<string, ProductStat>();
  for (const o of orders) {
    for (const l of o.lines) {
      const cur = map.get(l.itemId) ?? { itemId: l.itemId, name: l.name, category: l.category, quantity: 0, revenue: 0 };
      cur.quantity += l.quantity;
      cur.revenue += l.lineTotal;
      map.set(l.itemId, cur);
    }
  }
  return Array.from(map.values()).sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue);
}

export interface ChannelStat {
  channel: OrderChannel;
  label: string;
  orders: number;
  revenue: number;
  share: number;
}

export const CHANNEL_LABEL: Record<OrderChannel, string> = { dine_in: "Dine-in", pickup: "Pickup", delivery: "Delivery" };

export function channelMix(orders: Order[]): ChannelStat[] {
  const total = orders.length || 1;
  return (["dine_in", "pickup", "delivery"] as OrderChannel[]).map((channel) => {
    const list = orders.filter((o) => o.channel === channel);
    return {
      channel,
      label: CHANNEL_LABEL[channel],
      orders: list.length,
      revenue: list.reduce((s, o) => s + o.total, 0),
      share: list.length / total,
    };
  });
}

export interface CategoryStat {
  category: CategoryId;
  title: string;
  revenue: number;
  quantity: number;
  share: number;
}

export function categoryPerformance(orders: Order[]): CategoryStat[] {
  const rev = new Map<CategoryId, { revenue: number; quantity: number }>();
  let total = 0;
  for (const o of orders) {
    for (const l of o.lines) {
      const cur = rev.get(l.category) ?? { revenue: 0, quantity: 0 };
      cur.revenue += l.lineTotal;
      cur.quantity += l.quantity;
      total += l.lineTotal;
      rev.set(l.category, cur);
    }
  }
  return CATEGORIES.map((c) => ({
    category: c.id,
    title: c.label,
    revenue: rev.get(c.id)?.revenue ?? 0,
    quantity: rev.get(c.id)?.quantity ?? 0,
    share: total ? (rev.get(c.id)?.revenue ?? 0) / total : 0,
  })).sort((a, b) => b.revenue - a.revenue);
}

export function avgPrepMinutes(orders: Order[]): number {
  const done = orders.filter((o) => o.readyAt);
  if (!done.length) return 0;
  return done.reduce((s, o) => s + minutesBetween(o.createdAt, o.readyAt!), 0) / done.length;
}

/** Orders that combine a drink with food vs drinks only — the pairing story. */
export function pairingStats(orders: Order[]) {
  const withBoth = orders.filter((o) => {
    const courses = new Set(o.lines.map((l) => courseOf(l.category)));
    return courses.has("food") && courses.has("drink");
  });
  const drinkOnly = orders.filter((o) => o.lines.every((l) => courseOf(l.category) === "drink"));
  const avg = (list: Order[]) => (list.length ? list.reduce((s, o) => s + o.total, 0) / list.length : 0);
  return { pairedCount: withBoth.length, pairedAov: avg(withBoth), drinkOnlyCount: drinkOnly.length, drinkOnlyAov: avg(drinkOnly) };
}

// ── Floor ────────────────────────────────────────────────────────────────────

export type TableState = "available" | "browsing" | "ordered" | "preparing" | "ready" | "dining" | "attention";

export interface TableStatus {
  tableCode: string;
  label: string;
  state: TableState;
  /** Short human status: "Requesting bill", "Preparing · #1052" */
  detail: string;
  since?: string;
  requestKind?: ServiceKind;
  orderNumber?: number;
  spend: number;
}

const REQUEST_PRIORITY: ServiceKind[] = ["bill", "waiter", "water", "cutlery", "napkins", "sauce"];
const DINING_MINUTES = 40;
const BROWSING_MINUTES = 15;

export function tableStatuses(state: DemoState, now: number): TableStatus[] {
  const today = todaysOrders(state.orders, now);
  return TABLE_CODES.map((code) => {
    const orders = today.filter((o) => o.tableCode === code).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const spend = orders.filter((o) => minutesBetween(o.createdAt, now) < 120).reduce((s, o) => s + o.total, 0);
    const base = { tableCode: code, label: tableLabel(code), spend };
    const open = state.requests
      .filter((r) => r.tableCode === code && isOpen(r))
      .sort((a, b) => REQUEST_PRIORITY.indexOf(a.kind) - REQUEST_PRIORITY.indexOf(b.kind));
    if (open.length) {
      const r = open[0];
      const label = r.kind === "bill" ? "Requesting bill" : r.kind === "waiter" ? "Calling waiter" : `Needs ${SERVICE_KIND_META[r.kind].label.toLowerCase()}`;
      return { ...base, state: "attention" as const, detail: label, since: r.createdAt, requestKind: r.kind };
    }
    const active = orders.find((o) => isActive(o));
    if (active) {
      const st: TableState = active.status === "ready" ? "ready" : active.status === "preparing" ? "preparing" : "ordered";
      const detail = st === "ready" ? "Ready to serve" : st === "preparing" ? "Preparing" : active.status === "accepted" ? "Order accepted" : "Order placed";
      return { ...base, state: st, detail: `${detail} · #${active.number}`, since: active.createdAt, orderNumber: active.number };
    }
    const served = orders.find((o) => o.status === "served" && o.servedAt && minutesBetween(o.servedAt, now) < DINING_MINUTES);
    if (served) return { ...base, state: "dining" as const, detail: "Dining", since: served.servedAt, orderNumber: served.number };
    const session = state.sessions.find((s) => s.tableCode === code && minutesBetween(s.openedAt, now) < BROWSING_MINUTES);
    if (session) return { ...base, state: "browsing" as const, detail: "Browsing the menu", since: session.openedAt };
    return { ...base, state: "available" as const, detail: "Available", spend: 0 };
  });
}

export const TABLE_STATE_LABEL: Record<TableState, string> = {
  available: "Available",
  browsing: "Browsing",
  ordered: "Ordered",
  preparing: "Preparing",
  ready: "Ready",
  dining: "Dining",
  attention: "Needs attention",
};

export function categoryTitle(id: CategoryId): string {
  return CATEGORY_BY_ID[id].title;
}
