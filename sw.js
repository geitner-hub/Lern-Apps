// ═══════════════════════════════════════════════════════
//  Lernwelt – sw.js  (Service Worker: Offline-Speicher)
//
//  Grundsatz seit v121 „Speicher zuerst“ (Aktionsplan Tempo, Etappe 1 – Weg B):
//  Jede Datei kommt sofort aus dem Speicher des iPads, ohne bei GitHub nachzufragen.
//  Aktuell bleibt die Lernwelt über die VERSION: Der Browser prüft sw.js bei jedem
//  Seitenaufruf; steht dort eine neue VERSION, lädt der neue Service Worker den KERN
//  frisch, und umgebung.js lädt die Seite einmal neu.
//    · Skripte, Stile, Seiten, Bilder   Speicher – fehlt die Datei: Netz
//    · config.json                      Netz zuerst (höchstens 1,5 s warten), dann Speicher
//    · daten/…json                      Speicher, dabei im Hintergrund auffrischen – der Admin
//                                       ändert Katalog, Vokabeln usw. OHNE neue VERSION; die
//                                       Änderung ist beim nächsten Öffnen da
//    · vendor/, fonts/, icons/          Speicher (ändern sich nie)
//  Nach einem Update liegen die Dateien der alten Version im Speicher „…-alt“: Sie werden
//  gestaffelt frisch geholt. Braucht ein Kind eine davon vorher, wird genau diese Datei
//  einmal aus dem Netz geholt (1,5 s warten, danach die alte Kopie).
//  Lokal (python3 -m http.server) gilt weiter „Internet zuerst“ – sonst sähe man Änderungen nicht.
//
//  Bei jeder Änderung an geladenen Dateien VERSION erhöhen –
//  und LW.VERSION in gemeinsam/umgebung.js genauso (pruefen.py prüft das).
//  Ohne neue VERSION kommt eine geänderte Datei (außer config.json und daten/…json) NICHT bei den Kindern an.
//
//  Live und Testumgebung (Lern-Apps-test) liegen unter derselben Adresse
//  und teilen sich den Offline-Speicher. Deshalb hat jede Umgebung ihr
//  eigenes Präfix und räumt nur ihre eigenen Speicher auf.
// ═══════════════════════════════════════════════════════
const VERSION = 'v123';  // v123: Hilfe-Stufen (Tipp → Tipp 2 → Lösung) und Selbsteinschätzung im Übungsrahmen
const PRAEFIX = /\/[^/]*-test\/$/i.test(new URL(self.registration.scope).pathname) ? 'lwtest-v' : 'lernwelt-v';
const CACHE   = PRAEFIX + VERSION.replace(/^v/, '');        // z. B. 'lernwelt-v24' (Format wie bisher)
const ALT     = CACHE + '-alt';                             // Dateien der Vorversion, noch nicht aufgefrischt

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
                   'spiele/wort-des-tages.html', 'spiele/zauberwort.html', 'spiele/kitchen-chaos.html', 'spiele/expedition.html', 'spiele/room-detective.html',
                   'gemeinsam/aufgaben.js', 'daten/aufgaben-pools.json', 'gemeinsam/einstellungen.js', 'daten/apps/liste.json', 'daten/apps/burg-verteidigung.json', 'daten/apps/runner.json', 'daten/apps/dorf.json', 'gemeinsam/spiel-hilfen.js', 'gemeinsam/ueben.js', 'apps/mathe/kopfrechnen.html', 'apps/mathe/mathe-trainer.html', 'apps/englisch/vokabeltrainer.html', 'gemeinsam/karten-ansicht.js',
                   'gemeinsam/avatar3d.js', 'gemeinsam/chest3d.js', 'gemeinsam/dorf-szene.js', 'gemeinsam/qrcode.js',
                   'vendor/three.min.js', 'vendor/jsQR.min.js',
                   'daten/vokabeln5.json', 'daten/vokabeln6.json', 'daten/woerter-en.json', 'daten/kitchen-chaos.json', 'daten/room-detective.json',
                   'daten/karten.json', 'daten/expedition.json',
                   'daten/tower-defense.json',  // Tower Defense: Karten, Landschaften, Wellen, Türme, Gegner
                   'spiele/insel.html', 'gemeinsam/insel-welt.js', 'gemeinsam/insel-steuerung.js', 'daten/insel.json',  // Die Insel (Etappen 1–2: Probelauf, Welt und Speichern)
                   'gemeinsam/insel-figuren.js', 'gemeinsam/insel-auftraege.js', 'daten/insel-auftraege.json',  // Etappe 3: Aufträge im Hafendorf
                   'gemeinsam/insel-bauen.js',  // Etappe 4: Bauen
                   'gemeinsam/insel-karte.js',  // Etappe 6: Schatzkarte und Kompass
                   'gemeinsam/spielsperre.js',  // Hinweis auf Spielseiten: erst Lern-Runden (nur mit config.spielsperre)
                   // Weltkarte in Equal Earth (Neue Lern-Apps Etappe 1–2): Daten, Projektion, d3-geo
                   'daten/welt.json', 'gemeinsam/welt-karte.js', 'vendor/d3-geo.min.js',
                   'daten/ozeane.json', 'gemeinsam/globus.js',  // Globus (Etappe 3)
                   'apps/gpg/bayern.html', 'daten/bayern.json',  // Auskennen in Bayern (Etappen 4–5)
                   'apps/mathe/laengeneinheiten.html',
                   // Aufgabentyp-Baukasten (Etappe 9): Seite, Rahmen, Typen (Inhalte aus daten/inhalte/ hier ergänzen)
                   'apps/typen/uebung.html', 'gemeinsam/typen.js',
                   'gemeinsam/typen/zuordnen.js', 'gemeinsam/typen/sortieren.js', 'gemeinsam/typen/lueckentext.js',
                   'gemeinsam/typen/eingabe.js', 'gemeinsam/typen/beschriften.js', 'gemeinsam/typen/bildwort.js',
                   'gemeinsam/typen/markieren.js', 'gemeinsam/typen/fall.js', 'daten/inhalte/en/en.5.to-be.json',
                   'daten/inhalte/en/en.5.simple-present.json', 'daten/inhalte/en/en.5.simple-past.json',
                   // Knowing English (Etappe 7): Übersicht und alle Strukturen
                   'apps/englisch/knowing-english.html',
                   'apps/englisch/time-dates-numbers.html',  // Etappe 8
                   'apps/mathe/zahlenstrahl.html', 'apps/mathe/stellenwerttafel.html', 'gemeinsam/ziffernblock.js',  // Etappe 9
                   'daten/inhalte/ma/ma.5.geometrie.json', 'daten/inhalte/gpg/gpg.5.quellen.json',  // Etappe 10 (Bilder lädt das iPad beim ersten Üben)
                   'daten/inhalte/en/en.5.can.json', 'daten/inhalte/en/en.5.fragen.json', 'daten/inhalte/en/en.5.have-got.json',
                   'daten/inhalte/en/en.5.knowing-english.json', 'daten/inhalte/en/en.5.nomen.json', 'daten/inhalte/en/en.5.praepositionen.json',
                   'daten/inhalte/en/en.5.present-progressive.json', 'daten/inhalte/en/en.5.pronomen.json', 'daten/inhalte/en/en.5.there-is.json',
                   'daten/inhalte/en/en.6.future.json', 'daten/inhalte/en/en.6.some-any.json', 'daten/inhalte/en/en.6.steigerung.json',
                   'daten/inhalte/en/en.6.simple-past.json', 'daten/inhalte/en/en.6.was-were.json', 'daten/inhalte/en/en.6.objektpronomen.json',
                   'daten/inhalte/en/en.6.there-is.json', 'daten/inhalte/en/en.6.plural.json', 'daten/inhalte/en/en.6.can-mustnt.json',
                   'daten/inhalte/en/en.6.unit-check.json', 'daten/journey6.json', 'daten/journey/bausteine-en6.json',  // English Journey Year 6: Stationen Unit 1–2, Weg-Daten, Bausteine (Hefteinträge, Übungen)
                   'daten/inhalte/en/en.6.should.json', 'daten/inhalte/en/en.6.much-many.json', 'daten/inhalte/en/en.6.good-better-best.json',
                   'daten/inhalte/en/en.6.superlativ.json', 'daten/inhalte/en/en.6.have-to.json', 'daten/inhalte/en/en.6.zeitangaben.json',
                   'daten/inhalte/en/en.6.simple-past-story.json', 'daten/inhalte/en/en.6.will-meinung.json', 'daten/inhalte/en/en.6.wortstellung.json', 'daten/inhalte/en/en.6.linking-words.json', 'daten/inhalte/en/en.6.praepositionen.json',
                   'daten/inhalte/en/en.6.revision.json',  // English Journey Year 6: Stationen Unit 3–5 und Finale
                   'apps/englisch/journey-anwenden.html', 'gemeinsam/journey-kern.js',  // English Journey Year 6: Anwenden-Stationen, Regeln
                   'apps/englisch/english-journey.html', 'gemeinsam/journey-welt.js', 'gemeinsam/journey-lernweg.js',  // English Journey Year 6: 3D-Weg (three.js lädt avatar3d.js), Laufzettel
                   'gemeinsam/lernweg-zurueck.js',  // Knopf „Zurück zum Weg“ (English Journey)
                   'apps/typen/weg.html', 'gemeinsam/weg-kern.js', 'daten/wege/liste.json', 'daten/wege/test.json', 'daten/wege/bausteine-test.json',  // Lernweg-Engine in 2D (Tempo Etappe 2): neuen Weg hier ergänzen
                   'gemeinsam/einschaetzung.js', 'daten/features.json',  // Selbsteinschätzung (Tempo Etappe 4; lädt nur mit Feature-Schalter)
                   'apps/typen/live.html', 'gemeinsam/live-fragen.js'];  // Live-Abfrage (Seite der Kinder; antworten geht nur online)
