import { describe, expect, it } from "vitest";
import { applyChanges, applyCommand } from "@/domain/engine";
import { buildSeedState } from "@/domain/seed";
import { computeKpis, tableStatuses } from "@/domain/analytics";
import { computeInsights } from "@/domain/insights";
import { cairoWallToUtc } from "@/domain/time";
import type { Command, DemoState } from "@/domain/types";

const NOW = cairoWallToUtc("2026-10-06", 11 * 60 + 30).getTime();
let counter = 0;
const ctx = (now = NOW) => ({ now, newId: () => `id-${++counter}` });

function run(state: DemoState, cmd: Command, now = NOW) {
  return applyCommand(state, cmd, ctx(now));
}

const order: Command = {
  type: "placeOrder",
  tableCode: "table-07",
  paymentMethod: "card",
  clientRequestId: "req-1",
  lines: [
    { itemId: "iced-matcha", quantity: 1, selections: { milk: ["oat"], ice: ["less"] } },
    { itemId: "maple-syrup-pancakes", quantity: 1, selections: {} },
  ],
};

describe("seeded demo state", () => {
  it("is deterministic for history and leaves NEW empty for the guest", () => {
    const a = buildSeedState(NOW);
    const b = buildSeedState(NOW);
    expect(a.orders.map((o) => o.total)).toEqual(b.orders.map((o) => o.total));
    expect(a.orders.length).toBeGreaterThan(14);
    expect(a.orders.some((o) => o.status === "new")).toBe(false);
    expect(a.requests).toHaveLength(2);
    expect(a.menu.every((m) => m.available)).toBe(true);
  });
});

describe("the full Table 07 demo sequence", () => {
  it("updates kitchen, owner metrics and the live feed", () => {
    let s = buildSeedState(NOW);
    const before = computeKpis(s, NOW);

    // 1. Guest opens the table
    let out = run(s, { type: "openTable", tableCode: "table-07" });
    s = out.state;
    expect(tableStatuses(s, NOW).find((t) => t.tableCode === "table-07")?.state).toBe("browsing");

    // 2. Guest places the order
    out = run(s, order);
    expect(out.result.ok).toBe(true);
    const placed = out.result.ok ? out.result.order! : null;
    expect(placed?.total).toBe(160 + 45 + 280);
    expect(placed?.number).toBe(s.meta.lastOrderNumber + 1);
    s = out.state;
    expect(s.activity[0].title).toBe("Table 07 placed an order");
    expect(s.activity[0].amount).toBe(485);

    const after = computeKpis(s, NOW);
    expect(after.orders).toBe(before.orders + 1);
    expect(after.revenue).toBe(before.revenue + 485);
    expect(after.newCustomers).toBe(before.newCustomers + 1);
    expect(tableStatuses(s, NOW).find((t) => t.tableCode === "table-07")?.state).toBe("ordered");
    expect(computeInsights(s, NOW)[0].tone).toBe("live");

    // 3. Duplicate submission returns the same order
    out = run(s, order);
    expect(out.result.ok && out.result.duplicate).toBe(true);
    expect(out.changes).toHaveLength(0);

    // 4. Kitchen walks the order
    for (const status of ["accepted", "preparing", "ready"] as const) {
      out = run(s, { type: "setOrderStatus", orderId: placed!.id, status });
      expect(out.result.ok).toBe(true);
      s = out.state;
    }
    expect(s.orders.find((o) => o.id === placed!.id)?.status).toBe("ready");
    expect(s.activity[0].title).toBe(`Order #${placed!.number} moved to Ready`);

    // 5. Guest requests the bill — twice; only one request reaches the team
    out = run(s, { type: "createRequest", tableCode: "table-07", kind: "bill", clientRequestId: "b1" });
    s = out.state;
    const bill = out.result.ok ? out.result.request! : null;
    out = run(s, { type: "createRequest", tableCode: "table-07", kind: "bill", clientRequestId: "b2" });
    expect(out.result.ok && out.result.duplicate).toBe(true);
    expect(s.requests.filter((r) => r.tableCode === "table-07")).toHaveLength(1);
    expect(tableStatuses(s, NOW).find((t) => t.tableCode === "table-07")?.detail).toBe("Requesting bill");

    // 6. Staff completes the request and serves the order
    s = run(s, { type: "setRequestStatus", requestId: bill!.id, status: "done" }).state;
    s = run(s, { type: "setOrderStatus", orderId: placed!.id, status: "served" }).state;
    expect(tableStatuses(s, NOW).find((t) => t.tableCode === "table-07")?.state).toBe("dining");

    // 7. Owner marks Iced Matcha sold out → ordering it is refused
    out = run(s, { type: "updateMenuItem", itemId: "iced-matcha", patch: { available: false } });
    s = out.state;
    expect(s.activity[0].title).toBe("Iced Matcha marked Sold Out");
    out = run(s, { ...order, clientRequestId: "req-2" });
    expect(out.result).toMatchObject({ ok: false, code: "sold_out" });

    // 8. Reset restores everything
    out = run(s, { type: "reset" });
    expect(out.reset).toBe(true);
    expect(out.state.menu.every((m) => m.available)).toBe(true);
    expect(out.state.orders.some((o) => o.source === "live")).toBe(false);
    expect(out.state.meta.resetVersion).toBe(s.meta.resetVersion + 1);
  });

  it("refuses invalid transitions, tables and patches", () => {
    const s = buildSeedState(NOW);
    const served = s.orders.find((o) => o.status === "served")!;
    expect(run(s, { type: "setOrderStatus", orderId: served.id, status: "new" }).result.ok).toBe(false);
    expect(run(s, { ...order, tableCode: "table-99" }).result).toMatchObject({ ok: false, code: "invalid_table" });
    expect(run(s, { type: "updateMenuItem", itemId: "latte", patch: { price: -5 } }).result.ok).toBe(false);
    expect(run(s, { type: "updateMenuItem", itemId: "latte", patch: { name: "Free" } as never }).result.ok).toBe(false);
  });

  it("applies broadcast changes idempotently and ignores stale echoes", () => {
    const s = buildSeedState(NOW);
    const out = run(s, order);
    const once = applyChanges(s, out.changes);
    const twice = applyChanges(once, out.changes);
    expect(twice.orders.length).toBe(once.orders.length);
    expect(twice.activity.length).toBe(once.activity.length);
    const placed = out.result.ok ? out.result.order! : null;
    const newer = { ...placed!, status: "preparing" as const, updatedAt: new Date(NOW + 1000).toISOString() };
    const withNewer = applyChanges(once, [{ table: "orders", op: "upsert", row: newer }]);
    const stale = applyChanges(withNewer, [{ table: "orders", op: "upsert", row: placed! }]);
    expect(stale.orders.find((o) => o.id === placed!.id)?.status).toBe("preparing");
  });
});
