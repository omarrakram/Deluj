"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { Check, Plus } from "lucide-react";
import { ProductArt } from "@/components/brand/product-art";
import { QuantityStepper } from "@/components/ui/quantity";
import { defaultSelections, estimateLine, groupsFor, MAX_NOTE_LENGTH, resolveModifiers } from "@/domain/cart";
import { CATEGORY_BY_ID, contextName } from "@/domain/menu";
import { formatEGP, formatEGPDelta } from "@/domain/money";
import type { Recommendation } from "@/domain/recommend";
import type { CartLineInput, MenuItem } from "@/domain/types";

export function ItemSheetBody({
  item,
  onAdd,
  recommendationsFor,
  onQuickAdd,
  onOpenItem,
  onViewCart,
  onClose,
  cartSummary,
}: {
  item: MenuItem;
  onAdd: (input: CartLineInput) => void;
  recommendationsFor: (anchorItemId: string) => Recommendation[];
  onQuickAdd: (item: MenuItem) => void;
  onOpenItem: (id: string) => void;
  onViewCart: () => void;
  onClose: () => void;
  cartSummary: { count: number; total: number };
}) {
  const [selections, setSelections] = useState<Record<string, string[]>>(() => defaultSelections(item));
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [phase, setPhase] = useState<"customise" | "added">("customise");
  const [addedRecs, setAddedRecs] = useState<Recommendation[]>([]);
  const [quickAdded, setQuickAdded] = useState<string[]>([]);
  const groups = groupsFor(item);
  const total = estimateLine(item, selections, qty);
  const chosen = useMemo(() => {
    const r = resolveModifiers(item, selections);
    return r.ok ? r.modifiers : [];
  }, [item, selections]);

  const toggle = (groupId: string, optionId: string, single: boolean) =>
    setSelections((s) => {
      const cur = s[groupId] ?? [];
      if (single) return { ...s, [groupId]: [optionId] };
      return { ...s, [groupId]: cur.includes(optionId) ? cur.filter((x) => x !== optionId) : [...cur, optionId] };
    });

  const add = () => {
    onAdd({ itemId: item.id, quantity: qty, selections, note });
    navigator.vibrate?.(12);
    const recs = recommendationsFor(item.id);
    if (recs.length) {
      setAddedRecs(recs);
      setPhase("added");
    } else {
      onClose();
    }
  };

  if (phase === "added") {
    const [top, ...rest] = addedRecs;
    return (
      <div className="flex min-h-0 flex-col">
        <div className="overflow-y-auto px-5 pb-4 pt-7">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 18 }}
              className="grid h-11 w-11 place-items-center rounded-full bg-mint text-white"
            >
              <Check className="h-6 w-6" strokeWidth={3} />
            </motion.span>
            <div className="min-w-0 pr-10">
              <p className="font-display text-lg font-bold leading-tight">Added to your order</p>
              <p className="truncate text-sm text-ink-soft">
                {qty} × {contextName(item)}
                {chosen.length ? ` · ${chosen.map((m) => m.label).join(" · ")}` : ""}
              </p>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-6">
            <p className="font-serif text-[1.7rem] italic leading-none text-orange-deep">{top.headline}</p>
            <div className="mt-3 overflow-hidden rounded-3xl bg-white shadow-lift">
              <div className="flex gap-4 p-3.5">
                <button onClick={() => onOpenItem(top.item.id)} className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl" aria-label={`See ${top.item.name}`}>
                  <ProductArt art={top.item.art} className="h-full w-full" />
                </button>
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="font-display text-[17px] font-bold leading-tight">{contextName(top.item)}</p>
                  <p className="mt-1 text-[13px] leading-snug text-ink-soft">{top.reason}</p>
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <span className="font-bold">{formatEGPDelta(top.item.price)}</span>
                    <AddButton
                      added={quickAdded.includes(top.item.id)}
                      onClick={() => {
                        onQuickAdd(top.item);
                        setQuickAdded((x) => [...x, top.item.id]);
                      }}
                      label={top.item.name}
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {rest.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-5">
              <p className="text-sm font-semibold text-ink-soft">You might also like</p>
              <div className="mt-2 grid grid-cols-2 gap-3">
                {rest.map((r) => (
                  <div key={r.item.id} className="overflow-hidden rounded-2xl bg-white shadow-soft">
                    <button onClick={() => onOpenItem(r.item.id)} className="block w-full" aria-label={`See ${r.item.name}`}>
                      <ProductArt art={r.item.art} className="aspect-[4/3] w-full" sparkles={false} />
                    </button>
                    <div className="flex items-center justify-between gap-2 p-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{contextName(r.item)}</p>
                        <p className="text-xs font-semibold text-ink-soft">{formatEGP(r.item.price)}</p>
                      </div>
                      <AddButton
                        small
                        added={quickAdded.includes(r.item.id)}
                        onClick={() => {
                          onQuickAdd(r.item);
                          setQuickAdded((x) => [...x, r.item.id]);
                        }}
                        label={r.item.name}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
        <div className="safe-bottom grid grid-cols-2 gap-3 border-t border-line bg-cream px-5 pt-3">
          <button onClick={onClose} className="h-13 rounded-full bg-white py-3.5 font-semibold shadow-soft transition active:scale-[0.98]">
            Keep browsing
          </button>
          <button onClick={onViewCart} className="h-13 rounded-full bg-ink py-3.5 font-semibold text-cream transition active:scale-[0.98]">
            View order · {formatEGP(cartSummary.total)}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-col">
      <div className="overflow-y-auto">
        <div className="relative">
          <ProductArt art={item.art} className="aspect-[16/11] w-full" soldOut={!item.available} />
          <span className="absolute bottom-3 left-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold uppercase tracking-wide text-ink">
            {CATEGORY_BY_ID[item.category].title}
          </span>
        </div>
        <div className="px-5 pb-5 pt-4">
          <div className="flex items-start justify-between gap-4">
            <h2 className="font-display text-[1.65rem] font-extrabold leading-tight tracking-tight">{item.name}</h2>
            <p className="pt-1.5 text-lg font-bold text-orange-deep">{formatEGP(item.price)}</p>
          </div>
          {item.description && <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{item.description}</p>}
          {!item.available && (
            <p className="mt-3 rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-cream">
              Sold out for now — it&apos;ll be back soon. Our team can suggest something similar.
            </p>
          )}

          {groups.map((g) => (
            <fieldset key={g.id} className="mt-6">
              <legend className="flex w-full items-baseline justify-between">
                <span className="font-display text-[17px] font-bold">{g.label}</span>
                <span className="text-xs font-semibold text-ink-mute">{g.type === "single" ? "Choose one" : g.hint ?? "Optional"}</span>
              </legend>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {g.options.map((o) => {
                  const on = (selections[g.id] ?? []).includes(o.id);
                  return (
                    <button
                      key={o.id}
                      type="button"
                      role={g.type === "single" ? "radio" : "checkbox"}
                      aria-checked={on}
                      onClick={() => toggle(g.id, o.id, g.type === "single")}
                      className={`flex h-11 items-center gap-1.5 rounded-full border-2 px-4 text-sm font-semibold transition active:scale-95 ${
                        on ? "border-orange bg-orange-wash text-ink" : "border-line bg-white text-ink"
                      }`}
                    >
                      {on && <Check className="h-4 w-4 text-orange" strokeWidth={3} />}
                      {o.label}
                      {o.price > 0 && <span className={`${on ? "text-orange-deep" : "text-ink-mute"}`}>+{o.price}</span>}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}

          <div className="mt-6">
            <label htmlFor="item-note" className="font-display text-[17px] font-bold">
              Special instructions
            </label>
            <textarea
              id="item-note"
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, MAX_NOTE_LENGTH))}
              rows={2}
              placeholder={item.category === "breakfast" || item.category === "sandwiches" ? "e.g. no onions, sauce on the side" : "e.g. extra hot, less sweet"}
              className="mt-2 w-full resize-none rounded-2xl border-2 border-line bg-white px-4 py-3 text-[16px] outline-none transition focus:border-powder-deep"
            />
          </div>
        </div>
      </div>
      <div className="safe-bottom flex items-center gap-3 border-t border-line bg-cream px-5 pt-3">
        <QuantityStepper value={qty} onChange={(n) => setQty(Math.max(1, n))} />
        <button
          disabled={!item.available}
          onClick={add}
          className="flex h-13 flex-1 items-center justify-between rounded-full bg-orange px-5 py-3.5 text-[16px] font-bold text-white shadow-orange transition active:scale-[0.98] disabled:bg-ink-mute disabled:shadow-none"
        >
          <span>{item.available ? "Add to order" : "Sold out"}</span>
          {item.available && (
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span key={total} initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="tabular">
                {formatEGP(total)}
              </motion.span>
            </AnimatePresence>
          )}
        </button>
      </div>
    </div>
  );
}

function AddButton({ added, onClick, label, small = false }: { added: boolean; onClick: () => void; label: string; small?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={added}
      aria-label={added ? `${label} added` : `Add ${label}`}
      className={`flex items-center justify-center gap-1 rounded-full font-bold transition active:scale-95 ${
        small ? "h-9 w-9" : "h-10 px-4"
      } ${added ? "bg-mint text-white" : "bg-orange text-white shadow-orange"}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {added ? (
          <motion.span key="ok" initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-1">
            <Check className="h-4 w-4" strokeWidth={3} />
            {!small && "Added"}
          </motion.span>
        ) : (
          <motion.span key="add" className="flex items-center gap-1">
            <Plus className="h-4 w-4" strokeWidth={3} />
            {!small && "Add"}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
