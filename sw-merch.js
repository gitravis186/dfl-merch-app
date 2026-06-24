// DFL Merch App Service Worker — with offline support
const CACHE = 'dfl-merch-v2';
const OFFLINE_URLS = ['/index.html', '/manifest-merch.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(OFFLINE_URLS)).catch(() => {})
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if(e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // Always go to network for Supabase API — data must be fresh or fail gracefully
  if(url.hostname.includes('supabase.co')) return;

  // For HTML/assets — cache first for speed, update in background
  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const cached = await cache.match(e.request);
      const networkFetch = fetch(e.request).then(res => {
        if(res.ok) cache.put(e.request, res.clone());
        return res;
      }).catch(() => null);

      // Return cached immediately, update in background
      return cached || networkFetch || new Response('Offline', {status: 503});
    })
  );
});

// Listen for sync messages from the app
self.addEventListener('message', e => {
  if(e.data === 'skipWaiting') self.skipWaiting();
});
