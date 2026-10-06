// Extracts DELUJ's real logo (brand-source/deluj-logo-original.png) into web assets.
// The artwork is never redrawn: the circle is masked out of the original, and the
// wordmark is colour-keyed out of the orange so its exact shapes are preserved.
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const SRC = "brand-source/deluj-logo-original.png";
const OUT = "public/brand";
mkdirSync(OUT, { recursive: true });

const ORANGE = [251, 78, 18];
const BLUE = [172, 211, 234];

const { data, info } = await sharp(SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
const px = (x, y) => {
  const i = (y * W + x) * 3;
  return [data[i], data[i + 1], data[i + 2]];
};
const isOrange = ([r, g, b]) => Math.abs(r - ORANGE[0]) < 30 && Math.abs(g - ORANGE[1]) < 30 && Math.abs(b - ORANGE[2]) < 30;

// 1) Find the circle: bounding box of orange pixels.
let minX = W, maxX = 0, minY = H, maxY = 0;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (isOrange(px(x, y))) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
}
const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
const r = Math.min(maxX - minX, maxY - minY) / 2 - 1.5; // stay inside the anti-aliased rim
console.log({ minX, maxX, minY, maxY, cx, cy, r });

// 2) Circle badge: original pixels, transparent outside the circle (anti-aliased edge).
const size = Math.ceil(r * 2);
const circle = Buffer.alloc(size * size * 4);
// 3) Wordmark alpha: projection of each pixel onto the orange→blue axis.
const ob = BLUE.map((v, k) => v - ORANGE[k]);
const obLen2 = ob.reduce((s, v) => s + v * v, 0);
const alpha = new Float32Array(size * size);
for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
  const sx = Math.round(cx - r + x), sy = Math.round(cy - r + y);
  const p = px(Math.min(W - 1, Math.max(0, sx)), Math.min(H - 1, Math.max(0, sy)));
  const d = Math.hypot(x + 0.5 - r, y + 0.5 - r);
  const edge = Math.max(0, Math.min(1, r - d + 0.5));
  const o = (y * size + x) * 4;
  // inside the disc, anything that is not wordmark is the brand orange
  let t = ((p[0] - ORANGE[0]) * ob[0] + (p[1] - ORANGE[1]) * ob[1] + (p[2] - ORANGE[2]) * ob[2]) / obLen2;
  t = Math.max(0, Math.min(1, (t - 0.08) / 0.84));
  if (d > r - 6) t = 0; // ignore the rim
  alpha[y * size + x] = t;
  // badge: clean orange disc + wordmark composited from the keyed alpha (exact shapes)
  circle[o] = Math.round(ORANGE[0] + (BLUE[0] - ORANGE[0]) * t);
  circle[o + 1] = Math.round(ORANGE[1] + (BLUE[1] - ORANGE[1]) * t);
  circle[o + 2] = Math.round(ORANGE[2] + (BLUE[2] - ORANGE[2]) * t);
  circle[o + 3] = Math.round(255 * edge);
}
await sharp(circle, { raw: { width: size, height: size, channels: 4 } }).png().toFile(`${OUT}/deluj-badge.png`);

// Wordmark bounding box
let bx0 = size, bx1 = 0, by0 = size, by1 = 0;
for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
  if (alpha[y * size + x] > 0.15) {
    if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y;
  }
}
const pad = 6;
bx0 -= pad; by0 -= pad; bx1 += pad; by1 += pad;
const ww = bx1 - bx0 + 1, wh = by1 - by0 + 1;
console.log({ wordmark: { ww, wh } });
const variants = { blue: BLUE, white: [255, 255, 255], orange: ORANGE, ink: [35, 28, 24] };
for (const [name, rgb] of Object.entries(variants)) {
  const buf = Buffer.alloc(ww * wh * 4);
  for (let y = 0; y < wh; y++) for (let x = 0; x < ww; x++) {
    const a = alpha[(y + by0) * size + (x + bx0)];
    const o = (y * ww + x) * 4;
    buf[o] = rgb[0]; buf[o + 1] = rgb[1]; buf[o + 2] = rgb[2]; buf[o + 3] = Math.round(a * 255);
  }
  await sharp(buf, { raw: { width: ww, height: wh, channels: 4 } }).png().toFile(`${OUT}/deluj-wordmark-${name}.png`);
}

// App icons from the badge (orange square for maskable / apple-touch, so the circle is never clipped oddly)
const badge = sharp(`${OUT}/deluj-badge.png`);
await badge.clone().resize(512, 512).png().toFile(`${OUT}/icon-512.png`);
await badge.clone().resize(192, 192).png().toFile(`${OUT}/icon-192.png`);
await badge.clone().resize(64, 64).png().toFile(`${OUT}/icon-64.png`);
// Maskable & apple-touch: full-bleed orange with the original wordmark centred.
const blueMark = await sharp(`${OUT}/deluj-wordmark-blue.png`).resize(Math.round(512 * 0.62)).png().toBuffer();
const maskable = await sharp({ create: { width: 512, height: 512, channels: 4, background: { r: ORANGE[0], g: ORANGE[1], b: ORANGE[2], alpha: 1 } } })
  .composite([{ input: blueMark, gravity: "center" }]).png().toBuffer();
await sharp(maskable).toFile(`${OUT}/icon-maskable-512.png`);
await sharp(maskable).resize(180, 180).png().toFile(`${OUT}/apple-touch-icon.png`);
console.log("done");
