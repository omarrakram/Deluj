import { describe, expect, it } from "vitest";
import { CATEGORIES, MODIFIER_GROUPS, contextName, seedMenu } from "@/domain/menu";

const menu = seedMenu();
const byId = new Map(menu.map((m) => [m.id, m]));

describe("the real Deluj menu", () => {
  it("contains every item from the supplied menu at the printed price", () => {
    const expected: Record<string, number> = {
      espresso: 75, americano: 90, cortado: 90, "flat-white": 115, cappuccino: 125, mocha: 145, latte: 125,
      "spanish-latte": 155, macchiato: 90, v60: 140, "turkish-coffee": 70,
      "iced-americano": 90, "iced-latte": 125, "iced-mocha": 145, "iced-spanish-latte": 155, "iced-matcha": 160,
      "strawberry-matcha": 200, "pistachio-latte": 155,
      "iced-tea": 125, "passion-fruit-mojito": 155, "classic-mojito": 130, "strawberry-mojito": 160, "lemon-basil-cream": 150,
      tea: 55, "chai-latte": 110, "hot-chocolate": 135, matcha: 160, "apple-cider": 90,
      "red-bull": 85, "mineral-water": 30, "sparkling-water": 70, juice: 120,
      "truffle-obsession": 400, "salmon-benedict": 420, "mediterranean-morning": 375, "og-omelette": 300,
      "salmon-bagel": 345, "turkey-emmental": 300, "brioche-club": 310, "philly-cheesesteak": 345, "tuna-melt": 300, "the-stacked-bagel": 310,
      "chicken-caesar": 300, "grilled-halloumi": 280,
      "hot-honey-pepperoni-pizza": 375, caprese: 290, "roast-beef-melt": 330,
      "belgian-chocolate-pancakes": 340, "maple-syrup-pancakes": 280,
    };
    expect(menu).toHaveLength(Object.keys(expected).length);
    for (const [id, price] of Object.entries(expected)) {
      expect(byId.get(id)?.price, id).toBe(price);
    }
  });

  it("keeps descriptions verbatim and never invents copy for drinks", () => {
    expect(byId.get("truffle-obsession")?.description).toBe(
      "Fluffy scrambled eggs with sautéed mushrooms and truffle paste, served on toasted sourdough.",
    );
    for (const item of menu) {
      const course = CATEGORIES.find((c) => c.id === item.category)!.course;
      if (course === "drink") expect(item.description, item.id).toBeUndefined();
      else expect(item.description, item.id).toBeTruthy();
    }
  });

  it("prices every paid add-on at the menu's EGP 45", () => {
    for (const id of ["milk", "syrup", "cold-foam"]) {
      for (const o of MODIFIER_GROUPS[id].options) expect([0, 45]).toContain(o.price);
    }
  });

  it("only offers cold foam where it makes sense", () => {
    const withFoam = menu.filter((m) => m.modifierGroupIds.includes("cold-foam")).map((m) => m.id);
    expect(withFoam).toContain("iced-latte");
    expect(withFoam).toContain("iced-matcha");
    for (const id of ["mineral-water", "espresso", "truffle-obsession", "classic-mojito", "tea"]) {
      expect(withFoam).not.toContain(id);
    }
  });

  it("gives pancakes a context name for tickets", () => {
    expect(contextName(byId.get("belgian-chocolate-pancakes")!)).toBe("Belgian Chocolate Pancakes");
    expect(contextName(byId.get("iced-matcha")!)).toBe("Iced Matcha");
  });
});
