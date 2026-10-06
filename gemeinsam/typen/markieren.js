// ═══════════════════════════════════════════════════════
//  Lernwelt – Aufgabentyp „markieren“ (Neue Lern-Apps Etappe 6): im Satz ein Wort antippen –
//  den Fehler, das Signalwort, das Verb … (später auch für Deutsch und DaZ)
//
//  Stufe in der Inhaltsdatei:
//    "aufgaben": [ { "satz": "She [go] to school every day.",
//                    "frage": "Tippe das falsche Wort an." (optional, sonst "anweisung"),
//                    "richtig": "goes" (optional: Verbesserung, erscheint in der Lösung; "" = Wort weglassen),
//                    "tipp": "…", "erklaerung": "…" (optional) } ]
//    "anweisung": "Tippe das Wort an, das falsch ist."
//  Das gesuchte Wort steht in [eckigen Klammern] (genau eine Stelle; mehrere Wörter in einer
//  Klammer sind ein Baustein, z. B. "[every day]"). Satzzeichen bleiben am Wort, zählen aber nicht.
// ═══════════════════════════════════════════════════════
(function () {
  'use strict';
  const T = window.LernTypen;
  const KLAMMER = /\[([^\]]+)\]/;

  /** Satz in antippbare Bausteine zerlegen; der Baustein in [ ] ist das Ziel */
  function bausteine(satz) {
    const m = KLAMMER.exec(satz);
    if (!m) return null;
    const vor = satz.slice(0, m.index).split(/\s+/).filter(Boolean);
    const nach = satz.slice(m.index + m[0].length);
    // Satzzeichen direkt nach der Klammer gehören zum Baustein ("[go]." → "go.")
    const anhang = (nach.match(/^[^\s]*/) || [''])[0];
    const rest = nach.slice(anhang.length).split(/\s+/).filter(Boolean);
    const teile = vor.concat([m[1] + anhang], rest);
    return { teile, ziel: vor.length };
  }

  T.typ('markieren', {
    anzahl: st => Array.isArray(st.aufgaben) ? st.aufgaben.length : 0,
    aufgabe(st, nr, D) {
      const x = st.aufgaben[nr], b = x && bausteine(String(x.satz || ''));
      if (!b) return null;
      const anweisung = st.anweisung || D.anweisung || 'Tippe das richtige Wort an.';
      const ohne = String(x.satz).replace(KLAMMER, '$1');
      const weg = x.richtig === '';                     // "richtig": "" → Wort muss weg (I can [to] dance.)
      const loesung = weg ? String(x.satz).replace(KLAMMER, '').replace(/\s{2,}/g, ' ').trim()
        : x.richtig ? String(x.satz).replace(KLAMMER, x.richtig) : ohne;
      return {
        art: 'eigen', teile: b.teile, ziel: b.ziel,
        frage: x.frage || anweisung, hinweis: x.frage ? anweisung : '',
        text: weg ? `${T.textOhneSatzzeichen(b.teile[b.ziel])} → weglassen: ${loesung}`
          : x.richtig ? `${T.textOhneSatzzeichen(b.teile[b.ziel])} → ${x.richtig}: ${loesung}` : T.textOhneSatzzeichen(b.teile[b.ziel]),
        tipp: x.tipp, erklaerung: x.erklaerung,
        eingabeText: i => (Number.isInteger(i) && b.teile[i] != null ? T.textOhneSatzzeichen(b.teile[i]) : ''),
        zeige(box, fertig) {
          box.innerHTML = `<div class="lt-chips lt-markieren">${b.teile.map((t, i) =>
            `<button type="button" class="lt-chip" data-i="${i}">${T.esc(t)}</button>`).join('')}</div>`;
          box.firstElementChild.addEventListener('click', e => {
            const k = e.target.closest('[data-i]');
            if (!k) return;
            k.classList.add('an');
            fertig(Number(k.dataset.i));
          });
        },
      };
    },
    pruefe: (a, i) => i === a.ziel,
  });
})();
