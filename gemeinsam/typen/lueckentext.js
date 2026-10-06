// ═══════════════════════════════════════════════════════
//  Lernwelt – Aufgabentyp „lueckentext“ (Etappe 9): Grammatik, Rechtschreibung, Fachbegriffe …
//
//  Stufe in der Inhaltsdatei:
//    "aufgaben": [ { "text": "He ___ football after school.", "antwort": "plays",
//                    "optionen": ["play", "plays"] (optional → Antippen statt Tippen),
//                    "tipp": "he → +s" (optional), "erklaerung": "…" (optional) } ]
//    "anweisung": "Setze die richtige Verbform ein."
//  Eine Lücke je Aufgabe (___). "antwort" darf eine Liste sein (mehrere richtige Antworten).
//  Ohne "optionen" tippt das Kind die Antwort (Groß/klein und Satzzeichen am Ende egal).
// ═══════════════════════════════════════════════════════
(function () {
  'use strict';
  const T = window.LernTypen;
  const LUECKE = /_{2,}/;

  T.typ('lueckentext', {
    anzahl: st => Array.isArray(st.aufgaben) ? st.aufgaben.length : 0,
    aufgabe(st, nr, D) {
      const x = st.aufgaben[nr];
      const antworten = (Array.isArray(x.antwort) ? x.antwort : [x.antwort]).map(String).filter(Boolean);
      if (!x.text || !LUECKE.test(x.text) || !antworten.length) return null;
      const anweisung = st.anweisung || D.anweisung || 'Fülle die Lücke.';
      const a = {
        antworten, frage: x.text.replace(LUECKE, '_____'), hinweis: anweisung,
        text: x.text.replace(LUECKE, antworten[0]), tipp: x.tipp, erklaerung: x.erklaerung,
      };
      if (Array.isArray(x.optionen) && x.optionen.length >= 2) return Object.assign(a, { art: 'wahl', optionen: T.mischen(x.optionen.map(String)) });
      return Object.assign(a, { art: 'eigen', zeige: (box, fertig) => T.textfeld(box, fertig, 'Wort für die Lücke') });
    },
    pruefe: (a, e) => a.antworten.some(r => T.gleich(r, e)),
  });
})();
