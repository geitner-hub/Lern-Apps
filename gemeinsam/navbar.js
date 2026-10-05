// ═══════════════════════════════════════════════════════
//  Lern-Apps Navbar – navbar.js
//  Einbindung: <script src="../../gemeinsam/navbar.js"></script>
//  am Ende des <body> jeder App-Seite einfügen (Pfad je nach Ordnertiefe).
//
//  Ergebnisse speichern (optional, aus der App heraus):
//
//    LernApps.saveResult({
//      score: 8,        // erreichte Punkte (Zahl)
//      max:   10,       // maximale Punkte  (Zahl)
//      label: '8 / 10', // Anzeigetext (optional)
//      skill: 'einmaleins-7', // Kompetenz-Kennung (optional, für später)
//      inhalt: 'kopf5-mittel' // geübter Stoff für „Meine Themen“ in den Spielen
//                             // (optional, String oder Array, z. B. 'vok5:unit1/theme1')
//    });
//
//  Das war's. Home-Button, Ergebnisanzeige und Lernwelt-Pass
//  (XP-Meldung) erscheinen automatisch. pass.js und dorf-kern.js
//  („Mein Dorf“: Aufträge zählen mit) werden von hier nachgeladen –
//  Apps müssen nichts weiter einbinden.
// ═══════════════════════════════════════════════════════

