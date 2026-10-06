// Deterministic demo data. Every device generates exactly the same history for a
// given Cairo date, so charts agree across the phone, tablet and laptop.
// These numbers are illustrative demo data — never Deluj's real performance.

import { MODIFIER_GROUPS, contextName, courseOf, seedMenu } from "./menu";
import { PAIRINGS } from "./pairings";
import { hashString, mulberry32, pick, pickWeighted } from "./random";
import { seededId } from "./ids";
import { estimatePrepMinutes, summarizeLines } from "./orders";
import { SERVICE_KIND_META } from "./requests";
import { TABLE_CODES, tableLabel } from "./tables";
import { cairoDateKey, cairoMinuteOfDay, cairoWallToUtc, weekdayOfKey } from "./time";
import type {
  ActivityEvent,
  DemoMeta,
  DemoState,
  MenuItem,
  Order,
  OrderChannel,
  OrderLine,
  OrderLineModifier,
  OrderVia,
  PaymentMethod,
  ServiceKind,
  ServiceRequest,
} from "./types";

export const OPEN_MINUTE = 8 * 60;
export const CLOSE_MINUTE = 23 * 60;
export const FIRST_ORDER_NUMBER = 1001;

/** Relative order volume per opening hour (Cairo). Peaks at lunch and early evening. */
export const HOUR_WEIGHTS: Record<number, number> = {
  8: 0.55, 9: 0.9, 10: 1.05, 11: 0.95, 12: 1.15, 13: 1.4, 14: 1.35, 15: 1.05,
  16: 0.8, 17: 0.72, 18: 0.82, 19: 0.95, 20: 0.88, 21: 0.68, 22: 0.42,
};
const BASE_ORDERS_PER_HOUR = 6.2;

/** Demo popularity. Shapes the seeded best-sellers; it is not Deluj sales data. */
const POPULARITY: Record<string, number> = {
  "iced-spanish-latte": 10, "iced-latte": 8.5, "spanish-latte": 7, cappuccino: 7, latte: 6.5,
  "flat-white": 5, americano: 4, "iced-americano": 5, espresso: 3, "iced-matcha": 7.5,
  "strawberry-matcha": 5, matcha: 2.5, "pistachio-latte": 5, "iced-mocha": 4, mocha: 3,
  cortado: 2.5, macchiato: 2, v60: 2, "turkish-coffee": 3, "passion-fruit-mojito": 4,
  "classic-mojito": 3, "strawberry-mojito": 3, "lemon-basil-cream": 3, "iced-tea": 3,
  tea: 2, "chai-latte": 2, "hot-chocolate": 2, "apple-cider": 1, "mineral-water": 4,
  "sparkling-water": 1.5, "red-bull": 1.5, juice: 2,
  "truffle-obsession": 9, "salmon-benedict": 5, "mediterranean-morning": 6, "og-omelette": 4,
  "salmon-bagel": 4, "turkey-emmental": 4, "brioche-club": 5, "philly-cheesesteak": 4,
  "tuna-melt": 3, "the-stacked-bagel": 5, "hot-honey-pepperoni-pizza": 6, caprese: 3,
  "roast-beef-melt": 3, "chicken-caesar": 4, "grilled-halloumi": 3,
  "belgian-chocolate-pancakes": 6, "maple-syrup-pancakes": 4,
};

const NAMES = ["Nour", "Omar", "Salma", "Youssef", "Malak", "Karim", "Farida", "Ali", "Hana", "Ziad", "Laila", "Seif", "Mariam", "Adam", "Jana", "Tarek", "Dina", "Hassan"];

function timeMultiplier(item: MenuItem, minute: number): number {
  const h = minute / 60;
  if (item.category === "breakfast" || (item.tags.includes("breakfast") && item.category !== "sandwiches")) {
    return h < 12 ? 2.2 : h < 15 ? 0.8 : 0.25;
  }
  if (item.category === "sandwiches" || item.category === "focaccia" || item.category === "salads") {
    return h < 11 ? 0.35 : h < 18 ? 1.5 : 1.0;
  }
  if (item.category === "coffee") return h < 12 ? 1.35 : h > 19 ? 0.7 : 1;
  if (item.category === "iced" || item.category === "matcha" || item.category === "refreshers") {
    return h >= 12 && h < 19 ? 1.35 : 0.9;
  }
  return 1;
}

