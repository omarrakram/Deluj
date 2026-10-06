// Supabase repository. Validation and pricing reuse the shared domain engine;
// rows are written with the service-role key (server only). Supabase Realtime
// then streams each row change to every subscribed screen.
import "server-only";
import { env } from "./env";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { todaysOrders } from "@/domain/analytics";
import {
  buildLiveOrder,
  fail,
  menuActivity,
  orderPlacedActivity,
  orderStatusActivity,
  requestCreatedActivity,
  requestStatusActivity,
  TABLE_SESSION_COOLDOWN_MINUTES,
  validateMenuPatch,
} from "@/domain/engine";
import { newId } from "@/domain/ids";
import { canTransition, STATUS_LABEL, withStatus } from "@/domain/orders";
import {
  canTransitionRequest,
  findOpenDuplicate,
  isRateLimited,
  isServiceKind,
  RATE_LIMIT_WINDOW_MINUTES,
  withRequestStatus,
} from "@/domain/requests";
import { buildSeedState } from "@/domain/seed";
import { parseTableCode, tableLabel } from "@/domain/tables";
import { cairoDateKey, cairoWallToUtc } from "@/domain/time";
import type { ActivityEvent, Change, Command, DemoState, MenuItem, Order, ServiceRequest } from "@/domain/types";
import {
  activityFromRow,
  activityToRow,
  menuFromRow,
  menuToRow,
  metaFromRow,
  orderFromRow,
  orderToRow,
  requestFromRow,
  requestToRow,
  sessionFromRow,
  sessionToRow,
} from "@/lib/rows";
import type { ExecResult, Repo, Scope } from "./repo";

let client: SupabaseClient | null = null;

function db(): SupabaseClient {
  if (!client) {
    client = createClient(env.supabaseUrl()!, env.supabaseServiceKey()!, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { params: { eventsPerSecond: 0 } },
    });
  }
  return client;
}

class RepoError extends Error {}

function check<T>(res: { data: T; error: { message: string } | null }, what: string): T {
  if (res.error) throw new RepoError(`${what}: ${res.error.message}`);
  return res.data;
}

async function loadMenu(): Promise<MenuItem[]> {
  const rows = check(await db().from("menu_items").select("*").order("sort"), "menu");
  return (rows as Record<string, unknown>[]).map(menuFromRow);
}

async function loadMeta() {
  const row = check(await db().from("demo_meta").select("*").eq("id", 1).maybeSingle(), "meta");
  return row ? metaFromRow(row) : null;
}

async function insertActivity(event: ActivityEvent) {
  check(await db().from("activity").insert(activityToRow(event)), "activity");
}

function stateToRows(state: DemoState) {
  return {
    menu: state.menu.map(menuToRow),
    orders: state.orders.map(orderToRow),
    requests: state.requests.map(requestToRow),
    activity: state.activity.map(activityToRow),
    sessions: state.sessions.map(sessionToRow),
    meta: {
      business_date: state.meta.businessDate,
      seeded_at: state.meta.seededAt,
      last_order_number: state.meta.lastOrderNumber,
    },
  };
}

async function reset(expectedVersion: number | null): Promise<number> {
  const seed = buildSeedState(Date.now(), (expectedVersion ?? 0) + 1);
  const version = check(
    await db().rpc("reset_demo", { p_state: stateToRows(seed), p_expected_version: expectedVersion }),
    "reset",
  );
  return Number(version);
}

/** Roll to a fresh demo day when the stored day is not today (Cairo), or seed an empty database. */
async function ensureFreshDay() {
  const meta = await loadMeta();
  if (!meta || meta.businessDate !== cairoDateKey(Date.now())) {
    await reset(meta?.resetVersion ?? 0);
  }
}

function startOfCairoDay(now: number): string {
  return cairoWallToUtc(cairoDateKey(now), 0).toISOString();
}

