// Dashboard-Kachel „Hinweise“ (Admin-Umbau Etappe 4): Prüfung des aktuellen Stands (wie vor dem Veröffentlichen),
// laufende Events, heute aktive Spielsperre-Ausnahmen und Fokus, Lehrer-Zettel, die bald enden,
// Sicherungskarten, die nie verbunden wurden oder lange nicht gesichert haben.
'use strict';

LWAdmin.kachel({
  id: 'hinweise', titel: 'Hinweise', symbol: '💡', reihenfolge: 30, breit: true,
  zeigen(host, { store }) {
    let aktiv = true, pruefung = null, gruppen = null, lauf = 0;
    const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const TAGE_OHNE_SICHERUNG = 14;
    function zeichnen() {
      if (!aktiv) return;
      const c = store.daten() || { apps: [] }, h = iso(new Date()), morgen = iso(new Date(Date.now() + 864e5));
      const L = [];                                          // [Art, Text, Ziel]
      if (pruefung) {
        pruefung.fehler.forEach(t => L.push(['rot', '⛔ ' + t, 'system/entwurf']));
        pruefung.warnungen.forEach(t => L.push(['gelb', '⚠️ ' + t, 'system/entwurf']));
      }
      const ev = ((c.pass || {}).events) || {};
      (window.LernPass && LernPass.EVENTS || []).filter(e => ev[e.id] === true)
        .forEach(e => L.push(['info', `${e.icon} ${e.titel || e.name} ist dauerhaft an – ausschalten oder einen Zeitraum setzen`, 'motivation/pass']));
      // Etappe 6: was in den nächsten 7 Tagen beginnt oder endet (Events, Ausnahmen, Freigaben, Dorf …)
      const in7 = LWAdmin.termine.plusTage(h, 7), tag = s => s === h ? 'heute' : s === morgen ? 'morgen' : 'am ' + s.slice(8) + '.' + s.slice(5, 7) + '.';
      LWAdmin.termine(c, { gruppen: gruppen || [] }).filter(t => t.art !== 'fokus').forEach(t => {
        if (t.von && t.von > h && t.von <= in7) L.push(['info', `🗓 ${t.sym} ${t.text} beginnt ${tag(t.von)}`, t.ziel]);
        else if (t.bis && t.bis >= h && t.bis <= in7 && t.von !== t.bis) L.push(['info', `⏳ ${t.sym} ${t.text} endet ${tag(t.bis)}`, t.ziel]);
      });
      const werName = w => w === 'alle' ? 'Alle' : /^k\d+$/.test(w) ? 'Klasse ' + w.slice(1)
        : 'Gruppe „' + (((gruppen || []).find(g => 'g:' + g.id === w) || {}).name || w.slice(2, 8) + '…') + '“';
      const datum = d => d.slice(8) + '.' + d.slice(5, 7) + '.';
      ((c.spielsperre || {}).ausnahmen || []).filter(a => (!a.ab || a.ab <= h) && (!a.bis || a.bis >= h))
        .forEach(a => L.push(['info', `🎉 Spielsperre-Ausnahme ${werName(a.wer)}: ${a.runden ? a.runden + ' Runden' : 'Spiele frei'}, ${
          !a.bis ? 'dauerhaft' : a.bis === h ? 'nur heute' : 'bis ' + datum(a.bis)}`, 'gruppen/spielsperre']));
      (c.fokus || []).filter(f => Number(f.bis) > Date.now())
        .forEach(f => L.push(['info', `🎯 Fokus aktiv (${(f.apps || []).length} Apps) bis ${new Date(f.bis).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`, 'gruppen/fokus']));
      if (gruppen) gruppen.forEach(g => {
        const nie = g.codes.filter(k => !k.verbundenAm).length;
        const alt = g.codes.filter(k => k.verbundenAm && (!k.letzteSync || Date.now() - k.letzteSync > TAGE_OHNE_SICHERUNG * 864e5)).length;
        if (nie) L.push(['info', `🗂 Gruppe „${g.name}“: ${nie} Karte${nie === 1 ? '' : 'n'} noch nie verbunden`, 'gruppen/karten']);
        if (alt) L.push(['gelb', `🗂 Gruppe „${g.name}“: ${alt} Karte${alt === 1 ? '' : 'n'} seit über ${TAGE_OHNE_SICHERUNG} Tagen ohne Sicherung`, 'gruppen/karten']);
      });
      host.innerHTML = (L.length ? `<div class="lw-hinweise">${L.map(([art, t, ziel]) =>
        `<a class="lw-hinweis ${art}" href="#/${ziel}">${escHtml(t)}</a>`).join('')}</div>` : '<p>✅ Alles in Ordnung.</p>')
        + (pruefung === null || gruppen === null ? '<p class="lw-klein">prüft …</p>' : '');
    }
    function pruefen() {
      const nr = ++lauf;
      LWAdmin.pruefen(store.daten()).then(p => { if (nr === lauf) { pruefung = p; zeichnen(); } })
        .catch(() => { if (nr === lauf) { pruefung = { fehler: [], warnungen: [] }; zeichnen(); } });
    }
    zeichnen();
    pruefen();
    LWAdmin.quellen.gruppen().then(g => { gruppen = g; }).catch(() => { gruppen = []; }).then(zeichnen);
    const ab = store.abonnieren(() => { zeichnen(); pruefen(); });
    return () => { aktiv = false; ab(); };
  },
});
