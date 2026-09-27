// ═══════════════════════════════════════════════════════
//  Lernwelt – dorf-szene.js   („Mein Dorf“: 3D-Szene im Voxel-Stil)
//
//  Wird geladen von: spiele/dorf.html
//  Braucht: avatar3d.js (liefert three.js und die Figur des Kindes)
//
//  Grundsätze (für ältere iPads):
//    - feste isometrische Kamera, kein Drehen/Zoomen
//    - es wird nur gezeichnet, wenn sich etwas ändert (plus kurze Animationen)
//    - Pixel-Ratio höchstens 2, Gebäude zu wenigen Meshes „gebacken“
//
//  Alle Gebäude sind hier als Code aus Blöcken gebaut: MODELLE[id](stufe).
//  Neues Gebäude = neuer Eintrag in daten/dorf-inhalte.json + hier ein Modell
//  (ohne Modell erscheint ein einfaches Haus).
//
//  API (window.LernDorfSzene):
//    webglOk()                        → true, wenn 3D möglich ist
//    mount(host, { onPlatz(id) })     → Promise: Steuerung oder null (kein 3D)
//      .update()                      Bauplätze aus LernDorf neu zeichnen (nur geänderte)
//      .auswahl(id|null)              Bauplatz markieren
//      .jubel()                       Figur jubelt kurz (nach dem Bauen)
//      .foto()                        aktuelles Bild als PNG-Daten-URL (für die Postkarte)
//      .destroy()
// ═══════════════════════════════════════════════════════

