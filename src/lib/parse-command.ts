// Shape-checks untrusted JSON before it reaches the engine. The engine then
// applies business rules (prices, availability, transitions, rate limits).

import type { CartLineInput, Command } from "@/domain/types";

const str = (v: unknown, max = 80): v is string => typeof v === "string" && v.length > 0 && v.length <= max;

function parseLines(v: unknown): CartLineInput[] | null {
  if (!Array.isArray(v) || v.length > 30) return null;
  const out: CartLineInput[] = [];
  for (const raw of v) {
    if (!raw || typeof raw !== "object") return null;
    const l = raw as Record<string, unknown>;
    if (!str(l.itemId)) return null;
    const selections: Record<string, string[]> = {};
    if (l.selections !== undefined) {
      if (!l.selections || typeof l.selections !== "object" || Array.isArray(l.selections)) return null;
      for (const [k, vals] of Object.entries(l.selections as Record<string, unknown>)) {
        if (!str(k, 40) || !Array.isArray(vals) || vals.length > 6 || !vals.every((x) => str(x, 40))) return null;
        selections[k] = vals as string[];
      }
    }
    const note = l.note === undefined || l.note === null ? undefined : typeof l.note === "string" ? l.note.slice(0, 300) : null;
    if (note === null) return null;
    out.push({ itemId: l.itemId, quantity: Number(l.quantity), selections, note });
  }
  return out;
}

export function parseCommand(body: unknown): Command | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  switch (b.type) {
    case "placeOrder": {
      const lines = parseLines(b.lines);
      if (!lines || !str(b.tableCode, 20) || !str(b.clientRequestId) || !str(b.paymentMethod, 20)) return null;
      return {
        type: "placeOrder",
        tableCode: b.tableCode,
        lines,
        paymentMethod: b.paymentMethod as Command extends { paymentMethod: infer P } ? P : never,
        clientRequestId: b.clientRequestId,
        note: typeof b.note === "string" ? b.note.slice(0, 140) : undefined,
      };
    }
    case "setOrderStatus":
      if (!str(b.orderId) || !str(b.status, 20)) return null;
      return { type: "setOrderStatus", orderId: b.orderId, status: b.status as never };
    case "createRequest":
      if (!str(b.tableCode, 20) || !str(b.kind, 20) || !str(b.clientRequestId)) return null;
      return { type: "createRequest", tableCode: b.tableCode, kind: b.kind as never, clientRequestId: b.clientRequestId };
    case "setRequestStatus":
      if (!str(b.requestId) || !str(b.status, 20)) return null;
      return { type: "setRequestStatus", requestId: b.requestId, status: b.status as never };
    case "updateMenuItem":
      if (!str(b.itemId) || !b.patch || typeof b.patch !== "object") return null;
      return { type: "updateMenuItem", itemId: b.itemId, patch: b.patch as never };
    case "openTable":
      if (!str(b.tableCode, 20)) return null;
      return { type: "openTable", tableCode: b.tableCode };
    case "reset":
      return { type: "reset" };
    default:
      return null;
  }
}
