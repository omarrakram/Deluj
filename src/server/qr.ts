// Branded QR code rendering (pure SVG shapes — prints crisply, no fonts).
import "server-only";
import { env } from "./env";

import QRCode from "qrcode";
import { readFileSync } from "node:fs";
import path from "node:path";

// The badge file is traced into the function bundle (see next.config.ts). If it
// is ever missing, the QR is still rendered — just without the centre badge.
let badgeDataUri: string | null | undefined;
function badge(): string | null {
  if (badgeDataUri === undefined) {
    try {
      const file = readFileSync(path.join(process.cwd(), "public/brand/icon-192.png"));
      badgeDataUri = `data:image/png;base64,${file.toString("base64")}`;
    } catch (err) {
      console.error("[qr] badge not available, rendering without it", err);
      badgeDataUri = null;
    }
  }
  return badgeDataUri;
}

export interface QrOptions {
  fg?: string;
  bg?: string;
  /** Put the real Deluj badge in the centre (uses high error correction). */
  withBadge?: boolean;
  margin?: number;
  /** Intrinsic pixel size (sets width/height so rasterisers render at full resolution). */
  px?: number;
}

/** Returns an SVG string. Rounded finder patterns and dot modules in brand ink. */
export function qrSvg(text: string, opts: QrOptions = {}): string {
  const { fg = "#231C18", bg = "#FFF7EE", margin = 3, px } = opts;
  const badgeUri = opts.withBadge === false ? null : badge();
  const withBadge = Boolean(badgeUri);
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
    ? `<circle cx="${size / 2}" cy="${size / 2}" r="${centre / 2 + 0.6}" fill="${bg}"/><image href="${badgeUri}" x="${size / 2 - centre / 2}" y="${size / 2 - centre / 2}" width="${centre}" height="${centre}"/>`
    : "";
  const dims = px ? ` width="${px}" height="${px}"` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}"${dims} shape-rendering="geometricPrecision"><rect width="${size}" height="${size}" rx="${size * 0.06}" fill="${bg}"/><g fill="${fg}">${dots}</g>${finder(margin, margin)}${finder(margin + n - 7, margin)}${finder(margin, margin + n - 7)}${badgeSvg}</svg>`;
}

function withScheme(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

/**
 * The public URL a table's QR should open:
 *   1. NEXT_PUBLIC_SITE_URL when set (custom domain),
 *   2. on a Vercel production deployment, the project's public production domain —
 *      never a protected per-deployment URL that would show guests a login wall,
 *   3. otherwise the domain the card was opened on (local, LAN, previews).
 */
export function orderUrl(origin: string, tableCode: string): string {
  const configured = env.siteUrl();
  const production = env.vercelEnv() === "production" ? env.vercelProductionHost() : undefined;
  const base = (configured ? withScheme(configured) : production ? withScheme(production) : origin).replace(/\/+$/, "");
  return `${base}/order/${tableCode}`;
}

export function originFrom(headers: Headers): string {
  const host = headers.get("x-forwarded-host") ?? headers.get("host") ?? "localhost:3000";
  const proto = headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") || /^\d/.test(host) ? "http" : "https");
  return `${proto}://${host}`;
}
