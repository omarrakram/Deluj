// Client transports. Every screen talks to one Backend:
//   • remote  — commands via /api/command, snapshot via /api/state, live changes
//               via Supabase Realtime (deployed) or Server-Sent Events (local server)
//   • local   — the engine runs in the browser; tabs on the same device sync over
//               BroadcastChannel. The no-network fallback for the meeting.

import { applyCommand } from "@/domain/engine";
import { newId } from "@/domain/ids";
import { buildSeedState } from "@/domain/seed";
import { cairoDateKey } from "@/domain/time";
import type { Change, Command, CommandResult, DemoState } from "@/domain/types";
import {
  activityFromRow,
  menuFromRow,
  metaFromRow,
  orderFromRow,
  requestFromRow,
  sessionFromRow,
} from "@/lib/rows";
import { changeVisibleTo } from "./visibility";

export type ClientErrorCode = "network" | "unauthorized" | "invalid" | "unavailable";
export type SendResult = CommandResult | { ok: false; code: ClientErrorCode; message: string };

export interface ExecResponse {
  result: SendResult;
  changes: Change[];
  reset?: boolean;
}

export interface Snapshot {
  state: DemoState;
  serverTime: number;
  transport: "supabase" | "sse" | "local";
  backend: "supabase" | "memory" | "local";
  supabase?: { url: string; anonKey: string };
}

export interface LiveHandlers {
  onChanges(changes: Change[]): void;
  onReset(): void;
  onStatus(status: "live" | "down"): void;
}

export interface Backend {
  mode: "remote" | "local";
  load(): Promise<Snapshot>;
  send(cmd: Command): Promise<ExecResponse>;
  /** Subscribe after the first snapshot so the transport is known. */
  subscribe(snapshot: Snapshot, handlers: LiveHandlers): () => void;
}

const NETWORK_MESSAGE = "We couldn't reach Deluj. Check your connection and try again.";

// ── Remote ───────────────────────────────────────────────────────────────────

