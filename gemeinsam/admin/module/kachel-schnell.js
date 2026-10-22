// Dashboard-Kachel „Schnellaktionen“ (Admin-Umbau Etappe 4):
// App per QR-Code auf den Beamer, Spiele heute frei (Ausnahme von der Spielsperre), häufige Ziele mit einem Klick.
'use strict';

LWAdmin.kachel({
  id: 'schnell', titel: 'Schnellaktionen', symbol: '⚡', reihenfolge: 20,
  zeigen(host, { store, toast }) {
    let aktiv = true, gruppen = [];
    const heute = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
    const werName = w => w === 'alle' ? 'Alle' : /^k\d+$/.test(w) ? 'Klasse ' + w.slice(1) : 'Gruppe „' + ((gruppen.find(g => 'g:' + g.id === w) || {}).name || w.slice(2, 8)) + '“';
    function zeichnen() {
      if (!aktiv) return;
      const c = store.daten() || { apps: [] };
      const apps = c.apps.filter(a => !a.hidden && isSafeLink(a.datei));
      const wer = ['alle', ...KLASSEN.map(k => 'k' + k), ...gruppen.map(g => 'g:' + g.id)];
      host.innerHTML = `
        <div class="lw-schnell">
          <label class="lw-schnell-titel" for="sa-app">📲 App für heute zeigen</label>
          <div class="lw-reihe"><select id="sa-app">${apps.map((a, i) => `<option value="${i}"${a.aod ? ' selected' : ''}>${escHtml((a.emoji || '📱') + ' ' + a.name)}</option>`).join('')}</select>
            <button class="lw-btn gold" data-a="beamer">🖥 Auf den Beamer</button></div>
        </div>
        <div class="lw-schnell">
          <label class="lw-schnell-titel" for="sa-wer">🎉 Spiele heute frei</label>
          <div class="lw-reihe"><select id="sa-wer">${wer.map(w => `<option value="${escHtml(w)}">${escHtml(werName(w))}</option>`).join('')}</select>
            <button class="lw-btn" data-a="frei">Heute frei</button></div>
          <p class="lw-klein">Ausnahme von der Spielsperre nur für heute, endet um Mitternacht von selbst.</p>
        </div>
        <div class="lw-schnell"><div class="lw-schnell-titel">↪ Häufig</div>
          <div class="lw-knoepfe lw-knoepfe-eng">
            <a class="lw-btn klein" href="#/inhalte/apps">📱 Apps</a><a class="lw-btn klein" href="#/start/banner">📢 Banner</a>
            <a class="lw-btn klein" href="#/gruppen/fokus">🎯 Fokus</a><a class="lw-btn klein" href="#/gruppen/spielsperre">🎮 Spielsperre</a>
            <a class="lw-btn klein" href="#/gruppen/lernwege">🗺️ Lernwege</a><a class="lw-btn klein" href="#/inhalte/freigaben">🔐 Freigaben</a>
            <a class="lw-btn klein" href="#/motivation/dorf">🏘️ Dorf</a><a class="lw-btn klein" href="#/medien/dateien">📁 Medium hochladen</a>
          </div></div>`;
      host.querySelector('[data-a="beamer"]').onclick = () => {
        const a = apps[Number(host.querySelector('#sa-app').value)];
        if (!a) return;
        if (!LWAdmin.beamer({ titel: (a.emoji ? a.emoji + ' ' : '') + a.name, unter: a.beschreibung || '', link: appUrl(a.datei) })) toast('⚠ QR-Code konnte nicht erzeugt werden', true);
      };
      host.querySelector('[data-a="frei"]').onclick = spieleFrei;
    }
    function spieleFrei() {
      const w = host.querySelector('#sa-wer').value, h = heute();
      if (!(store.daten() || {}).spielsperre) { toast('Es gibt keine Spielsperre – die Spiele sind schon frei'); return; }
      const vorher = store.anzahl();
      try { store.aendern(`⭐ Spielsperre-Ausnahme ${werName(w)}: Spiele frei, nur heute`, c => {
        const s = c.spielsperre;
        s.ausnahmen = (s.ausnahmen || []).filter(x => !(x.wer === w && x.ab === h && x.bis === h));
        if (s.ausnahmen.length >= 40) throw new Error('Höchstens 40 Ausnahmen – bitte unter Gruppen → Spielsperre alte beenden');
        s.ausnahmen.push({ id: 'sa-' + Date.now().toString(36), wer: w, runden: 0, ab: h, bis: h });
      }); } catch (e) { toast('⚠ ' + e.message, true); return; }
      // Nur diese eine Änderung im Entwurf → gleich veröffentlichen (mit Prüfung); sonst gehört sie zum Entwurf dazu
      if (vorher === 0 && store.anzahl() === 1) LWAdmin.veroeffentlichen();
      else toast('⭐ Im Entwurf – mit den anderen Änderungen veröffentlichen');
    }
    zeichnen();
    LWAdmin.quellen.gruppen().then(g => { gruppen = g; }).catch(() => {}).then(zeichnen);
    return () => { aktiv = false; };
  },
});
