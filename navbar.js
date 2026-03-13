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
//      label: '8 / 10'  // Anzeigetext (optional)
//    });
//
//  Das war's. Der Home-Button und die Ergebnisanzeige
//  erscheinen automatisch.
// ═══════════════════════════════════════════════════════

(function () {
  const HOME      = 'index.html';
  const STORE_KEY = 'lern-apps-results';

  // ── Hilfsfunktionen ─────────────────────────────────
  function getPageKey() {
    return location.pathname.split('/').pop() || 'index.html';
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
    saveResult(result) {
      const all = loadResults();
      all[getPageKey()] = {
        score:     result.score,
        max:       result.max,
        label:     result.label || (result.score + ' / ' + result.max),
        percent:   Math.round((result.score / result.max) * 100),
        timestamp: Date.now()
      };
      localStorage.setItem(STORE_KEY, JSON.stringify(all));
      updateBadge(all[getPageKey()]);
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
