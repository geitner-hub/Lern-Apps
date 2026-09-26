// ═══════════════════════════════════════════════════════
//  Lern-Apps Navbar – navbar.js
//  Einbindung: <script src="navbar.js"></script>
//  am Ende des <body> jeder App-Seite einfügen.
//
//  Ergebnisse speichern (optional, aus der App heraus):
//
//    LernApps.saveResult({
//      score: 8,        // erreichte Punkte (Zahl)
//      max:   10,       // maximale Punkte  (Zahl)
//      label: '8 / 10', // Anzeigetext (optional)
//      skill: 'einmaleins-7' // Kompetenz-Kennung (optional, für später)
//    });
//
//  Das war's. Home-Button, Ergebnisanzeige und Lernwelt-Pass
//  (XP-Meldung) erscheinen automatisch. pass.js wird von hier
//  nachgeladen – Apps müssen nichts weiter einbinden.
// ═══════════════════════════════════════════════════════

(function () {
  const HOME      = 'index.html';
  const STORE_KEY = 'lern-apps-results';
  const HISTORY_MAX = 30;
  let roundStart = Date.now();

  // pass.js aus demselben Ordner wie navbar.js laden
  const BASE = (document.currentScript && document.currentScript.src)
    ? document.currentScript.src.replace(/[^/]*$/, '') : '';
  function loadPass() {
    if (window.LernPass || document.getElementById('lw-pass-script')) return;
    const sc = document.createElement('script');
    sc.id = 'lw-pass-script';
    sc.src = BASE + 'pass.js';
    document.head.appendChild(sc);
  }
  loadPass();
  if ('serviceWorker' in navigator && BASE) {
    window.addEventListener('load', () => navigator.serviceWorker.register(BASE + 'sw.js').catch(() => {}));
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
        if (window.LernPass) { window.LernPass.toast(window.LernPass.award(entry)); }
        else { (window.__lernPassQueue = window.__lernPassQueue || []).push(entry); loadPass(); }
      }
    },
    getAllResults() { return loadResults(); },
    getResult()     { return getResult(); }
  };

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
