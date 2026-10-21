// ═══════════════════════════════════════════════════════
//  Lernwelt-Admin (neu) – Modul-System und Navigation  (Admin-Umbau Etappe 1)
//
//  Ein Modul ist eine Datei unter gemeinsam/admin/module/ und meldet sich so an:
//
//    LWAdmin.modul({
//      id: 'spielsperre',               // eindeutig, klein, Adresse #/gruppen/spielsperre
//      bereich: 'gruppen',              // start | inhalte | gruppen | motivation | medien | system
//      titel: 'Spielsperre', symbol: '🎮',
//      suchbegriffe: ['Spiele frei'],   // für die globale Suche (Etappe 4)
//      rechte: ['haupt'],               // wer das Modul sieht (Rollen ab Etappe 10); Standard: nur Hauptzugang
//      reihenfolge: 10,                 // optional, kleinere Zahl weiter vorn
//      zeigen(host, ctx) { … }          // zeichnet in host; darf eine Aufräum-Funktion zurückgeben
//    });
//
//  host ist für alle Module dasselbe Element: Wer nachlädt oder store.abonnieren nutzt, gibt eine
//  Aufräum-Funktion zurück, die abbestellt und danach nicht mehr in host zeichnet.
//
//  ctx = { store, gehe(bereich, modul), toast(text, fehler) }
//  Danach die Datei in admin-neu.html bei den Modulen eintragen (pruefen.py prüft das).
// ═══════════════════════════════════════════════════════
'use strict';

window.LWAdmin = window.LWAdmin || {};

(() => {
  const BEREICHE = [
    { id: 'start',      titel: 'Start',      symbol: '🏠', text: 'Überblick, Schnellaktionen und Hinweise' },
    { id: 'inhalte',    titel: 'Inhalte',    symbol: '📚', text: 'Apps, Fächer und Regale, Tags, Freigaben' },
    { id: 'gruppen',    titel: 'Gruppen',    symbol: '👥', text: 'Gruppen und Klassen, Fokus, Spielsperre, Lernwege, Auswertung' },
    { id: 'motivation', titel: 'Motivation', symbol: '🏆', text: 'Pass, Events, Mein Dorf' },
    { id: 'medien',     titel: 'Medien',     symbol: '📁', text: 'Dateien per QR-Code und Kurzlink' },
    { id: 'system',     titel: 'System',     symbol: '⚙️', text: 'Anmeldung und Geräte, Versionen, Diagnose' },
  ];
  const MODULE = [];
  const ID = /^[a-z][a-z0-9-]{0,39}$/;

  /** Modul anmelden (siehe oben) */
  function modul(def) {
    const fehler = m => { console.error('[Admin] Modul ' + (def && def.id) + ': ' + m); };
    if (!def || !ID.test(def.id || '')) return fehler('id fehlt oder ungültig');
    if (MODULE.some(m => m.id === def.id)) return fehler('id doppelt');
    if (!BEREICHE.some(b => b.id === def.bereich)) return fehler('Bereich unbekannt');
    if (typeof def.zeigen !== 'function') return fehler('zeigen() fehlt');
    MODULE.push({
      titel: def.id, symbol: '•', suchbegriffe: [], rechte: ['haupt'], reihenfolge: 100,
      ...def,
    });
    if (gestartet) zeichnen();
  }

  // Rolle des angemeldeten Zugangs – bis Etappe 10 immer der Hauptzugang
  let rolle = 'haupt';
  const darf = m => m.rechte.includes(rolle);
  const moduleIn = bereich => MODULE.filter(m => m.bereich === bereich && darf(m))
    .sort((a, b) => a.reihenfolge - b.reihenfolge || a.titel.localeCompare(b.titel, 'de'));

  // ── Adressen: #/bereich/modul ─────────────────────────
  function adresse() {
    const [b, m] = location.hash.replace(/^#\/?/, '').split('/');
    const bereich = BEREICHE.some(x => x.id === b) ? b : 'start';
    const liste = moduleIn(bereich);
    const mod = liste.find(x => x.id === m) || liste[0] || null;
    return { bereich, modul: mod };
  }
  function gehe(bereich, modulId) {
    const ziel = '#/' + bereich + (modulId ? '/' + modulId : '');
    if (location.hash === ziel) zeichnen(); else location.hash = ziel;
  }

  // ── Zeichnen ──────────────────────────────────────────
  let gestartet = false, aufraeumen = null, ctx = null;

  function zeichnen() {
    const nav = document.getElementById('lw-nav'), kopf = document.getElementById('lw-bereich-kopf'),
          host = document.getElementById('lw-modul');
    if (!nav || !host) return;
    const { bereich, modul: mod } = adresse();
    const b = BEREICHE.find(x => x.id === bereich);

    nav.innerHTML = BEREICHE.map(x => `<a href="#/${x.id}" class="lw-nav-punkt${x.id === bereich ? ' aktiv' : ''}"${x.id === bereich ? ' aria-current="page"' : ''}>
      <span class="lw-nav-symbol" aria-hidden="true">${x.symbol}</span><span class="lw-nav-text">${escHtml(x.titel)}</span></a>`).join('');

    const liste = moduleIn(bereich);
    kopf.innerHTML = `<h1 class="lw-bereich-titel">${b.symbol} ${escHtml(b.titel)}</h1>` +
      (liste.length > 1 ? `<nav class="lw-reiter" aria-label="${escHtml(b.titel)}">${liste.map(m =>
        `<a href="#/${bereich}/${m.id}" class="lw-reiter-punkt${m === mod ? ' aktiv' : ''}">${m.symbol} ${escHtml(m.titel)}</a>`).join('')}</nav>` : '');

    if (typeof aufraeumen === 'function') { try { aufraeumen(); } catch (e) { console.error(e); } }
    aufraeumen = null;
    host.innerHTML = '';
    if (!mod) {
      host.innerHTML = `<div class="lw-leer"><b>${escHtml(b.text)}</b><br>
        Noch leer – kommt in Etappe 2 aus dem bisherigen Admin hierher. Bis dahin: <a href="admin.html">bisheriger Admin</a>.</div>`;
      return;
    }
    try { aufraeumen = mod.zeigen(host, ctx); }
    catch (e) {
      console.error('[Admin] Modul ' + mod.id + ':', e);
      host.innerHTML = `<div class="lw-leer lw-fehler">⚠ Dieses Modul hat einen Fehler: ${escHtml(e.message || String(e))}</div>`;
    }
  }

  /** Nach der Anmeldung einmal aufrufen */
  function starten(c) {
    ctx = c;
    if (!gestartet) window.addEventListener('hashchange', zeichnen);
    gestartet = true;
    zeichnen();
  }

  Object.assign(LWAdmin, {
    BEREICHE, modul, gehe, starten, neuZeichnen: zeichnen,
    module: () => MODULE.filter(darf).slice(),
    rolle: () => rolle,
  });
})();
