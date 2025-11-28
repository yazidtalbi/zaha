const CACHE_VERSION = "v1";
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;

self.addEventListener("install", (event) => {
  // Activate new SW as soon as it's finished installing
  console.log("[sw] install", CACHE_VERSION);
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Clean up old caches and take control of the clients immediately
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => !key.startsWith(`runtime-${CACHE_VERSION}`))
          .map(async (key) => {
            console.log("[sw] deleting cache", key);
            return caches.delete(key);
          })
      );
      console.log("[sw] activate", CACHE_VERSION);
      await self.clients.claim();
    })()
  );
});

function isStaticAsset(url) {
  return (
    /\.(js|css|png|jpg|jpeg|svg|webp|woff2?|json)$/.test(url.pathname) ||
    url.pathname.startsWith("/_next/static")
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  // Only handle GET requests
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Cache-first strategy for static assets (fast, reduces network calls)
  if (url.origin === self.location.origin && isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((response) => {
            // Put a copy in the runtime cache
            const copy = response.clone();
            caches
              .open(RUNTIME_CACHE)
              .then((cache) => cache.put(request, copy));
            return response;
          })
          .catch(() => cached);
      })
    );
    return;
  }

  // Network-first for navigations and API requests (always try live data)
  if (request.mode === "navigate" || url.pathname.startsWith("/api")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          return response;
        })
        .catch(async () => {
          // Fallback to cache if offline
          const cached = await caches.match(request);
          if (cached) return cached;
          // As a last resort return a basic Response to avoid infinite loading states
          return new Response("offline", {
            status: 503,
            statusText: "Service Unavailable",
          });
        })
    );
    return;
  }

  // Default: try network, fallback to cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Only cache static same-origin assets here. Avoid caching
        // navigations or data JSON (Next.js RSC/_next/data) to prevent
        // serving stale page/data that would show skeletons.
        if (url.origin === self.location.origin && isStaticAsset(url)) {
          const resCopy = response.clone();
          caches
            .open(RUNTIME_CACHE)
            .then((cache) => cache.put(request, resCopy));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// Allow the page to tell the SW to skipWaiting (so it can activate immediately)
self.addEventListener("message", (event) => {
  if (!event.data) return;
  if (event.data.type === "SKIP_WAITING") {
    console.log("[sw] Received SKIP_WAITING message");
    self.skipWaiting();
  }
});