(function () {
  const STORE_KEY = 'lern-apps-results';
  const HISTORY_MAX = 30;
  let roundStart = Date.now();

  // pass.js aus demselben Ordner wie navbar.js laden
  const BASE = (document.currentScript && document.currentScript.src)
    ? document.currentScript.src.replace(/[^/]*$/, '') : '';
  // Hauptordner der Lernwelt (navbar.js liegt in gemeinsam/)
  const ROOT = BASE ? new URL('../', BASE).href : '';
  const HOME = ROOT + 'index.html';
  function loadPass() {
    if (window.LernPass || document.getElementById('lw-pass-script')) return;
    const sc = document.createElement('script');
    sc.id = 'lw-pass-script';
    sc.src = BASE + 'pass.js';
    document.head.appendChild(sc);
  }
  loadPass();
  // „Mein Dorf“: zählt Runden für Aufträge mit, auch wenn das Dorf nicht offen ist
  (function loadDorf() {
    if (window.LernDorf || document.getElementById('lw-dorf-script') || !BASE) return;
    const sc = document.createElement('script');
    sc.id = 'lw-dorf-script';
    sc.src = BASE + 'dorf-kern.js';
    document.head.appendChild(sc);
  })();
      // Automatische Pass-Sicherung (Sicherungskarte): erst sync-code.js, dann sync.js
    (function loadSync() {
      if (window.LernSync || document.getElementById('lw-sync-code-script') || !BASE) return;
      const a = document.createElement('script');
      a.id = 'lw-sync-code-script';
      a.src = BASE + 'sync-code.js';
      a.onload = () => {
        const b = document.createElement('script');
        b.id = 'lw-sync-script';
        b.src = BASE + 'sync.js';
        document.head.appendChild(b);
      };
      document.head.appendChild(a);
    })();
  if ('serviceWorker' in navigator && ROOT) {
    window.addEventListener('load', () => navigator.serviceWorker.register(ROOT + 'sw.js').catch(() => {}));
  }

  // ── Hilfsfunktionen ─────────────────────────────────
  // Schlüssel = Dateiname + URL-Parameter, damit z. B. kopfrechnen.html?kl=5
  // und kopfrechnen.html?kl=6 getrennte Ergebnisse haben.
  function getPageKey() {
    return (location.pathname.split('/').pop() || 'index.html') + location.search;
  }
  function loadResults() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); }
    catch(e) { return {}; }
  }
  function getResult() {
    return loadResults()[getPageKey()] || null;
  }
  // Inhalt-ID(s) für „Meine Themen“ säubern → Array
  function normInhalt(v) {
    const l = Array.isArray(v) ? v : (v ? [v] : []);
    return [...new Set(l.filter(x => typeof x === 'string' && /^[a-z0-9][a-z0-9:/_.+-]{0,79}$/i.test(x)))].slice(0, 10);
  }

  let tastaturLoslassen = () => {};                 // wird vom Tastatur-Halter (unten) gesetzt

  // ── Öffentliche API ─────────────────────────────────
  window.LernApps = {
    /**
     * Ergebnis speichern – aus jeder App aufrufbar.
     * @param {object} result - { score, max, label? }
     *
     * Beispiel am Ende einer Übung:
     *   LernApps.saveResult({ score: 8, max: 10 });
     */
    saveResult(result, maxArg) {
      tastaturLoslassen();                           // Runde vorbei → Bildschirmtastatur darf zu
      // Auch alte Schreibweise saveResult(richtig, gesamt) unterstützen
      if (typeof result === 'number') result = { score: result, max: maxArg };
      const score = Number(result && result.score) || 0;
      const max   = Number(result && result.max)   || 0;
      const pct   = max > 0 ? Math.max(0, Math.min(100, Math.round((score / max) * 100))) : 0;
      const all   = loadResults();
      const key   = getPageKey();
      const prev  = all[key] || {};
      // Verlauf der letzten Versuche (Grundlage für spätere Level/Serien/Meisterschaft)
      const history = Array.isArray(prev.history) ? prev.history.slice(-(HISTORY_MAX - 1)) : [];
      history.push({ t: Date.now(), p: pct });
      all[key] = {
        score, max,
        label:     String((result && result.label) || (score + ' / ' + max)).slice(0, 40),
        percent:   pct,
        best:      Math.max(pct, Number(prev.best) || 0),
        plays:     (Number(prev.plays) || 0) + 1,
        timestamp: Date.now(),
        history,
        ...(result && result.skill ? { skill: String(result.skill).slice(0, 60) } : {}),
      };
      try { localStorage.setItem(STORE_KEY, JSON.stringify(all)); } catch (e) {}
      updateBadge(all[key]);
      // Signal für Erweiterungen
      try { window.dispatchEvent(new CustomEvent('lernapps:result', { detail: { key, ...all[key] } })); } catch (e) {}

      // ── Lernwelt-Pass: XP vergeben ──
      if (max > 0) {
        const now = Date.now();
        const seconds = (now - roundStart) / 1000;   // Dauer seit Seitenaufruf bzw. letztem Ergebnis
        roundStart = now;
        const entry = { key, score, max, seconds };
        const inhalt = normInhalt(result && result.inhalt);
        if (inhalt.length) entry.inhalt = inhalt;
        if (window.LernPass) {
          const P = window.LernPass, res = P.award(entry);
          P.toast(res);
          if (inhalt.length && P.lernstandMelden) P.lernstandMelden(inhalt, pct, max, res.blocked);
        }
        else { (window.__lernPassQueue = window.__lernPassQueue || []).push(entry); loadPass(); }
      }
    },
    getAllResults() { return loadResults(); },
    getResult()     { return getResult(); }
  };

  // ── Bildschirmtastatur zwischen Aufgaben offen halten (iPad/Handy) ──
  //  Viele Apps bauen nach dem Prüfen das Eingabefeld neu auf oder sperren es kurz.
  //  Dabei schließt iOS die Tastatur. Deshalb springt der Fokus beim Prüfen (Enter
  //  oder Knopf) auf ein unsichtbares Ersatzfeld – die Tastatur bleibt offen – und
  //  von dort ins nächste freie Eingabefeld. Was in der Zwischenzeit getippt wird,
  //  wandert mit. Kommt kein Feld mehr (Rundenende = saveResult, oder nach 6 s),
  //  schließt die Tastatur wie gewohnt.
  //  Abschalten für eine App: <body data-tastatur="aus">
  (function tastaturHalter() {
    const touch = (navigator.maxTouchPoints || 0) > 0 || 'ontouchstart' in window;
    if (!touch) return;
    const TYPEN = /^(text|number|search|tel|url|email|)$/;
    let ersatz = null, uhr = null, zuletzt = null, start = 0;
    const tippfeld = el => !!el && el !== ersatz && el.tagName === 'INPUT' && TYPEN.test((el.getAttribute('type') || '').toLowerCase());
    const nutzbar = el => tippfeld(el) && el.isConnected && !el.disabled && !el.readOnly
      && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
    const aus = () => document.body && document.body.dataset.tastatur === 'aus';

    function ersatzFeld(vorbild) {
      if (!ersatz) {
        ersatz = document.createElement('input');
        ersatz.setAttribute('aria-hidden', 'true');
        ersatz.tabIndex = -1;
        ersatz.autocomplete = 'off';
        ersatz.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;border:0;padding:0;margin:0;font-size:16px;pointer-events:none;z-index:-1;';
        document.body.appendChild(ersatz);
      }
      const r = vorbild.getBoundingClientRect();                      // an gleicher Stelle → kein Scrollsprung
      ersatz.style.left = Math.max(0, Math.round(r.left)) + 'px';
      ersatz.style.top = Math.max(0, Math.min(window.innerHeight - 2, Math.round(r.top))) + 'px';
      ersatz.type = vorbild.type === 'number' ? 'number' : 'text';     // gleiche Tastatur (Ziffern/Buchstaben)
      ersatz.inputMode = vorbild.inputMode || '';
      ersatz.value = '';
      return ersatz;
    }
    function stopp(schliessen) {
      clearInterval(uhr); uhr = null;
      if (schliessen && ersatz && document.activeElement === ersatz) ersatz.blur();
    }
    function hinein(el) {
      const vorab = ersatz.value;
      stopp(false);
      el.focus();
      if (vorab && el.value === '' && document.activeElement === el) { el.value = vorab; el.dispatchEvent(new Event('input', { bubbles: true })); }
    }
    function pruefen() {
      if (document.activeElement !== ersatz) return stopp(false);       // App hat selbst fokussiert
      const t = Date.now() - start;
      const altDa = nutzbar(zuletzt);
      if (!altDa) {                                                     // Feld weg/gesperrt → nächstes freies Feld
        const alle = [...document.querySelectorAll('input')].filter(nutzbar);
        const neu = alle.find(el => el.value === '') || alle[0];
        if (neu) return hinein(neu);
      } else if (t > 1500) return hinein(zuletzt);                      // Feld blieb (z. B. „nochmal versuchen“)
      if (t > 6000) stopp(true);
    }
    function springen() {
      const akt = document.activeElement;
      if (aus() || !tippfeld(akt)) return;
      zuletzt = akt;
      ersatzFeld(akt).focus();
      start = Date.now();
      clearInterval(uhr);
      uhr = setInterval(pruefen, 80);
    }
    // Enter im Eingabefeld (vor den Handlern der App)
    document.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      if (document.activeElement === ersatz) { start = Date.now(); return; }   // Enter im Warten = „Weiter“ in manchen Apps
      springen();
    }, true);
    // Knopf antippen, während ein Eingabefeld aktiv ist (z. B. „Prüfen“, „↵“)
    const knopf = t => !tippfeld(t) && t.closest && t.closest('button, [role="button"], [onclick], a');
    document.addEventListener('pointerdown', e => { if (knopf(e.target)) springen(); }, true);
    // Manche Browser (Android) geben dem Knopf beim Antippen den Fokus – das würde die Tastatur schließen
    document.addEventListener('mousedown', e => { if (uhr && document.activeElement === ersatz && knopf(e.target)) e.preventDefault(); }, true);
    tastaturLoslassen = () => stopp(true);
  })();

  // ── Styles ──────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #lern-home-btn {
      position: fixed; bottom: 1.2rem; left: 1.2rem; z-index: 9999;
      display: flex; align-items: center; gap: .5rem;
      background: #1a1f5e; color: #fff; text-decoration: none;
      font-family: 'Nunito', 'Segoe UI', sans-serif;
      font-weight: 800; font-size: .88rem;
      padding: .55rem 1.1rem .55rem .85rem; border-radius: 99px;
      box-shadow: 0 4px 20px rgba(26,31,94,.35);
      border: 2px solid rgba(255,255,255,.12);
      transition: transform .18s ease, box-shadow .18s ease, background .15s;
      user-select: none;
    }
    #lern-home-btn:hover {
      transform: translateY(-3px) scale(1.04);
      box-shadow: 0 8px 28px rgba(26,31,94,.45);
      background: #252b7a;
    }
    #lern-home-btn:active { transform: scale(.97); }
    #lern-home-btn .home-dot {
      display: inline-block; width: 8px; height: 8px; border-radius: 50%;
      background: #f7c948; flex-shrink: 0; box-shadow: 0 0 8px rgba(247,201,72,.6);
    }
    #lern-home-btn .home-icon { font-size: 1.05rem; line-height: 1; }

    /* Ergebnis-Badge */
    #lern-result-badge {
      position: fixed; bottom: 1.2rem; right: 1.2rem; z-index: 9999;
      background: #1a1f5e; color: #fff;
      font-family: 'Nunito', 'Segoe UI', sans-serif;
      font-weight: 800; font-size: .82rem;
      padding: .45rem .95rem; border-radius: 99px;
      border: 2px solid rgba(255,255,255,.12);
      box-shadow: 0 4px 20px rgba(26,31,94,.35);
      display: none; align-items: center; gap: .45rem;
    }
    #lern-result-badge.show { display: flex; }
    #lern-result-badge .rb-bar {
      width: 52px; height: 6px; border-radius: 99px;
      background: rgba(255,255,255,.18); overflow: hidden;
    }
    #lern-result-badge .rb-fill {
      height: 100%; border-radius: 99px;
      background: #4ade80; transition: width .5s ease;
    }
    #lern-result-badge .rb-fill.mid { background: #f7c948; }
    #lern-result-badge .rb-fill.low { background: #f87171; }

    @media (max-width: 480px) {
      #lern-home-btn .home-label { display: none; }
      #lern-home-btn { padding: .65rem .75rem; }
    }
  `;
  document.head.appendChild(style);

  // ── Home Button ─────────────────────────────────────
  const btn = document.createElement('a');
  btn.id = 'lern-home-btn';
  btn.href = HOME;
  btn.title = 'Zurück zur App-Auswahl';
  btn.innerHTML = `
    <span class="home-dot"></span>
    <span class="home-icon">🏠</span>
    <span class="home-label">Alle Apps</span>`;
  document.body.appendChild(btn);

  // ── Ergebnis-Badge ──────────────────────────────────
  const badge = document.createElement('div');
  badge.id = 'lern-result-badge';
  badge.innerHTML = `
    <span>🏆</span>
    <span class="rb-label"></span>
    <div class="rb-bar"><div class="rb-fill"></div></div>`;
  document.body.appendChild(badge);

  function updateBadge(result) {
    if (!result) return;
    const pct = result.percent || 0;
    badge.querySelector('.rb-label').textContent = result.label;
    const fill = badge.querySelector('.rb-fill');
    fill.style.width = pct + '%';
    fill.className   = 'rb-fill' + (pct >= 70 ? '' : pct >= 40 ? ' mid' : ' low');
    badge.classList.add('show');
  }

  // Vorheriges Ergebnis direkt beim Laden anzeigen
  updateBadge(getResult());

})();
