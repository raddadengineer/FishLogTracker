/// <reference lib="webworker" />

// This service worker can be customized:
// https://developers.google.com/web/tools/workbox/modules/workbox-sw

declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = 'fish-tracker-v1';
const RUNTIME_CACHE = 'runtime-cache';
// NOTE: we don't ship a separate offline.html; navigation falls back to cached index.html.
const APP_SHELL = ['/', '/index.html'];

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
  const currentCaches = [CACHE_NAME, RUNTIME_CACHE];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return cacheNames.filter(cacheName => !currentCaches.includes(cacheName));
    }).then(cachesToDelete => {
      return Promise.all(cachesToDelete.map(cacheToDelete => {
        return caches.delete(cacheToDelete);
      }));
    }).then(() => self.clients.claim())
  );
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (event.request.url.startsWith(self.location.origin)) {
    // SPA navigations: serve cached index.html when offline so routes still open.
    if (event.request.mode === 'navigate') {
      event.respondWith(
        fetch(event.request).catch(async () => {
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
