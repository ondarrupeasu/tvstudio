/* TV Studio service worker — basic offline cache.
   Bump CACHE when assets change to force an update. */
const CACHE = 'tvstudio-v50';
const ASSETS = [
  './',
  './index.html',
  './casa-estilo.css',
  './power.js',
  './desk.js',
  './m32r.js',
  './vmix.js',
  './videohub.js',
  './constellation.js',
  './hyperdeck.js',
  './cables.js',
  './manifest.webmanifest',
  './icon.svg',
  './img/rack-v2.jpg',
  './img/breaker-board.jpg',
  './img/datapak.jpg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// network-first: try the network (and refresh the cache); offline, fall back to the cache.
// Every deploy shows up at once, and photos already viewed keep working offline.
self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    fetch(request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(request))
  );
});
