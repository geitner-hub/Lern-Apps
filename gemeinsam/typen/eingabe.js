// ═══════════════════════════════════════════════════════
//  Lernwelt – Aufgabentyp „eingabe“ (Etappe 9): kurze Antworten, Rechnen mit Einheiten …
//
//  Stufe in der Inhaltsdatei:
//    "aufgaben": [ { "frage": "3 m = ? cm", "antwort": 300, "einheit": "cm",
//                    "tipp": "1 m = 100 cm" (optional), "erklaerung": "3 · 100 = 300" (optional) } ]
//  Ist die Antwort eine Zahl, kommt die Zifferntastatur des Übungs-Rahmens (Komma erlaubt: 2,5).
//  Sonst tippt das Kind Text; "antwort" darf dann eine Liste mehrerer richtiger Antworten sein.
// ═══════════════════════════════════════════════════════
(function () {
  'use strict';
  const T = window.LernTypen;
  const zahl = v => {
    if (typeof v === 'number') return v;
    const s = String(v == null ? '' : v).trim().replace(/[\s  ]/g, '').replace(/[−–]/g, '-').replace(',', '.');
    return /^-?\d*\.?\d+$/.test(s) ? Number(s) : NaN;
  };

  T.typ('eingabe', {
    anzahl: st => Array.isArray(st.aufgaben) ? st.aufgaben.length : 0,
    aufgabe(st, nr, D) {
      const x = st.aufgaben[nr];
      const antworten = Array.isArray(x.antwort) ? x.antwort : [x.antwort];
      if (!x.frage || !antworten.length || antworten[0] === undefined) return null;
      const einheit = x.einheit ? ' ' + x.einheit : '';
      const a = { frage: x.frage, tipp: x.tipp, erklaerung: x.erklaerung, hinweis: st.anweisung || D.anweisung || '' };
      const w = zahl(antworten[0]);
      if (antworten.length === 1 && Number.isFinite(w)) {
        return Object.assign(a, { art: 'zahl', wert: w, negativ: w < 0, text: String(w).replace('.', ',') + einheit,
          hinweis: a.hinweis || (x.einheit ? 'Antwort in ' + x.einheit : '') });
      }
      return Object.assign(a, { art: 'eigen', antworten: antworten.map(String), text: String(antworten[0]) + einheit,
        zeige: (box, fertig) => T.textfeld(box, fertig) });
    },
    pruefe(a, e) {
      if (a.art === 'zahl') { const z = zahl(e); return Number.isFinite(z) && Math.abs(z - a.wert) < 1e-9; }
      return a.antworten.some(r => T.gleich(r, e));
    },
  });
})();