export const supabaseRepo: Repo = {
  kind: "supabase",
  transport: "supabase",

  async snapshot(scope: Scope) {
    await ensureFreshDay();
    const now = Date.now();
    const since = startOfCairoDay(now);
    const ordersQ = db().from("orders").select("*").gte("created_at", since).order("created_at");
    const requestsQ = db().from("service_requests").select("*").gte("created_at", since).order("created_at");
    const sessionsQ = db().from("table_sessions").select("*");
    if (scope.tableCode) {
      ordersQ.eq("table_code", scope.tableCode);
      requestsQ.eq("table_code", scope.tableCode);
      sessionsQ.eq("table_code", scope.tableCode);
    }
    const [menu, meta, orders, requests, sessions, activity] = await Promise.all([
      loadMenu(),
      loadMeta(),
      ordersQ,
      requestsQ,
      sessionsQ,
      scope.tableCode
        ? Promise.resolve({ data: [], error: null })
        : db().from("activity").select("*").order("created_at", { ascending: false }).limit(80),
    ]);
    return {
      menu,
      meta: meta!,
      orders: todaysOrders((check(orders, "orders") as Record<string, unknown>[]).map(orderFromRow), now),
      requests: (check(requests, "requests") as Record<string, unknown>[]).map(requestFromRow),
      sessions: (check(sessions, "sessions") as Record<string, unknown>[]).map(sessionFromRow),
      activity: (check(activity, "activity") as Record<string, unknown>[]).map(activityFromRow),
    };
  },

  async execute(cmd: Command): Promise<ExecResult> {
    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    const changes: Change[] = [];

    switch (cmd.type) {
      case "reset": {
        const meta = await loadMeta();
        await reset(null);
        const next = await loadMeta();
        return { result: { ok: true }, changes: next ? [{ table: "meta", op: "upsert", row: next }] : [], reset: meta?.resetVersion !== next?.resetVersion };
      }

      case "placeOrder": {
        if (!cmd.clientRequestId) return { result: fail("invalid_modifier", "Missing request id."), changes };
        const dup = check(await db().from("orders").select("*").eq("client_request_id", String(cmd.clientRequestId).slice(0, 80)).maybeSingle(), "dup");
        if (dup) return { result: { ok: true, order: orderFromRow(dup), duplicate: true }, changes };
        const menu = await loadMenu();
        // Validate before consuming an order number.
        const dry = buildLiveOrder(menu, cmd, { id: "dry", number: 0 }, nowIso);
        if (!dry.ok) return { result: dry.result, changes };
        const number = Number(check(await db().rpc("next_order_number"), "number"));
        const built = buildLiveOrder(menu, cmd, { id: newId(), number }, nowIso);
        if (!built.ok) return { result: built.result, changes };
        const ins = await db().from("orders").insert(orderToRow(built.order)).select("*").single();
        if (ins.error) {
          // Unique client_request_id: a concurrent retry won the race — return that order.
          const again = check(await db().from("orders").select("*").eq("client_request_id", built.order.clientRequestId!).maybeSingle(), "dup");
          if (again) return { result: { ok: true, order: orderFromRow(again), duplicate: true }, changes };
          throw new RepoError(ins.error.message);
        }
        const order = orderFromRow(ins.data);
        const event = orderPlacedActivity(order, newId(), nowIso);
        await insertActivity(event);
        changes.push({ table: "orders", op: "upsert", row: order }, { table: "activity", op: "upsert", row: event });
        return { result: { ok: true, order }, changes };
      }

      case "setOrderStatus": {
        const row = check(await db().from("orders").select("*").eq("id", cmd.orderId).maybeSingle(), "order");
        if (!row) return { result: fail("not_found", "That order is no longer on the board."), changes };
        const order: Order = orderFromRow(row);
        if (order.status === cmd.status) return { result: { ok: true, order }, changes };
        if (!canTransition(order.status, cmd.status)) {
          return { result: fail("invalid_transition", `Order #${order.number} is already ${STATUS_LABEL[order.status].toLowerCase()}.`), changes };
        }
        const updated = withStatus(order, cmd.status, nowIso);
        const upd = check(
          await db().from("orders").update(orderToRow(updated)).eq("id", order.id).eq("status", order.status).select("*"),
          "update order",
        ) as Record<string, unknown>[];
        if (!upd.length) {
          // Someone else moved it first; report the current truth.
          const cur = check(await db().from("orders").select("*").eq("id", order.id).single(), "order");
          return { result: { ok: true, order: orderFromRow(cur) }, changes: [{ table: "orders", op: "upsert", row: orderFromRow(cur) }] };
        }
        const saved = orderFromRow(upd[0]);
        const event = orderStatusActivity(saved, order.status, newId(), nowIso);
        await insertActivity(event);
        changes.push({ table: "orders", op: "upsert", row: saved }, { table: "activity", op: "upsert", row: event });
        return { result: { ok: true, order: saved }, changes };
      }

      case "createRequest": {
        const tableCode = parseTableCode(cmd.tableCode);
        if (!tableCode) return { result: fail("invalid_table", "We couldn't find that table."), changes };
        if (!isServiceKind(cmd.kind)) return { result: fail("not_found", "Unknown request."), changes };
        const since = new Date(now - Math.max(RATE_LIMIT_WINDOW_MINUTES, 120) * 60_000).toISOString();
        const recent = (check(
          await db().from("service_requests").select("*").eq("table_code", tableCode).gte("created_at", since),
          "requests",
        ) as Record<string, unknown>[]).map(requestFromRow);
        const sameId = recent.find((r) => r.clientRequestId && r.clientRequestId === cmd.clientRequestId);
        if (sameId) return { result: { ok: true, request: sameId, duplicate: true }, changes };
        const dup = findOpenDuplicate(recent, tableCode, cmd.kind);
        if (dup) return { result: { ok: true, request: dup, duplicate: true }, changes };
        if (isRateLimited(recent, tableCode, now)) {
          return { result: fail("rate_limited", "We've got your requests — someone will be right with you."), changes };
        }
        const request: ServiceRequest = {
          id: newId(),
          tableCode,
          kind: cmd.kind,
          status: "open",
          source: "live",
          clientRequestId: cmd.clientRequestId ? String(cmd.clientRequestId).slice(0, 80) : undefined,
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        const ins = await db().from("service_requests").insert(requestToRow(request));
        if (ins.error) throw new RepoError(ins.error.message);
        const event = requestCreatedActivity(request, newId(), nowIso);
        await insertActivity(event);
        changes.push({ table: "requests", op: "upsert", row: request }, { table: "activity", op: "upsert", row: event });
        return { result: { ok: true, request }, changes };
      }

      case "setRequestStatus": {
        const row = check(await db().from("service_requests").select("*").eq("id", cmd.requestId).maybeSingle(), "request");
        if (!row) return { result: fail("not_found", "That request was already handled."), changes };
        const r = requestFromRow(row);
        if (r.status === cmd.status) return { result: { ok: true, request: r }, changes };
        if (!canTransitionRequest(r.status, cmd.status)) {
          return { result: fail("invalid_transition", "That request was already handled."), changes };
        }
        const updated = withRequestStatus(r, cmd.status, nowIso);
        check(await db().from("service_requests").update(requestToRow(updated)).eq("id", r.id), "update request");
        const event = requestStatusActivity(updated, newId(), nowIso);
        await insertActivity(event);
        changes.push({ table: "requests", op: "upsert", row: updated }, { table: "activity", op: "upsert", row: event });
        return { result: { ok: true, request: updated }, changes };
      }

      case "updateMenuItem": {
        const row = check(await db().from("menu_items").select("*").eq("id", cmd.itemId).maybeSingle(), "menu item");
        if (!row) return { result: fail("not_found", "That item is not on the menu."), changes };
        const v = validateMenuPatch(cmd.patch);
        if (!v.ok) return { result: fail("invalid_patch", v.message), changes };
        const item = menuFromRow(row);
        const updated: MenuItem = { ...item, ...v.patch, updatedAt: nowIso };
        check(await db().from("menu_items").update(menuToRow(updated)).eq("id", item.id), "update menu");
        const event = menuActivity(item, updated, newId(), nowIso);
        if (event) await insertActivity(event);
        changes.push({ table: "menu", op: "upsert", row: updated });
        if (event) changes.push({ table: "activity", op: "upsert", row: event });
        return { result: { ok: true, item: updated }, changes };
      }

      case "openTable": {
        const tableCode = parseTableCode(cmd.tableCode);
        if (!tableCode) return { result: fail("invalid_table", "We couldn't find that table."), changes };
        const existing = check(await db().from("table_sessions").select("*").eq("table_code", tableCode).maybeSingle(), "session");
        if (existing && now - new Date(existing.opened_at).getTime() < TABLE_SESSION_COOLDOWN_MINUTES * 60_000) {
          return { result: { ok: true }, changes };
        }
        const session = { tableCode, openedAt: nowIso };
        check(await db().from("table_sessions").upsert(sessionToRow(session)), "session");
        const event: ActivityEvent = { id: newId(), kind: "table_opened", title: `${tableLabel(tableCode)} opened the menu`, tableCode, createdAt: nowIso };
        await insertActivity(event);
        changes.push({ table: "sessions", op: "upsert", row: session }, { table: "activity", op: "upsert", row: event });
        return { result: { ok: true }, changes };
      }
    }
  },
};
