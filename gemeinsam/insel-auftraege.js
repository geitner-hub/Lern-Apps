// ═══════════════════════════════════════════════════════
//  Lernwelt – insel-auftraege.js   („Die Insel“: Auftragsrahmen)
//
//  Wird geladen von: spiele/insel.html
//  Bausteine: daten/insel-auftraege.json (Bewohner, Merkmale, Warenkisten, Paket-Orte, Satzrahmen je Stufe)
//
//  Grundsatz: Die Antwort ist eine Handlung in der Welt, keine eingeblendete Frage.
//    finden   „Please find the girl with a yellow T-shirt.“ → zur richtigen Person gehen, 🔍 antippen
//    bringen  „Please bring me three eggs. The eggs are behind the red house.“ → Kiste finden,
//             genau so viele nehmen, der richtigen Person geben
//    suchen   „I have lost my parcel. It is next to the well.“ → das richtige Paket öffnen
//  Gewertet wird nur der erste Versuch: Ein falscher Versuch (falsche Person, falsches Ding, falsche
//  Anzahl, leeres Paket) setzt auftrag.fehler – der Auftrag bleibt offen, bis er erledigt ist.
//  Ziele liegen nie direkt beim Auftraggeber (mindestens 20 Blöcke; Bewohner, Kisten und Paket-Orte
//  stehen untereinander ebenfalls mindestens 20 Blöcke auseinander – pruefen.py prüft das).
//
//  API (window.LernInselAuftraege):
//    erstelle(daten, { orte, rnd }) → rahmen
//      orte: { <platz-id>: { x, z, blick } } aus der Welt (welt.orte.plaetze)
//      rahmen.bewohner                 Bewohner mit Position (x, z, blick)
//      rahmen.neu(stufe, geberId, verlauf)  → auftrag { id, art, stufe, geber, ziel, ding, anzahl, text, fehler }
//      rahmen.sprechen(auftrag, bewohnerId) → null | { ok, versuch, text }   (finden)
//      rahmen.geben(auftrag, bewohnerId, korb) → null | { ok, versuch, text }  (bringen)
//      rahmen.oeffnen(auftrag, ortId)       → { ok, versuch, text }           (suchen)
//      rahmen.vielfalt(stufe, n)            → Anzahl verschiedener Aufträge in n Versuchen (zum Prüfen)
// ═══════════════════════════════════════════════════════

