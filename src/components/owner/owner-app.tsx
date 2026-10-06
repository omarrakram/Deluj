"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Activity, LayoutGrid, Settings, Sparkles, UtensilsCrossed } from "lucide-react";
import { DelujProvider, useDeluj, useNow } from "@/client/store";
import { useWakeLock } from "@/client/wake-lock";
import { Wordmark } from "@/components/brand/logo";
import { LinkDot } from "@/components/ui/link-status";
import { ToastProvider, useToast } from "@/components/ui/toast";
import {
  CHANNEL_LABEL,
  categoryPerformance,
  channelMix,
  computeKpis,
  ordersByHour,
  peakWindow,
  productStats,
  revenueTrend,
  tableStatuses,
  todaysOrders,
} from "@/domain/analytics";
import { computeInsights } from "@/domain/insights";
import { formatEGP, formatEGPDelta, formatNumber, formatPercent } from "@/domain/money";
import { formatCairoDate, formatHourLabel, greetingFor } from "@/domain/time";
import type { MenuItem, MenuItemPatch } from "@/domain/types";
import { ColumnChart, RankBars, SERIES, StackedShare } from "./charts";
import { FloorGrid } from "./floor";
import { InsightList } from "./insights";
import { KpiTile } from "./kpi";
import { LiveFeed } from "./live-feed";
import { AvailabilitySwitch, MenuControl } from "./menu-control";
import { SettingsPanel } from "./settings";

type Tab = "overview" | "menu" | "floor" | "settings";
const TABS: { id: Tab; label: string; icon: typeof Activity }[] = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "menu", label: "Menu", icon: UtensilsCrossed },
  { id: "floor", label: "Floor", icon: LayoutGrid },
  { id: "settings", label: "Settings", icon: Settings },
];

export function OwnerApp() {
  return (
    <DelujProvider>
      <ToastProvider>
        <CommandCenter />
      </ToastProvider>
    </DelujProvider>
  );
}

