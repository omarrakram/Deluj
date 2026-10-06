"use client";

// The live store every screen reads from. It owns one Backend, keeps a merged
// copy of demo state, applies realtime changes, and recovers from dropped
// connections (polling fallback, resync on focus/online, periodic safety sync).

import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { applyChanges } from "@/domain/engine";
import type { Change, Command, DemoState } from "@/domain/types";
import { createBackend, type Backend, type SendResult, type Snapshot } from "./backend";

export type LinkStatus = "connecting" | "live" | "reconnecting" | "offline" | "local";

export interface StoreSnapshot {
  ready: boolean;
  data: DemoState | null;
  link: LinkStatus;
  backend: Snapshot["backend"] | null;
  /** serverTime - clientTime, so kitchen timers agree across devices */
  clockOffset: number;
  lastSyncAt: number;
  loadFailed: boolean;
}

type Overlay = Pick<DemoState, "orders" | "menu" | "requests">;

export class DelujClient {
  private snap: StoreSnapshot = { ready: false, data: null, link: "connecting", backend: null, clockOffset: 0, lastSyncAt: 0, loadFailed: false };
  private listeners = new Set<() => void>();
  private backend: Backend;
  private overlay: Overlay = { orders: [], menu: [], requests: [] };
  private stopLive: () => void = () => {};
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private safetyTimer: ReturnType<typeof setInterval> | null = null;
  private stopped = false;
  private loading: Promise<void> | null = null;
  private liveStatus: "live" | "down" = "down";
  private changeListeners = new Set<(changes: Change[]) => void>();

  constructor(private tableCode?: string) {
    this.backend = createBackend(tableCode);
  }

  // ── external store plumbing ──
  subscribe = (l: () => void) => {
    this.listeners.add(l);
    return () => {
      this.listeners.delete(l);
    };
  };
  getSnapshot = () => this.snap;
  /** Raw stream of applied changes (used for chimes and arrival animations). */
  onChanges(l: (changes: Change[]) => void) {
    this.changeListeners.add(l);
    return () => {
      this.changeListeners.delete(l);
    };
  }
  private set(patch: Partial<StoreSnapshot>) {
    this.snap = { ...this.snap, ...patch };
    for (const l of this.listeners) l();
  }

  now() {
    return Date.now() + this.snap.clockOffset;
  }

  get mode() {
    return this.backend.mode;
  }

