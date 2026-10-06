"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, ChevronRight, Plus, Search, X } from "lucide-react";
import { Badge, CroissantDoodle, Star, Wave } from "@/components/brand/logo";
import { ProductArt } from "@/components/brand/product-art";
import { LinkDot } from "@/components/ui/link-status";
import { CATEGORIES } from "@/domain/menu";
import { formatEGP } from "@/domain/money";
import { tableLabel, tableNumber } from "@/domain/tables";
import type { CategoryId, MenuItem, Order } from "@/domain/types";
import type { LinkStatus } from "@/client/store";
import { customerStage, type CustomerStage } from "@/domain/orders";

const STAGE_SHORT: Record<CustomerStage, string> = {
  sent: "Sending to the kitchen",
  confirmed: "Confirmed",
  preparing: "Preparing",
  almost: "Almost ready",
  ready: "Coming to you",
  served: "Served · enjoy",
  cancelled: "Cancelled",
};

export function MenuView({
  tableCode,
  menu,
  link,
  activeOrder,
  now,
  onOpenItem,
  onQuickAdd,
  onOpenService,
  onTrack,
  cartCount,
}: {
  tableCode: string;
  menu: MenuItem[];
  link: LinkStatus;
  activeOrder: Order | null;
  now: number;
  onOpenItem: (id: string) => void;
  onQuickAdd: (item: MenuItem) => void;
  onOpenService: () => void;
  onTrack: () => void;
  cartCount: number;
}) {
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<CategoryId>(CATEGORIES[0].id);
  const sectionRefs = useRef<Partial<Record<CategoryId, HTMLElement | null>>>({});
  const railRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const [headerH, setHeaderH] = useState(64);
  const clickScrolling = useRef(false);

  // The sticky rail sits exactly under the header, whatever its height (order banner or not).
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeaderH(el.getBoundingClientRect().height));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const sections = useMemo(
    () => CATEGORIES.map((c) => ({ ...c, items: menu.filter((m) => m.category === c.id) })).filter((s) => s.items.length),
    [menu],
  );
  const featured = useMemo(() => menu.filter((m) => m.featured), [menu]);
  const q = query.trim().toLowerCase();
  const results = useMemo(
    () =>
      q
        ? menu.filter((m) =>
            [m.name, m.description ?? "", CATEGORIES.find((c) => c.id === m.category)?.title ?? "", m.tags.join(" ")]
              .join(" ")
              .toLowerCase()
              .includes(q),
          )
        : [],
    [menu, q],
  );

  // Scroll-spy: highlight the section in view.
  useEffect(() => {
    if (q) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (clickScrolling.current) return;
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActiveCat(visible.target.getAttribute("data-cat") as CategoryId);
      },
      { rootMargin: `-${Math.round(headerH + 70)}px 0px -60% 0px` },
    );
    Object.values(sectionRefs.current).forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [q, sections.length, headerH]);

  // Keep the active chip visible in the rail.
  useEffect(() => {
    const chip = railRef.current?.querySelector<HTMLElement>(`[data-chip="${activeCat}"]`);
    chip?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeCat]);

  const jumpTo = (id: CategoryId) => {
    const el = sectionRefs.current[id];
    if (!el) return;
    setActiveCat(id);
    clickScrolling.current = true;
    const top = el.getBoundingClientRect().top + window.scrollY - headerH - 56;
    window.scrollTo({ top, behavior: "smooth" });
    setTimeout(() => (clickScrolling.current = false), 700);
  };

  return (
    <div className="pb-36">
      {/* ── Header ── */}
      <header ref={headerRef} className="sticky top-0 z-30 bg-cream/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <Badge size={38} />
            <div className="leading-tight">
              <p className="font-display text-[15px] font-bold">{tableLabel(tableCode)}</p>
              <LinkDot status={link} />
            </div>
          </div>
          <button
            onClick={onOpenService}
            className="flex h-11 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold shadow-soft transition active:scale-95"
          >
            <Bell className="h-4 w-4 text-orange" />
            Need anything?
          </button>
        </div>
        {activeOrder && (
          <div className="mx-auto max-w-md px-4 pb-2">
            <button
              onClick={onTrack}
              className="flex w-full items-center justify-between rounded-2xl bg-ink px-4 py-2.5 text-left text-cream shadow-soft transition active:scale-[0.99]"
            >
              <span className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-orange" />
                </span>
                <span className="text-sm">
                  <span className="font-semibold">Order #{activeOrder.number}</span>
                  <span className="text-cream/70"> · {STAGE_SHORT[customerStage(activeOrder, now)]}</span>
                </span>
              </span>
              <span className="flex items-center text-sm font-semibold text-powder">
                Track <ChevronRight className="h-4 w-4" />
              </span>
            </button>
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <section className="relative">
        <div className="relative overflow-hidden bg-orange px-5 pb-10 pt-7 text-cream">
          <CroissantDoodle className="absolute -right-6 top-3 w-36 rotate-12 text-cream/20" />
          <CroissantDoodle className="absolute -left-10 bottom-6 w-28 -rotate-12 text-cream/15" />
          <Star className="absolute right-24 top-24 h-4 w-4 text-powder" />
          <div className="relative mx-auto max-w-md">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-cream/80">Dine-in · Table {tableNumber(tableCode)}</p>
            <h1 className="mt-2 font-display text-[2.15rem] font-extrabold leading-[1.02] tracking-tight text-balance">
              Your table,
              <br />
              your order.
            </h1>
            <p className="mt-2 max-w-[17rem] text-[15px] leading-snug text-cream/90">
              Order right here — we&apos;ll bring everything to {tableLabel(tableCode)}.
            </p>
            <label className="mt-5 flex h-13 items-center gap-3 rounded-full bg-white px-4 text-ink shadow-lift">
              <Search className="h-5 w-5 text-orange" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search the menu"
                className="h-12 w-full bg-transparent text-[16px] outline-none placeholder:text-ink-mute"
                aria-label="Search the menu"
                enterKeyHint="search"
              />
              {query && (
                <button onClick={() => setQuery("")} aria-label="Clear search" className="grid h-8 w-8 place-items-center rounded-full bg-stone">
                  <X className="h-4 w-4" />
                </button>
              )}
            </label>
          </div>
        </div>
        <Wave className="-mt-px block h-4 w-full text-orange" flip />
      </section>

      {q ? (
        <section className="mx-auto max-w-md px-4 pt-2">
          <p className="mb-3 text-sm font-semibold text-ink-soft">
            {results.length ? `${results.length} ${results.length === 1 ? "match" : "matches"} for “${query.trim()}”` : null}
          </p>
          {results.length ? (
            <ul className="space-y-3">
              {results.map((m) => (
                <MenuRow key={m.id} item={m} onOpen={onOpenItem} onQuickAdd={onQuickAdd} />
              ))}
            </ul>
          ) : (
            <div className="rounded-3xl bg-white p-8 text-center shadow-soft">
              <p className="font-display text-xl font-bold">Nothing matches “{query.trim()}”</p>
              <p className="mt-1 text-ink-soft">Try “latte”, “matcha” or “pancakes”.</p>
            </div>
          )}
        </section>
      ) : (
        <>
          {/* ── Featured ── */}
          {featured.length > 0 && (
            <section className="mx-auto max-w-md pt-1">
              <div className="flex items-baseline justify-between px-4">
                <h2 className="font-display text-xl font-bold">Deluj favourites</h2>
                <span className="font-serif text-lg italic text-orange-deep">freshly made</span>
              </div>
              <div className="no-scrollbar mt-3 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
                {featured.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => onOpenItem(m.id)}
                    className="w-[9.5rem] shrink-0 snap-start overflow-hidden rounded-3xl bg-white text-left shadow-soft transition active:scale-[0.98]"
                  >
                    <div className="relative">
                      <ProductArt art={m.art} className="aspect-square w-full" soldOut={!m.available} />
                      {!m.available && <SoldOutTag className="absolute left-2 top-2" />}
                    </div>
                    <div className="p-3">
                      <p className="line-clamp-2 min-h-[2.5rem] font-display text-[15px] font-bold leading-tight">{m.name}</p>
                      <p className="mt-1 text-sm font-semibold text-orange-deep">{formatEGP(m.price)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* ── Category rail ── */}
          <nav className="sticky z-20 mt-4 bg-cream/95 py-2.5 backdrop-blur-md" style={{ top: headerH - 1 }} aria-label="Menu sections">
            <div ref={railRef} className="no-scrollbar mx-auto flex max-w-md gap-2 overflow-x-auto px-4">
              {sections.map((c) => (
                <button
                  key={c.id}
                  data-chip={c.id}
                  onClick={() => jumpTo(c.id)}
                  className={`h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition ${
                    activeCat === c.id ? "bg-orange text-white shadow-orange" : "bg-white text-ink shadow-soft"
                  }`}
                  aria-current={activeCat === c.id ? "true" : undefined}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </nav>

          {/* ── Sections ── */}
          <div className="mx-auto max-w-md px-4">
            {sections.map((c) => (
              <section
                key={c.id}
                data-cat={c.id}
                ref={(el) => {
                  sectionRefs.current[c.id] = el;
                }}
                className="scroll-mt-32 pt-6"
                aria-labelledby={`sec-${c.id}`}
              >
                <div className="mb-3 flex items-center gap-2">
                  <h2 id={`sec-${c.id}`} className="font-display text-[1.35rem] font-extrabold tracking-tight">
                    {c.title}
                  </h2>
                  <span className="h-px flex-1 bg-line" />
                  <span className="text-xs font-semibold text-ink-mute">{c.items.length}</span>
                </div>
                <ul className="space-y-3">
                  {c.items.map((m) => (
                    <MenuRow key={m.id} item={m} onOpen={onOpenItem} onQuickAdd={onQuickAdd} />
                  ))}
                </ul>
              </section>
            ))}
            <p className="mt-10 text-center text-xs text-ink-mute">
              Prices in EGP as listed on the Deluj menu.
              {cartCount === 0 && " Tap any item to start your order."}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export function SoldOutTag({ className = "" }: { className?: string }) {
  return <span className={`rounded-full bg-ink px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-cream ${className}`}>Sold out</span>;
}

function MenuRow({ item, onOpen, onQuickAdd }: { item: MenuItem; onOpen: (id: string) => void; onQuickAdd: (m: MenuItem) => void }) {
  const customisable = item.modifierGroupIds.length > 0;
  return (
    <motion.li layout="position" className="relative">
      <div
        role="button"
        tabIndex={0}
        onClick={() => onOpen(item.id)}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen(item.id)}
        className={`flex gap-3.5 rounded-3xl bg-white p-3 shadow-soft transition active:scale-[0.99] ${item.available ? "" : "opacity-80"}`}
        aria-label={`${item.name}, ${formatEGP(item.price)}${item.available ? "" : ", sold out"}`}
      >
        <div className="relative h-[5.5rem] w-[5.5rem] shrink-0 overflow-hidden rounded-2xl">
          <ProductArt art={item.art} className="h-full w-full" sparkles={false} soldOut={!item.available} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col py-0.5 pr-1">
          <p className="font-display text-[16px] font-bold leading-tight">{item.name}</p>
          {item.description ? (
            <p className="mt-1 line-clamp-2 pr-9 text-[13px] leading-snug text-ink-soft">{item.description}</p>
          ) : customisable ? (
            <p className="mt-1 text-[13px] leading-snug text-ink-soft">Make it yours — milk, syrup &amp; more</p>
          ) : null}
          <div className="mt-auto flex items-end justify-between pt-2">
            <span className={`text-[15px] font-bold ${item.available ? "text-ink" : "text-ink-mute line-through"}`}>{formatEGP(item.price)}</span>
          </div>
        </div>
      </div>
      <div className="absolute bottom-3 right-3">
        <AnimatePresence mode="wait" initial={false}>
          {item.available ? (
            <motion.button
              key="add"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              onClick={(e) => {
                e.stopPropagation();
                if (customisable) onOpen(item.id);
                else onQuickAdd(item);
              }}
              className="grid h-10 w-10 place-items-center rounded-full bg-orange text-white shadow-orange transition active:scale-90"
              aria-label={customisable ? `Customise ${item.name}` : `Add ${item.name}`}
            >
              <Plus className="h-5 w-5" strokeWidth={2.6} />
            </motion.button>
          ) : (
            <motion.span key="sold" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }}>
              <SoldOutTag />
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </motion.li>
  );
}
