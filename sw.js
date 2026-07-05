/* Service worker — cache "app shell" pour fonctionner hors-ligne */
const CACHE = 'routine-v2';
const ASSETS = ['./', './index.html', './manifest.json', './icon.svg', './icon-maskable.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;   // le reste (police, Supabase CDN) passe en direct

  const isHTML = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
  if (isHTML) {
    // Réseau d'abord : les mises à jour de l'appli apparaissent tout de suite ;
    // repli sur le cache si hors-ligne.
    e.respondWith(
      fetch(req).then(res => { const c = res.clone(); caches.open(CACHE).then(x => x.put(req, c)); return res; })
        .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }
  // Autres fichiers (icônes, manifeste) : cache d'abord, rapide et hors-ligne.
  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      const c = res.clone(); caches.open(CACHE).then(x => x.put(req, c)); return res;
    }))
  );
});