(function () {
  'use strict';
  if (window.LernDorfSzene) return;

  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PLATZ = 14;                                   // Kantenlänge eines Bauplatzes

  function webglOk() {
    try { const c = document.createElement('canvas'); return !!(c.getContext('webgl') || c.getContext('experimental-webgl')); }
    catch (e) { return false; }
  }

  async function mount(host, opt = {}) {
    if (!webglOk() || !window.LernAvatar || !window.LernDorf) return null;
    let figur;
    try { figur = await window.LernAvatar.figur(null, { ohneSchatten: true }); } catch (e) { return null; }
    const T = figur.THREE;
    const DORF = window.LernDorf;

    // ── Grundgerüst ────────────────────────────────────────
    const renderer = new T.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const cv = renderer.domElement;
    cv.style.cssText = 'display:block;width:100%;height:100%;touch-action:pan-y;outline:none';
    cv.setAttribute('role', 'img');
    cv.setAttribute('aria-label', 'Dein Dorf');
    host.appendChild(cv);

    const scene = new T.Scene();
    scene.background = himmel();
    scene.add(new T.HemisphereLight(0xf2f6ff, 0x4d6b45, .62));
    const sonne = new T.DirectionalLight(0xfff1d6, .62);
    sonne.position.set(-60, 140, 90);
    scene.add(sonne);
    const camera = new T.OrthographicCamera(-50, 50, 50, -50, 1, 1000);

    const MAT = {}, GEO = {};
    function lam(c, o = {}) { const k = c + JSON.stringify(o); return MAT[k] || (MAT[k] = new T.MeshLambertMaterial(Object.assign({ color: c }, o))); }
    function geo(w, h, d) { const k = w + '|' + h + '|' + d; return GEO[k] || (GEO[k] = new T.BoxGeometry(w, h, d)); }
    /** Block: Breite w (x), Höhe h, Tiefe d (z); x/z Mitte, y = Unterkante */
    function b(p, w, h, d, x, y, z, farbe, o) {
      const m = new T.Mesh(geo(w, h, d), typeof farbe === 'string' ? lam(farbe, o) : farbe);
      m.position.set(x, y + h / 2, z);
      p.add(m);
      return m;
    }
    function himmel() {
      const c = document.createElement('canvas'); c.width = 2; c.height = 256;
      const x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 256);
      g.addColorStop(0, '#6fb6ff'); g.addColorStop(.6, '#a9d8ff'); g.addColorStop(1, '#e9f5ff');
      x.fillStyle = g; x.fillRect(0, 0, 2, 256);
      return new T.CanvasTexture(c);
    }
    function seeded(s) { return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

    // Alle Meshes einer Gruppe zu je einem Mesh pro Material zusammenfügen
    function backe(gruppe) {
      gruppe.updateMatrixWorld(true);
      const nachMat = new Map();
      gruppe.traverse(o => {
        if (!o.isMesh) return;
        const g = o.geometry.clone(); g.applyMatrix4(o.matrixWorld);
        if (!nachMat.has(o.material)) nachMat.set(o.material, []);
        nachMat.get(o.material).push(g);
      });
      const out = new T.Group();
      nachMat.forEach((geos, mat) => out.add(new T.Mesh(verbinde(geos), mat)));
      return out;
    }
    function verbinde(geos) {
      let n = 0, ni = 0;
      geos.forEach(g => { n += g.attributes.position.count; ni += g.index.count; });
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
      const ind = n > 65000 ? new Uint32Array(ni) : new Uint16Array(ni);
      let o = 0, io = 0;
      geos.forEach(g => {
        pos.set(g.attributes.position.array, o * 3);
        nor.set(g.attributes.normal.array, o * 3);
        const I = g.index.array;
        for (let i = 0; i < I.length; i++) ind[io + i] = I[i] + o;
        o += g.attributes.position.count; io += I.length;
        g.dispose();
      });
      const bg = new T.BufferGeometry();
      bg.setAttribute('position', new T.BufferAttribute(pos, 3));
      bg.setAttribute('normal', new T.BufferAttribute(nor, 3));
      bg.setIndex(new T.BufferAttribute(ind, 1));
      return bg;
    }
    function entsorgen(obj) { obj.traverse(o => { if (o.isMesh && !Object.values(GEO).includes(o.geometry)) o.geometry.dispose(); }); }

    // ── Bausteine für Gebäude ──────────────────────────────
    const F = {
      stein: '#9b9488', stein2: '#7d776d', putz: '#efe3c8', putz2: '#f6efdf', holz: '#a86f3e', holz2: '#7a4a28',
      balken: '#5b3a22', dach: '#c0473b', dach2: '#9e3a30', schiefer: '#5b6270', fenster: '#5ea8d8', tuer: '#6b3f22',
      gold: '#e6b422', gruen: '#4f9d4a', blume: '#e8566f', wasser: '#4aa3df', weiss: '#f5f5f0', blau: '#3b82f6',
    };
    /** Satteldach aus Stufen: Breite w quer (x), Tiefe d, Stufenhöhe s */
    function dach(p, w, d, y, farbe, s = 1.2, x = 0, z = 0) {
      const n = Math.ceil(w / 2 / s);
      for (let i = 0; i < n; i++) b(p, Math.max(s, w - i * 2 * s), s, d, x, y + i * s, z, farbe);
      return y + n * s;
    }
    /** Zeltdach (Pyramide) für Türme */
    function zelt(p, w, y, farbe, s = 1, x = 0, z = 0) {
      let i = 0;
      for (let k = w; k > 0; k -= 2 * s, i++) b(p, k, s, k, x, y + i * s, z, farbe);
      return y + i * s;
    }
    function fenster(p, x, y, z, seite = 'vorn', w = 1.6, h = 1.8) {
      if (seite === 'vorn') { b(p, w + .4, h + .4, .3, x, y - .2, z, F.balken); b(p, w, h, .35, x, y, z + .05, F.fenster); }
      else { b(p, .3, h + .4, w + .4, x, y - .2, z, F.balken); b(p, .35, h, w, x + .05, y, z, F.fenster); }
    }
    function tuer(p, x, z, w = 2, h = 3.2) { b(p, w + .4, h + .3, .3, x, .8, z, F.balken); b(p, w, h, .35, x, .8, z + .05, F.tuer); }
    function sockel(p, w, d, farbe = F.stein) { b(p, w, .8, d, 0, 0, 0, farbe); }
    function blumen(p, x, y, z, w) { b(p, w, .6, .8, x, y, z, F.holz2); for (let i = 0; i < w - .5; i += 1) b(p, .6, .6, .6, x - w / 2 + .6 + i, y + .6, z, i % 2 ? F.blume : '#f5d04a'); }
    function baum(p, x, z, h = 5, r = seeded(x * 31 + z * 17 + 5)) {
      b(p, 1.2, h, 1.2, x, 0, z, '#7a5230');
      const g = ['#3f8f47', '#4a9d4f', '#3a8440'][Math.floor(r() * 3)];
      b(p, 5, 3, 5, x, h - .6, z, g); b(p, 3.4, 2, 3.4, x, h + 2.2, z, g);
    }

    const MODELLE = {
      rathaus(st) {
        const p = new T.Group();
        const breit = st >= 2 ? 15 : 12, tief = st >= 3 ? 10 : 8, hoch = 7;
        sockel(p, breit + 1, tief + 1);
        b(p, breit, hoch, tief, 0, .8, 0, F.putz);
        b(p, breit + .2, .6, tief + .2, 0, .8 + hoch - .6, 0, F.stein);            // Gesims
        tuer(p, 0, tief / 2, 2.6, 3.6);
        b(p, 5, .5, 1.6, 0, .8, tief / 2 + .9, F.stein2);                            // Stufe
        [-1, 1].forEach(s => { fenster(p, s * (breit / 2 - 2.4), 3.6, tief / 2); });
        if (st >= 2) [-1, 1].forEach(s => fenster(p, s * 3.2, 3.6, tief / 2));
        const oben = dach(p, breit + 1, tief + 1, .8 + hoch, F.dach, 1.2);
        if (st >= 2) {                                                               // Uhrturm
          b(p, 4.4, 7, 4.4, 0, oben - 2.5, 0, F.putz2);
          b(p, 2.6, 2.6, .3, 0, oben + 1.2, 2.25, F.weiss);
          b(p, .3, 1.1, .35, 0, oben + 2.4, 2.3, '#333'); b(p, .9, .3, .35, .35, oben + 2.4, 2.3, '#333');
          const spitze = zelt(p, 5.4, oben + 4.5, F.dach2, .9);
          if (st >= 3) {                                                             // Fahne (weiß-blau)
            b(p, .35, 5, .35, 0, spitze, 0, '#ddd');
            for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) b(p, .9, .9, .15, .8 + i * .9, spitze + 3.2 + j * .9, 0, (i + j) % 2 ? F.blau : F.weiss);
          }
        }
        if (st >= 3) {
          [-1, 1].forEach(s => { blumen(p, s * 4.6, 2.3, tief / 2 + .5, 3); b(p, 1.4, 1.4, 1.4, s * (breit / 2 + 1.4), 0, tief / 2, F.gruen); });
          b(p, 1.2, 1.2, .3, 0, 5.2, tief / 2 + .1, F.gold);                         // Wappen
        }
        return p;
      },
      wohnhaus(st) {
        const p = new T.Group();
        const w = st >= 2 ? 9 : 8, d = st >= 2 ? 7 : 6;
        sockel(p, w + 1, d + 1);
        b(p, w, 4.4, d, 0, .8, 0, F.holz);
        tuer(p, -1.6, d / 2); fenster(p, 1.8, 2.4, d / 2); fenster(p, w / 2, 2.4, 0, 'seite');
        let y = 5.2;
        if (st >= 2) {                                                               // Fachwerk-Obergeschoss
          b(p, w + .4, 4, d + .4, 0, y, 0, F.putz2);
          [-w / 2, -w / 6, w / 6, w / 2].forEach(x => b(p, .45, 4, .3, x, y, d / 2 + .2, F.balken));
          b(p, w + .4, .45, .3, 0, y + 1.9, d / 2 + .2, F.balken);
          fenster(p, -2.2, y + 1, d / 2 + .25); fenster(p, 2.2, y + 1, d / 2 + .25);
          y += 4;
        }
        const oben = dach(p, w + 1.2, d + 1.2, y, st >= 3 ? F.dach : F.dach2, 1.1);
        if (st >= 3) {
          b(p, 1.4, 3, 1.4, w / 2 - 2, oben - 3, -1, F.stein2);                       // Kamin
          blumen(p, 1.8, 1.7, d / 2 + .5, 2.4);
          for (let i = 0; i < 5; i++) b(p, .3, 1.2, .3, -w / 2 + .3 + i * 1.1, 0, d / 2 + 2.6, F.weiss);
          b(p, 5, .3, .25, -w / 2 + 2.5, .8, d / 2 + 2.6, F.weiss);
        }
        return p;
      },
      brunnen(st) {
        const p = new T.Group();
        const r = st >= 3 ? 8 : 6;
        b(p, r + 2, .4, r + 2, 0, 0, 0, F.stein2);
        b(p, r, 2, 1, 0, .4, (r - 1) / 2, F.stein); b(p, r, 2, 1, 0, .4, -(r - 1) / 2, F.stein);
        b(p, 1, 2, r - 2, (r - 1) / 2, .4, 0, F.stein); b(p, 1, 2, r - 2, -(r - 1) / 2, .4, 0, F.stein);
        b(p, r - 2, .3, r - 2, 0, 1.8, 0, F.wasser);
        if (st >= 2 && st < 3) {                                                     // Dach mit Kurbel
          [-1, 1].forEach(s => b(p, .6, 6, .6, s * (r / 2 - .5), .4, 0, F.holz2));
          b(p, r - 1, .4, .4, 0, 5.4, 0, F.holz2);
          dach(p, r + 1, 3, 6.4, F.dach2, .8);
          b(p, 1, 1, 1, 0, 3.6, 0, '#8a6a4a');
        }
        if (st >= 3) {                                                               // Springbrunnen
          b(p, 1.4, 4, 1.4, 0, 1.8, 0, F.stein);
          b(p, 3, .6, 3, 0, 5.8, 0, F.stein);
          b(p, 2.2, .3, 2.2, 0, 6.4, 0, F.wasser);
          [[1.6, 0], [-1.6, 0], [0, 1.6], [0, -1.6]].forEach(([x, z]) => b(p, .4, 1.6, .4, x, 4.8, z, '#9fd4f5'));
          [-1, 1].forEach(s => { b(p, 3.2, .4, 1.2, s * (r / 2 + 2.4), .9, 0, F.holz); b(p, .4, .9, .8, s * (r / 2 + 1.2), 0, 0, F.holz2); b(p, .4, .9, .8, s * (r / 2 + 3.6), 0, 0, F.holz2); });
        }
        if (st === 1) b(p, 1, 1, 1, r / 2 + .6, .4, r / 2 - .5, '#8a6a4a');       // Eimer
        return p;
      },
      baeckerei(st) {
        const p = new T.Group();
        const w = 9, d = 7;
        sockel(p, w + 1, d + 1);
        b(p, w, 4.6, d, 0, .8, 0, '#f2d49b');
        tuer(p, -2.2, d / 2); fenster(p, 1.8, 2.3, d / 2, 'vorn', 2.6, 1.8);
        let y = 5.4;
        if (st >= 3) { b(p, w + .3, 3.8, d + .3, 0, y, 0, F.putz2); fenster(p, -2, y + .9, d / 2 + .2); fenster(p, 2, y + .9, d / 2 + .2); y += 3.8; }
        const oben = dach(p, w + 1.2, d + 1.2, y, '#b5462f', 1.1);
        b(p, 1.6, 3.4, 1.6, w / 2 - 1.8, oben - 3, -1.5, '#a0523a');                  // Ofen-Kamin
        b(p, 2.4, .4, .4, w / 2 + .6, 4.8, d / 2 - .8, F.balken);                     // Schild
        b(p, 1.8, 1, .5, w / 2 + 1.4, 3.6, d / 2 - .8, st >= 3 ? F.gold : '#c88a3c');
        if (st >= 2) {                                                                // Markise + Bank
          for (let i = 0; i < 5; i++) b(p, 1.2, .35, 1.8, .2 + (i - 2) * 1.2 + 1.6, 3.6, d / 2 + .9, i % 2 ? F.weiss : '#d9483b');
          b(p, 3, .5, 1.1, -2.6, .8, d / 2 + 2.2, F.holz);
          b(p, 1.2, .8, .9, -2.6, 1.3, d / 2 + 2.2, '#c88a3c');
        }
        return p;
      },
      schmiede(st) {
        const p = new T.Group();
        const w = st >= 3 ? 10 : 9, d = 7;
        sockel(p, w + 1, d + 1, F.stein2);
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => b(p, .8, 5, .8, sx * (w / 2 - .4), .8, sz * (d / 2 - .4), F.balken));
        if (st >= 2) { b(p, w, 5, .8, 0, .8, -d / 2 + .4, F.stein); b(p, .8, 5, d, -w / 2 + .4, .8, 0, F.stein); }
        dach(p, w + 1.2, d + 1.2, 5.8, F.schiefer, 1);
        b(p, 3, 2, 2.4, -1.6, .8, -1.4, F.stein);                                      // Esse
        b(p, 2, .5, 1.6, -1.6, 2.8, -1.4, '#ff8a2a', { emissive: new T.Color('#c24a00') });
        b(p, 1.4, 8, 1.4, -2.4, 2.8, -2.2, F.stein2);                                  // Kamin
        b(p, .8, 1.2, .8, 2, .8, 1, '#3a3a40'); b(p, 2, .7, 1, 2, 2, 1, '#44444c');    // Amboss
        if (st >= 2) for (let i = 0; i < 3; i++) b(p, .25, 2, .25, w / 2 - 1.2 - i * .8, 2, -d / 2 + 1, '#666');
        if (st >= 3) {
          b(p, 3, 1, 1.4, 2.4, .8, -2, F.holz2); b(p, 2.6, .3, 1, 2.4, 1.6, -2, F.wasser);
          b(p, .4, .4, 2.4, w / 2 + .8, 4.2, d / 2 - 1, F.balken); b(p, .6, 1.6, 1.6, w / 2 + .8, 2.4, d / 2 - 2, F.gold);
        }
        return p;
      },
      saegewerk(st) {
        const p = new T.Group();
        const w = st >= 2 ? 11 : 9, d = 7;
        sockel(p, w + 1, d + 1, '#8f8a7e');
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => b(p, .8, 4.6, .8, sx * (w / 2 - .4), .8, sz * (d / 2 - .4), F.holz2));
        dach(p, w + 1.2, d + 1.2, 5.4, '#8b5a2b', 1);
        b(p, 5, 1.6, 1.6, 0, .8, 0, F.holz);                                            // Sägebank
        b(p, .25, 2.6, 2.6, .6, 1.8, 0, '#b8bcc4');                                     // Sägeblatt
        const stamm = (x, y, z, l = 5) => { b(p, l, 1.2, 1.2, x, y, z, '#8a5a30'); b(p, .2, 1, 1, x + l / 2, y + .1, z, '#d9b27c'); };
        stamm(-1, .8, 2.4); stamm(-1, .8, 3.6); stamm(-1, 2, 3);
        if (st >= 2) { stamm(-w / 2 - 1.5, 0, -1, 4); stamm(-w / 2 - 1.5, 0, 0.2, 4); stamm(-w / 2 - 1.5, 1.2, -.4, 4);
          for (let i = 0; i < 4; i++) b(p, 3.4, .3, 1.4, w / 2 - 2.2, .8 + i * .35, -2.2, '#d9b27c'); }
        if (st >= 3) {                                                                   // Wasserrad
          const rad = new T.Group(); rad.position.set(w / 2 + 1.2, 3.4, 0);
          for (let i = 0; i < 8; i++) { const s = b(rad, .5, 5.4, .6, 0, -2.7, 0, F.holz2); s.rotation.x = i * Math.PI / 8; s.position.y = 0; }
          b(rad, .6, 1.4, 1.4, 0, -.7, 0, F.balken);
          p.add(rad);
          b(p, 2.2, .3, d + 4, w / 2 + 1.2, 0, 0, F.wasser);
        }
        return p;
      },
    };
    Object.assign(MODELLE, {
      steinbruch(st) {
        const p = new T.Group(), r = seeded(7);
        b(p, 12, .4, 10, 0, 0, 0, '#8f8a7e');
        const grau = ['#8d8d8d', '#a3a3a3', '#777777', '#9a948a'];
        const felsen = st >= 2 ? 9 : 6;                                              // Felswand hinten
        for (let i = 0; i < felsen; i++) {
          const w = 2.4 + r() * 2.4, h = 2 + r() * (st >= 3 ? 6 : 4);
          b(p, w, h, 2.6 + r() * 1.5, -5 + i * (10 / felsen) + r(), .4, -3 + r() * 1.2, grau[i % 4]);
        }
        b(p, 3.4, 1.2, 2.2, 2.6, .9, 2.4, F.holz2);                                     // Lore
        [-1, 1].forEach(sx => [-1, 1].forEach(sz => b(p, .6, .6, .3, 2.6 + sx * 1.2, .4, 2.4 + sz * 1.15, '#333')));
        for (let i = 0; i < 3; i++) b(p, .9, .8, .9, 1.9 + i * .7, 2.1, 2.3 + (i % 2) * .3, grau[(i + 1) % 4]);
        b(p, .25, 2.6, .25, -2.4, .4, 3, F.holz); b(p, 1.6, .35, .35, -2.4, 2.8, 3, '#6b7280');   // Spitzhacke
        if (st >= 2) {                                                                   // Holzkran
          b(p, .5, 7, .5, 4.4, .4, -1.2, F.holz2); b(p, 5, .45, .45, 2.2, 7, -1.2, F.holz2);
          b(p, .12, 3, .12, 0, 4.2, -1.2, '#444'); b(p, 1.2, 1, 1.2, 0, 3.2, -1.2, grau[0]);
        }
        if (st >= 3) { for (let i = 0; i < 6; i++) b(p, .3, .15, 2.2, -4.5 + i * 1.6, .4, 4.5, F.balken); b(p, 10, .15, .25, -.5, .55, 4, '#6b7280'); b(p, 10, .15, .25, -.5, .55, 5, '#6b7280'); }
        return p;
      },
      bibliothek(st) {
        const p = new T.Group();
        const w = st >= 2 ? 12 : 10, d = 8, h = st >= 3 ? 8 : 6.5;
        sockel(p, w + 1, d + 1, '#b8b2a6');
        b(p, w, h, d, 0, .8, -.5, '#e8e1d0');
        for (let i = 0; i < 4; i++) b(p, .9, h, .9, -w / 2 + 1.3 + i * (w - 2.6) / 3, .8, d / 2 + .2, F.weiss);   // Säulen
        b(p, w + .8, .8, d + 1.6, 0, .8 + h, 0, '#cfc8b8');
        dach(p, w + 1, d + 1.6, 1.6 + h, '#4b5b73', .9);
        tuer(p, 0, d / 2 - .5, 2.4, 3.6);
        [-1, 1].forEach(sx => fenster(p, sx * (w / 2 - 2.8), 3.6, d / 2 - .5, 'vorn', 1.4, 2.2));
        b(p, 1.6, 1.2, .3, 0, 5.2, d / 2 - .4, '#8b1e1e'); b(p, .3, 1.2, .35, 0, 5.2, d / 2 - .35, '#f5f5f0');  // Buch-Schild
        if (st >= 3) { b(p, 3, 3, 3, 0, 2.4 + h, -1, '#e8e1d0'); zelt(p, 3.6, 5.4 + h, '#2f6f8f', .6, 0, -1); }
        return p;
      },
      marktplatz(st) {
        const p = new T.Group();
        b(p, 13, .3, 12, 0, 0, 0, '#b9b3a8');
        const stand = (x, z, f1, f2) => {
          [-1, 1].forEach(sx => [-1, 1].forEach(sz => b(p, .35, 3.6, .35, x + sx * 1.7, .3, z + sz * 1.1, F.holz2)));
          b(p, 3.6, 1.2, 2.4, x, .3, z, F.holz);
          for (let i = 0; i < 5; i++) b(p, .8, .35, 3, x - 1.6 + i * .8, 3.9, z, i % 2 ? f1 : f2);
          ['#ef4444', '#f59e0b', '#84cc16'].forEach((c, i) => b(p, .7, .5, .7, x - 1.1 + i * 1.1, 1.5, z + .4, c));
        };
        stand(-3.2, -2.5, '#d9483b', F.weiss);
        stand(3.2, -2.5, F.blau, F.weiss);
        if (st >= 2) { stand(-3.2, 3, '#16a34a', '#fde68a'); [[3.4, 3], [4.6, 3.4]].forEach(([x, z]) => b(p, 1.1, 1.5, 1.1, x, .3, z, '#8a5a30')); }
        if (st >= 3) {                                                                    // Maibaum (weiß-blau)
          for (let i = 0; i < 14; i++) b(p, .6, 1, .6, 3.6, .3 + i, 3.6, i % 2 ? F.blau : F.weiss);
          b(p, 2.2, .4, 2.2, 3.6, 12, 3.6, '#2f7d32'); b(p, .9, .9, .15, 3.6, 12.8, 3.6, F.gold);
          [9, 6.5].forEach(y => { b(p, 2.6, .25, .25, 3.6, y, 3.6, F.holz2); b(p, .25, .25, 2.6, 3.6, y, 3.6, F.holz2); });
        }
        return p;
      },
    });
    // Stufe 4: Prachtstufe = Stufe 3 mit Goldschmuck, Laternen und Blumen
    function pracht(p) {
      const box = new T.Box3().setFromObject(p);
      const x0 = box.min.x, x1 = box.max.x, z1 = box.max.z, oben = box.max.y;
      const bw = x1 - x0 + 1.4, bt = z1 - box.min.z + 1.4, mx = (x0 + x1) / 2, mz = (box.min.z + z1) / 2;   // goldener Rand
      b(p, bw, .4, .5, mx, .75, mz + bt / 2, F.gold); b(p, bw, .4, .5, mx, .75, mz - bt / 2, F.gold);
      b(p, .5, .4, bt, mx + bw / 2, .75, mz, F.gold); b(p, .5, .4, bt, mx - bw / 2, .75, mz, F.gold);
      [x0 - .6, x1 + .6].forEach(x => {
        b(p, .4, 4.2, .4, x, 0, z1 + .6, '#374151');
        b(p, .9, .9, .9, x, 4.2, z1 + .6, '#ffe7a3', { emissive: new T.Color('#b88a1e') });
        blumen(p, x + (x < 0 ? 1.8 : -1.8), 0, z1 + 1.3, 2.4);
      });
      b(p, .3, 2.2, .3, (x0 + x1) / 2, oben, (box.min.z + z1) / 2, F.gold);            // goldene Spitze
      b(p, 1.1, 1.1, 1.1, (x0 + x1) / 2, oben + 2.2, (box.min.z + z1) / 2, F.gold, { emissive: new T.Color('#6b4e00') });
      return p;
    }
    function modell(id, st) {
      if (MODELLE[id]) return st >= 4 ? pracht(MODELLE[id](3)) : MODELLE[id](st);
      const p = new T.Group(); sockel(p, 9, 7); b(p, 8, 4, 6, 0, .8, 0, F.putz); dach(p, 9, 7, 4.8, F.dach, 1.1); return p;
    }
    // Bewohner als kleine Blockfiguren (Farben aus dorf-inhalte.json: Oberteil, Hose, Haare)
    const HAUT = ['#f1c9a5', '#e0ac7e', '#c68c5f', '#8d5b3a'];
    function figurBewohner(p, def, x, z, dreh, nr) {
      const f = Array.isArray(def.farben) ? def.farben : ['#64748b', '#334155', '#422006'];
      const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = dreh;
      if (def.tier === 'katze') {                                                         // Katze
        b(g, .9, .8, 1.8, 0, .3, 0, f[0]); b(g, .9, .9, .9, 0, .8, 1.1, f[0]);
        b(g, .25, .35, .2, -.3, 1.7, 1.2, f[0]); b(g, .25, .35, .2, .3, 1.7, 1.2, f[0]);
        b(g, .25, .25, 1.4, 0, 1.1, -1.3, f[0]);
        [[-.3, .7], [.3, .7], [-.3, -.7], [.3, -.7]].forEach(([a, c]) => b(g, .25, .3, .25, a, 0, c, '#7c2d12'));
      } else {
        b(g, .6, 1.6, .7, -.35, 0, 0, f[1]); b(g, .6, 1.6, .7, .35, 0, 0, f[1]);
        b(g, 1.5, 1.8, .9, 0, 1.6, 0, f[0]);
        b(g, .45, 1.5, .5, -.98, 1.8, 0, f[0]); b(g, .45, 1.5, .5, .98, 1.8, 0, f[0]);
        b(g, 1.2, 1.2, 1.2, 0, 3.4, 0, HAUT[nr % HAUT.length]);
        b(g, 1.3, .4, 1.3, 0, 4.5, -.05, f[2]); b(g, 1.3, .9, .3, 0, 3.7, -.55, f[2]);
        b(g, .2, .2, .1, -.28, 3.9, .61, '#1f2937'); b(g, .2, .2, .1, .28, 3.9, .61, '#1f2937');
      }
      p.add(g);
    }
    function geruest(p, w = 11, h = 7, d = 9) {                                         // Baugerüst
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => b(p, .45, h, .45, sx * w / 2, 0, sz * d / 2, '#c8a068'));
      [h * .45, h - .3].forEach(y => { b(p, w, .35, .35, 0, y, d / 2, '#c8a068'); b(p, w, .35, .35, 0, y, -d / 2, '#c8a068');
                                       b(p, .35, .35, d, w / 2, y, 0, '#c8a068'); b(p, .35, .35, d, -w / 2, y, 0, '#c8a068'); });
      b(p, 1.4, 1.4, 1.4, w / 2 + 1.4, 0, d / 2 - .6, '#caa46a'); b(p, 1.4, 1.4, 1.4, w / 2 + 1.4, 1.4, d / 2 - .6, '#b89058');
    }
    function bauplatzLeer(p) {                                                          // Pflöcke mit Fähnchen
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
        b(p, .4, 2.2, .4, sx * (PLATZ / 2 - 1), 0, sz * (PLATZ / 2 - 1), F.holz2);
        b(p, .9, .6, .15, sx * (PLATZ / 2 - 1) + .45, 1.5, sz * (PLATZ / 2 - 1), '#f5c518');
      });
    }
    function bauplatzGesperrt(p) {                                                      // Schild mit Schloss
      b(p, .5, 3, .5, 0, 0, 0, F.holz2);
      b(p, 3, 2, .4, 0, 2.4, .2, F.holz);
      b(p, 1.2, 1, .3, 0, 2.8, .45, '#6b7280'); b(p, .8, .7, .2, 0, 3.6, .45, '#9ca3af'); b(p, .4, .4, .2, 0, 3.6, .5, F.holz);
    }

    // ── Boden (ein Canvas als Pixel-Textur) ─────────────────
    const plaetze = DORF.plaetze();
    let minX = -20, maxX = 20, minZ = -20, maxZ = 20;
    plaetze.forEach(p => { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z); });
    const RAND = PLATZ / 2 + 10;
    minX -= RAND; maxX += RAND; minZ -= RAND; maxZ += RAND;
    const BW = Math.ceil(maxX - minX), BT = Math.ceil(maxZ - minZ);
    const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
    const boden = document.createElement('canvas'); boden.width = BW; boden.height = BT;
    const bodenTex = new T.CanvasTexture(boden);
    bodenTex.magFilter = T.NearestFilter; bodenTex.minFilter = T.NearestFilter; bodenTex.generateMipmaps = false;
    const bodenMesh = new T.Mesh(new T.PlaneGeometry(BW, BT), new T.MeshLambertMaterial({ map: bodenTex }));
    bodenMesh.rotation.x = -Math.PI / 2; bodenMesh.position.set(cx, 0, cz);
    scene.add(bodenMesh);
    const wiese = new T.Mesh(new T.PlaneGeometry(BW * 4, BT * 4), lam('#5fb862'));
    wiese.rotation.x = -Math.PI / 2; wiese.position.set(cx, -.05, cz);
    scene.add(wiese);
    const px = x => Math.round(x - minX), pz = z => Math.round(z - minZ);

    function bodenMalen(zustand) {
      const g = boden.getContext('2d'), r = seeded(11);
      g.fillStyle = '#6cc56f'; g.fillRect(0, 0, BW, BT);
      for (let i = 0; i < BW * BT / 12; i++) { g.fillStyle = ['#5fb862', '#79cf78', '#64bd66'][i % 3]; g.fillRect(r() * BW | 0, r() * BT | 0, 1, 1); }
      // Wege vom Dorfplatz zu jedem Bauplatz
      g.fillStyle = '#c9a877';
      plaetze.forEach(p => { g.fillRect(Math.min(px(0), px(p.x)) - 2, pz(0) - 2, Math.abs(px(p.x) - px(0)) + 4, 4);
                             g.fillRect(px(p.x) - 2, Math.min(pz(0), pz(p.z)) - 2, 4, Math.abs(pz(p.z) - pz(0)) + 4); });
      // Dorfplatz (Pflaster)
      for (let x = -9; x <= 9; x++) for (let z = -9; z <= 9; z++) {
        if (Math.abs(x) + Math.abs(z) > 12) continue;
        g.fillStyle = (x + z) % 2 ? '#b9b3a8' : '#aaa398'; g.fillRect(px(x), pz(z), 1, 1);
      }
      // Bauplätze
      plaetze.forEach(p => {
        const z = zustand[p.id] || {};
        if (z.gesperrt) return;
        const x0 = px(p.x) - PLATZ / 2, y0 = pz(p.z) - PLATZ / 2;
        g.fillStyle = z.bebaut ? '#9c8f7a' : '#8a6a44'; g.fillRect(x0, y0, PLATZ, PLATZ);
        g.fillStyle = z.bebaut ? '#b3a68f' : '#b58a5a'; g.fillRect(x0 + 1, y0 + 1, PLATZ - 2, PLATZ - 2);
      });
      bodenTex.needsUpdate = true;
    }

    // Deko: Bäume am Rand und in Lücken (fest, jedes Mal gleich)
    const deko = new T.Group();
    (function () {
      const r = seeded(42), frei = (x, z) => Math.abs(x) + Math.abs(z) > 16 && plaetze.every(p => Math.abs(p.x - x) > PLATZ / 2 + 3 || Math.abs(p.z - z) > PLATZ / 2 + 3)
        && plaetze.every(p => !((Math.abs(z) < 4 && x * p.x > 0 && Math.abs(x) <= Math.abs(p.x) + 2) || (Math.abs(x - p.x) < 4 && z * p.z >= 0 && Math.abs(z) <= Math.abs(p.z) + 2)));
      let n = 0;
      for (let i = 0; i < 400 && n < 46; i++) {
        const x = minX + 3 + r() * (BW - 6), z = minZ + 3 + r() * (BT - 6);
        const amRand = x < minX + 10 || x > maxX - 10 || z < minZ + 10 || z > maxZ - 10;
        if (!frei(x, z) || (!amRand && r() < .7)) continue;
        baum(deko, Math.round(x), Math.round(z), 4 + Math.round(r() * 3), r); n++;
      }
      for (let i = 0; i < 30; i++) {                                                     // Blumen
        const x = minX + r() * BW, z = minZ + r() * BT;
        if (frei(x, z)) b(deko, .6, .6, .6, Math.round(x), 0, Math.round(z), r() < .5 ? F.blume : '#f5d04a');
      }
    })();
    scene.add(backe(deko));

    // ── Figur (Bürgermeister·in) auf dem Dorfplatz ─────────
    const buerger = new T.Group();
    buerger.add(figur.root);
    const box = new T.Box3().setFromObject(figur.root);
    const hoehe = Math.max(1, box.max.y - box.min.y);
    figur.root.scale.setScalar(7.5 / hoehe);
    buerger.position.set(2, 0, 2);
    buerger.rotation.y = Math.PI / 4;                                                    // zur Kamera
    figur.pose({ lauf: 0, jubel: 0, t: 0 });
    scene.add(buerger);
    b(scene, 3.6, .15, 3.6, 2, 0, 2, lam('#000', { transparent: true, opacity: .18 }));  // Schatten

    // ── Bauplätze ──────────────────────────────────────────
    const hitMat = new T.MeshBasicMaterial({ visible: false });
    const platzObj = {};                                                                  // id → { gruppe, schluessel, hit }
    const hits = [];
    plaetze.forEach(p => {
      const g = new T.Group(); g.position.set(p.x, 0, p.z); scene.add(g);
      const hit = new T.Mesh(geo(PLATZ, 18, PLATZ), hitMat); hit.position.set(p.x, 9, p.z); hit.userData.platz = p.id;
      scene.add(hit); hits.push(hit);
      platzObj[p.id] = { gruppe: g, schluessel: null, inhalt: null };
    });
    const rahmen = new T.Group();                                                          // Auswahl
    const gelb = lam('#ffd84a', { emissive: new T.Color('#8a6a00') });
    [[0, PLATZ / 2, PLATZ + 1, .7], [0, -PLATZ / 2, PLATZ + 1, .7], [PLATZ / 2, 0, .7, PLATZ + 1], [-PLATZ / 2, 0, .7, PLATZ + 1]]
      .forEach(([x, z, w, d]) => b(rahmen, w, .5, d, x, .05, z, gelb));
    rahmen.visible = false;
    scene.add(rahmen);

    function update() {
      const zustand = {};
      let geaendert = false;
      plaetze.forEach(p => {
        const info = DORF.platzInfo(p.id);
        if (!info) return;
        zustand[p.id] = { gesperrt: info.gesperrt, bebaut: !!info.eintrag };
        const key = info.gesperrt ? 'zu' : !info.eintrag ? 'frei' : [info.gebaeude.id, info.stufe, info.imBau ? 'bau' : ''].join('|');
        const o = platzObj[p.id];
        if (o.schluessel === key) return;
        const neu = o.schluessel !== null;
        o.schluessel = key;
        if (o.inhalt) { o.gruppe.remove(o.inhalt); entsorgen(o.inhalt); }
        const roh = new T.Group();
        if (info.gesperrt) bauplatzGesperrt(roh);
        else if (!info.eintrag) bauplatzLeer(roh);
        else {
          if (info.stufe > 0) roh.add(modell(info.gebaeude.id, info.stufe));
          else b(roh, 11, .8, 9, 0, 0, 0, F.stein);                                     // Fundament
          if (info.imBau) geruest(roh, info.gebaeude.id === 'rathaus' ? 17 : 12, info.stufe > 0 ? 10 : 6, info.gebaeude.id === 'rathaus' ? 12 : 10);
        }
        o.inhalt = backe(roh);
        o.gruppe.add(o.inhalt);
        if (neu && !reduce) pop(o.inhalt);
        geaendert = true;
      });
      bodenMalen(zustand);
      leuteZeichnen();
      zeichne();
      return geaendert;
    }

    let leute = null, leuteKey = null;
    function leuteZeichnen() {
      const bw = DORF.state.bw || [];
      const key = JSON.stringify(bw);
      if (key === leuteKey) return;
      leuteKey = key;
      if (leute) { scene.remove(leute); entsorgen(leute); }
      const roh = new T.Group(), proPlatz = {};
      bw.forEach(([id, platz], nr) => {
        const def = DORF.bewohnerDef(id), p = plaetze.find(x => x.id === platz);
        if (!def || !p) return;
        const k = proPlatz[platz] = (proPlatz[platz] || 0) + 1;                       // 1.–4. Bewohner dieses Hauses
        const pos = [[PLATZ / 2 + 1.6, 3], [PLATZ / 2 + 1.6, -1], [3, PLATZ / 2 + 1.6], [-1.5, PLATZ / 2 + 1.6]][(k - 1) % 4];
        figurBewohner(roh, def, p.x + pos[0], p.z + pos[1], Math.PI / 4 + (k % 2 ? .3 : -.3), nr);
      });
      leute = backe(roh);
      scene.add(leute);
    }

    // ── Kamera: feste Iso-Ansicht, passt das Dorf ein ──────
    const BLICK = new T.Vector3(1, 1.05, 1).normalize();
    const mitte = new T.Vector3(cx, 0, cz);
    function kameraEinpassen() {
      const w = host.clientWidth || 300, h = host.clientHeight || 200;
      renderer.setSize(w, h, false);
      camera.position.copy(mitte).addScaledVector(BLICK, 300);
      camera.lookAt(mitte);
      camera.updateMatrixWorld();
      const inv = camera.matrixWorldInverse;
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      const v = new T.Vector3();
      const R = PLATZ / 2 + 3;                                                          // nur das Dorf, nicht den ganzen Rand
      [minX + RAND - R, maxX - RAND + R].forEach(x => [minZ + RAND - R, maxZ - RAND + R].forEach(z => [0, 16].forEach(y => {
        v.set(x, y, z).applyMatrix4(inv);
        x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y);
      })));
      let bw = (x1 - x0) * 1.04, bh = (y1 - y0) * 1.04;
      const ax = (x0 + x1) / 2, ay = (y0 + y1) / 2, asp = w / h;
      if (bw / bh > asp) bh = bw / asp; else bw = bh * asp;
      camera.left = ax - bw / 2; camera.right = ax + bw / 2; camera.top = ay + bh / 2; camera.bottom = ay - bh / 2;
      camera.updateProjectionMatrix();
      zeichne();
    }

    // ── Zeichnen nur bei Bedarf ────────────────────────────
    let geplant = false, laeuft = 0, lebt = true;
    const animationen = [];
    function zeichne() {
      if (geplant || !lebt) return;
      geplant = true;
      requestAnimationFrame(schleife);
    }
    function schleife(t) {
      geplant = false;
      if (!lebt) return;
      for (let i = animationen.length - 1; i >= 0; i--) if (animationen[i](t) === false) animationen.splice(i, 1);
      renderer.render(scene, camera);
      if (animationen.length) zeichne();
    }
    function animiere(fn) { animationen.push(fn); zeichne(); }
    function pop(obj) {
      let t0 = null;
      animiere(t => { if (t0 === null) t0 = t; const k = Math.min(1, (t - t0) / 450);
        const s = k < 1 ? .6 + .4 * (1 - Math.pow(1 - k, 3)) * (1 + .12 * Math.sin(k * Math.PI)) : 1;
        obj.scale.set(s, s, s); return k < 1; });
    }
    function jubel() {
      if (reduce) return;
      let t0 = null;
      animiere(t => { if (t0 === null) t0 = t; const k = (t - t0) / 1600;
        figur.pose({ lauf: 0, jubel: k < 1 ? 1 : 0, t: (t - t0) / 1000 });
        buerger.position.y = k < 1 ? Math.abs(Math.sin(k * Math.PI * 3)) * 1.2 : 0;
        return k < 1; });
    }

    // ── Antippen ───────────────────────────────────────────
    const ray = new T.Raycaster(), maus = new T.Vector2();
    function treffer(e) {
      const r = cv.getBoundingClientRect();
      maus.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(maus, camera);
      const h = ray.intersectObjects(hits, false)[0];
      return h ? h.object.userData.platz : null;
    }
    const onClick = e => { const id = treffer(e); if (id !== null && opt.onPlatz) opt.onPlatz(id); };
    const onMove = e => { if (e.pointerType === 'mouse') cv.style.cursor = treffer(e) !== null ? 'pointer' : 'default'; };
    cv.addEventListener('click', onClick);
    cv.addEventListener('pointermove', onMove);

    function auswahl(id) {
      const p = plaetze.find(x => x.id === id);
      rahmen.visible = !!p;
      if (p) rahmen.position.set(p.x, 0, p.z);
      zeichne();
    }

    const ro = new ResizeObserver(kameraEinpassen);
    ro.observe(host);
    update();
    kameraEinpassen();

    function foto() {
      const sichtbar = rahmen.visible;
      rahmen.visible = false;                                                             // ohne Auswahlrahmen
      renderer.render(scene, camera);
      let url = null;
      try { url = cv.toDataURL('image/png'); } catch (e) {}
      rahmen.visible = sichtbar;
      zeichne();
      return url;
    }

    return {
      update, auswahl, jubel, foto,
      destroy() { lebt = false; ro.disconnect(); cv.removeEventListener('click', onClick); cv.removeEventListener('pointermove', onMove); renderer.dispose(); cv.remove(); },
    };
  }

  window.LernDorfSzene = { mount, webglOk };
})();
