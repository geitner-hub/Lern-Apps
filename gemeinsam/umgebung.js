// ═══════════════════════════════════════════════════════
//  Lernwelt – umgebung.js   (Umgebung, Version, Speicher-Register)
//
//  Muss auf JEDER Seite als ERSTES Skript im <head> stehen, direkt nach
//  <meta charset>, z. B. in apps/mathe/:
//    <script src="../../gemeinsam/umgebung.js"></script>
//  (werkzeuge/pruefen.py prüft das bei jedem Upload.)
//
//  Stellt bereit: window.LW
//    LW.UMGEBUNG   'live' | 'test' | 'lokal'
//    LW.TEST       true in der Testumgebung (…/Lern-Apps-test/)
//    LW.VERSION    Stand der Lernwelt – MUSS gleich sein wie VERSION in sw.js
//    LW.SPEICHER   Register aller Speicherschlüssel (unten)
//    LW.schluessel(name)  Name für NEUE Schlüssel: 'lernwelt-' + name
//    LW.ROOT       Adresse des Hauptordners (mit / am Ende)
//    LW.laden(pfad)       Skript bei Bedarf nachladen, z. B. LW.laden('gemeinsam/qrcode.js')
//                         → Promise; jedes Skript wird nur einmal geladen (Etappe 2)
//    LW.fehler     Fehlerprotokoll: liste(), leeren(), merken(text, wo)   (Etappe 2)
//    LW.speicher   fehlgeschlagen(e) aus catch-Blöcken, voll()   (Etappe 2)
//  Fehlerprotokoll: nur auf dem Gerät (Pass → Sicherung → 5× Versionszeile).
//  Hintergrund-Laden: nach jedem Seitenaufruf bittet diese Datei sw.js, fehlende
//  Spiele/Daten nachzuladen (zufällig verzögert, nicht alle iPads gleichzeitig).
//
//  Testumgebung (…/Lern-Apps-test/): Präfix 'lwtest-' für jeden Speicherschlüssel,
//  Schreibzugriffe auf den Worker gesperrt, Schild „🧪 TEST“ (werkzeuge/TESTUMGEBUNG.md).
//  Live ändert sich NICHTS: kein Schlüssel wird umbenannt.
// ═══════════════════════════════════════════════════════

