/* Lets the phone install Studio as an app and open it on a weak connection.
   Always asks the network first, so a new version shows up the next time the app opens.
   A studio folder (e.g. alaa/) has its own sw.js that sets self.APP and loads this file. */
const APP = self.APP || 'studio';
const CACHE = APP + '-v7';
const UP = self.APP ? '../' : '';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', UP + 'app.js', UP + 'styles.css', UP + 'icons/icon-192.png', UP + 'icons/icon-512.png'].concat(self.APP ? ['config.js'] : [], self.EXTRA || []);

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  // Only clear this studio's old caches, never another studio's on the same phone.
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith(APP + '-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  // Only the app's own files; the Google Sheet and fonts go straight to the network.
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then(res => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); } return res; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html')))
  );
});
