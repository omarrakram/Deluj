import { describe, expect, it } from "vitest";
import { seedMenu } from "@/domain/menu";
import { recommend } from "@/domain/recommend";
import { cairoWallToUtc } from "@/domain/time";

const menu = seedMenu();
const morning = cairoWallToUtc("2026-10-06", 10 * 60).getTime();
const afternoon = cairoWallToUtc("2026-10-06", 15 * 60).getTime();
const evening = cairoWallToUtc("2026-10-06", 20 * 60).getTime();

describe("Perfect with this", () => {
  it("pairs an Iced Matcha with something sweet to eat", () => {
    const [top] = recommend({ menu, cartItemIds: ["iced-matcha"], anchorItemId: "iced-matcha", now: morning });
    expect(top.item.id).toBe("maple-syrup-pancakes");
    expect(top.headline).toBe("Perfect with this");
  });

  it("suggests a coffee for Truffle Obsession", () => {
    const [top] = recommend({ menu, cartItemIds: ["truffle-obsession"], anchorItemId: "truffle-obsession", now: morning });
    expect(["flat-white", "iced-spanish-latte", "cappuccino"]).toContain(top.item.id);
    expect(top.headline).toBe("Made for each other");
  });

  it("suggests espresso / americano / latte for Belgian Chocolate pancakes", () => {
    const recs = recommend({ menu, cartItemIds: ["belgian-chocolate-pancakes"], anchorItemId: "belgian-chocolate-pancakes", now: afternoon });
    expect(["espresso", "americano", "latte"]).toContain(recs[0].item.id);
  });

  it("suggests food for an iced latte", () => {
    const recs = recommend({ menu, cartItemIds: ["iced-latte"], anchorItemId: "iced-latte", now: afternoon });
    expect(recs.length).toBeGreaterThan(0);
    for (const r of recs) expect(["breakfast", "sandwiches", "focaccia", "salads", "pancakes"]).toContain(r.item.category);
  });

  it("never recommends a second drink for a drink, or anything already in the cart", () => {
    const recs = recommend({ menu, cartItemIds: ["iced-matcha", "maple-syrup-pancakes"], anchorItemId: "iced-matcha", now: morning });
    for (const r of recs) {
      expect(r.item.id).not.toBe("maple-syrup-pancakes");
      expect(r.item.id).not.toBe("iced-matcha");
    }
  });

  it("routes around sold-out items", () => {
    const soldOut = menu.map((m) => (m.id === "maple-syrup-pancakes" ? { ...m, available: false } : m));
    const [top] = recommend({ menu: soldOut, cartItemIds: ["iced-matcha"], anchorItemId: "iced-matcha", now: morning });
    expect(top.item.id).toBe("belgian-chocolate-pancakes");
  });

  it("does not lead with breakfast plates in the evening", () => {
    const [top] = recommend({ menu, cartItemIds: ["americano"], anchorItemId: "americano", now: evening });
    expect(top.item.category).not.toBe("breakfast");
    const [morningTop] = recommend({ menu, cartItemIds: ["americano"], anchorItemId: "americano", now: morning });
    expect(["truffle-obsession", "belgian-chocolate-pancakes"]).toContain(morningTop.item.id);
  });

  it("offers something sweet to finish a savoury meal", () => {
    const recs = recommend({ menu, cartItemIds: ["truffle-obsession", "flat-white"], now: morning });
    expect(recs[0]?.item.category).toBe("pancakes");
  });

  it("is deterministic", () => {
    const a = recommend({ menu, cartItemIds: ["iced-latte"], now: afternoon });
    const b = recommend({ menu, cartItemIds: ["iced-latte"], now: afternoon });
    expect(a.map((r) => r.item.id)).toEqual(b.map((r) => r.item.id));
  });
});
