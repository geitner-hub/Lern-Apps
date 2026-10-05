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
//
//  Testumgebung (Repo „Lern-Apps-test“, gleiche Adresse geitner-hub.github.io):
//    - Alle Repos unter geitner-hub.github.io teilen sich den Gerätespeicher.
//      Deshalb bekommt in der Testumgebung JEDER Speicherschlüssel automatisch
//      das Präfix 'lwtest-' (localStorage und sessionStorage). Der echte Pass,
//      das Dorf usw. auf demselben iPad werden nie berührt.
//    - Speichern im Admin, Sicherungskarten und Cloud-Sicherung sind gesperrt
//      (Schreibzugriffe auf den Worker werden hier abgefangen).
//    - Oben erscheint ein kleines Schild „🧪 TEST“.
//  Live ändert sich NICHTS: kein Schlüssel wird umbenannt.
// ═══════════════════════════════════════════════════════

(function () {
  'use strict';
  if (window.LW && window.LW.UMGEBUNG) return;          // doppeltes Laden verhindern

  const VERSION = 'v23';                                 // ⚙ bei jedem Upload mit sw.js zusammen erhöhen

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
    ['lernwelt-sync-hinweis',       'session', 'gemeinsam/sync.js',        'Meldung „Pass wurde aktualisiert“ nach dem Neuladen', false],
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
    ['rechenArena_ballonHighscore', 'local',   'apps/mathe/rechen-arena.html', 'Rechen-Arena: Highscore Ballon-Pop', false],
    ['vokab-history-kl5',           'local',   'apps/englisch/vokabeltrainer5.html', 'Vokabeltrainer 5: Verlauf', false],
    ['vokab-word-stats-kl5',        'local',   'apps/englisch/vokabeltrainer5.html', 'Vokabeltrainer 5: Statistik je Wort', false],
    ['vokab-a11y-kl5',              'local',   'apps/englisch/vokabeltrainer5.html', 'Vokabeltrainer 5: Lese-Einstellungen', false],
    ['vokab-history-kl6',           'local',   'apps/englisch/vokabeltrainer6.html', 'Vokabeltrainer 6: Verlauf', false],
    ['vokab-word-stats-kl6',        'local',   'apps/englisch/vokabeltrainer6.html', 'Vokabeltrainer 6: Statistik je Wort', false],
    ['vokab-a11y-kl6',              'local',   'apps/englisch/vokabeltrainer6.html', 'Vokabeltrainer 6: Lese-Einstellungen', false],
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

  window.LW = Object.freeze({
    UMGEBUNG, TEST, VERSION,
    SPEICHER: Object.freeze(SPEICHER.map(Object.freeze)),
    schluessel: name => 'lernwelt-' + String(name),
    /** Kurzer Text für Anzeigen, z. B. „v22“ bzw. „v22 · Testumgebung“ */
    versionText: () => VERSION + (TEST ? ' · Testumgebung' : UMGEBUNG === 'lokal' ? ' · lokal' : ''),
  });
})();
