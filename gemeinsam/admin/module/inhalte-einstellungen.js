// ═══════════════════════════════════════════════════════
//  Admin-Modul Inhalte → App-Einstellungen  (Admin-Umbau Etappe 7)
//  Für jede App mit Manifest (daten/apps/liste.json → daten/apps/<id>.json) ein Formular aus dem Schema
//  (gemeinsam/admin/formular.js). Neue Einstellung = Eintrag im Manifest, kein Admin-Code.
// ═══════════════════════════════════════════════════════
'use strict';

LWAdmin.modul({
  id: 'einstellungen', bereich: 'inhalte', titel: 'App-Einstellungen', symbol: '⚙️', reihenfolge: 5,
  suchbegriffe: ['Einstellungen', 'Manifest', 'Tower Defense', 'RUN', 'Mein Dorf', 'Herzen', 'Tempo', 'Schwierigkeit'],
  zeigen(host, { store }) {
    let aktiv = true, manifeste = null, fehler = '';
    function zeichnen() {
      if (!aktiv) return;
      if (!manifeste) { host.innerHTML = `<div class="lw-karte">${fehler ? '⚠ ' + escHtml(fehler) : 'lädt …'}</div>`; return; }
      const apps = (store.daten() || {}).apps || [];
      host.innerHTML = `<p class="lw-klein" style="margin-bottom:.8rem">Was die Lehrkraft je App einstellen darf, beschreibt die App selbst (Manifest in
          <code>daten/apps/</code>). Ohne Änderung gilt der Standard. Wirkt beim nächsten Start der App, nachdem du veröffentlicht hast.</p>` +
        manifeste.map(m => {
          const a = apps.find(x => x.datei === m.datei);
          return `<div class="lw-karte"><h2>${escHtml(a && a.emoji ? a.emoji + ' ' : '')}${escHtml(m.titel)}</h2>
            <p class="lw-klein">${escHtml(m.datei)}${a && a.hidden ? ' · versteckt' : ''}</p><div class="form-card" style="padding:.2rem 1rem" data-formular="${escHtml(m.id)}"></div></div>`;
        }).join('');
      manifeste.forEach(m => LWAdmin.formular.einhaengen(host.querySelector(`[data-formular="${m.id}"]`), m.id));
    }
    zeichnen();
    LWAdmin.formular.manifeste().then(l => { manifeste = l; }).catch(e => { fehler = 'Manifeste nicht geladen: ' + (e.message || e); }).then(zeichnen);
    const ab = store.abonnieren(zeichnen);
    return () => { aktiv = false; ab(); };
  },
});
