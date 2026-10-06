// The meeting, automated: a phone at Table 07, the kitchen iPad and Hosny's
// laptop as three isolated browser contexts. Every cross-device update must
// arrive without a refresh. Usage:
//   node tests/e2e/three-device-demo.mjs [baseUrl] [screenshotDir]
import { chromium, devices } from "playwright";
import { mkdirSync } from "node:fs";
import { accessCookie, jsonHeaders, unlockContext } from "./access.mjs";

const BASE = process.argv[2] ?? process.env.BASE_URL ?? "http://localhost:3000";
const OUT = process.argv[3] ?? "qa-output";
const SYNC_TIMEOUT = Number(process.env.SYNC_TIMEOUT ?? 6000);
mkdirSync(OUT, { recursive: true });

const results = [];
const errors = [];
let step = 0;

async function check(name, fn) {
  step++;
  const t0 = Date.now();
  try {
    await fn();
    const ms = Date.now() - t0;
    results.push({ step, name, ok: true, ms });
    console.log(`  ✓ ${String(step).padStart(2)}. ${name} (${ms} ms)`);
  } catch (err) {
    results.push({ step, name, ok: false, ms: Date.now() - t0, error: String(err).split("\n")[0] });
    console.log(`  ✗ ${String(step).padStart(2)}. ${name}\n      ${String(err).split("\n").slice(0, 3).join("\n      ")}`);
    throw err;
  }
}

function watch(page, label) {
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`[${label}] ${m.text()}`);
  });
  page.on("pageerror", (e) => errors.push(`[${label}] ${e}`));
}

const parseMoney = (s) => Number(String(s).replace(/[^0-9]/g, ""));

