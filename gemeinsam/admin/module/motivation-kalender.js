// ═══════════════════════════════════════════════════════
//  Admin-Modul Motivation → Kalender  (Admin-Umbau Etappe 6): Was ist wann aktiv?
//  Zwei Monate als Raster (Symbole je Tag) und darunter die Liste: läuft gerade · kommt · ohne Ende.
//  Termine aus LWAdmin.termine(config): Events, Spielsperre-Ausnahmen, Freigaben ab Datum, Fokus,
//  Lehrer-Zettel, Wochenaufträge, Challenges. Jeder Eintrag führt zum Modul, in dem er eingestellt wird.
// ═══════════════════════════════════════════════════════
'use strict';

LWAdmin.modul({
  id: 'kalender', bereich: 'motivation', titel: 'Kalender', symbol: '🗓', reihenfolge: 3,
  suchbegriffe: ['Kalender', 'Zeitraum', 'Termine', 'Event', 'wann', 'Zeitsteuerung'],
  zeigen(host, { store }) {
    let aktiv = true, titel = new Map(), gruppen = [], monat = 0;
    const { iso } = LWAdmin.termine;
    const fmt = s => s ? s.slice(8) + '.' + s.slice(5, 7) + '.' : '…';
    const imTag = (t, d) => (t.von || t.bis) && (!t.von || t.von <= d) && (!t.bis || t.bis >= d);

    function raster(jahr, m, L, heute) {
      const erster = new Date(jahr, m, 1), tage = new Date(jahr, m + 1, 0).getDate(), leer = (erster.getDay() + 6) % 7;
      const zellen = [];
      for (let i = 0; i < leer; i++) zellen.push('<div class="lw-k-tag leer"></div>');
      for (let t = 1; t <= tage; t++) {
        const d = iso(new Date(jahr, m, t)), hier = L.filter(x => imTag(x, d));
        zellen.push(`<div class="lw-k-tag${d === heute ? ' heute' : ''}${hier.length ? ' voll' : ''}" title="${escHtml(hier.map(x => x.sym + ' ' + x.text).join('\n'))}">
          <span class="lw-k-nr">${t}</span><span class="lw-k-sym">${[...new Set(hier.map(x => x.sym))].slice(0, 4).join('')}</span></div>`);
      }
      return `<div class="lw-k-monat"><h3>${erster.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}</h3>
        <div class="lw-k-raster">${['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(w => `<div class="lw-k-wt">${w}</div>`).join('')}${zellen.join('')}</div></div>`;
    }

    function zeichnen() {
      if (!aktiv) return;
      const c = store.daten() || {}, heute = iso(new Date()), bald = LWAdmin.termine.plusTage(heute, 60);
      const L = LWAdmin.termine(c, { titel, gruppen });
      const laeuft = L.filter(t => (t.von || t.bis) && imTag(t, heute));
      const kommt = L.filter(t => t.von && t.von > heute && t.von <= bald);
      const offen = L.filter(t => !t.von && !t.bis);
      const zeile = t => `<a class="lw-zeile" href="#/${t.ziel}"><span class="lw-zeile-sym">${t.sym}</span><span class="lw-zeile-titel">${escHtml(t.text)}</span>
        <span class="lw-zeile-wert">${t.von || t.bis ? (t.von === t.bis ? fmt(t.von) : fmt(t.von) + ' – ' + fmt(t.bis)) : 'ohne Ende'}</span></a>`;
      const block = (titelText, l, leer) => `<h3>${titelText}</h3>${l.length ? l.map(zeile).join('') : `<p class="lw-klein">${leer}</p>`}`;
      const d = new Date(), m1 = new Date(d.getFullYear(), d.getMonth() + monat, 1), m2 = new Date(d.getFullYear(), d.getMonth() + monat + 1, 1);
      host.innerHTML = `
        <div class="lw-karte">
          <div class="lw-knoepfe" style="margin:0 0 .6rem"><button class="lw-btn klein" data-monat="-1">◀</button><button class="lw-btn klein" data-monat="0">Heute</button><button class="lw-btn klein" data-monat="1">▶</button></div>
          <div class="lw-k-monate">${raster(m1.getFullYear(), m1.getMonth(), L, heute)}${raster(m2.getFullYear(), m2.getMonth(), L, heute)}</div>
          <p class="lw-klein">Antippen eines Tags zeigt (am Rechner beim Darüberfahren), was dort gilt. Ein Zeitraum schaltet sich auf jedem iPad von selbst ein und aus.</p>
        </div>
        <div class="lw-karte">
          ${block('🟢 Läuft gerade', laeuft, 'Gerade läuft nichts mit Zeitraum.')}
          ${block('🗓 Kommt (nächste 60 Tage)', kommt, 'Nichts geplant.')}
          ${block('♾ Ohne Ende (an, bis du es ausschaltest)', offen, 'Nichts dauerhaft an.')}
        </div>`;
    }

    const klick = e => {
      const b = e.target.closest('[data-monat]');
      if (b) { monat = b.dataset.monat === '0' ? 0 : monat + Number(b.dataset.monat); zeichnen(); return; }
      const tag = e.target.closest('.lw-k-tag.voll');
      if (tag && LWAdmin.dialog) LWAdmin.dialog({ titel: 'An diesem Tag', text: tag.title });
    };
    host.addEventListener('click', klick);
    zeichnen();
    LWAdmin.katalog().then(k => { titel = k.titel; }).catch(() => {}).then(zeichnen);
    LWAdmin.quellen.gruppen().then(g => { gruppen = g; }).catch(() => {}).then(zeichnen);
    const ab = store.abonnieren(zeichnen);
    return () => { aktiv = false; ab(); host.removeEventListener('click', klick); };
  },
});