const NACHLADEN_PAUSE_MS = 400;   // Pause zwischen zwei Dateien
const NACHLADEN_MAX_MS   = 25000; // pro Anstoß höchstens so lange (iOS beendet Hintergrundarbeit sonst)
const FEST = /\/(vendor|fonts|icons)\//;      // ändern sich (fast) nie
const DATEN = /\/daten\/.+\.json$/;          // pflegt zum Teil der Admin, ohne neue VERSION → im Hintergrund auffrischen
const DATEN_FRISCH_MS = 5 * 60 * 1000;       // je Datendatei höchstens so oft nachfragen
const WARTEN_MS = 1500;                      // so lange auf das Netz warten (config.json, Dateien der Vorversion)
const LOKAL = /^(localhost|127\.|192\.168\.)/.test(location.hostname);
const M = { ignoreVary: true };
/** Schlüssel im Speicher: Adresse ohne ?Parameter (uebung.html?inhalt=… ist immer dieselbe Datei) */
const sl = u => { const x = new URL(u, self.registration.scope); return x.origin + x.pathname; };
const INDEX = sl('index.html');

self.addEventListener('install', e => {
  self.skipWaiting();
  // frisch von GitHub holen (nicht die bis zu 10 Minuten alte Browser-Kopie in den neuen Speicher legen)
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(START.map(u => c.add(new Request(u, { cache: 'no-cache' })).catch(() => {})))));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    // Was das iPad schon hatte (nachgeladene Spiele, besuchte Apps), bleibt offline da: Es wandert in den
    // Speicher „-alt“ und wird von dort gestaffelt aufgefrischt (nachladen). Unveränderliches (vendor, fonts,
    // icons) kommt gleich in den neuen Speicher. Ältere Speicher zuerst, damit die neueste Kopie gewinnt.
    const nr = k => parseInt(k.slice(PRAEFIX.length), 10) || 0;
    const alte = (await caches.keys()).filter(k => k.startsWith(PRAEFIX) && k !== CACHE && k !== ALT)
      .sort((a, b) => nr(a) - nr(b) || (a.endsWith('-alt') ? -1 : 1));
    try {
      const neu = await caches.open(CACHE), alt = await caches.open(ALT);
      for (const k of alte) {
        const c = await caches.open(k);
        for (const req of await c.keys()) {
          const s = sl(req.url);
          if (await neu.match(s, M)) continue;
          const res = await c.match(req, M);
          if (res && res.status === 200) await (FEST.test(s) ? neu : alt).put(s, res);
        }
      }
    } catch (err) {}
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
  const cache = await caches.open(CACHE), alt = await caches.open(ALT), bis = Date.now() + NACHLADEN_MAX_MS;
  const pause = () => new Promise(r => setTimeout(r, NACHLADEN_PAUSE_MS));
  // Wartet schon eine neuere Version, sofort aufhören: Solange hier gearbeitet wird, kann sie nicht übernehmen.
  const vorbei = () => Date.now() > bis || !!(self.registration.waiting || self.registration.installing);
  // 1. Dateien der Vorversion auffrischen – zuletzt dazugekommene zuerst
  for (const req of (await alt.keys()).reverse()) {
    if (vorbei()) return;
    const s = sl(req.url);
    try {
      const res = await fetch(s, { cache: 'no-cache' });
      if (res.ok && !res.redirected) await cache.put(s, res);
      if (res.ok || res.status === 404) await alt.delete(req);      // 404: Datei gibt es nicht mehr
    } catch (err) { return; }                       // offline → beim nächsten Anstoß weiter
    await pause();
  }
  // 2. Was noch nie auf diesem iPad war
  for (const u of NACHLADEN) {
    if (vorbei()) return;
    if (await cache.match(sl(u), M)) continue;
    try {
      const res = await fetch(u, { cache: 'no-cache' });
      if (res.ok) await cache.put(sl(u), res);
    } catch (err) { return; }
    await pause();
  }
}

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;   // Worker/Admin-Anfragen nie anfassen
  if (req.headers.has('range')) return;                                  // Ton/Video in Stücken: der Browser macht das selbst
  const config = /\/config\.json$/.test(url.pathname);
  e.respondWith(config || (LOKAL && !FEST.test(url.pathname)) ? netzZuerst(e, req) : speicherZuerst(e, req));
});

