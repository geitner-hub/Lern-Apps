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
  ];
  const REICHWEITE = 14;                              // so weit reicht ein Tippen (Blöcke)

  function erstelle(o) {
    const { T, welt, scene, camera, spieler } = o;
    const szene = () => (typeof o.szene === 'function' ? o.szene() : o.szene);   // darf erst nach anwenden() entstehen
    const B = window.LernInselWelt.BLOCK;
    const STUECK = window.LernInselWelt.STUECK;
    const erlaubt = new Set(MATERIAL.map(m => B[m.block]));
    const plaetze = (o.plaetze || []).map(p => Object.assign({ hoehe: 3 }, p));
    const bau = o.bau;                                // stand.bau (wird verändert)
    const inventar = o.inventar;                      // stand.inventar (wird verändert)
    let aktiv = null, material = B.PLANKE, modus = 'setzen', raster = null, marken = null, markenUhr = 0;

    const drin = (p, x, y, z) => x >= p.x0 && x <= p.x1 && z >= p.z0 && z <= p.z1 && y >= p.y && y < p.y + p.hoehe;
    const frei = p => p.vorrat === 'frei';

    function vorrat(b) { return aktiv && frei(aktiv) ? Infinity : Math.max(0, Math.floor(inventar[b] || 0)); }

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

    function start(p) { aktiv = p; rasterZeigen(p); }
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
    function figurIm(x, y, z) {                       // würde der Block die Figur einklemmen?
      const r = .3, h = 1.7;
      return x + 1 > spieler.x - r && x < spieler.x + r && z + 1 > spieler.z - r && z < spieler.z + r && y + 1 > spieler.y && y < spieler.y + h;
    }
    function tippen(sx, sy) {
      if (!aktiv) return { ok: false, grund: 'kein Baumodus' };
      const t = suchen(strahl(sx, sy));
      if (!t) return { ok: false, grund: 'daneben' };
      const p = aktiv;
      if (modus === 'entfernen') {
        const [x, y, z] = t.treffer;
        if (!drin(p, x, y, z)) return { ok: false, grund: 'nicht auf dem Bauplatz' };
        const b = welt.get(x, y, z);
        welt.set(x, y, z, B.LUFT);
        if (!frei(p) && erlaubt.has(b)) inventar[b] = (inventar[b] || 0) + 1;   // Material zurück ins Inventar
        merken(p); neu(x, z); o.speichern();
        return { ok: true, art: 'entfernt', x, y, z };
      }
      const [x, y, z] = t.davor;
      if (!drin(p, x, y, z)) return { ok: false, grund: y >= p.y + p.hoehe ? 'zu hoch' : 'nicht auf dem Bauplatz' };
      if (welt.get(x, y, z)) return { ok: false, grund: 'besetzt' };
      if (figurIm(x, y, z)) return { ok: false, grund: 'du stehst dort' };
      if (vorrat(material) < 1) return { ok: false, grund: 'kein Material' };
      welt.set(x, y, z, material);
      if (!frei(p)) inventar[material] = vorrat(material) - 1;
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
      }
      const ok = !fehlt.length && !falsch.length;
      if (!ok) markenZeigen(fehlt.concat(falsch));
      return { ok, fehlt, falsch };
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
      modus(m) { if (m === 'setzen' || m === 'entfernen') modus = m; return modus; },
    };
  }

  window.LernInselBauen = { MATERIAL, erstelle };
})();
