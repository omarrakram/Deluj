// The Deluj menu. Source of truth: the current Deluj menu supplied by the client.
// Names, prices and descriptions are reproduced as printed. Drinks carry no
// description because the menu prints none — we never invent copy for them.
// Add-on prices (Syrup / Alt Milk / Cold Foam — EGP 45) come from the menu's
// COFFEE ADD-ONS section; every other modifier is a free preference.

import type { Category, CategoryId, MenuItem, ModifierGroup } from "./types";

export const CATEGORIES: Category[] = [
  { id: "breakfast", label: "Breakfast", title: "Breakfast Club", course: "food" },
  { id: "sandwiches", label: "Sandwiches", title: "Sandwiches", course: "food" },
  { id: "focaccia", label: "Focaccia", title: "Focaccia Specials", course: "food" },
  { id: "salads", label: "Salads", title: "Salads", course: "food" },
  { id: "pancakes", label: "Pancakes", title: "Pancakes", course: "food" },
  { id: "coffee", label: "Coffee", title: "Hot", course: "drink" },
  { id: "iced", label: "Iced", title: "Iced", course: "drink" },
  { id: "matcha", label: "Matcha", title: "Matcha", course: "drink" },
  { id: "refreshers", label: "Refreshers", title: "Refreshers", course: "drink" },
  { id: "beyond", label: "Beyond Coffee", title: "Beyond Coffee", course: "drink" },
  { id: "essentials", label: "Essentials", title: "Essentials", course: "drink" },
];

export const CATEGORY_BY_ID: Record<CategoryId, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
) as Record<CategoryId, Category>;

export const ADD_ON_PRICE = 45;

export const MODIFIER_GROUPS: Record<string, ModifierGroup> = {
  milk: {
    id: "milk",
    label: "Milk",
    type: "single",
    defaultOptionId: "regular",
    hint: "Alt milk +EGP 45",
    options: [
      { id: "regular", label: "Regular", price: 0 },
      { id: "oat", label: "Oat milk", price: ADD_ON_PRICE },
      { id: "almond", label: "Almond milk", price: ADD_ON_PRICE },
    ],
  },
  syrup: {
    id: "syrup",
    label: "Syrup",
    type: "single",
    defaultOptionId: "none",
    hint: "+EGP 45",
    options: [
      { id: "none", label: "No syrup", price: 0 },
      { id: "vanilla", label: "Vanilla", price: ADD_ON_PRICE },
      { id: "caramel", label: "Caramel", price: ADD_ON_PRICE },
      { id: "hazelnut", label: "Hazelnut", price: ADD_ON_PRICE },
    ],
  },
  "cold-foam": {
    id: "cold-foam",
    label: "Top it",
    type: "multi",
    options: [{ id: "cold-foam", label: "Cold Foam", price: ADD_ON_PRICE }],
  },
  ice: {
    id: "ice",
    label: "Ice",
    type: "single",
    defaultOptionId: "regular",
    options: [
      { id: "regular", label: "Regular ice", price: 0 },
      { id: "less", label: "Less ice", price: 0 },
      { id: "extra", label: "Extra ice", price: 0 },
    ],
  },
  "sugar-turkish": {
    id: "sugar-turkish",
    label: "Sugar",
    type: "single",
    defaultOptionId: "mazboot",
    options: [
      { id: "sada", label: "Sada · no sugar", price: 0 },
      { id: "mazboot", label: "Mazboot · medium", price: 0 },
      { id: "ziyada", label: "Ziyada · sweet", price: 0 },
    ],
  },
  sugar: {
    id: "sugar",
    label: "Sugar",
    type: "single",
    defaultOptionId: "none",
    options: [
      { id: "none", label: "No sugar", price: 0 },
      { id: "one", label: "1 spoon", price: 0 },
      { id: "two", label: "2 spoons", price: 0 },
    ],
  },
};

type Seed = Omit<MenuItem, "available" | "featured" | "sort" | "updatedAt"> & { featured?: boolean };

