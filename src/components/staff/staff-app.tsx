"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { BellRing, Moon, Sun, Volume2, VolumeX } from "lucide-react";
import { DelujProvider, useDeluj, useNow } from "@/client/store";
import { useChime } from "@/client/chime";
import { useWakeLock } from "@/client/wake-lock";
import { Wordmark } from "@/components/brand/logo";
import { LinkDot } from "@/components/ui/link-status";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { formatEGP } from "@/domain/money";
import { STATUS_LABEL, withStatus } from "@/domain/orders";
import { isOpen, SERVICE_KIND_META, withRequestStatus } from "@/domain/requests";
import { tableLabel } from "@/domain/tables";
import { formatCairoTime, minutesBetween } from "@/domain/time";
import type { Order, OrderStatus, ServiceRequest, ServiceStatus } from "@/domain/types";
import { OrderCard } from "./order-card";
import { RequestCard } from "./request-card";

type ColumnId = "new" | "preparing" | "ready" | "served";
const COLUMNS: { id: ColumnId; label: string; statuses: OrderStatus[]; accent: string }[] = [
  { id: "new", label: "New orders", statuses: ["new", "accepted"], accent: "bg-orange" },
  { id: "preparing", label: "Preparing", statuses: ["preparing"], accent: "bg-powder-deep" },
  { id: "ready", label: "Ready", statuses: ["ready"], accent: "bg-mint" },
  { id: "served", label: "Served", statuses: ["served"], accent: "bg-ink-mute" },
];
const FRESH_MS = 9000;

export function StaffApp() {
  return (
    <DelujProvider>
      <ToastProvider>
        <Kitchen />
      </ToastProvider>
    </DelujProvider>
  );
}

