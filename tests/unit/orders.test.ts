import { describe, expect, it } from "vitest";
import { canTransition, customerStage, nextStatus, urgency, withStatus } from "@/domain/orders";
import { canTransitionRequest, findOpenDuplicate } from "@/domain/requests";
import type { Order, ServiceRequest } from "@/domain/types";

const base: Order = {
  id: "o1", number: 1048, tableCode: "table-07", channel: "dine_in", via: "qr", status: "new",
  lines: [{ lineId: "l1", itemId: "iced-matcha", name: "Iced Matcha", category: "matcha", quantity: 1, unitPrice: 160, modifiers: [], lineTotal: 160 }],
  subtotal: 160, total: 160, paymentMethod: "card", paymentStatus: "paid", returning: false, source: "live",
  createdAt: "2026-10-06T10:00:00.000Z", updatedAt: "2026-10-06T10:00:00.000Z",
};

describe("order status machine", () => {
  it("walks the kitchen flow Accept → Preparing → Ready → Served", () => {
    expect(nextStatus("new")).toBe("accepted");
    expect(nextStatus("accepted")).toBe("preparing");
    expect(nextStatus("preparing")).toBe("ready");
    expect(nextStatus("ready")).toBe("served");
    expect(nextStatus("served")).toBeNull();
  });

  it("allows skipping forward, one-step recall, and early cancel only", () => {
    expect(canTransition("new", "ready")).toBe(true);
    expect(canTransition("ready", "preparing")).toBe(true);
    expect(canTransition("ready", "new")).toBe(false);
    expect(canTransition("new", "cancelled")).toBe(true);
    expect(canTransition("preparing", "cancelled")).toBe(false);
    expect(canTransition("served", "served")).toBe(false);
    expect(canTransition("cancelled", "new")).toBe(false);
  });

  it("stamps and un-stamps timestamps", () => {
    const ready = withStatus(base, "ready", "2026-10-06T10:05:00.000Z");
    expect(ready.acceptedAt && ready.preparingAt && ready.readyAt).toBeTruthy();
    const recalled = withStatus(ready, "preparing", "2026-10-06T10:06:00.000Z");
    expect(recalled.readyAt).toBeUndefined();
    expect(recalled.preparingAt).toBe(ready.preparingAt);
  });

  it("maps statuses onto the guest's progress, with an automatic Almost ready", () => {
    const t0 = new Date("2026-10-06T10:00:00.000Z").getTime();
    expect(customerStage(base, t0)).toBe("sent");
    expect(customerStage({ ...base, status: "accepted" }, t0)).toBe("confirmed");
    const prep = { ...base, status: "preparing" as const, preparingAt: "2026-10-06T10:00:00.000Z" };
    expect(customerStage(prep, t0 + 10_000)).toBe("preparing");
    expect(customerStage(prep, t0 + 5 * 60_000)).toBe("almost");
    expect(customerStage({ ...base, status: "ready" }, t0)).toBe("ready");
    expect(customerStage({ ...base, status: "served" }, t0)).toBe("served");
  });

  it("flags slow orders", () => {
    const t0 = new Date(base.createdAt).getTime();
    expect(urgency(base, t0 + 60_000)).toBe("fresh");
    expect(urgency(base, t0 + 9 * 60_000)).toBe("warn");
    expect(urgency(base, t0 + 13 * 60_000)).toBe("late");
    expect(urgency({ ...base, status: "served" }, t0 + 60 * 60_000)).toBe("fresh");
  });
});

describe("service requests", () => {
  const r: ServiceRequest = { id: "r1", tableCode: "table-07", kind: "bill", status: "open", source: "live", createdAt: "2026-10-06T10:00:00.000Z", updatedAt: "2026-10-06T10:00:00.000Z" };
  it("finds open duplicates so guests cannot spam the team", () => {
    expect(findOpenDuplicate([r], "table-07", "bill")).toBe(r);
    expect(findOpenDuplicate([{ ...r, status: "acknowledged" }], "table-07", "bill")).toBeTruthy();
    expect(findOpenDuplicate([{ ...r, status: "done" }], "table-07", "bill")).toBeUndefined();
    expect(findOpenDuplicate([r], "table-04", "bill")).toBeUndefined();
  });
  it("moves open → acknowledged → done and never back", () => {
    expect(canTransitionRequest("open", "acknowledged")).toBe(true);
    expect(canTransitionRequest("open", "done")).toBe(true);
    expect(canTransitionRequest("acknowledged", "done")).toBe(true);
    expect(canTransitionRequest("done", "open")).toBe(false);
    expect(canTransitionRequest("acknowledged", "open")).toBe(false);
  });
});