const ICED = ["ice"];
const SEED: Seed[] = [
  // ── BREAKFAST CLUB ────────────────────────────────────────────────────────
  {
    id: "truffle-obsession",
    name: "Truffle Obsession",
    description:
      "Fluffy scrambled eggs with sautéed mushrooms and truffle paste, served on toasted sourdough.",
    price: 400,
    category: "breakfast",
    tags: ["breakfast", "eggs", "savory", "rich"],
    modifierGroupIds: [],
    art: { kind: "eggs", tone: "orange", accent: "#F6C445" },
    featured: true,
  },
  {
    id: "salmon-benedict",
    name: "Salmon Benedict",
    description:
      "Poached eggs and silky smoked salmon atop toasted english muffins, finished with creamy hollandaise sauce and a sprinkle of fresh herbs.",
    price: 420,
    category: "breakfast",
    tags: ["breakfast", "eggs", "savory", "salmon", "rich"],
    modifierGroupIds: [],
    art: { kind: "benedict", tone: "powder", accent: "#F49A6C" },
    featured: true,
  },
  {
    id: "mediterranean-morning",
    name: "Mediterranean Morning",
    description:
      "Sunny-side-up eggs, sujouk, grilled halloumi, and charred tomatoes on toasted sourdough, topped with za’atar.",
    price: 375,
    category: "breakfast",
    tags: ["breakfast", "eggs", "savory", "hearty"],
    modifierGroupIds: [],
    art: { kind: "eggs", tone: "butter", accent: "#F28C38" },
  },
  {
    id: "og-omelette",
    name: "OG Omelette",
    description: "A delicate, buttery classic omelette served on toasted sourdough.",
    price: 300,
    category: "breakfast",
    tags: ["breakfast", "eggs", "savory", "light"],
    modifierGroupIds: [],
    art: { kind: "eggs", tone: "cream", accent: "#F6C445" },
  },
  // ── SANDWICHES ────────────────────────────────────────────────────────────
  {
    id: "salmon-bagel",
    name: "Salmon Bagel",
    description:
      "A classic new york-style bagel layered with silky cream cheese, smoked salmon, baby rocca, onions, capers, and fresh dill, finished with a bright squeeze of lemon.",
    price: 345,
    category: "sandwiches",
    tags: ["sandwich", "savory", "salmon", "breakfast", "light"],
    modifierGroupIds: [],
    art: { kind: "bagel", tone: "powder", accent: "#F49A6C" },
  },
  {
    id: "turkey-emmental",
    name: "Turkey Emmental",
    description:
      "Smoked turkey with emmental cheese, sun-dried tomatoes, mixed lettuce, and a touch of multigrain mustard on freshly baked sourdough.",
    price: 300,
    category: "sandwiches",
    tags: ["sandwich", "savory", "lunch", "cheese"],
    modifierGroupIds: [],
    art: { kind: "sandwich", tone: "orange", accent: "#F2C14E" },
  },
  {
    id: "brioche-club",
    name: "Brioche Club",
    description:
      "Layers of herb-buttered brioche toast with grilled chicken breast, red cheddar, caramelized onions, fresh lettuce, and a perfectly cooked egg, finished with ripe tomato slices.",
    price: 310,
    category: "sandwiches",
    tags: ["sandwich", "savory", "lunch", "hearty"],
    modifierGroupIds: [],
    art: { kind: "sandwich", tone: "butter", accent: "#E8743B" },
  },
  {
    id: "philly-cheesesteak",
    name: "Philly Cheesesteak",
    description:
      "Juicy steak with sautéed onions and green peppers, topped with thyme and melted emmental cheese, served on a toasted ciabatta roll.",
    price: 345,
    category: "sandwiches",
    tags: ["sandwich", "savory", "lunch", "hearty", "cheese"],
    modifierGroupIds: [],
    art: { kind: "sandwich", tone: "cream", accent: "#B5653A" },
  },
  {
    id: "tuna-melt",
    name: "Tuna Melt",
    description:
      "Flaked tuna with sweet corn, red cheddar, baby rocca, tomatoes, and red onions, finished with a touch of wholegrain mustard on brown sourdough.",
    price: 300,
    category: "sandwiches",
    tags: ["sandwich", "savory", "lunch", "cheese"],
    modifierGroupIds: [],
    art: { kind: "sandwich", tone: "powder", accent: "#F2C14E" },
  },
  {
    id: "the-stacked-bagel",
    name: "The Stacked Bagel",
    description:
      "Fluffy scrambled eggs with white cheddar, bacon, chargrilled tomatoes, and caramelized onions, served on an everything bagel with fresh mix lettuce and a drizzle of ranch sauce.",
    price: 310,
    category: "sandwiches",
    tags: ["sandwich", "savory", "breakfast", "eggs", "hearty"],
    modifierGroupIds: [],
    art: { kind: "bagel", tone: "orange", accent: "#F6C445" },
  },
  // ── FOCACCIA SPECIALS ─────────────────────────────────────────────────────
  {
    id: "hot-honey-pepperoni-pizza",
    name: "Hot Honey Pepperoni Pizza",
    description:
      "Crispy beef pepperoni, melted mozzarella, drizzled with hot honey, and topped with parmesan cheese.",
    price: 375,
    category: "focaccia",
    tags: ["focaccia", "savory", "lunch", "cheese", "spicy"],
    modifierGroupIds: [],
    art: { kind: "focaccia", tone: "orange", accent: "#D9442B" },
    featured: true,
  },
  {
    id: "caprese",
    name: "Caprese",
    description:
      "Charred cherry tomatoes, creamy baby mozzarella and fresh pesto, finished with a drizzle of balsamic reduction.",
    price: 290,
    category: "focaccia",
    tags: ["focaccia", "savory", "lunch", "light", "cheese", "herb"],
    modifierGroupIds: [],
    art: { kind: "focaccia", tone: "powder", accent: "#E8553B" },
  },
  {
    id: "roast-beef-melt",
    name: "Roast Beef Melt",
    description:
      "Tender roast beef with red cheddar, lettuce, and ripe tomatoes, finished with a savory ranch dressing.",
    price: 330,
    category: "focaccia",
    tags: ["focaccia", "savory", "lunch", "hearty", "cheese"],
    modifierGroupIds: [],
    art: { kind: "focaccia", tone: "butter", accent: "#A8553A" },
  },
  // ── SALADS ────────────────────────────────────────────────────────────────
  {
    id: "chicken-caesar",
    name: "Chicken Caesar",
    description:
      "Crisp romaine lettuce topped with grilled chicken breast, shaved Parmesan, garlic sourdough croutons, and our signature Deluj Caesar dressing.",
    price: 300,
    category: "salads",
    tags: ["salad", "savory", "lunch", "light"],
    modifierGroupIds: [],
    art: { kind: "salad", tone: "cream", accent: "#9CC46B" },
  },
  {
    id: "grilled-halloumi",
    name: "Grilled Halloumi",
    description:
      "Grilled halloumi paired with creamy avocado, cherry tomatoes, cucumbers, baby rocca, mix lettuce and Kalamata olives, all tossed in a house-made balsamic vinaigrette.",
    price: 280,
    category: "salads",
    tags: ["salad", "savory", "lunch", "light", "cheese"],
    modifierGroupIds: [],
    art: { kind: "salad", tone: "powder", accent: "#7FB069" },
  },
  // ── PANCAKES ──────────────────────────────────────────────────────────────
  {
    id: "belgian-chocolate-pancakes",
    name: "Belgian Chocolate",
    description: "Fluffy pancakes topped with rich Nutella, Belgian chocolate and hazelnuts.",
    price: 340,
    category: "pancakes",
    tags: ["pancakes", "sweet", "chocolate", "indulgent"],
    modifierGroupIds: [],
    art: { kind: "pancakes", tone: "orange", accent: "#5A3220" },
    featured: true,
  },
  {
    id: "maple-syrup-pancakes",
    name: "Maple Syrup",
    description: "Classic pancakes drizzled with pure maple syrup and butter.",
    price: 280,
    category: "pancakes",
    tags: ["pancakes", "sweet", "light"],
    modifierGroupIds: [],
    art: { kind: "pancakes", tone: "powder", accent: "#D8902F" },
  },
  // ── HOT ───────────────────────────────────────────────────────────────────
  { id: "espresso", name: "Espresso", price: 75, category: "coffee", tags: ["coffee", "hot", "black", "espresso"], modifierGroupIds: [], art: { kind: "espresso", tone: "orange", accent: "#3B2418" } },
  { id: "americano", name: "Americano", price: 90, category: "coffee", tags: ["coffee", "hot", "black"], modifierGroupIds: ["syrup"], art: { kind: "hot-cup", tone: "powder", accent: "#3B2418" } },
  { id: "cortado", name: "Cortado", price: 90, category: "coffee", tags: ["coffee", "hot", "milk", "espresso"], modifierGroupIds: ["milk"], art: { kind: "espresso", tone: "cream", accent: "#A8774F" } },
  { id: "flat-white", name: "Flat White", price: 115, category: "coffee", tags: ["coffee", "hot", "milk"], modifierGroupIds: ["milk", "syrup"], art: { kind: "hot-cup", tone: "orange", accent: "#C99A6E" } },
  { id: "cappuccino", name: "Cappuccino", price: 125, category: "coffee", tags: ["coffee", "hot", "milk"], modifierGroupIds: ["milk", "syrup"], art: { kind: "hot-cup", tone: "butter", accent: "#C99A6E" } },
  { id: "mocha", name: "Mocha", price: 145, category: "coffee", tags: ["coffee", "hot", "milk", "chocolate", "sweet"], modifierGroupIds: ["milk"], art: { kind: "hot-cup", tone: "powder", accent: "#7A4A2E" } },
  { id: "latte", name: "Latte", price: 125, category: "coffee", tags: ["coffee", "hot", "milk"], modifierGroupIds: ["milk", "syrup"], art: { kind: "hot-cup", tone: "cream", accent: "#D8B48A" } },
  { id: "spanish-latte", name: "Spanish Latte", price: 155, category: "coffee", tags: ["coffee", "hot", "milk", "sweet"], modifierGroupIds: ["milk"], art: { kind: "hot-cup", tone: "orange", accent: "#B97E4F" } },
  { id: "macchiato", name: "Macchiato", price: 90, category: "coffee", tags: ["coffee", "hot", "milk", "espresso"], modifierGroupIds: ["milk"], art: { kind: "espresso", tone: "powder", accent: "#8A5A3A" } },
  { id: "v60", name: "V60", price: 140, category: "coffee", tags: ["coffee", "hot", "black", "specialty"], modifierGroupIds: [], art: { kind: "hot-cup", tone: "butter", accent: "#5B3522" } },
  { id: "turkish-coffee", name: "Turkish Coffee", price: 70, category: "coffee", tags: ["coffee", "hot", "black"], modifierGroupIds: ["sugar-turkish"], art: { kind: "espresso", tone: "butter", accent: "#3B2418" } },
  // ── ICED ──────────────────────────────────────────────────────────────────
  { id: "iced-americano", name: "Iced Americano", price: 90, category: "iced", tags: ["coffee", "iced", "black"], modifierGroupIds: [...ICED, "syrup", "cold-foam"], art: { kind: "iced-cup", tone: "powder", accent: "#4A2C1C" } },
  { id: "iced-latte", name: "Iced Latte", price: 125, category: "iced", tags: ["coffee", "iced", "milk"], modifierGroupIds: [...ICED, "milk", "syrup", "cold-foam"], art: { kind: "iced-cup", tone: "orange", accent: "#C99A6E" } },
  { id: "iced-mocha", name: "Iced Mocha", price: 145, category: "iced", tags: ["coffee", "iced", "milk", "chocolate", "sweet"], modifierGroupIds: [...ICED, "milk", "cold-foam"], art: { kind: "iced-cup", tone: "cream", accent: "#7A4A2E" } },
  { id: "iced-spanish-latte", name: "Iced Spanish Latte", price: 155, category: "iced", tags: ["coffee", "iced", "milk", "sweet"], modifierGroupIds: [...ICED, "milk", "cold-foam"], art: { kind: "iced-cup", tone: "powder", accent: "#B97E4F" }, featured: true },
  { id: "pistachio-latte", name: "Pistachio Latte", price: 155, category: "iced", tags: ["coffee", "iced", "milk", "sweet", "nutty"], modifierGroupIds: [...ICED, "milk", "cold-foam"], art: { kind: "iced-cup", tone: "butter", accent: "#A9BC6A" } },
  // ── MATCHA ────────────────────────────────────────────────────────────────
  { id: "iced-matcha", name: "Iced Matcha", price: 160, category: "matcha", tags: ["matcha", "iced", "milk"], modifierGroupIds: [...ICED, "milk", "syrup", "cold-foam"], art: { kind: "iced-cup", tone: "powder", accent: "#8DB255" }, featured: true },
  { id: "strawberry-matcha", name: "Strawberry Matcha", price: 200, category: "matcha", tags: ["matcha", "iced", "milk", "fruit", "sweet"], modifierGroupIds: [...ICED, "milk", "cold-foam"], art: { kind: "iced-cup", tone: "cream", accent: "#E98AA0" } },
  { id: "matcha", name: "Matcha", price: 160, category: "matcha", tags: ["matcha", "hot", "milk"], modifierGroupIds: ["milk", "syrup"], art: { kind: "matcha", tone: "orange", accent: "#8DB255" } },
  // ── REFRESHERS ────────────────────────────────────────────────────────────
  { id: "iced-tea", name: "Iced Tea", price: 125, category: "refreshers", tags: ["refresher", "iced", "tea"], modifierGroupIds: ICED, art: { kind: "mojito", tone: "butter", accent: "#C76A2A" } },
  { id: "passion-fruit-mojito", name: "Passion Fruit Mojito", price: 155, category: "refreshers", tags: ["refresher", "iced", "fruit"], modifierGroupIds: ICED, art: { kind: "mojito", tone: "orange", accent: "#F2B33D" } },
  { id: "classic-mojito", name: "Classic Mojito", price: 130, category: "refreshers", tags: ["refresher", "iced", "fruit"], modifierGroupIds: ICED, art: { kind: "mojito", tone: "powder", accent: "#BFE3A0" } },
  { id: "strawberry-mojito", name: "Strawberry Mojito", price: 160, category: "refreshers", tags: ["refresher", "iced", "fruit", "sweet"], modifierGroupIds: ICED, art: { kind: "mojito", tone: "cream", accent: "#F07A8E" } },
  { id: "lemon-basil-cream", name: "Lemon Basil Cream", price: 150, category: "refreshers", tags: ["refresher", "iced", "fruit", "herb"], modifierGroupIds: ICED, art: { kind: "mojito", tone: "butter", accent: "#F3E08A" } },
  // ── BEYOND COFFEE ─────────────────────────────────────────────────────────
  { id: "tea", name: "Tea", price: 55, category: "beyond", tags: ["tea", "hot"], modifierGroupIds: ["sugar"], art: { kind: "teapot", tone: "powder", accent: "#C76A2A" } },
  { id: "chai-latte", name: "Chai Latte", price: 110, category: "beyond", tags: ["tea", "hot", "milk", "spiced"], modifierGroupIds: ["milk", "syrup"], art: { kind: "hot-cup", tone: "butter", accent: "#C8915E" } },
  { id: "hot-chocolate", name: "Hot Chocolate", price: 135, category: "beyond", tags: ["hot", "milk", "chocolate", "sweet"], modifierGroupIds: ["milk"], art: { kind: "hot-cup", tone: "orange", accent: "#6B3A26" } },
  { id: "apple-cider", name: "Apple Cider", price: 90, category: "beyond", tags: ["hot", "fruit"], modifierGroupIds: [], art: { kind: "hot-cup", tone: "cream", accent: "#D98C3A" } },
  // ── ESSENTIALS ────────────────────────────────────────────────────────────
  { id: "red-bull", name: "Red Bull", price: 85, category: "essentials", tags: ["bottled", "energy"], modifierGroupIds: [], art: { kind: "bottle", tone: "powder", accent: "#9DB7E0" } },
  { id: "mineral-water", name: "Mineral Water", price: 30, category: "essentials", tags: ["bottled", "water"], modifierGroupIds: [], art: { kind: "bottle", tone: "cream", accent: "#CFE6F5" } },
  { id: "sparkling-water", name: "Sparkling Water", price: 70, category: "essentials", tags: ["bottled", "water"], modifierGroupIds: [], art: { kind: "bottle", tone: "orange", accent: "#BFE0F2" } },
  { id: "juice", name: "Juice", price: 120, category: "essentials", tags: ["bottled", "fruit"], modifierGroupIds: [], art: { kind: "bottle", tone: "butter", accent: "#F7A541" } },
];

