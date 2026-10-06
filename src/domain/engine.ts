// The command engine: one pure reducer that every backend runs.
//   state + command  ->  next state + result + the row changes to broadcast.
// The in-memory server and the offline (same-device) mode apply it directly;
// the Supabase repository uses the same validation and builders row by row.

import { priceCart } from "./cart";
import { CATEGORY_BY_ID, contextName } from "./menu";
import { STATUS_FLOW, STATUS_LABEL, canTransition, summarizeLines, withStatus } from "./orders";
import {
  SERVICE_KIND_META,
  canTransitionRequest,
  findOpenDuplicate,
  isRateLimited,
  isServiceKind,
  withRequestStatus,
} from "./requests";
import { buildSeedState } from "./seed";
import { parseTableCode, tableLabel } from "./tables";
import type {
  ActivityEvent,
  Change,
  Command,
  CommandResult,
  DemoState,
  DomainErrorCode,
  MenuItem,
  MenuItemPatch,
  Order,
  OrderStatus,
  PaymentMethod,
  ServiceRequest,
  ServiceStatus,
} from "./types";

export interface EngineContext {
  now: number;
  newId: () => string;
}

export interface EngineOutput {
  state: DemoState;
  result: CommandResult;
  changes: Change[];
  /** true when every screen must reload its snapshot (demo reset). */
  reset?: boolean;
}

export const MAX_ACTIVITY = 80;
export const TABLE_SESSION_COOLDOWN_MINUTES = 10;
const PAYMENT_METHODS: PaymentMethod[] = ["card", "apple_pay", "cash"];
const ORDER_STATUSES: OrderStatus[] = [...STATUS_FLOW, "cancelled"];
const SERVICE_STATUSES: ServiceStatus[] = ["open", "acknowledged", "done"];

export function fail(code: DomainErrorCode, message: string): CommandResult {
  return { ok: false, code, message };
}

function noChange(state: DemoState, result: CommandResult): EngineOutput {
  return { state, result, changes: [] };
}

function pushActivity(list: ActivityEvent[], event: ActivityEvent): ActivityEvent[] {
  return [event, ...list].slice(0, MAX_ACTIVITY);
}

// ── Builders shared with the Supabase repository ─────────────────────────────

export function orderPlacedActivity(order: Order, id: string, nowIso: string): ActivityEvent {
  return {
    id,
    kind: "order_placed",
    title: order.tableCode ? `${tableLabel(order.tableCode)} placed an order` : `New ${order.channel} order`,
    detail: summarizeLines(order.lines),
    amount: order.total,
    tableCode: order.tableCode ?? undefined,
    refId: order.id,
    createdAt: nowIso,
  };
}

export function orderStatusActivity(order: Order, from: OrderStatus, id: string, nowIso: string): ActivityEvent {
  const to = order.status;
  const back = STATUS_FLOW.indexOf(to) < STATUS_FLOW.indexOf(from);
  const n = `#${order.number}`;
  const title =
    to === "cancelled"
      ? `Order ${n} cancelled`
      : back
        ? `Order ${n} moved back to ${STATUS_LABEL[to]}`
        : to === "accepted"
          ? `Kitchen accepted order ${n}`
          : to === "preparing"
            ? `Order ${n} is being prepared`
            : to === "served"
              ? `Order ${n} served`
              : `Order ${n} moved to ${STATUS_LABEL[to]}`;
  return {
    id,
    kind: "order_status",
    title,
    detail: order.tableCode ? tableLabel(order.tableCode) : order.customerName ? `Pickup · ${order.customerName}` : undefined,
    tableCode: order.tableCode ?? undefined,
    refId: order.id,
    createdAt: nowIso,
  };
}

export function requestCreatedActivity(r: ServiceRequest, id: string, nowIso: string): ActivityEvent {
  return {
    id,
    kind: "request_created",
    title: `${tableLabel(r.tableCode)} ${SERVICE_KIND_META[r.kind].activity}`,
    tableCode: r.tableCode,
    refId: r.id,
    createdAt: nowIso,
  };
}

