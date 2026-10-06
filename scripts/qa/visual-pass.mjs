// Visual QA with realistic mid-morning data: offline mode + a fixed Cairo clock.
//   node scripts/qa/visual-pass.mjs <baseUrl> <outDir>
import { chromium, devices } from "playwright";
import { mkdirSync } from "node:fs";
const [, , base = "http://localhost:3000", out = "qa-output/visual"] = process.argv;
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const time = new Date("2026-10-07T08:40:00.000Z"); // 11:40 Cairo
const shots = [
  ["owner-desktop", "/owner", { viewport: { width: 1440, height: 900 } }, true],
  ["owner-1024", "/owner", { viewport: { width: 1024, height: 768 } }, false],
  ["owner-mobile", "/owner", { ...devices["iPhone 13"] }, true],
  ["staff-ipad", "/staff", { viewport: { width: 1180, height: 820 } }, false],
  ["staff-portrait", "/staff", { viewport: { width: 820, height: 1180 } }, false],
  ["staff-phone", "/staff", { ...devices["iPhone 13"] }, false],
  ["customer-360", "/order/table-07", { viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, false],
  ["customer-430", "/order/table-07", { viewport: { width: 430, height: 932 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, false],
  ["customer-desktop", "/order/table-07", { viewport: { width: 1280, height: 800 } }, false],
  ["landing-mobile", "/", { ...devices["iPhone 13"] }, true],
  ["menu-tab", "/owner#menu", { viewport: { width: 1280, height: 900 } }, false],
  ["floor-tab", "/owner#floor", { viewport: { width: 1280, height: 900 } }, false],
  ["settings-tab", "/owner#settings", { viewport: { width: 1280, height: 900 } }, false],
];
for (const [name, path, opts, full] of shots) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  await page.clock.install({ time });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`${base}${path}${path.includes("#") ? "" : "?offline=1"}`.replace("#", "?offline=1#"));
  await page.waitForTimeout(1500);
  await page.clock.runFor(2000);
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: full });
  if (errors.length) console.log(name, "ERRORS", errors);
  await ctx.close();
}
await browser.close();
console.log("done");
