/// <reference lib="webworker" />

// This service worker can be customized:
// https://developers.google.com/web/tools/workbox/modules/workbox-sw

declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = 'fish-tracker-v1';
const RUNTIME_CACHE = 'runtime-cache';
const OFFLINE_URL = '/offline.html';

const urlsToCache = [
  '/',
  '/index.html',
  '/offline.html',
  '/src/main.tsx',
  '/src/index.css',
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
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
            // If offline and not in cache, show offline page
            return caches.match(OFFLINE_URL);
          });
        });
      })
    );
  }
});

// Listen for sync events
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-catches') {
    event.waitUntil(syncCatches());
  }
});

// Function to sync offline catches
async function syncCatches() {
  try {
    // Get offline catches from IndexedDB
    const offlineCatches = await getAllOfflineCatches();
    
    // Process each offline catch
    const syncPromises = offlineCatches.map(async (catchData) => {
      try {
        // Create FormData if there are photos
        let body;
        if (catchData.photosBlob && catchData.photosBlob.length > 0) {
          const formData = new FormData();
          
          // Append each photo
          catchData.photosBlob.forEach((blob, index) => {
            formData.append('photos', blob, `photo-${index}.jpg`);
          });
          
          // Append other catch data
          Object.keys(catchData).forEach(key => {
            if (key !== 'photosBlob' && key !== 'id') {
              formData.append(key, catchData[key]);
            }
          });
          
          body = formData;
        } else {
          // If no photos, send JSON
          const { photosBlob, ...catchDataWithoutPhotos } = catchData;
          body = JSON.stringify(catchDataWithoutPhotos);
        }
        
        // Send to server
        const response = await fetch('/api/catches', {
          method: 'POST',
          body,
          headers: !catchData.photosBlob ? { 'Content-Type': 'application/json' } : undefined,
        });
        
        if (response.ok) {
          // Remove from offline storage after successful sync
          await removeOfflineCatch(catchData.id);
        }
      } catch (error) {
        console.error('Error syncing catch:', error);
        // Keep in offline storage to try again later
      }
    });
    
    await Promise.all(syncPromises);
  } catch (error) {
    console.error('Error in syncCatches:', error);
  }
}

// Placeholder functions to interface with IndexedDB
// These would be implemented to work with the client-side IndexedDB storage
async function getAllOfflineCatches() {
  // Placeholder - would actually access IndexedDB
  return [];
}

async function removeOfflineCatch(id: string) {
  // Placeholder - would actually access IndexedDB
  console.log('Removing offline catch:', id);
}

// Send message to client
function sendMessageToClient(message: any) {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage(message);
    });
  });
}
