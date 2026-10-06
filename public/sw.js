/* Deluj offline shell.
 * - Pages: network first (always fresh), falling back to the last copy, then an offline page.
 * - Build assets (/_next/static) and brand files: cache first (they are content-hashed).
 * - Live data (/api/*, Supabase) is never cached: it must always be the truth. */
const VERSION = "deluj-v1";
const SHELL = ["/", "/order/table-07", "/staff", "/owner", "/offline.html", "/brand/deluj-wordmark.svg", "/brand/deluj-badge.png", "/brand/terrazzo.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => Promise.allSettled(SHELL.map((url) => cache.add(new Request(url, { cache: "reload" }))))).then(() => self.skipWaiting()),
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
            caches.open(VERSION).then((c) => c.put(req, copy));
          }
          return res;
        } catch {
          const cached = (await caches.match(req)) || (await caches.match(url.pathname));
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
