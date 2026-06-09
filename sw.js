// sw.js — Permanent fix: HTML is NEVER cached. Always served fresh from network.
const CACHE_NAME = 'chattogram-static-v1';

// Only cache genuinely static assets (manifest, icons, fonts)
const STATIC_ASSETS = [
  'manifest.json'
];

// Install — cache only static assets, NOT index.html
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate — wipe ALL old caches unconditionally
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — HTML always goes to network. Never serve index.html from cache.
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Always bypass cache for HTML document requests
  const isHTML = request.mode === 'navigate' ||
                 request.destination === 'document' ||
                 url.pathname === '/' ||
                 url.pathname.endsWith('.html');

  if (isHTML) {
    // Strict network-only for HTML — cache is never touched
    event.respondWith(
      fetch(request, { cache: 'no-store' }).catch(() => {
        // Only fall back to cache if truly offline
        return caches.match('index.html');
      })
    );
    return;
  }

  // Cache-first for static assets (manifest, icons, etc.)
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});
