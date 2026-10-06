// The "Perfect with this" engine. Deterministic and fully offline: it scores the
// live menu against curated pairings, cart composition, time of day and the
// pairing patterns found in today's orders. No external model is involved, so
// it can never fail during service.

import { CATEGORY_BY_ID, contextName, courseOf } from "./menu";
import { affinity } from "./pairings";
import { cairoHour } from "./time";
import type { MenuItem, Order } from "./types";

export type RecommendationHeadline =
  | "Perfect with this"
  | "Made for each other"
  | "Complete your order"
  | "You might also like";

export interface Recommendation {
  item: MenuItem;
  score: number;
  headline: RecommendationHeadline;
  reason: string;
  anchorItemId?: string;
}

export interface RecommendInput {
  menu: MenuItem[];
  /** Item ids currently in the cart, most recently added last. */
  cartItemIds: string[];
  /** The item the guest just added, if any — recommendations orbit it. */
  anchorItemId?: string;
  now: number;
  /** Optional pairing counts learned from orders: itemA -> itemB -> count. */
  cooccurrence?: Map<string, Map<string, number>>;
  limit?: number;
}

const MIN_SCORE = 0.4;
const BREAKFAST = new Set(["breakfast"]);
const LUNCH = new Set(["sandwiches", "focaccia", "salads"]);

function timeBoost(item: MenuItem, hour: number): number {
  if (BREAKFAST.has(item.category) || item.tags.includes("breakfast")) {
    if (hour < 13) return 0.15;
    if (hour >= 17) return -0.5;
    return -0.1;
  }
  if (LUNCH.has(item.category)) return hour >= 12 && hour < 19 ? 0.1 : -0.05;
  if (item.category === "coffee" && hour >= 19) return -0.1;
  return 0;
}

export function buildCooccurrence(orders: Pick<Order, "lines">[]): Map<string, Map<string, number>> {
  const map = new Map<string, Map<string, number>>();
  for (const o of orders) {
    const ids = Array.from(new Set(o.lines.map((l) => l.itemId)));
    for (const a of ids) {
      for (const b of ids) {
        if (a === b) continue;
        const row = map.get(a) ?? new Map<string, number>();
        row.set(b, (row.get(b) ?? 0) + 1);
        map.set(a, row);
      }
    }
  }
  return map;
}

function coLift(co: RecommendInput["cooccurrence"], anchor: string, candidate: string): number {
  const row = co?.get(anchor);
  if (!row || !row.size) return 0;
  const max = Math.max(...row.values());
  return max > 0 ? (row.get(candidate) ?? 0) / max : 0;
}

