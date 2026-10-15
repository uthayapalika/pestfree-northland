// Minimal service worker: keeps the app shell available when the network is slow.
// API calls are never cached, so data is always fresh.
const CACHE = "pestfree-shell-v3";
const SHELL = [
  "./", "index.html", "login.html", "register.html", "dashboard.html", "lines.html", "traps.html", "trap.html",
  "reports.html", "users.html", "css/style.css", "config.js", "manifest.json",
  "js/api.js", "js/common.js", "js/login.js", "js/register.js", "js/dashboard.js", "js/lines.js",
  "js/traps.js", "js/trap.js", "js/reports.js", "js/users.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isShellRequest(request) {
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return false;
  const base = new URL(self.registration.scope).pathname;
  const path = url.pathname.slice(base.length);
  return path === "" || SHELL.includes(path) || path.startsWith("icons/");
}

self.addEventListener("fetch", (event) => {
  if (!isShellRequest(event.request)) return;
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(event.request, copy));
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
