// Dashboard-Kachel „Status“ (Admin-Umbau Etappe 4): Entwurf, letzte Veröffentlichung, Apps, Pass und Events,
// Fehlerprotokoll dieses Geräts, Speicher des Medienbereichs. Jede Zeile führt mit einem Klick zum passenden Modul.
'use strict';

LWAdmin.kachel({
  id: 'status', titel: 'Status', symbol: '📊', reihenfolge: 10,
  zeigen(host, { store }) {
    let aktiv = true, zuletzt = '…', speicher = '…';
    const mb = b => b >= 1e9 ? (b / 1e9).toFixed(1).replace('.', ',') + ' GB' : Math.round(b / 1e6) + ' MB';
    function zeichnen() {
      if (!aktiv) return;
      const c = store.daten() || { apps: [] }, n = store.anzahl();
      const sichtbar = c.apps.filter(a => !a.hidden).length, aod = c.apps.find(a => a.aod);
      const ps = c.pass || {}, events = (window.LernPass && LernPass.EVENTS || []).filter(e => LW.zeitplanAktiv((ps.events || {})[e.id]));
      const fehler = window.LW && LW.fehler ? LW.fehler.liste().length : 0;
      const zeile = (ziel, sym, titel, wert, kl = '') => `<a class="lw-zeile${kl ? ' ' + kl : ''}" href="#/${ziel}"><span class="lw-zeile-sym">${sym}</span>
        <span class="lw-zeile-titel">${escHtml(titel)}</span><span class="lw-zeile-wert">${wert}</span></a>`;
      host.innerHTML =
        zeile('system/entwurf', '✏️', 'Entwurf', n ? `<b class="lw-gold">${n} nicht veröffentlicht</b>` : 'alles veröffentlicht', n ? 'gold' : '') +
        zeile('system/entwurf', '🕓', 'Zuletzt veröffentlicht', escHtml(zuletzt)) +
        zeile('inhalte/apps', '📱', 'Apps', `${sichtbar} sichtbar · ${c.apps.length - sichtbar} versteckt`) +
        zeile('inhalte/apps', '⭐', 'App des Tages', aod ? escHtml((aod.emoji || '') + ' ' + aod.name) : '–') +
        zeile('motivation/pass', '🧭', 'Saison · Events', `${ps.seasons ? 'Saison an' : 'Saison aus'} · ${events.length ? events.map(e => escHtml(e.icon + ' ' + e.name)).join(', ') : 'kein Event'}`) +
        zeile('system/diagnose', '🔧', 'Fehlerprotokoll (dieses Gerät)', fehler ? `<b class="lw-rot">${fehler} Einträge</b>` : 'keine Einträge ✓') +
        zeile('medien/dateien', '📁', 'Medien-Speicher', escHtml(speicher));
    }
    zeichnen();
    store.historie(1)
      .then(l => { zuletzt = l.length ? l[0].zeit.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '–'; })
      .catch(() => { zuletzt = 'nicht abrufbar'; }).then(zeichnen);
    LWAdmin.quellen.medien()
      .then(m => { speicher = m.grenze ? `${mb(m.belegt)} von ${mb(m.grenze)} · ${m.eintraege.length} Dateien` : `${mb(m.belegt)} · ${m.eintraege.length} Dateien`; })
      .catch(() => { speicher = 'nicht abrufbar'; }).then(zeichnen);
    const ab = store.abonnieren(zeichnen);
    return () => { aktiv = false; ab(); };
  },
});
