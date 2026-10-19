/* Public files only. Never store API responses, documents or attendance writes. */
const CACHE_PREFIX = 'se-erp-public-';
const CACHE_NAME = `${CACHE_PREFIX}v1`;
const BASE = new URL('./', self.location.href);
const OFFLINE = new URL('offline.html', BASE).href;
const PUBLIC_FILES = [
  OFFLINE,
  new URL('icons/se-erp-192.png', BASE).href,
  new URL('icons/se-erp-512.png', BASE).href
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(PUBLIC_FILES)));
  // Activate naturally when existing tabs close; do not interrupt unfinished forms.
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
      .map(key => caches.delete(key))
  )));
});
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== BASE.origin ||
      request.headers.has('authorization') || /\/(api|auth)(\/|$)/.test(url.pathname)) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.open(CACHE_NAME).then(cache => cache.match(OFFLINE))));
    return;
  }
  // Cache only explicitly listed public resources, never arbitrary GET requests.
  if (PUBLIC_FILES.includes(url.href)) {
    event.respondWith(caches.open(CACHE_NAME).then(async cache => {
      const saved = await cache.match(request);
      if (saved) return saved;
      return fetch(request);
    }));
  }
});