  // ── lifecycle ──
  start() {
    this.stopped = false;
    void this.load(true);
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - this.snap.lastSyncAt > 10_000) void this.load();
    };
    const onOnline = () => {
      this.set({ link: this.backend.mode === "local" ? "local" : "reconnecting" });
      void this.load();
    };
    const onOffline = () => {
      if (this.backend.mode !== "local") this.set({ link: "offline" });
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    // Safety net: even with a healthy socket, resync every 15 s while the screen is visible.
    this.safetyTimer = setInterval(() => {
      if (document.visibilityState === "visible") void this.load();
    }, 15_000);
    return () => {
      this.stopped = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      if (this.safetyTimer) clearInterval(this.safetyTimer);
      if (this.pollTimer) clearTimeout(this.pollTimer);
      this.stopLive();
    };
  }

  private async load(first = false, replace = false): Promise<void> {
    if (this.loading && !replace) return this.loading;
    const run = (async () => {
      try {
        const startedAt = Date.now();
        const snapshot = await this.backend.load();
        if (this.stopped) return;
        const rtt = Date.now() - startedAt;
        const clockOffset = snapshot.serverTime + rtt / 2 - Date.now();
        const data = !replace && this.snap.data && this.snap.data.meta.resetVersion === snapshot.state.meta.resetVersion
          ? mergeSnapshot(this.snap.data, snapshot.state)
          : snapshot.state;
        this.set({
          ready: true,
          data,
          backend: snapshot.backend,
          clockOffset: Math.abs(clockOffset) > 1500 ? clockOffset : 0,
          lastSyncAt: Date.now(),
          loadFailed: false,
          link: this.backend.mode === "local" ? "local" : this.liveStatus === "live" ? "live" : this.snap.link === "connecting" ? "connecting" : this.snap.link,
        });
        if (first) this.startLive(snapshot);
      } catch {
        if (this.stopped) return;
        this.set({ loadFailed: !this.snap.ready, link: navigator.onLine ? "reconnecting" : "offline" });
        if (first) {
          // Keep trying until the first snapshot arrives.
          this.pollTimer = setTimeout(() => void this.load(true), 2500);
        }
      }
    })();
    this.loading = run;
    try {
      await run;
    } finally {
      if (this.loading === run) this.loading = null;
    }
  }

  private startLive(snapshot: Snapshot) {
    this.stopLive();
    this.stopLive = this.backend.subscribe(snapshot, {
      onChanges: (changes) => this.applyRemote(changes),
      onReset: () => void this.load(false, true),
      onStatus: (status) => {
        const was = this.liveStatus;
        this.liveStatus = status;
        if (status === "live") {
          this.set({ link: this.backend.mode === "local" ? "local" : "live" });
          if (this.pollTimer) clearTimeout(this.pollTimer);
          this.pollTimer = null;
          // Anything missed while disconnected comes back with a resync — now and once more
          // shortly after, in case the server was still warming up its change stream.
          if (was === "down" && this.snap.ready) {
            void this.load();
            setTimeout(() => void this.load(), 2500);
          }
        } else {
          this.set({ link: navigator.onLine ? "reconnecting" : "offline" });
          this.schedulePoll();
        }
      },
    });
  }

  /** While the live socket is down, poll the snapshot so screens stay current. */
  private schedulePoll() {
    if (this.pollTimer || this.stopped) return;
    this.pollTimer = setTimeout(async () => {
      this.pollTimer = null;
      if (this.liveStatus === "live" || this.stopped) return;
      await this.load();
      this.schedulePoll();
    }, 4000);
  }

  private applyRemote(changes: Change[]) {
    if (!this.snap.data || !changes.length) return;
    this.set({ data: applyChanges(this.snap.data, changes), lastSyncAt: Date.now() });
    for (const l of this.changeListeners) l(changes);
  }

  // ── commands ──

  /**
   * Send a command. `optimistic` rows render immediately and are dropped when the
   * server answers (with its own rows) or fails (reverting the screen).
   * Idempotent commands (orders, requests) are retried on network failure.
   */
  async send(cmd: Command, optimistic: Partial<Overlay> = {}): Promise<SendResult> {
    this.pushOverlay(optimistic);
    const retriable = cmd.type === "placeOrder" || cmd.type === "createRequest" || cmd.type === "openTable";
    const attempts = retriable ? 3 : 2;
    let res = await this.backend.send(cmd);
    for (let i = 1; i < attempts && !res.result.ok && (res.result.code === "network" || res.result.code === "unavailable"); i++) {
      await new Promise((r) => setTimeout(r, 700 * i));
      res = await this.backend.send(cmd);
    }
    this.popOverlay(optimistic);
    if (res.reset) {
      await this.load(false, true);
    } else if (res.changes?.length) {
      this.applyRemote(res.changes);
    } else {
      this.set({});
    }
    if (!res.result.ok && (res.result.code === "network" || res.result.code === "unavailable")) {
      this.set({ link: navigator.onLine ? "reconnecting" : "offline" });
      this.schedulePoll();
    }
    return res.result;
  }

  private pushOverlay(o: Partial<Overlay>) {
    this.overlay = {
      orders: [...this.overlay.orders, ...(o.orders ?? [])],
      menu: [...this.overlay.menu, ...(o.menu ?? [])],
      requests: [...this.overlay.requests, ...(o.requests ?? [])],
    };
    this.set({});
  }

  private popOverlay(o: Partial<Overlay>) {
    this.overlay = {
      orders: this.overlay.orders.filter((x) => !o.orders?.includes(x)),
      menu: this.overlay.menu.filter((x) => !o.menu?.includes(x)),
      requests: this.overlay.requests.filter((x) => !o.requests?.includes(x)),
    };
  }

  /** State with optimistic rows layered on top. */
  view(data: DemoState | null): DemoState | null {
    if (!data) return null;
    const { orders, menu, requests } = this.overlay;
    if (!orders.length && !menu.length && !requests.length) return data;
    const over = <T,>(list: T[], extra: T[], key: (t: T) => string) => {
      const m = new Map(extra.map((x) => [key(x), x]));
      return list.map((x) => m.get(key(x)) ?? x);
    };
    return {
      ...data,
      orders: over(data.orders, orders, (o) => o.id),
      menu: over(data.menu, menu, (m) => m.id),
      requests: over(data.requests, requests, (r) => r.id),
    };
  }

  overlaySignature() {
    return this.overlay.orders.length + this.overlay.menu.length + this.overlay.requests.length;
  }

  /** Reload everything from the server (used after Reset Demo). */
  refresh() {
    return this.load(false, true);
  }
}

