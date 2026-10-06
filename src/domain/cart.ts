// Cart pricing and validation. The same functions price the cart on the phone
// and re-price the order on the server, where client prices are never trusted.

import { MODIFIER_GROUPS, contextName } from "./menu";
import type {
  CartLineInput,
  DomainErrorCode,
  MenuItem,
  ModifierGroup,
  OrderLine,
  OrderLineModifier,
} from "./types";

export const MAX_LINE_QUANTITY = 20;
export const MAX_CART_LINES = 30;
export const MAX_NOTE_LENGTH = 140;

export type LineResult =
  | { ok: true; line: OrderLine }
  | { ok: false; code: DomainErrorCode; message: string };

export function groupsFor(item: Pick<MenuItem, "modifierGroupIds">): ModifierGroup[] {
  return item.modifierGroupIds.map((id) => MODIFIER_GROUPS[id]).filter(Boolean);
}

/** Default selections for an item (single groups preselect their default option). */
export function defaultSelections(item: Pick<MenuItem, "modifierGroupIds">): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const g of groupsFor(item)) {
    out[g.id] = g.type === "single" && g.defaultOptionId ? [g.defaultOptionId] : [];
  }
  return out;
}

export function sanitizeNote(note: string | undefined | null): string | undefined {
  if (!note) return undefined;
  const clean = note.replace(/\s+/g, " ").trim().slice(0, MAX_NOTE_LENGTH);
  return clean.length ? clean : undefined;
}

/** Resolve selections into priced modifiers. Free defaults ("Regular") are omitted from the ticket. */
export function resolveModifiers(
  item: Pick<MenuItem, "modifierGroupIds">,
  selections: Record<string, string[]> | undefined,
): { ok: true; modifiers: OrderLineModifier[] } | { ok: false; message: string } {
  const sel = selections ?? {};
  for (const groupId of Object.keys(sel)) {
    if (!item.modifierGroupIds.includes(groupId)) {
      return { ok: false, message: `Option group ${groupId} is not available for this item.` };
    }
  }
  const modifiers: OrderLineModifier[] = [];
  for (const group of groupsFor(item)) {
    const chosen = Array.from(new Set(sel[group.id] ?? []));
    if (group.type === "single") {
      const optionId = chosen[0] ?? group.defaultOptionId;
      if (chosen.length > 1) return { ok: false, message: `Choose one ${group.label.toLowerCase()}.` };
      const option = group.options.find((o) => o.id === optionId);
      if (!option) return { ok: false, message: `Unknown ${group.label.toLowerCase()} option.` };
      if (option.id !== group.defaultOptionId) {
        modifiers.push({ groupId: group.id, groupLabel: group.label, optionId: option.id, label: option.label, price: option.price });
      }
    } else {
      for (const optionId of chosen) {
        const option = group.options.find((o) => o.id === optionId);
        if (!option) return { ok: false, message: `Unknown ${group.label.toLowerCase()} option.` };
        modifiers.push({ groupId: group.id, groupLabel: group.label, optionId: option.id, label: option.label, price: option.price });
      }
    }
  }
  return { ok: true, modifiers };
}

export function unitPriceWithModifiers(item: Pick<MenuItem, "price">, modifiers: OrderLineModifier[]): number {
  return item.price + modifiers.reduce((s, m) => s + m.price, 0);
}

export function resolveLine(
  menuById: Map<string, MenuItem>,
  input: CartLineInput,
  lineId: string,
): LineResult {
  const item = menuById.get(input.itemId);
  if (!item) return { ok: false, code: "unknown_item", message: "That item is no longer on the menu." };
  if (!item.available) {
    return { ok: false, code: "sold_out", message: `${contextName(item)} just sold out.` };
  }
  const qty = Number(input.quantity);
  if (!Number.isInteger(qty) || qty < 1 || qty > MAX_LINE_QUANTITY) {
    return { ok: false, code: "invalid_quantity", message: "Please choose a quantity between 1 and 20." };
  }
  const mods = resolveModifiers(item, input.selections);
  if (!mods.ok) return { ok: false, code: "invalid_modifier", message: mods.message };
  const unit = unitPriceWithModifiers(item, mods.modifiers);
  return {
    ok: true,
    line: {
      lineId,
      itemId: item.id,
      name: contextName(item),
      category: item.category,
      quantity: qty,
      unitPrice: item.price,
      modifiers: mods.modifiers,
      note: sanitizeNote(input.note),
      lineTotal: unit * qty,
    },
  };
}

export interface PricedCart {
  lines: OrderLine[];
  subtotal: number;
  total: number;
  itemCount: number;
}

export type PriceResult = ({ ok: true } & PricedCart) | { ok: false; code: DomainErrorCode; message: string; itemId?: string };

export function priceCart(
  menu: MenuItem[],
  inputs: CartLineInput[],
  makeLineId: (index: number) => string = (i) => `l${i + 1}`,
): PriceResult {
  if (!inputs.length) return { ok: false, code: "empty_cart", message: "Your order is empty." };
  if (inputs.length > MAX_CART_LINES) {
    return { ok: false, code: "invalid_quantity", message: "That's a big order — please ask our team at the counter." };
  }
  const byId = new Map(menu.map((m) => [m.id, m]));
  const lines: OrderLine[] = [];
  for (let i = 0; i < inputs.length; i++) {
    const r = resolveLine(byId, inputs[i], makeLineId(i));
    if (!r.ok) return { ...r, itemId: inputs[i].itemId };
    lines.push(r.line);
  }
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  return {
    ok: true,
    lines,
    subtotal,
    // No fees are invented for the demo: the total is what the menu says.
    total: subtotal,
    itemCount: lines.reduce((s, l) => s + l.quantity, 0),
  };
}

/** Stable key so identical customisations merge into one cart line. */
export function lineKey(input: Pick<CartLineInput, "itemId" | "selections" | "note">): string {
  const sel = Object.keys(input.selections ?? {})
    .sort()
    .map((k) => `${k}=${[...(input.selections[k] ?? [])].sort().join("+")}`)
    .join("&");
  return `${input.itemId}?${sel}#${sanitizeNote(input.note) ?? ""}`;
}

/** Client-side estimate used in the cart before the server confirms the price. */
export function estimateLine(item: MenuItem, selections: Record<string, string[]>, quantity: number): number {
  const mods = resolveModifiers(item, selections);
  if (!mods.ok) return item.price * quantity;
  return unitPriceWithModifiers(item, mods.modifiers) * quantity;
}
