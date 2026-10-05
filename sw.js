/* FuturePath service worker — network-first with cache fallback */

const CACHE = "futurepath-v1";

const PRECACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/src/style.css",
  "/src/main.js",
  "/src/learning-engine.js",
  "/src/progress-store.js",
  "/src/pwa.js",
  "/src/data/careers.json",
  "/src/data/curricula.json"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      Promise.all(PRECACHE.map((u) => c.add(u).catch(() => {})))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((n) => n.startsWith("futurepath-") && n !== CACHE)
             .map((n) => caches.delete(n))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.protocol === "chrome-extension:") return;
  if (request.headers.get("range")) return;

  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      try {
        const fresh = await fetch(request);
        if (fresh && fresh.status === 200 && fresh.type !== "opaque") {
          cache.put(request, fresh.clone());
        }
        return fresh;
      } catch {
        const cached = await cache.match(request);
        if (cached) return cached;
        if (request.mode === "navigate") {
          const shell = await cache.match("/index.html");
          if (shell) return shell;
        }
        throw new Error("Offline and no cache");
      }
    })
  );
});

self.addEventListener("message", (e) => {
  if (e.data?.type === "SKIP_WAITING") self.skipWaiting();
});
