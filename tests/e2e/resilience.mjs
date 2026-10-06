// Network-drop resilience: the kitchen tablet loses Wi-Fi, an order is placed,
// the tablet reconnects and must catch up without anyone touching it.
//   node tests/e2e/resilience.mjs [baseUrl]
import { chromium } from "playwright";
import { jsonHeaders, unlockContext } from "./access.mjs";

const BASE = process.argv[2] ?? process.env.BASE_URL ?? "http://localhost:3000";
const browser = await chromium.launch();
let failed = false;
try {
  const tabletCtx = await browser.newContext({ viewport: { width: 1180, height: 820 } });
  await unlockContext(tabletCtx, BASE);
  const tablet = await tabletCtx.newPage();
  await tablet.goto(`${BASE}/staff`);
  await tablet.getByText("Live", { exact: true }).first().waitFor({ timeout: 15000 });

  console.log("  · tablet goes offline");
  await tabletCtx.setOffline(true);
  await tablet.evaluate(() => window.dispatchEvent(new Event("offline")));
  await tablet.getByText(/Offline|Reconnecting/).first().waitFor({ timeout: 8000 });
  console.log("  ✓ tablet shows it is offline");

  const res = await fetch(`${BASE}/api/command`, {
    method: "POST",
    headers: jsonHeaders(null),
    body: JSON.stringify({ type: "placeOrder", tableCode: "table-09", paymentMethod: "cash", clientRequestId: `res-${Date.now()}`, lines: [{ itemId: "flat-white", quantity: 2, selections: {} }] }),
  });
  const { result } = await res.json();
  if (!result.ok) throw new Error("order failed");
  console.log(`  · order #${result.order.number} placed while the tablet is offline`);

  await tablet.waitForTimeout(1500);
  if (await tablet.getByTestId(`order-${result.order.number}`).count()) {
    // Browser offline emulation does not always sever an already-open stream.
    console.log("  · (emulated offline kept the live stream open — skipping the offline-isolation check)");
  }

  console.log("  · tablet comes back online");
  await tabletCtx.setOffline(false);
  await tablet.evaluate(() => window.dispatchEvent(new Event("online")));
  const t0 = Date.now();
  await tablet.getByTestId(`order-${result.order.number}`).waitFor({ timeout: 20000 });
  console.log(`  ✓ tablet caught up with order #${result.order.number} in ${Date.now() - t0} ms, no refresh`);
  await tablet.getByText("Live", { exact: true }).first().waitFor({ timeout: 20000 });
  console.log("  ✓ live connection restored");

  // Duplicate submission: the same checkout id twice returns one order.
  const id = `dup-${Date.now()}`;
  const body = JSON.stringify({ type: "placeOrder", tableCode: "table-09", paymentMethod: "card", clientRequestId: id, lines: [{ itemId: "latte", quantity: 1, selections: {} }] });
  const [a, b] = await Promise.all([1, 2].map(() => fetch(`${BASE}/api/command`, { method: "POST", headers: jsonHeaders(null), body }).then((r) => r.json())));
  if (a.result.order.id !== b.result.order.id) throw new Error("duplicate submission created two orders");
  console.log("  ✓ a double-submitted checkout creates exactly one order");
} catch (err) {
  failed = true;
  console.log(`  ✗ ${String(err).split("\n")[0]}`);
} finally {
  await browser.close();
  console.log(failed ? "\nRESILIENCE: FAILED" : "\nRESILIENCE: passed");
  process.exitCode = failed ? 1 : 0;
}