function modifiersFor(item: MenuItem, rand: () => number): OrderLineModifier[] {
  const out: OrderLineModifier[] = [];
  const add = (groupId: string, optionId: string) => {
    const g = MODIFIER_GROUPS[groupId];
    const o = g.options.find((x) => x.id === optionId)!;
    out.push({ groupId, groupLabel: g.label, optionId, label: o.label, price: o.price });
  };
  for (const gid of item.modifierGroupIds) {
    const r = rand();
    if (gid === "milk") { if (r < 0.14) add("milk", "oat"); else if (r < 0.19) add("milk", "almond"); }
    if (gid === "cold-foam" && r < 0.24) add("cold-foam", "cold-foam");
    if (gid === "syrup" && r < 0.1) add("syrup", pick(rand, ["vanilla", "caramel", "hazelnut"]));
    if (gid === "ice" && r < 0.16) add("ice", "less");
  }
  return out;
}

function makeLine(id: string, item: MenuItem, quantity: number, modifiers: OrderLineModifier[], note?: string): OrderLine {
  const unit = item.price + modifiers.reduce((s, m) => s + m.price, 0);
  return { lineId: id, itemId: item.id, name: contextName(item), category: item.category, quantity, unitPrice: item.price, modifiers, note, lineTotal: unit * quantity };
}

interface DraftOrder {
  minute: number;
  second: number;
  channel: OrderChannel;
  via: OrderVia;
  tableCode: string | null;
  lines: OrderLine[];
  paymentMethod: PaymentMethod;
  returning: boolean;
  customerName?: string;
}

/** Days relative to 1 Oct 2026 — drives a gentle demo growth trend. */
function trendDays(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(2026, 9, 1)) / 86_400_000);
}

function dayFactor(dateKey: string, rand: () => number): number {
  const wd = weekdayOfKey(dateKey);
  const weekend = wd === 5 ? 1.3 : wd === 6 ? 1.22 : wd === 4 ? 1.1 : 1;
  const growth = Math.min(1.25, Math.max(0.8, 1 + 0.0018 * trendDays(dateKey)));
  return weekend * growth * (0.93 + rand() * 0.14);
}