function CommandCenter() {
  const { data, ready, link, backend, client } = useDeluj();
  const now = useNow(15_000);
  const clock = useNow(1000);
  const toast = useToast();
  useWakeLock();
  const [tab, setTab] = useState<Tab>("overview");
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());
  const [flashItems, setFlashItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fromHash = window.location.hash.replace("#", "") as Tab;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deep link restore after mount
    if (TABS.some((t) => t.id === fromHash)) setTab(fromHash);
  }, []);
  const go = (t: Tab) => {
    setTab(t);
    history.replaceState(null, "", t === "overview" ? "/owner" : `/owner#${t}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Highlight brand-new feed entries and the products in a brand-new order.
  useEffect(
    () =>
      client.onChanges((changes) => {
        const ids = changes.filter((c) => c.table === "activity").map((c) => c.row.id as string);
        const items = changes.flatMap((c) => (c.table === "orders" && c.row.status === "new" ? c.row.lines.map((l) => l.itemId) : []));
        if (ids.length) {
          setFreshIds((s) => new Set([...s, ...ids]));
          setTimeout(() => setFreshIds((s) => new Set([...s].filter((x) => !ids.includes(x)))), 6000);
        }
        if (items.length) {
          setFlashItems(new Set(items));
          setTimeout(() => setFlashItems(new Set()), 4000);
        }
      }),
    [client],
  );

  const stats = useMemo(() => {
    if (!data || !now) return null;
    const today = todaysOrders(data.orders, now);
    const hourly = ordersByHour(data, now);
    return {
      kpis: computeKpis(data, now),
      trend: revenueTrend(data, now),
      hourly,
      peak: peakWindow(hourly),
      products: productStats(today),
      channels: channelMix(today),
      categories: categoryPerformance(today),
      tables: tableStatuses(data, now),
      insights: computeInsights(data, now, 6),
      today,
    };
  }, [data, now]);

  const patchMenu = async (item: MenuItem, patch: MenuItemPatch) => {
    const optimistic = { ...item, ...patch, updatedAt: new Date(client.now()).toISOString() };
    const result = await client.send({ type: "updateMenuItem", itemId: item.id, patch }, { menu: [optimistic] });
    if (!result.ok) toast({ tone: "error", title: "Couldn't update the menu", body: result.message });
    else if (patch.available !== undefined)
      toast({ tone: "success", title: patch.available ? `${item.name} is back on` : `${item.name} marked Sold Out`, body: "Live on every table now." });
  };

  const reset = async () => {
    const result = await client.send({ type: "reset" });
    if (result.ok) {
      toast({ tone: "success", title: "Demo reset", body: "Every screen is back to a fresh day." });
      return true;
    }
    toast({ tone: "error", title: "Couldn't reset", body: result.message });
    return false;
  };

  return (
    <div className="min-h-dvh bg-cream pb-24 lg:pb-10">
      {/* ── Top bar ── */}
      <header className="sticky top-0 z-30 border-b border-line bg-cream/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1440px] items-center gap-4 px-4 py-3 lg:px-8">
          <Link href="/" aria-label="Deluj home">
            <Wordmark className="h-7 text-orange" />
          </Link>
          <span className="hidden h-6 w-px bg-line sm:block" />
          <p className="hidden font-display text-[15px] font-bold sm:block">Command Center</p>
          <nav className="ml-6 hidden items-center gap-1 lg:flex" aria-label="Owner sections">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => go(t.id)}
                className={`flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition ${tab === t.id ? "bg-ink text-cream" : "text-ink-soft hover:bg-white"}`}
                aria-current={tab === t.id ? "page" : undefined}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </button>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden rounded-full bg-powder-soft px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-powder-deep sm:inline">Demo data</span>
            <LinkDot status={link} />
            <span className="grid h-9 w-9 place-items-center rounded-full bg-orange font-display text-sm font-extrabold text-white" title="Hosny">
              H
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-4 pt-5 lg:px-8 lg:pt-7">
        {tab === "overview" && (
          <>
            <section className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="min-h-5 text-sm font-semibold text-ink-soft">{clock ? formatCairoDate(clock) : "\u00a0"}</p>
                <h1 className="mt-0.5 font-display text-[2.1rem] font-extrabold leading-[1.05] tracking-tight sm:text-[2.75rem]" data-testid="greeting">
                  {clock ? greetingFor(clock) : "Welcome back"}, <span className="text-orange">Hosny</span>
                </h1>
                <p className="mt-1 text-[15px] text-ink-soft">Here&apos;s what&apos;s happening at Deluj today.</p>
              </div>
              <p className="text-xs font-semibold text-ink-mute sm:text-right">
                Illustrative demo data
                <br className="hidden sm:block" /> · live orders included
              </p>
            </section>

            {!ready || !stats ? (
              <OverviewSkeleton />
            ) : (
              <>
                {/* KPIs */}
                <section className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6" aria-label="Today at a glance">
                  <KpiTile testId="kpi-revenue" accent label="Today's revenue" value={stats.kpis.revenue} format={formatEGP} deltaFormat={(d) => formatEGPDelta(d)} compare={stats.kpis.revenueDelta} />
                  <KpiTile testId="kpi-orders" label="Orders" value={stats.kpis.orders} format={formatNumber} deltaFormat={(d) => `+${Math.round(d)}`} compare={stats.kpis.ordersDelta} />
                  <KpiTile testId="kpi-aov" label="Average order" value={stats.kpis.aov} format={formatEGP} compare={stats.kpis.aovDelta} />
                  <KpiTile testId="kpi-tables" label="Active tables" value={stats.kpis.activeTables} format={(n) => `${Math.round(n)} / 14`} deltaFormat={(d) => `+${Math.round(d)}`} sub="seated or ordering now" />
                  <KpiTile label="Direct orders" value={stats.kpis.directPct * 100} format={(n) => `${Math.round(n)}%`} sub={`${stats.kpis.directOrders} of ${stats.kpis.orders} · no marketplace`} />
                  <KpiTile
                    testId="kpi-customers"
                    label="New · returning"
                    value={stats.kpis.newCustomers}
                    format={(n) => `${Math.round(n)} · ${stats.kpis.returningCustomers}`}
                    deltaFormat={(d) => `+${Math.round(d)} new`}
                    sub={`${formatPercent(stats.kpis.returningPct)} returning guests`}
                  />
                </section>

                <div className="mt-5 grid gap-5 xl:grid-cols-12">
                  {/* Left: analytics */}
                  <div className="min-w-0 space-y-5 xl:col-span-8">
                    <div className="grid gap-5 lg:grid-cols-2 [&>*]:min-w-0">
                      <Card title="Revenue" sub="Last 14 days · today so far">
                        <ColumnChart
                          caption="Daily revenue, last 14 days"
                          labelEvery={2}
                          data={stats.trend.map((d) => ({
                            key: d.dateKey,
                            label: d.isToday ? "Today" : `${Number(d.dateKey.slice(8))}/${Number(d.dateKey.slice(5, 7))}`,
                            value: d.revenue,
                            highlight: d.isToday,
                            tooltip: (
                              <>
                                <b>{d.isToday ? "Today so far" : d.dateKey}</b>
                                <br />
                                {formatEGP(d.revenue)} · {d.orders} orders
                              </>
                            ),
                          }))}
                        />
                      </Card>
                      <Card title="Orders by hour" sub={`Peak ${formatHourLabel(stats.peak.start)}–${formatHourLabel(stats.peak.end)}`}>
                        <ColumnChart
                          caption="Orders per hour today versus a typical day"
                          labelEvery={2}
                          emphasise={false}
                          referenceLabel="Typical day (last 7 days)"
                          data={stats.hourly.map((h) => ({
                            key: String(h.hour),
                            label: formatHourLabel(h.hour),
                            value: h.orders,
                            reference: h.typical,
                            tooltip: (
                              <>
                                <b>{formatHourLabel(h.hour)}</b>
                                <br />
                                Today {h.orders} · typical {h.typical.toFixed(1)}
                              </>
                            ),
                          }))}
                        />
                      </Card>
                    </div>

                    <div className="grid gap-5 lg:grid-cols-2 [&>*]:min-w-0">
                      <Card title="Best sellers today" sub="By quantity">
                        <RankBars
                          caption="Best sellers today"
                          rows={stats.products.slice(0, 6).map((p) => ({
                            key: p.itemId,
                            label: p.name,
                            value: p.quantity,
                            display: `${p.quantity} · ${formatEGP(p.revenue)}`,
                            flash: flashItems.has(p.itemId),
                          }))}
                        />
                      </Card>
                      <Card title="Channel mix" sub="Dine-in vs pickup vs delivery">
                        <StackedShare
                          caption="Orders by channel today"
                          parts={stats.channels.map((c, i) => ({
                            key: c.channel,
                            label: CHANNEL_LABEL[c.channel],
                            value: c.orders,
                            color: [SERIES.orange, SERIES.blue, SERIES.gold][i],
                            display: `${c.orders} ${c.orders === 1 ? "order" : "orders"} · ${formatEGP(c.revenue)}`,
                          }))}
                        />
                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <MiniStat label="Direct orders" value={formatPercent(stats.kpis.directPct)} sub="QR, app & counter" />
                          <MiniStat label="Table QR orders" value={String(stats.today.filter((o) => o.via === "qr").length)} sub="ordered from the table" />
                        </div>
                      </Card>
                    </div>

                    <div className="grid gap-5 lg:grid-cols-2 [&>*]:min-w-0">
                      <Card title="Menu performance" sub="Revenue by section today">
                        <RankBars
                          caption="Revenue by menu section"
                          color={SERIES.blue}
                          rows={stats.categories
                            .filter((c) => c.revenue > 0)
                            .slice(0, 7)
                            .map((c) => ({ key: c.category, label: c.title, value: c.revenue, display: `${formatPercent(c.share)} · ${formatEGP(c.revenue)}` }))}
                        />
                      </Card>
                      <Card title="Guests" sub="Today">
                        <div className="grid grid-cols-2 gap-3">
                          <MiniStat label="Returning guests" value={formatPercent(stats.kpis.returningPct)} sub={`${stats.kpis.returningCustomers} orders`} />
                          <MiniStat label="New guests" value={String(stats.kpis.newCustomers)} sub="first visit" />
                        </div>
                        <StackedShare
                          caption="New versus returning guests"
                          parts={[
                            { key: "ret", label: "Returning", value: stats.kpis.returningCustomers, color: SERIES.orange, display: `${stats.kpis.returningCustomers}` },
                            { key: "new", label: "New", value: stats.kpis.newCustomers, color: SERIES.blue, display: `${stats.kpis.newCustomers}` },
                          ]}
                        />
                        <p className="mt-3 text-xs text-ink-mute">With guest accounts and loyalty, this becomes a full CRM: visits, favourites and win-back.</p>
                      </Card>
                    </div>

                    <Card title="Recent orders" sub="Live">
                      <RecentOrders data={stats.today} now={clock} />
                    </Card>
                  </div>

                  {/* Right: live */}
                  <div className="order-first min-w-0 space-y-5 xl:order-none xl:col-span-4">
                    <Card
                      title="Live at Deluj"
                      sub="Every order, request and change as it happens"
                      badge={
                        <span className="flex items-center gap-1.5 rounded-full bg-orange px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                          <span className="h-1.5 w-1.5 animate-blink rounded-full bg-white" /> Live
                        </span>
                      }
                    >
                      <div className="max-h-[22rem] overflow-y-auto pr-1 xl:max-h-[34rem]">
                        <LiveFeed events={data!.activity} now={clock} freshIds={freshIds} />
                      </div>
                    </Card>
                    <Card
                      title="Smart Insights"
                      sub="From today's live data"
                      badge={
                        <span className="flex items-center gap-1 rounded-full bg-powder-soft px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-powder-deep">
                          <Sparkles className="h-3 w-3" /> Smart insight
                        </span>
                      }
                    >
                      <InsightList insights={stats.insights} />
                    </Card>
                    <Card title="Floor" sub="14 tables · live">
                      <FloorGrid tables={stats.tables} now={clock} />
                    </Card>
                    <Card title="Menu availability" sub="Quick toggles">
                      <ul className="space-y-2">
                        {data!.menu
                          .filter((m) => m.featured || !m.available)
                          .slice(0, 7)
                          .map((m) => (
                            <li key={m.id} className="flex items-center justify-between gap-3">
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-bold">{m.name}</span>
                                <span className="text-xs text-ink-soft">{formatEGP(m.price)}</span>
                              </span>
                              <AvailabilitySwitch available={m.available} name={m.name} onChange={(v) => void patchMenu(m, { available: v })} />
                            </li>
                          ))}
                      </ul>
                      <button onClick={() => go("menu")} className="mt-3 text-sm font-bold text-orange-deep">
                        Manage the full menu →
                      </button>
                    </Card>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {tab === "menu" && data && <MenuControl menu={data.menu} onPatch={(i, p) => void patchMenu(i, p)} />}
        {tab === "floor" && stats && (
          <div>
            <h2 className="font-display text-2xl font-extrabold tracking-tight">Floor</h2>
            <p className="mb-4 text-sm text-ink-soft">Every table, live: browsing, ordered, preparing, ready, dining or asking for something.</p>
            <FloorGrid tables={stats.tables} now={clock} large />
          </div>
        )}
        {tab === "settings" && <SettingsPanel backend={backend} link={link} onReset={reset} />}
        {(tab === "menu" || tab === "floor") && !data && <OverviewSkeleton />}
      </main>

      {/* Mobile tab bar */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-cream/95 px-2 pt-2 backdrop-blur-md lg:hidden" aria-label="Owner sections">
        <div className="mx-auto grid max-w-md grid-cols-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => go(t.id)}
              className={`flex flex-col items-center gap-1 rounded-2xl py-1.5 text-[11px] font-bold ${tab === t.id ? "text-orange-deep" : "text-ink-mute"}`}
              aria-current={tab === t.id ? "page" : undefined}
            >
              <t.icon className="h-5 w-5" />
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

function Card({ title, sub, badge, children }: { title: string; sub?: string; badge?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-3xl bg-white p-5 shadow-soft">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-[17px] font-extrabold tracking-tight">{title}</h2>
          {sub && <p className="text-xs font-semibold text-ink-mute">{sub}</p>}
        </div>
        {badge}
      </div>
      {children}
    </section>
  );
}

function MiniStat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="mb-4 rounded-2xl bg-cream p-3">
      <p className="text-xs font-semibold text-ink-soft">{label}</p>
      <p className="mt-0.5 text-xl font-bold">{value}</p>
      <p className="text-[11px] text-ink-mute">{sub}</p>
    </div>
  );
}

function RecentOrders({ data, now }: { data: import("@/domain/types").Order[]; now: number }) {
  const recent = [...data].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 7);
  return (
    <div className="-mx-2 overflow-x-auto">
      <table className="w-full min-w-[34rem] text-sm">
        <thead>
          <tr className="text-left text-xs font-semibold text-ink-mute">
            <th className="px-2 pb-2 font-semibold">Order</th>
            <th className="px-2 pb-2 font-semibold">Where</th>
            <th className="px-2 pb-2 font-semibold">Items</th>
            <th className="px-2 pb-2 font-semibold">Status</th>
            <th className="px-2 pb-2 text-right font-semibold">Total</th>
          </tr>
        </thead>
        <tbody>
          {recent.map((o) => (
            <tr key={o.id} className={`border-t border-line transition-colors duration-1000 ${o.source === "live" && now - new Date(o.createdAt).getTime() < 30_000 ? "bg-orange-wash" : ""}`}>
              <td className="tabular px-2 py-2.5 font-bold">#{o.number}</td>
              <td className="px-2 py-2.5">{o.tableCode ? `Table ${o.tableCode.slice(-2)}` : `${CHANNEL_LABEL[o.channel]} · ${o.customerName ?? ""}`}</td>
              <td className="max-w-[16rem] truncate px-2 py-2.5 text-ink-soft">{o.lines.map((l) => `${l.quantity}× ${l.name}`).join(", ")}</td>
              <td className="px-2 py-2.5">
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                    o.status === "served" ? "bg-stone text-ink-soft" : o.status === "ready" ? "bg-mint-soft text-mint" : "bg-orange-wash text-orange-deep"
                  }`}
                >
                  {o.status}
                </span>
              </td>
              <td className="tabular px-2 py-2.5 text-right font-semibold">{formatEGP(o.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="mt-5 space-y-5" aria-label="Loading">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-28 rounded-3xl" />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-12">
        <div className="skeleton h-80 rounded-3xl xl:col-span-8" />
        <div className="skeleton h-80 rounded-3xl xl:col-span-4" />
      </div>
    </div>
  );
}