(function () {
  'use strict';
  if (window.LernInselAuftraege) return;

  const ABSTAND = 20;                                  // Ziel nie näher als so viele Blöcke am Auftraggeber

  function erstelle(D, opt = {}) {
    const rnd = opt.rnd || Math.random;
    const orte = opt.orte || {};
    const wahl = l => l[Math.floor(rnd() * l.length)];
    const abstand = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
    const gross = s => s.charAt(0).toUpperCase() + s.slice(1);

    const bewohner = (D.bewohner || []).map(b => {
      const o = orte[b.platz];
      return o ? Object.assign({}, b, { x: o.x, z: o.z, blick: o.blick || 0 }) : null;
    }).filter(Boolean);
    const nachId = id => bewohner.find(b => b.id === id);
    const quellen = (D.quellen || []).map(q => Object.assign({}, q, { x: q.x + .5, z: q.z + .5 }));
    const suchorte = (D.suchorte || []).map(s => Object.assign({}, s, { x: s.x + .5, z: s.z + .5 }));
    const st = n => String(Math.max(1, Math.min(3, n || 1)));

    /** Satzrahmen füllen: {Er} groß, sonst wie angegeben */
    function fuellen(vorlage, w) {
      return vorlage.replace(/\{(\w+)\}/g, (_, k) => {
        if (w[k] !== undefined) return w[k];
        const klein = k.charAt(0).toLowerCase() + k.slice(1);
        if (k !== klein && w[klein] !== undefined) return gross(String(w[klein]));
        return '';
      }).replace(/\s+/g, ' ').trim();
    }
    const zahl = n => (D.zahlen && D.zahlen[n]) || String(n);
    const menge = (q, n) => zahl(n) + ' ' + (n === 1 ? q.eins : q.viele);
    const personWerte = (b, s) => {
      const m = wahl(b.merkmale);
      const andere = b.merkmale.filter(x => x !== m);
      return { typ: b.typ, er: b.er, ihn: b.ihn, m, m2: andere.length ? wahl(andere) : m,
        ort: wahl(b.ort || ['in the village']), ort3: wahl(b.ort3 || b.ort || ['in the village']),
        kl: wahl(b.kleidung || b.merkmale), name: b.name };
    };

    function einAuftrag(stufe, geber) {
      const s = st(stufe);
      const arten = (D.arten && D.arten[s]) || ['finden', 'bringen', 'suchen'];
      const art = wahl(arten);
      const saetze = (D.saetze && D.saetze[art] && D.saetze[art][s]) || [];
      if (!saetze.length) return null;
      const a = { art, stufe: +s, geber: geber.id, fehler: false };
      if (art === 'finden') {
        const ziele = bewohner.filter(b => b.id !== geber.id && abstand(b, geber) >= ABSTAND);
        if (!ziele.length) return null;
        const z = wahl(ziele);
        a.ziel = z.id;
        a.text = fuellen(wahl(saetze), personWerte(z, s));
      } else if (art === 'bringen') {
        const empfaenger = s === '1' ? geber : wahl(bewohner.filter(b => b.id !== geber.id));
        if (!empfaenger) return null;
        // Kiste weder beim Auftraggeber noch beim Empfänger (sonst muss man nicht hinlaufen)
        const qs = quellen.filter(q => abstand(q, geber) >= ABSTAND && abstand(q, empfaenger) >= ABSTAND);
        if (!qs.length) return null;
        const q = wahl(qs);
        const [von, bis] = (D.anzahl && D.anzahl[s]) || [1, 6];
        const n = von + Math.floor(rnd() * (bis - von + 1));
        Object.assign(a, { ziel: empfaenger.id, ding: q.id, anzahl: n });
        a.text = fuellen(wahl(saetze), Object.assign(personWerte(empfaenger, s),
          { n: zahl(n), dinge: n === 1 ? q.eins : q.viele, viele: q.viele, qort: wahl(q.ort[s] || q.ort['1']) }));
      } else {
        const os = suchorte.filter(o => abstand(o, geber) >= ABSTAND);
        if (!os.length) return null;
        const o = wahl(os);
        a.ziel = o.id;
        a.text = fuellen(wahl(saetze), { port: wahl(o.ort[s] || o.ort['1']) });
      }
      a.id = (art + ':' + a.ziel + ':' + (a.ding || '') + ':' + (a.anzahl || '') + ':' + a.text).slice(0, 200);
      return a;
    }

    /** Neuer Auftrag; vermeidet die zuletzt gestellten (verlauf: Liste von IDs) */
    function neu(stufe, geberId, verlauf = []) {
      const geber = nachId(geberId);
      if (!geber) return null;
      let a = null;
      for (let i = 0; i < 12; i++) {
        a = einAuftrag(stufe, geber);
        if (a && !verlauf.includes(a.id)) break;
      }
      return a;
    }
    const antwort = (art, w = {}) => fuellen(wahl((D.antworten && D.antworten[art]) || ['…']), w);

    function sprechen(a, id) {
      if (!a || a.art !== 'finden' || id === a.geber) return null;
      if (id === a.ziel) return { ok: true, versuch: true, text: antwort('gefunden') };
      const b = nachId(id);
      return { ok: false, versuch: true, text: antwort('nichtich', b ? { m: wahl(b.merkmale) } : {}) };
    }
    function geben(a, id, korb) {
      if (!a || a.art !== 'bringen' || !korb || !korb.n) return null;
      const q = quellen.find(x => x.id === a.ding);
      if (id !== a.ziel) return { ok: false, versuch: true, text: antwort('nichtfuermich') };
      if (korb.ding !== a.ding) return { ok: false, versuch: true, text: antwort('falschesding', { n: zahl(a.anzahl), dinge: q ? (a.anzahl === 1 ? q.eins : q.viele) : '' }) };
      if (korb.n !== a.anzahl) return { ok: false, versuch: true, text: antwort('falscheanzahl', { n: zahl(a.anzahl), k: zahl(korb.n), dinge: q ? q.viele : '' }) };
      return { ok: true, versuch: true, text: antwort('danke') };
    }
    function oeffnen(a, ortId) {
      if (!a || a.art !== 'suchen') return { ok: false, versuch: false, text: antwort('leer') };
      if (ortId === a.ziel) return { ok: true, versuch: true, text: antwort('paketda') };
      return { ok: false, versuch: true, text: antwort('leer') };
    }
    function vielfalt(stufe, n = 4000) {
      const ids = new Set();
      for (let i = 0; i < n; i++) {
        const a = einAuftrag(stufe, wahl(bewohner));
        if (a) ids.add(a.id);
      }
      return ids.size;
    }
    return { bewohner, quellen, suchorte, neu, sprechen, geben, oeffnen, vielfalt, menge: (id, n) => { const q = quellen.find(x => x.id === id); return q ? menge(q, n) : ''; } };
  }

  window.LernInselAuftraege = { erstelle, ABSTAND };
})();
