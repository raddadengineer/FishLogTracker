/// <reference lib="webworker" />

// This service worker can be customized:
// https://developers.google.com/web/tools/workbox/modules/workbox-sw

declare const self: ServiceWorkerGlobalScope;

// Bump this when caching logic changes to force refresh.
const CACHE_NAME = 'fish-tracker-v2';
const RUNTIME_CACHE = 'runtime-cache';
const TILE_CACHE = 'tile-cache-v1';
const CONFIG_CACHE = 'sw-config-v1';
// NOTE: we don't ship a separate offline.html; navigation falls back to cached index.html.
const APP_SHELL = ['/', '/index.html'];

let tileCacheEnabled = true;

async function loadTileCacheFlag() {
  try {
    const cache = await caches.open(CONFIG_CACHE);
    const res = await cache.match("/tile-cache-enabled");
    if (!res) return;
    const t = (await res.text()).trim();
    tileCacheEnabled = t === "1";
  } catch {
    // ignore
  }
}

async function persistTileCacheFlag() {
  const cache = await caches.open(CONFIG_CACHE);
  await cache.put("/tile-cache-enabled", new Response(tileCacheEnabled ? "1" : "0"));
}

async function trimCache(cacheName: string, maxEntries: number) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  // delete oldest entries
  await Promise.all(keys.slice(0, keys.length - maxEntries).map((k) => cache.delete(k)));
}

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(APP_SHELL);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  const currentCaches = [CACHE_NAME, RUNTIME_CACHE, TILE_CACHE, CONFIG_CACHE];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return cacheNames.filter(cacheName => !currentCaches.includes(cacheName));
    }).then(cachesToDelete => {
      return Promise.all(cachesToDelete.map(cacheToDelete => {
        return caches.delete(cacheToDelete);
      }));
    }).then(async () => {
      await loadTileCacheFlag();
      await self.clients.claim();
    })
  );
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Offline map tile caching (OpenStreetMap tiles)
  try {
    const url = new URL(event.request.url);
    const isOsmTile =
      (url.hostname === "tile.openstreetmap.org" || url.hostname.endsWith(".tile.openstreetmap.org")) &&
      url.pathname.split("/").length >= 4; // /{z}/{x}/{y}.png

    if (isOsmTile && tileCacheEnabled && event.request.method === "GET") {
      event.respondWith(
        caches.open(TILE_CACHE).then(async (cache) => {
          const cached = await cache.match(event.request);
          if (cached) return cached;
          try {
            const res = await fetch(event.request, { mode: "cors" });
            if (res.ok) {
              cache.put(event.request, res.clone());
              // Keep cache bounded (best-effort)
              trimCache(TILE_CACHE, 350).catch(() => {});
            }
            return res;
          } catch {
            return cached || new Response("Offline tile", { status: 503 });
          }
        }),
      );
      return;
    }
  } catch {
    // ignore url parse failures
  }

  // Skip cross-origin requests
  if (event.request.url.startsWith(self.location.origin)) {
    const url = new URL(event.request.url);

    // Always keep index.html fresh when online (prevents white-screen on new deploy).
    if (url.pathname === "/index.html") {
      event.respondWith(
        fetch(event.request)
          .then(async (response) => {
            const cache = await caches.open(CACHE_NAME);
            cache.put("/index.html", response.clone());
            return response;
          })
          .catch(async () => {
            const cache = await caches.open(CACHE_NAME);
            const cached = await cache.match("/index.html");
            return cached || new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
          }),
      );
      return;
    }

    // Cache built assets so upgrades don't strand clients on missing chunks.
    if (url.pathname.startsWith("/assets/")) {
      event.respondWith(
        caches.open(RUNTIME_CACHE).then(async (cache) => {
          const cached = await cache.match(event.request);
          const fetchPromise = fetch(event.request)
            .then((response) => {
              cache.put(event.request, response.clone());
              return response;
            })
            .catch(() => cached || new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } }));
          return cached || fetchPromise;
        }),
      );
      return;
    }

    // SPA navigations: serve cached index.html when offline so routes still open.
    if (event.request.mode === 'navigate') {
      event.respondWith(
        fetch(event.request)
          .then(async (response) => {
            // Opportunistically refresh cached index.html during navigations.
            try {
              const cache = await caches.open(CACHE_NAME);
              const freshIndex = await fetch("/index.html");
              cache.put("/index.html", freshIndex.clone());
            } catch {
              // ignore
            }
            return response;
          })
          .catch(async () => {
            const cache = await caches.open(CACHE_NAME);
            const cached = await cache.match('/index.html');
            return cached || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
          })
      );
      return;
    }

    // For API calls, don't cache but handle offline
    if (event.request.url.includes('/api/')) {
      event.respondWith(
        fetch(event.request)
          .catch(() => {
            return new Response(
              JSON.stringify({ 
                error: true, 
                message: 'You are offline. This data will be synced when you are back online.' 
              }),
              { 
                headers: { 'Content-Type': 'application/json' },
                status: 503
              }
            );
          })
      );
      return;
    }

    // For non-API requests, use cache with network fallback
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return caches.open(RUNTIME_CACHE).then(cache => {
          return fetch(event.request).then(response => {
            // Put a copy of the response in the runtime cache
            return cache.put(event.request, response.clone()).then(() => {
              return response;
            });
          }).catch(() => {
            return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
          });
        });
      })
    );
  }
});

// Receive config updates from the app
self.addEventListener("message", (event) => {
  if (!event?.data) return;
  if (event.data.type === "SET_TILE_CACHE_ENABLED") {
    tileCacheEnabled = Boolean(event.data.enabled);
    event.waitUntil(persistTileCacheFlag());
  }
});

// Listen for sync events
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-catches') {
    // The service worker can't read localStorage. Tell the app to sync its queued catches.
    event.waitUntil(notifyClientsToSync());
  }
});

async function notifyClientsToSync() {
  const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
  for (const client of clients) {
    client.postMessage({ type: 'SYNC_OFFLINE_CATCHES' });
  }
}
