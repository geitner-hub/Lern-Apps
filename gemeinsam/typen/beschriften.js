// ═══════════════════════════════════════════════════════
//  Lernwelt – Aufgabentyp „beschriften“ (Etappe 9): Pflanze, Körper, Karte …
//
//  Stufe in der Inhaltsdatei:
//    "bild": "pflanze.svg"   (Datei im selben Ordner wie die Inhaltsdatei, z. B. daten/inhalte/nut/)
//    "marken": [ { "x": 50, "y": 18, "wort": "Blüte", "erklaerung": "…" (optional) } ]
//              x/y in Prozent der Bildbreite/-höhe (0 = links/oben)
//    "anweisung": "Wie heißt der markierte Teil?"
//  Je Aufgabe ist eine Marke hervorgehoben; das Kind wählt aus vier Begriffen der Stufe.
// ═══════════════════════════════════════════════════════
(function () {
  'use strict';
  const T = window.LernTypen;

  T.typ('beschriften', {
    anzahl: st => st.bild && Array.isArray(st.marken) && st.marken.length >= 2 ? st.marken.length : 0,
    aufgabe(st, nr, D) {
      const m = st.marken[nr];
      const woerter = [...new Set(st.marken.map(x => x.wort))];
      const optionen = T.mischen([m.wort, ...T.mischen(woerter.filter(w => w !== m.wort)).slice(0, 3)]);
      return {
        art: 'eigen', wort: m.wort, frage: st.anweisung || D.anweisung || 'Wie heißt der markierte Teil?',
        text: m.wort, erklaerung: m.erklaerung || '', tipp: m.tipp,
        zeige(box, fertig) {
          box.innerHTML = `<div class="lt-bild">${T.bildHTML(st.bild, D, st.titel)}
            ${st.marken.map((x, i) => `<span class="lt-marke${i === nr ? '' : ' leise'}" style="left:${Number(x.x)}%;top:${Number(x.y)}%">${i === nr ? '?' : ''}</span>`).join('')}</div>`;
          T.knoepfe(box, optionen.map(w => ({ wert: w, text: w })), fertig);
        },
      };
    },
    pruefe: (a, e) => T.gleich(a.wort, e),
  });
})();
