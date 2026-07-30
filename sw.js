/* Service Worker – macht das Spiel offline spielbar (Handy/Tablet/Desktop) */
const CACHE = 'pkmn-openworld-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './src/sprites.js',
  './src/data.js',
  './src/world.js',
  './src/battle.js',
  './src/game.js',
  './src/touch.js',
  './icons/icon-64.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => {})
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Netz zuerst (immer die aktuelle Version), Cache als Rückfallebene
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});