export function requestStatusActivity(r: ServiceRequest, id: string, nowIso: string): ActivityEvent {
  const what = SERVICE_KIND_META[r.kind].label.toLowerCase();
  return {
    id,
    kind: "request_status",
    title:
      r.status === "done"
        ? `${tableLabel(r.tableCode)} · ${what} handled`
        : `Team heading to ${tableLabel(r.tableCode)} · ${what}`,
    tableCode: r.tableCode,
    refId: r.id,
    createdAt: nowIso,
  };
}

export function menuActivity(before: MenuItem, after: MenuItem, id: string, nowIso: string): ActivityEvent | null {
  const name = contextName(after);
  let title: string | null = null;
  if (before.available !== after.available) {
    title = after.available ? `${name} is back on the menu` : `${name} marked Sold Out`;
  } else if (before.price !== after.price) {
    title = `${name} now EGP ${after.price}`;
  } else if (before.featured !== after.featured) {
    title = after.featured ? `${name} is now featured` : `${name} removed from featured`;
  } else if (before.category !== after.category) {
    title = `${name} moved to ${CATEGORY_BY_ID[after.category].title}`;
  }
  return title ? { id, kind: "menu_updated", title, refId: after.id, createdAt: nowIso } : null;
}

export function validateMenuPatch(patch: unknown): { ok: true; patch: MenuItemPatch } | { ok: false; message: string } {
  if (!patch || typeof patch !== "object") return { ok: false, message: "Nothing to update." };
  const p = patch as Record<string, unknown>;
  const out: MenuItemPatch = {};
  for (const key of Object.keys(p)) {
    if (!["available", "price", "featured", "category"].includes(key)) {
      return { ok: false, message: `${key} cannot be edited here.` };
    }
  }
  if (p.available !== undefined) {
    if (typeof p.available !== "boolean") return { ok: false, message: "Availability must be on or off." };
    out.available = p.available;
  }
  if (p.featured !== undefined) {
    if (typeof p.featured !== "boolean") return { ok: false, message: "Featured must be on or off." };
    out.featured = p.featured;
  }
  if (p.price !== undefined) {
    const price = Number(p.price);
    if (!Number.isInteger(price) || price < 1 || price > 5000) {
      return { ok: false, message: "Prices are whole EGP between 1 and 5,000." };
    }
    out.price = price;
  }
  if (p.category !== undefined) {
    if (typeof p.category !== "string" || !(p.category in CATEGORY_BY_ID)) {
      return { ok: false, message: "Unknown menu section." };
    }
    out.category = p.category as MenuItem["category"];
  }
  if (!Object.keys(out).length) return { ok: false, message: "Nothing to update." };
  return { ok: true, patch: out };
}

