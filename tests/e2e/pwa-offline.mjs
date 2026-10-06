// PWA shell: after one online visit, a device that loses its connection and
// reloads still gets the Deluj screens (from cache) or the branded offline page.
//   node tests/e2e/pwa-offline.mjs [baseUrl]
import { chromium } from "playwright";

const BASE = process.argv[2] ?? process.env.BASE_URL ?? "http://localhost:3000";
const browser = await chromium.launch();
let failed = false;
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: "allow" });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/order/table-07`);
  await page.getByText("Live", { exact: true }).first().waitFor({ timeout: 15000 });
  await page.waitForFunction(() => navigator.serviceWorker?.controller || navigator.serviceWorker?.ready, null, { timeout: 15000 });
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), null, { timeout: 15000 });
  await page.waitForTimeout(1500);
  console.log("  ✓ service worker installed and controlling the page");

  await ctx.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" }).catch(() => {});
  await page.getByText("Your table,").first().waitFor({ timeout: 15000 });
  console.log("  ✓ offline reload of the guest menu renders from cache");
  await page.getByText(/Offline|Reconnecting/).first().waitFor({ timeout: 10000 });
  console.log("  ✓ it says it is offline instead of failing silently");

  const other = await ctx.newPage();
  await other.goto(`${BASE}/order/table-99`).catch(() => {});
  await other.getByText(/lost the connection|couldn't find that table/).first().waitFor({ timeout: 15000 });
  console.log("  ✓ an uncached page shows the branded offline page");

  await ctx.setOffline(false);
  await page.reload();
  await page.getByText("Live", { exact: true }).first().waitFor({ timeout: 20000 });
  console.log("  ✓ back online: live again");
} catch (err) {
  failed = true;
  console.log(`  ✗ ${String(err).split("\n")[0]}`);
} finally {
  await browser.close();
  console.log(failed ? "\nPWA OFFLINE: FAILED" : "\nPWA OFFLINE: passed");
  process.exitCode = failed ? 1 : 0;
}
