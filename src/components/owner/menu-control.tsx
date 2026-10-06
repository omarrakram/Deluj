"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { Check, Pencil, Search, Star } from "lucide-react";
import { ProductArt } from "@/components/brand/product-art";
import { CATEGORIES, CATEGORY_BY_ID, contextName, sortMenu } from "@/domain/menu";
import { formatEGP } from "@/domain/money";
import type { CategoryId, MenuItem, MenuItemPatch } from "@/domain/types";

type Filter = "all" | "soldout" | "featured";

export function MenuControl({ menu, onPatch }: { menu: MenuItem[]; onPatch: (item: MenuItem, patch: MenuItemPatch) => void }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const sorted = useMemo(() => sortMenu(menu), [menu]);
  const soldOut = menu.filter((m) => !m.available).length;
  const featured = menu.filter((m) => m.featured).length;
  const visible = sorted.filter(
    (m) =>
      (filter === "all" || (filter === "soldout" ? !m.available : m.featured)) &&
      (!q || `${m.name} ${CATEGORY_BY_ID[m.category].title}`.toLowerCase().includes(q.toLowerCase())),
  );
  const groups = CATEGORIES.map((c) => ({ ...c, items: visible.filter((m) => m.category === c.id) })).filter((g) => g.items.length);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-extrabold tracking-tight">Menu</h2>
          <p className="text-sm text-ink-soft">Changes go live on every table instantly.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex h-11 items-center gap-2 rounded-full bg-white px-4 shadow-soft">
            <Search className="h-4 w-4 text-orange" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find an item" className="w-36 bg-transparent text-[15px] outline-none" aria-label="Find a menu item" />
          </label>
          {(
            [
              ["all", `All · ${menu.length}`],
              ["soldout", `Sold out · ${soldOut}`],
              ["featured", `Featured · ${featured}`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={`h-11 rounded-full px-4 text-sm font-semibold transition ${filter === id ? "bg-ink text-cream" : "bg-white shadow-soft"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 space-y-6">
        {groups.map((g) => (
          <section key={g.id}>
            <h3 className="mb-2 font-display text-sm font-extrabold uppercase tracking-[0.14em] text-ink-soft">{g.title}</h3>
            <ul className="divide-y divide-line overflow-hidden rounded-3xl bg-white shadow-soft">
              {g.items.map((m) => (
                <MenuRow key={m.id} item={m} onPatch={onPatch} />
              ))}
            </ul>
          </section>
        ))}
        {groups.length === 0 && <p className="rounded-3xl bg-white p-8 text-center text-ink-soft shadow-soft">Nothing here.</p>}
      </div>
    </div>
  );
}

function MenuRow({ item, onPatch }: { item: MenuItem; onPatch: (item: MenuItem, patch: MenuItemPatch) => void }) {
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState(String(item.price));
  const savePrice = () => {
    const n = Number(price);
    setEditing(false);
    if (Number.isInteger(n) && n >= 1 && n <= 5000 && n !== item.price) onPatch(item, { price: n });
    else setPrice(String(item.price));
  };
  return (
    <li className={`flex flex-wrap items-center gap-3 px-3 py-3 sm:flex-nowrap sm:px-4 ${item.available ? "" : "bg-stone/50"}`} data-testid={`menu-${item.id}`}>
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl">
        <ProductArt art={item.art} className="h-full w-full" sparkles={false} soldOut={!item.available} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-[15px] font-bold">{contextName(item)}</p>
        <div className="mt-0.5 flex items-center gap-2 text-sm">
          {editing ? (
            <span className="flex items-center gap-1">
              <span className="text-ink-soft">EGP</span>
              <input
                autoFocus
                inputMode="numeric"
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") savePrice();
                  if (e.key === "Escape") {
                    setEditing(false);
                    setPrice(String(item.price));
                  }
                }}
                onBlur={savePrice}
                className="tabular h-8 w-20 rounded-lg border-2 border-orange bg-white px-2 font-semibold outline-none"
                aria-label={`Price of ${item.name}`}
              />
              <button onMouseDown={(e) => e.preventDefault()} onClick={savePrice} className="grid h-8 w-8 place-items-center rounded-lg bg-orange text-white" aria-label="Save price">
                <Check className="h-4 w-4" />
              </button>
            </span>
          ) : (
            <button onClick={() => setEditing(true)} className="group flex items-center gap-1 font-semibold text-ink-soft hover:text-ink" aria-label={`Edit price of ${item.name}`}>
              {formatEGP(item.price)} <Pencil className="h-3 w-3 opacity-50 group-hover:opacity-100" />
            </button>
          )}
          <select
            value={item.category}
            onChange={(e) => onPatch(item, { category: e.target.value as CategoryId })}
            className="hidden h-8 rounded-lg bg-stone px-2 text-xs font-semibold text-ink-soft outline-none md:block"
            aria-label={`Section for ${item.name}`}
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
      </div>
      <button
        onClick={() => onPatch(item, { featured: !item.featured })}
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-full transition active:scale-90 ${item.featured ? "bg-orange-wash text-orange" : "text-ink-mute hover:bg-stone"}`}
        aria-pressed={item.featured}
        aria-label={item.featured ? `Unfeature ${item.name}` : `Feature ${item.name}`}
        title={item.featured ? "Featured" : "Feature on the menu"}
      >
        <Star className="h-5 w-5" fill={item.featured ? "currentColor" : "none"} />
      </button>
      <AvailabilitySwitch available={item.available} onChange={(v) => onPatch(item, { available: v })} name={item.name} />
    </li>
  );
}

export function AvailabilitySwitch({ available, onChange, name }: { available: boolean; onChange: (v: boolean) => void; name: string }) {
  return (
    <button
      role="switch"
      aria-checked={available}
      aria-label={`${name}: ${available ? "available" : "sold out"}`}
      onClick={() => onChange(!available)}
      className={`relative flex h-10 w-[8.5rem] shrink-0 items-center rounded-full p-1 text-xs font-extrabold uppercase tracking-wide transition-colors duration-300 ${
        available ? "bg-mint-soft text-mint" : "bg-ink text-cream"
      }`}
      data-testid={`availability-${name}`}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 32 }}
        className={`absolute top-1 h-8 w-8 rounded-full shadow-soft ${available ? "right-1 bg-mint" : "left-1 bg-orange"}`}
      />
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={available ? "a" : "s"}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className={`w-full ${available ? "pr-9 text-center" : "pl-9 text-center"}`}
        >
          {available ? "Available" : "Sold out"}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