/** All orders Deluj would have taken on `dateKey`, optionally only up to a Cairo minute. */
export function generateDayDrafts(menu: MenuItem[], dateKey: string, untilMinute = CLOSE_MINUTE): DraftOrder[] {
  const rand = mulberry32(hashString(`deluj:${dateKey}`));
  const byId = new Map(menu.map((m) => [m.id, m]));
  const drinks = menu.filter((m) => courseOf(m.category) === "drink");
  const foods = menu.filter((m) => courseOf(m.category) === "food");
  const factor = dayFactor(dateKey, rand);
  const t = trendDays(dateKey);
  // Demo trend: QR ordering grows, marketplace share slowly shrinks.
  const qrShare = Math.min(0.85, Math.max(0.45, 0.62 + 0.004 * t));
  const marketplaceShare = Math.min(0.75, Math.max(0.35, 0.6 - 0.004 * t));
  const drafts: DraftOrder[] = [];

  for (let hour = 8; hour <= 22; hour++) {
    const expected = BASE_ORDERS_PER_HOUR * HOUR_WEIGHTS[hour] * factor;
    const count = Math.max(0, Math.round(expected + (rand() - 0.5) * 2.2));
    for (let i = 0; i < count; i++) {
      const minute = hour * 60 + Math.floor(rand() * 60);
      const second = Math.floor(rand() * 60);
      const channel = pickWeighted<OrderChannel>(rand, [["dine_in", 0.58], ["pickup", 0.17], ["delivery", 0.25]]);
      const via: OrderVia =
        channel === "dine_in"
          ? rand() < qrShare ? "qr" : "counter"
          : channel === "pickup"
            ? rand() < 0.55 ? "app" : "counter"
            : rand() < marketplaceShare ? "marketplace" : "app";
      const party = channel === "dine_in"
        ? pickWeighted(rand, [[1, 0.4], [2, 0.38], [3, 0.14], [4, 0.08]])
        : pickWeighted(rand, [[1, 0.6], [2, 0.3], [3, 0.1]]);

      const counts = new Map<string, { item: MenuItem; qty: number; mods: OrderLineModifier[] }>();
      const addItem = (item: MenuItem) => {
        const mods = modifiersFor(item, rand);
        const key = `${item.id}|${mods.map((m) => m.optionId).join(",")}`;
        const cur = counts.get(key);
        if (cur) cur.qty += 1;
        else counts.set(key, { item, qty: 1, mods });
      };
      for (let p = 0; p < party; p++) {
        let drink: MenuItem | undefined;
        if (rand() < 0.88) {
          drink = pickWeighted(rand, drinks.map((d) => [d, (POPULARITY[d.id] ?? 1) * timeMultiplier(d, minute)] as [MenuItem, number]));
          addItem(drink);
        }
        if (rand() < (channel === "dine_in" ? 0.56 : 0.62)) {
          const pairs = drink ? PAIRINGS[drink.id] : undefined;
          let food: MenuItem | undefined;
          if (pairs && rand() < 0.38) {
            food = byId.get(pickWeighted(rand, pairs.map(([id, w]) => [id, w * timeMultiplier(byId.get(id)!, minute)] as [string, number])));
          }
          if (!food || courseOf(food.category) !== "food") {
            food = pickWeighted(rand, foods.map((f) => [f, (POPULARITY[f.id] ?? 1) * timeMultiplier(f, minute)] as [MenuItem, number]));
          }
          addItem(food);
        }
      }
      if (counts.size === 0) addItem(byId.get("iced-spanish-latte")!);
      if (channel === "dine_in" && rand() < 0.12) addItem(byId.get("mineral-water")!);

      const lines = Array.from(counts.values()).map((c, idx) => makeLine(`s${idx + 1}`, c.item, c.qty, c.mods));
      drafts.push({
        minute,
        second,
        channel,
        via,
        tableCode: channel === "dine_in" ? pick(rand, TABLE_CODES) : null,
        lines,
        paymentMethod: pickWeighted<PaymentMethod>(rand, [["card", 0.5], ["apple_pay", 0.18], ["cash", 0.32]]),
        returning: rand() < 0.56,
        customerName: channel === "dine_in" ? undefined : pick(rand, NAMES),
      });
    }
  }
  return drafts
    .filter((d) => d.minute < untilMinute)
    .sort((a, b) => a.minute - b.minute || a.second - b.second);
}

function draftToOrder(d: DraftOrder, dateKey: string, index: number, number: number): Order {
  const created = cairoWallToUtc(dateKey, d.minute, d.second);
  const prep = Math.round(estimatePrepMinutes(d.lines) * 0.7) + 1;
  const at = (mins: number) => new Date(created.getTime() + mins * 60_000).toISOString();
  const id = seededId(`${dateKey}:order:${index}`);
  return {
    id,
    number,
    tableCode: d.tableCode,
    channel: d.channel,
    via: d.via,
    status: "served",
    lines: d.lines.map((l, i) => ({ ...l, lineId: `${id}-l${i + 1}` })),
    subtotal: d.lines.reduce((s, l) => s + l.lineTotal, 0),
    total: d.lines.reduce((s, l) => s + l.lineTotal, 0),
    paymentMethod: d.via === "marketplace" ? "card" : d.paymentMethod,
    paymentStatus: d.via === "marketplace" ? "paid_marketplace" : "paid",
    customerName: d.customerName,
    returning: d.returning,
    source: "seed",
    createdAt: created.toISOString(),
    acceptedAt: at(0.8),
    preparingAt: at(1.5),
    readyAt: at(prep),
    servedAt: at(prep + 2),
    updatedAt: at(prep + 2),
  };
}

export interface DaySummary {
  dateKey: string;
  revenue: number;
  orders: number;
  /** orders per opening hour */
  hourly: number[];
}

