// ═══════════════════════════════════════════════════════
//  Admin-Modul System → Entwurf und Versionen  (Admin-Umbau Etappe 1)
//  Zeigt den Entwurf mit allen geänderten Werten und die letzten Veröffentlichungen.
//  Etappe 3 baut hier Versionsverlauf und Wiederherstellen aus.
// ═══════════════════════════════════════════════════════
'use strict';

LWAdmin.modul({
  id: 'entwurf', bereich: 'system', titel: 'Entwurf und Versionen', symbol: '🕓', reihenfolge: 20,
  suchbegriffe: ['Entwurf', 'Veröffentlichen', 'Verlauf', 'Version', 'Unterschiede'],
  zeigen(host, { store }) {
    let aktiv = true, historie = null;
    function zeichnen() {
      const a = store.aenderungen().reverse(), u = store.unterschiede();
      host.innerHTML = `
        <div class="lw-karte">
          <h2>✏️ Entwurf</h2>
          ${a.length ? `<p>${a.length === 1 ? '1 Änderung' : a.length + ' Änderungen'} auf diesem Gerät, noch nicht veröffentlicht:</p>
            <ul class="lw-liste">${a.map(t => `<li>${escHtml(t)}</li>`).join('')}</ul>
            <h3>Geänderte Werte (${u.length})</h3>
            <ul class="lw-liste lw-klein">${u.slice(0, 200).map(x => `<li><code>${escHtml(x.pfad || '(alles)')}</code> ${escHtml(LWAdmin.kurz(x.alt))} → ${escHtml(LWAdmin.kurz(x.neu))}</li>`).join('')}</ul>`
          : '<p>Kein Entwurf – alles ist veröffentlicht.</p>'}
        </div>
        <div class="lw-karte">
          <h2>🕓 Zuletzt veröffentlicht</h2>
          <ul class="lw-liste" id="entwurf-historie">${historie === null ? '<li>lädt …</li>' : historie}</ul>
          <p class="lw-klein">Jede Veröffentlichung ist ein Commit an config.json im Repo. Ansehen und Wiederherstellen folgen in Etappe 3.</p>
        </div>`;
    }
    zeichnen();
    store.historie(10).then(l => {
      historie = l.map(h => `<li><span class="lw-klein">${h.zeit.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span> ${escHtml(h.text)}</li>`).join('') || '<li>–</li>';
      if (aktiv) zeichnen();
    }).catch(() => { historie = '<li>nicht abrufbar (offline oder zu viele Abfragen)</li>'; if (aktiv) zeichnen(); });
    const ab = store.abonnieren(zeichnen);
    return () => { aktiv = false; ab(); };   // Modul verlassen: nicht mehr in den gemeinsamen Bereich zeichnen
  },
});
