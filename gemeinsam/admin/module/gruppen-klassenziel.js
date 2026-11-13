// ═══════════════════════════════════════════════════════
//  Admin-Modul Gruppen → Klassenziel  (Aktionsplan „Lernwelt – Tempo“, Etappe 7)
//  Eine Gruppe sammelt gemeinsam fertige Abschnitte auf ihren Lernwegen (English Journey und 2D-Wege). Keine Rangliste,
//  kein Vergleich einzelner Kinder: Die iPads bekommen vom Worker nur die Summe der Gruppe (/sync/klassenziel).
//  Stand: config.klassenziel = { 'g:<Gruppe>': { id, ziel, basis, text? } } – basis = Summe beim Setzen des Ziels (ab da wird
//  gezählt), id = Kennung dieses Ziels (jedes Kind bekommt die Geschenk-Truhe genau einmal je Ziel).
//  Die Summe speist sich aus den Lernweg-Meldungen der Karten (Tabelle sync_weg, Etappe 6a). Worker: validateConfig.
// ═══════════════════════════════════════════════════════
'use strict';

LWAdmin.modul({
  id: 'klassenziel', bereich: 'gruppen', titel: 'Klassenziel', symbol: '🤝', reihenfolge: 5,
  suchbegriffe: ['Klassenziel', 'gemeinsames Ziel', 'Belohnung', 'Geschenk-Truhe', 'Abschnitte sammeln', 'Gruppe', 'Motivation', 'zusammen'],
  zeigen(host, { store }) {
    const e = s => escHtml(String(s == null ? '' : s));
    let aktiv = true, gruppen = [], summen = {}, fehler = '';
    const kz = () => ((store.daten() || {}).klassenziel) || {};

    function zeichnen() {
      if (!aktiv) return;
      const z = kz();
      host.innerHTML = `<div class="lw-karte"><h2>🤝 Klassenziel</h2>
        <p>Die Gruppe sammelt zusammen fertige Abschnitte auf ihren Lernwegen. Auf der Startseite sehen die Kinder nur den gemeinsamen Stand –
        keine Rangliste, kein Vergleich. Ist das Ziel erreicht, bekommt jedes Kind der Gruppe einmal eine Geschenk-Truhe.
        Gezählt wird ab dem Moment, in dem du das Ziel setzt. Wirkt nach dem Veröffentlichen (oben).</p>
        ${fehler ? `<p style="color:#f87171;font-weight:800">⚠ ${e(fehler)}</p>` : ''}
        ${gruppen.map(g => {
          const k = z['g:' + g.id], sum = summen[g.id], ist = k && sum !== undefined ? Math.max(0, sum - k.basis) : null;
          return `<div style="border-top:1px solid rgba(255,255,255,.1);padding:.7rem 0">
            <b>🪪 ${e(g.name)}</b> <span class="lw-klein">· ${g.codes.length} Karten · bisher ${sum === undefined ? '…' : sum} fertige Abschnitte insgesamt</span>
            ${k ? `<p style="margin:.3rem 0">Ziel: <b>${ist === null ? '…' : Math.min(ist, k.ziel)} von ${Number(k.ziel)}</b> Abschnitten${k.text ? ' – „' + e(k.text) + '“' : ''}${ist !== null && ist >= k.ziel ? ' 🎉 erreicht' : ''}</p>` : ''}
            <div class="lw-knoepfe" style="align-items:end">
              <label class="lw-klein">Ziel (Abschnitte)<br><input type="number" min="1" max="5000" data-kz-ziel="${e(g.id)}" value="${k ? Number(k.ziel) : Math.max(10, g.codes.length * 3)}" style="width:6rem"></label>
              <label class="lw-klein">Satz für die Kinder (optional)<br><input type="text" maxlength="80" data-kz-text="${e(g.id)}" value="${e(k && k.text || '')}" placeholder="z. B. Dann machen wir ein Dorf-Fest!" style="width:20rem"></label>
              <button type="button" class="lw-btn gold" data-kz-setzen="${e(g.id)}" ${sum === undefined ? 'disabled' : ''}>${k ? 'Neues Ziel ab jetzt' : 'Ziel setzen'}</button>
              ${k ? `<button type="button" class="lw-btn" data-kz-ende="${e(g.id)}">Ziel beenden</button>` : ''}</div></div>`;
        }).join('') || '<p class="lw-klein">Noch keine Gruppen (Sicherungskarten).</p>'}</div>`;
    }
    const klick = ev => {
      const t = ev.target.closest('[data-kz-setzen],[data-kz-ende]');
      if (!t) return;
      const gid = t.dataset.kzSetzen || t.dataset.kzEnde, g = gruppen.find(x => x.id === gid);
      if (!g) return;
      if (t.dataset.kzEnde) {
        store.aendern(`🤝 Klassenziel ${g.name}: beendet`, c => { if (c.klassenziel) { delete c.klassenziel['g:' + gid]; if (!Object.keys(c.klassenziel).length) delete c.klassenziel; } });
        return;
      }
      const ziel = Math.max(1, Math.min(5000, parseInt(host.querySelector(`[data-kz-ziel="${gid}"]`).value, 10) || 0));
      const text = host.querySelector(`[data-kz-text="${gid}"]`).value.trim().slice(0, 80), basis = summen[gid] || 0, id = 'kz-' + Date.now().toString(36);
      store.aendern(`🤝 Klassenziel ${g.name}: ${ziel} Abschnitte`, c => {
        const k = c.klassenziel && typeof c.klassenziel === 'object' && !Array.isArray(c.klassenziel) ? c.klassenziel : (c.klassenziel = {});
        k['g:' + gid] = Object.assign({ id, ziel, basis }, text ? { text } : {});
      });
    };
    host.addEventListener('click', klick);
    const ab = store.abonnieren(zeichnen);
    zeichnen();
    LWAdmin.quellen.gruppen().then(g => {
      gruppen = g; zeichnen();
      return Promise.all(g.map(x => store.worker('/sync/admin/klassenziel', { gruppeId: x.id }).then(d => { summen[x.id] = Number(d.abschnitte) || 0; })));
    }).catch(x => { fehler = 'Stand nicht geladen: ' + (x.message || x) + ' – läuft der neue Worker (v129) schon?'; }).then(zeichnen);
    return () => { aktiv = false; ab(); host.removeEventListener('click', klick); };
  },
});
