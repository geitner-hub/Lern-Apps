// ═══════════════════════════════════════════════════════
//  Lernwelt – sw.js  (Service Worker: Offline-Speicher)
//
//  Grundsatz „Internet zuerst“: Ist das Netz da, kommt immer die
//  aktuelle Datei von GitHub Pages (Änderungen wirken wie bisher).
//  Nur wenn das Netz fehlt oder zu langsam ist, wird die zuletzt
//  gesehene Kopie verwendet. Große, unveränderliche Dateien
//  (three.js, Schriften, Symbole) kommen direkt aus dem Speicher.
//
//  Bei jeder Änderung an geladenen Dateien VERSION erhöhen –
//  und LW.VERSION in gemeinsam/umgebung.js genauso (pruefen.py prüft das).
//
//  Live und Testumgebung (Lern-Apps-test) liegen unter derselben Adresse
//  und teilen sich den Offline-Speicher. Deshalb hat jede Umgebung ihr
//  eigenes Präfix und räumt nur ihre eigenen Speicher auf.
// ═══════════════════════════════════════════════════════
const VERSION = 'v45';  // v45: Geometrie-Trainer im Baukasten (Vierecke, Lage, Würfelnetze, Körper)
const PRAEFIX = /\/[^/]*-test\/$/i.test(new URL(self.registration.scope).pathname) ? 'lwtest-v' : 'lernwelt-v';
const CACHE   = PRAEFIX + VERSION.replace(/^v/, '');        // z. B. 'lernwelt-v24' (Format wie bisher)

// KERN: wird beim Update sofort geladen – alles, was die Startseite, jede Lern-App,
// der Pass, die Sicherung und das Zählen der Dorf-Aufträge offline brauchen.
// (pruefen.py: Budget „Offline-Vorladen“ gilt für diese Liste.)
const START = ['./', 'index.html', 'config.json', 'manifest.webmanifest',
               'gemeinsam/umgebung.js', 'gemeinsam/shared.js', 'gemeinsam/config-api.js', 'gemeinsam/navbar.js',
               'gemeinsam/pass.js', 'gemeinsam/pass-extras.js', 'gemeinsam/sync-code.js', 'gemeinsam/sync.js',
               'gemeinsam/katalog.js', 'gemeinsam/freigabe.js', 'gemeinsam/wiederholung.js', 'gemeinsam/dorf-kern.js', 'gemeinsam/generatoren-mathe.js', 'daten/kopfrechnen.json', 'gemeinsam/fonts.css', 'vendor/fflate.min.js',
               'daten/lernwelt-inhalte.json', 'daten/katalog.json', 'daten/dorf-inhalte.json',
               'fonts/nunito-latin-wght-normal.woff2', 'fonts/nunito-latin-ext-wght-normal.woff2',
               'fonts/fredoka-one-latin-400-normal.woff2'];

// NACHLADEN: Spiele, 3D und große Daten. Das iPad holt sie gestaffelt im Hintergrund,
// eine Datei nach der anderen, wenn eine Seite darum bittet (umgebung.js, zufällig
// 5–25 s nach dem Laden). So sind die Spiele nach einem Schultag auch offline da,
// ohne dass alle iPads beim Update gleichzeitig alles ziehen.
const NACHLADEN = ['spiele/runner.html', 'spiele/burg-verteidigung.html', 'spiele/dorf.html', 'spiele/tauziehen.html',
                   'spiele/wort-des-tages.html', 'spiele/zauberwort.html', 'spiele/kitchen-chaos.html', 'spiele/expedition.html',
                   'gemeinsam/aufgaben.js', 'gemeinsam/spiel-hilfen.js', 'gemeinsam/ueben.js', 'apps/mathe/kopfrechnen.html', 'apps/mathe/mathe-trainer.html', 'apps/englisch/vokabeltrainer.html', 'gemeinsam/karten-ansicht.js',
                   'gemeinsam/avatar3d.js', 'gemeinsam/chest3d.js', 'gemeinsam/dorf-szene.js', 'gemeinsam/qrcode.js',
                   'vendor/three.min.js', 'vendor/jsQR.min.js',
                   'daten/vokabeln5.json', 'daten/vokabeln6.json', 'daten/woerter-en.json', 'daten/kitchen-chaos.json',
                   'daten/karten.json', 'daten/expedition.json',
                   // Weltkarte in Equal Earth (Neue Lern-Apps Etappe 1–2): Daten, Projektion, d3-geo
                   'daten/welt.json', 'gemeinsam/welt-karte.js', 'vendor/d3-geo.min.js',
                   'daten/ozeane.json', 'gemeinsam/globus.js',  // Globus (Etappe 3)
                   'apps/gpg/bayern.html', 'daten/bayern.json',  // Auskennen in Bayern (Etappen 4–5)
                   'apps/mathe/laengeneinheiten.html',
                   // Aufgabentyp-Baukasten (Etappe 9): Seite, Rahmen, Typen (Inhalte aus daten/inhalte/ hier ergänzen)
                   'apps/typen/uebung.html', 'gemeinsam/typen.js',
                   'gemeinsam/typen/zuordnen.js', 'gemeinsam/typen/sortieren.js', 'gemeinsam/typen/lueckentext.js',
                   'gemeinsam/typen/eingabe.js', 'gemeinsam/typen/beschriften.js', 'gemeinsam/typen/bildwort.js',
                   'gemeinsam/typen/markieren.js', 'daten/inhalte/en/en.5.to-be.json',
                   'daten/inhalte/en/en.5.simple-present.json', 'daten/inhalte/en/en.5.simple-past.json',
                   // Knowing English (Etappe 7): Übersicht und alle Strukturen
                   'apps/englisch/knowing-english.html',
                   'apps/englisch/time-dates-numbers.html',  // Etappe 8
                   'apps/mathe/zahlenstrahl.html', 'apps/mathe/stellenwerttafel.html', 'gemeinsam/ziffernblock.js',  // Etappe 9
                   'daten/inhalte/ma/ma.5.geometrie.json',  // Etappe 10 (Bilder lädt das iPad beim ersten Üben)
                   'daten/inhalte/en/en.5.can.json', 'daten/inhalte/en/en.5.fragen.json', 'daten/inhalte/en/en.5.have-got.json',
                   'daten/inhalte/en/en.5.knowing-english.json', 'daten/inhalte/en/en.5.nomen.json', 'daten/inhalte/en/en.5.praepositionen.json',
                   'daten/inhalte/en/en.5.present-progressive.json', 'daten/inhalte/en/en.5.pronomen.json', 'daten/inhalte/en/en.5.there-is.json',
                   'daten/inhalte/en/en.6.future.json', 'daten/inhalte/en/en.6.some-any.json', 'daten/inhalte/en/en.6.steigerung.json'];
