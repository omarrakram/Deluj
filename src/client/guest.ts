"use client";

// The guest's own state on their phone: cart, the orders placed from this
// device, and the requests sent. Persisted per table so a refresh never loses
// the cart or the tracker.

import { useCallback, useEffect, useState } from "react";
import { lineKey, sanitizeNote } from "@/domain/cart";
import type { CartLineInput } from "@/domain/types";

export interface CartLine extends CartLineInput {
  key: string;
  addedAt: number;
}

export interface GuestState {
  cart: CartLine[];
  orderIds: string[];
  requestIds: string[];
  resetVersion: number | null;
}

const EMPTY: GuestState = { cart: [], orderIds: [], requestIds: [], resetVersion: null };
const keyFor = (table: string) => `deluj:guest:${table}:v1`;

function read(table: string): GuestState {
  try {
    const raw = localStorage.getItem(keyFor(table));
    if (raw) return { ...EMPTY, ...(JSON.parse(raw) as GuestState) };
  } catch {
    /* private mode or corrupted */
  }
  return EMPTY;
}

export function useGuest(table: string) {
  const [state, setState] = useState<GuestState>(EMPTY);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from localStorage after mount
    setState(read(table));
    setHydrated(true);
  }, [table]);

  const update = useCallback(
    (fn: (s: GuestState) => GuestState) => {
      setState((prev) => {
        const next = fn(prev);
        try {
          localStorage.setItem(keyFor(table), JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [table],
  );

  const addToCart = useCallback(
    (input: CartLineInput) =>
      update((s) => {
        const note = sanitizeNote(input.note);
        const key = lineKey({ ...input, note });
        const existing = s.cart.find((l) => l.key === key);
        const cart = existing
          ? s.cart.map((l) => (l.key === key ? { ...l, quantity: Math.min(20, l.quantity + input.quantity) } : l))
          : [...s.cart, { ...input, note, key, addedAt: Date.now() }];
        return { ...s, cart };
      }),
    [update],
  );

  const setQuantity = useCallback(
    (key: string, quantity: number) =>
      update((s) => ({
        ...s,
        cart: quantity <= 0 ? s.cart.filter((l) => l.key !== key) : s.cart.map((l) => (l.key === key ? { ...l, quantity: Math.min(20, quantity) } : l)),
      })),
    [update],
  );

  const setLineNote = useCallback(
    (key: string, note: string) =>
      update((s) => ({
        ...s,
        cart: s.cart.map((l) => {
          if (l.key !== key) return l;
          const clean = sanitizeNote(note);
          return { ...l, note: clean, key: lineKey({ ...l, note: clean }) };
        }),
      })),
    [update],
  );

  const removeLine = useCallback((key: string) => update((s) => ({ ...s, cart: s.cart.filter((l) => l.key !== key) })), [update]);
  const clearCart = useCallback(() => update((s) => ({ ...s, cart: [] })), [update]);
  const rememberOrder = useCallback((id: string) => update((s) => ({ ...s, orderIds: [...s.orderIds.filter((x) => x !== id), id] })), [update]);
  const rememberRequest = useCallback((id: string) => update((s) => ({ ...s, requestIds: [...s.requestIds.filter((x) => x !== id), id] })), [update]);

  /** After a demo reset everything from the previous run is forgotten. */
  const syncResetVersion = useCallback(
    (version: number) =>
      update((s) => (s.resetVersion === version ? s : { ...EMPTY, resetVersion: version, cart: s.resetVersion === null ? s.cart : [] })),
    [update],
  );

  return { ...state, hydrated, addToCart, setQuantity, setLineNote, removeLine, clearCart, rememberOrder, rememberRequest, syncResetVersion };
}

export type Guest = ReturnType<typeof useGuest>;
