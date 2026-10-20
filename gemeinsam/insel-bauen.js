// ═══════════════════════════════════════════════════════
//  Lernwelt – insel-bauen.js   („Die Insel“: Bauen auf Bauplätzen)
//
//  Wird geladen von: spiele/insel.html
//  Braucht: insel-welt.js (Welt, Szene mit neuBauen), three.js
//
//  Gebaut wird nur auf festen Bauplätzen (daten/insel.json → bauplaetze), so bleibt die Welt heil.
//    - Baumodus: Raster über dem Bauplatz; Antippen setzt einen Block (➕) bzw. entfernt ihn (➖).
//      Joystick und Kamera bleiben dabei aktiv.
//    - Nur das betroffene Weltstück wird neu gebaut (am Rand auch das Nachbarstück).
//    - Inventar: Material mit Anzahl (stand.inventar); Bauplätze mit vorrat: 'frei' brauchen keins.
//    - Selbstprüfung eines Bauplans (plan.art):
//        'rand'    Rand des Bauplatzes in Höhe 0 aus plan.block, höchstens plan.tor Lücken (Zaun mit Tor)
//        'flaeche' ganze Fläche in Höhe 0 aus plan.block (Boden, Feld)
//        'muster'  genau diese Blöcke: plan.bloecke = [[dx, dy, dz, 'BLOCK'], …]
//        'ring'    Zaun um eine Weide a × b Meter (Pfosten-Abstand 1 m, Anzahl = Umfang), plan.tor Lücken
//        'rechteck' plan.a × plan.b Blöcke (Felder: Reihen × Pflanzen je Reihe)
//        'summe'   Kisten (1000/100/10/1) ergeben plan.zahl, je Sorte höchstens 9 (Stellenwert)
//        'reihe'   eine Zeile überbrückt die ganze Lücke des Bauplatzes (Brücke über den Fluss)
//    - Bauplätze bestimmen Material (material), freies Material (frei) und Verbrauch (verbrauch:
//      z. B. { PLANKE: 2 } = 2 Bretter je Block)
//      → { ok, fehlt: [[x, y, z]], falsch: [[x, y, z]] } – fehlende Stellen werden kurz rot gezeigt.
//    - Spielstand: stand.bau[<platz-id>] = [[dx, dy, dz, blocknr], …] – nur das Gebaute
//      (die Grundwelt ist dort leer). Ungültiges wird beim Laden übergangen.
//
//  API (window.LernInselBauen):
//    MATERIAL                         [{ block, name, emoji }] – was man bauen kann
//    erstelle({ T, welt, szene, scene, camera, leinwand, plaetze, bau, inventar, spieler, speichern })
//      szene: Weltszene oder Funktion, die sie liefert (sie entsteht erst nach anwenden())
//      .anwenden()                    gespeicherte Bauten in die Welt setzen (vor dem Zeichnen)
//      .platzBei(x, z)                Bauplatz an dieser Stelle (mit 1 Block Rand) oder null
//      .start(platz) / .ende()        Baumodus an/aus (Raster zeigen)
//      .aktiv                         aktueller Bauplatz im Baumodus oder null
//      .material(blockNr) / .modus('setzen'|'entfernen')
//      .tippen(bildX, bildY)          → { ok, art: 'gesetzt'|'entfernt', grund }
//      .pruefen(plan?)                → { ok, fehlt, falsch }
//      .vorrat(blockNr)               Anzahl im Inventar (Infinity bei vorrat 'frei')
// ═══════════════════════════════════════════════════════

