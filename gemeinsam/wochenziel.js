// ═══════════════════════════════════════════════════════
//  Lernwelt – wochenziel.js   (Wochenziel, Aktionsplan „Lernwelt – Tempo“, Etappe 7)
//
//  Am Anfang der Woche wählt das Kind auf der Startseite EIN Ziel aus drei Vorschlägen; die Startseite zeigt den Stand,
//  ab Freitag folgt ein Rückblick mit einem Satz zum Antippen. Freiwillig: kein Ziel gewählt oder verfehlt → keine Strafe,
//  keine XP weniger; der Rückblick fragt nur, woran es lag. Belohnt wird nichts nach Zeit – alle Ziele zählen Geleistetes.
//    tage      an N Tagen gut geübt        (LernPass.weekInfo().goodDays – das bisherige Wochenziel des Passes)
//    runden    N gute Runden               (LernPass.state.goodRounds seit der Wahl)
//    schritte  N Schritte auf dem Laufzettel (abgehakte jw:-Einträge seit der Wahl) – nur, wenn es einen Laufzettel gibt
//    themen    N neue Themen gemeistert    (Lernstand mit f seit der Wahl) – sonst
//  Gespeichert nur auf diesem Gerät (lernwelt-wochenziel): { w: Montag, d: Tag der Wahl, art, ziel, basis, r?: Rückblick, alt: [{ w, art, ok, r }] }.
//
//    LernWochenziel.stand()        → { gewaehlt, art, ist, ziel, fertig, text, rueckblickDran, rueckblick, vorschlaege }
//    LernWochenziel.waehlen(art) · LernWochenziel.rueckblick(nr)
//    LernWochenziel.html()         → Karte für die Startseite (Knöpfe: data-wz-art, data-wz-r)
// ═══════════════════════════════════════════════════════
'use strict';

(function () {
  if (window.LernWochenziel) return;
  const KEY = 'lernwelt-wochenziel';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const P = () => window.LernPass;
  const GRUENDE = ['Ich hatte zu wenig Zeit.', 'Es war zu schwer.', 'Ich habe es vergessen.', 'Nächste Woche schaffe ich es!'];
  const ARTEN = {
    tage:     { ic: '📅', ziel: 3, wahl: 'An 3 Tagen üben',              was: n => (n === 1 ? 'Tag' : 'Tagen') + ' geübt' },
    runden:   { ic: '💪', ziel: 6, wahl: '6 gute Runden schaffen',       was: () => 'guten Runden' },
    schritte: { ic: '📒', ziel: 4, wahl: '4 Schritte auf dem Laufzettel', was: () => 'Schritten auf dem Laufzettel' },
    themen:   { ic: '⭐', ziel: 2, wahl: '2 neue Themen meistern',        was: () => 'neuen Themen gemeistert' },
  };

  function lies() { try { const d = JSON.parse(localStorage.getItem(KEY) || 'null'); return d && typeof d === 'object' ? d : {}; } catch (e) { return {}; } }
  function schreibe(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { if (window.LW && LW.speicher) LW.speicher.fehlgeschlagen(e); } }
  const woche = () => (P() && P()._weekKey ? P()._weekKey() : '');
  const heute = () => (P() && P()._dayKey ? P()._dayKey() : '');
  function zaehler(art) {
    const L = (P() && P().lernstand) || {};
    if (art === 'tage') return P().weekInfo().goodDays;
    if (art === 'runden') return (P().state && P().state.goodRounds) || 0;
    if (art === 'schritte') return Object.keys(L).filter(k => k.startsWith('jw:') && L[k] && L[k].e).length;
    return Object.keys(L).filter(k => !k.startsWith('jw:') && L[k] && L[k].f === true).length;
  }
  const hatLaufzettel = () => { const L = (P() && P().lernstand) || {}, F = window.LernFreigabe, c = F && F.journey && F.journey('journey6');
    return Object.keys(L).some(k => k.startsWith('jw:')) || !!(c && c.bis && F.wer && F.wer().some(w => typeof c.bis[w] === 'string')); };

  /** Neue Woche: das alte Ziel wandert in den Verlauf (höchstens 8 Wochen) */
  function aktuell() {
    const d = lies(), w = woche();
    if (d.w && d.w !== w) {
      const alt = (Array.isArray(d.alt) ? d.alt : []).concat([{ w: d.w, art: d.art, ok: !!d.ok, r: d.r || '' }]).slice(-8);
      const neu = { alt };
      schreibe(neu);
      return neu;
    }
    return d;
  }
  function stand() {
    if (!P() || !P().hasProfile || !P().hasProfile()) return null;
    const d = aktuell(), tag = new Date().getDay();                   // 0 = Sonntag
    const vorschlaege = ['tage', 'runden', hatLaufzettel() ? 'schritte' : 'themen'];
    if (!d.art || !ARTEN[d.art]) return { gewaehlt: false, vorschlaege };
    const A = ARTEN[d.art], ist = Math.max(0, zaehler(d.art) - (d.art === 'tage' ? 0 : d.basis || 0)), fertig = ist >= d.ziel;
    if (fertig && !d.ok) { d.ok = true; schreibe(d); }
    // Rückblick ab Freitag – aber nicht am Tag der Wahl
    return { gewaehlt: true, art: d.art, ist: Math.min(ist, d.ziel), ziel: d.ziel, fertig, text: `${Math.min(ist, d.ziel)} von ${d.ziel} ${A.was(d.ziel)}`,
      rueckblickDran: !fertig && !d.r && d.d !== heute() && (tag === 5 || tag === 6 || tag === 0), rueckblick: d.r || '', vorschlaege };
  }
  function waehlen(art) {
    if (!ARTEN[art] || !P() || !woche()) return;
    const d = aktuell();
    schreibe(Object.assign({ alt: d.alt || [] }, { w: woche(), d: heute(), art, ziel: ARTEN[art].ziel, basis: zaehler(art) }));
  }
  function rueckblick(nr) { const d = aktuell(); if (d.art && GRUENDE[nr]) { d.r = GRUENDE[nr]; schreibe(d); } }

  function html() {
    const s = stand();
    if (!s) return '';
    const kopf = t => `<div class="wz"><b>🎯 ${t}</b>`;
    if (!s.gewaehlt) return `${kopf('Dein Wochenziel – such dir eins aus')}<div class="wz-wahl">${s.vorschlaege.map(a =>
      `<button type="button" data-wz-art="${a}">${ARTEN[a].ic} ${esc(ARTEN[a].wahl)}</button>`).join('')}</div></div>`;
    const balken = `<div class="wz-balken"><i style="width:${Math.round(100 * s.ist / s.ziel)}%"></i></div>`;
    if (s.fertig) return `${kopf('Wochenziel geschafft! 🎉')}<small>${ARTEN[s.art].ic} ${esc(s.text)} – das hast du dir selbst vorgenommen.</small>${balken}</div>`;
    if (s.rueckblickDran) return `${kopf('Wochenziel: ' + esc(s.text))}${balken}<small>Die Woche ist fast vorbei. Woran lag es?</small>
      <div class="wz-wahl">${GRUENDE.map((g, i) => `<button type="button" data-wz-r="${i}">${esc(g)}</button>`).join('')}</div></div>`;
    return `${kopf('Wochenziel: ' + esc(s.text))}${balken}${s.rueckblick ? `<small>„${esc(s.rueckblick)}“ – nächste Woche suchst du dir ein neues Ziel aus.</small>` : ''}</div>`;
  }

  window.LernWochenziel = { stand, waehlen, rueckblick, html };
})();
