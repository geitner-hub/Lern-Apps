// ═══════════════════════════════════════════════════════
//  Admin-Modul Start → Übersicht = Dashboard  (Admin-Umbau Etappe 4)
//  Zeigt alle Kacheln, die sich mit LWAdmin.kachel({…}) angemeldet haben (Dateien module/kachel-*.js),
//  in ihrer Reihenfolge. Jede Kachel zeichnet in ihr eigenes Feld und darf eine Aufräum-Funktion zurückgeben.
// ═══════════════════════════════════════════════════════
'use strict';

LWAdmin.modul({
  id: 'uebersicht', bereich: 'start', titel: 'Übersicht', symbol: '🏠', reihenfolge: 1,
  suchbegriffe: ['Dashboard', 'Status', 'Schnellaktionen', 'Hinweise', 'Start'],
  zeigen(host, ctx) {
    const kacheln = LWAdmin.kacheln();
    host.innerHTML = `<div class="lw-dash">${kacheln.map(k => `<section class="lw-dash-kachel${k.breit ? ' breit' : ''}" aria-labelledby="dk-${k.id}">
      <h2 id="dk-${k.id}">${k.symbol} ${escHtml(k.titel)}</h2><div class="lw-dash-inhalt" data-kachel="${k.id}"></div></section>`).join('')}</div>`;
    const weg = [];
    kacheln.forEach(k => {
      const feld = host.querySelector(`[data-kachel="${k.id}"]`);
      try { const f = k.zeigen(feld, ctx); if (typeof f === 'function') weg.push(f); }
      catch (e) { console.error('[Admin] Kachel ' + k.id + ':', e); feld.innerHTML = `<p class="lw-rot">⚠ ${escHtml(e.message || String(e))}</p>`; }
    });
    return () => weg.forEach(f => { try { f(); } catch (e) { console.error(e); } });
  },
});
