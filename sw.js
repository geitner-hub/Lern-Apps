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
const VERSION = 'lernwelt-v21';  // v21: automatische Pass-Sicherung (sync-code.js, sync.js)
const START = ['./', 'index.html', 'config.json', 'manifest.webmanifest',
               'gemeinsam/shared.js', 'gemeinsam/config-api.js', 'gemeinsam/navbar.js', 'gemeinsam/pass.js',
               'gemeinsam/sync-code.js', 'gemeinsam/sync.js',
               'gemeinsam/avatar3d.js', 'gemeinsam/fonts.css', 'gemeinsam/qrcode.js', 'daten/lernwelt-inhalte.json',
               'gemeinsam/dorf-kern.js', 'gemeinsam/dorf-szene.js', 'daten/dorf-inhalte.json', 'vendor/fflate.min.js',
               // Spiele: sollen auch offline laufen, ohne vorher einmal online geöffnet worden zu sein
               'spiele/runner.html', 'spiele/burg-verteidigung.html', 'spiele/dorf.html', 'spiele/tauziehen.html', 'spiele/wort-des-tages.html', 'spiele/zauberwort.html', 'spiele/kitchen-chaos.html', 'spiele/expedition.html', 'gemeinsam/aufgaben.js', 'gemeinsam/spiel-hilfen.js',
               'gemeinsam/karten-ansicht.js', 'daten/karten.json', 'daten/expedition.json',
               'daten/vokabeln5.json', 'daten/vokabeln6.json', 'daten/woerter-en.json', 'daten/kitchen-chaos.json',
               'vendor/three.min.js',
               'fonts/nunito-latin-wght-normal.woff2', 'fonts/nunito-latin-ext-wght-normal.woff2',
               'fonts/fredoka-one-latin-400-normal.woff2'];
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
