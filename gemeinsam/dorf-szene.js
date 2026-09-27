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
//  Etappe 5: Festwiese (Event-Gebäude, Gast, Pass-Begleiter), Deko-Plätze, Event-Stimmung
//  (Himmel, Licht, Boden, Schmuck an Gebäuden, Bäume, Partikel), Suche-Objekt, Wimpel für
//  Pass-Events ohne Dorf-Inhalte. Event-Modelle kommen als Klötzchen aus dorf-inhalte.json.
//  Dauer-Animationen (Partikel, Suche, Begleiter; ab Etappe 6 laufende Bewohner) laufen im
//  „Takt“: höchstens 30 Bilder pro Sekunde, nur wenn das Dorf sichtbar ist, und Pause nach
//  60 Sekunden ohne Antippen. Bei „Bewegung reduzieren“ gibt es keine Dauer-Animationen.
//
//  Etappe 6: Bewohner laufen auf den Gassen (FLAECHEN.wege.gitter) zu ihren Zielen, Tiere und die
//  Bürgermeister·in mit Pass-Begleiter bewegen sich, die Landschaft (LANDSCHAFT) wächst ins Umland.
//  Gebacken wird mit Vertex-Farben: ein Gebäude = meist ein Draw-Call.
//  Antippbar zusätzlich: 'b:ID' = Bewohner, 'rand' = Schild zum neuen Gebiet.
//
//  API (window.LernDorfSzene):
//    webglOk()                        → true, wenn 3D möglich ist
//    mount(host, { onPlatz(id) })     → Promise: Steuerung oder null (kein 3D)
//                                       id: Zahl = Bauplatz, 'fest' = Festwiese, 'd:ID' = Deko-Platz, 'suche' = Versteck
//      .update()                      Bauplätze, Festwiese, Deko und Stimmung aus LernDorf neu zeichnen (nur geänderte)
//      .auswahl(id|null)              Bauplatz, Festwiese oder Deko-Platz markieren
//      .setzModus(an)                 freie Deko-Plätze leuchten (Deko platzieren)
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
    const hemi = new T.HemisphereLight(0xf2f6ff, 0x4d6b45, .62);
    scene.add(hemi);
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
    function himmel(f = ['#6fb6ff', '#a9d8ff', '#e9f5ff']) {
      const c = document.createElement('canvas'); c.width = 2; c.height = 256;
      const x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 256);
      g.addColorStop(0, f[0]); g.addColorStop(.6, f[1]); g.addColorStop(1, f[2]);
      x.fillStyle = g; x.fillRect(0, 0, 2, 256);
      return new T.CanvasTexture(c);
    }
    function seeded(s) { return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

    // Alle Meshes einer Gruppe zusammenfügen: einfarbige Klötze zu EINEM Mesh mit Vertex-Farben
    // (ein Draw-Call für ein ganzes Gebäude), Besonderes (leuchtend, durchsichtig, Textur,
    // Fenster) bleibt je Material getrennt.
    const BUNT = new T.MeshLambertMaterial({ vertexColors: true });
    function eigen(m) {
      return !m.isMeshLambertMaterial || (m.userData && m.userData.eigen) || m.transparent || m.map || m.vertexColors
        || (m.emissive && (m.emissive.r || m.emissive.g || m.emissive.b));
    }
    function backe(gruppe) {
      gruppe.updateMatrixWorld(true);
      const nachMat = new Map(), bunt = [];
      gruppe.traverse(o => {
        if (!o.isMesh || !o.material || o.material.visible === false) return;
        const g = o.geometry.clone(); g.applyMatrix4(o.matrixWorld);
        if (!eigen(o.material)) { g.userData.farbe = o.material.color; bunt.push(g); return; }
        if (!nachMat.has(o.material)) nachMat.set(o.material, []);
        nachMat.get(o.material).push(g);
      });
      const out = new T.Group();
      if (bunt.length) out.add(new T.Mesh(verbinde(bunt), BUNT));
      nachMat.forEach((geos, mat) => out.add(new T.Mesh(verbinde(geos), mat)));
      return out;
    }
    function verbinde(geos) {
      let n = 0, ni = 0;
      geos.forEach(g => { n += g.attributes.position.count; ni += g.index.count; });
      const farbig = geos.every(g => g.userData.farbe);
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = farbig ? new Float32Array(n * 3) : null;
      const ind = n > 65000 ? new Uint32Array(ni) : new Uint16Array(ni);
      let o = 0, io = 0;
      geos.forEach(g => {
        pos.set(g.attributes.position.array, o * 3);
        nor.set(g.attributes.normal.array, o * 3);
        const c = g.userData.farbe, k = g.attributes.position.count;
        if (col) for (let i = 0; i < k; i++) { col[(o + i) * 3] = c.r; col[(o + i) * 3 + 1] = c.g; col[(o + i) * 3 + 2] = c.b; }
        const I = g.index.array;
        for (let i = 0; i < I.length; i++) ind[io + i] = I[i] + o;
        o += k; io += I.length;
        g.dispose();
      });
      const bg = new T.BufferGeometry();
      bg.setAttribute('position', new T.BufferAttribute(pos, 3));
      bg.setAttribute('normal', new T.BufferAttribute(nor, 3));
      if (col) bg.setAttribute('color', new T.BufferAttribute(col, 3));
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
    // art: '' (Sommer) | 'herbst' | 'schnee' | 'bluete'
    function baum(p, x, z, h = 5, r = seeded(x * 31 + z * 17 + 5), art = '') {
      b(p, 1.2, h, 1.2, x, 0, z, '#7a5230');
      const wahl = r();
      let g = ['#3f8f47', '#4a9d4f', '#3a8440'][Math.floor(wahl * 3)];
      if (art === 'herbst') g = ['#d9731a', '#c2410c', '#e0a31a', '#4a9d4f'][Math.floor(wahl * 4)];
      if (art === 'schnee') g = ['#2f6b3a', '#356f40', '#2c6236'][Math.floor(wahl * 3)];
      if (art === 'bluete' && wahl < .55) g = wahl < .3 ? '#f9a8d4' : '#fbe4f0';
      b(p, 5, 3, 5, x, h - .6, z, g); b(p, 3.4, 2, 3.4, x, h + 2.2, z, g);
      if (art === 'schnee') { b(p, 5.1, .45, 5.1, x, h + 2.4, z, '#f8fafc'); b(p, 3.5, .45, 3.5, x, h + 4.2, z, '#f8fafc'); }
      if (art === 'bluete' && wahl >= .55) [[-1.8, 1.2], [1.6, -1.4], [.4, 1.9]].forEach(([dx, dz]) => b(p, .8, .8, .8, x + dx, h + 1.9, z + dz, '#fbcfe8'));
    }
    /** Klötzchen aus den Inhalten: [{ g: [w, h, d], p: [x, y, z], f: Farbe, l: 1 = leuchtet }], y = Unterkante */
    function klotz(p, liste, dx = 0, dy = 0, dz = 0) {
      (Array.isArray(liste) ? liste : []).forEach(k => {
        if (!k || !Array.isArray(k.g) || !Array.isArray(k.p) || typeof k.f !== 'string') return;
        const [w, h, d] = k.g.map(Number), [x, y, z] = k.p.map(Number);
        if (![w, h, d, x, y, z].every(Number.isFinite) || w <= 0 || h <= 0 || d <= 0) return;
        b(p, w, h, d, x + dx, y + dy, z + dz, k.f, k.l ? { emissive: new T.Color(k.f).multiplyScalar(.75) } : undefined);
      });
      return p;
    }
    // Schmuck an fertigen Gebäuden während eines Events (kostenlos, verschwindet danach wieder)
    const DACH = [F.dach, F.dach2, F.schiefer, '#b5462f', '#8b5a2b', '#4b5b73', '#2f6f8f', '#9e3a30'];
    const LICHTER = ['#fde047', '#f87171', '#86efac', '#93c5fd'];
    function schmuck(roh, art, gebId, stufe) {
      if (!art) return;
      roh.updateMatrixWorld(true);
      const dachTeile = [], v = new T.Vector3();
      roh.traverse(o => {
        if (!o.isMesh || !o.geometry.parameters || !o.material.color) return;
        const hex = '#' + o.material.color.getHexString();
        if (DACH.includes(hex)) { o.getWorldPosition(v); dachTeile.push({ x: v.x, y: v.y, z: v.z, ...o.geometry.parameters, gedreht: !!(o.rotation.x || o.rotation.z || o.parent.rotation.x || o.parent.rotation.z) }); }
      });
      const box = new T.Box3().setFromObject(roh);
      const x0 = box.min.x, x1 = box.max.x, z1 = box.max.z;
      if (art === 'schnee') {
        dachTeile.filter(d => !d.gedreht).forEach(d => b(roh, d.width + .15, .4, d.depth + .15, d.x, d.y + d.height / 2, d.z, '#f8fafc'));
        if (dachTeile.length) {                                                        // Lichterkette unter der Traufe
          const traufe = Math.min(...dachTeile.map(d => d.y - d.height / 2));
          const n = Math.max(3, Math.floor((x1 - x0 - 2) / 1.1));
          for (let i = 0; i <= n; i++) b(roh, .35, .35, .35, x0 + 1 + i * (x1 - x0 - 2) / n, traufe - .5, z1 - .3, LICHTER[i % 4], { emissive: new T.Color(LICHTER[i % 4]).multiplyScalar(.8) });
        }
      } else if (art === 'kuerbis') {
        [[x0 - .6, z1 + .8, 1.5, true], [x1 + .5, z1 + .6, 1.1, false]].forEach(([x, z, g, gesicht]) => {
          b(roh, g, g * .8, g, x, 0, z, '#f28c28'); b(roh, .25, .5, .25, x, g * .8, z, '#3f7d2c');
          if (gesicht) { const l = { emissive: new T.Color('#ffb020') }; b(roh, .3, .3, .1, x - .35, g * .4, z + g / 2, '#ffd166', l); b(roh, .3, .3, .1, x + .35, g * .4, z + g / 2, '#ffd166', l); b(roh, .7, .2, .1, x, g * .15, z + g / 2, '#ffd166', l); }
        });
      } else if (art === 'ostern') {
        const EI = ['#f472b6', '#facc15', '#a78bfa', '#60a5fa', '#fb7185'];
        if (gebId === 'brunnen' && stufe !== 2) {                                      // Osterbrunnen: grüne Bögen über dem Brunnen, mit Eiern
          const r = 2.6, gr = '#3f8f47';
          [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => b(roh, .6, 6.4, .6, sx * r, 1.8, sz * r, gr));
          b(roh, 2 * r + .6, .7, .7, 0, 8.2, 0, gr); b(roh, .7, .7, 2 * r + .6, 0, 8.2, 0, gr); b(roh, 1.2, 1.2, 1.2, 0, 8.6, 0, '#fde047');
          [[-r, 0], [r, 0], [0, -r], [0, r]].forEach(([dx, dz], i) => { b(roh, dx ? .7 : 2 * r, .7, dz ? .7 : 2 * r, dx, 6.2, dz, gr); });
          for (let i = 0; i < 16; i++) { const t = (i % 4) / 3, s = Math.floor(i / 4), ecke = [[-r, -r, r, -r], [r, -r, r, r], [r, r, -r, r], [-r, r, -r, -r]][s];
            b(roh, .55, .75, .55, ecke[0] + (ecke[2] - ecke[0]) * t, 5.4, ecke[1] + (ecke[3] - ecke[1]) * t, EI[i % 5]); }
        }
        for (let i = 0; i < 4; i++) b(roh, .6, .6, .6, x0 + .8 + i * .9, 0, z1 + 1, EI[(i + 1) % 5]);
        b(roh, .7, .9, .7, x1 - .2, 0, z1 + .9, EI[0]); b(roh, .72, .2, .72, x1 - .2, .4, z1 + .9, '#fff');
      }
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
        if (Array.isArray(def.zusatz)) klotz(g, def.zusatz);                            // z. B. Hut eines Gasts
      }
      p.add(g);
      return g;
    }
    function geruest(p, w = 11, h = 7, d = 9) {                                         // Baugerüst
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => b(p, .45, h, .45, sx * w / 2, 0, sz * d / 2, '#c8a068'));
      [h * .45, h - .3].forEach(y => { b(p, w, .35, .35, 0, y, d / 2, '#c8a068'); b(p, w, .35, .35, 0, y, -d / 2, '#c8a068');
                                       b(p, .35, .35, d, w / 2, y, 0, '#c8a068'); b(p, .35, .35, d, -w / 2, y, 0, '#c8a068'); });
      b(p, 1.4, 1.4, 1.4, w / 2 + 1.4, 0, d / 2 - .6, '#caa46a'); b(p, 1.4, 1.4, 1.4, w / 2 + 1.4, 1.4, d / 2 - .6, '#b89058');
    }
    function bauplatzLeer(p, dx = 0, dz = 0) {                                          // Pflöcke mit Fähnchen
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
        b(p, .4, 2.2, .4, dx + sx * (PLATZ / 2 - 1), 0, dz + sz * (PLATZ / 2 - 1), F.holz2);
        b(p, .9, .6, .15, dx + sx * (PLATZ / 2 - 1) + .45, 1.5, dz + sz * (PLATZ / 2 - 1), '#f5c518');
      });
    }
    function bauplatzGesperrt(p) {                                                      // Schild mit Schloss
      b(p, .5, 3, .5, 0, 0, 0, F.holz2);
      b(p, 3, 2, .4, 0, 2.4, .2, F.holz);
      b(p, 1.2, 1, .3, 0, 2.8, .45, '#6b7280'); b(p, .8, .7, .2, 0, 3.6, .45, '#9ca3af'); b(p, .4, .4, .2, 0, 3.6, .5, F.holz);
    }

    // ── Boden (ein Canvas als Pixel-Textur) ─────────────────
    const plaetze = DORF.plaetze();
    const FL = DORF.flaechen();
    const FW = FL.festwiese;
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
    const wieseMat = new T.MeshLambertMaterial({ color: '#5fb862' });                    // Umland (ab Etappe 6 mit Landschaft)
    const wiese = new T.Mesh(new T.PlaneGeometry(BW * 4, BT * 4), wieseMat);
    wiese.rotation.x = -Math.PI / 2; wiese.position.set(cx, -.05, cz);
    scene.add(wiese);
    const px = x => Math.round(x - minX), pz = z => Math.round(z - minZ);
    const SOMMER = { boden: ['#6cc56f', '#5fb862', '#79cf78', '#64bd66'], wiese: '#5fb862' };
    let farben = SOMMER;

    function bodenMalen(zustand) {
      const g = boden.getContext('2d'), r = seeded(11), f = farben.boden;
      g.fillStyle = f[0]; g.fillRect(0, 0, BW, BT);
      for (let i = 0; i < BW * BT / 12; i++) { g.fillStyle = f[1 + i % (f.length - 1)]; g.fillRect(r() * BW | 0, r() * BT | 0, 1, 1); }
      // Wege vom Dorfplatz zu jedem Bauplatz und zur Festwiese
      g.fillStyle = '#c9a877';
      plaetze.forEach(p => { g.fillRect(Math.min(px(0), px(p.x)) - 2, pz(0) - 2, Math.abs(px(p.x) - px(0)) + 4, 4);
                             g.fillRect(px(p.x) - 2, Math.min(pz(0), pz(p.z)) - 2, 4, Math.abs(pz(p.z) - pz(0)) + 4); });
      g.fillRect(px(maxX - RAND) , pz(FW.z) - 2, BW - px(maxX - RAND), 4);
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

    // Festwiese: eigener Boden außerhalb des Dorfquadrats, mit Weg ins Dorf
    const fwCan = document.createElement('canvas'); fwCan.width = FW.breite; fwCan.height = FW.tiefe;
    const fwTex = new T.CanvasTexture(fwCan);
    fwTex.magFilter = T.NearestFilter; fwTex.minFilter = T.NearestFilter; fwTex.generateMipmaps = false;
    const fwBoden = new T.Mesh(new T.PlaneGeometry(FW.breite, FW.tiefe), new T.MeshLambertMaterial({ map: fwTex }));
    fwBoden.rotation.x = -Math.PI / 2; fwBoden.position.set(FW.x, .01, FW.z);
    scene.add(fwBoden);
    const fwWeg = new T.Mesh(new T.PlaneGeometry(Math.max(1, FW.x - FW.breite / 2 - maxX + .5), 4), lam('#c9a877'));
    fwWeg.rotation.x = -Math.PI / 2; fwWeg.position.set((maxX + FW.x - FW.breite / 2) / 2, .01, FW.z);
    scene.add(fwWeg);
    function festwieseMalen() {
      const g = fwCan.getContext('2d'), r = seeded(23), f = farben.boden, W = FW.breite, H = FW.tiefe;
      g.fillStyle = f[0]; g.fillRect(0, 0, W, H);
      for (let i = 0; i < W * H / 8; i++) { g.fillStyle = f[1 + i % (f.length - 1)]; g.fillRect(r() * W | 0, r() * H | 0, 1, 1); }
      g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(1, 1, W - 2, H - 2);
      g.fillStyle = 'rgba(90,60,30,.35)'; g.fillRect(0, 0, W, 1); g.fillRect(0, H - 1, W, 1); g.fillRect(0, 0, 1, H); g.fillRect(W - 1, 0, 1, H);
      g.fillStyle = '#c9a877'; g.fillRect(0, Math.round(H / 2) - 2, 5, 4);
      fwTex.needsUpdate = true;
    }
    // Zaun hinten, Schild am Eingang (fest)
    (function () {
      const z = new T.Group(), x0 = FW.x - FW.breite / 2, x1 = FW.x + FW.breite / 2, z0 = FW.z - FW.tiefe / 2, z1 = FW.z + FW.tiefe / 2;
      for (let x = x0; x <= x1 + .01; x += 3) b(z, .4, 1.6, .4, x, 0, z0, F.holz2);
      b(z, x1 - x0, .3, .25, (x0 + x1) / 2, 1, z0, F.holz2);
      for (let q = z0 + 3; q <= z1 + .01; q += 3) b(z, .4, 1.6, .4, x1, 0, q, F.holz2);
      b(z, .25, .3, z1 - z0, x1, 1, (z0 + z1) / 2, F.holz2);
      b(z, .45, 3.4, .45, x0 + .8, 0, FW.z - 3.2, F.holz2);                                // Schild „Festwiese“
      b(z, .35, 1.6, 3.4, x0 + .9, 2.2, FW.z - 3.2, F.holz);
      for (let i = 0; i < 4; i++) b(z, .2, .3, .5, x0 + 1.1, 2.9 - (i % 2) * .6, FW.z - 4.3 + i * .75, '#f5f0e0');
      scene.add(backe(z));
    })();

    // Wege ins Umland (alle, auch noch nicht gewachsene) bleiben frei von Bäumen
    function abstandStrecke(x, z, ax, az, bx, bz) {
      const dx = bx - ax, dz = bz - az, l = dx * dx + dz * dz, t = l ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l)) : 0;
      return Math.hypot(x - ax - t * dx, z - az - t * dz);
    }
    const wegPunkte = [];
    DORF.landschaftListe().forEach(l => [l.besuch, l.punkte, l.weg && l.weg.punkte].forEach(pt => {
      if (Array.isArray(pt)) for (let i = 1; i < pt.length; i++) wegPunkte.push([pt[i - 1][0], pt[i - 1][1], pt[i][0], pt[i][1]]);
    }));
    // Deko: Bäume am Rand und in Lücken (fest, jedes Mal gleich; Variante je nach Stimmung)
    const dekoPos = [];
    (function () {
      const r = seeded(42), frei = (x, z) => Math.abs(x) + Math.abs(z) > 16 && plaetze.every(p => Math.abs(p.x - x) > PLATZ / 2 + 3 || Math.abs(p.z - z) > PLATZ / 2 + 3)
        && plaetze.every(p => !((Math.abs(z) < 4 && x * p.x > 0 && Math.abs(x) <= Math.abs(p.x) + 2) || (Math.abs(x - p.x) < 4 && z * p.z >= 0 && Math.abs(z) <= Math.abs(p.z) + 2)))
        && FL.dekoplaetze.every(d => Math.hypot(d.x - x, d.z - z) > 5.5) && FL.verstecke.every(v => Math.hypot(v.x - x, v.z - z) > 4)
        && !(x > maxX - 12 && Math.abs(z - FW.z) < 5)                                  // Weg zur Festwiese
        && !FL.wege.gitter.some(g => Math.abs(x - g) < 2.8 || Math.abs(z - g) < 2.8)      // Gassen für die Bewohner
        && !wegPunkte.some(([ax, az, bx, bz]) => abstandStrecke(x, z, ax, az, bx, bz) < 3.2);
      let n = 0;
      for (let i = 0; i < 400 && n < 46; i++) {
        const x = minX + 3 + r() * (BW - 6), z = minZ + 3 + r() * (BT - 6);
        const amRand = x < minX + 10 || x > maxX - 10 || z < minZ + 10 || z > maxZ - 10;
        if (!frei(x, z) || (!amRand && r() < .7)) continue;
        dekoPos.push({ art: 'baum', x: Math.round(x), z: Math.round(z), h: 4 + Math.round(r() * 3), s: Math.floor(r() * 1e6) + 1 }); n++;
      }
      for (let i = 0; i < 30; i++) {                                                     // Blumen
        const x = minX + r() * BW, z = minZ + r() * BT, f = r() < .5 ? F.blume : '#f5d04a';
        if (frei(x, z)) dekoPos.push({ art: 'blume', x: Math.round(x), z: Math.round(z), f });
      }
    })();
    let baeume = null;
    function baeumeZeichnen(art) {
      if (baeume) { scene.remove(baeume); entsorgen(baeume); }
      const g = new T.Group();
      dekoPos.forEach(d => {
        if (d.art === 'baum') baum(g, d.x, d.z, d.h, seeded(d.s), art);
        else if (art !== 'schnee') b(g, .6, .6, .6, d.x, 0, d.z, d.f);
      });
      baeume = backe(g);
      scene.add(baeume);
    }

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
    b(buerger, 3.6, .15, 3.6, 0, 0, 0, lam('#000', { transparent: true, opacity: .18 }));  // Schatten (läuft mit)

    // ── Bauplätze, Festwiese, Deko-Plätze ──────────────────
    const hitMat = new T.MeshBasicMaterial({ visible: false });
    const platzObj = {};                                                                  // id → { gruppe, schluessel, inhalt }
    const hits = [];
    function hitBox(id, x, z, w, h, d) {
      const hit = new T.Mesh(geo(w, h, d), hitMat); hit.position.set(x, h / 2, z); hit.userData.platz = id;
      scene.add(hit); hits.push(hit);
      return hit;
    }
    plaetze.forEach(p => {
      const g = new T.Group(); g.position.set(p.x, 0, p.z); scene.add(g);
      hitBox(p.id, p.x, p.z, PLATZ, 18, PLATZ);
      platzObj[p.id] = { gruppe: g, schluessel: null, inhalt: null };
    });
    const fest = { gruppe: new T.Group(), schluessel: null, inhalt: null };
    fest.gruppe.position.set(FW.x, 0, FW.z);
    scene.add(fest.gruppe);
    hitBox('fest', FW.x, FW.z, FW.breite, 16, FW.tiefe);
    const dekoObj = {};                                                                   // Deko-Platz → { gruppe, schluessel, inhalt, hit }
    FL.dekoplaetze.forEach(d => {
      const g = new T.Group(); g.position.set(d.x, 0, d.z); scene.add(g);
      const hit = hitBox('d:' + d.id, d.x, d.z, 6, 7, 6);
      dekoObj[d.id] = { gruppe: g, schluessel: null, inhalt: null, hit, def: d };
    });
    function rahmenBauen(gr) {
      const r = new T.Group(), gelb = lam('#ffd84a', { emissive: new T.Color('#8a6a00') });
      [[0, gr / 2, gr + 1, .7], [0, -gr / 2, gr + 1, .7], [gr / 2, 0, .7, gr + 1], [-gr / 2, 0, .7, gr + 1]]
        .forEach(([x, z, w, d]) => b(r, w, .5, d, x, .05, z, gelb));
      r.visible = false; scene.add(r);
      return r;
    }
    const rahmen = rahmenBauen(PLATZ), rahmenKlein = rahmenBauen(5.5), rahmenFest = rahmenBauen(Math.max(FW.breite, FW.tiefe) - 1);
    let setzModus = false;

    // ── Stimmung (Event) ───────────────────────────────────
    const fensterMat = lam(F.fenster);
    fensterMat.userData.eigen = true;                                                     // bleibt getrennt (leuchtet im Event)
    let stimmungKey = null, ev = null, partikel = null, wimpel = null;
    function stimmungAnwenden() {
      const a = DORF.aktivesEvent();
      const st = a && a.def && a.def.stimmung ? a.def.stimmung : null;
      const key = a ? a.id + (st ? '' : ':wimpel') : '';
      ev = a;
      if (key === stimmungKey) return false;
      stimmungKey = key;
      const farbe = (v, std) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : std;
      farben = st && Array.isArray(st.boden) && st.boden.length >= 2 ? { boden: st.boden.map(c => farbe(c, '#6cc56f')), wiese: farbe(st.wiese, SOMMER.wiese) } : SOMMER;
      scene.background = himmel(st && Array.isArray(st.himmel) && st.himmel.length === 3 ? st.himmel.map(c => farbe(c, '#a9d8ff')) : undefined);
      const hm = st && Array.isArray(st.hemi) ? st.hemi : ['#f2f6ff', '#4d6b45', .62];
      hemi.color.set(farbe(hm[0], '#f2f6ff')); hemi.groundColor.set(farbe(hm[1], '#4d6b45')); hemi.intensity = Number(hm[2]) || .62;
      const so = st && Array.isArray(st.sonne) ? st.sonne : ['#fff1d6', .62];
      sonne.color.set(farbe(so[0], '#fff1d6')); sonne.intensity = Number(so[1]) || .62;
      const fl = st && st.fenster ? farbe(st.fenster, null) : null;                        // warm leuchtende Fenster
      fensterMat.color.set(fl || F.fenster); fensterMat.emissive.set(fl ? new T.Color(fl).multiplyScalar(.7) : '#000000');
      wieseMat.color.set(farben.wiese);
      festwieseMalen();
      baeumeZeichnen(st ? st.baeume || '' : '');
      partikelSetzen(st && !reduce ? st.partikel : null);
      wimpelSetzen(a && !a.def ? a.pass : null);
      Object.values(platzObj).forEach(o => { o.schluessel = '#'; });                       // Gebäude mit neuem Schmuck
      fest.schluessel = null;
      return true;
    }
    // Wimpel rund um den Dorfplatz (Pass-Event ohne Dorf-Inhalte)
    function wimpelSetzen(pe) {
      if (wimpel) { scene.remove(wimpel); entsorgen(wimpel); wimpel = null; }
      if (!pe) return;
      const f1 = /^#[0-9a-f]{6}$/i.test(pe.farbe || '') ? pe.farbe : '#f59e0b', f2 = /^#[0-9a-f]{6}$/i.test(pe.farbe2 || '') ? pe.farbe2 : '#6366f1';
      const g = new T.Group(), ecken = [[-14, -14], [14, -14], [14, 14], [-14, 14]];
      ecken.forEach(([x, z]) => { b(g, .5, 7, .5, x, 0, z, F.holz2); b(g, .9, .9, .9, x, 7, z, f1); });
      ecken.forEach(([x, z], i) => {
        const [x2, z2] = ecken[(i + 1) % 4];
        for (let k = 1; k < 10; k++) {
          const t = k / 10, y = 6.6 - Math.sin(t * Math.PI) * 1.2;
          b(g, (x2 - x) ? .8 : .15, 1, (z2 - z) ? .8 : .15, x + (x2 - x) * t, y - 1, z + (z2 - z) * t, k % 2 ? f1 : f2);
        }
      });
      wimpel = backe(g); scene.add(wimpel);
    }
    // Partikel: Schnee, Blätter, Blüten (eine Punktwolke, bewegt im Takt)
    function partikelSetzen(p) {
      if (partikel) { scene.remove(partikel.obj); partikel.obj.geometry.dispose(); partikel.obj.material.dispose(); dauer.delete(partikel.fn); partikel = null; }
      if (!p || !p.art) return;
      const n = Math.max(10, Math.min(300, Math.round(Number(p.anzahl) || 100))), tempo = Math.max(.05, Math.min(3, Number(p.tempo) || .5));
      const cols = (Array.isArray(p.farben) && p.farben.length ? p.farben : ['#ffffff']).map(c => new T.Color(c));
      const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), r = seeded(99);
      const X0 = minX - 30, XW = FW.x + FW.breite - X0 + 10, Z0 = minZ - 30, ZW = maxZ + 50 - Z0, H = 70;
      for (let i = 0; i < n; i++) {
        pos[i * 3] = X0 + r() * XW; pos[i * 3 + 1] = r() * H; pos[i * 3 + 2] = Z0 + r() * ZW;
        const c = cols[i % cols.length]; col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      }
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.BufferAttribute(pos, 3));
      g.setAttribute('color', new T.BufferAttribute(col, 3));
      const m = new T.PointsMaterial({ size: (p.art === 'schnee' ? 3 : 4) * Math.min(window.devicePixelRatio || 1, 2), sizeAttenuation: false, vertexColors: true });
      const obj = new T.Points(g, m);
      const fall = (p.art === 'schnee' ? 9 : 5) * tempo, wind = p.art === 'schnee' ? 1.2 : 3;
      const fn = (dt, t) => {
        for (let i = 0; i < n; i++) {
          let y = pos[i * 3 + 1] - fall * dt * (.7 + (i % 5) * .12);
          pos[i * 3] += Math.sin(t / 900 + i) * wind * dt;
          if (y < 0) { y += H; pos[i * 3] = X0 + r() * XW; pos[i * 3 + 2] = Z0 + r() * ZW; }
          pos[i * 3 + 1] = y;
        }
        g.attributes.position.needsUpdate = true;
      };
      scene.add(obj);
      partikel = { obj, fn };
      dauer.add(fn);
    }

    // ── Festwiese: Event-Gebäude, Gast, Begleiter ──────────
    let begleiter = null, begleiterId = null;
    function festZeichnen() {
      const info = ev && ev.def ? DORF.festInfo(ev.id) : null;
      const gast = ev && ev.def && ev.def.gast ? ev.def.gast : null;
      const key = !ev || !ev.def ? 'leer' : [ev.id, info ? info.stufe : 0, info && info.imBau ? 'bau' : '', gast ? gast.id : ''].join('|');
      if (fest.schluessel === key) return false;
      const neu = fest.schluessel !== null;
      fest.schluessel = key;
      if (fest.inhalt) { fest.gruppe.remove(fest.inhalt); entsorgen(fest.inhalt); }
      const roh = new T.Group(), gx = FW.gebaeude[0] - FW.x, gz = FW.gebaeude[1] - FW.z;   // relativ zur Festwiese
      if (!ev || !ev.def) {                                                                // Kein Event: Festkiste auf der Wiese
        b(roh, 3.4, 2, 2.4, gx, 0, gz, F.holz); b(roh, 3.6, .8, 2.6, gx, 2, gz, F.holz2);
        b(roh, 3.7, .35, .35, gx, 1, gz + 1.2, F.gold); b(roh, .7, .8, .3, gx, 1.6, gz + 1.3, F.gold);
      } else if (info) {
        const stufen = Array.isArray(info.gebaeude.stufen) ? info.gebaeude.stufen : [];
        for (let i = 0; i < Math.min(info.stufe, stufen.length); i++) klotz(roh, stufen[i], gx, 0, gz);
        if (info.stufe === 0) bauplatzLeer(roh, gx, gz);
        if (info.imBau) { const g = new T.Group(); g.position.set(gx, 0, gz); geruest(g, 14, info.stufe > 0 ? 9 : 5, 11); roh.add(g); }
      }
      if (gast) figurBewohner(roh, gast, FW.gast[0] - FW.x, FW.gast[1] - FW.z, Math.PI / 4, 1);
      fest.inhalt = backe(roh);
      fest.gruppe.add(fest.inhalt);
      if (neu && !reduce) pop(fest.inhalt);
      begleiterSetzen(ev && ev.def ? ev.def.begleiter : null);
      return true;
    }
    // Pass-Begleiter (z. B. Gespenst) hüpft auf der Festwiese, wenn das Kind ihn hat
    function begleiterSetzen(id) {
      const hat = id && window.LernPass && typeof window.LernPass.owns === 'function' && window.LernPass.owns(id);
      const soll = hat ? id : null;
      if (soll === begleiterId) return;
      begleiterId = soll;
      if (begleiter) { scene.remove(begleiter.gruppe); dauer.delete(begleiter.fn); begleiter = null; }
      if (!soll || !window.LernAvatar || typeof window.LernAvatar.teil !== 'function') return;
      window.LernAvatar.teil(soll).then(t => {
        if (!t || !t.root || begleiterId !== soll || !lebt) return;
        const g = new T.Group(); g.add(t.root); t.root.scale.setScalar(4);
        g.position.set(FW.begleiter[0], 0, FW.begleiter[1]); g.rotation.y = Math.PI / 4;
        scene.add(g);
        const fn = (dt, tt) => { g.position.y = Math.abs(Math.sin(tt / 380)) * .9; g.rotation.y = Math.PI / 4 + Math.sin(tt / 1400) * .5; };
        begleiter = { gruppe: g, fn };
        dauer.add(fn);
        zeichne();
      }).catch(() => {});
    }

    // ── Deko-Plätze ────────────────────────────────────────
    function dekoMarker(p, leuchtet) {                                                    // kleiner Steinkreis
      const f = leuchtet ? lam('#ffd84a', { emissive: new T.Color('#b08a00') }) : '#9ca3af';
      [[-1.3, 0], [1.3, 0], [0, -1.3], [0, 1.3], [-.9, -.9], [.9, .9], [-.9, .9], [.9, -.9]].forEach(([x, z]) => b(p, .6, leuchtet ? .5 : .3, .6, x, 0, z, f));
    }
    function dekoZeichnen() {
      const plaetzeD = DORF.dekoPlaetze(), kiste = DORF.festkiste();
      const zeigeFreie = setzModus;                                                        // freie Plätze nur beim Aufstellen
      let geaendert = false;
      plaetzeD.forEach(p => {
        const o = dekoObj[p.id];
        if (!o) return;
        const key = p.belegt ? 'd|' + p.belegt : zeigeFreie ? (setzModus ? 'frei-an' : 'frei') : 'leer';
        o.hit.visible = true;
        o.aktiv = key !== 'leer';
        if (o.schluessel === key) return;
        const neu = o.schluessel !== null && !!p.belegt;
        o.schluessel = key;
        if (o.inhalt) { o.gruppe.remove(o.inhalt); entsorgen(o.inhalt); o.inhalt = null; }
        const roh = new T.Group();
        if (p.belegt) { const d = DORF.dekoDef(p.belegt); if (d) klotz(roh, d.modell); }
        else if (key !== 'leer') dekoMarker(roh, setzModus);
        if (roh.children.length) { o.inhalt = backe(roh); o.gruppe.add(o.inhalt); if (neu && !reduce) pop(o.inhalt); }
        geaendert = true;
      });
      return geaendert;
    }

    // ── Suche: das Versteckte wippt, bis es angetippt wird ──
    let suchObj = null, suchKey = null;
    const suchHit = hitBox('suche', 0, 0, 5, 6, 5);
    suchHit.visible = false;
    function sucheZeichnen() {
      const s = ev && ev.def ? DORF.sucheInfo() : null;
      const key = s && s.versteck ? s.nr + '|' + ev.id : '';
      if (key === suchKey) return false;
      suchKey = key;
      if (suchObj) { scene.remove(suchObj.gruppe); entsorgen(suchObj.gruppe); dauer.delete(suchObj.fn); suchObj = null; }
      suchHit.visible = !!key;
      if (!key) return true;
      const g = new T.Group(), roh = new T.Group();
      klotz(roh, s.mechanik.modell);
      g.add(backe(roh)); g.position.set(s.versteck.x, 0, s.versteck.z); g.rotation.y = Math.PI / 4;
      suchHit.position.set(s.versteck.x, 3, s.versteck.z);
      scene.add(g);
      const fn = (dt, t) => { g.position.y = .4 + Math.sin(t / 420) * .5; g.rotation.y = Math.PI / 4 + Math.sin(t / 700) * .35; };
      suchObj = { gruppe: g, fn };
      dauer.add(fn);
      return true;
    }

    function update() {
      const zustand = {};
      let geaendert = stimmungAnwenden();
      const art = ev && ev.def && ev.def.stimmung ? ev.def.stimmung.schmuck || '' : '';
      plaetze.forEach(p => {
        const info = DORF.platzInfo(p.id);
        if (!info) return;
        zustand[p.id] = { gesperrt: info.gesperrt, bebaut: !!info.eintrag };
        const key = info.gesperrt ? 'zu' : !info.eintrag ? 'frei' : [info.gebaeude.id, info.stufe, info.imBau ? 'bau' : '', art].join('|');
        const o = platzObj[p.id];
        if (o.schluessel === key) return;
        const neu = o.schluessel !== null && o.schluessel !== '#';
        o.schluessel = key;
        if (o.inhalt) { o.gruppe.remove(o.inhalt); entsorgen(o.inhalt); }
        const roh = new T.Group();
        if (info.gesperrt) bauplatzGesperrt(roh);
        else if (!info.eintrag) bauplatzLeer(roh);
        else {
          if (info.stufe > 0) { roh.add(modell(info.gebaeude.id, info.stufe)); if (!info.imBau) schmuck(roh, art, info.gebaeude.id, info.stufe); }
          else b(roh, 11, .8, 9, 0, 0, 0, F.stein);                                     // Fundament
          if (info.imBau) geruest(roh, info.gebaeude.id === 'rathaus' ? 17 : 12, info.stufe > 0 ? 10 : 6, info.gebaeude.id === 'rathaus' ? 12 : 10);
        }
        o.inhalt = backe(roh);
        o.gruppe.add(o.inhalt);
        if (neu && !reduce) pop(o.inhalt);
        geaendert = true;
      });
      bodenMalen(zustand);
      if (landZeichnen()) geaendert = true;
      if (festZeichnen()) geaendert = true;
      if (dekoZeichnen()) geaendert = true;
      if (sucheZeichnen()) geaendert = true;
      leuteZeichnen();
      zeichne();
      return geaendert;
    }

    // ── Wege: Gassen zwischen den Bauplätzen (FLAECHEN.wege.gitter) ──
    //  Jede Gasse ist eine Linie x = g oder z = g. Ein Ort hat einen Punkt auf einer Gasse
    //  (gasse) und optional ein Stück Weg danach (rest). Gelaufen wird nur auf Gassen, darum
    //  nie durch Häuser: Gassen liegen immer zwischen zwei Reihen von Bauplätzen.
    const GASSEN = FL.wege.gitter, TEMPO = FL.wege.tempo;
    const auf = (v, l) => l.some(g => Math.abs(g - v) < .01);
    function zuGasse(v, ziel) { return GASSEN.reduce((b, g) => (Math.abs(g - v) + Math.abs(g - ziel) < Math.abs(b - v) + Math.abs(b - ziel) ? g : b), GASSEN[0]); }
    function gitterWeg(p, q) {
      if ((auf(p.z, GASSEN) && Math.abs(p.z - q.z) < .01) || (auf(p.x, GASSEN) && Math.abs(p.x - q.x) < .01)) return [q];
      const np = auf(p.z, GASSEN) ? { x: zuGasse(p.x, q.x), z: p.z } : { x: p.x, z: zuGasse(p.z, q.z) };
      const nq = auf(q.z, GASSEN) ? { x: zuGasse(q.x, p.x), z: q.z } : { x: q.x, z: zuGasse(q.z, p.z) };
      const l = [np, { x: nq.x, z: np.z }, nq, q], out = [];
      l.forEach(k => { const v = out.length ? out[out.length - 1] : p; if (Math.abs(v.x - k.x) > .01 || Math.abs(v.z - k.z) > .01) out.push(k); });
      return out;
    }
    function route(a, b) { return [...(a.rest || []).slice().reverse().slice(1), a.gasse, ...gitterWeg(a.gasse, b.gasse), ...(b.rest || [])]; }
    const zufallR = Math.random;
    function vorHaus(p, dx = 0) { return { gasse: { x: p.x + dx, z: p.z + 10 }, blick: Math.PI / 4 }; }  // Eingang vorne (+z)
    function dorfplatzOrt() {
      const sx = zufallR() < .5 ? -1 : 1, sz = zufallR() < .5 ? -1 : 1;
      const x = sx * (1 + zufallR() * 3), z = sz * (1 + zufallR() * 3);
      return { gasse: { x: sx * 10, z: sz * 10 }, rest: [{ x: sx * 10, z: sz * 10 }, { x, z }], blick: Math.atan2(-x, -z) };
    }
    function besuchOrt(pfad) {
      const pt = pfad.map(([x, z]) => ({ x: Number(x) || 0, z: Number(z) || 0 }));
      return { gasse: pt[0], rest: pt, blick: Math.PI / 4 };
    }
    // Ziel eines Bewohners → Ort (null, wenn es das Ziel gerade nicht gibt)
    function zielOrt(ziel, heim) {
      if (ziel === 'dorfplatz') return dorfplatzOrt();
      if (ziel === 'haeuser' || ziel === 'post') {
        const l = plaetze.filter(p => { const i = DORF.platzInfo(p.id); return i && i.stufe > 0 && !(heim && heim.platz === p.id); });
        return l.length ? vorHaus(l[Math.floor(zufallR() * l.length)], (zufallR() - .5) * 6) : null;
      }
      if (ziel === 'festwiese') return ev && ev.def ? besuchOrt([[50, 10], [50, 0], [60, 0], [FW.gast[0] + 2, FW.gast[1] + 3]]) : null;
      const bau = plaetze.find(p => { const i = DORF.platzInfo(p.id); return i && i.stufe > 0 && i.gebaeude.id === ziel; });
      if (bau) return vorHaus(bau, (zufallR() - .5) * 5);
      const land = landAktiv.find(l => l.id === ziel && Array.isArray(l.besuch) && l.besuch.length);
      return land ? besuchOrt(land.besuch) : null;
    }

    // ── Läufer: Bewohner, Katze, Bürgermeister·in (bewegt im Takt) ──
    const laeufer = new Set();
    function laufen(w, dt, t) {
      if (w.pause && w.pause()) return;
      if (w.warte > 0) { w.warte -= dt; w.pose(0, t); if (w.warte <= 0 && !w.pfad.length) w.naechstes(); return; }
      const z = w.pfad[0];
      if (!z) { w.warte = w.pauseMin + zufallR() * w.pauseMax; w.g.rotation.y = w.blick; w.pose(0, t); return; }
      const dx = z.x - w.g.position.x, dz = z.z - w.g.position.z, d = Math.hypot(dx, dz), s = w.tempo * dt;
      if (d <= s) { w.g.position.x = z.x; w.g.position.z = z.z; w.pfad.shift(); }
      else { w.g.position.x += dx / d * s; w.g.position.z += dz / d * s; }
      if (d > .01) w.g.rotation.y = Math.atan2(dx, dz);
      w.schritt += s;
      w.pose(1, t);
    }
    function neuerLaeufer(g, o) {
      const w = Object.assign({ g, pfad: [], warte: 1 + zufallR() * 8, schritt: 0, tempo: TEMPO, pauseMin: 4, pauseMax: 8, blick: Math.PI / 4,
                                pose() {}, naechstes() {} }, o);
      laeufer.add(w);
      return w;
    }
    const laeuferFn = (dt, t) => laeufer.forEach(w => { try { laufen(w, dt, t); } catch (e) {} });

    // Bewohner-Figur mit beweglichen Beinen (Körper gebacken = 1 Draw-Call, Beine je 1)
    function figurLaeufer(def, nr) {
      const f = Array.isArray(def.farben) ? def.farben : ['#64748b', '#334155', '#422006'];
      const g = new T.Group(), roh = new T.Group(), beine = [];
      if (def.tier === 'katze') figurBewohner(roh, def, 0, 0, 0, nr);
      else {
        const hose = lam(f[1]);
        [-.35, .35].forEach(x => { const h = new T.Group(); h.position.set(x, 1.6, 0); b(h, .6, 1.6, .7, 0, -1.6, 0, hose); g.add(h); beine.push(h); });
        const tmp = new T.Group();
        figurBewohner(tmp, def, 0, 0, 0, nr);
        const koerper = tmp.children[0];
        koerper.children.slice(0, 2).forEach(m => koerper.remove(m));                  // Beine kommen oben dazu
        roh.add(koerper);
      }
      g.add(backe(roh));
      return { g, beine };
    }
    let buergerW = null, jubeltBis = 0;
    function buergerLaeufer() {
      if (buergerW) return;
      const punkte = [{ x: 2, z: 2 }, { x: -3, z: 1.5 }, { x: 1, z: -3 }, { x: -1.5, z: -1 }, { x: 3, z: -.5 }];
      buergerW = neuerLaeufer(buerger, {
        tempo: 2.4, pauseMin: 6, pauseMax: 10, warte: 6,
        pause() { return performance.now() < jubeltBis; },
        pose(lauf) { figur.pose({ lauf, phase: this.schritt * 1.3, jubel: 0, t: performance.now() / 1000 }); if (!lauf) buerger.rotation.y = Math.PI / 4; },
        naechstes() { const z = punkte[Math.floor(zufallR() * punkte.length)]; this.pfad = [z]; this.blick = Math.PI / 4; },
      });
    }
    let leuteKey = null;
    const leute = [];                                                                     // [{ id, gruppe, heim, platz, laeufer }]
    function leuteZeichnen() {
      const bw = DORF.state.bw || [];
      const key = JSON.stringify(bw);
      if (key === leuteKey) return;
      leuteKey = key;
      dauer.add(laeuferFn);
      buergerLaeufer();
      leute.splice(0).forEach(l => { scene.remove(l.gruppe); entsorgen(l.gruppe); laeufer.delete(l.laeufer); hits.splice(hits.indexOf(l.hit), 1); });
      const proPlatz = {};
      bw.forEach(([id, platz], nr) => {
        const def = DORF.bewohnerDef(id), p = plaetze.find(x => x.id === platz);
        if (!def || !p) return;
        const k = proPlatz[platz] = (proPlatz[platz] || 0) + 1;                       // 1.–4. Bewohner dieses Hauses
        const { g, beine } = figurLaeufer(def, nr);
        const heim = { x: p.x - 4.5 + (k - 1) * 3, z: p.z + 10, platz: p.id };
        g.position.set(heim.x, 0, heim.z);
        g.rotation.y = Math.PI / 4;
        const hit = new T.Mesh(geo(2.6, 5.2, 2.6), hitMat); hit.position.y = 2.6; hit.userData.platz = 'b:' + id;
        g.add(hit); hits.push(hit);
        scene.add(g);
        const katze = def.tier === 'katze';
        const ziele = Array.isArray(def.ziele) && def.ziele.length ? def.ziele : ['dorfplatz', 'haeuser'];
        const w = neuerLaeufer(g, {
          tempo: TEMPO * (katze ? 1.35 : .85 + (nr % 4) * .1), pauseMin: katze ? 6 : 4, pauseMax: katze ? 14 : 9, ort: { gasse: { x: heim.x, z: heim.z } },
          pose(lauf, t) {
            const ph = this.schritt * 1.6;
            beine.forEach((h, i) => { h.rotation.x = lauf ? Math.sin(ph + i * Math.PI) * .7 : 0; });
            g.position.y = lauf ? Math.abs(Math.sin(ph)) * (katze ? .25 : .15) : 0;
          },
          naechstes() {
            const daheim = Math.hypot(g.position.x - heim.x, g.position.z - heim.z) < 1;
            let ziel = !daheim && zufallR() < .4 ? { gasse: { x: heim.x, z: heim.z }, blick: Math.PI / 4 } : null;
            for (let i = 0; !ziel && i < 4; i++) ziel = zielOrt(ziele[Math.floor(zufallR() * ziele.length)], heim);
            if (!ziel) { this.warte = 5; return; }
            this.pfad = route(this.ort, ziel); this.ort = ziel; this.blick = ziel.blick !== undefined ? ziel.blick : Math.PI / 4;
          },
        });
        leute.push({ id, gruppe: g, heim, platz, laeufer: w, hit });
      });
    }

    // ── Landschaft im Umland (LANDSCHAFT in dorf-inhalte.json) ──
    let land = null, landKey = null, landAktiv = [], rotor = null;
    const landHits = [], tiere = [];
    function streifen(p, x1, z1, x2, z2, w, h, y, farbe) {
      const l = Math.hypot(x2 - x1, z2 - z1);
      if (l < .01) return;
      const m = new T.Mesh(geo(l + w * .6, h, w), typeof farbe === 'string' ? lam(farbe) : farbe);
      m.position.set((x1 + x2) / 2, y + h / 2, (z1 + z2) / 2); m.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
      p.add(m);
    }
    function bachPunkt(l, t) {                                                           // Punkt auf einer Linie, t 0–1
      const pt = l.punkte, seg = [];
      let ges = 0;
      for (let i = 1; i < pt.length; i++) { const d = Math.hypot(pt[i][0] - pt[i - 1][0], pt[i][1] - pt[i - 1][1]); seg.push(d); ges += d; }
      let r = t * ges;
      for (let i = 0; i < seg.length; i++) {
        if (r <= seg[i]) { const k = r / seg[i]; return { x: pt[i][0] + (pt[i + 1][0] - pt[i][0]) * k, z: pt[i][1] + (pt[i + 1][1] - pt[i][1]) * k, dreh: Math.atan2(pt[i + 1][0] - pt[i][0], pt[i + 1][1] - pt[i][1]) }; }
        r -= seg[i];
      }
      const e = pt[pt.length - 1]; return { x: e[0], z: e[1], dreh: 0 };
    }
    function tierModell(art) {
      const g = new T.Group(), roh = new T.Group();
      if (art === 'huhn') { b(roh, .9, .8, 1.1, 0, .3, 0, F.weiss); b(roh, .6, .6, .6, 0, 1, .5, F.weiss); b(roh, .3, .3, .3, 0, 1.6, .5, '#dc2626'); b(roh, .25, .2, .3, 0, 1.15, .9, '#f59e0b'); b(roh, .2, .3, .2, -.2, 0, 0, '#f59e0b'); b(roh, .2, .3, .2, .2, 0, 0, '#f59e0b'); }
      else if (art === 'schaf') { b(roh, 2, 1.4, 2.6, 0, .8, 0, '#f1f5f9'); b(roh, 1, 1, 1, 0, 1.6, 1.5, '#3f3f46'); [[-.6, .8], [.6, .8], [-.6, -.8], [.6, -.8]].forEach(([x, z]) => b(roh, .4, .8, .4, x, 0, z, '#3f3f46')); }
      else { b(roh, 1, .7, 1.5, 0, .1, 0, '#8b5a2b'); b(roh, .7, .7, .7, 0, .6, .7, '#166534'); b(roh, .3, .25, .4, 0, .75, 1.2, '#f59e0b'); }
      g.add(backe(roh));
      return g;
    }
    function landZeichnen() {
      landAktiv = DORF.landschaftAktiv();
      const art = ev && ev.def && ev.def.stimmung ? ev.def.stimmung.baeume || '' : '';
      const key = landAktiv.map(l => l.id).join(',') + '|' + art;
      if (key === landKey) return false;
      landKey = key;
      if (land) { scene.remove(land); entsorgen(land); }
      if (rotor) { scene.remove(rotor.g); entsorgen(rotor.g); dauer.delete(rotor.fn); rotor = null; }
      landHits.splice(0).forEach(h => { scene.remove(h); hits.splice(hits.indexOf(h), 1); });
      tiere.splice(0).forEach(t => { scene.remove(t.g); entsorgen(t.g); if (t.w) laeufer.delete(t.w); if (t.fn) dauer.delete(t.fn); });
      const schnee = art === 'schnee', roh = new T.Group();
      landAktiv.forEach(l => {
        const r = seeded(Number(l.seed) || l.id.length * 7 + 3);
        const X = Number(l.x) || 0, Z = Number(l.z) || 0, B = Number(l.b) || 10, D = Number(l.t) || 8;
        if (l.art === 'blumen') {
          const rb = seeded(77), inseln = [];                                            // Blumen in kleinen Inseln, dazwischen Büsche
          for (let i = 0; i < 40; i++) inseln.push([-110 + rb() * 220, -110 + rb() * 220, ['#f5d04a', '#f5f5f0', '#a78bfa', F.blume][i % 4]]);
          for (let i = 0; i < 200; i++) {
            const insel = inseln[i % inseln.length], busch = i % 9 === 0;
            const x = busch ? -110 + rb() * 220 : insel[0] + (rb() - .5) * 7, z = busch ? -110 + rb() * 220 : insel[1] + (rb() - .5) * 7;
            if (Math.max(Math.abs(x), Math.abs(z)) < 59 || Math.abs(x) + Math.abs(z) > 125) continue;
            if (Math.abs(x - FW.x) < FW.breite / 2 + 1 && Math.abs(z - FW.z) < FW.tiefe / 2 + 1) continue;
            if (landAktiv.some(o => o !== l && o.x !== undefined && Math.abs(x - o.x) < (o.b || 10) / 2 + 2 && Math.abs(z - o.z) < (o.t || 8) / 2 + 2)) continue;
            if (schnee) continue;
            if (busch) b(roh, 1.8, 1.2, 1.8, Math.round(x), 0, Math.round(z), rb() < .5 ? '#3f8f47' : '#4a9d4f');
            else b(roh, .6, .5, .6, Math.round(x), 0, Math.round(z), insel[2]);
          }
        } else if (l.art === 'bach' && Array.isArray(l.punkte)) {
          const w = Number(l.breite) || 4;
          for (let i = 1; i < l.punkte.length; i++) {
            const [a, c] = [l.punkte[i - 1], l.punkte[i]];
            streifen(roh, a[0], a[1], c[0], c[1], w + 1.6, .12, 0, schnee ? '#e2e8f0' : '#8fbf6a');
            streifen(roh, a[0], a[1], c[0], c[1], w, .16, 0, schnee ? '#cfe8f7' : F.wasser);
          }
        } else if (l.art === 'feld') {
          b(roh, B, .3, D, X, 0, Z, schnee ? '#eef2f6' : '#7d5836');
          if (!schnee) for (let zz = -D / 2 + 1; zz < D / 2 - .4; zz += 1.4) for (let xx = -B / 2 + .8; xx < B / 2 - .4; xx += 1.2) {
            const k = Math.round(xx * 3 + zz * 7);
            if (l.frucht === 'sonnenblume') { b(roh, .2, 1.8, .2, X + xx, .3, Z + zz, '#3f7d2c'); b(roh, .8, .8, .3, X + xx, 2.1, Z + zz + .1, '#facc15'); b(roh, .35, .35, .1, X + xx, 2.3, Z + zz + .3, '#78350f'); }
            else if (l.frucht === 'gemuese') { if (k % 2) b(roh, .9, .7, .9, X + xx, .3, Z + zz, '#f28c28'); else b(roh, .9, .6, .9, X + xx, .3, Z + zz, '#4d7c0f'); }
            else b(roh, .9, 1.1 + (k % 3) * .15, .5, X + xx, .3, Z + zz, art === 'herbst' ? '#c8a04a' : '#e3c45a');
          }
        } else if (l.art === 'baeume') {
          const pos = [];
          for (let i = 0; i < 80 && pos.length < (Number(l.n) || 5); i++) {
            const x = X - B / 2 + r() * B, z = Z - D / 2 + r() * D;
            if (pos.some(q => Math.hypot(q[0] - x, q[1] - z) < 5.2)) continue;
            pos.push([x, z]);
          }
          pos.forEach(([x, z]) => {
            const h = (l.klein ? 3 : 4) + Math.round(r() * 3);
            if (l.tanne) { b(roh, 1, 1.4, 1, Math.round(x), 0, Math.round(z), '#6b4226'); [5, 4, 3, 2].forEach((w, i) => { b(roh, w, 1.4, w, Math.round(x), 1.4 + i * 1.4, Math.round(z), schnee ? '#2c6236' : '#2e6b3a'); if (schnee) b(roh, w * .8, .3, w * .8, Math.round(x), 2.8 + i * 1.4, Math.round(z), '#f8fafc'); }); }
            else {
              baum(roh, Math.round(x), Math.round(z), h, r, art);
              if (l.obst && art !== 'schnee') [[-1.6, 1.4], [1.4, 1.2], [0, -1.8], [1.2, -.6]].forEach(([dx, dz]) => b(roh, .6, .6, .6, Math.round(x) + dx, h + .9, Math.round(z) + dz + .3, '#dc2626'));
            }
          });
        } else if (l.art === 'felsen') {
          const grau = ['#8d8d8d', '#a3a3a3', '#777777', '#9a948a'], H = Number(l.h) || 6;
          for (let i = 0; i < 9; i++) {
            const w = 2.4 + r() * 2.6, h = 2 + r() * H, x = X - B / 2 + (i + .5) * B / 9, z = Z - D / 4 + r() * D / 2;
            b(roh, w, h, 2.6 + r() * 2, x, 0, z, grau[i % 4]);
            if (schnee) b(roh, w + .1, .35, 2.4, x, h, z, '#f8fafc');
          }
        }
        if (l.art === 'weg' && Array.isArray(l.punkte)) for (let i = 1; i < l.punkte.length; i++) streifen(roh, l.punkte[i - 1][0], l.punkte[i - 1][1], l.punkte[i][0], l.punkte[i][1], Number(l.breite) || 3, .06, 0, schnee ? '#d9d2c3' : '#c9a877');
        if (l.weg && Array.isArray(l.weg.punkte)) for (let i = 1; i < l.weg.punkte.length; i++) streifen(roh, l.weg.punkte[i - 1][0], l.weg.punkte[i - 1][1], l.weg.punkte[i][0], l.weg.punkte[i][1], Number(l.weg.breite) || 3, .06, 0, schnee ? '#d9d2c3' : '#c9a877');
        if (Array.isArray(l.zaun)) {
          const [zb, zt] = l.zaun, x0 = X - zb / 2, x1 = X + zb / 2, z0 = Z - zt / 2, z1 = Z + zt / 2;
          for (let x = x0; x <= x1 + .01; x += 2) { b(roh, .3, 1.3, .3, x, 0, z0, F.holz2); b(roh, .3, 1.3, .3, x, 0, z1, F.holz2); }
          for (let z = z0 + 2; z < z1; z += 2) { b(roh, .3, 1.3, .3, x0, 0, z, F.holz2); b(roh, .3, 1.3, .3, x1, 0, z, F.holz2); }
          b(roh, zb, .2, .2, X, .9, z0, F.holz2); b(roh, zb, .2, .2, X, .9, z1, F.holz2); b(roh, .2, .2, zt, x0, .9, Z, F.holz2); b(roh, .2, .2, zt, x1, .9, Z, F.holz2);
        }
        (Array.isArray(l.modelle) ? l.modelle : []).forEach(m => {
          const g = new T.Group(); g.position.set(Number(m.x) || 0, 0, Number(m.z) || 0); g.rotation.y = (Number(m.dreh) || 0) * Math.PI / 180;
          klotz(g, m.modell); roh.add(g);
          if (m.drehteil && Array.isArray(m.drehteil.teile)) {                                // z. B. Windmühlenflügel
            const r0 = new T.Group(), hub = m.drehteil.punkt || [0, 0, 0];
            r0.position.set(Number(m.x) || 0, 0, Number(m.z) || 0); r0.rotation.y = g.rotation.y;
            const nabe = new T.Group(); nabe.position.set(hub[0], hub[1], hub[2]);
            const teile = new T.Group(); klotz(teile, m.drehteil.teile); nabe.add(backe(teile)); r0.add(nabe);
            scene.add(r0);
            const fn = (dt) => { nabe.rotation.z -= dt * .8; };
            rotor = { g: r0, fn }; dauer.add(fn);
          }
        });
        if (l.tippen && Array.isArray(l.modelle) && l.modelle[0]) {
          const h = hitBox(l.tippen, Number(l.modelle[0].x) || 0, Number(l.modelle[0].z) || 0, 9, 8, 9); landHits.push(h);
        }
        if (l.art === 'tiere') {
          const n = Math.max(1, Math.min(8, Number(l.n) || 3));
          for (let i = 0; i < n; i++) {
            const g = tierModell(l.tier);
            scene.add(g);
            if (l.bach) {
              const bach = landAktiv.find(o => o.id === l.bach);
              if (!bach) continue;
              let t = .3 + i * .12, dir = i % 2 ? 1 : -1;
              const setz = () => { const q = bachPunkt(bach, t); g.position.set(q.x, .1, q.z); g.rotation.y = q.dreh + (dir < 0 ? Math.PI : 0); };
              setz();
              const fn = (dt, tt) => { t += dir * dt * .004; if (t > .72 || t < .28) dir = -dir; setz(); g.position.y = .1 + Math.sin(tt / 500 + i) * .06; };
              dauer.add(fn);
              tiere.push({ g, fn });
              continue;
            }
            const R = Number(l.radius) || 4, cx0 = X, cz0 = Z;
            g.position.set(cx0 + (r() - .5) * R, 0, cz0 + (r() - .5) * R);
            const w = neuerLaeufer(g, {
              tempo: l.tier === 'schaf' ? .9 : 1.4, pauseMin: 2, pauseMax: 6,
              pose(lauf, t) { g.position.y = lauf ? Math.abs(Math.sin(t / 90)) * .15 : 0; },
              naechstes() { this.pfad = [{ x: cx0 + (zufallR() - .5) * 2 * R, z: cz0 + (zufallR() - .5) * 2 * R }]; this.blick = zufallR() * 6.3; },
            });
            tiere.push({ g, w });
          }
        }
      });
      land = backe(roh);
      scene.add(land);
      return true;
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

    // ── Zeichnen nur bei Bedarf, Dauer-Animationen im Takt ──
    //  animationen: kurze Effekte (Aufploppen, Jubel) – laufen, bis sie false liefern.
    //  dauer: fortlaufende Bewegung (Partikel, Versteck, Begleiter, ab Etappe 6 Bewohner) –
    //  höchstens 30 Bilder/s, nur sichtbar und bis 60 s nach dem letzten Antippen.
    let geplant = false, lebt = true, schmutzig = true, letzte = 0, imBild = true;
    const animationen = [], dauer = new Set();
    const WACH_MS = 60000;
    let wachBis = performance.now() + WACH_MS;
    function zeichne() {
      schmutzig = true;
      plane();
    }
    function plane() {
      if (geplant || !lebt) return;
      geplant = true;
      requestAnimationFrame(schleife);
    }
    function dauerAn(t) { return dauer.size > 0 && !reduce && imBild && !document.hidden && t < wachBis; }
    function schleife(t) {
      geplant = false;
      if (!lebt) return;
      const laeuft = dauerAn(t);
      if (!schmutzig && !animationen.length && laeuft && t - letzte < 31) { plane(); return; }
      const dt = Math.min(.1, Math.max(0, (t - (letzte || t)) / 1000));
      letzte = t;
      for (let i = animationen.length - 1; i >= 0; i--) if (animationen[i](t) === false) animationen.splice(i, 1);
      if (laeuft) dauer.forEach(fn => { try { fn(dt, t); } catch (e) {} });
      renderer.render(scene, camera);
      schmutzig = false;
      if (animationen.length || laeuft) plane();
    }
    function wach() { const war = performance.now() >= wachBis; wachBis = performance.now() + WACH_MS; if (war) { letzte = 0; plane(); } }
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
      jubeltBis = performance.now() + 1700;
      buerger.rotation.y = Math.PI / 4;
      animiere(t => { if (t0 === null) t0 = t; const k = (t - t0) / 1600;
        figur.pose({ lauf: 0, jubel: k < 1 ? 1 : 0, t: (t - t0) / 1000 });
        buerger.position.y = k < 1 ? Math.abs(Math.sin(k * Math.PI * 3)) * 1.2 : 0;
        return k < 1; });
    }
    const io = 'IntersectionObserver' in window ? new IntersectionObserver(e => { imBild = e[0].isIntersecting; if (imBild) plane(); }) : null;
    if (io) io.observe(cv);
    const onVis = () => { if (!document.hidden) { letzte = 0; plane(); } };
    document.addEventListener('visibilitychange', onVis);
    const onWach = () => wach();
    window.addEventListener('pointerdown', onWach, { passive: true });
    window.addEventListener('scroll', onWach, { passive: true });

    // ── Antippen ───────────────────────────────────────────
    const ray = new T.Raycaster(), maus = new T.Vector2();
    function treffer(e) {
      const r = cv.getBoundingClientRect();
      maus.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(maus, camera);
      const aktiv = hits.filter(h => h.visible && (typeof h.userData.platz !== 'string' || !h.userData.platz.startsWith('d:')
        || (dekoObj[h.userData.platz.slice(2)] || {}).aktiv));
      const l = ray.intersectObjects(aktiv, false);
      if (!l.length) return null;
      // Kleines vor Großem: Versteck und Deko schlagen den Bauplatz dahinter
      const klein = l.find(h => h.object.userData.platz === 'suche') || l.find(h => typeof h.object.userData.platz === 'string' && h.object.userData.platz.startsWith('d:'));
      return (klein || l[0]).object.userData.platz;
    }
    const onClick = e => { const id = treffer(e); if (id !== null && opt.onPlatz) opt.onPlatz(id); };
    const onMove = e => { if (e.pointerType === 'mouse') cv.style.cursor = treffer(e) !== null ? 'pointer' : 'default'; };
    cv.addEventListener('click', onClick);
    cv.addEventListener('pointermove', onMove);

    function auswahl(id) {
      rahmen.visible = rahmenKlein.visible = rahmenFest.visible = false;
      const p = plaetze.find(x => x.id === id);
      if (p) { rahmen.visible = true; rahmen.position.set(p.x, 0, p.z); }
      else if (id === 'fest') { rahmenFest.visible = true; rahmenFest.position.set(FW.x, 0, FW.z); }
      else if (typeof id === 'string' && id.startsWith('d:')) {
        const d = FL.dekoplaetze.find(x => x.id === id.slice(2));
        if (d) { rahmenKlein.visible = true; rahmenKlein.position.set(d.x, 0, d.z); }
      }
      zeichne();
    }

    const ro = new ResizeObserver(kameraEinpassen);
    ro.observe(host);
    update();
    kameraEinpassen();

    function foto() {
      const sichtbar = [rahmen.visible, rahmenKlein.visible, rahmenFest.visible];
      rahmen.visible = rahmenKlein.visible = rahmenFest.visible = false;                   // ohne Auswahlrahmen
      renderer.render(scene, camera);
      let url = null;
      try { url = cv.toDataURL('image/png'); } catch (e) {}
      [rahmen.visible, rahmenKlein.visible, rahmenFest.visible] = sichtbar;
      zeichne();
      return url;
    }

    return {
      update, auswahl, jubel, foto,
      setzModus(an) { setzModus = !!an; dekoZeichnen(); zeichne(); },
      /** Bildschirmposition (Pixel im Canvas) eines Punkts im Dorf – für Tests und Hinweise */
      bildpunkt(x, z, y = 0) { const v = new T.Vector3(x, y, z).project(camera); return { x: (v.x + 1) / 2 * cv.clientWidth, y: (1 - v.y) / 2 * cv.clientHeight, w: cv.clientWidth, h: cv.clientHeight }; },
      get leute() { return leute; },
      /** Zeichen-Statistik (Draw-Calls, Dreiecke) – für Leistungstests */
      get info() { return { calls: renderer.info.render.calls, dreiecke: renderer.info.render.triangles }; },
      destroy() {
        lebt = false; ro.disconnect(); if (io) io.disconnect(); dauer.clear();
        document.removeEventListener('visibilitychange', onVis);
        window.removeEventListener('pointerdown', onWach); window.removeEventListener('scroll', onWach);
        cv.removeEventListener('click', onClick); cv.removeEventListener('pointermove', onMove); renderer.dispose(); cv.remove();
      },
    };
  }

  window.LernDorfSzene = { mount, webglOk };
})();
