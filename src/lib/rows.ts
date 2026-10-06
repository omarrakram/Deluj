// Mapping between domain objects (camelCase) and Postgres rows (snake_case).
// Shared by the server repository and the browser's realtime handler so both
// sides read rows identically.

import type {
  ActivityEvent,
  DemoMeta,
  MenuItem,
  Order,
  ServiceRequest,
  TableSession,
} from "@/domain/types";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const opt = <T>(v: T | null | undefined): T | undefined => (v === null || v === undefined ? undefined : v);
const iso = (v: string | null | undefined): string | undefined => (v ? new Date(v).toISOString() : undefined);

export function menuFromRow(r: Row): MenuItem {
  return {
    id: r.id,
    name: r.name,
    description: opt(r.description),
    price: Number(r.price),
    category: r.category,
    available: Boolean(r.available),
    featured: Boolean(r.featured),
    sort: Number(r.sort),
    tags: r.tags ?? [],
    modifierGroupIds: r.modifier_group_ids ?? [],
    art: r.art,
    updatedAt: iso(r.updated_at)!,
  };
}

export function menuToRow(m: MenuItem): Row {
  return {
    id: m.id,
    name: m.name,
    description: m.description ?? null,
    price: m.price,
    category: m.category,
    available: m.available,
    featured: m.featured,
    sort: m.sort,
    tags: m.tags,
    modifier_group_ids: m.modifierGroupIds,
    art: m.art,
    updated_at: m.updatedAt,
  };
}

export function orderFromRow(r: Row): Order {
  return {
    id: r.id,
    number: Number(r.number),
    tableCode: r.table_code ?? null,
    channel: r.channel,
    via: r.via,
    status: r.status,
    lines: r.lines ?? [],
    subtotal: Number(r.subtotal),
    total: Number(r.total),
    paymentMethod: r.payment_method,
    paymentStatus: r.payment_status,
    customerName: opt(r.customer_name),
    returning: Boolean(r.is_returning),
    note: opt(r.note),
    source: r.source,
    clientRequestId: opt(r.client_request_id),
    createdAt: iso(r.created_at)!,
    acceptedAt: iso(r.accepted_at),
    preparingAt: iso(r.preparing_at),
    readyAt: iso(r.ready_at),
    servedAt: iso(r.served_at),
    updatedAt: iso(r.updated_at)!,
  };
}

export function orderToRow(o: Order): Row {
  return {
    id: o.id,
    number: o.number,
    table_code: o.tableCode,
    channel: o.channel,
    via: o.via,
    status: o.status,
    lines: o.lines,
    subtotal: o.subtotal,
    total: o.total,
    payment_method: o.paymentMethod,
    payment_status: o.paymentStatus,
    customer_name: o.customerName ?? null,
    is_returning: o.returning,
    note: o.note ?? null,
    source: o.source,
    client_request_id: o.clientRequestId ?? null,
    created_at: o.createdAt,
    accepted_at: o.acceptedAt ?? null,
    preparing_at: o.preparingAt ?? null,
    ready_at: o.readyAt ?? null,
    served_at: o.servedAt ?? null,
    updated_at: o.updatedAt,
  };
}

export function requestFromRow(r: Row): ServiceRequest {
  return {
    id: r.id,
    tableCode: r.table_code,
    kind: r.kind,
    status: r.status,
    source: r.source,
    clientRequestId: opt(r.client_request_id),
    createdAt: iso(r.created_at)!,
    acknowledgedAt: iso(r.acknowledged_at),
    completedAt: iso(r.completed_at),
    updatedAt: iso(r.updated_at)!,
  };
}

export function requestToRow(r: ServiceRequest): Row {
  return {
    id: r.id,
    table_code: r.tableCode,
    kind: r.kind,
    status: r.status,
    source: r.source,
    client_request_id: r.clientRequestId ?? null,
    created_at: r.createdAt,
    acknowledged_at: r.acknowledgedAt ?? null,
    completed_at: r.completedAt ?? null,
    updated_at: r.updatedAt,
  };
}

export function activityFromRow(r: Row): ActivityEvent {
  return {
    id: r.id,
    kind: r.kind,
    title: r.title,
    detail: opt(r.detail),
    amount: r.amount === null || r.amount === undefined ? undefined : Number(r.amount),
    tableCode: opt(r.table_code),
    refId: opt(r.ref_id),
    createdAt: iso(r.created_at)!,
  };
}

export function activityToRow(a: ActivityEvent): Row {
  return {
    id: a.id,
    kind: a.kind,
    title: a.title,
    detail: a.detail ?? null,
    amount: a.amount ?? null,
    table_code: a.tableCode ?? null,
    ref_id: a.refId ?? null,
    created_at: a.createdAt,
  };
}

export function sessionFromRow(r: Row): TableSession {
  return { tableCode: r.table_code, openedAt: iso(r.opened_at)! };
}

export function sessionToRow(s: TableSession): Row {
  return { table_code: s.tableCode, opened_at: s.openedAt };
}

export function metaFromRow(r: Row): DemoMeta {
  return {
    resetVersion: Number(r.reset_version),
    businessDate: r.business_date,
    seededAt: iso(r.seeded_at)!,
    lastOrderNumber: Number(r.last_order_number),
  };
}