export function recommend(input: RecommendInput): Recommendation[] {
  const { menu, cartItemIds, anchorItemId, now, cooccurrence, limit = 3 } = input;
  const byId = new Map(menu.map((m) => [m.id, m]));
  const inCart = new Set(cartItemIds);
  const cartItems = cartItemIds.map((id) => byId.get(id)).filter((m): m is MenuItem => Boolean(m));
  if (!cartItems.length && !anchorItemId) return [];

  const hasFood = cartItems.some((m) => courseOf(m.category) === "food");
  const hasDrink = cartItems.some((m) => courseOf(m.category) === "drink" && m.category !== "essentials");
  const hasSweetFood = cartItems.some((m) => courseOf(m.category) === "food" && m.tags.includes("sweet"));
  // Balance the order: suggest a drink only while there are fewer drinks than plates, and vice versa.
  const drinkCount = cartItemIds.filter((id) => {
    const m = byId.get(id);
    return m && courseOf(m.category) === "drink" && m.category !== "essentials";
  }).length;
  const foodCount = cartItemIds.filter((id) => {
    const m = byId.get(id);
    return m && courseOf(m.category) === "food";
  }).length;
  const hour = cairoHour(now);

  // Most recent first; the just-added item leads.
  const anchors: MenuItem[] = [];
  const anchor = anchorItemId ? byId.get(anchorItemId) : undefined;
  if (anchor) anchors.push(anchor);
  for (const m of [...cartItems].reverse()) if (!anchors.includes(m)) anchors.push(m);

  const scored: Recommendation[] = [];
  for (const candidate of menu) {
    if (!candidate.available || inCart.has(candidate.id)) continue;
    if (candidate.category === "essentials" && candidate.id !== "sparkling-water") continue;

    let best = 0;
    let bestAnchor: MenuItem | undefined;
    anchors.forEach((a, i) => {
      const weight = i === 0 ? 1 : 0.7;
      const s =
        weight *
        (affinity(a.id, candidate.id) +
          0.6 * affinity(candidate.id, a.id) +
          0.2 * coLift(cooccurrence, a.id, candidate.id));
      if (s > best) {
        best = s;
        bestAnchor = a;
      }
    });

    const course = courseOf(candidate.category);
    const sweetFinishCandidate = candidate.category === "pancakes" && hasFood && hasDrink && !hasSweetFood;
    if (course === "drink" && drinkCount >= Math.max(1, foodCount)) continue;
    if (course === "food" && foodCount >= Math.max(1, drinkCount) && !sweetFinishCandidate) continue;
    // A savoury meal with a drink can still end on something sweet.
    const sweetFinish = hasFood && hasDrink && !hasSweetFood && candidate.category === "pancakes";
    let score = best;
    // Fill the gap in the order: drinks-only carts want food and vice versa.
    if (course === "food" && hasDrink && !hasFood) score += 0.3;
    if (course === "drink" && hasFood && !hasDrink) score += 0.3;
    // Right after adding something, orbit it: a drink suggests food, food suggests a drink.
    if (!sweetFinish && anchorItemId && anchors[0] && course === courseOf(anchors[0].category)) score -= 0.6;
    if (sweetFinish) score += 0.45;
    score += timeBoost(candidate, hour);
    if (candidate.featured) score += 0.03;

    if (score >= MIN_SCORE) {
      const copy = sweetFinish
        ? { headline: "Complete your order" as const, reason: "Save room for something sweet." }
        : copyFor(candidate, bestAnchor, hasFood, hasDrink);
      scored.push({ item: candidate, score, ...copy, anchorItemId: bestAnchor?.id });
    }
  }

  scored.sort((a, b) => b.score - a.score || a.item.price - b.item.price);

  // Keep the shortlist varied: at most one suggestion per category.
  const picked: Recommendation[] = [];
  const seenCategories = new Set<string>();
  for (const r of scored) {
    if (seenCategories.has(r.item.category)) continue;
    picked.push(r);
    seenCategories.add(r.item.category);
    if (picked.length === limit) break;
  }
  return picked;
}

function copyFor(
  candidate: MenuItem,
  anchor: MenuItem | undefined,
  hasFood: boolean,
  hasDrink: boolean,
): { headline: RecommendationHeadline; reason: string } {
  const candidateCourse = courseOf(candidate.category);
  if (!anchor) {
    return { headline: "You might also like", reason: `A Deluj favourite from ${CATEGORY_BY_ID[candidate.category].title}.` };
  }
  const anchorName = contextName(anchor);
  if (candidateCourse === "food" && !hasFood) {
    if (candidate.tags.includes("sweet")) {
      return { headline: "Perfect with this", reason: `Something sweet to go with your ${anchorName}.` };
    }
    return { headline: "Perfect with this", reason: `A Deluj pairing for your ${anchorName}.` };
  }
  if (candidateCourse === "drink" && !hasDrink) {
    if (candidate.tags.includes("coffee")) {
      return { headline: "Made for each other", reason: `${anchorName} tastes even better with coffee.` };
    }
    return { headline: "Made for each other", reason: `Something fresh to sip with your ${anchorName}.` };
  }
  return { headline: "Complete your order", reason: `Goes beautifully with your ${anchorName}.` };
}
