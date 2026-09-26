// ═══════════════════════════════════════════════════════
//  Lernwelt – sw.js  (Service Worker: Offline-Speicher)
//
//  Grundsatz „Internet zuerst“: Ist das Netz da, kommt immer die
//  aktuelle Datei von GitHub Pages (Änderungen wirken wie bisher).
//  Nur wenn das Netz fehlt oder zu langsam ist, wird die zuletzt
//  gesehene Kopie verwendet. Große, unveränderliche Dateien
//  (three.js, Schriften, Symbole) kommen direkt aus dem Speicher.
//
//  Nach einer Änderung an DIESER Datei VERSION erhöhen.
// ═══════════════════════════════════════════════════════
const VERSION = 'lernwelt-v1';
const START = ['./', 'index.html', 'shared.js', 'config-api.js', 'navbar.js', 'pass.js', 'avatar3d.js',
               'fonts.css', 'qrcode.js', 'config.json', 'lernwelt-inhalte.json', 'manifest.webmanifest'];
const FEST = /\/(vendor|fonts|icons)\//;      // ändern sich (fast) nie
const WARTEN_MS = 4000;                        // so lange auf das Netz warten

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(VERSION).then(c => Promise.all(START.map(u => c.add(u).catch(() => {})))));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;   // Worker/Admin-Anfragen nie anfassen
  e.respondWith(FEST.test(url.pathname) ? speicherZuerst(req) : netzZuerst(req));
});

async function speicherZuerst(req) {
  const hit = await caches.match(req, { ignoreSearch: true });
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) (await caches.open(VERSION)).put(req, res.clone());
  return res;
}

async function netzZuerst(req) {
  const cache = await caches.open(VERSION);
  const netz = fetch(req).then(res => {
    if (res.ok) cache.put(req, res.clone());
    return res;
  });
  const alt = () => caches.match(req, { ignoreSearch: true })
    .then(hit => hit || (req.mode === 'navigate' ? caches.match('index.html') : null));
  try {
    const zuLangsam = new Promise(r => setTimeout(r, WARTEN_MS, 'timeout'));
    const erst = await Promise.race([netz, zuLangsam]);
    if (erst !== 'timeout') return erst;
    return (await alt()) || await netz;         // langsames WLAN: gespeicherte Kopie, sonst weiter warten
  } catch (err) {
    const hit = await alt();
    if (hit) return hit;
    throw err;
  }
}
