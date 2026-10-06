// ═══════════════════════════════════════════════════════
//  Lernwelt – Aufgabentyp „zuordnen“ (Etappe 9): Paare, Kategorien, Satzglieder …
//
//  Stufe in der Inhaltsdatei – eine von zwei Formen:
//    a) feste Aufgaben:  "aufgaben": [ { "frage": "Tom eats pizza.", "paare": [["Tom", "Subjekt"], ["eats", "Verb"]] } ]
//    b) Pool:            "paare": [["Hund", "Nomen"], ["laufen", "Verb"], …], "proAufgabe": 4
//                        (je Aufgabe ein Paar plus zufällige weitere, höchstens proAufgabe)
//  Optional: "ziele": ["Nomen", "Verb", "Adjektiv"] – diese Ziele immer zeigen (Kategorien, feste Reihenfolge),
//            "anweisung": "Ordne jedes Wort seiner Wortart zu." (sonst aus dem Kopf der Datei)
//  Bedienung: links ein Teil antippen, dann das Ziel. Fertig, wenn alles zugeordnet ist.
// ═══════════════════════════════════════════════════════
(function () {
  'use strict';
  const T = window.LernTypen;

  function paareFuer(st, nr) {
    if (Array.isArray(st.aufgaben)) return { frage: st.aufgaben[nr].frage, paare: st.aufgaben[nr].paare || [] };
    const alle = st.paare || [], n = Math.max(2, Math.min(Number(st.proAufgabe) || 4, alle.length));
    const andere = T.mischen(alle.filter((_, i) => i !== nr)).filter((p, i, l) => l.findIndex(q => q[0] === p[0]) === i);
    return { frage: '', paare: T.mischen([alle[nr], ...andere.filter(p => p[0] !== alle[nr][0]).slice(0, n - 1)]) };
  }

  T.typ('zuordnen', {
    anzahl: st => Array.isArray(st.aufgaben) ? st.aufgaben.length : Array.isArray(st.paare) ? st.paare.length : 0,
    aufgabe(st, nr, D) {
      const { frage, paare } = paareFuer(st, nr);
      if (paare.length < 2) return null;
      const ziele = Array.isArray(st.ziele) && st.ziele.length ? st.ziele : T.mischen([...new Set(paare.map(p => p[1]))]);
      const anweisung = st.anweisung || D.anweisung || 'Ordne richtig zu.';
      return {
        art: 'eigen', paare,
        frage: frage || anweisung, hinweis: frage ? anweisung : '',
        text: paare.map(p => p[0] + ' → ' + p[1]).join(' · '),
        tipp: st.tipp, erklaerung: st.erklaerung,
        eingabeText: e => (e || []).map(p => p[0] + ' → ' + p[1]).join(' · '),
        zeige(box, fertig) {
          const links = T.mischen(paare.map(p => p[0])), wahl = {};
          let aktiv = 0;
          const zeichnen = () => {
            box.innerHTML = `<div class="lt-chips">${links.map((l, i) => `<button type="button" class="lt-chip${i === aktiv ? ' an' : ''}${wahl[i] !== undefined ? ' fertig' : ''}" data-l="${i}">
                ${T.esc(l)}${wahl[i] !== undefined ? `<small>→ ${T.esc(wahl[i])}</small>` : ''}</button>`).join('')}</div>
              <div class="lt-ziele">${ziele.map((z, i) => `<button type="button" class="lt-ziel" data-z="${i}">${T.esc(z)}</button>`).join('')}</div>
              <div class="lt-zeile"><button type="button" class="btn p" data-ok ${Object.keys(wahl).length < links.length ? 'disabled style="opacity:.4"' : ''}>✓ Prüfen</button></div>`;
          };
          box.addEventListener('click', e => {
            const l = e.target.closest('[data-l]'), z = e.target.closest('[data-z]');
            if (l) { aktiv = Number(l.dataset.l); return zeichnen(); }
            if (z && aktiv !== null) {
              wahl[aktiv] = ziele[Number(z.dataset.z)];
              const frei = links.findIndex((_, i) => wahl[i] === undefined);   // weiter zum nächsten offenen Teil
              aktiv = frei >= 0 ? frei : null;
              return zeichnen();
            }
            if (e.target.closest('[data-ok]') && Object.keys(wahl).length === links.length) fertig(links.map((x, i) => [x, wahl[i]]));
          });
          zeichnen();
        },
      };
    },
    pruefe: (a, e) => Array.isArray(e) && e.length === a.paare.length
      && e.every(([l, r]) => a.paare.some(p => p[0] === l && T.gleich(p[1], r))),
  });
})();
