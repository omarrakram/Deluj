/* Deluj offline shell.
 * - Pages: network first (always fresh), falling back to the last copy, then an offline page.
 * - Every cached page is stored together with the exact /_next/static chunks it needs, so a
 *   screen opened offline can still start (same deployment's HTML + JS + CSS + fonts).
 * - Build assets and brand files: cache first (they are content-hashed).
 * - Live data (/api/*, Supabase) is never cached: it must always be the truth. */
const VERSION = "deluj-v2";
const PAGES = ["/", "/order/table-07", "/staff", "/owner"];
const FILES = ["/offline.html", "/manifest.webmanifest", "/brand/deluj-wordmark.svg", "/brand/deluj-badge.png", "/brand/icon-192.png", "/brand/terrazzo.svg"];
const ASSET_RE = /\/_next\/static\/[^"'\s)\\]+/g;

async function cacheAssets(cache, text) {
  const assets = [...new Set(text.match(ASSET_RE) || [])];
  await Promise.allSettled(
    assets.map(async (url) => {
      if (await cache.match(url)) return;
      const res = await fetch(url);
      if (!res.ok) return;
      if (url.endsWith(".css")) {
        // Fonts and images referenced from the stylesheet.
        await cacheAssets(cache, await res.clone().text());
      }
      await cache.put(url, res);
    }),
  );
}

/** Store a page under its path, together with every chunk its HTML references. */
async function cachePage(cache, path, res) {
  const html = await res.clone().text();
  await cache.put(path, res);
  await cacheAssets(cache, html);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(VERSION);
      await Promise.allSettled(FILES.map((url) => cache.add(new Request(url, { cache: "reload" }))));
      await Promise.allSettled(
        PAGES.map(async (path) => {
          const res = await fetch(new Request(path, { cache: "reload" }));
          if (res.ok) await cachePage(cache, path, res);
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/print/")) return;

  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 6000);
          const res = await fetch(req, { signal: controller.signal });
          clearTimeout(timer);
          if (res.ok) {
            const copy = res.clone();
            event.waitUntil(caches.open(VERSION).then((c) => cachePage(c, url.pathname, copy)));
          }
          return res;
        } catch {
          const cached = (await caches.match(url.pathname)) || (await caches.match(req));
          return cached || (await caches.match("/offline.html")) || Response.error();
        }
      })(),
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/brand/") || url.pathname.startsWith("/_next/image")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(VERSION).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
  }
});
