const CACHE_NAME = 'zelux-store-v3';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png',
  '/manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // CRITICAL SECURITY: Never cache non-GET requests (mutations: POST, PUT, DELETE, PATCH)
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  // CRITICAL SECURITY: Never cache auth tokens, API endpoints, payment gateways, Supabase, or courier dispatch endpoints
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.includes('/auth/') ||
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('api-hermes.pathao.com')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request)
        .then((networkResponse) => {
          // Cache successful responses for static assets and CDN images
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            (event.request.url.match(/\.(js|css|png|jpg|jpeg|svg|webp|woff2?)$/i) ||
             url.hostname.includes('images.unsplash.com'))
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline fallback for navigation requests to return App shell
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
    })
  );
});
