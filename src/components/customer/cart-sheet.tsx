"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { MessageSquareText, Plus } from "lucide-react";
import { ProductArt } from "@/components/brand/product-art";
import { QuantityStepper } from "@/components/ui/quantity";
import { estimateLine, MAX_NOTE_LENGTH, resolveModifiers } from "@/domain/cart";
import { contextName } from "@/domain/menu";
import { formatEGP } from "@/domain/money";
import type { Recommendation } from "@/domain/recommend";
import type { MenuItem } from "@/domain/types";
import type { CartLine } from "@/client/guest";

export function CartSheetBody({
  lines,
  menuById,
  tableLabel,
  recommendations,
  onQuantity,
  onNote,
  onQuickAdd,
  onOpenItem,
  onCheckout,
  onClose,
  canCheckout,
}: {
  lines: CartLine[];
  menuById: Map<string, MenuItem>;
  tableLabel: string;
  recommendations: Recommendation[];
  onQuantity: (key: string, qty: number) => void;
  onNote: (key: string, note: string) => void;
  onQuickAdd: (item: MenuItem) => void;
  onOpenItem: (id: string) => void;
  onCheckout: () => void;
  onClose: () => void;
  canCheckout: boolean;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const priced = lines.map((l) => {
    const item = menuById.get(l.itemId);
    return { line: l, item, total: item ? estimateLine(item, l.selections, l.quantity) : 0 };
  });
  const subtotal = priced.reduce((s, p) => s + p.total, 0);
  const unavailable = priced.filter((p) => !p.item || !p.item.available);
  const count = lines.reduce((s, l) => s + l.quantity, 0);

  if (!lines.length) {
    return (
      <div className="px-6 pb-10 pt-12 text-center">
        <p className="font-display text-2xl font-extrabold">Your order is empty</p>
        <p className="mt-1 text-ink-soft">Freshly made food and coffee are a tap away.</p>
        <button onClick={onClose} className="mt-6 h-12 rounded-full bg-orange px-6 font-bold text-white shadow-orange">
          Browse the menu
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-col">
      <div className="overflow-y-auto px-5 pb-4 pt-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-deep">{tableLabel}</p>
        <h2 className="font-display text-[1.7rem] font-extrabold tracking-tight">Your order</h2>

        <ul className="mt-4 space-y-3">
          <AnimatePresence initial={false}>
            {priced.map(({ line, item, total }) => {
              const mods = item ? resolveModifiers(item, line.selections) : null;
              const labels = mods && mods.ok ? mods.modifiers.map((m) => m.label) : [];
              const soldOut = !item || !item.available;
              return (
                <motion.li
                  key={line.key}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -40, height: 0, marginTop: 0 }}
                  className={`rounded-3xl bg-white p-3 shadow-soft ${soldOut ? "ring-2 ring-orange" : ""}`}
                >
                  <div className="flex gap-3">
                    {item && (
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl">
                        <ProductArt art={item.art} className="h-full w-full" sparkles={false} soldOut={soldOut} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-display font-bold leading-tight">{item ? contextName(item) : "Unavailable item"}</p>
                        <p className="tabular shrink-0 font-bold">{formatEGP(total)}</p>
                      </div>
                      {labels.length > 0 && <p className="mt-0.5 text-[13px] text-ink-soft">{labels.join(" · ")}</p>}
                      {line.note && <p className="mt-0.5 text-[13px] italic text-ink-soft">“{line.note}”</p>}
                      {soldOut && <p className="mt-1 text-[13px] font-semibold text-orange-deep">Just sold out — please remove it to continue.</p>}
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between">
                    <button
                      onClick={() => setEditing(editing === line.key ? null : line.key)}
                      className="flex h-9 items-center gap-1.5 rounded-full px-2 text-[13px] font-semibold text-powder-deep"
                    >
                      <MessageSquareText className="h-4 w-4" /> {line.note ? "Edit note" : "Add note"}
                    </button>
                    <QuantityStepper size="sm" removable value={line.quantity} onChange={(n) => onQuantity(line.key, n)} label={`Quantity of ${item?.name ?? "item"}`} />
                  </div>
                  {editing === line.key && (
                    <NoteEditor
                      initial={line.note ?? ""}
                      onSave={(n) => {
                        onNote(line.key, n);
                        setEditing(null);
                      }}
                    />
                  )}
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>

        {recommendations.length > 0 && (
          <div className="mt-6">
            <p className="font-serif text-2xl italic leading-none text-orange-deep">Complete your order</p>
            <div className="no-scrollbar -mx-5 mt-3 flex gap-3 overflow-x-auto px-5 pb-1">
              {recommendations.map((r) => (
                <div key={r.item.id} className="w-40 shrink-0 overflow-hidden rounded-2xl bg-white shadow-soft">
                  <button onClick={() => onOpenItem(r.item.id)} className="block w-full" aria-label={`See ${r.item.name}`}>
                    <ProductArt art={r.item.art} className="aspect-[4/3] w-full" sparkles={false} />
                  </button>
                  <div className="p-2.5">
                    <p className="truncate text-sm font-bold">{contextName(r.item)}</p>
                    <p className="line-clamp-2 min-h-[2rem] text-[11px] leading-tight text-ink-soft">{r.reason}</p>
                    <button
                      onClick={() => onQuickAdd(r.item)}
                      className="mt-2 flex h-9 w-full items-center justify-center gap-1 rounded-full bg-orange-wash text-sm font-bold text-orange-deep transition active:scale-95"
                    >
                      <Plus className="h-4 w-4" strokeWidth={3} /> {formatEGP(r.item.price)}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <dl className="mt-6 space-y-1.5 rounded-3xl bg-white p-4 text-[15px] shadow-soft">
          <div className="flex justify-between text-ink-soft">
            <dt>Subtotal · {count} {count === 1 ? "item" : "items"}</dt>
            <dd className="tabular">{formatEGP(subtotal)}</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-2 text-lg font-bold">
            <dt>Total</dt>
            <dd className="tabular">{formatEGP(subtotal)}</dd>
          </div>
        </dl>
      </div>
      <div className="safe-bottom border-t border-line bg-cream px-5 pt-3">
        <button
          onClick={onCheckout}
          disabled={!!unavailable.length || !canCheckout}
          className="flex h-14 w-full items-center justify-between rounded-full bg-orange px-6 text-[17px] font-bold text-white shadow-orange transition active:scale-[0.98] disabled:bg-ink-mute disabled:shadow-none"
        >
          <span>{canCheckout ? "Checkout" : "Connecting…"}</span>
          <span className="tabular">{formatEGP(subtotal)}</span>
        </button>
      </div>
    </div>
  );
}

function NoteEditor({ initial, onSave }: { initial: string; onSave: (n: string) => void }) {
  const [v, setV] = useState(initial);
  return (
    <div className="mt-2 flex gap-2">
      <input
        autoFocus
        value={v}
        onChange={(e) => setV(e.target.value.slice(0, MAX_NOTE_LENGTH))}
        onKeyDown={(e) => e.key === "Enter" && onSave(v)}
        placeholder="e.g. less ice, sauce on the side"
        className="h-11 min-w-0 flex-1 rounded-full border-2 border-line bg-cream px-4 text-[16px] outline-none focus:border-powder-deep"
      />
      <button onClick={() => onSave(v)} className="h-11 rounded-full bg-ink px-4 text-sm font-bold text-cream">
        Save
      </button>
    </div>
  );
}
