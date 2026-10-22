// sw.js - service worker (keep this file in the same folder as the .html pages)
// Makes the app open and work without signal:
//   - the pages and scripts are saved on first visit
//   - lists the API already sent (traps, lines, catches) are shown from the saved copy when offline
//   - map tiles you have looked at are saved too
// Change VERSION when you edit the pages/scripts so phones pick up the new files.
const VERSION = "v3";
const SHELL = "pestfree-shell-" + VERSION;
const CDN = "pestfree-cdn-v1";
const API = "pestfree-api";          // emptied on log out (see logout() in api.js)
const TILES = "pestfree-tiles-v1";
const KEEP = [SHELL, CDN, API, TILES];

const PAGES = ["dashboard", "check", "map", "traps", "lines", "catches", "reports", "qr", "users", "settings", "login", "register"].map((p) => p + ".html");
const FILES = [...PAGES, "manifest.json", "assets/admin.css", "assets/features.css", "assets/icons/icon-192.png", "assets/icons/icon-512.png",
  ...["config", "api", "utils", "auth", "admin", "pwa"].map((f) => "assets/js/" + f + ".js")];
const LIBS = [
  "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css",
  "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js",
  "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css",
  "https://cdn.jsdelivr.net/npm/sweetalert2@11",
  "https://cdn.jsdelivr.net/npm/sweetalert2@11.14.5/dist/sweetalert2.all.min.js",
  "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.js",
  "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
  "https://code.jquery.com/jquery-3.7.1.min.js",
  "https://cdn.datatables.net/1.13.8/css/dataTables.bootstrap5.min.css",
  "https://cdn.datatables.net/1.13.8/js/jquery.dataTables.min.js",
  "https://cdn.datatables.net/1.13.8/js/dataTables.bootstrap5.min.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const shell = await caches.open(SHELL);
    await Promise.allSettled(FILES.map((f) => shell.add(f)));   // one missing file must not break the install
    const cdn = await caches.open(CDN);
    await Promise.allSettled(LIBS.map((u) => cdn.add(u)));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (!KEEP.includes(k)) await caches.delete(k);
    await self.clients.claim();
  })());
});

// Try the network first (so you always see fresh data); if it fails or is too slow, use the saved copy.
async function networkFirst(req, cacheName, timeoutMs, pageKey) {
  const cache = await caches.open(cacheName);
  const key = pageKey ? new URL(req.url).origin + new URL(req.url).pathname : req;  // ?trap=5 and ?trap=6 are the same page
  // For our own pages/scripts, always ask the server if the file changed (skips Chrome's stale HTTP cache).
  const net = pageKey ? fetch(req, { cache: "no-cache" }) : fetch(req);
  try {
    const res = await Promise.race([net, new Promise((_, no) => setTimeout(() => no(new Error("slow")), timeoutMs))]);
    if (res && res.ok) cache.put(key, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(key);
    if (hit) { net.catch(() => {}); return hit; }
    return net;   // nothing saved: keep waiting for the network
  }
}

async function cacheFirst(req, cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === "opaque") {
    cache.put(req, res.clone());
    if (maxItems) cache.keys().then((k) => { if (k.length > maxItems) cache.delete(k[0]); });
  }
  return res;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;                    // saving data is handled by the outbox in the page
  const url = new URL(req.url);
  if (req.headers.has("Authorization")) return e.respondWith(networkFirst(req, API, 8000));        // API lists
  if (url.hostname.endsWith("arcgisonline.com")) return e.respondWith(cacheFirst(req, TILES, 600)); // map tiles
  if (url.origin === location.origin) return e.respondWith(networkFirst(req, SHELL, 4000, true));   // our pages and scripts
  return e.respondWith(cacheFirst(req, CDN));                                                        // libraries and fonts
});