// ═══════════════════════════════════════════════════════
//  Admin-Modul System → Feature-Schalter  (Admin-Umbau Etappe 10)
//  Neue Funktionen erst für dich oder eine Testgruppe einschalten, dann für alle.
//  Liste der Funktionen: daten/features.json ({ id, titel, text }); Stand: config.featureSchalter[id] =
//  true (alle) | false (aus) | { wer: ['admin', 'g:<Gruppe>', 'k5'] }. In der App: LernFreigabe.feature('<id>').
// ═══════════════════════════════════════════════════════
'use strict';

LWAdmin.modul({
  id: 'features', bereich: 'system', titel: 'Feature-Schalter', symbol: '🧪', reihenfolge: 25,
  suchbegriffe: ['Feature', 'Schalter', 'Testgruppe', 'ausprobieren', 'neue Funktion', 'Beta'],
  zeigen(host, { store }) {
    let aktiv = true, liste = null, fehler = '', gruppen = [];
    const e = s => escHtml(String(s == null ? '' : s));
    const ROOT = new URL('./', location.href).href;
    const stand = (c, id) => { const v = (c.featureSchalter || {})[id]; return v === true ? 'an' : v && typeof v === 'object' ? 'test' : 'aus'; };
    const klassen = c => { const k = new Set(); (c.apps || []).forEach(a => (a.klassen || []).forEach(x => k.add(x))); return [...k].sort((a, b) => a - b); };
    const werName = w => w === 'admin' ? '🧑‍🏫 Nur ich (mit Admin-Anmeldung)' : /^k\d+$/.test(w) ? 'Klasse ' + w.slice(1)
      : (gruppen.find(g => 'g:' + g.id === w) || { name: 'Gruppe ' + w.slice(2, 8) + '…' }).name;

    function setzen(id, titel, wert, text) {
      store.aendern(`🧪 ${titel}: ${text}`, cfg => {
        const fs = cfg.featureSchalter && typeof cfg.featureSchalter === 'object' ? cfg.featureSchalter : (cfg.featureSchalter = {});
        if (wert === undefined) delete fs[id]; else fs[id] = wert;
      });
    }

    function zeichnen() {
      if (!aktiv) return;
      const c = store.daten() || {}, fs = c.featureSchalter || {};
      if (!liste) { host.innerHTML = `<div class="lw-karte">${fehler ? '⚠ ' + e(fehler) : 'lädt …'}</div>`; return; }
      const optionen = ['admin', ...klassen(c).map(k => 'k' + k), ...gruppen.map(g => 'g:' + g.id)];
      const karten = liste.map(f => {
        const s = stand(c, f.id), wer = s === 'test' ? fs[f.id].wer : [];
        return `<div class="lw-karte" data-ft="${e(f.id)}"><h2>${e(f.titel || f.id)}</h2>${f.text ? `<p>${e(f.text)}</p>` : ''}
          <div class="lw-u-chips">${[['aus', '⚪ Aus'], ['test', '🧪 Zum Testen'], ['an', '🟢 Für alle']].map(([k, t]) =>
            `<button type="button" class="lw-u-chip${s === k ? ' an' : ''}" data-ft-stand="${k}">${t}</button>`).join('')}</div>
          ${s === 'test' ? `<div class="st-chips">${optionen.map(w => `<label class="st-chip"><input type="checkbox" data-ft-wer value="${e(w)}"${wer.includes(w) ? ' checked' : ''}> ${e(werName(w))}</label>`).join('')}</div>
            <p class="lw-klein">An nur für die angehakten: Gruppen über die Sicherungskarte, Klassen über den Pass, „Nur ich“ auf Geräten, die mit deinem Zugang im Admin angemeldet sind.</p>` : ''}
          <p class="lw-klein"><code>${e(f.id)}</code></p></div>`;
      }).join('');
      const fremd = Object.keys(fs).filter(k => !liste.some(f => f.id === k));
      host.innerHTML = `<div class="lw-karte"><h2>🧪 Feature-Schalter</h2>
          <p>Neue Funktionen zuerst für dich oder eine Testgruppe einschalten, dann für alle. Wirkt nach dem Veröffentlichen (oben).</p>
          ${!liste.length ? `<p class="lw-klein">Gerade ist keine Funktion hinter einem Schalter. Für eine neue Funktion: Eintrag in <code>daten/features.json</code>
            und im Code <code>if (LernFreigabe.feature('id'))</code>.</p>` : ''}</div>${karten}
        ${fremd.length ? `<div class="lw-karte"><h2>Alte Schalter</h2><p class="lw-klein">Stehen in config.json, aber nicht mehr in daten/features.json.</p>
          ${fremd.map(k => `<div class="lw-knoepfe"><code>${e(k)}</code><button type="button" class="lw-btn klein" data-ft-weg="${e(k)}">Entfernen</button></div>`).join('')}</div>` : ''}`;
    }

    const klick = ev => {
      const b = ev.target.closest('button'); if (!b || !host.contains(b)) return;
      if (b.dataset.ftWeg) { setzen(b.dataset.ftWeg, b.dataset.ftWeg, undefined, 'entfernt'); return; }
      const karte = b.closest('[data-ft]'), f = karte && liste.find(x => x.id === karte.dataset.ft);
      if (!f || !b.dataset.ftStand) return;
      const k = b.dataset.ftStand, alt = ((store.daten() || {}).featureSchalter || {})[f.id];
      if (k === 'aus') setzen(f.id, f.titel || f.id, undefined, 'aus');
      else if (k === 'an') setzen(f.id, f.titel || f.id, true, 'für alle an');
      else setzen(f.id, f.titel || f.id, alt && typeof alt === 'object' ? alt : { wer: ['admin'] }, 'zum Testen (nur ich)');
    };
    const aenderung = ev => {
      const t = ev.target; if (!t.matches('[data-ft-wer]')) return;
      const karte = t.closest('[data-ft]'), f = liste.find(x => x.id === karte.dataset.ft);
      const wer = [...karte.querySelectorAll('[data-ft-wer]:checked')].map(i => i.value);
      if (!wer.length) { setzen(f.id, f.titel || f.id, undefined, 'aus (niemand angehakt)'); return; }
      setzen(f.id, f.titel || f.id, { wer }, 'zum Testen für ' + wer.map(werName).join(', '));
    };
    host.addEventListener('click', klick);
    host.addEventListener('change', aenderung);
    const ab = store.abonnieren(zeichnen);
    zeichnen();
    fetch(ROOT + 'daten/features.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status)))
      .then(d => { liste = (d.features || []).filter(f => f && /^[a-z][a-zA-Z0-9-]{0,39}$/.test(f.id)); })
      .catch(x => { fehler = 'daten/features.json nicht geladen: ' + (x.message || x); }).then(zeichnen);
    LWAdmin.quellen.gruppen().then(g => { gruppen = g; }).catch(() => {}).then(zeichnen);
    return () => { aktiv = false; ab(); host.removeEventListener('click', klick); host.removeEventListener('change', aenderung); };
  },
});