(function () {
  'use strict';
  if (window.LernInselBauen) return;

  const MATERIAL = [
    { block: 'PLANKE', name: 'Holz', emoji: '🪵' },
    { block: 'STEIN', name: 'Stein', emoji: '🪨' },
    { block: 'ZAUN', name: 'Zaun', emoji: '🚧' },
    { block: 'DACH', name: 'Dach', emoji: '🟥' },
    { block: 'PFLANZE', name: 'Setzling', emoji: '🌱' },
    { block: 'KISTE1000', name: '1000er', emoji: '🟫' },
    { block: 'KISTE100', name: '100er', emoji: '🟧' },
    { block: 'KISTE10', name: '10er', emoji: '🟨' },
    { block: 'KISTE1', name: '1er', emoji: '⬜' },
  ];
  const WERT = { KISTE1000: 1000, KISTE100: 100, KISTE10: 10, KISTE1: 1 };   // Steine je Kiste (Lager)
  const REICHWEITE = 14;                              // so weit reicht ein Tippen (Blöcke)

  function erstelle(o) {
    const { T, welt, scene, camera, spieler } = o;
    const szene = () => (typeof o.szene === 'function' ? o.szene() : o.szene);   // darf erst nach anwenden() entstehen
    const B = window.LernInselWelt.BLOCK;
    const STUECK = window.LernInselWelt.STUECK;
    const erlaubt = new Set(MATERIAL.map(m => B[m.block]));
    const plaetze = (o.plaetze || []).map(p => Object.assign({ hoehe: 3 }, p, {
      material: (p.material || ['PLANKE', 'STEIN', 'ZAUN', 'DACH']).map(n => B[n]).filter(b => erlaubt.has(b)),
      frei: new Set((p.frei || []).map(n => B[n])),
      verbrauch: Object.fromEntries(Object.entries(p.verbrauch || {}).map(([n, k]) => [B[n], Math.max(1, k | 0)])),
    }));
    const bau = o.bau;                                // stand.bau (wird verändert)
    const inventar = o.inventar;                      // stand.inventar (wird verändert)
    let aktiv = null, material = B.PLANKE, modus = 'setzen', raster = null, marken = null, markenUhr = 0;

    const drin = (p, x, y, z) => x >= p.x0 && x <= p.x1 && z >= p.z0 && z <= p.z1 && y >= p.y && y < p.y + p.hoehe;
    const frei = (p, b) => p.vorrat === 'frei' || p.frei.has(b);
    const kostet = (p, b) => p.verbrauch[b] || 1;      // z. B. Brücke: 2 Bretter (je 50 cm) für 1 m

    /** Material im Inventar (Infinity bei freiem Material); bei Verbrauch > 1 in Stück (z. B. Bretter) */
    function vorrat(b) { return aktiv && frei(aktiv, b) ? Infinity : Math.max(0, Math.floor(inventar[b] || 0)); }

    /** Weltstück(e) neu bauen, die die Stelle berühren */
    function neu(x, z) {
      const cx = Math.floor(x / STUECK), cz = Math.floor(z / STUECK);
      const liste = [[cx, cz]];
      if (x % STUECK === 0) liste.push([cx - 1, cz]);
      if (x % STUECK === STUECK - 1) liste.push([cx + 1, cz]);
      if (z % STUECK === 0) liste.push([cx, cz - 1]);
      if (z % STUECK === STUECK - 1) liste.push([cx, cz + 1]);
      liste.forEach(([a, b]) => { if (a >= 0 && b >= 0) szene().neuBauen(a, b); });
    }
    function merken(p) {
      const l = [];
      for (let y = p.y; y < p.y + p.hoehe; y++) for (let z = p.z0; z <= p.z1; z++) for (let x = p.x0; x <= p.x1; x++) {
        const b = welt.get(x, y, z);
        if (b) l.push([x - p.x0, y - p.y, z - p.z0, b]);
      }
      if (l.length) bau[p.id] = l; else delete bau[p.id];
    }

    /** Gespeicherte Bauten setzen (vor dem ersten Zeichnen, daher ohne neuBauen) */
    function anwenden() {
      plaetze.forEach(p => {
        const l = bau[p.id];
        if (!Array.isArray(l)) return;
        l.forEach(e => {
          if (!Array.isArray(e) || e.length < 4) return;
          const x = p.x0 + (e[0] | 0), y = p.y + (e[1] | 0), z = p.z0 + (e[2] | 0), b = e[3] | 0;
          if (drin(p, x, y, z) && erlaubt.has(b) && !welt.get(x, y, z)) welt.set(x, y, z, b);
        });
      });
    }

    function platzBei(x, z) {
      return plaetze.find(p => x >= p.x0 - 1 && x <= p.x1 + 2 && z >= p.z0 - 1 && z <= p.z1 + 2) || null;
    }

    // ── Raster (eine Linien-Geometrie über dem Bauplatz) ────
    function rasterZeigen(p) {
      rasterWeg();
      const pos = [], y = p.y + .03;
      for (let x = p.x0; x <= p.x1 + 1; x++) pos.push(x, y, p.z0, x, y, p.z1 + 1);
      for (let z = p.z0; z <= p.z1 + 1; z++) pos.push(p.x0, y, z, p.x1 + 1, y, z);
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
      raster = new T.LineSegments(g, new T.LineBasicMaterial({ color: 0xfde68a, transparent: true, opacity: .85 }));
      raster.renderOrder = 4;
      scene.add(raster);
    }
    function rasterWeg() { if (raster) { scene.remove(raster); raster.geometry.dispose(); raster = null; } }

    function start(p) {
      aktiv = p; rasterZeigen(p);
      if (!p.material.includes(material)) material = p.material[0];
    }
    function ende() { aktiv = null; rasterWeg(); markenWeg(); }

    // ── Tippen: Strahl durch das Blockgitter (DDA) ──────────
    const ray = new T.Raycaster(), v2 = new T.Vector2();
    function strahl(sx, sy) {
      const r = o.leinwand.getBoundingClientRect();
      v2.set(((sx - r.left) / r.width) * 2 - 1, -((sy - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(v2, camera);
      return ray.ray;
    }
    /** Erster getroffener Block → { treffer: [x,y,z], davor: [x,y,z] } */
    function suchen(r) {
      const p = r.origin, d = r.direction;
      let x = Math.floor(p.x), y = Math.floor(p.y), z = Math.floor(p.z);
      const sx = Math.sign(d.x), sy = Math.sign(d.y), sz = Math.sign(d.z);
      const tdx = Math.abs(1 / d.x), tdy = Math.abs(1 / d.y), tdz = Math.abs(1 / d.z);
      let tx = (sx > 0 ? x + 1 - p.x : p.x - x) * tdx, ty = (sy > 0 ? y + 1 - p.y : p.y - y) * tdy, tz = (sz > 0 ? z + 1 - p.z : p.z - z) * tdz;
      let davor = [x, y, z];
      for (let i = 0; i < 80; i++) {
        davor = [x, y, z];
        let t;
        if (tx < ty && tx < tz) { x += sx; t = tx; tx += tdx; }
        else if (ty < tz) { y += sy; t = ty; ty += tdy; }
        else { z += sz; t = tz; tz += tdz; }
        if (t > REICHWEITE + 8) return null;
        const b = welt.get(x, y, z);
        if (b && (welt.fest(x, y, z) || welt.nass(x, y, z))) return { treffer: [x, y, z], davor };
      }
      return null;
    }
    /** Stelle, an der der Strahl die Mitte der untersten Bauschicht des Platzes kreuzt (frei, auf dem Platz) */
    function ebene(r, p) {
      if (Math.abs(r.direction.y) < 1e-4) return null;
      const t = (p.y + .5 - r.origin.y) / r.direction.y;
      if (t <= 0 || t > REICHWEITE + 8) return null;
      const x = Math.floor(r.origin.x + r.direction.x * t), z = Math.floor(r.origin.z + r.direction.z * t);
      if (!drin(p, x, p.y, z) || welt.get(x, p.y, z)) return null;
      return [x, p.y, z];
    }
    function figurIm(x, y, z) {                       // würde der Block die Figur einklemmen?
      const r = .3, h = 1.7;
      return x + 1 > spieler.x - r && x < spieler.x + r && z + 1 > spieler.z - r && z < spieler.z + r && y + 1 > spieler.y && y < spieler.y + h;
    }
    function tippen(sx, sy) {
      if (!aktiv) return { ok: false, grund: 'kein Baumodus' };
      const r = strahl(sx, sy);
      const p = aktiv;
      const t = suchen(r) || (modus === 'setzen' && ebene(r, p) ? { treffer: null, davor: ebene(r, p) } : null);
      if (!t) return { ok: false, grund: 'daneben' };
      if (modus === 'entfernen') {
        if (!t.treffer) return { ok: false, grund: 'daneben' };
        const [x, y, z] = t.treffer;
        if (!drin(p, x, y, z)) return { ok: false, grund: 'nicht auf dem Bauplatz' };
        const b = welt.get(x, y, z);
        welt.set(x, y, z, B.LUFT);
        if (!frei(p, b) && erlaubt.has(b)) inventar[b] = (inventar[b] || 0) + kostet(p, b);   // Material zurück ins Inventar
        merken(p); neu(x, z); o.speichern();
        return { ok: true, art: 'entfernt', x, y, z };
      }
      let [x, y, z] = t.davor;
      if (!drin(p, x, y, z)) {
        // Über einer Lücke (Fluss unter der Brücke) trifft der Strahl erst tief unten etwas: dann zählt die Stelle,
        // an der er die Bauhöhe des Platzes kreuzt
        const e = ebene(r, p);
        if (!e) return { ok: false, grund: y >= p.y + p.hoehe ? 'zu hoch' : 'nicht auf dem Bauplatz' };
        [x, y, z] = e;
      }
      if (welt.get(x, y, z)) return { ok: false, grund: 'besetzt' };
      if (figurIm(x, y, z)) return { ok: false, grund: 'du stehst dort' };
      if (!p.material.includes(material)) return { ok: false, grund: 'falsches Material' };
      if (vorrat(material) < kostet(p, material)) return { ok: false, grund: 'kein Material' };
      welt.set(x, y, z, material);
      if (!frei(p, material)) inventar[material] = vorrat(material) - kostet(p, material);
      merken(p); neu(x, z); o.speichern();
      return { ok: true, art: 'gesetzt', x, y, z };
    }

    // ── Selbstprüfung eines Bauplans ────────────────────────
    function pruefen(plan) {
      const p = aktiv;
      plan = plan || (p && p.plan);
      if (!p || !plan) return { ok: false, fehlt: [], falsch: [] };
      const soll = B[plan.block] !== undefined ? B[plan.block] : B.ZAUN;
      const fehlt = [], falsch = [];
      const pruefe = (x, y, z, b) => { const ist = welt.get(x, y, z); if (!ist) fehlt.push([x, y, z]); else if (ist !== b) falsch.push([x, y, z]); };
      if (plan.art === 'rand' || plan.art === 'flaeche') {
        for (let z = p.z0; z <= p.z1; z++) for (let x = p.x0; x <= p.x1; x++) {
          const rand = x === p.x0 || x === p.x1 || z === p.z0 || z === p.z1;
          if (plan.art === 'flaeche' || rand) pruefe(x, p.y, z, soll);
        }
        if (plan.art === 'rand') {                    // Tor: so viele Lücken sind erlaubt
          const tor = Math.max(0, plan.tor | 0);
          if (fehlt.length <= tor && !falsch.length) return { ok: true, fehlt: [], falsch: [] };
        }
      } else if (plan.art === 'muster') {
        (plan.bloecke || []).forEach(([dx, dy, dz, n]) => pruefe(p.x0 + dx, p.y + dy, p.z0 + dz, B[n] !== undefined ? B[n] : soll));
      } else if (plan.art === 'ring' || plan.art === 'rechteck') {
        return form(p, plan, soll);
      } else if (plan.art === 'summe') {
        return summe(p, plan);
      } else if (plan.art === 'reihe') {
        return reihe(p);
      }
      const ok = !fehlt.length && !falsch.length;
      if (!ok) markenZeigen(fehlt.concat(falsch));
      return { ok, fehlt, falsch };
    }

    /** Alle Stellen eines Blocks in Höhe 0 */
    function stellen(p, b) {
      const l = [];
      for (let z = p.z0; z <= p.z1; z++) for (let x = p.x0; x <= p.x1; x++) if (welt.get(x, p.y, z) === b) l.push([x, p.y, z]);
      return l;
    }
    /**
     * 'ring':     Zaun um eine Weide a × b (Meter von Pfosten zu Pfosten) → Pfosten auf dem Rand eines Rechtecks
     *             (a+1) × (b+1) Felder, Anzahl = Umfang 2·(a+b); plan.tor Lücken (keine Ecke) erlaubt
     * 'rechteck': r Reihen mit je s Pflanzen → genau ein gefülltes Rechteck r × s (oder s × r)
     */
    function form(p, plan, soll) {
      const l = stellen(p, soll);
      const leer = { ok: false, fehlt: [], falsch: [], grund: 'leer' };
      if (!l.length) return leer;
      let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
      l.forEach(([x, , z]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); });
      const w = x1 - x0 + 1, h = z1 - z0 + 1;
      const fehlt = [], falsch = [];
      const istRand = (x, z) => x === x0 || x === x1 || z === z0 || z === z1;
      const istEcke = (x, z) => (x === x0 || x === x1) && (z === z0 || z === z1);
      for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
        const da = welt.get(x, p.y, z) === soll;
        const muss = plan.art === 'rechteck' || istRand(x, z);
        if (muss && !da) fehlt.push([x, p.y, z, istEcke(x, z)]);
        if (!muss && da) falsch.push([x, p.y, z]);
      }
      const [a, b] = plan.art === 'ring' ? [plan.a + 1, plan.b + 1] : [plan.a, plan.b];
      const groesse = (w === a && h === b) || (w === b && h === a);
      let ok = groesse && !falsch.length;
      if (plan.art === 'ring') ok = ok && fehlt.length <= (plan.tor | 0) && !fehlt.some(f => f[3]);
      else ok = ok && !fehlt.length;
      const grund = ok ? '' : !groesse ? 'groesse' : falsch.length ? 'innen' : 'luecke';
      if (!ok) markenZeigen(fehlt.concat(falsch).map(f => f.slice(0, 3)));
      return { ok, fehlt, falsch, grund, w, h };
    }
    /** 'summe': Kisten im Lager ergeben plan.zahl Steine, von jeder Sorte höchstens 9 (Stellenwert) */
    function summe(p, plan) {
      const anzahl = {};
      for (let y = p.y; y < p.y + p.hoehe; y++) for (let z = p.z0; z <= p.z1; z++) for (let x = p.x0; x <= p.x1; x++) {
        const b = welt.get(x, y, z);
        const n = Object.keys(WERT).find(k => B[k] === b);
        if (n) anzahl[n] = (anzahl[n] || 0) + 1;
      }
      const wert = Object.keys(WERT).reduce((s, k) => s + (anzahl[k] || 0) * WERT[k], 0);
      const zuViele = Object.keys(WERT).some(k => (anzahl[k] || 0) > 9);
      const ok = wert === plan.zahl && !zuViele;
      return { ok, fehlt: [], falsch: [], wert, anzahl, grund: ok ? '' : zuViele ? 'mehr als 9' : 'summe' };
    }
    /** 'reihe': eine Zeile des Bauplatzes überbrückt die ganze Lücke (z. B. Fluss) – sonst trägt die Brücke nicht */
    function reihe(p) {
      let beste = null;
      Object.keys(p.luecken || {}).forEach(z => {
        const lu = p.luecken[z];
        if (!lu.length) return;
        const fehlt = lu.filter(x => !welt.get(x, p.y, +z)).map(x => [x, p.y, +z]);
        if (!beste || fehlt.length < beste.length) beste = fehlt;
      });
      if (!beste) return { ok: false, fehlt: [], falsch: [], grund: 'keine Lücke' };
      if (beste.length) markenZeigen(beste);
      return { ok: !beste.length, fehlt: beste, falsch: [], grund: beste.length ? 'zu kurz' : '' };
    }
    function markenZeigen(stellen) {
      markenWeg();
      marken = new T.Group();
      const g = new T.BoxGeometry(1.02, 1.02, 1.02), m = new T.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: .45, depthWrite: false });
      stellen.slice(0, 80).forEach(([x, y, z]) => { const k = new T.Mesh(g, m); k.position.set(x + .5, y + .5, z + .5); marken.add(k); });
      scene.add(marken);
      clearTimeout(markenUhr);
      markenUhr = setTimeout(markenWeg, 3500);
    }
    function markenWeg() {
      if (!marken) return;
      scene.remove(marken);
      marken.children.forEach(k => k.geometry.dispose());
      marken = null;
    }

    return {
      anwenden, platzBei, start, ende, tippen, pruefen, vorrat,
      get aktiv() { return aktiv; },
      material(b) { if (erlaubt.has(b)) material = b; return material; },
      kostet: b => (aktiv ? kostet(aktiv, b) : 1),
      platz: id => plaetze.find(p => p.id === id) || null,
      leeren(id) {                                    // Bauplatz für einen neuen Auftrag frei räumen (Material zurück)
        const p = plaetze.find(q => q.id === id);
        if (!p) return;
        for (let y = p.y; y < p.y + p.hoehe; y++) for (let z = p.z0; z <= p.z1; z++) for (let x = p.x0; x <= p.x1; x++) {
          const b = welt.get(x, y, z);
          if (!b || !erlaubt.has(b)) continue;
          if (!frei(p, b)) inventar[b] = (inventar[b] || 0) + kostet(p, b);
          welt.set(x, y, z, B.LUFT);
        }
        delete bau[p.id];
        for (let x = p.x0; x <= p.x1 + STUECK; x += STUECK) for (let z = p.z0; z <= p.z1 + STUECK; z += STUECK) neu(Math.min(x, p.x1), Math.min(z, p.z1));
        o.speichern();
      },
      modus(m) { if (m === 'setzen' || m === 'entfernen') modus = m; return modus; },
    };
  }

  window.LernInselBauen = { MATERIAL, erstelle };
})();