/** Validates and prices a guest order against the live menu. */
export function buildLiveOrder(
  menu: MenuItem[],
  cmd: Extract<Command, { type: "placeOrder" }>,
  ids: { id: string; number: number },
  nowIso: string,
): { ok: true; order: Order } | { ok: false; result: CommandResult } {
  const tableCode = parseTableCode(cmd.tableCode);
  if (!tableCode) return { ok: false, result: fail("invalid_table", "We couldn't find that table.") };
  if (!PAYMENT_METHODS.includes(cmd.paymentMethod)) {
    return { ok: false, result: fail("invalid_modifier", "Please choose how you'd like to pay.") };
  }
  if (!Array.isArray(cmd.lines)) return { ok: false, result: fail("empty_cart", "Your order is empty.") };
  const priced = priceCart(menu, cmd.lines, (i) => `${ids.id}-l${i + 1}`);
  if (!priced.ok) return { ok: false, result: fail(priced.code, priced.message) };
  return {
    ok: true,
    order: {
      id: ids.id,
      number: ids.number,
      tableCode,
      channel: "dine_in",
      via: "qr",
      status: "new",
      lines: priced.lines,
      subtotal: priced.subtotal,
      total: priced.total,
      paymentMethod: cmd.paymentMethod,
      paymentStatus: cmd.paymentMethod === "cash" ? "pay_at_table" : "paid",
      returning: false,
      note: cmd.note ? String(cmd.note).slice(0, 140) : undefined,
      source: "live",
      clientRequestId: String(cmd.clientRequestId).slice(0, 80),
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  };
}

// ── The reducer ──────────────────────────────────────────────────────────────

export function applyCommand(state: DemoState, cmd: Command, ctx: EngineContext): EngineOutput {
  const nowIso = new Date(ctx.now).toISOString();

  switch (cmd.type) {
    case "reset": {
      const next = buildSeedState(ctx.now, state.meta.resetVersion + 1);
      return { state: next, result: { ok: true }, changes: [{ table: "meta", op: "upsert", row: next.meta }], reset: true };
    }

    case "placeOrder": {
      const existing = cmd.clientRequestId
        ? state.orders.find((o) => o.clientRequestId && o.clientRequestId === cmd.clientRequestId)
        : undefined;
      if (existing) return noChange(state, { ok: true, order: existing, duplicate: true });
      if (!cmd.clientRequestId) return noChange(state, fail("invalid_modifier", "Missing request id."));
      const built = buildLiveOrder(state.menu, cmd, { id: ctx.newId(), number: state.meta.lastOrderNumber + 1 }, nowIso);
      if (!built.ok) return noChange(state, built.result);
      const order = built.order;
      const meta = { ...state.meta, lastOrderNumber: order.number };
      const event = orderPlacedActivity(order, ctx.newId(), nowIso);
      return {
        state: { ...state, orders: [...state.orders, order], activity: pushActivity(state.activity, event), meta },
        result: { ok: true, order },
        changes: [
          { table: "orders", op: "upsert", row: order },
          { table: "activity", op: "upsert", row: event },
          { table: "meta", op: "upsert", row: meta },
        ],
      };
    }

    case "setOrderStatus": {
      const order = state.orders.find((o) => o.id === cmd.orderId);
      if (!order) return noChange(state, fail("not_found", "That order is no longer on the board."));
      if (!ORDER_STATUSES.includes(cmd.status) || !canTransition(order.status, cmd.status)) {
        // Idempotent: asking for the status it already has is a no-op success.
        if (order.status === cmd.status) return noChange(state, { ok: true, order });
        return noChange(state, fail("invalid_transition", `Order #${order.number} is already ${STATUS_LABEL[order.status].toLowerCase()}.`));
      }
      const updated = withStatus(order, cmd.status, nowIso);
      const event = orderStatusActivity(updated, order.status, ctx.newId(), nowIso);
      return {
        state: {
          ...state,
          orders: state.orders.map((o) => (o.id === order.id ? updated : o)),
          activity: pushActivity(state.activity, event),
        },
        result: { ok: true, order: updated },
        changes: [
          { table: "orders", op: "upsert", row: updated },
          { table: "activity", op: "upsert", row: event },
        ],
      };
    }

    case "createRequest": {
      const tableCode = parseTableCode(cmd.tableCode);
      if (!tableCode) return noChange(state, fail("invalid_table", "We couldn't find that table."));
      if (!isServiceKind(cmd.kind)) return noChange(state, fail("not_found", "Unknown request."));
      const sameId = cmd.clientRequestId
        ? state.requests.find((r) => r.clientRequestId === cmd.clientRequestId)
        : undefined;
      if (sameId) return noChange(state, { ok: true, request: sameId, duplicate: true });
      const dup = findOpenDuplicate(state.requests, tableCode, cmd.kind);
      if (dup) return noChange(state, { ok: true, request: dup, duplicate: true });
      if (isRateLimited(state.requests, tableCode, ctx.now)) {
        return noChange(state, fail("rate_limited", "We've got your requests — someone will be right with you."));
      }
      const request: ServiceRequest = {
        id: ctx.newId(),
        tableCode,
        kind: cmd.kind,
        status: "open",
        source: "live",
        clientRequestId: cmd.clientRequestId ? String(cmd.clientRequestId).slice(0, 80) : undefined,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      const event = requestCreatedActivity(request, ctx.newId(), nowIso);
      return {
        state: { ...state, requests: [...state.requests, request], activity: pushActivity(state.activity, event) },
        result: { ok: true, request },
        changes: [
          { table: "requests", op: "upsert", row: request },
          { table: "activity", op: "upsert", row: event },
        ],
      };
    }

    case "setRequestStatus": {
      const r = state.requests.find((x) => x.id === cmd.requestId);
      if (!r) return noChange(state, fail("not_found", "That request was already handled."));
      if (!SERVICE_STATUSES.includes(cmd.status) || !canTransitionRequest(r.status, cmd.status)) {
        if (r.status === cmd.status) return noChange(state, { ok: true, request: r });
        return noChange(state, fail("invalid_transition", "That request was already handled."));
      }
      const updated = withRequestStatus(r, cmd.status, nowIso);
      const event = requestStatusActivity(updated, ctx.newId(), nowIso);
      return {
        state: {
          ...state,
          requests: state.requests.map((x) => (x.id === r.id ? updated : x)),
          activity: pushActivity(state.activity, event),
        },
        result: { ok: true, request: updated },
        changes: [
          { table: "requests", op: "upsert", row: updated },
          { table: "activity", op: "upsert", row: event },
        ],
      };
    }

    case "updateMenuItem": {
      const item = state.menu.find((m) => m.id === cmd.itemId);
      if (!item) return noChange(state, fail("not_found", "That item is not on the menu."));
      const v = validateMenuPatch(cmd.patch);
      if (!v.ok) return noChange(state, fail("invalid_patch", v.message));
      const updated: MenuItem = { ...item, ...v.patch, updatedAt: nowIso };
      const event = menuActivity(item, updated, ctx.newId(), nowIso);
      const changes: Change[] = [{ table: "menu", op: "upsert", row: updated }];
      if (event) changes.push({ table: "activity", op: "upsert", row: event });
      return {
        state: {
          ...state,
          menu: state.menu.map((m) => (m.id === item.id ? updated : m)),
          activity: event ? pushActivity(state.activity, event) : state.activity,
        },
        result: { ok: true, item: updated },
        changes,
      };
    }

    case "openTable": {
      const tableCode = parseTableCode(cmd.tableCode);
      if (!tableCode) return noChange(state, fail("invalid_table", "We couldn't find that table."));
      const existing = state.sessions.find((s) => s.tableCode === tableCode);
      if (existing && ctx.now - new Date(existing.openedAt).getTime() < TABLE_SESSION_COOLDOWN_MINUTES * 60_000) {
        return noChange(state, { ok: true });
      }
      const session = { tableCode, openedAt: nowIso };
      const event: ActivityEvent = {
        id: ctx.newId(),
        kind: "table_opened",
        title: `${tableLabel(tableCode)} opened the menu`,
        tableCode,
        createdAt: nowIso,
      };
      return {
        state: {
          ...state,
          sessions: [...state.sessions.filter((s) => s.tableCode !== tableCode), session],
          activity: pushActivity(state.activity, event),
        },
        result: { ok: true },
        changes: [
          { table: "sessions", op: "upsert", row: session },
          { table: "activity", op: "upsert", row: event },
        ],
      };
    }
  }
}

/** Apply broadcast row changes to a local copy of the state (used by every client). */
export function applyChanges(state: DemoState, changes: Change[]): DemoState {
  let next = state;
  for (const c of changes) {
    switch (c.table) {
      case "orders":
        next = { ...next, orders: upsertBy(next.orders, c.row, (o) => o.id) };
        break;
      case "requests":
        next = { ...next, requests: upsertBy(next.requests, c.row, (r) => r.id) };
        break;
      case "menu":
        next = { ...next, menu: upsertBy(next.menu, c.row, (m) => m.id) };
        break;
      case "activity":
        if (!next.activity.some((a) => a.id === c.row.id)) {
          next = {
            ...next,
            activity: [c.row, ...next.activity]
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .slice(0, MAX_ACTIVITY),
          };
        }
        break;
      case "sessions":
        next = { ...next, sessions: upsertBy(next.sessions, c.row, (s) => s.tableCode) };
        break;
      case "meta":
        next = { ...next, meta: c.row };
        break;
    }
  }
  return next;
}

/** Upsert keeping the newest version (rows carry updatedAt; older echoes are ignored). */
function upsertBy<T>(list: T[], row: T, key: (t: T) => string): T[] {
  const k = key(row);
  const idx = list.findIndex((x) => key(x) === k);
  if (idx === -1) return [...list, row];
  const cur = list[idx] as { updatedAt?: string };
  const inc = row as { updatedAt?: string };
  if (cur.updatedAt && inc.updatedAt && inc.updatedAt < cur.updatedAt) return list;
  const copy = list.slice();
  copy[idx] = row;
  return copy;
}
