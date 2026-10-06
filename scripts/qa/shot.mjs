// Quick screenshot helper for visual QA: node scripts/qa/shot.mjs <url> <out.png> [width] [height] [fullPage]
import { chromium } from "playwright";
const [, , url, out, w = "1280", h = "900", full = "1"] = process.argv;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) }, deviceScaleFactor: 2 });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(url, { waitUntil: "load" });
await page.waitForTimeout(1800);
await page.screenshot({ path: out, fullPage: full === "1" });
if (errors.length) console.log("CONSOLE ERRORS:\n" + errors.join("\n"));
await browser.close();