/** Seitenaufrufe vertragen keine Antwort, die aus einer Weiterleitung stammt (Safari) → neu verpacken */
function fuer(req, res) {
  return res && res.redirected && req.mode === 'navigate'
    ? new Response(res.body, { status: res.status, statusText: res.statusText, headers: res.headers }) : res;
}
const zuLangsam = () => new Promise(r => setTimeout(r, WARTEN_MS, 'timeout'));

/** Bei GitHub nachfragen statt die Browser-Kopie (bis 10 Min. alt) zu nehmen.
 *  Seitenaufrufe (navigate) lassen sich nicht mit Optionen kopieren → über die Adresse;
 *  endet das in einer Weiterleitung, normal laden (Safari mag umgeleitete Antworten nicht). */
function holeFrisch(req) {
  if (req.mode === 'navigate') {
    return fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' })
      .then(res => res.redirected ? fetch(req) : res)
      .catch(() => fetch(req));
  }
  try { return fetch(req, { cache: 'no-cache' }); } catch (e) { return fetch(req); }
}
/** Aus dem Netz holen und in den Speicher dieser Version legen */
async function holen(req, cache) {
  const res = await holeFrisch(req);
  if (res.status === 200 && !res.redirected) {
    const s = sl(req.url);
    await cache.put(s, res.clone());
    caches.open(ALT).then(a => a.delete(s)).catch(() => {});
  }
  return res;
}