/** Aggregates for a past day, computed on the fly (history is never stored). */
export function summarizeDay(menu: MenuItem[], dateKey: string, untilMinute = CLOSE_MINUTE): DaySummary {
  const drafts = generateDayDrafts(menu, dateKey, untilMinute);
  const hourly = Array.from({ length: 24 }, () => 0);
  let revenue = 0;
  for (const d of drafts) {
    hourly[Math.floor(d.minute / 60)] += 1;
    revenue += d.lines.reduce((s, l) => s + l.lineTotal, 0);
  }
  return { dateKey, revenue, orders: drafts.length, hourly };
}

// ── Seeding "today" ────────────────────────────────────────────────────────────

interface ActiveSpec {
  key: string;
  tableCode: string | null;
  channel: OrderChannel;
  via: OrderVia;
  customerName?: string;
  createdAgo: number;
  status: Order["status"];
  stepsAgo: Partial<Record<"accepted" | "preparing" | "ready" | "served", number>>;
  lines: Array<[string, number, Array<[string, string]>?, string?]>;
  paymentMethod: PaymentMethod;
  returning: boolean;
}

/** A believable service already in progress when the demo starts. NEW is left empty for the guest's order. */
const ACTIVE_SPECS: ActiveSpec[] = [
  { key: "t04", tableCode: "table-04", channel: "dine_in", via: "qr", createdAgo: 26, status: "served", stepsAgo: { accepted: 25, preparing: 24, ready: 14, served: 12 }, lines: [["cappuccino", 1], ["mediterranean-morning", 1], ["mineral-water", 1]], paymentMethod: "card", returning: true },
  { key: "t11", tableCode: "table-11", channel: "dine_in", via: "qr", createdAgo: 19, status: "served", stepsAgo: { accepted: 18, preparing: 17, ready: 6, served: 4 }, lines: [["iced-latte", 2, [["milk", "oat"]]], ["belgian-chocolate-pancakes", 1], ["salmon-benedict", 1]], paymentMethod: "apple_pay", returning: true },
  { key: "t05", tableCode: "table-05", channel: "dine_in", via: "qr", createdAgo: 11, status: "ready", stepsAgo: { accepted: 10, preparing: 9, ready: 1 }, lines: [["classic-mojito", 1, [["ice", "less"]]], ["hot-honey-pepperoni-pizza", 1]], paymentMethod: "card", returning: false },
  { key: "t03", tableCode: "table-03", channel: "dine_in", via: "qr", createdAgo: 7, status: "preparing", stepsAgo: { accepted: 6, preparing: 5 }, lines: [["flat-white", 1], ["truffle-obsession", 1, [], "Extra crispy sourdough"]], paymentMethod: "cash", returning: true },
  { key: "pickup", tableCode: null, channel: "pickup", via: "app", customerName: "Nour", createdAgo: 3, status: "accepted", stepsAgo: { accepted: 2 }, lines: [["iced-spanish-latte", 2, [["cold-foam", "cold-foam"]]], ["salmon-bagel", 1]], paymentMethod: "apple_pay", returning: true },
];

/** The table on the printed QR card the guest scans in the demo. */
const DEMO_TABLE = "table-07";

const SEED_REQUESTS: Array<{ tableCode: string; kind: ServiceKind; ago: number }> = [
  { tableCode: "table-11", kind: "water", ago: 3 },
  { tableCode: "table-04", kind: "napkins", ago: 1 },
];

