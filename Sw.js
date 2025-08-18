const CACHE_NAME = 'ai-photo-upscaler-cdn-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/styles.css',
  '/script.js',
  '/assets/loading.gif',
  '/assets/demo-before.jpg',
  '/privacy-policy.html',
  '/disclaimer.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
});

self.addEventListener('fetch', (event) => {
  // Don't cache CDN requests
  if (event.request.url.includes('cdn.jsdelivr.net')) {
    return fetch(event.request);
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
});