/** Merge a fresh snapshot into current state, keeping the newest version of every row. */
export function mergeSnapshot(current: DemoState, incoming: DemoState): DemoState {
  const changes: Change[] = [
    ...incoming.orders.map((row) => ({ table: "orders" as const, op: "upsert" as const, row })),
    ...incoming.requests.map((row) => ({ table: "requests" as const, op: "upsert" as const, row })),
    ...incoming.menu.map((row) => ({ table: "menu" as const, op: "upsert" as const, row })),
    ...incoming.activity.map((row) => ({ table: "activity" as const, op: "upsert" as const, row })),
    ...incoming.sessions.map((row) => ({ table: "sessions" as const, op: "upsert" as const, row })),
  ];
  const merged = applyChanges(current, changes);
  const meta = incoming.meta.lastOrderNumber >= current.meta.lastOrderNumber ? incoming.meta : current.meta;
  // Rows that vanished server-side (e.g. another day) are dropped by keeping only today's ids.
  const ids = new Set(incoming.orders.map((o) => o.id));
  return { ...merged, orders: merged.orders.filter((o) => ids.has(o.id) || o.updatedAt > incoming.meta.seededAt), meta };
}

// ── React bindings ───────────────────────────────────────────────────────────

const Ctx = createContext<DelujClient | null>(null);

export function DelujProvider({ tableCode, children }: { tableCode?: string; children: ReactNode }) {
  const [client] = useState(() => new DelujClient(tableCode));
  useEffect(() => client.start(), [client]);
  return <Ctx.Provider value={client}>{children}</Ctx.Provider>;
}

export function useDelujClient(): DelujClient {
  const c = useContext(Ctx);
  if (!c) throw new Error("DelujProvider missing");
  return c;
}

const SERVER_SNAPSHOT: StoreSnapshot = { ready: false, data: null, link: "connecting", backend: null, clockOffset: 0, lastSyncAt: 0, loadFailed: false };

export function useDeluj() {
  const client = useDelujClient();
  const snap = useSyncExternalStore(client.subscribe, client.getSnapshot, () => SERVER_SNAPSHOT);
  const sig = client.overlaySignature();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const data = useMemo(() => client.view(snap.data), [client, snap.data, sig]);
  return { ...snap, data, client };
}

/**
 * A ticking clock aligned with the server (for timers and "2 min ago").
 * Returns 0 during server render and hydration, so time-dependent text is only
 * ever produced on the device — a phone with a wrong clock can't cause a mismatch.
 */
export function useNow(intervalMs = 1000): number {
  const client = useContext(Ctx);
  const [now, setNow] = useState(0);
  useLayoutEffect(() => {
    const tick = () => setNow(client ? client.now() : Date.now());
    tick();
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [client, intervalMs]);
  return now;
}
