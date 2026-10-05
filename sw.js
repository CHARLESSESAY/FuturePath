/* ============================================================
   FuturePath — Service Worker
   Strategy: Network-first with cache fallback.
   Caches app shell, JSON data, and all CDN assets.
   ============================================================ */

// Bump this version whenever you deploy a new build.
// The activate handler deletes any cache that doesn't match.
const CACHE_VERSION = "futurepath-v1";
const CACHE_NAME = CACHE_VERSION;

// Assets to pre-cache during install (the app shell).
// These are the files needed for the app to render offline.
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/src/style.css",
  "/src/career-hub.js",
  "/src/sim-engine.js",
  "/src/pwa.js",
  "/src/data/careers.json",
  "/src/data/simulations.json"
];

// External origins we want to cache (Babylon.js CDN).
const EXTERNAL_CACHE_HOSTS = [
  "cdn.babylonjs.com"
];

// Hosts to never cache (analytics, websockets, etc.)
const NEVER_CACHE_HOSTS = [
  "localhost",
  "127.0.0.1",
  "vercel.live"
];

// ============================================================
// INSTALL — pre-cache the app shell
// ============================================================

self.addEventListener("install", (event) => {
  console.log("[SW] Installing", CACHE_NAME);

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn("[SW] Some pre-cache URLs failed:", err);
        // Cache them individually so one failure doesn't break install
        return Promise.all(
          PRECACHE_URLS.map((url) =>
            cache.add(url).catch(() => console.warn("[SW] Could not cache:", url))
          )
        );
      });
    })
  );

  // Activate immediately on first install
  self.skipWaiting();
});

// ============================================================
// ACTIVATE — clean up old caches
// ============================================================

self.addEventListener("activate", (event) => {
  console.log("[SW] Activating", CACHE_NAME);

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith("futurepath-") && name !== CACHE_NAME)
          .map((name) => {
            console.log("[SW] Deleting old cache:", name);
            return caches.delete(name);
          })
      );
    })
  );

  // Take control of open pages immediately
  self.clients.claim();

  // Notify all clients that a new version is available
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage({ type: "SW_ACTIVATED", version: CACHE_NAME });
    });
  });
});

// ============================================================
// FETCH — network-first, cache fallback
// ============================================================

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Skip dev hosts and websockets
  if (NEVER_CACHE_HOSTS.some((h) => url.hostname.includes(h))) return;
  if (request.headers.get("upgrade") === "websocket") return;

  // Skip partial responses (status 206)
  if (request.headers.get("range")) return;

  // Skip browser extension requests
  if (url.protocol === "chrome-extension:") return;

  // For our own origin and the Babylon CDN: network-first, cache fallback
  const isSameOrigin = url.origin === self.location.origin;
  const isExternalCacheable = EXTERNAL_CACHE_HOSTS.some((h) => url.hostname.includes(h));

  if (isSameOrigin || isExternalCacheable) {
    event.respondWith(networkFirst(request));
  }
});

// ============================================================
// STRATEGIES
// ============================================================

/**
 * Network-first: try the network, cache the result, fall back to cache
 * if offline. This is correct for data that can change (careers.json)
 * and for assets that should be fresh when possible.
 */
async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);

    // Only cache successful, complete responses
    if (response && response.status === 200 && response.type !== "opaque") {
      // Clone BEFORE returning — response body can only be read once
      cache.put(request, response.clone());
    }

    return response;
  } catch (err) {
    // Network failed — try the cache
    const cached = await cache.match(request);

    if (cached) {
      console.log("[SW] Serving from cache (offline):", request.url);
      return cached;
    }

    // Nothing in cache. If this is a navigation request, serve index.html
    // so the SPA shell still loads and shows the offline state.
    if (request.mode === "navigate") {
      const fallback = await cache.match("/index.html");
      if (fallback) return fallback;
    }

    // Nothing we can do
    throw err;
  }
}

// ============================================================
// MESSAGE HANDLING — manual cache refresh from the page
// ============================================================

self.addEventListener("message", (event) => {
  const data = event.data || {};

  if (data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (data.type === "CLEAR_CACHE") {
    event.waitUntil(
      caches.delete(CACHE_NAME).then(() => {
        event.source.postMessage({ type: "CACHE_CLEARED" });
      })
    );
  }

  if (data.type === "GET_VERSION") {
    event.source.postMessage({ type: "VERSION", version: CACHE_NAME });
  }
});
