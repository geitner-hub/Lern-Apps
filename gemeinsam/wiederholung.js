// ═══════════════════════════════════════════════════════
//  Lernwelt – wiederholung.js   (Wiederholung mit Abstand, Infrastruktur Etappe 8)
//
//  Was ein Kind gemeistert hat, wird nach RULES.wiederholung Tagen (7, 21, 60) wieder fällig.
//  Die Daten schreibt pass.js in den Lernstand (je Inhalt: m = gemeistert am, r = letzte gute
//  Runde, w = geschaffte Wiederholungen); hier wird nur ausgewertet – es wird nichts gespeichert.
//  Eine gute Runde (ab der Schwelle für „Meine Themen“) in einem fälligen Inhalt zählt als
//  Wiederholung; nach der letzten Stufe gilt der Inhalt als gefestigt.
//
//  Braucht: pass.js (LernPass) und katalog.js (LernKatalog); freigabe.js, falls geladen
//  (gesperrte Themen werden nie fällig).
//
//  API (window.LernWiederholung):
//    faellig({ max })  → [{ thema, titel, inhalte: [alte Inhalt-IDs], tage, stufe, link }]
//                        nach Dringlichkeit sortiert; tage = so viele Tage schon fällig (0 = heute)
//                        link = Adresse ab Hauptordner oder null (z. B. nur in Spielen)
//    inhalte()         → alle fälligen Inhalt-IDs (für „Meine Themen“ und das Dorf)
// ═══════════════════════════════════════════════════════

(function () {
  'use strict';
  if (window.LernWiederholung) return;

  // Engine-Apps, die mit ?stufe=ID direkt eine Runde starten (ueben.js)
  const DIREKT = ['apps/mathe/kopfrechnen.html', 'apps/mathe/mathe-trainer.html', 'apps/mathe/laengeneinheiten.html', 'apps/typen/uebung.html'];

  const tag = d => new Date(d + 'T12:00:00').getTime();
  function heute() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function linkFuer(t, K) {
    const q = t.quelle || (t.eltern && K.thema(t.eltern) && K.thema(t.eltern).quelle);
    if (!q || !q.app || /^archiv\//.test(q.app)) return null;
    const p = new URLSearchParams(q.parameter || '');
    if (t.eltern && DIREKT.includes(q.app)) p.set('stufe', t.id);
    const s = p.toString();
    return q.app + (s ? '?' + s : '');
  }

  function faellig(o = {}) {
    const P = window.LernPass, K = window.LernKatalog, F = window.LernFreigabe;
    if (!P || !P.lernstand || !K || !K.geladen || !K.geladen()) return [];
    const I = (P.RULES && P.RULES.wiederholung) || [7, 21, 60];
    const jetzt = tag(heute()), L = P.lernstand, nach = {};
    Object.keys(L).forEach(id => {
      const e = L[id];
      if (!e || e.f !== true) return;
      const w = e.w || 0, ab = e.r || e.m || e.last;
      if (w >= I.length || !ab) return;
      const tage = Math.floor((jetzt - tag(ab)) / 864e5) - I[w];
      if (tage < 0) return;
      const tid = K.fuerInhalt(id);
      const t = tid && K.thema(tid);
      if (!t || (F && !F.erlaubt(t.id))) return;
      const eltern = t.eltern && K.thema(t.eltern);
      // Stufen mit eigenem App-Namen („Mathe-Trainer: Brüche“) ohne das Thema davor; „Kopfrechnen Klasse 5 – leicht“ bleibt ganz
      const kurz = eltern ? String(t.titel).replace(eltern.titel + ' – ', '') : t.titel;
      const titel = kurz.includes(':') ? kurz : t.titel;
      const x = nach[t.id] || (nach[t.id] = { thema: t.id, titel, inhalte: [], tage, stufe: w, link: linkFuer(t, K) });
      x.inhalte.push(id);
      x.tage = Math.max(x.tage, tage);
    });
    const liste = Object.values(nach).sort((a, b) => b.tage - a.tage || a.stufe - b.stufe);
    return o.max ? liste.slice(0, o.max) : liste;
  }

  const inhalte = () => faellig().flatMap(x => x.inhalte);

  window.LernWiederholung = { faellig, inhalte };
})();