(function () {
  'use strict';
  if (window.LW && window.LW.UMGEBUNG) return;          // doppeltes Laden verhindern

  const VERSION = 'v39';                                 // ⚙ bei jedem Upload mit sw.js zusammen erhöhen

  // ── Umgebung erkennen ────────────────────────────────
  //  GitHub Pages: erster Pfadteil = Repo-Name (Lern-Apps bzw. Lern-Apps-test)
  const repo = (location.pathname.split('/')[1] || '');
  const UMGEBUNG = /-test$/i.test(repo) ? 'test'
    : (location.protocol === 'file:' || /^(localhost|127\.|192\.168\.)/.test(location.hostname)) ? 'lokal'
    : 'live';
  const TEST = UMGEBUNG === 'test';
  const TEST_PRAEFIX = 'lwtest-';

  // ── Speicher-Register ────────────────────────────────
  //  Jeder Schlüssel, den die Lernwelt im Gerätespeicher benutzt, steht hier.
  //  Format je Zeile (bitte beibehalten, pruefen.py liest diese Liste):
  //    ['schlüssel', 'local'|'session', 'Besitzer-Datei', 'Zweck', in Sicherungskarte?],
  //  Neue Schlüssel: Name mit 'lernwelt-' beginnen und hier eintragen.
  //  Bestehende Namen NIE ändern – sie stehen in den Spielständen der Kinder.
  const SPEICHER = [
    // Lernwelt-Pass, Ergebnisse, Sicherung
    ['lernwelt-pass',               'local',   'gemeinsam/pass.js',        'Lernwelt-Pass: XP, Level, Serie, Sterne, Garderobe', true],
    ['lern-apps-results',           'local',   'gemeinsam/navbar.js',      'Ergebnisse aller Lern-Apps (letzte Runden je App)', true],
    ['lernwelt-inhalte-cache',      'local',   'gemeinsam/pass.js',        'Offline-Kopie von daten/lernwelt-inhalte.json', false],
    ['lernwelt-safari-hinweis',     'local',   'gemeinsam/pass.js',        'Hinweis „im Home-Bildschirm öffnen“ heute schon gezeigt', false],
    ['lernwelt-avatar-bild',        'local',   'gemeinsam/avatar3d.js',    'Vorschaubild des Avatars (Porträt)', false],
    ['lernwelt-sync',               'local',   'gemeinsam/sync.js',        'Verbindung zur Sicherungskarte (Code, Stand)', false],
    ['lernwelt-statistik',          'local',   'gemeinsam/sync.js',        'Gruppenauswertung: noch nicht gesendete Summen je Thema und Woche (nur mit Karte)', false],
    ['lernwelt-sync-hinweis',       'session', 'gemeinsam/sync.js',        'Meldung „Pass wurde aktualisiert“ nach dem Neuladen', false],
    // Technik (Etappe 2)
    ['lernwelt-fehler',             'local',   'gemeinsam/umgebung.js',    'Fehlerprotokoll (letzte Abstürze, nur auf diesem Gerät)', false],
    ['lernwelt-wartung',            'local',   'gemeinsam/pass-extras.js', 'Speicher-Wartung: letzter Lauf und Belegung', false],
    ['lernwelt-admin-entwurf',      'local',   'gemeinsam/admin/kern.js',  'Admin: unveröffentlichter Entwurf der config.json', false],
    ['lernwelt-admin-vorschau',     'local',   'gemeinsam/admin/ordnen.js','Admin: Stand für die Schülervorschau der Startseite', false],
    ['lernwelt-fehlerheft',         'local',   'gemeinsam/ueben.js',       'Fehlerheft: falsch gelöste Aufgaben (Etappe 8 zeigt sie an)', false],
    // Konfiguration und Admin
    ['lernwelt-config-cache',       'local',   'gemeinsam/config-api.js',  'Offline-Kopie von config.json', false],
    ['lernwelt-katalog-cache',      'local',   'gemeinsam/katalog.js',     'Offline-Kopie von daten/katalog.json', false],
    ['lernwelt-config-cache-ts',    'local',   'gemeinsam/config-api.js',  'Zeitpunkt der Offline-Kopie von config.json', false],
    ['lernwelt-admin-schluessel',   'local',   'gemeinsam/config-api.js',  'Admin-Anmeldung (Schlüssel, 7 Tage gültig)', false],
    ['lernwelt-admin-pw',           'session', 'gemeinsam/config-api.js',  'ALT: früher Passwort im Tab, wird nur noch gelöscht', false],
    // Startseite
    ['lern-apps-view',              'local',   'index.html',               'Ansicht der Startseite (Kacheln/Liste)', false],
    ['lernwelt-gruss',              'local',   'index.html',               'Begrüßung heute schon gezeigt', false],
    // Mein Dorf
    ['lernwelt-dorf',               'local',   'gemeinsam/dorf-kern.js',   'Spielstand „Mein Dorf“', true],
    ['lernwelt-dorf-inhalte-cache', 'local',   'gemeinsam/dorf-kern.js',   'Offline-Kopie von daten/dorf-inhalte.json', false],
    ['lernwelt-dorf-besuch',        'local',   'spiele/dorf.html',         'Letzter Besuch im Dorf („Willkommen zurück“)', false],
    // Spiele
    ['lernwelt-expedition',         'local',   'spiele/expedition.html',   'Spielstand Entdecker-Expedition', true],
    ['lern-kitchen-chaos',          'local',   'spiele/kitchen-chaos.html','Spielstand Kitchen-Chaos', false],
    ['lern-wort-des-tages',         'local',   'spiele/wort-des-tages.html','Spielstand Wort des Tages', false],
    ['lern-runner-wahl',            'local',   'spiele/runner.html',       'RUN!: zuletzt gewählte Einstellungen', false],
    ['lern-runner-rekorde',         'local',   'spiele/runner.html',       'RUN!: Rekorde', false],
    ['lern-burg-wahl',              'local',   'spiele/burg-verteidigung.html', 'Tower Defense: zuletzt gewählte Einstellungen', false],
    ['lern-burg-rekorde',           'local',   'spiele/burg-verteidigung.html', 'Tower Defense: Rekorde', false],
    ['lern-tauziehen-wahl',         'local',   'spiele/tauziehen.html',    'Tauziehen-Duell: zuletzt gewählte Einstellungen', false],
    ['lern-zauberwort-wahl',        'local',   'spiele/zauberwort.html',   'Zauberwort: zuletzt gewählte Einstellungen', false],
    ['lern-zauberwort-rekord',      'local',   'spiele/zauberwort.html',   'Zauberwort: Rekord', false],
    // Lern-Apps mit eigenem Speicher
    ['laender-finder-best',         'local',   'apps/gpg/laender-finder.html', 'Länder-Finder: Bestzeiten je Modus', false],
    ['lernwelt-bayern-best',        'local',   'apps/gpg/bayern.html',     'Auskennen in Bayern: Bestwerte je Modus', false],
    ['rechenArena_ballonHighscore', 'local',   'apps/mathe/rechen-arena.html', 'Rechen-Arena: Highscore Ballon-Pop', false],
    ['vokab-history-kl5',           'local',   'apps/englisch/vokabeltrainer.html?klasse=5', 'Vokabeltrainer 5: Verlauf', false],
    ['vokab-word-stats-kl5',        'local',   'apps/englisch/vokabeltrainer.html?klasse=5', 'Vokabeltrainer 5: Statistik je Wort', false],
    ['vokab-a11y-kl5',              'local',   'apps/englisch/vokabeltrainer.html?klasse=5', 'Vokabeltrainer 5: Lese-Einstellungen', false],
    ['vokab-history-kl6',           'local',   'apps/englisch/vokabeltrainer.html?klasse=6', 'Vokabeltrainer 6: Verlauf', false],
    ['vokab-word-stats-kl6',        'local',   'apps/englisch/vokabeltrainer.html?klasse=6', 'Vokabeltrainer 6: Statistik je Wort', false],
    ['vokab-a11y-kl6',              'local',   'apps/englisch/vokabeltrainer.html?klasse=6', 'Vokabeltrainer 6: Lese-Einstellungen', false],
  ].map(([key, art, datei, zweck, sync]) => ({ key, art, datei, zweck, sync }));

  // ── Testumgebung: Speicher trennen ───────────────────
  //  Jeder Zugriff auf localStorage/sessionStorage läuft über das Präfix.
  //  Aufzählen (length, key(i)) zeigt nur die eigenen Test-Schlüssel.
  if (TEST) {
    try {
      const P = Storage.prototype;
      const get = P.getItem, set = P.setItem, rem = P.removeItem, key = P.key;
      const lenGet = Object.getOwnPropertyDescriptor(P, 'length').get;
      const zu = k => { k = String(k); return k.startsWith(TEST_PRAEFIX) ? k : TEST_PRAEFIX + k; };
      const eigene = st => {
        const out = [];
        const n = lenGet.call(st);
        for (let i = 0; i < n; i++) { const k = key.call(st, i); if (k && k.startsWith(TEST_PRAEFIX)) out.push(k); }
        return out;
      };
      P.getItem    = function (k) { return get.call(this, zu(k)); };
      P.setItem    = function (k, v) { return set.call(this, zu(k), v); };
      P.removeItem = function (k) { return rem.call(this, zu(k)); };
      P.key        = function (i) { const k = eigene(this)[i]; return k === undefined ? null : k.slice(TEST_PRAEFIX.length); };
      P.clear      = function () { eigene(this).forEach(k => rem.call(this, k)); };
      Object.defineProperty(P, 'length', { configurable: true, get() { return eigene(this).length; } });
    } catch (e) { console.warn('[Lernwelt] Speicher-Trennung nicht möglich:', e); }

    // ── Testumgebung: nichts Echtes schreiben ──────────
    //  Erlaubt: Lesen vom Worker (GET) und die Admin-Anmeldung.
    //  Gesperrt: Speichern (PUT), alle Geräte abmelden, Sicherungskarten, Cloud-Sicherung.
    try {
      const echtFetch = window.fetch.bind(window);
      window.fetch = function (input, init) {
        try {
          const url = new URL(typeof input === 'string' ? input : (input && input.url) || String(input), location.href);
          if (/\.workers\.dev$/i.test(url.hostname)) {
            const m = String((init && init.method) || (input && input.method) || 'GET').toUpperCase();
            const ok = (m === 'GET' && !url.pathname.startsWith('/sync'))
                    || (m === 'POST' && (url.pathname === '/login' || url.pathname === '/session'));
            if (!ok) {
              return Promise.resolve(new Response(
                JSON.stringify({ error: 'Testumgebung: Speichern und Sicherung sind hier abgeschaltet.' }),
                { status: 423, headers: { 'Content-Type': 'application/json' } }));
            }
          }
        } catch (e) {}
        return echtFetch(input, init);
      };
    } catch (e) {}

    // Schild „🧪 TEST“ und Titel, damit man die Seiten nicht verwechselt
    const schild = () => {
      try {
        if (!/^🧪/.test(document.title)) document.title = '🧪 ' + document.title;
        if (document.getElementById('lw-test-schild')) return;
        const s = document.createElement('div');
        s.id = 'lw-test-schild';
        s.textContent = '🧪 TEST · ' + VERSION;
        s.style.cssText = 'position:fixed;top:0;left:50%;transform:translateX(-50%);z-index:2147483647;' +
          'background:#f97316;color:#111;font:800 11px/1 system-ui,sans-serif;padding:3px 10px 4px;' +
          'border-radius:0 0 8px 8px;pointer-events:none;letter-spacing:.04em;opacity:.92';
        document.body.appendChild(s);
      } catch (e) {}
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schild); else schild();
  }

  // ── Hauptordner und Nachladen (Etappe 2) ─────────────
  //  umgebung.js liegt in gemeinsam/ → Hauptordner = eine Ebene höher.
  const HIER = (document.currentScript && document.currentScript.src) || location.href;
  const ROOT = new URL('../', HIER).href;
  const geladen = {};
  /** Skript bei Bedarf laden (Pfad ab Hauptordner). Mehrfach-Aufrufe teilen sich ein Promise. */
  function laden(pfad) {
    const url = new URL(pfad, ROOT).href;
    if (!geladen[url]) {
      geladen[url] = new Promise((ok, fehl) => {
        const sc = document.createElement('script');
        sc.src = url;
        sc.onload = () => ok();
        sc.onerror = () => { delete geladen[url]; fehl(new Error('Nicht geladen: ' + pfad)); };
        (document.head || document.documentElement).appendChild(sc);
      });
    }
    return geladen[url];
  }

  // ── Fehlerprotokoll (Etappe 2) ───────────────────────
  const FEHLER_KEY = 'lernwelt-fehler';
  const FEHLER_MAX = 30;
  const FEHLER_SENDEN = false;   // ⚙ erst nach Zustimmung der Schulleitung auf true (Worker-Route /fehler fehlt noch)
  const FEHLER_URL = 'https://lern-apps-config.bennigeitner.workers.dev/fehler';
  function fehlerListe() {
    try { const l = JSON.parse(localStorage.getItem(FEHLER_KEY) || '[]'); return Array.isArray(l) ? l : []; } catch (e) { return []; }
  }
  function fehlerMerken(text, wo) {
    try {
      const m = String(text || 'Unbekannter Fehler').slice(0, 200);
      const seite = location.pathname.split('/').slice(-2).join('/');
      const l = fehlerListe();
      const gleich = l.find(f => f.m === m && f.s === seite);
      if (gleich) { gleich.n = (gleich.n || 1) + 1; gleich.t = Date.now(); gleich.v = VERSION; }
      else l.push({ t: Date.now(), m, w: String(wo || '').slice(0, 100), s: seite, v: VERSION });
      l.sort((a, b) => a.t - b.t);
      while (l.length > FEHLER_MAX) l.shift();
      localStorage.setItem(FEHLER_KEY, JSON.stringify(l));
      if (FEHLER_SENDEN && !TEST && navigator.sendBeacon) navigator.sendBeacon(FEHLER_URL, JSON.stringify({ v: VERSION, s: seite, m }));
    } catch (e) {}
  }
  window.addEventListener('error', e => {
    const t = e.target;
    if (t && t !== window && t.tagName === 'SCRIPT') { fehlerMerken('Skript nicht geladen: ' + String(t.src || '').split('/').slice(-2).join('/'), 'Laden'); return; }
    if (t && t !== window) return;                       // Bilder u. Ä. (z. B. offline) nicht protokollieren
    fehlerMerken(e.message, (String(e.filename || '').split('/').pop() || '?') + ':' + (e.lineno || '?'));
  }, true);
  window.addEventListener('unhandledrejection', e => {
    const r = e.reason;
    fehlerMerken('Promise: ' + (r && r.message ? r.message : String(r)), r && r.stack ? String(r.stack).split('\n')[1] : '');
  });

  // ── Speicher voll? (Etappe 2) ────────────────────────
  //  Messen und Verdichten macht pass-extras.js (Speicher-Wartung, einmal am Tag).
  let speicherFehler = false;
  /** Aus catch-Blöcken beim Speichern aufrufen: merkt „Speicher voll“ für die Warnung. */
  function fehlgeschlagen(e) {
    speicherFehler = true;
    fehlerMerken('Speichern fehlgeschlagen: ' + (e && e.name ? e.name : e), 'Speicher');
  }

  // ── Hintergrund-Laden anstoßen (Etappe 2, siehe sw.js) ─
  window.addEventListener('load', () => {
    if (!('serviceWorker' in navigator)) return;
    setTimeout(() => {
      try {
        navigator.serviceWorker.ready.then(r => {
          const w = navigator.serviceWorker.controller || r.active;
          if (w) w.postMessage({ lw: 'nachladen' });
        }).catch(() => {});
      } catch (e) {}
    }, 5000 + Math.random() * 20000);                      // zufällig 5–25 s: nicht alle iPads gleichzeitig
  });

  window.LW = Object.freeze({
    UMGEBUNG, TEST, VERSION, ROOT, laden,
    fehler: Object.freeze({ liste: fehlerListe, merken: fehlerMerken, leeren: () => { try { localStorage.removeItem(FEHLER_KEY); } catch (e) {} } }),
    speicher: Object.freeze({ fehlgeschlagen, voll: () => speicherFehler }),
    SPEICHER: Object.freeze(SPEICHER.map(Object.freeze)),
    schluessel: name => 'lernwelt-' + String(name),
    /** Kurzer Text für Anzeigen, z. B. „v22“ bzw. „v22 · Testumgebung“ */
    versionText: () => VERSION + (TEST ? ' · Testumgebung' : UMGEBUNG === 'lokal' ? ' · lokal' : ''),
  });
})();