export function buildSeedState(nowMs: number, resetVersion = 1): DemoState {
  const nowIso = new Date(nowMs).toISOString();
  const menu = seedMenu(nowIso);
  const byId = new Map(menu.map((m) => [m.id, m]));
  const dateKey = cairoDateKey(nowMs);
  const nowMinute = cairoMinuteOfDay(nowMs);

  // History: everything up to 30 minutes ago is already served.
  const drafts = generateDayDrafts(menu, dateKey, Math.max(OPEN_MINUTE, nowMinute - 30));
  // The demo table (the printed card) always starts free: recent history there moves next door.
  for (const d of drafts) if (d.tableCode === DEMO_TABLE && nowMinute - d.minute < 120) d.tableCode = "table-08";
  const orders: Order[] = drafts.map((d, i) => draftToOrder(d, dateKey, i, FIRST_ORDER_NUMBER + i));
  let number = FIRST_ORDER_NUMBER + orders.length;

  const ago = (mins: number) => new Date(nowMs - mins * 60_000).toISOString();
  const activity: ActivityEvent[] = [];

  for (const spec of [...ACTIVE_SPECS].sort((a, b) => b.createdAgo - a.createdAgo)) {
    const id = seededId(`${dateKey}:active:${spec.key}:${resetVersion}`);
    const lines = spec.lines.map(([itemId, qty, sel = [], note], i) => {
      const item = byId.get(itemId)!;
      const mods: OrderLineModifier[] = sel.map(([gid, oid]) => {
        const g = MODIFIER_GROUPS[gid];
        const o = g.options.find((x) => x.id === oid)!;
        return { groupId: gid, groupLabel: g.label, optionId: oid, label: o.label, price: o.price };
      });
      return makeLine(`${id}-l${i + 1}`, item, qty, mods, note);
    });
    const total = lines.reduce((s, l) => s + l.lineTotal, 0);
    const order: Order = {
      id,
      number: number++,
      tableCode: spec.tableCode,
      channel: spec.channel,
      via: spec.via,
      status: spec.status,
      lines,
      subtotal: total,
      total,
      paymentMethod: spec.paymentMethod,
      paymentStatus: spec.paymentMethod === "cash" ? "pay_at_table" : "paid",
      customerName: spec.customerName,
      returning: spec.returning,
      source: "seed",
      createdAt: ago(spec.createdAgo),
      acceptedAt: spec.stepsAgo.accepted !== undefined ? ago(spec.stepsAgo.accepted) : undefined,
      preparingAt: spec.stepsAgo.preparing !== undefined ? ago(spec.stepsAgo.preparing) : undefined,
      readyAt: spec.stepsAgo.ready !== undefined ? ago(spec.stepsAgo.ready) : undefined,
      servedAt: spec.stepsAgo.served !== undefined ? ago(spec.stepsAgo.served) : undefined,
      updatedAt: ago(Math.min(spec.createdAgo, ...Object.values(spec.stepsAgo))),
    };
    orders.push(order);
    activity.push({
      id: seededId(`${id}:placed`),
      kind: "order_placed",
      title: spec.tableCode ? `${tableLabel(spec.tableCode)} placed an order` : `New ${spec.channel} order · ${spec.customerName}`,
      detail: summarizeLines(lines),
      amount: total,
      tableCode: spec.tableCode ?? undefined,
      refId: id,
      createdAt: order.createdAt,
    });
    if (spec.status === "ready") {
      activity.push({ id: seededId(`${id}:ready`), kind: "order_status", title: `Order #${order.number} moved to Ready`, detail: tableLabel(spec.tableCode), refId: id, createdAt: order.readyAt! });
    }
  }

  const requests: ServiceRequest[] = SEED_REQUESTS.map((r, i) => {
    const id = seededId(`${dateKey}:request:${i}:${resetVersion}`);
    const createdAt = ago(r.ago);
    activity.push({ id: seededId(`${id}:created`), kind: "request_created", title: `${tableLabel(r.tableCode)} ${SERVICE_KIND_META[r.kind].activity}`, tableCode: r.tableCode, refId: id, createdAt });
    return { id, tableCode: r.tableCode, kind: r.kind, status: "open", source: "seed", createdAt, updatedAt: createdAt };
  });

  const sessions = [{ tableCode: "table-02", openedAt: ago(2) }];
  activity.push({ id: seededId(`${dateKey}:session:table-02:${resetVersion}`), kind: "table_opened", title: "Table 02 opened the menu", tableCode: "table-02", createdAt: ago(2) });

  activity.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const meta: DemoMeta = { resetVersion, businessDate: dateKey, seededAt: nowIso, lastOrderNumber: number - 1 };
  return { menu, orders, requests, activity, sessions, meta };
}
