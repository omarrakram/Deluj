// One-command production verification for the deployed demo.
//   node scripts/verify-production.mjs https://your-domain [--no-e2e]
// Checks: health/backend, every route, the QR card decodes to this domain,
// layout at phone/tablet/desktop sizes with no console errors, then runs the
// three-device realtime test and the resilience test. NOTE: the realtime test
// starts with a demo reset — run it before the meeting, not during it.
import { spawnSync } from "node:child_process";
import { chromium, devices } from "playwright";
import jsQR from "jsqr";
import sharp from "sharp";
import { ACCESS_CODE, unlockContext } from "../tests/e2e/access.mjs";

const base = (process.argv[2] ?? process.env.BASE_URL ?? "").replace(/\/+$/, "");
const runE2E = !process.argv.includes("--no-e2e");
if (!/^https?:\/\//.test(base)) {
  console.error("Usage: node scripts/verify-production.mjs https://your-domain [--no-e2e]");
  process.exit(2);
}

let failures = 0;
const ok = (msg) => console.log(`  ✓ ${msg}`);
const bad = (msg) => {
  failures++;
  console.log(`  ✗ ${msg}`);
};
const warn = (msg) => console.log(`  ! ${msg}`);

console.log(`\nDeluj production verification — ${base}\n`);

// 1. Health and backend
try {
  const res = await fetch(`${base}/api/health`, { cache: "no-store" });
  const body = await res.json();
  if (!res.ok || !body.ok) bad(`/api/health → ${res.status} ${JSON.stringify(body)}`);
  else if (body.backend !== "supabase") warn(`/api/health ok but backend is "${body.backend}" — add the Supabase environment variables for multi-device sync`);
  else ok(`/api/health → supabase, ${body.menuItems} menu items, business day ${body.businessDate}`);
  if (body.qrTarget) console.log(`    QR target: ${body.qrTarget}`);
  if (body.ok && !body.accessCode) warn("DELUJ_ACCESS_CODE is not set — anyone with this URL can reset the demo or edit the menu. Set it on Vercel and redeploy");
  if (body.accessCode && !ACCESS_CODE) warn("the deployment has DELUJ_ACCESS_CODE set — export it in this shell so /staff and /owner can be checked");
} catch (e) {
  bad(`/api/health unreachable: ${e}`);
}

// 2. Routes
for (const path of ["/", "/order/table-07", "/staff", "/owner", "/print/table-07", "/manifest.webmanifest", "/sw.js", "/offline.html", "/brand/deluj-wordmark.svg", "/order/table-99"]) {
  try {
    const res = await fetch(`${base}${path}`, { redirect: "manual" });
    if (res.status === 200) ok(`${path} → 200`);
    else bad(`${path} → ${res.status}`);
  } catch (e) {
    bad(`${path} unreachable: ${e}`);
  }
}

// 3. QR card points at this domain
try {
  const res = await fetch(`${base}/print/table-07/qr.png`);
  if (!res.ok) throw new Error(`qr.png → ${res.status}`);
  const png = Buffer.from(await res.arrayBuffer());
  const expected = `${base}/order/table-07`;
  for (const size of [1200, 300, 180]) {
    const { data, info } = await sharp(png).resize(size, size).flatten({ background: "#fff" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const decoded = jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data;
    if (decoded === expected) ok(`QR decodes at ${size}px → ${decoded}`);
    else if (decoded) warn(`QR at ${size}px decodes to ${decoded} (expected ${expected}; fine if NEXT_PUBLIC_SITE_URL is set on purpose)`);
    else bad(`QR did not decode at ${size}px`);
  }
} catch (e) {
  bad(`QR check failed: ${e}`);
}

// 4. Layout and console on real device sizes
const browser = await chromium.launch();
const SIZES = [
  ["phone", devices["iPhone 13"]],
  ["small phone", { viewport: { width: 360, height: 760 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }],
  ["tablet", { viewport: { width: 1180, height: 820 }, hasTouch: true }],
  ["desktop", { viewport: { width: 1440, height: 900 } }],
];
for (const [name, opts] of SIZES) {
  const ctx = await browser.newContext(opts);
  await unlockContext(ctx, base);
  for (const path of ["/", "/order/table-07", "/staff", "/owner", "/print/table-07"]) {
    const page = await ctx.newPage();
    const errors = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(String(e)));
    try {
      await page.goto(`${base}${path}`, { waitUntil: "load", timeout: 30000 });
      await page.waitForTimeout(2500);
      const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
      const live = await page.getByText("Live", { exact: true }).count();
      const problems = [];
      if (sw > iw + 1) problems.push(`horizontal overflow ${sw}px > ${iw}px`);
      if (errors.length) problems.push(`console: ${errors[0]}`);
      if (["/order/table-07", "/staff", "/owner"].includes(path) && !live) problems.push("never showed Live");
      if (problems.length) bad(`${name} ${path}: ${problems.join("; ")}`);
      else ok(`${name} ${path}`);
    } catch (e) {
      bad(`${name} ${path}: ${String(e).split("\n")[0]}`);
    }
    await page.close();
  }
  await ctx.close();
}
await browser.close();

// 5. Realtime suites
if (runE2E) {
  for (const script of ["tests/e2e/three-device-demo.mjs", "tests/e2e/resilience.mjs"]) {
    console.log(`\n▶ ${script}`);
    const r = spawnSync(process.execPath, [script, base, "qa-output/production"], { stdio: "inherit" });
    if (r.status !== 0) bad(`${script} failed`);
  }
}

console.log(failures ? `\n${failures} problem(s) found.` : "\nProduction verification passed.");
process.exitCode = failures ? 1 : 0;
