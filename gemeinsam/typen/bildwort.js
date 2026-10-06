// ═══════════════════════════════════════════════════════
//  Lernwelt – Aufgabentyp „bildwort“ (Etappe 9): Wortschatz mit Bild und Ton
//
//  Stufe in der Inhaltsdatei:
//    "woerter": [ { "bild": "🍎", "wort": "apple", "de": "Apfel" (optional) } ]
//              bild = Emoji oder Dateiname neben der Inhaltsdatei (z. B. "apfel.svg")
//    "richtung": "bild-wort" (Bild sehen → Wort wählen, Standard)
//              | "wort-bild" (Wort lesen und hören → Bild wählen)
//              | "hoeren"    (nur hören → Bild wählen)
//  Vorgelesen wird in "sprache" aus dem Kopf der Datei (z. B. "en-GB"), sonst Deutsch.
// ═══════════════════════════════════════════════════════
(function () {
  'use strict';
  const T = window.LernTypen;

  T.typ('bildwort', {
    anzahl: st => Array.isArray(st.woerter) && st.woerter.length >= 2 ? st.woerter.length : 0,
    aufgabe(st, nr, D) {
      const w = st.woerter[nr], richtung = st.richtung || 'bild-wort';
      const andere = T.mischen(st.woerter.filter((x, i) => i !== nr && x.wort !== w.wort)).slice(0, 3);
      const auswahl = T.mischen([w, ...andere]);
      const bildWahl = richtung !== 'bild-wort';
      return {
        art: 'eigen', wort: w.wort, text: w.wort + (w.de ? ' (' + w.de + ')' : ''),
        frage: richtung === 'hoeren' ? '🔊 Hör genau hin!' : richtung === 'wort-bild' ? w.wort : 'Was ist das?',
        hinweis: st.anweisung || D.anweisung || (bildWahl ? 'Tippe das passende Bild an.' : 'Tippe das passende Wort an.'),
        ton: bildWahl ? w.wort : '',                        // bei „Bild → Wort“ würde der Ton die Lösung verraten
        eingabeText: e => e,
        zeige(box, fertig) {
          if (!bildWahl) box.innerHTML = `<div class="lt-gross" aria-hidden="true">${T.bildHTML(w.bild, D, '')}</div>`;
          T.knoepfe(box, auswahl.map(x => ({ wert: x.wort, text: bildWahl ? x.bild : x.wort })), fertig, bildWahl);
          if (bildWahl) setTimeout(() => { const b = document.querySelector('[data-vor]'); if (b) b.click(); }, 250);   // einmal vorlesen
        },
      };
    },
    pruefe: (a, e) => T.gleich(a.wort, e),
  });
})();