const datenZeit = new Map();
async function speicherZuerst(e, req) {
  const cache = await caches.open(CACHE), s = sl(req.url);
  const hit = await cache.match(s, M);
  if (hit) {
    if (DATEN.test(s) && Date.now() - (datenZeit.get(s) || 0) > DATEN_FRISCH_MS) {
      datenZeit.set(s, Date.now());
      e.waitUntil(fetch(s, { cache: 'no-cache' }).then(res => res.ok && !res.redirected ? cache.put(s, res) : null).catch(() => {}));
    }
    return fuer(req, hit);
  }
  // Nicht im Speicher dieser Version: einmal aus dem Netz. Rückfall: Kopie der Vorversion, bei Seiten die Startseite.
  const netz = holen(req, cache);
  const alt = fuer(req, await (await caches.open(ALT)).match(s, M));
  const ersatz = async () => alt || (req.mode === 'navigate' ? fuer(req, await cache.match(INDEX, M)) : null);
  try {
    const erst = alt ? await Promise.race([netz, zuLangsam()]) : await netz;
    if (erst !== 'timeout') return erst.ok || !alt ? erst : alt;
    e.waitUntil(netz.catch(() => {}));            // langsames WLAN: alte Kopie zeigen, die neue trotzdem fertig holen
    return alt;
  } catch (err) {
    const hit2 = await ersatz();
    if (hit2) return hit2;
    throw err;
  }
}

/** config.json (und alles beim lokalen Entwickeln): Netz zuerst, nach WARTEN_MS die gespeicherte Kopie */
async function netzZuerst(e, req) {
  const cache = await caches.open(CACHE), s = sl(req.url);
  const netz = holen(req, cache);
  const alt = async () => fuer(req, await cache.match(s, M) || await (await caches.open(ALT)).match(s, M)
    || (req.mode === 'navigate' ? await cache.match(INDEX, M) : null));
  try {
    const erst = await Promise.race([netz, zuLangsam()]);
    if (erst !== 'timeout') return erst;
    e.waitUntil(netz.catch(() => {}));
    return (await alt()) || await netz;         // langsames WLAN: gespeicherte Kopie, sonst weiter warten
  } catch (err) {
    const hit = await alt();
    if (hit) return hit;
    throw err;
  }
}
