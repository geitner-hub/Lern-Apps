// ═══════════════════════════════════════════════════════
//  Lernwelt – welt-karte.js   (Weltkarte in Equal-Earth-Projektion, Neue Lern-Apps Etappe 1)
//
//  Genutzt von: apps/gpg/laender-finder.html (Kontinent-Modi)
//  Daten: daten/welt.json – alle Länder in Längen-/Breitengraden (Natural Earth 1:50 Mio., gemeinfrei),
//         dazu Kontinente und je Modus Länderliste, Ausschnitt und Lupen. Listen dort ändern, nicht hier.
//  Projektion: Equal Earth (flächentreu – Kontinente in richtigen Größenverhältnissen, kein riesiges
//         Grönland) aus vendor/d3-geo.min.js. Alle Weltkarten der Lernwelt nutzen diese Projektion;
//         der Globus (Etappe 3) zeigt dieselben Daten orthografisch.
//
//  API (window.LernWelt):
//    laden()            → Promise: { daten, karte(modus), name(id), projektion, pfad, laender(modus) }
//      karte(modus)     → Kartenobjekt für LernKarte.ansicht/markup:
//                         { w, h, v, s: Erdumriss, g: Gradnetz, f: [{ id, n, d, c?, u? }], lupen }
//                         c = Land außerhalb der Kontinente des Modus (dunkler),
//                         u = Tippzone im Meer für kleine Länder der Liste (Inseln, Kleinstaaten)
//      geo(id)          → GeoJSON eines Landes (für den Globus)
//      zentrum(id)      → [Länge, Breite] Mitte des größten Teilstücks (Globus dreht dorthin)
//      kontinent(id)    → Kontinent-Kürzel (eu, as, af, na, sa, oz, an)
// ═══════════════════════════════════════════════════════

(function () {
  'use strict';
  if (window.LernWelt) return;

  const BREITE = 2000;            // Kartenkoordinaten: ganze Welt 2000 Einheiten breit
  const KLEIN = 0.022;            // Länder kleiner als 2,2 % des Ausschnitts bekommen eine Tippzone
  let promise = null;

  /** Ringe aus welt.json entpacken: [Länge, Breite, dLänge, dBreite, …] in 1/100 Grad */
  function geometrie(p) {
    return {
      type: 'MultiPolygon',
      coordinates: p.map(poly => poly.map(r => {
        const ring = []; let x = 0, y = 0;
        for (let i = 0; i + 1 < r.length; i += 2) { x += r[i]; y += r[i + 1]; ring.push([x / 100, y / 100]); }
        ring.push(ring[0]);
        return ring;
      })),
    };
  }

  function baue(daten) {
    const d3 = window.d3;
    const kugel = { type: 'Sphere' };
    const projektion = d3.geoEqualEarth().fitWidth(BREITE, kugel);
    const pfad = d3.geoPath(projektion).digits(1);
    const [[, y0], [, y1]] = pfad.bounds(kugel);
    const H = Math.ceil(y1 - y0);
    projektion.translate([projektion.translate()[0], projektion.translate()[1] - y0]);

    const geo = {}, pfade = {}, boxen = {}, mitten = {}, zentren = {};
    daten.laender.forEach(l => {
      const g = { type: 'Feature', id: l.id, properties: { n: l.n, k: l.k }, geometry: geometrie(l.p) };
      geo[l.id] = g;
      pfade[l.id] = pfad(g) || '';
      boxen[l.id] = pfad.bounds(g);
      // Mitte des größten Teilstücks (für Tippzonen)
      let best = null;
      g.geometry.coordinates.forEach(poly => {
        const teil = { type: 'Polygon', coordinates: poly }, a = d3.geoArea(teil);
        if (!best || a > best.a) best = { a, c: pfad.centroid(teil), z: d3.geoCentroid(teil) };
      });
      zentren[l.id] = best ? best.z : d3.geoCentroid(g);
      mitten[l.id] = best ? best.c : pfad.centroid(g);
    });
    const umriss = pfad(kugel);
    const gradnetz = pfad(d3.geoGraticule().step([20, 20])());

    /** Ausschnitt [W, S, O, N] in Grad → Rechteck in Kartenkoordinaten */
    function rechteck(a) {
      const [w, s, o, n] = a, punkte = [];
      for (let i = 0; i <= 8; i++) {
        const lon = w + (o - w) * i / 8;
        punkte.push(projektion([lon, s]), projektion([lon, n]));
        const lat = s + (n - s) * i / 8;
        punkte.push(projektion([w, lat]), projektion([o, lat]));
      }
      const xs = punkte.map(p => p[0]), ys = punkte.map(p => p[1]);
      const x = Math.min(...xs), y = Math.min(...ys);
      return [Math.round(x), Math.round(y), Math.round(Math.max(...xs) - x), Math.round(Math.max(...ys) - y)];
    }

    const cache = {};
    function karte(modus) {
      if (cache[modus]) return cache[modus];
      const m = daten.modi[modus];
      if (!m) return null;
      const v = rechteck(m.ausschnitt);
      const kont = new Set(m.kontinente || []), dazu = new Set(m.dazu || []), liste = new Set(m.liste || []);
      const lupen = (m.lupen || []).map(l => ({ name: l.name, ids: l.ids.slice(), v: rechteck(l.ausschnitt) }));
      const f = daten.laender.map(l => {
        const e = { id: l.id, n: l.n, d: pfade[l.id] };
        if (!kont.has(l.k) && !dazu.has(l.id)) e.c = 1;
        if (liste.has(l.id)) {
          const [[bx0, by0], [bx1, by1]] = boxen[l.id];
          const lupe = lupen.find(lu => lu.ids.includes(l.id));
          const bezug = (lupe ? lupe.v : v)[2];
          if (Math.max(bx1 - bx0, by1 - by0) < bezug * KLEIN) {
            const [cx, cy] = mitten[l.id];
            e.u = [[+cx.toFixed(1), +cy.toFixed(1), +(bezug * KLEIN * 0.75).toFixed(1)]];
          }
        }
        return e;
      });
      return (cache[modus] = { w: BREITE, h: H, v, s: umriss, g: gradnetz, f, lupen });
    }

    const namen = {}, kont = {};
    daten.laender.forEach(l => { namen[l.id] = l.n; kont[l.id] = l.k; });
    return {
      daten, projektion, pfad, karte,
      name: id => namen[id] || '',
      laender: modus => ((daten.modi[modus] || {}).liste || []).slice(),
      geo: id => geo[id] || null,
      zentrum: id => zentren[id] || [0, 0],
      kontinent: id => kont[id] || '',
    };
  }

  function laden() {
    if (promise) return promise;
    const root = (window.LW && LW.ROOT) || '../../';
    const d3laden = window.d3 && window.d3.geoEqualEarth ? Promise.resolve()
      : (window.LW && LW.laden ? LW.laden('vendor/d3-geo.min.js') : Promise.reject(new Error('LW fehlt')));
    promise = Promise.all([
      d3laden,
      fetch(root + 'daten/welt.json').then(r => { if (!r.ok) throw new Error('Weltkarte nicht gefunden'); return r.json(); }),
    ]).then(([, daten]) => baue(daten)).catch(e => { promise = null; throw e; });
    return promise;
  }

  window.LernWelt = { laden };
})();
