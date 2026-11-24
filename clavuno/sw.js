/* Clavuno service worker: app shell cached for offline use, refreshed in the background. */
const CACHE = 'clavuno-v3';
const SHELL = ['./', 'index.html', 'styles.css', 'i18n.js', 'core.js', 'pdf.js', 'app.js', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'fonts/inter-latin.woff2', 'fonts/inter-latin-ext.woff2', 'fonts/bricolage-latin.woff2', 'fonts/bricolage-latin-ext.woff2'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('clavuno-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || !url.pathname.startsWith(new URL('./', location).pathname)) return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(req, { ignoreSearch: true });
    const net = fetch(req).then(r => { if (r && r.ok && r.type === 'basic') c.put(url.origin + url.pathname, r.clone()); return r; }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    const r = await net; if (r) return r;
    return req.mode === 'navigate' ? (await c.match('index.html')) || Response.error() : Response.error();
  }));
});
self.addEventListener('notificationclick', e => { e.notification.close(); e.waitUntil(self.clients.matchAll({ type: 'window' }).then(cs => (cs[0] ? cs[0].focus() : self.clients.openWindow('./')))); });
