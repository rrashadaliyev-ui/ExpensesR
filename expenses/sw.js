/*
 * Offline support.
 * App files: NETWORK FIRST – online you always get the newest version (so uploads to GitHub show
 * up immediately); offline the last saved copy is used.
 * Libraries from CDNs (charts, Excel, Firebase SDK): cache first – they never change (fixed versions).
 * Firebase data requests are never touched (Firestore keeps its own offline copy).
 */
const CACHE = 'expense-manager-v1';
const CDN = ['https://cdnjs.cloudflare.com/', 'https://www.gstatic.com/firebasejs/'];

self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
));

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = req.url;
  if (CDN.some(p => url.startsWith(p))) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    })));
    return;
  }
  if (new URL(url).origin !== self.location.origin) return;
  // cache: 'no-cache' = always ask GitHub whether the file changed (avoids the browser's 10-minute cache).
  e.respondWith(fetch(url, { cache: 'no-cache', credentials: 'same-origin' }).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || caches.match('./index.html'))));
});