function Kitchen() {
  const { data, ready, link, client } = useDeluj();
  const now = useNow(1000);
  const chime = useChime();
  const toast = useToast();
  useWakeLock();
  const [dark, setDark] = useState(false);
  const [tab, setTab] = useState<ColumnId | "requests">("new");
  const [fresh, setFresh] = useState<Record<string, number>>({});
  const [banner, setBanner] = useState<{ id: string; title: string; body: string } | null>(null);
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restore preference after mount
      setDark(localStorage.getItem("deluj:kds-dark") === "1");
    } catch {
      /* ignore */
    }
  }, []);

  // Remember what was already on the board so only genuinely new arrivals chime.
  useEffect(() => {
    if (data && !seen.current) seen.current = new Set([...data.orders.map((o) => o.id), ...data.requests.map((r) => r.id)]);
  }, [data]);

  const { play } = chime;
  useEffect(
    () =>
      client.onChanges((changes) => {
        if (!seen.current) return;
        for (const c of changes) {
          if (c.table === "orders" && !seen.current.has(c.row.id)) {
            seen.current.add(c.row.id);
            if (c.row.status === "new") {
              play("order");
              setFresh((f) => ({ ...f, [c.row.id]: Date.now() }));
              setBanner({
                id: c.row.id,
                title: `New order · ${c.row.tableCode ? tableLabel(c.row.tableCode) : c.row.customerName ?? "Pickup"}`,
                body: `#${c.row.number} · ${c.row.lines.reduce((s, l) => s + l.quantity, 0)} items · ${formatEGP(c.row.total)}`,
              });
            }
          }
          if (c.table === "requests" && !seen.current.has(c.row.id)) {
            seen.current.add(c.row.id);
            if (c.row.status === "open") {
              play("request");
              setFresh((f) => ({ ...f, [c.row.id]: Date.now() }));
              setBanner({ id: c.row.id, title: `${tableLabel(c.row.tableCode)} · ${SERVICE_KIND_META[c.row.kind].label}`, body: "Just now" });
            }
          }
        }
      }),
    [client, play],
  );

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 5000);
    return () => clearTimeout(t);
  }, [banner]);

  const isFresh = (id: string) => (fresh[id] ? now - fresh[id] < FRESH_MS : false);

  const columns = useMemo(() => {
    const orders = data?.orders ?? [];
    return COLUMNS.map((col) => {
      let list = orders.filter((o) => col.statuses.includes(o.status));
      if (col.id === "served") {
        list = list
          .filter((o) => o.servedAt && minutesBetween(o.servedAt, now) < 45)
          .sort((a, b) => (b.servedAt ?? "").localeCompare(a.servedAt ?? ""))
          .slice(0, 8);
      } else {
        // Orders still waiting to be accepted come first, then oldest first.
        list = list.sort((a, b) => Number(b.status === "new") - Number(a.status === "new") || a.createdAt.localeCompare(b.createdAt));
      }
      return { ...col, orders: list };
    });
  }, [data?.orders, now]);

  const openRequests = useMemo(
    () =>
      (data?.requests ?? [])
        .filter(isOpen)
        .sort((a, b) => (a.kind === "bill" ? -1 : 0) - (b.kind === "bill" ? -1 : 0) || b.createdAt.localeCompare(a.createdAt)),
    [data?.requests],
  );
  const handled = useMemo(
    () =>
      (data?.requests ?? [])
        .filter((r) => r.status === "done" && r.completedAt && minutesBetween(r.completedAt, now) < 20)
        .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))
        .slice(0, 3),
    [data?.requests, now],
  );

  const moveOrder = async (order: Order, to: OrderStatus) => {
    const optimistic = withStatus(order, to, new Date(client.now()).toISOString());
    const result = await client.send({ type: "setOrderStatus", orderId: order.id, status: to }, { orders: [optimistic] });
    if (!result.ok) toast({ tone: "error", title: `Couldn't move #${order.number}`, body: result.message });
    else if (to === "ready") toast({ tone: "success", title: `#${order.number} is ready`, body: order.tableCode ? `${tableLabel(order.tableCode)} has been told.` : "The guest has been told." });
  };

  const moveRequest = async (r: ServiceRequest, to: ServiceStatus) => {
    const optimistic = withRequestStatus(r, to, new Date(client.now()).toISOString());
    const result = await client.send({ type: "setRequestStatus", requestId: r.id, status: to }, { requests: [optimistic] });
    if (!result.ok) toast({ tone: "error", title: "Couldn't update that request", body: result.message });
  };

  const toggleDark = () =>
    setDark((d) => {
      try {
        localStorage.setItem("deluj:kds-dark", d ? "0" : "1");
      } catch {
        /* ignore */
      }
      return !d;
    });

  const count = (id: ColumnId) => columns.find((c) => c.id === id)?.orders.length ?? 0;
  const servedRecent = (columns.find((c) => c.id === "served")?.orders ?? []).slice(0, 4);
  const muted = dark ? "text-cream/60" : "text-ink-mute";

  return (
    <div className={`flex min-h-dvh flex-col ${dark ? "bg-kitchen text-cream" : "terrazzo bg-stone text-ink"}`}>
      {/* ── Top bar ── */}
      <header className={`sticky top-0 z-30 border-b ${dark ? "border-white/10 bg-kitchen/95" : "border-line bg-cream/95"} backdrop-blur`}>
        <div className="flex items-center gap-3 px-4 py-2.5 lg:px-6">
          <Link href="/" aria-label="Deluj home" className="flex items-center gap-3">
            <Wordmark className={`h-7 ${dark ? "text-powder" : "text-orange"}`} />
          </Link>
          <span className={`hidden h-6 w-px sm:block ${dark ? "bg-white/15" : "bg-line"}`} />
          <p className="hidden font-display text-lg font-bold sm:block">Kitchen</p>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <LinkDot status={link} dark={dark} />
            <span className="tabular hidden min-w-[5.5rem] text-right font-display text-lg font-bold md:block">{now ? formatCairoTime(now) : ""}</span>
            <button
              onClick={chime.toggle}
              className={`flex h-10 items-center gap-2 rounded-full px-3 text-sm font-semibold transition active:scale-95 ${
                chime.enabled ? "bg-orange text-white" : dark ? "bg-white/10 text-cream" : "bg-white text-ink shadow-soft"
              }`}
              aria-pressed={chime.enabled}
              data-testid="chime-toggle"
            >
              {chime.enabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              <span className="hidden sm:inline">{chime.enabled ? "Chime on" : "Enable chime"}</span>
            </button>
            <button
              onClick={toggleDark}
              className={`grid h-10 w-10 place-items-center rounded-full transition active:scale-95 ${dark ? "bg-white/10" : "bg-white shadow-soft"}`}
              aria-label={dark ? "Light mode" : "Kitchen dark mode"}
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {/* Tabs for small screens */}
        <nav className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-2.5 lg:hidden" aria-label="Board sections">
          {[...COLUMNS.map((c) => ({ id: c.id as ColumnId | "requests", label: c.label, n: count(c.id) })), { id: "requests" as const, label: "Requests", n: openRequests.length }].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex h-9 shrink-0 items-center gap-2 rounded-full px-3.5 text-sm font-semibold ${
                tab === t.id ? "bg-orange text-white" : dark ? "bg-white/10" : "bg-white shadow-soft"
              }`}
            >
              {t.label}
              <span className={`tabular rounded-full px-1.5 text-xs ${tab === t.id ? "bg-white/25" : dark ? "bg-white/10" : "bg-stone"}`}>{t.n}</span>
            </button>
          ))}
        </nav>
      </header>

      {/* ── Arrival banner ── */}
      <AnimatePresence>
        {banner && (
          <motion.div
            key={banner.id}
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            className="pointer-events-none fixed left-1/2 top-16 z-40 -translate-x-1/2"
          >
            <div className="flex items-center gap-3 rounded-full bg-orange px-5 py-3 text-white shadow-lift">
              <BellRing className="h-5 w-5" />
              <span className="font-display text-lg font-extrabold">{banner.title}</span>
              <span className="text-white/85">{banner.body}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!ready ? (
        <BoardSkeleton dark={dark} />
      ) : (
        <main className="flex flex-1 flex-col gap-4 p-4 lg:flex-row lg:p-5">
          {/* Order columns */}
          <div className="grid min-w-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-3 2xl:grid-cols-4">
            {columns.map((col) => (
              <section
                key={col.id}
                className={`min-w-0 ${tab === col.id ? "block" : "hidden"} ${col.id === "served" ? "2xl:block" : "lg:block"}`}
                aria-label={col.label}
              >
                <div className="mb-3 flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${col.accent}`} />
                  <h2 className="font-display text-[15px] font-extrabold uppercase tracking-[0.12em]">{col.label}</h2>
                  <span className={`tabular ml-auto rounded-full px-2 py-0.5 text-sm font-bold ${dark ? "bg-white/10" : "bg-white shadow-soft"}`}>{col.orders.length}</span>
                </div>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-1">
                  <AnimatePresence initial={false} mode="popLayout">
                    {col.orders.map((o) => (
                      <OrderCard key={o.id} order={o} now={now} fresh={isFresh(o.id)} dark={dark} onMove={moveOrder} />
                    ))}
                  </AnimatePresence>
                  {col.orders.length === 0 && (
                    <div className={`rounded-2xl border-2 border-dashed px-4 py-8 text-center text-sm font-semibold ${dark ? "border-white/10 text-cream/40" : "border-ink/10 text-ink-mute"}`}>
                      {col.id === "new" ? "All caught up — new orders appear here instantly." : col.id === "served" ? "Served orders show here." : `Nothing ${STATUS_LABEL[col.statuses[0]].toLowerCase()} right now.`}
                    </div>
                  )}
                </div>
              </section>
            ))}
          </div>

          {/* Requests */}
          <aside
            className={`w-full shrink-0 lg:block lg:w-[17rem] xl:w-[20rem] ${tab === "requests" ? "block" : "hidden"}`}
            aria-label="Guest requests"
          >
            <div className={`sticky top-20 rounded-3xl p-3.5 ${dark ? "bg-white/5" : "bg-cream/80 shadow-soft"}`}>
              <div className="mb-3 flex items-center gap-2 px-1">
                <BellRing className="h-4 w-4 text-orange" />
                <h2 className="font-display text-[15px] font-extrabold uppercase tracking-[0.12em]">Guest requests</h2>
                <span className={`tabular ml-auto rounded-full px-2 py-0.5 text-sm font-bold ${openRequests.length ? "bg-orange text-white" : dark ? "bg-white/10" : "bg-white"}`}>
                  {openRequests.length}
                </span>
              </div>
              <div className="space-y-3">
                <AnimatePresence initial={false} mode="popLayout">
                  {openRequests.map((r) => (
                    <RequestCard key={r.id} request={r} now={now} fresh={isFresh(r.id)} dark={dark} onMove={moveRequest} />
                  ))}
                </AnimatePresence>
                {openRequests.length === 0 && (
                  <p className={`rounded-2xl border-2 border-dashed px-4 py-8 text-center text-sm font-semibold ${dark ? "border-white/10 text-cream/40" : "border-ink/10 text-ink-mute"}`}>
                    No open requests. Guests can call for water, the bill and more from their phone.
                  </p>
                )}
              </div>
              {servedRecent.length > 0 && (
                <div className="mt-4 hidden px-1 lg:block 2xl:hidden">
                  <p className={`text-xs font-bold uppercase tracking-wider ${muted}`}>Recently served</p>
                  <ul className="mt-1.5 space-y-1">
                    {servedRecent.map((o) => (
                      <li key={o.id} className={`flex items-center justify-between gap-2 text-sm ${muted}`}>
                        <span className="truncate">
                          #{o.number} · {o.tableCode ? tableLabel(o.tableCode) : o.customerName ?? "Pickup"}
                        </span>
                        <button onClick={() => void moveOrder(o, "ready")} className="shrink-0 text-xs font-semibold underline-offset-2 hover:underline">
                          Recall
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {handled.length > 0 && (
                <div className="mt-4 px-1">
                  <p className={`text-xs font-bold uppercase tracking-wider ${muted}`}>Recently handled</p>
                  <ul className="mt-1.5 space-y-1">
                    {handled.map((r) => (
                      <li key={r.id} className={`flex justify-between text-sm ${muted}`}>
                        <span>
                          {tableLabel(r.tableCode)} · {SERVICE_KIND_META[r.kind].label}
                        </span>
                        <span>✓ {formatCairoTime(r.completedAt!)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </aside>
        </main>
      )}
    </div>
  );
}

function BoardSkeleton({ dark }: { dark: boolean }) {
  return (
    <div className="grid flex-1 grid-cols-1 gap-4 p-5 lg:grid-cols-4" aria-label="Loading the board">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <div className={`h-5 w-32 rounded-full ${dark ? "bg-white/10" : "skeleton"}`} />
          <div className={`h-44 rounded-2xl ${dark ? "bg-white/5" : "skeleton"}`} />
          <div className={`h-32 rounded-2xl ${dark ? "bg-white/5" : "skeleton"}`} />
        </div>
      ))}
    </div>
  );
}