/**
 * Names that need their section to make sense outside the menu (cart, kitchen,
 * dashboard): "Belgian Chocolate" alone could read as a drink on a ticket.
 */
const CONTEXT_NAMES: Record<string, string> = {
  "belgian-chocolate-pancakes": "Belgian Chocolate Pancakes",
  "maple-syrup-pancakes": "Maple Syrup Pancakes",
  caprese: "Caprese Focaccia",
};

export function contextName(item: { id: string; name: string }): string {
  return CONTEXT_NAMES[item.id] ?? item.name;
}

export const SEED_EPOCH = "2026-01-01T00:00:00.000Z";

/** A fresh copy of the seeded menu (all items available, default featured set). */
export function seedMenu(now: string = SEED_EPOCH): MenuItem[] {
  return SEED.map(({ featured, ...item }, index) => ({
    ...item,
    available: true,
    featured: Boolean(featured),
    sort: index,
    updatedAt: now,
  }));
}

export const MENU_ITEM_IDS = SEED.map((s) => s.id);

export function categoryOrder(id: CategoryId): number {
  return CATEGORIES.findIndex((c) => c.id === id);
}

export function courseOf(category: CategoryId): "food" | "drink" {
  return CATEGORY_BY_ID[category].course;
}

export function sortMenu(items: MenuItem[]): MenuItem[] {
  return [...items].sort(
    (a, b) => categoryOrder(a.category) - categoryOrder(b.category) || a.sort - b.sort,
  );
}
