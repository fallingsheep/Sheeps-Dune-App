const CACHE_NAME = 'dune-cache-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './items.js',
  './resources.js',
  './building.js',
  './vehicle.js',
  './ui.js',
  './Data/buildings.json',
  './Data/garments.json',
  './Data/resources.json',
  './Data/utility.json',
  './Data/vehicles.json',
  './Data/weapons.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});