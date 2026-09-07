// Project Yuli PWA Service Worker
const CACHE_NAME = 'yuli-neuro-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/wllama/wllama.wasm',
  '/sqlite/wa-sqlite-async.wasm'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Best-effort pre-caching
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[ServiceWorker] Some static assets failed to pre-cache:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Bypass cache for models folder or large GGUFs so OPFS/CacheManager can handle ranges
  if (url.pathname.includes('/models/') || url.pathname.endsWith('.gguf')) {
    return;
  }

  // Navigation requests: Network-first to prevent stale HTML referencing old hashed JS chunks
  const isNavigation = event.request.mode === 'navigate' ||
                       event.request.destination === 'document' ||
                       url.pathname === '/' ||
                       url.pathname.endsWith('.html');

  if (isNavigation && url.origin === self.location.origin) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => {
            return cached || caches.match('/index.html');
          });
        })
    );
    return;
  }

  // Other assets: Cache-first, fallback to network
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        // Cache successful local GET requests (skip vite internal dev endpoints)
        if (
          event.request.method === 'GET' &&
          response.status === 200 &&
          url.origin === self.location.origin &&
          !url.pathname.startsWith('/@') &&
          !url.pathname.startsWith('/src/')
        ) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      });
    })
  );
});
