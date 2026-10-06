// Local demo server for when the venue has no internet. Runs the production
// build on this laptop with the in-memory backend, reachable by every device on
// the same Wi-Fi / hotspot, and prints the exact address for each device.
//   npm run demo:start          (after `npm run build` once)
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const port = process.env.PORT ?? "3000";
if (!existsSync(path.join(process.cwd(), ".next", "BUILD_ID"))) {
  console.error("\nNo production build yet — run `npm run build` once (needs internet the first time).\n");
  process.exit(1);
}
const ips = Object.values(os.networkInterfaces())
  .flat()
  .filter((i) => i && i.family === "IPv4" && !i.internal)
  .map((i) => i.address);
const lan = ips[0] ?? "LAPTOP-IP";

console.log(`
  Deluj local demo — no internet needed
  ─────────────────────────────────────
  Laptop (owner):  http://localhost:${port}/owner
  iPad (kitchen):  http://${lan}:${port}/staff
  Phone (guest):   http://${lan}:${port}/order/table-07
  QR card:         http://${lan}:${port}/print/table-07
${ips.length > 1 ? `  Other addresses: ${ips.slice(1).join(", ")}\n` : ""}  All devices must be on the same Wi-Fi or hotspot. Ctrl+C to stop.
`);

const next = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
const child = spawn(process.execPath, [next, "start", "-H", "0.0.0.0", "-p", port], {
  stdio: "inherit",
  env: { ...process.env, DELUJ_BACKEND: "memory", NODE_ENV: "production" },
});
child.on("exit", (code) => process.exit(code ?? 0));