export function remoteBackend(tableCode?: string): Backend {
  const qs = tableCode ? `?table=${encodeURIComponent(tableCode)}` : "";
  return {
    mode: "remote",
    async load() {
      const res = await fetch(`/api/state${qs}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`state ${res.status}`);
      return (await res.json()) as Snapshot;
    },
    async send(cmd) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12_000);
      try {
        const res = await fetch("/api/command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cmd),
          signal: controller.signal,
        });
        const body = (await res.json().catch(() => null)) as ExecResponse | null;
        if (body?.result) return { ...body, changes: body.changes ?? [] };
        return { result: { ok: false, code: res.status >= 500 ? "unavailable" : "invalid", message: NETWORK_MESSAGE }, changes: [] };
      } catch {
        return { result: { ok: false, code: "network", message: NETWORK_MESSAGE }, changes: [] };
      } finally {
        clearTimeout(timer);
      }
    },
    subscribe(snapshot, handlers) {
      if (snapshot.transport === "supabase" && snapshot.supabase) {
        return subscribeSupabase(snapshot, tableCode, handlers);
      }
      return subscribeSse(qs, handlers);
    },
  };
}

function subscribeSse(qs: string, h: LiveHandlers): () => void {
  if (typeof EventSource === "undefined") return () => {};
  const es = new EventSource(`/api/stream${qs}`);
  es.addEventListener("ready", () => h.onStatus("live"));
  es.addEventListener("changes", (e) => {
    try {
      h.onChanges(JSON.parse((e as MessageEvent).data) as Change[]);
    } catch {
      /* ignore malformed frame */
    }
  });
  es.addEventListener("reset", () => h.onReset());
  es.onerror = () => h.onStatus("down");
  return () => es.close();
}

function subscribeSupabase(snapshot: Snapshot, tableCode: string | undefined, h: LiveHandlers): () => void {
  let closed = false;
  let cleanup = () => {};
  let resetVersion = snapshot.state.meta.resetVersion;
  // Loaded lazily so guest phones on the local server never download it.
  import("@supabase/supabase-js").then(({ createClient }) => {
    if (closed) return;
    const sb = createClient(snapshot.supabase!.url, snapshot.supabase!.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { params: { eventsPerSecond: 50 } },
    });
    const filter = tableCode ? `table_code=eq.${tableCode}` : undefined;
    const channel = sb.channel(`deluj:${tableCode ?? "all"}:${Math.random().toString(36).slice(2, 8)}`);
    type Payload = { eventType: "INSERT" | "UPDATE" | "DELETE"; new: Record<string, unknown> };
    const on = (table: string, map: (row: Record<string, unknown>) => Change | null, withFilter = false) => {
      channel.on(
        "postgres_changes" as never,
        { event: "*", schema: "public", table, ...(withFilter && filter ? { filter } : {}) } as never,
        (payload: Payload) => {
          if (payload.eventType === "DELETE" || !payload.new) return;
          try {
            const change = map(payload.new);
            if (change) h.onChanges([change]);
          } catch {
            /* ignore unmappable row */
          }
        },
      );
    };
    on("orders", (r) => ({ table: "orders", op: "upsert", row: orderFromRow(r) }), true);
    on("service_requests", (r) => ({ table: "requests", op: "upsert", row: requestFromRow(r) }), true);
    on("menu_items", (r) => ({ table: "menu", op: "upsert", row: menuFromRow(r) }));
    on("demo_meta", (r) => {
      const meta = metaFromRow(r);
      if (meta.resetVersion !== resetVersion) {
        resetVersion = meta.resetVersion;
        h.onReset();
        return null;
      }
      return { table: "meta", op: "upsert", row: meta };
    });
    if (!tableCode) {
      on("activity", (r) => ({ table: "activity", op: "upsert", row: activityFromRow(r) }));
      on("table_sessions", (r) => ({ table: "sessions", op: "upsert", row: sessionFromRow(r) }));
    }
    // "SUBSCRIBED" only means the socket joined. Row changes flow once Realtime confirms
    // "Subscribed to PostgreSQL" — on a cold project that can take a few seconds, so we
    // only report live (which triggers a catch-up resync) after that confirmation.
    let fallback: ReturnType<typeof setTimeout> | null = null;
    channel.on("system" as never, {} as never, (payload: { extension?: string; status?: string }) => {
      if (payload?.extension !== "postgres_changes") return;
      if (fallback) clearTimeout(fallback);
      h.onStatus(payload.status === "ok" ? "live" : "down");
    });
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        if (fallback) clearTimeout(fallback);
        fallback = setTimeout(() => h.onStatus("live"), 5000);
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        if (fallback) clearTimeout(fallback);
        h.onStatus("down");
      }
    });
    cleanup = () => {
      if (fallback) clearTimeout(fallback);
      sb.removeChannel(channel);
      sb.realtime.disconnect();
    };
  }).catch(() => h.onStatus("down"));
  return () => {
    closed = true;
    cleanup();
  };
}

// ── Local (same device, no network) ─────────────────────────────────────────

const LOCAL_KEY = "deluj:local-state:v1";
const CHANNEL = "deluj-local";

function readLocal(): DemoState {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) {
      const s = JSON.parse(raw) as DemoState;
      if (s.meta.businessDate === cairoDateKey(Date.now())) return s;
    }
  } catch {
    /* fall through to a fresh day */
  }
  const fresh = buildSeedState(Date.now());
  writeLocal(fresh);
  return fresh;
}

function writeLocal(state: DemoState) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(state));
  } catch {
    /* storage full or blocked: the tab keeps working in memory */
  }
}

export function localBackend(tableCode?: string): Backend {
  const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CHANNEL) : null;
  const scoped = (s: DemoState): DemoState =>
    tableCode
      ? { ...s, orders: s.orders.filter((o) => o.tableCode === tableCode), requests: s.requests.filter((r) => r.tableCode === tableCode), activity: [], sessions: [] }
      : s;
  return {
    mode: "local",
    async load() {
      return { state: scoped(readLocal()), serverTime: Date.now(), transport: "local", backend: "local" };
    },
    async send(cmd) {
      const out = applyCommand(readLocal(), cmd, { now: Date.now(), newId });
      writeLocal(out.state);
      if (out.changes.length) channel?.postMessage({ changes: out.changes, reset: out.reset });
      return { result: out.result, changes: out.changes.filter((c) => changeVisibleTo(c, tableCode)), reset: out.reset };
    },
    subscribe(_snapshot, h) {
      h.onStatus("live");
      if (!channel) return () => {};
      const listener = (e: MessageEvent<{ changes: Change[]; reset?: boolean }>) => {
        if (e.data.reset) return h.onReset();
        const visible = e.data.changes.filter((c) => changeVisibleTo(c, tableCode));
        if (visible.length) h.onChanges(visible);
      };
      channel.addEventListener("message", listener);
      return () => channel.removeEventListener("message", listener);
    },
  };
}

// ── Mode selection ───────────────────────────────────────────────────────────

const OFFLINE_FLAG = "deluj:offline-mode";

/** `?offline=1` switches this browser to same-device mode until `?offline=0`. */
export function isOfflineMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const p = new URLSearchParams(window.location.search).get("offline");
    if (p === "1") localStorage.setItem(OFFLINE_FLAG, "1");
    if (p === "0") localStorage.removeItem(OFFLINE_FLAG);
    return localStorage.getItem(OFFLINE_FLAG) === "1";
  } catch {
    return false;
  }
}

export function setOfflineMode(on: boolean) {
  try {
    if (on) localStorage.setItem(OFFLINE_FLAG, "1");
    else localStorage.removeItem(OFFLINE_FLAG);
  } catch {
    /* ignore */
  }
}

export function createBackend(tableCode?: string): Backend {
  return isOfflineMode() ? localBackend(tableCode) : remoteBackend(tableCode);
}
