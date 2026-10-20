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
//    erstelleTal(daten.tal, { plaetze })   → Bauaufträge im Baumeister-Tal (siehe unten): neu(stufe, verlauf),
//                                            bruecke(), bezahlen(korb, betrag, auftrag)
//    erstelleHochland(daten.hochland, { raster, geber }) → Schatzsuche: neu(stufe, verlauf), graben(auftrag, id),
//                                            feld(ort) → Planquadrat, vielfalt(stufe)
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

    function einAuftrag(stufe, geber, vorgabe = {}) {
      const s = st(stufe);
      const arten = (D.arten && D.arten[s]) || ['finden', 'bringen', 'suchen'];
      const art = vorgabe.art || wahl(arten);
      const saetze = vorgabe.saetze || (D.saetze && D.saetze[art] && D.saetze[art][s]) || [];
      if (!saetze.length) return null;
      const a = { art, stufe: +s, geber: geber.id, fehler: false };
      if (art === 'finden') {
        const ziele = bewohner.filter(b => b.id !== geber.id && abstand(b, geber) >= ABSTAND);
        if (!ziele.length) return null;
        const z = wahl(ziele);
        a.ziel = z.id;
        a.text = fuellen(wahl(saetze), personWerte(z, s));
      } else if (art === 'bringen') {
        const empfaenger = s === '1' || vorgabe.selbst ? geber : wahl(bewohner.filter(b => b.id !== geber.id));
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
    function neu(stufe, geberId, verlauf = [], vorgabe) {
      const geber = nachId(geberId);
      if (!geber) return null;
      let a = null;
      for (let i = 0; i < 12; i++) {
        a = einAuftrag(stufe, geber, vorgabe);
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

  // ── Baumeister-Tal (Etappe 5): Bauaufträge mit Mathe, deutsch ─────────
  //  zaun     Weide a × b m, Pfosten im Abstand 1 m → Umfang 2·(a+b) Pfosten kaufen und setzen (Stufe 3: mit Tor)
  //  felder   r Reihen mit je s Pflanzen → r·s Setzlinge (Stufe 3: n Pflanzen in r Reihen → n : r je Reihe)
  //  lager    Zahl in Tausender-, Hunderter-, Zehner- und Einerkisten (je Sorte höchstens 9; Stufe 3: Zahlwort)
  //  haendler Waren kaufen und passend bezahlen (Preis selbst ausrechnen)
  //  bruecke  großer Auftrag: Fluss w m, Brett 50 cm → 2·w Bretter, eine Reihe über den Fluss öffnet das Hochland
  //  Prüfung: die Welt (Bauplan des Bauplatzes) bzw. der Händler (passend bezahlt?). Kein Fragenfenster.
  const EINER = ['', 'ein', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun'];
  const ZEHNER = ['', 'zehn', 'zwanzig', 'dreißig', 'vierzig', 'fünfzig', 'sechzig', 'siebzig', 'achtzig', 'neunzig'];
  const TEENS = { 10: 'zehn', 11: 'elf', 12: 'zwölf', 13: 'dreizehn', 14: 'vierzehn', 15: 'fünfzehn', 16: 'sechzehn', 17: 'siebzehn', 18: 'achtzehn', 19: 'neunzehn' };
  function zahlwort(n) {                              // 1 … 9999, z. B. 2348 → „zweitausenddreihundertachtundvierzig“
    const unter100 = k => (k < 10 ? (k === 1 ? 'eins' : EINER[k]) : TEENS[k] || (k % 10 ? EINER[k % 10] + 'und' : '') + ZEHNER[Math.floor(k / 10)]);
    let s = '';
    const t = Math.floor(n / 1000), h = Math.floor(n % 1000 / 100), r = n % 100;
    if (t) s += EINER[t] + 'tausend';
    if (h) s += EINER[h] + 'hundert';
    if (r) s += unter100(r);
    return s || 'null';
  }

  function erstelleTal(D, opt = {}) {
    const rnd = opt.rnd || Math.random;
    const wahl = l => l[Math.floor(rnd() * l.length)];
    const zwischen = (a, b) => a + Math.floor(rnd() * (b - a + 1));
    const st = n => String(Math.max(1, Math.min(3, n || 1)));
    const plaetze = opt.plaetze || {};
    const preise = D.preise || {};
    const namen = D.namen || {};
    const menge = (block, n) => n + ' ' + ((namen[block] || [block, block])[n === 1 ? 0 : 1]);
    const liste = teile => teile.length > 1 ? teile.slice(0, -1).join(', ') + ' und ' + teile[teile.length - 1] : teile[0];
    const fuellen = (vorlage, w) => vorlage.replace(/\{(\w+)\}/g, (_, k) => (w[k] !== undefined ? w[k] : ''));
    const satz = (art, s, w) => fuellen(wahl(((D.saetze || {})[art] || {})[s] || ['…']), w);
    const budget = kosten => Math.ceil((kosten + 3) / 5) * 5 + 5;   // etwas mehr Geld, als man braucht

    function zaun(s) {
      const p = plaetze.weide; if (!p) return null;
      const maxA = p.x1 - p.x0, maxB = p.z1 - p.z0;           // (a+1) × (b+1) Felder müssen passen
      const [a, b] = s === '1' ? [zwischen(3, Math.min(5, maxA)), zwischen(2, Math.min(3, maxB))] : [zwischen(4, maxA), zwischen(3, maxB)];
      const tor = s === '3' ? 1 : 0;
      const bedarf = 2 * (a + b) - tor;
      return { art: 'zaun', platz: p.id, plan: { art: 'ring', a, b, tor, block: 'ZAUN' }, material: 'ZAUN', bedarf,
        geld: budget(bedarf * (preise.ZAUN || 2)), text: satz('zaun', s, { a, b }) };
    }
    function felder(s) {
      const p = plaetze.felder; if (!p) return null;
      const breit = p.x1 - p.x0 + 1, tief = p.z1 - p.z0 + 1;
      const r = zwischen(2, Math.min(s === '1' ? 4 : 5, tief)), je = zwischen(s === '1' ? 2 : 3, Math.min(s === '1' ? 5 : 7, breit));
      const n = r * je;
      return { art: 'felder', platz: p.id, plan: { art: 'rechteck', a: je, b: r, block: 'PFLANZE' }, material: 'PFLANZE', bedarf: n,
        geld: budget(n * (preise.PFLANZE || 1)), text: satz('felder', s, { r, s: je, n }) };
    }
    function lager(s) {
      const p = plaetze.lager; if (!p) return null;
      let zahl;
      do { zahl = s === '1' ? zwischen(120, 999) : zwischen(1100, 9999); } while (String(zahl).split('').some(z => z === '0') && rnd() < .6);
      return { art: 'lager', platz: p.id, plan: { art: 'summe', zahl }, zahl,
        text: satz('lager', s, { zahl: zahl.toLocaleString('de-DE'), wort: zahlwort(zahl) }) };
    }
    function haendler(s) {
      const sorten = Object.keys(preise).filter(k => namen[k]);
      const anzahl = s === '1' ? 1 : s === '2' ? 2 : 3;
      const gewaehlt = [];
      while (gewaehlt.length < Math.min(anzahl, sorten.length)) { const k = wahl(sorten); if (!gewaehlt.includes(k)) gewaehlt.push(k); }
      const waren = {};
      gewaehlt.forEach(k => { waren[k] = zwischen(2, s === '1' ? 6 : 9); });
      const kosten = gewaehlt.reduce((sum, k) => sum + waren[k] * preise[k], 0);
      return { art: 'haendler', waren, kosten, geld: Math.ceil((kosten + 1) / 10) * 10 + 10,
        text: satz('haendler', s, { liste: liste(gewaehlt.map(k => menge(k, waren[k]))) }) };
    }
    const ARTEN = { zaun, felder, lager, haendler };

    function neu(stufe, verlauf = []) {
      const s = st(stufe);
      let a = null;
      for (let i = 0; i < 12; i++) {
        const art = wahl((D.arten && D.arten[s]) || Object.keys(ARTEN));
        a = ARTEN[art] && ARTEN[art](s);
        if (!a) continue;
        a.id = (a.art + ':' + a.text).slice(0, 200);
        if (!verlauf.includes(a.id)) break;
      }
      if (a) Object.assign(a, { gebiet: 'tal', stufe: +s, fehler: false });
      return a;
    }
    /** Der große Auftrag: Brücke ins Hochland (Breite des Flusses aus der Welt) */
    function bruecke() {
      const p = plaetze['bruecke-hochland']; if (!p) return null;
      const zeilen = Object.values(p.luecken || {}).map(l => l.length).filter(Boolean);
      if (!zeilen.length) return null;
      const w = Math.min(...zeilen), brett = (D.brett_cm || 50);
      const bedarf = Math.ceil(w * 100 / brett);
      return { gebiet: 'tal', art: 'bruecke', spezial: 'bruecke', stufe: 0, fehler: false, platz: p.id, plan: { art: 'reihe' },
        material: 'PLANKE', bedarf, geld: budget(bedarf * (preise.PLANKE || 3)), id: 'bruecke',
        text: fuellen(D.bruecke_text || 'Der Fluss ist {w} m breit, ein Brett ist {cm} cm lang.', { w, cm: brett }) };
    }
    /** Antwort des Händlers: Waren und bezahlter Betrag (a = aktiver Auftrag oder null) */
    function bezahlen(korb, bezahlt, a) {
      const kosten = Object.keys(korb).reduce((s, k) => s + korb[k] * (preise[k] || 0), 0);
      if (!kosten) return { ok: false, text: 'Was möchtest du kaufen?' };
      if (bezahlt < kosten) return { ok: false, zuWenig: true, kosten, text: 'Das reicht leider nicht. Zähl noch einmal nach!' };
      const rueck = bezahlt - kosten;
      let passt = null, gleich = null;
      if (a && a.art === 'haendler') {
        gleich = Object.keys(a.waren).every(k => korb[k] === a.waren[k]) && Object.keys(korb).every(k => !korb[k] || a.waren[k]);
        passt = gleich && rueck === 0;
      }
      return { ok: true, kosten, rueck, passt, gleich,
        text: rueck ? `Danke! Das macht ${kosten} €. Du bekommst ${rueck} € zurück.` : `Danke, passend bezahlt – ${kosten} €!` };
    }
    return { neu, bruecke, bezahlen, preise, namen, menge };
  }

  // ── Kartenleser-Hochland (Etappe 6): Schatzsuche mit Karte und Kompass, deutsch ─────────
  //  planquadrat  „Der Schatz liegt im Planquadrat C1.“ → Feld auf der Schatzkarte finden, hingehen, graben
  //  kompass      „Geh vom Turm 10 Schritte nach Westen und dann 10 Schritte nach Norden.“ (1 Schritt = 1 Block)
  //  massstab     „Vom Steinkreis aus 3 cm nach Süden. Maßstab: 1 cm = 5 Schritte.“
  //  Alle Erdhügel sehen gleich aus; wer am falschen gräbt, hat den ersten Versuch verbraucht.
  function erstelleHochland(D, opt = {}) {
    const rnd = opt.rnd || Math.random;
    const wahl = l => l[Math.floor(rnd() * l.length)];
    const st = n => String(Math.max(1, Math.min(3, n || 1)));
    const R = opt.raster || { x0: 0, z0: 0, groesse: 10 };
    const m = D.massstab || 5;
    const fuellen = (v, w) => v.replace(/\{(\w+)\}/g, (_, k) => (w[k] !== undefined ? w[k] : ''));
    const feld = s => 'ABCDEFGH'[Math.floor((s.x - R.x0) / R.groesse)] + (Math.floor((s.z - R.z0) / R.groesse) + 1);
    const geber = opt.geber || null;
    const schaetze = (D.schaetze || []).filter(s => !geber || Math.hypot(s.x - geber.x, s.z - geber.z) >= 10);
    const richtung = (d, achse) => (achse === 'x' ? (d > 0 ? 'Osten' : 'Westen') : (d > 0 ? 'Süden' : 'Norden'));
    function weg(dx, dz, einheit, teiler) {
      const teile = [], wort = n => (einheit === 'Schritte' && n === 1 ? 'Schritt' : einheit);
      if (dx) teile.push(`${Math.abs(dx) / teiler} ${wort(Math.abs(dx) / teiler)} nach ${richtung(dx, 'x')}`);
      if (dz) teile.push(`${Math.abs(dz) / teiler} ${wort(Math.abs(dz) / teiler)} nach ${richtung(dz, 'z')}`);
      return teile.join(' und dann ');
    }
    /** Alle möglichen Aufträge einer Art (für Auswahl und Vielfalt) */
    function moeglich(art) {
      const l = [];
      schaetze.forEach(s => {
        if (art === 'planquadrat') { l.push({ s, w: { feld: feld(s) } }); return; }
        (D.landmarken || []).forEach(lm => {
          const dx = s.x - lm.x, dz = s.z - lm.z;
          if (Math.abs(dx) > 20 || Math.abs(dz) > 20 || (!dx && !dz)) return;
          if (art === 'kompass') l.push({ s, w: { von: lm.von, weg: weg(dx, dz, 'Schritte', 1) } });
          if (art === 'massstab' && dx % m === 0 && dz % m === 0) l.push({ s, w: { von: lm.von, weg: weg(dx, dz, 'cm', m), m } });
        });
      });
      return l;
    }
    function neu(stufe, verlauf = []) {
      const s = st(stufe);
      let a = null;
      for (let i = 0; i < 40; i++) {
        const art = wahl((D.arten && D.arten[s]) || ['planquadrat']);
        const saetze = ((D.saetze || {})[art] || {})[s];
        const opts = moeglich(art);
        if (!saetze || !opts.length) continue;
        const o = wahl(opts);
        a = { gebiet: 'hochland', art, stufe: +s, ziel: o.s.id, feld: feld(o.s), fehler: false, text: fuellen(wahl(saetze), o.w) };
        a.id = (o.s.id + '|' + art + ':' + a.text).slice(0, 200);
        // nicht derselbe Schatz wie in den letzten drei Aufträgen
        if (!verlauf.slice(-6).includes(a.id) && !verlauf.slice(-3).some(v => v.split('|')[0] === o.s.id)) break;
      }
      return a;
    }
    function graben(a, id) {
      if (!a) return { ok: false, versuch: false, text: 'Hier könnte etwas vergraben sein. Frag Lea nach einem Schatz-Auftrag!' };
      if (id === a.ziel) return { ok: true, versuch: true, text: 'Da ist etwas! Du hast den Schatz gefunden!' };
      return { ok: false, versuch: true, text: 'Hier ist nichts vergraben. Schau noch einmal auf Karte und Kompass.' };
    }
    function vielfalt(stufe) {
      const s = st(stufe);
      return [...new Set((D.arten[s] || [])).values()].reduce((n, art) => n + moeglich(art).length * (((D.saetze[art] || {})[s] || []).length), 0);
    }
    return { neu, graben, feld, vielfalt, schaetze: D.schaetze || [] };
  }

  window.LernInselAuftraege = { erstelle, erstelleTal, erstelleHochland, zahlwort, ABSTAND };
})();