const browser = await chromium.launch();
try {
  // Start from a clean demo day.
  const cookie = await accessCookie(BASE);
  const reset = await fetch(`${BASE}/api/command`, { method: "POST", headers: jsonHeaders(cookie), body: JSON.stringify({ type: "reset" }) });
  if (!reset.ok) throw new Error(`reset failed: ${reset.status}`);

  const phoneCtx = await browser.newContext({ ...devices["iPhone 13"] });
  const tabletCtx = await browser.newContext({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2, hasTouch: true });
  const laptopCtx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await unlockContext(tabletCtx, BASE);
  await unlockContext(laptopCtx, BASE);
  const phone = await phoneCtx.newPage();
  const tablet = await tabletCtx.newPage();
  const laptop = await laptopCtx.newPage();
  watch(phone, "phone");
  watch(tablet, "tablet");
  watch(laptop, "laptop");

  console.log(`\nDeluj three-device demo against ${BASE}\n`);

  await check("Owner dashboard opens on the laptop and greets Hosny", async () => {
    await laptop.goto(`${BASE}/owner`);
    await laptop.getByTestId("greeting").filter({ hasText: "Hosny" }).waitFor();
    await laptop.getByTestId("kpi-orders-value").waitFor();
    await laptop.getByText("Live", { exact: true }).first().waitFor({ timeout: 15000 });
  });
  await check("Kitchen display opens on the tablet", async () => {
    await tablet.goto(`${BASE}/staff`);
    await tablet.getByText("Guest requests").first().waitFor();
    await tablet.getByText("Live", { exact: true }).first().waitFor({ timeout: 15000 });
  });

  const ordersBefore = parseMoney(await laptop.getByTestId("kpi-orders-value").textContent());
  const revenueBefore = parseMoney(await laptop.getByTestId("kpi-revenue-value").textContent());

  await check("1. Customer opens Table 07 from the QR link", async () => {
    await phone.goto(`${BASE}/order/table-07`);
    await phone.getByText("Table 07").first().waitFor();
    await phone.getByText("Live", { exact: true }).first().waitFor({ timeout: 15000 });
  });
  await check("   Owner feed shows Table 07 opening the menu (no refresh)", async () => {
    await laptop.getByTestId("live-feed").getByText("Table 07 opened the menu").first().waitFor({ timeout: SYNC_TIMEOUT });
  });
  await phone.screenshot({ path: `${OUT}/01-phone-menu.png` });

  await check("2. Customer adds an Iced Matcha (oat milk, less ice)", async () => {
    await phone.getByRole("button", { name: "Matcha", exact: true }).click();
    await phone.getByRole("button", { name: /^Iced Matcha, EGP 160/ }).click();
    await phone.getByRole("radio", { name: /Oat milk/ }).click();
    await phone.getByRole("radio", { name: /Less ice/ }).click();
    await phone.getByRole("button", { name: /Add to order/ }).click();
  });
  await check("3. Customer sees an intelligent pairing recommendation", async () => {
    await phone.getByText("Perfect with this").waitFor();
    await phone.getByRole("dialog").getByText("Maple Syrup Pancakes").first().waitFor();
    await phone.screenshot({ path: `${OUT}/02-phone-pairing.png` });
  });
  await check("4–5. Customer adds the pairing", async () => {
    await phone.getByRole("dialog").getByRole("button", { name: /^Add Maple Syrup/ }).click();
    await phone.getByRole("dialog").getByRole("button", { name: /View order/ }).click();
    await phone.getByRole("dialog").getByText("Your order").first().waitFor();
    await phone.getByRole("dialog").getByText("EGP 485").first().waitFor();
  });
  let orderNumber = 0;
  await check("6. Customer pays (demo card) and lands on the tracker", async () => {
    await phone.getByRole("dialog").getByRole("button", { name: /^Checkout/ }).click();
    await phone.getByRole("dialog").getByRole("button", { name: /^Pay EGP 485/ }).click();
    await phone.getByTestId("order-stage").waitFor({ timeout: 15000 });
    const header = await phone.getByText(/Order #\d+/).first().textContent();
    orderNumber = Number(header.match(/#(\d+)/)[1]);
    if (!orderNumber) throw new Error("no order number");
  });
  await check("7. Kitchen receives the order automatically", async () => {
    await tablet.getByTestId(`order-${orderNumber}`).waitFor({ timeout: SYNC_TIMEOUT });
    await tablet.getByTestId(`order-${orderNumber}`).getByText("Iced Matcha").waitFor();
    await tablet.getByTestId(`order-${orderNumber}`).getByText("Less ice · Oat milk").waitFor();
    await tablet.screenshot({ path: `${OUT}/03-tablet-new-order.png` });
  });
  await check("8–9. Owner dashboard updates: orders +1, revenue +EGP 485", async () => {
    await laptop.waitForFunction(
      ([sel, n]) => Number(document.querySelector(`[data-testid="${sel}"]`)?.textContent?.replace(/[^0-9]/g, "")) === n,
      ["kpi-orders-value", ordersBefore + 1],
      { timeout: SYNC_TIMEOUT },
    );
    await laptop.waitForFunction(
      ([sel, n]) => Number(document.querySelector(`[data-testid="${sel}"]`)?.textContent?.replace(/[^0-9]/g, "")) === n,
      ["kpi-revenue-value", revenueBefore + 485],
      { timeout: SYNC_TIMEOUT },
    );
    await laptop.getByTestId("live-feed").getByText("Table 07 placed an order").first().waitFor();
    await laptop.getByTestId("floor-table-07").and(laptop.locator('[data-state="ordered"]')).waitFor();
    await laptop.getByTestId("insights").getByText(/Table 07 just paired Iced Matcha/).first().waitFor();
    await laptop.screenshot({ path: `${OUT}/04-laptop-after-order.png`, fullPage: false });
  });

  const advance = () => tablet.getByTestId(`advance-${orderNumber}`).click();
  await check("10–11. Kitchen accepts → phone shows Order confirmed", async () => {
    await advance();
    await phone.getByTestId("order-stage").filter({ hasText: "Order confirmed" }).waitFor({ timeout: SYNC_TIMEOUT });
  });
  await check("12–13. Kitchen starts preparing → phone shows Preparing", async () => {
    await advance();
    await phone.getByTestId("order-stage").filter({ hasText: /Preparing|Almost ready/ }).waitFor({ timeout: SYNC_TIMEOUT });
    await phone.screenshot({ path: `${OUT}/05-phone-preparing.png` });
  });
  await check("14–15. Kitchen marks ready → phone shows Ready, coming to you", async () => {
    await advance();
    await phone.getByTestId("order-stage").filter({ hasText: "Ready — coming to you" }).waitFor({ timeout: SYNC_TIMEOUT });
  });
  await check("16–17. Guest requests the bill → kitchen shows TABLE 07 REQUEST BILL, just now", async () => {
    await phone.getByTestId("request-bill").click();
    const card = tablet.getByTestId("request-table-07-bill");
    await card.waitFor({ timeout: SYNC_TIMEOUT });
    await card.getByText("REQUEST BILL").waitFor();
    await card.getByText(/just now/i).waitFor();
    await tablet.screenshot({ path: `${OUT}/06-tablet-bill.png` });
  });
  await check("   Owner floor shows Table 07 requesting the bill", async () => {
    await laptop.getByTestId("floor-table-07").and(laptop.locator('[data-state="attention"]')).waitFor({ timeout: SYNC_TIMEOUT });
  });
  await check("   A second bill tap is de-duplicated", async () => {
    const res = await fetch(`${BASE}/api/command`, {
      method: "POST",
      headers: jsonHeaders(cookie),
      body: JSON.stringify({ type: "createRequest", tableCode: "table-07", kind: "bill", clientRequestId: `dup-${Date.now()}` }),
    });
    const body = await res.json();
    if (!body.result?.duplicate) throw new Error("duplicate bill request was not de-duplicated");
    if ((await tablet.getByTestId("request-table-07-bill").count()) !== 1) throw new Error("kitchen shows more than one bill card");
  });
  await check("18. Kitchen completes the request", async () => {
    await tablet.getByTestId("complete-table-07-bill").click();
    await tablet.getByTestId("request-table-07-bill").waitFor({ state: "detached", timeout: SYNC_TIMEOUT });
  });
  await check("19–20. Kitchen marks served → phone shows the completed state", async () => {
    await advance();
    await phone.getByTestId("order-stage").filter({ hasText: "Enjoy!" }).waitFor({ timeout: SYNC_TIMEOUT });
    await phone.screenshot({ path: `${OUT}/07-phone-served.png` });
  });
  await check("21. Owner analytics remain updated", async () => {
    await laptop.waitForFunction(
      ([sel, n]) => Number(document.querySelector(`[data-testid="${sel}"]`)?.textContent?.replace(/[^0-9]/g, "")) === n,
      ["kpi-orders-value", ordersBefore + 1],
      { timeout: SYNC_TIMEOUT },
    );
    await laptop.getByTestId("live-feed").getByText(`Order #${orderNumber} served`).first().waitFor({ timeout: SYNC_TIMEOUT });
  });
  await check("22–23. Owner marks Iced Matcha Sold Out → phone menu updates", async () => {
    await phone.getByRole("button", { name: "Menu" }).first().click();
    await phone.getByRole("button", { name: /^Iced Matcha, EGP 160$/ }).waitFor();
    await laptop.getByRole("switch", { name: "Iced Matcha: available" }).first().click();
    await phone.getByRole("button", { name: /^Iced Matcha, EGP 160, sold out$/ }).waitFor({ timeout: SYNC_TIMEOUT });
    await laptop.getByTestId("live-feed").getByText("Iced Matcha marked Sold Out").first().waitFor({ timeout: SYNC_TIMEOUT });
    await phone.getByRole("button", { name: /^Iced Matcha, EGP 160, sold out$/ }).scrollIntoViewIfNeeded();
    await phone.screenshot({ path: `${OUT}/08-phone-sold-out.png` });
  });
  await check("   Sold-out item cannot be ordered (server refuses)", async () => {
    const res = await fetch(`${BASE}/api/command`, {
      method: "POST",
      headers: jsonHeaders(cookie),
      body: JSON.stringify({ type: "placeOrder", tableCode: "table-07", paymentMethod: "cash", clientRequestId: `so-${Date.now()}`, lines: [{ itemId: "iced-matcha", quantity: 1, selections: {} }] }),
    });
    const body = await res.json();
    if (body.result?.code !== "sold_out") throw new Error(`expected sold_out, got ${JSON.stringify(body.result)}`);
  });
  await check("   Owner switches it back on → phone shows it available", async () => {
    await laptop.getByRole("switch", { name: "Iced Matcha: sold out" }).first().click();
    await phone.getByRole("button", { name: /^Iced Matcha, EGP 160$/ }).waitFor({ timeout: SYNC_TIMEOUT });
  });
  await laptop.screenshot({ path: `${OUT}/09-laptop-final.png`, fullPage: true });

  await check("Reset Demo from Settings returns every screen to a fresh day", async () => {
    await laptop.getByRole("button", { name: "Settings" }).first().click();
    await laptop.getByTestId("reset-open").click();
    await laptop.getByTestId("reset-confirm").click();
    await laptop.getByText("Demo reset").first().waitFor({ timeout: 15000 });
    await laptop.getByRole("button", { name: "Overview" }).first().click();
    // A reset re-seeds the day up to "now", so compare with the fresh server state, not the count from the start.
    const fresh = await fetch(`${BASE}/api/state`, { cache: "no-store" }).then((r) => r.json());
    if (fresh.state.orders.some((o) => o.source === "live")) throw new Error("reset left live orders behind");
    await laptop.waitForFunction(
      ([sel, n]) => Number(document.querySelector(`[data-testid="${sel}"]`)?.textContent?.replace(/[^0-9]/g, "")) === n,
      ["kpi-orders-value", fresh.state.orders.length],
      { timeout: SYNC_TIMEOUT * 2 },
    );
    await laptop.getByTestId("floor-table-07").and(laptop.locator('[data-state="available"]')).waitFor({ timeout: SYNC_TIMEOUT });
    await phone.getByText(`Order #${orderNumber}`).first().waitFor({ state: "detached", timeout: SYNC_TIMEOUT * 2 });
    await tablet.getByText(`#${orderNumber} · Table 07`).first().waitFor({ state: "detached", timeout: SYNC_TIMEOUT * 2 });
  });

  await check("No console errors on any device", async () => {
    const real = errors.filter((e) => !/Failed to load resource: the server responded with a status of 409/.test(e));
    if (real.length) throw new Error(real.join("\n"));
  });
} catch {
  process.exitCode = 1;
} finally {
  await browser.close();
  const passed = results.filter((r) => r.ok).length;
  console.log(`\n${passed}/${results.length} checks passed${process.exitCode ? " — FAILED" : " — the demo works end to end"}`);
  if (errors.length) console.log(`\nConsole errors:\n${errors.join("\n")}`);
}
