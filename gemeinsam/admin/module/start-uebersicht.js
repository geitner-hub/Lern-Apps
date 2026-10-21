// ═══════════════════════════════════════════════════════
//  Admin-Modul Start → Übersicht  (Admin-Umbau Etappe 1, wird in Etappe 4 zum Dashboard)
// ═══════════════════════════════════════════════════════
'use strict';

LWAdmin.modul({
  id: 'uebersicht', bereich: 'start', titel: 'Übersicht', symbol: '🏠', reihenfolge: 1,
  suchbegriffe: ['Start', 'Dashboard', 'Status'],
  zeigen(host, { store, gehe }) {
    let aktiv = true, zuletzt = '…';            // nur einmal abfragen (GitHub erlaubt ohne Anmeldung 60 Abfragen pro Stunde)
    function zeichnen() {
      const c = store.daten() || { apps: [] };
      const sichtbar = c.apps.filter(a => !a.hidden).length;
      const n = store.anzahl();
      host.innerHTML = `
        <div class="lw-kacheln">
          <div class="lw-kachel"><div class="lw-kachel-titel">Apps</div><div class="lw-kachel-wert">${c.apps.length}</div><div class="lw-klein">${sichtbar} sichtbar · ${c.apps.length - sichtbar} versteckt</div></div>
          <div class="lw-kachel${n ? ' gold' : ''}"><div class="lw-kachel-titel">Entwurf</div><div class="lw-kachel-wert">${n}</div><div class="lw-klein">${n ? 'noch nicht veröffentlicht' : 'alles veröffentlicht'}</div></div>
          <div class="lw-kachel"><div class="lw-kachel-titel">Banner</div><div class="lw-kachel-wert">${c.announcement && c.announcement.active ? '🟢' : '⚪'}</div><div class="lw-klein">${c.announcement && c.announcement.active ? 'aktiv' : 'aus'}</div></div>
          <div class="lw-kachel"><div class="lw-kachel-titel">Zuletzt veröffentlicht</div><div class="lw-klein">${escHtml(zuletzt)}</div></div>
        </div>
        <div class="lw-karte">
          <h2>Der neue Admin ist im Aufbau</h2>
          <p>Die Funktionen ziehen in Etappe 2 nach und nach hierher. Bis dahin läuft alles über den bisherigen Admin.</p>
          <div class="lw-knoepfe">
            <a class="lw-btn gold" href="admin.html">Bisheriger Admin</a>
            <a class="lw-btn" href="admin-karten.html">🗂 Sicherungskarten</a>
            <a class="lw-btn" href="infokarten.html">🪪 Infokarten</a>
            <button class="lw-btn" data-gehe="system">⚙️ Entwurf und Versionen</button>
          </div>
        </div>`;
      host.querySelector('[data-gehe]').addEventListener('click', () => gehe('system', 'entwurf'));
    }
    zeichnen();
    store.historie(1)
      .then(l => { zuletzt = l.length ? l[0].zeit.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) + ' · ' + l[0].text : '–'; })
      .catch(() => { zuletzt = 'nicht abrufbar'; })
      .then(() => { if (aktiv) zeichnen(); });
    const ab = store.abonnieren(zeichnen);
    return () => { aktiv = false; ab(); };
  },
});
