// The no-internet backup: customer, kitchen and owner in tabs of ONE browser,
// synced over BroadcastChannel with every /api request blocked.
//   node tests/e2e/offline-mode.mjs [baseUrl]
import { chromium } from "playwright";

const BASE = process.argv[2] ?? process.env.BASE_URL ?? "http://localhost:3000";
const browser = await chromium.launch();
let failed = false;
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  let apiCalls = 0;
  await ctx.route("**/api/**", (route) => {
    apiCalls++;
    return route.abort();
  });
  const owner = await ctx.newPage();
  await owner.goto(`${BASE}/owner?offline=1`);
  await owner.getByText("Offline mode").first().waitFor({ timeout: 15000 });
  const before = Number((await owner.getByTestId("kpi-orders-value").textContent()).replace(/[^0-9]/g, ""));
  const staff = await ctx.newPage();
  await staff.goto(`${BASE}/staff`);
  await staff.getByText("Offline mode").first().waitFor();
  const phone = await ctx.newPage();
  await phone.setViewportSize({ width: 390, height: 844 });
  await phone.goto(`${BASE}/order/table-07`);
  await phone.getByText("Offline mode").first().waitFor();
  console.log("  ✓ three screens open in offline mode");

  await phone.getByRole("button", { name: /^Mineral Water, EGP 30/ }).click();
  await phone.getByRole("dialog").getByRole("button", { name: /Add to order/ }).click();
  await phone.waitForTimeout(400);
  if (await phone.getByRole("dialog").count()) await phone.keyboard.press("Escape");
  await phone.getByTestId("cart-bar").click();
  await phone.getByRole("dialog").getByRole("button", { name: /^Checkout/ }).click();
  await phone.getByRole("dialog").getByRole("radio", { name: /Cash at the table/ }).click();
  await phone.getByRole("dialog").getByRole("button", { name: /^Place order/ }).click();
  await phone.getByTestId("order-stage").waitFor({ timeout: 10000 });
  const n = Number((await phone.getByText(/Order #\d+/).first().textContent()).match(/#(\d+)/)[1]);
  console.log(`  ✓ order #${n} placed with no network`);

  await staff.getByTestId(`order-${n}`).waitFor({ timeout: 5000 });
  console.log("  ✓ kitchen tab received it");
  await owner.waitForFunction((x) => Number(document.querySelector('[data-testid="kpi-orders-value"]')?.textContent?.replace(/[^0-9]/g, "")) === x, before + 1, { timeout: 5000 });
  console.log("  ✓ owner tab counted it");
  await staff.getByTestId(`advance-${n}`).click();
  await phone.getByTestId("order-stage").filter({ hasText: "Order confirmed" }).waitFor({ timeout: 5000 });
  console.log("  ✓ kitchen accept reached the guest tab");
  if (apiCalls) console.log(`  · ${apiCalls} background API attempts were blocked (expected: none needed)`);
  await owner.goto(`${BASE}/owner?offline=0`);
} catch (err) {
  failed = true;
  console.log(`  ✗ ${String(err).split("\n")[0]}`);
} finally {
  await browser.close();
  console.log(failed ? "\nOFFLINE MODE: FAILED" : "\nOFFLINE MODE: passed");
  process.exitCode = failed ? 1 : 0;
}
