// AM Women's Boutique — Service Worker v6
// Android 14 / Samsung S24 FE compatible
// NOTE: bump CACHE_NAME any time index.html or any precached asset changes,
// otherwise returning visitors can keep seeing a stale cached page/asset
// indefinitely, even after you upload new files to hosting.
const CACHE_NAME = 'am-boutique-v6';

const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192-any.png',
  '/icon-192-maskable.png',
  '/icon-512-any.png',
  '/icon-512-maskable.png',
  '/icon-180-any.png',
  '/nilu-avatar.jpg',
  '/blouse-1.jpg',
  '/blouse-2.jpg',
  '/blouse-3.jpg',
  '/blouse-4.jpg',
  '/gown-1.jpg',
  '/gown-2.jpg',
  '/lehenga-1.jpg',
  '/lehenga-2.jpg',
  '/suit-2.jpg',
  '/suit-3.jpg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.all(
        FILES_TO_CACHE.map(url =>
          cache.add(url).catch(err => {
            // Don't let one missing/renamed file (e.g. a gallery photo not yet
            // uploaded) block the entire service worker from installing —
            // that would leave visitors stuck on the OLD cached version forever.
            console.warn('[SW] Skipped precaching (not found or failed):', url, err);
          })
        )
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (
    url.hostname.includes('wa.me') ||
    url.hostname.includes('forms.gle') ||
    url.hostname.includes('forms.google.com') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('cdn.jsdelivr.net') ||
    event.request.method !== 'GET'
  ) return;

  // Network-first for the HTML shell so redeploys show up immediately;
  // falls back to cache only when offline.
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request).then(cached => cached || caches.match('/index.html')))
    );
    return;
  }

  // Cache-first for static assets (images, icons, etc.)
  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) return cached;
        return fetch(event.request)
          .then(response => {
            if (!response || response.status !== 200 || response.type === 'opaque') return response;
            const clone = response.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
            return response;
          })
          .catch(() => {
            if (event.request.destination === 'document') {
              return caches.match('/index.html');
            }
          });
      })
  );
});