const NACHLADEN_PAUSE_MS = 400;   // Pause zwischen zwei Dateien
const NACHLADEN_MAX_MS   = 25000; // pro Anstoß höchstens so lange (iOS beendet Hintergrundarbeit sonst)
const FEST = /\/(vendor|fonts|icons)\//;      // ändern sich (fast) nie
const WARTEN_MS = 4000;                        // so lange auf das Netz warten

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(START.map(u => c.add(u).catch(() => {})))));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    // Was das iPad schon hatte (nachgeladene Spiele, besuchte Apps), in den neuen Speicher
    // übernehmen – sonst müsste nach jedem Update alles neu geladen werden. Ist Internet da,
    // kommt trotzdem immer die aktuelle Datei („Internet zuerst“).
    const nr = k => parseInt(k.slice(PRAEFIX.length), 10) || 0;
    const alte = (await caches.keys()).filter(k => k.startsWith(PRAEFIX) && k !== CACHE).sort((a, b) => nr(a) - nr(b));
    if (alte.length) {
      try {
        const neu = await caches.open(CACHE), alt = await caches.open(alte[alte.length - 1]);
        for (const req of await alt.keys()) {
          if (await neu.match(req)) continue;
          const res = await alt.match(req);
          if (res) await neu.put(req, res);
        }
      } catch (err) {}
    }
    // nur eigene, ältere Speicher löschen (nie die der anderen Umgebung)
    for (const k of alte) await caches.delete(k);
    await self.clients.claim();
  })());
});

// ── Gestaffeltes Nachladen (Etappe 2) ───────────────────
let nachladenLaeuft = null;
self.addEventListener('message', e => {
  if (!e.data || e.data.lw !== 'nachladen') return;
  if (!nachladenLaeuft) nachladenLaeuft = nachladen().catch(() => {}).then(() => { nachladenLaeuft = null; });
  e.waitUntil(nachladenLaeuft);
});
async function nachladen() {
  const cache = await caches.open(CACHE), bis = Date.now() + NACHLADEN_MAX_MS;
  for (const u of NACHLADEN) {
    if (Date.now() > bis) return;
    if (await cache.match(u, { ignoreSearch: true })) continue;
    try {
      const res = await fetch(u, { cache: 'no-cache' });
      if (res.ok) await cache.put(u, res);
    } catch (err) { return; }                       // offline → beim nächsten Anstoß weiter
    await new Promise(r => setTimeout(r, NACHLADEN_PAUSE_MS));
  }
}

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;   // Worker/Admin-Anfragen nie anfassen
  e.respondWith(FEST.test(url.pathname) ? speicherZuerst(req) : netzZuerst(req));
});

async function speicherZuerst(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req, { ignoreSearch: true });
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

async function netzZuerst(req) {
  const cache = await caches.open(CACHE);
  const netz = fetch(req).then(res => {
    if (res.ok) cache.put(req, res.clone());
    return res;
  });
  const alt = () => cache.match(req, { ignoreSearch: true })
    .then(hit => hit || (req.mode === 'navigate' ? cache.match('index.html') : null));
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
