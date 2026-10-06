// Curated flavour pairings for the Deluj menu. Weights are 0–1 affinities.
// The recommendation engine and the seeded demo history both read this table,
// so what the phone suggests is consistent with what the dashboard reports.

export const PAIRINGS: Record<string, Array<[string, number]>> = {
  // ── drinks → food ──────────────────────────────────────────────────────────
  "iced-matcha": [["maple-syrup-pancakes", 1], ["belgian-chocolate-pancakes", 0.85], ["salmon-bagel", 0.6], ["grilled-halloumi", 0.5], ["og-omelette", 0.45]],
  "strawberry-matcha": [["maple-syrup-pancakes", 1], ["belgian-chocolate-pancakes", 0.8], ["grilled-halloumi", 0.5]],
  matcha: [["maple-syrup-pancakes", 1], ["og-omelette", 0.6], ["salmon-bagel", 0.5]],
  "iced-latte": [["belgian-chocolate-pancakes", 1], ["the-stacked-bagel", 0.8], ["truffle-obsession", 0.75], ["brioche-club", 0.6]],
  "iced-spanish-latte": [["belgian-chocolate-pancakes", 1], ["truffle-obsession", 0.85], ["the-stacked-bagel", 0.7]],
  "iced-mocha": [["maple-syrup-pancakes", 0.9], ["the-stacked-bagel", 0.8], ["brioche-club", 0.6]],
  "pistachio-latte": [["maple-syrup-pancakes", 1], ["belgian-chocolate-pancakes", 0.8], ["truffle-obsession", 0.6]],
  "iced-americano": [["salmon-bagel", 1], ["truffle-obsession", 0.85], ["turkey-emmental", 0.7], ["the-stacked-bagel", 0.7]],
  espresso: [["belgian-chocolate-pancakes", 1], ["maple-syrup-pancakes", 0.7]],
  americano: [["truffle-obsession", 1], ["og-omelette", 0.8], ["salmon-bagel", 0.8], ["belgian-chocolate-pancakes", 0.7]],
  cortado: [["og-omelette", 1], ["belgian-chocolate-pancakes", 0.8]],
  "flat-white": [["truffle-obsession", 1], ["salmon-benedict", 0.85], ["maple-syrup-pancakes", 0.7]],
  cappuccino: [["truffle-obsession", 1], ["salmon-benedict", 0.9], ["maple-syrup-pancakes", 0.7]],
  latte: [["maple-syrup-pancakes", 1], ["og-omelette", 0.85], ["belgian-chocolate-pancakes", 0.8], ["truffle-obsession", 0.7]],
  "spanish-latte": [["belgian-chocolate-pancakes", 1], ["truffle-obsession", 0.8]],
  mocha: [["maple-syrup-pancakes", 1], ["og-omelette", 0.6]],
  macchiato: [["belgian-chocolate-pancakes", 1], ["og-omelette", 0.7]],
  v60: [["salmon-bagel", 1], ["og-omelette", 0.8]],
  "turkish-coffee": [["mediterranean-morning", 1], ["og-omelette", 0.6]],
  tea: [["mediterranean-morning", 1], ["og-omelette", 0.7]],
  "chai-latte": [["maple-syrup-pancakes", 1], ["belgian-chocolate-pancakes", 0.7]],
  "hot-chocolate": [["maple-syrup-pancakes", 1]],
  "apple-cider": [["maple-syrup-pancakes", 1], ["grilled-halloumi", 0.5]],
  "iced-tea": [["turkey-emmental", 1], ["roast-beef-melt", 0.9], ["tuna-melt", 0.8], ["chicken-caesar", 0.7]],
  "passion-fruit-mojito": [["grilled-halloumi", 1], ["tuna-melt", 0.8], ["hot-honey-pepperoni-pizza", 0.8]],
  "classic-mojito": [["hot-honey-pepperoni-pizza", 1], ["philly-cheesesteak", 0.9], ["brioche-club", 0.7]],
  "strawberry-mojito": [["grilled-halloumi", 1], ["caprese", 0.8], ["maple-syrup-pancakes", 0.6]],
  "lemon-basil-cream": [["caprese", 1], ["grilled-halloumi", 0.9], ["chicken-caesar", 0.8]],
  // ── food → drinks ──────────────────────────────────────────────────────────
  "truffle-obsession": [["flat-white", 1], ["iced-spanish-latte", 0.95], ["cappuccino", 0.9], ["passion-fruit-mojito", 0.5]],
  "salmon-benedict": [["cappuccino", 1], ["flat-white", 0.9], ["lemon-basil-cream", 0.7], ["iced-americano", 0.6]],
  "mediterranean-morning": [["turkish-coffee", 1], ["tea", 0.9], ["iced-americano", 0.7], ["cappuccino", 0.6]],
  "og-omelette": [["latte", 1], ["cappuccino", 0.85], ["iced-latte", 0.8]],
  "salmon-bagel": [["iced-americano", 1], ["cappuccino", 0.85], ["lemon-basil-cream", 0.7]],
  "turkey-emmental": [["iced-tea", 1], ["iced-americano", 0.85], ["classic-mojito", 0.7]],
  "brioche-club": [["iced-latte", 1], ["classic-mojito", 0.85], ["iced-tea", 0.7]],
  "philly-cheesesteak": [["classic-mojito", 1], ["iced-tea", 0.9], ["iced-americano", 0.7]],
  "tuna-melt": [["iced-tea", 1], ["passion-fruit-mojito", 0.85], ["iced-americano", 0.7]],
  "the-stacked-bagel": [["iced-spanish-latte", 1], ["cappuccino", 0.85], ["iced-latte", 0.8]],
  "hot-honey-pepperoni-pizza": [["classic-mojito", 1], ["iced-tea", 0.9], ["sparkling-water", 0.6]],
  caprese: [["lemon-basil-cream", 1], ["sparkling-water", 0.8], ["iced-tea", 0.7]],
  "roast-beef-melt": [["iced-tea", 1], ["passion-fruit-mojito", 0.85], ["classic-mojito", 0.8]],
  "chicken-caesar": [["lemon-basil-cream", 1], ["iced-tea", 0.85], ["sparkling-water", 0.7]],
  "grilled-halloumi": [["passion-fruit-mojito", 1], ["lemon-basil-cream", 0.9], ["iced-matcha", 0.7]],
  "belgian-chocolate-pancakes": [["espresso", 1], ["americano", 0.95], ["latte", 0.9], ["iced-americano", 0.7]],
  "maple-syrup-pancakes": [["latte", 1], ["flat-white", 0.9], ["iced-matcha", 0.85], ["cappuccino", 0.8]],
};

export function affinity(from: string, to: string): number {
  const list = PAIRINGS[from];
  if (!list) return 0;
  const hit = list.find(([id]) => id === to);
  return hit ? hit[1] : 0;
}
