// Branded QR code rendering (pure SVG shapes — prints crisply, no fonts).
import "server-only";
import { env } from "./env";

import QRCode from "qrcode";
import { readFileSync } from "node:fs";
import path from "node:path";

let badgeDataUri: string | null = null;
function badge(): string {
  if (!badgeDataUri) {
    const file = readFileSync(path.join(process.cwd(), "public/brand/icon-192.png"));
    badgeDataUri = `data:image/png;base64,${file.toString("base64")}`;
  }
  return badgeDataUri;
}

export interface QrOptions {
  fg?: string;
  bg?: string;
  /** Put the real Deluj badge in the centre (uses high error correction). */
  withBadge?: boolean;
  margin?: number;
}

/** Returns an SVG string. Rounded finder patterns and dot modules in brand ink. */
export function qrSvg(text: string, opts: QrOptions = {}): string {
  const { fg = "#231C18", bg = "#FFF7EE", withBadge = true, margin = 3 } = opts;
  const qr = QRCode.create(text, { errorCorrectionLevel: withBadge ? "H" : "M" });
  const n = qr.modules.size;
  const data = qr.modules.data;
  const size = n + margin * 2;
  const isFinder = (r: number, c: number) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
  const centre = withBadge ? Math.ceil(n * 0.2) : 0;
  const c0 = Math.floor((n - centre) / 2);
  const inBadge = (r: number, c: number) => withBadge && r >= c0 - 1 && r < c0 + centre + 1 && c >= c0 - 1 && c < c0 + centre + 1;
  let dots = "";
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!data[r * n + c] || isFinder(r, c) || inBadge(r, c)) continue;
      // Solid, touching modules: maximally scannable on any camera or app.
      dots += `<rect x="${c + margin}" y="${r + margin}" width="1.02" height="1.02" rx="0.12"/>`;
    }
  }
  const finder = (x: number, y: number) =>
    `<rect x="${x + 0.5}" y="${y + 0.5}" width="6" height="6" rx="0.9" fill="none" stroke="${fg}" stroke-width="1"/>` +
    `<rect x="${x + 2}" y="${y + 2}" width="3" height="3" rx="0.45" fill="${fg}"/>`;
  const badgeSvg = withBadge
    ? `<circle cx="${size / 2}" cy="${size / 2}" r="${centre / 2 + 0.6}" fill="${bg}"/><image href="${badge()}" x="${size / 2 - centre / 2}" y="${size / 2 - centre / 2}" width="${centre}" height="${centre}"/>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="geometricPrecision"><rect width="${size}" height="${size}" rx="${size * 0.06}" fill="${bg}"/><g fill="${fg}">${dots}</g>${finder(margin, margin)}${finder(margin + n - 7, margin)}${finder(margin, margin + n - 7)}${badgeSvg}</svg>`;
}

/** The public URL a table's QR should open. */
export function orderUrl(origin: string, tableCode: string): string {
  const base = (env.siteUrl() || origin).replace(/\/+$/, "");
  return `${base}/order/${tableCode}`;
}

export function originFrom(headers: Headers): string {
  const host = headers.get("x-forwarded-host") ?? headers.get("host") ?? "localhost:3000";
  const proto = headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") || /^\d/.test(host) ? "http" : "https");
  return `${proto}://${host}`;
}
