// ═══════════════════════════════════════════════════════
//  Lernwelt-Admin – Termine aus config.json  (Admin-Umbau Etappe 6, für Kalender und Dashboard)
//
//    LWAdmin.termine(config, { titel })  // [{ von, bis, sym, text, art, ziel }] – von/bis JJJJ-MM-TT ('' = offen)
//
//  Quellen: Events (true = dauerhaft, Zeitplan einmalig oder jedes Jahr – dann dieses und nächstes Jahr),
//  Spielsperre-Ausnahmen, Freigaben „frei ab Datum“, Fokus, Lehrer-Zettel, Wochenaufträge, Challenges.
//  titel: optional Map Themen-ID → Titel (LWAdmin.katalog()).
// ═══════════════════════════════════════════════════════
'use strict';

window.LWAdmin = window.LWAdmin || {};

(() => {
  const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const plusTage = (s, n) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return iso(d); };
  const werName = w => w === 'alle' ? 'Alle' : /^k\d+$/.test(w) ? 'Klasse ' + w.slice(1) : 'Gruppe ' + String(w).slice(2, 8) + '…';

  function termine(c, opt = {}) {
    const L = [], jahr = new Date().getFullYear(), titel = opt.titel || new Map();
    const gruppe = w => { const g = (opt.gruppen || []).find(x => 'g:' + x.id === w); return g ? 'Gruppe „' + g.name + '“' : werName(w); };
    // Events
    const ev = ((c.pass || {}).events) || {};
    (window.LernPass && LernPass.EVENTS || []).forEach(e => {
      const v = ev[e.id], name = e.titel || e.name + '-Event';
      if (v === true) L.push({ von: '', bis: '', sym: e.icon, text: name + ' (dauerhaft an)', art: 'event', ziel: 'motivation/pass' });
      else if (v && typeof v === 'object') {
        if (/^\d{2}-\d{2}$/.test(v.ab || v.bis || '')) {
          [jahr, jahr + 1].forEach(j => {
            const ab = v.ab ? j + '-' + v.ab : '', ueber = v.ab && v.bis && v.ab > v.bis;
            L.push({ von: ab, bis: v.bis ? (ueber ? j + 1 : j) + '-' + v.bis : '', sym: e.icon, text: name + ' (jedes Jahr)', art: 'event', ziel: 'motivation/pass' });
          });
        } else L.push({ von: v.ab || '', bis: v.bis || '', sym: e.icon, text: name, art: 'event', ziel: 'motivation/pass' });
      }
    });
    // Spielsperre-Ausnahmen
    ((c.spielsperre || {}).ausnahmen || []).forEach(a => L.push({ von: a.ab || '', bis: a.bis || '', sym: '🎉',
      text: `${gruppe(a.wer)}: ${a.runden ? a.runden + ' Runden vor den Spielen' : 'Spiele frei'}`, art: 'spielsperre', ziel: 'gruppen/spielsperre' }));
    // Freigaben „frei ab Datum“
    Object.entries(c.freigaben || {}).forEach(([id, e]) => Object.entries(e || {}).forEach(([w, v]) => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(v)) L.push({ von: v, bis: v, sym: '🔓', text: `${titel.get(id) || id} frei für ${gruppe(w)}`, art: 'freigabe', ziel: 'inhalte/freigaben' });
    }));
    // Fokus (heute, mit Uhrzeit)
    (c.fokus || []).filter(f => Number(f.bis) > Date.now()).forEach(f => {
      const t = iso(new Date(Number(f.bis)));
      L.push({ von: f.ab ? iso(new Date(Number(f.ab))) : iso(new Date()), bis: t, sym: '🎯',
        text: `Fokus ${gruppe(f.fuer)} bis ${new Date(Number(f.bis)).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`, art: 'fokus', ziel: 'gruppen/fokus' });
    });
    // Mein Dorf
    const d = c.dorf || {};
    (d.lehrerZettel || []).forEach(z => L.push({ von: z.start || '', bis: z.bis || '', sym: '📣', text: 'Lehrer-Zettel' + (z.text ? ': „' + z.text + '“' : ''), art: 'dorf', ziel: 'motivation/dorf' }));
    (d.wochen || []).forEach(w => L.push({ von: w.start, bis: plusTage(w.start, 6), sym: '📅', text: 'Wochenauftrag: ' + (w.name || w.ziel || ''), art: 'dorf', ziel: 'motivation/dorf' }));
    (d.challenges || []).forEach(ch => L.push({ von: ch.start, bis: plusTage(ch.start, 13), sym: '🏆', text: 'Challenge ' + ch.id, art: 'dorf', ziel: 'motivation/dorf' }));
    return L.sort((a, b) => (a.von || '0').localeCompare(b.von || '0') || a.text.localeCompare(b.text, 'de'));
  }

  LWAdmin.termine = termine;
  LWAdmin.termine.iso = iso;
  LWAdmin.termine.plusTage = plusTage;
})();
