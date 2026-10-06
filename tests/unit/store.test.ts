import { describe, expect, it } from "vitest";
import { applyCommand } from "@/domain/engine";
import { buildSeedState } from "@/domain/seed";
import { cairoWallToUtc } from "@/domain/time";
import { diffArrivals } from "@/client/store";

const NOW = cairoWallToUtc("2026-10-06", 11 * 60 + 30).getTime();
let counter = 0;
const ctx = { now: NOW, newId: () => `id-${++counter}` };

describe("catch-up after a missed realtime event", () => {
  it("reports only orders, requests and activity that are new or changed", () => {
    const before = buildSeedState(NOW);
    expect(diffArrivals(before, before)).toEqual([]);

    const placed = applyCommand(
      before,
      { type: "placeOrder", tableCode: "table-07", paymentMethod: "card", clientRequestId: "r1", lines: [{ itemId: "latte", quantity: 1, selections: {} }] },
      ctx,
    );
    const asked = applyCommand(placed.state, { type: "createRequest", tableCode: "table-07", kind: "bill", clientRequestId: "r2" }, ctx);
    expect(placed.result.ok && asked.result.ok).toBe(true);

    const arrivals = diffArrivals(before, asked.state);
    const tables = arrivals.map((c) => c.table).sort();
    expect(tables.filter((t) => t === "orders")).toHaveLength(1);
    expect(tables.filter((t) => t === "requests")).toHaveLength(1);
    expect(tables.filter((t) => t === "activity").length).toBeGreaterThanOrEqual(2);
    expect(arrivals.every((c) => c.op === "upsert")).toBe(true);

    // Nothing new the second time round: the kitchen never chimes twice.
    expect(diffArrivals(asked.state, asked.state)).toEqual([]);
  });
});
