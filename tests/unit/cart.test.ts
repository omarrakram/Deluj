import { describe, expect, it } from "vitest";
import { defaultSelections, lineKey, priceCart, resolveModifiers } from "@/domain/cart";
import { seedMenu } from "@/domain/menu";

const menu = seedMenu();

describe("cart pricing", () => {
  it("prices lines, modifiers and quantities", () => {
    const r = priceCart(menu, [
      { itemId: "iced-matcha", quantity: 1, selections: { milk: ["oat"], ice: ["less"], "cold-foam": ["cold-foam"] } },
      { itemId: "maple-syrup-pancakes", quantity: 2, selections: {} },
    ]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // 160 + 45 oat + 45 foam = 250; 280 * 2 = 560
    expect(r.lines[0].lineTotal).toBe(250);
    expect(r.lines[1].lineTotal).toBe(560);
    expect(r.subtotal).toBe(810);
    expect(r.total).toBe(810);
    expect(r.itemCount).toBe(3);
    // free preference "Less ice" is on the ticket, the default "Regular" milk would not be
    expect(r.lines[0].modifiers.map((m) => m.label)).toEqual(["Less ice", "Oat milk", "Cold Foam"]);
  });

  it("never trusts the client: unknown groups and options are rejected", () => {
    expect(priceCart(menu, [{ itemId: "mineral-water", quantity: 1, selections: { "cold-foam": ["cold-foam"] } }]).ok).toBe(false);
    expect(priceCart(menu, [{ itemId: "latte", quantity: 1, selections: { milk: ["gold-milk"] } }]).ok).toBe(false);
    expect(priceCart(menu, [{ itemId: "latte", quantity: 1, selections: { milk: ["oat", "almond"] } }]).ok).toBe(false);
  });

  it("rejects empty carts, bad quantities and sold-out items", () => {
    expect(priceCart(menu, [])).toMatchObject({ ok: false, code: "empty_cart" });
    expect(priceCart(menu, [{ itemId: "latte", quantity: 0, selections: {} }])).toMatchObject({ ok: false, code: "invalid_quantity" });
    expect(priceCart(menu, [{ itemId: "latte", quantity: 1.5, selections: {} }])).toMatchObject({ ok: false, code: "invalid_quantity" });
    const soldOut = menu.map((m) => (m.id === "iced-matcha" ? { ...m, available: false } : m));
    expect(priceCart(soldOut, [{ itemId: "iced-matcha", quantity: 1, selections: {} }])).toMatchObject({ ok: false, code: "sold_out" });
    expect(priceCart(menu, [{ itemId: "croissant", quantity: 1, selections: {} }])).toMatchObject({ ok: false, code: "unknown_item" });
  });

  it("defaults single-choice groups", () => {
    const latte = menu.find((m) => m.id === "latte")!;
    expect(defaultSelections(latte)).toEqual({ milk: ["regular"], syrup: ["none"] });
    const r = resolveModifiers(latte, defaultSelections(latte));
    expect(r.ok && r.modifiers).toEqual([]);
  });

  it("merges identical customisations into one line key", () => {
    const a = lineKey({ itemId: "latte", selections: { syrup: ["vanilla"], milk: ["oat"] }, note: " extra hot " });
    const b = lineKey({ itemId: "latte", selections: { milk: ["oat"], syrup: ["vanilla"] }, note: "extra hot" });
    const c = lineKey({ itemId: "latte", selections: { milk: ["almond"], syrup: ["vanilla"] }, note: "extra hot" });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});
