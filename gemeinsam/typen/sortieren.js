// ═══════════════════════════════════════════════════════
//  Lernwelt – Aufgabentyp „sortieren“ (Etappe 9): Satzbau, Reihenfolgen, Zeitstrahl …
//
//  Stufe in der Inhaltsdatei:
//    "aufgaben": [ { "teile": ["She", "reads", "a book", "every day"], "loesung": "She reads a book every day.",
//                    "frage": "…" (optional), "tipp": "…" (optional) } ]
//    "trenner": " "   (optional: wie die Teile in der Lösung verbunden werden; Zeitstrahl z. B. " → ")
//    "anweisung": "Bring die Wörter in die richtige Reihenfolge."
//  Die Teile stehen in der Datei in der RICHTIGEN Reihenfolge; gemischt wird beim Anzeigen.
//  Bedienung: Teile antippen → wandern in die Zeile; dort antippen → zurück.
// ═══════════════════════════════════════════════════════
(function () {
  'use strict';
  const T = window.LernTypen;

  T.typ('sortieren', {
    anzahl: st => Array.isArray(st.aufgaben) ? st.aufgaben.length : 0,
    aufgabe(st, nr, D) {
      const x = st.aufgaben[nr], teile = Array.isArray(x.teile) ? x.teile : [];
      if (teile.length < 2) return null;
      const trenner = st.trenner == null ? ' ' : String(st.trenner);
      const anweisung = st.anweisung || D.anweisung || 'Bring die Teile in die richtige Reihenfolge.';
      return {
        art: 'eigen', teile, trenner,
        frage: x.frage || anweisung, hinweis: x.frage ? anweisung : '',
        text: x.loesung || teile.join(trenner), tipp: x.tipp, erklaerung: x.erklaerung,
        eingabeText: e => (e || []).join(trenner),
        zeige(box, fertig) {
          let rest = T.mischen(teile.map((t, i) => i));
          for (let v = 0; v < 5 && rest.every((t, i) => teile[t] === teile[i]); v++) rest = T.mischen(rest);   // nicht schon fertig gemischt
          const gelegt = [];
          const zeichnen = () => {
            box.innerHTML = `<div class="lt-satz">${gelegt.map((t, i) => `<button type="button" class="lt-chip fertig" data-zurueck="${i}">${T.esc(teile[t])}</button>`).join('')}</div>
              <div class="lt-chips">${rest.map((t, i) => `<button type="button" class="lt-chip" data-nimm="${i}">${T.esc(teile[t])}</button>`).join('')}</div>
              <div class="lt-zeile"><button type="button" class="btn" data-neu>↺ Neu</button>
                <button type="button" class="btn p" data-ok ${rest.length ? 'disabled style="opacity:.4"' : ''}>✓ Prüfen</button></div>`;
          };
          box.addEventListener('click', e => {
            const n = e.target.closest('[data-nimm]'), z = e.target.closest('[data-zurueck]');
            if (n) { gelegt.push(rest.splice(Number(n.dataset.nimm), 1)[0]); return zeichnen(); }
            if (z) { rest.push(gelegt.splice(Number(z.dataset.zurueck), 1)[0]); return zeichnen(); }
            if (e.target.closest('[data-neu]')) { rest = rest.concat(gelegt.splice(0)); return zeichnen(); }
            if (e.target.closest('[data-ok]') && !rest.length) fertig(gelegt.map(t => teile[t]));
          });
          zeichnen();
        },
      };
    },
    // Gleiche Wörter dürfen die Plätze tauschen – verglichen wird der Text, nicht die Kärtchen
    pruefe: (a, e) => Array.isArray(e) && e.length === a.teile.length && e.every((t, i) => T.gleich(t, a.teile[i])),
  });
})();
