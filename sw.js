/* SPOODEX service worker: opens offline with the last sync, keeps CDN libraries, and caches map tiles and photos as you view them.
   Scope is this folder (/spoodex/ on Pages). The Identification aid on the same origin has its own worker (/Identification-aid/)
   and its own caches (salticidae-core:*); this one only ever touches caches named spoodex-*.
   iNat API responses are never cached here: the app keeps its data in IndexedDB. */
const VERSION = '2.1.1';   // bump on every release (HANDOVER §10 "Ship")
const SHELL = `spoodex-shell-${VERSION}`, LIBS = `spoodex-libs-${VERSION}`;
const TILES = 'spoodex-tiles', PHOTOS = 'spoodex-photos';   // content, not code: kept across releases, oldest out past the cap
const CAP = { [TILES]:600, [PHOTOS]:400 };
const SCOPE = new URL(self.registration.scope);
const SHELL_FILES = ['spoodex.html', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
const LIB_FILES = ['https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css', 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'];
const LIB_HOSTS = /^(cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)$/;
const PHOTO_HOSTS = /^(static\.inaturalist\.org|inaturalist-open-data\.s3\.amazonaws\.com)$/;
const isTile = u => /^(server|services)\.arcgisonline\.com$/.test(u.hostname) && u.pathname.includes('/tile/')
  || u.hostname === 's3.amazonaws.com' && u.pathname.startsWith('/elevation-tiles-prod/');   // terrain tiles (3D map)
const NO_CORS_HOSTS = /^static\.inaturalist\.org$/;   // all-rights-reserved photos: no Access-Control-Allow-Origin, so fetch them opaque
const SHELL_TIMEOUT = 5000;   // weak signal in the bush: serve the cached shell rather than wait, and let the update land next time

self.addEventListener('install', e => e.waitUntil((async () => {
  const shell = await caches.open(SHELL);
  await shell.addAll(SHELL_FILES.map(f => new Request(new URL(f, SCOPE), { cache:'reload' })));
  const libs = await caches.open(LIBS);
  await Promise.all(LIB_FILES.map(async u => { if (await libs.match(u)) return; const r = await fetch(u, { mode:'cors', credentials:'omit' }); if (r.ok) await libs.put(u, r); })).catch(() => {});
  await self.skipWaiting();
})()));

self.addEventListener('activate', e => e.waitUntil((async () => {
  const keep = new Set([SHELL, LIBS, TILES, PHOTOS]);
  for (const k of await caches.keys()) if (k.startsWith('spoodex-') && !keep.has(k)) await caches.delete(k);
  await self.clients.claim();
})()));

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === SCOPE.origin) {
    if (!url.pathname.startsWith(SCOPE.pathname)) return;
    if (req.mode === 'navigate' || SHELL_FILES.some(f => url.pathname === SCOPE.pathname + f)) e.respondWith(networkFirst(e, url));
    return;
  }
  if (LIB_HOSTS.test(url.hostname)) e.respondWith(cacheFirst(e, LIBS));
  else if (isTile(url)) e.respondWith(cacheFirst(e, TILES));
  else if (PHOTO_HOSTS.test(url.hostname)) e.respondWith(cacheFirst(e, PHOTOS));
  // Everything else (iNat API, Open-Meteo, GoatCounter) goes straight to the network.
});

async function networkFirst(e, url) {
  const cache = await caches.open(SHELL);
  const key = url.origin + url.pathname;   // the ?u=… query isn't part of the key, so no usernames end up in the cache
  const net = fetch(e.request).then(r => { if (r.ok && r.type === 'basic') e.waitUntil(cache.put(key, r.clone())); return r; });
  const cached = async () => (await cache.match(key)) || (e.request.mode === 'navigate' ? cache.match(new URL('spoodex.html', SCOPE).href) : undefined);
  try {
    return await Promise.race([net, new Promise((_, no) => setTimeout(() => no(new Error('slow')), SHELL_TIMEOUT))]);
  } catch {
    const hit = await cached();
    if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
    return net;
  }
}

async function cacheFirst(e, name) {
  const req = e.request, cache = await caches.open(name);
  const hit = await cache.match(req, { ignoreVary:true });
  // An opaque copy can only answer a no-cors request (an <img>); CORS requests (card canvas, fonts) need a readable one
  if (hit && (hit.type !== 'opaque' || req.mode === 'no-cors')) return hit;
  let res = null;
  // Fetch a CORS copy where the host allows it: browsers pad opaque responses heavily in storage quota.
  // no-cache: an earlier plain <img> load may sit in the HTTP cache without CORS headers (S3 doesn't vary on Origin)
  if (req.mode === 'no-cors' && !NO_CORS_HOSTS.test(new URL(req.url).hostname)) {
    try { res = await fetch(req.url, { mode:'cors', credentials:'omit', cache:'no-cache' }); } catch { res = null; }
    if (res && !res.ok) res = null;
  }
  if (!res) res = await fetch(req);
  if (res.ok || res.type === 'opaque') e.waitUntil(cache.put(req, res.clone()).then(() => trim(name)).catch(() => {}));
  return res;
}

// Oldest out: cache keys come back in insertion order. Checked every 20 additions, so a cache can overshoot its cap slightly.
let added = 0;
async function trim(name) {
  if (++added % 20) return;
  const cache = await caches.open(name), keys = await cache.keys();
  for (const k of keys.slice(0, Math.max(0, keys.length - CAP[name]))) await cache.delete(k);
}
