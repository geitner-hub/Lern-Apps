// ═══════════════════════════════════════════════════════
//  Lernwelt – chest3d.js   (3D-Truhe mit Öffnen-Animation)
//
//  Baut die Truhe aus Blöcken (passend zum Avatar) und spielt
//  die Öffnen-Animation ab. three.js kommt über avatar3d.js
//  (LernAvatar.ready). Ohne WebGL gibt es eine gezeichnete
//  SVG-Truhe mit einfacher Animation.
//
//  API (window.LernChest):
//    mount(host, { variante, leer, onTap }) → ctrl
//      variante: 'normal' | 'level' | 'halloween' | 'weihnachten' | 'ostern'
//      leer:     true = keine Truhe bereit (gedämpft, bleibt zu)
//      onTap():  wird bei jedem Antippen der Truhe aufgerufen (nicht beim Drehen)
//    ctrl.knock(n)      Klopfen 1–3: Truhe ruckelt, eigenes Glühen wird stärker
//                       (neutral – verrät nichts über das Teil)
//    ctrl.open({ farbe, stufe, itemId, bgCss, staub }) → Promise (Enthüllung fertig)
//      stufe 0–3 (gewöhnlich … legendär/Event) steuert die Stärke der Effekte
//    ctrl.skip()        springt direkt zur Enthüllung
//    ctrl.destroy()
// ═══════════════════════════════════════════════════════

(function () {
  'use strict';
  if (window.LernChest) return;

  const reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const NEUTRAL = '#ffe6a6';          // eigenes Glühen der Truhe vor dem Öffnen

  // ── Aussehen je Variante ───────────────────────────────
  const SKINS = {
    normal:      { holz: '#8b5a2b', holz2: '#6a421d', band: '#e6a817', ecke: '#b98612', schloss: '#f2c230', innen: '#241304' },
    level:       { holz: '#3a3690', holz2: '#2a2770', band: '#e6a817', ecke: '#b98612', schloss: '#fcd34d', innen: '#100e2c', stern: true },
    halloween:   { holz: '#2d1e3d', holz2: '#1f142b', band: '#fb923c', ecke: '#c2410c', schloss: '#a855f7', innen: '#12081c', bandLicht: .55 },
    weihnachten: { geschenk: true, papier: '#dc2626', papier2: '#f87171', band: '#facc15', ecke: '#eab308', innen: '#3b0a0a' },
    ostern:      { holz: '#a7f3d0', holz2: '#6ee7b7', band: '#f9a8d4', ecke: '#f472b6', schloss: '#fde68a', innen: '#134e3a',
                   punkte: ['#f9a8d4', '#fde68a', '#93c5fd', '#c4b5fd'] },
  };

  // Maße der Truhe (Einheiten wie beim Avatar)
  const W = 24, H = 11, D = 15, T = 1.2, Y0 = 1, TOP = Y0 + H, GAP = .3;
  const FRAME_IDLE = { cy: 9, hh: 16.5, hw: 22 };
  const FRAME_OPEN = { cy: 18, hh: 23, hw: 22 };

  function mix(a, b, t) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const ch = sh => Math.round(((pa >> sh) & 255) * (1 - t) + ((pb >> sh) & 255) * t);
    return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
  }
  function rng(seed) { seed = seed || 1; return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const easeOutCubic = x => 1 - Math.pow(1 - clamp(x), 3);
  const easeOutBack = x => { x = clamp(x); const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  const easeInOut = x => { x = clamp(x); return x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; };

  let T3 = null, R = null, readyP = null;
  function ready() {
    if (!readyP) {
      readyP = (window.LernAvatar ? LernAvatar.ready() : Promise.reject(new Error('avatar')))
        .then(() => {
          T3 = window.THREE;
          if (!R) {
            R = new T3.WebGLRenderer({ antialias: true, alpha: true });
            R.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
          }
          return true;
        });
      readyP.catch(() => {});
    }
    return readyP;
  }

  // ════════════════════════════════════════════════════
  //  3D-Bühne
  // ════════════════════════════════════════════════════
  function build3D(host, opts, ctrl) {
    const skin = SKINS[opts.variante] || SKINS.normal;
    const skinGeschenk = !!skin.geschenk;
    const leer = !!opts.leer;
    const trash = [];                              // Geometrien/Materialien/Texturen zum Aufräumen
    const keep = o => (trash.push(o), o);

    // ── Texturen ──
    function canvasTex(w, h, draw) {
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      draw(cv.getContext('2d'), w, h);
      const t = keep(new T3.CanvasTexture(cv));
      t.magFilter = T3.NearestFilter; t.minFilter = T3.NearestFilter; t.generateMipmaps = false;
      return t;
    }
    function holzTex(c1, c2, seed) {
      return canvasTex(32, 32, (x, w, h) => {
        const r = rng(seed);
        x.fillStyle = c1; x.fillRect(0, 0, w, h);
        for (let y = 0; y < h; y += 8) {
          x.fillStyle = c2; x.fillRect(0, y, w, 1);
          const off = Math.floor(r() * w); x.fillRect(off, y + 1, 1, 7);        // Stoß zwischen Brettern
        }
        for (let i = 0; i < 26; i++) { x.fillStyle = r() < .5 ? mix(c1, '#000000', .12) : mix(c1, '#ffffff', .08); x.fillRect(Math.floor(r() * w), Math.floor(r() * h), 2, 1); }
        x.fillStyle = mix(c2, '#000000', .25); x.fillRect(Math.floor(r() * 26) + 3, Math.floor(r() * 3) * 8 + 3, 2, 2);   // Astloch
      });
    }
    function papierTex(c1, c2) {
      return canvasTex(32, 32, (x, w, h) => {
        x.fillStyle = c1; x.fillRect(0, 0, w, h);
        x.fillStyle = c2;
        for (let y = 2; y < h; y += 8) for (let X = (y / 8) % 2 ? 6 : 2; X < w; X += 8) { x.fillRect(X, y, 2, 2); x.fillRect(X - 1, y + .5, 4, 1); }
      });
    }
    function glowTex() {
      return canvasTex(64, 64, (x) => {
        const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
        g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.25, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        x.fillStyle = g; x.fillRect(0, 0, 64, 64);
      });
    }
    function beamTex() {
      const t = canvasTex(8, 128, (x) => {
        const g = x.createLinearGradient(0, 128, 0, 0);
        g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(.35, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        x.fillStyle = g; x.fillRect(0, 0, 8, 128);
      });
      t.magFilter = T3.LinearFilter; t.minFilter = T3.LinearFilter;
      return t;
    }
    function dotTex() {
      const t = canvasTex(32, 32, (x) => {
        const g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
        g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.35, 'rgba(255,255,255,.8)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        x.fillStyle = g; x.fillRect(0, 0, 32, 32);
      });
      t.magFilter = T3.LinearFilter; t.minFilter = T3.LinearFilter;
      return t;
    }

    // ── Materialien ──
    const lam = c => keep(new T3.MeshLambertMaterial({ color: c }));
    const metal = (c, licht) => {
      const m = keep(new T3.MeshStandardMaterial({ color: c, metalness: .2, roughness: .38 }));
      m.emissive = new T3.Color(c); m.emissiveIntensity = licht || .12;
      if (leer) { m.color.set(mix(c, '#6b7280', .55)); m.emissiveIntensity = 0; }
      return m;
    };
    const aussenMap = skin.geschenk ? papierTex(skin.papier, skin.papier2) : holzTex(skin.holz, skin.holz2, 7);
    const aussen = keep(new T3.MeshLambertMaterial({ map: aussenMap }));
    const deckelMap = skin.geschenk ? aussenMap : canvasTex(32, 16, (x, w, h) => {
      const r = rng(3);
      x.fillStyle = skin.holz; x.fillRect(0, 0, w, h);
      x.fillStyle = skin.holz2; x.fillRect(0, h - 1, w, 1);
      for (let i = 0; i < 18; i++) { x.fillStyle = mix(skin.holz, '#000000', .1); x.fillRect(Math.floor(r() * w), Math.floor(r() * (h - 2)), 3, 1); }
    });
    const deckel = keep(new T3.MeshLambertMaterial({ map: deckelMap }));
    if (leer) { aussen.color.set('#8a8a9a'); deckel.color.set('#8a8a9a'); }
    const innen = lam(skin.innen);
    const bandM = metal(skin.band, skin.bandLicht);
    const eckM = metal(skin.ecke);
    const fussM = lam('#2a2233');

    // ── Szene ──
    const scene = new T3.Scene();
    scene.add(new T3.HemisphereLight(0xeef0ff, 0x40305a, leer ? .6 : .85));
    const dl = new T3.DirectionalLight(0xffffff, leer ? .45 : .7); dl.position.set(25, 45, 40); scene.add(dl);
    const rl = new T3.DirectionalLight(0x9aa5ff, .45); rl.position.set(-30, 20, -40); scene.add(rl);
    const innenLicht = new T3.PointLight(new T3.Color(NEUTRAL), 0, 60, 2); innenLicht.position.set(0, TOP + 2, 0); scene.add(innenLicht);
    const camera = new T3.PerspectiveCamera(30, 1, 1, 800);

    // Boden
    const podest = new T3.Mesh(keep(new T3.CylinderGeometry(19, 20.5, 2, 48)), lam(leer ? '#22223a' : '#262a55'));
    podest.position.y = -1; scene.add(podest);
    const ring = new T3.Mesh(keep(new T3.TorusGeometry(19.2, .35, 8, 72)), metal('#b98612', leer ? 0 : .35));
    ring.rotation.x = Math.PI / 2; ring.position.y = .02; scene.add(ring);
    const schatten = new T3.Mesh(keep(new T3.CircleGeometry(15, 32)), keep(new T3.MeshBasicMaterial({ map: glowTex(), color: 0x000000, transparent: true, opacity: .55, depthWrite: false })));
    schatten.rotation.x = -Math.PI / 2; schatten.position.y = .05; schatten.scale.set(1.2, .8, 1); scene.add(schatten);

    // ── Truhe ──
    const root = new T3.Group(); scene.add(root);
    const body = new T3.Group(); root.add(body);
    const geoC = {};
    const G = (w, h, d) => geoC[w + '|' + h + '|' + d] || (geoC[w + '|' + h + '|' + d] = keep(new T3.BoxGeometry(w, h, d)));
    const box = (p, w, h, d, x, y, z, m) => { const me = new T3.Mesh(G(w, h, d), m); me.position.set(x, y, z); p.add(me); return me; };
    // Materialreihenfolge: +x −x +y −y +z −z
    const wall = inside => [0, 1, 2, 3, 4, 5].map(i => (i === inside ? innen : aussen));

    // Wände (hohl, damit man beim Öffnen hineinsieht)
    box(body, W, T, D, 0, Y0 + T / 2, 0, wall(2));
    box(body, W, H, T, 0, Y0 + H / 2, D / 2 - T / 2, wall(5));
    box(body, W, H, T, 0, Y0 + H / 2, -D / 2 + T / 2, wall(4));
    box(body, T, H, D - 2 * T, -W / 2 + T / 2, Y0 + H / 2, 0, wall(0));
    box(body, T, H, D - 2 * T, W / 2 - T / 2, Y0 + H / 2, 0, wall(1));
    // Leuchtender Boden innen (wird beim Öffnen hell)
    const bodenGlowM = keep(new T3.MeshBasicMaterial({ color: skin.innen }));
    const bodenGlow = new T3.Mesh(keep(new T3.PlaneGeometry(W - 2 * T, D - 2 * T)), bodenGlowM);
    bodenGlow.rotation.x = -Math.PI / 2; bodenGlow.position.y = Y0 + T + .05; body.add(bodenGlow);

    // Füße
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(body, 2.8, 1, 2.8, sx * (W / 2 - 1.2), .5, sz * (D / 2 - 1.2), fussM);

    // Beschläge
    const rahmen = (p, y, h, w, d, m, cz = 0) => {
      box(p, w, h, .5, 0, y, cz + d / 2 + .02, m); box(p, w, h, .5, 0, y, cz - d / 2 - .02, m);
      box(p, .5, h, d, w / 2 + .02, y, cz, m); box(p, .5, h, d, -w / 2 - .02, y, cz, m);
    };
    rahmen(body, Y0 + .6, 1.1, W, D, bandM);
    rahmen(body, TOP - .5, 1, W, D, bandM);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(body, 1.6, H + .3, 1.6, sx * W / 2, Y0 + H / 2, sz * D / 2, eckM);
    const bandX = skin.geschenk ? [0] : [-7, 7];
    const bandB = skin.geschenk ? 3 : 1.7;
    for (const bx of bandX) { box(body, bandB, H, .45, bx, Y0 + H / 2, D / 2 + .15, bandM); box(body, bandB, H, .45, bx, Y0 + H / 2, -D / 2 - .15, bandM); }
    if (skin.geschenk) for (const s of [-1, 1]) box(body, .45, H, bandB, s * (W / 2 + .15), Y0 + H / 2, 0, bandM);
    if (skin.punkte) {
      const r = rng(11);
      for (let i = 0; i < 16; i++) {
        const c = skin.punkte[i % skin.punkte.length];
        const x = (r() - .5) * (W - 6), y = Y0 + 2 + r() * (H - 4);
        if (Math.abs(Math.abs(x) - 7) < 1.8) continue;
        box(body, 1.1, 1.1, .3, x, y, D / 2 + .1, lam(c));
      }
    }

    // Leuchtende Fuge zwischen Kiste und Deckel
    const fugeM = keep(new T3.MeshBasicMaterial({ color: '#2a1a08' }));
    box(root, W + .1, GAP + .05, D + .1, 0, TOP + GAP / 2, 0, fugeM);

    // Deckel (Drehpunkt an der hinteren Oberkante)
    const lid = new T3.Group(); lid.position.set(0, TOP + GAP, -D / 2); root.add(lid);
    if (skin.geschenk) {
      box(lid, W + 1, 3, D + 1, 0, 1.5, D / 2, aussen);
      box(lid, bandB, 3.1, D + 1.1, 0, 1.5, D / 2, bandM);
      box(lid, W + 1.1, 3.1, bandB, 0, 1.5, D / 2, bandM);
    } else {
      const slabs = [[W, 2.2, D, 1.1], [W, 1.8, D - 3.4, 3.1], [W, 1.4, D - 7.8, 4.7]];
      slabs.forEach(([w, h, d, y]) => {
        box(lid, w, h, d, 0, y, D / 2, deckel);
        for (const bx of bandX) box(lid, bandB, h + .3, d + .3, bx, y, D / 2, bandM);
      });
      rahmen(lid, .45, .9, W, D, bandM, D / 2);
      box(lid, 3, 2.6, .5, 0, -.9, D + .3, bandM);                           // Lasche über dem Schloss
      if (skin.stern) {
        const sM = metal('#fde68a', leer ? 0 : .5);
        const st = new T3.Group(); st.position.set(0, 3.3, D - 1.9); st.rotation.x = -.62; lid.add(st);
        box(st, 1.2, 4.2, .5, 0, 0, 0, sM); box(st, 4.2, 1.2, .5, 0, 0, 0, sM);
        const d1 = box(st, 1.2, 3.4, .45, 0, 0, 0, sM); d1.rotation.z = Math.PI / 4;
        const d2 = box(st, 1.2, 3.4, .45, 0, 0, 0, sM); d2.rotation.z = -Math.PI / 4;
      }
    }

    // Schloss bzw. Schleife (fliegt beim Öffnen weg)
    const lock = new T3.Group(); root.add(lock);
    const schluesselM = keep(new T3.MeshBasicMaterial({ color: '#1a1206' }));
    if (skin.geschenk) {
      lock.position.set(0, TOP + GAP + 3.4, 0);
      const bM = metal(skin.band);
      const l1 = box(lock, 4.4, 2.6, 1.6, -2.4, 1.2, 0, bM); l1.rotation.z = .5;
      const l2 = box(lock, 4.4, 2.6, 1.6, 2.4, 1.2, 0, bM); l2.rotation.z = -.5;
      box(lock, 2, 2, 2, 0, .8, 0, metal(skin.ecke));
    } else {
      lock.position.set(0, TOP - 2.6, D / 2 + .9);
      const sM = metal(skin.schloss);
      box(lock, 4.2, 3.8, 1.4, 0, 0, 0, sM);
      const bg = metal('#cbd5e1');
      box(lock, .8, 2.2, .8, -1.3, 2.6, 0, bg); box(lock, .8, 2.2, .8, 1.3, 2.6, 0, bg); box(lock, 3.4, .8, .8, 0, 3.7, 0, bg);
      box(lock, .8, 1.5, .2, 0, -.2, .75, schluesselM);
      box(lock, 1.3, .8, .2, 0, .5, .75, schluesselM);
    }

    // ── Licht-Effekte ──
    const gTex = glowTex();
    const halo = new T3.Sprite(keep(new T3.SpriteMaterial({ map: gTex, color: NEUTRAL, transparent: true, opacity: 0, depthWrite: false, blending: T3.AdditiveBlending })));
    halo.position.set(0, TOP, 0); halo.scale.set(46, 34, 1); root.add(halo);
    const flash = new T3.Sprite(keep(new T3.SpriteMaterial({ map: gTex, color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, blending: T3.AdditiveBlending })));
    flash.position.set(0, TOP + 4, 2); flash.scale.set(10, 10, 1); scene.add(flash);
    const beamG = new T3.Group(); beamG.position.set(0, TOP, 0); beamG.scale.set(1, .001, 1); beamG.visible = false; scene.add(beamG);
    const beamM = keep(new T3.MeshBasicMaterial({ map: beamTex(), color: NEUTRAL, transparent: true, opacity: .9, depthWrite: false, side: T3.DoubleSide, blending: T3.AdditiveBlending }));
    const beam = new T3.Mesh(keep(new T3.CylinderGeometry(8.5, 6.5, 60, 28, 1, true)), beamM); beam.position.y = 30; beamG.add(beam);
    const beam2 = new T3.Mesh(keep(new T3.CylinderGeometry(3.2, 2.4, 60, 20, 1, true)), beamM); beam2.position.y = 30; beamG.add(beam2);
    const itemHalo = new T3.Sprite(keep(new T3.SpriteMaterial({ map: gTex, color: NEUTRAL, transparent: true, opacity: 0, depthWrite: false, blending: T3.AdditiveBlending })));
    itemHalo.scale.set(26, 26, 1); scene.add(itemHalo);
    const welleM = keep(new T3.MeshBasicMaterial({ color: NEUTRAL, transparent: true, opacity: 0, depthWrite: false, side: T3.DoubleSide, blending: T3.AdditiveBlending }));
    const welle = new T3.Mesh(keep(new T3.RingGeometry(.86, 1, 64)), welleM);
    welle.rotation.x = -Math.PI / 2; welle.position.y = .3; welle.visible = false; scene.add(welle);

    // ── Partikel ──
    const MAXP = 320;
    const pPos = new Float32Array(MAXP * 3).fill(-999), pCol = new Float32Array(MAXP * 3);
    const pGeo = keep(new T3.BufferGeometry());
    pGeo.setAttribute('position', new T3.BufferAttribute(pPos, 3));
    pGeo.setAttribute('color', new T3.BufferAttribute(pCol, 3));
    const pMat = keep(new T3.PointsMaterial({ size: 1.5, map: dotTex(), vertexColors: true, transparent: true, depthWrite: false, blending: T3.AdditiveBlending, sizeAttenuation: true }));
    const points = new T3.Points(pGeo, pMat); points.frustumCulled = false; scene.add(points);
    const parts = [];
    const tmpC = new T3.Color();
    function emit(n, o) {
      const cols = [].concat(o.farbe || NEUTRAL);
      for (let i = 0; i < n && parts.length < MAXP; i++) {
        const a = Math.random() * Math.PI * 2, sp = (o.speed || 10) * (.4 + Math.random() * .8);
        const up = o.up !== undefined ? o.up : .6;
        tmpC.set(cols[i % cols.length]);
        parts.push({
          x: (o.x || 0) + (Math.random() - .5) * (o.sx || 0), y: o.y || TOP, z: (o.z || 0) + (Math.random() - .5) * (o.sz || 0),
          vx: Math.cos(a) * sp * (1 - up), vy: sp * up * (.6 + Math.random() * .8) + (o.vy || 0), vz: Math.sin(a) * sp * (1 - up),
          g: o.g !== undefined ? o.g : 14, t: 0, life: (o.life || 1.2) * (.6 + Math.random() * .7), r: tmpC.r, gg: tmpC.g, b: tmpC.b,
        });
      }
    }
    function stepParts(dt) {
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.t += dt;
        if (p.t >= p.life) { parts.splice(i, 1); continue; }
        p.vy -= p.g * dt; p.vx *= .985; p.vz *= .985;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      }
      for (let i = 0; i < MAXP; i++) {
        const p = parts[i];
        if (!p) { pPos[i * 3 + 1] = -999; continue; }
        const f = 1 - p.t / p.life;
        pPos[i * 3] = p.x; pPos[i * 3 + 1] = p.y; pPos[i * 3 + 2] = p.z;
        pCol[i * 3] = p.r * f; pCol[i * 3 + 1] = p.gg * f; pCol[i * 3 + 2] = p.b * f;
      }
      pGeo.attributes.position.needsUpdate = true; pGeo.attributes.color.needsUpdate = true;
    }

    // ── Teil über der Truhe ──
    const itemG = new T3.Group(); itemG.visible = false; scene.add(itemG);
    let itemAnim = [];
    function bildRahmen(css) {
      const cols = (String(css || '').match(/#[0-9a-fA-F]{6}\b/g) || ['#6366f1', '#1b1929']).slice(0, 4);
      const tex = canvasTex(48, 32, (x, w, h) => {
        const g = x.createLinearGradient(0, 0, 0, h);
        cols.forEach((c, i) => g.addColorStop(cols.length > 1 ? i / (cols.length - 1) : 0, c));
        x.fillStyle = g; x.fillRect(0, 0, w, h);
      });
      tex.magFilter = T3.LinearFilter;
      const g = new T3.Group();
      const bild = new T3.Mesh(keep(new T3.PlaneGeometry(1.4, .93)), keep(new T3.MeshBasicMaterial({ map: tex, side: T3.DoubleSide })));
      g.add(bild);
      const fm = metal('#e6a817');
      [[1.56, .09, 0, .51], [1.56, .09, 0, -.51], [.09, 1.1, .75, 0], [.09, 1.1, -.75, 0]].forEach(([w, h, x, y]) => box(g, w, h, .09, x, y, 0, fm));
      g.scale.setScalar(.66);
      return g;
    }
    function staubStern() {
      const g = new T3.Group();
      const m = keep(new T3.MeshStandardMaterial({ color: '#c7d2fe', emissive: new T3.Color('#a5b4fc'), emissiveIntensity: .8, metalness: .2, roughness: .3 }));
      const oct = new T3.Mesh(keep(new T3.OctahedronGeometry(.5, 0)), m); g.add(oct);
      for (let i = 0; i < 6; i++) { const c = new T3.Mesh(G(.12, .12, .12), m); const a = i / 6 * Math.PI * 2; c.position.set(Math.cos(a) * .8, Math.sin(a * 2) * .2, Math.sin(a) * .8); g.add(c); }
      return g;
    }
    function setItem(obj, anim) {
      itemG.clear();
      if (obj) itemG.add(obj);
      itemAnim = anim || [];
    }

    // ── Kamera & Größe ──
    let frameMix = 0;
    function fit() {
      const w = host.clientWidth, h = host.clientHeight;
      if (!w || !h) return;
      R.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    const tan = Math.tan(T3.MathUtils.degToRad(15));
    function placeCam(shake) {
      const f = k => FRAME_IDLE[k] + (FRAME_OPEN[k] - FRAME_IDLE[k]) * frameMix;
      const dist = Math.max(f('hh') / tan, (f('hw') / camera.aspect) / tan);
      const cy = f('cy');
      camera.position.set(shake ? (Math.random() - .5) * shake : 0, cy + 9 + (shake ? (Math.random() - .5) * shake : 0), dist);
      camera.lookAt(0, cy, 0);
    }

    // ── Steuerung (Drehen & Antippen) ──
    const cv = R.domElement;
    cv.style.cssText = 'width:100%;height:100%;display:block;touch-action:pan-y;cursor:pointer;outline:none';
    host.appendChild(cv);
    const ro = new ResizeObserver(fit); ro.observe(host); fit();

    const S = { t: 0, yaw: -.4, v: 0, drag: false, lastX: 0, downX: 0, downT: 0, idle: 10,
                glow: 0, glowT: 0, wob: 0, squash: 0, open: null, done: false };

    // ── Ablauf beim Öffnen ──
    const BURST = reduce ? 0 : .5, REVEAL = reduce ? .7 : 1.9;
    function open(o) {
      if (S.open) return S.open.promise;
      const farbe = o.farbe || '#ffffff';
      const hell = mix(farbe, '#ffffff', .25);
      const stufe = clamp(o.stufe | 0, 0, 3);
      let resolve; const promise = new Promise(r => (resolve = r));
      S.open = { t: 0, farbe, hell, stufe, resolve, promise, burst: false, item: false, fertig: false, lockV: null };
      // Teil vorbereiten (Modell wird schon gebaut, während die Truhe ruckelt)
      if (o.staub) setItem(staubStern());
      else if (o.bgCss !== undefined && !o.itemId) setItem(bildRahmen(o.bgCss));
      else if (o.itemId && window.LernAvatar && LernAvatar.teil) {
        LernAvatar.teil(o.itemId).then(res => { if (!S.dead && res) setItem(res.root, res.anim); else if (!S.dead) setItem(bildRahmen(o.bgCss)); }, () => {});
      }
      return promise;
    }
    function skip() {
      const O = S.open;
      if (!O || O.fertig) return;
      if (!O.burst) doBurst(O, true);
      O.t = REVEAL;
    }
    function doBurst(O, leise) {
      O.burst = true;
      const col = new T3.Color(O.hell);
      [halo.material, beamM, itemHalo.material, welleM].forEach(m => m.color.copy(col));
      innenLicht.color.copy(col);
      bodenGlowM.color.set(O.hell);
      fugeM.color.set(O.hell);
      beamG.visible = true;
      O.lockV = skinGeschenk ? { x: (Math.random() - .5) * 6, y: 16, z: 6, r: 6 } : { x: (Math.random() - .5) * 8, y: 10, z: 14, r: 9 };
      if (leise || reduce) { emit(20, { farbe: [O.hell, '#ffffff'], speed: 8, y: TOP + 1, sx: W - 6, sz: D - 6 }); return; }
      const n = [50, 90, 150, 220][O.stufe];
      emit(n, { farbe: [O.hell, O.farbe, '#ffffff'], speed: 16 + O.stufe * 4, up: .55, y: TOP + 1, sx: W - 6, sz: D - 6, life: 1.4 + O.stufe * .2 });
      if (O.stufe >= 2) { welle.visible = true; welle.scale.setScalar(1); welleM.opacity = .9; }
      flash.material.opacity = .7 + O.stufe * .1;
      flash.scale.setScalar(18 + O.stufe * 10);
      if (typeof opts.onBurst === 'function') { try { opts.onBurst(O.stufe); } catch (e) {} }
    }
    // ── Klopfen ──
    function knock(n) {
      if (S.open) return;
      S.wob = Math.min(1.6, S.wob + (leer ? .45 : 1));
      S.squash = 1;
      if (leer) return;
      S.glowT = [0, .35, .65, 1][clamp(n | 0, 0, 3)];
      if (!reduce) emit(6 + n * 6, { farbe: [NEUTRAL, '#ffffff'], speed: 5 + n * 2, up: .7, y: TOP + GAP, sx: W, sz: D, life: .8, g: 6 });
    }

    // ── Bild für Bild ──
    let raf = 0, last = performance.now(), funkT = 0;
    const baseYaw = -.4;
    function loop(now) {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      S.t += dt;
      const O = S.open;

      // Drehen
      if (!S.drag) {
        S.yaw += S.v; S.v *= .9; S.idle += dt;
        if (S.idle > 2.5 && !reduce) S.yaw += ((baseYaw + Math.sin(S.t * .5) * .18) - S.yaw) * Math.min(1, dt * 1.5);
      }
      root.rotation.y = S.yaw;

      // Glühen (neutral bis zum Öffnen)
      S.glow += (S.glowT - S.glow) * Math.min(1, dt * 7);
      let shake = 0, lift = 0, scl = 1;
      S.wob *= Math.exp(-dt * 4.5);
      S.squash *= Math.exp(-dt * 9);
      const wobZ = reduce ? 0 : S.wob * .09 * Math.sin(S.t * 34);
      const wobX = reduce ? 0 : S.wob * .04 * Math.sin(S.t * 27 + 1);

      if (!O) {
        const puls = leer ? 0 : .1 + .06 * Math.sin(S.t * 3);
        const g = clamp(puls + S.glow * .9);
        fugeM.color.set(mix('#2a1a08', NEUTRAL, g));
        schluesselM.color.set(mix('#1a1206', NEUTRAL, g));
        halo.material.opacity = leer ? 0 : .08 + S.glow * .55;
        innenLicht.intensity = S.glow * .9;
        if (!leer && !reduce) {
          funkT += dt * (1.2 + S.glow * 6);
          while (funkT > 1) { funkT -= 1; emit(1, { farbe: NEUTRAL, speed: 2, up: .9, y: TOP + GAP, sx: W, sz: D, life: 1.6, g: -2 }); }
        }
        lift = leer || reduce ? 0 : Math.sin(S.t * 1.8) * .45 + .45;
      } else {
        O.t += dt;
        const t = O.t;
        // 1) Aufladen
        if (!O.burst && t < BURST) {
          const k = t / BURST;
          fugeM.color.set(NEUTRAL); schluesselM.color.set(NEUTRAL);
          halo.material.opacity = .6 + k * .4;
          innenLicht.intensity = 1 + k;
          shake = 0;
          lift = k * 1.4;
          scl = 1 + k * .07;
          if (!reduce) { root.rotation.z = (Math.random() - .5) * .07 * k; root.rotation.x = (Math.random() - .5) * .04 * k; }
          if (!reduce && Math.random() < .5) emit(1, { farbe: NEUTRAL, speed: 6, up: .8, y: TOP + GAP, sx: W, sz: D, life: .6, g: 4 });
        }
        if (!O.burst && t >= BURST) doBurst(O);
        // 2) Aufsprengen
        if (O.burst) {
          const b = t - BURST;
          const lk = reduce ? easeInOut(b / .35) : easeOutBack(b / .42);
          lid.rotation.x = -1.95 * lk;
          if (O.lockV && lock.visible) {
            const lt = Math.max(0, b);
            lock.position.x += O.lockV.x * dt; lock.position.y += O.lockV.y * dt; lock.position.z += O.lockV.z * dt;
            O.lockV.y -= 38 * dt;
            lock.rotation.x += O.lockV.r * dt; lock.rotation.z += O.lockV.r * .4 * dt;
            if (lt > 1.1 || lock.position.y < -6) lock.visible = false;
          }
          lift = Math.max(0, 1.4 * (1 - b / .25));
          scl = 1 + .07 * Math.max(0, 1 - b / .2);
          root.rotation.z = 0; root.rotation.x = 0;
          const bs = easeOutCubic(b / .45);
          beamG.scale.set(.7 + .3 * bs, Math.max(.001, bs), .7 + .3 * bs);
          beamM.opacity = (.22 + .06 * O.stufe) * (0.85 + .15 * Math.sin(S.t * 6)) * (1 - .45 * frameMix);
          beamG.rotation.y += dt * .6;
          halo.material.opacity = .25 + .07 * O.stufe;
          innenLicht.intensity = 1.1 + O.stufe * .3;
          flash.material.opacity = Math.max(0, flash.material.opacity - dt * 2.2);
          if (welle.visible) { welle.scale.setScalar(1 + b * 40); welleM.opacity = Math.max(0, .9 - b * 1.3); if (welleM.opacity <= 0) welle.visible = false; }
          if (!reduce && O.stufe >= 2 && b < .45) shake = (O.stufe - 1) * .9 * (1 - b / .45);
          // weiter Funken in Seltenheitsfarbe
          if (!reduce) {
            funkT += dt * (4 + O.stufe * 5);
            while (funkT > 1) { funkT -= 1; emit(1, { farbe: [O.hell, '#ffffff'], speed: 3, up: .95, y: TOP + 1, sx: W - 8, sz: D - 8, life: 1.8, g: -3 }); }
          }
          // 3) Teil steigt auf
          const r0 = BURST + (reduce ? .05 : .12), dur = REVEAL - r0;
          const rk = clamp((t - r0) / dur);
          if (t >= r0) {
            itemG.visible = itemG.children.length > 0;
            const e = easeOutCubic(rk);
            const hover = O.fertig && !reduce ? Math.sin(S.t * 1.7) * .6 : 0;
            itemG.position.set(0, TOP + 1 + e * 14 + hover, 0);
            itemG.scale.setScalar(reduce ? 13 : 13 * (.15 + .85 * easeOutBack(rk)));
            if (reduce) itemG.rotation.y = .4;
            else itemG.rotation.y += dt * (O.fertig ? .9 : 1 + 9 * (1 - e));
            itemHalo.position.copy(itemG.position); itemHalo.position.z -= 3;
            itemHalo.material.opacity = e * (.18 + .06 * O.stufe) * (0.9 + .1 * Math.sin(S.t * 3));
            frameMix = easeInOut(rk);
            if (!reduce) itemAnim.forEach(f => f(S.t));
          }
          if (!O.fertig && t >= REVEAL) { O.fertig = true; O.resolve(); }
        }
      }

      root.position.y = lift;
      root.scale.set(scl * (1 + S.squash * .05), scl * (1 - S.squash * .07), scl * (1 + S.squash * .05));
      if (!O || !O.burst) { root.rotation.z = (O ? root.rotation.z : 0) + wobZ; root.rotation.x = (O ? root.rotation.x : 0) + wobX; }
      schatten.scale.set(1.2 - lift * .05, .8 - lift * .03, 1);

      stepParts(dt);
      placeCam(shake);
      R.render(scene, camera);
    }

    // Zeiger: kurzes Tippen = Klopfen, Wischen = Drehen
    const onDown = e => {
      S.drag = true; S.lastX = S.downX = e.clientX; S.downT = performance.now(); S.v = 0; S.moved = false;
      try { cv.setPointerCapture(e.pointerId); } catch (x) {}
    };
    const onMove = e => {
      if (!S.drag) return;
      const dx = e.clientX - S.lastX; S.lastX = e.clientX;
      if (Math.abs(e.clientX - S.downX) > 8) S.moved = true;
      if (S.moved) { S.yaw += dx * .012; S.v = dx * .006; S.idle = 0; }
    };
    const onUp = () => {
      if (!S.drag) return;
      S.drag = false; S.idle = 0;
      if (!S.moved && performance.now() - S.downT < 600 && typeof opts.onTap === 'function') opts.onTap();
    };
    cv.addEventListener('pointerdown', onDown);
    cv.addEventListener('pointermove', onMove);
    cv.addEventListener('pointerup', onUp);
    cv.addEventListener('pointercancel', () => { S.drag = false; });

    raf = requestAnimationFrame(loop);

    return {
      knock, open, skip,
      destroy() {
        S.dead = true;
        cancelAnimationFrame(raf);
        ro.disconnect();
        cv.removeEventListener('pointerdown', onDown);
        cv.removeEventListener('pointermove', onMove);
        cv.removeEventListener('pointerup', onUp);
        if (cv.parentNode) cv.parentNode.removeChild(cv);
        itemG.clear();                               // Teil-Materialien gehören avatar3d.js (Cache) → nicht freigeben
        trash.forEach(o => { try { o.dispose(); } catch (e) {} });
        if (S.open && !S.open.fertig) S.open.resolve();
      },
    };
  }

  // ════════════════════════════════════════════════════
  //  Ersatz ohne WebGL: gezeichnete Truhe
  // ════════════════════════════════════════════════════
  let cssDone = false;
  function fallbackCss() {
    if (cssDone) return; cssDone = true;
    const st = document.createElement('style');
    st.textContent = `
      .lc2d{position:absolute;inset:0;display:grid;place-items:center;cursor:pointer;--g:.1;--c:${NEUTRAL};}
      .lc2d svg{width:min(78%,300px);height:auto;overflow:visible;}
      .lc2d .lc-glow{opacity:calc(var(--g) * .9);transition:opacity .3s;}
      .lc2d .lc-fuge{fill:var(--c);opacity:calc(.25 + var(--g) * .75);}
      .lc2d .lc-box{transform-box:fill-box;transform-origin:50% 100%;}
      .lc2d.knock .lc-box{animation:lcKnock .45s ease-out;}
      @keyframes lcKnock{0%{transform:scale(1.04,.93)}25%{transform:rotate(-5deg)}50%{transform:rotate(4deg)}75%{transform:rotate(-2deg)}100%{transform:none}}
      .lc2d .lc-lid{transform-box:fill-box;transform-origin:10% 100%;transition:transform .45s cubic-bezier(.2,.9,.3,1.4);}
      .lc2d.open .lc-lid{transform:translate(-6px,-20px) rotate(-24deg);}
      .lc2d .lc-lock{transition:transform .5s ease-in,opacity .5s;}
      .lc2d.open .lc-lock{transform:translate(20px,80px) rotate(80deg);opacity:0;}
      .lc2d .lc-burst{transform-box:fill-box;transform-origin:50% 50%;transform:scale(0);opacity:0;fill:var(--c);}
      .lc2d.open .lc-burst{animation:lcBurst 1s ease-out forwards;}
      @keyframes lcBurst{0%{transform:scale(.2);opacity:.9}100%{transform:scale(1.6);opacity:0}}
      .lc2d.leer{filter:grayscale(.8) brightness(.7);}
      @media (prefers-reduced-motion: reduce){.lc2d .lc-box,.lc2d .lc-lid,.lc2d .lc-lock{animation:none!important;transition:none!important;}}`;
    document.head.appendChild(st);
  }
  function build2D(host, opts) {
    fallbackCss();
    const s = SKINS[opts.variante] || SKINS.normal;
    const holz = s.geschenk ? s.papier : s.holz, holz2 = s.geschenk ? mix(s.papier, '#000000', .2) : s.holz2;
    const el = document.createElement('div');
    el.className = 'lc2d' + (opts.leer ? ' leer' : '');
    el.innerHTML = `<svg viewBox="0 0 200 170" aria-hidden="true">
      <ellipse class="lc-glow" cx="100" cy="92" rx="95" ry="70" fill="var(--c)" opacity="0" style="filter:blur(14px)"/>
      <circle class="lc-burst" cx="100" cy="85" r="70"/>
      <ellipse cx="100" cy="158" rx="78" ry="9" fill="rgba(0,0,0,.35)"/>
      <g class="lc-box">
        <rect x="28" y="84" width="144" height="70" rx="4" fill="${holz}"/>
        <path d="M28 104h144M28 124h144M28 144h144" stroke="${holz2}" stroke-width="2"/>
        <rect x="28" y="84" width="144" height="7" fill="${s.band}"/><rect x="28" y="146" width="144" height="8" fill="${s.band}"/>
        ${s.geschenk ? `<rect x="92" y="84" width="16" height="70" fill="${s.band}"/>` : `<rect x="62" y="84" width="10" height="70" fill="${s.band}"/><rect x="128" y="84" width="10" height="70" fill="${s.band}"/>`}
        <rect class="lc-fuge" x="28" y="80" width="144" height="4"/>
        <g class="lc-lid">
          ${s.geschenk ? `<rect x="22" y="58" width="156" height="22" rx="3" fill="${holz}"/><rect x="92" y="58" width="16" height="22" fill="${s.band}"/>`
                       : `<path d="M28 80 V64 Q28 42 100 42 Q172 42 172 64 V80Z" fill="${holz}"/><path d="M28 70h144" stroke="${holz2}" stroke-width="2"/>
                          <path d="M62 80V47M72 80V45M128 80V45M138 80V47" stroke="${s.band}" stroke-width="5"/>`}
        </g>
        <g class="lc-lock">${s.geschenk ? `<path d="M100 58 L78 44 L80 62Z M100 58 L122 44 L120 62Z" fill="${s.band}"/><circle cx="100" cy="58" r="6" fill="${s.ecke}"/>`
          : `<rect x="88" y="82" width="24" height="22" rx="3" fill="${s.schloss}"/><rect class="lc-fuge" x="98" y="89" width="4" height="9" rx="2"/>`}</g>
      </g></svg>`;
    host.appendChild(el);
    el.addEventListener('click', () => { if (typeof opts.onTap === 'function') opts.onTap(); });
    let done = null;
    return {
      knock(n) {
        el.classList.remove('knock'); void el.offsetWidth; el.classList.add('knock');
        if (!opts.leer) el.style.setProperty('--g', [0.1, .4, .7, 1][clamp(n | 0, 0, 3)]);
      },
      open(o) {
        if (done) return done;
        el.style.setProperty('--c', mix(o.farbe || '#ffffff', '#ffffff', .25));
        el.classList.add('open');
        return (done = new Promise(r => setTimeout(r, reduce ? 100 : 850)));
      },
      skip() {},
      destroy() { if (el.parentNode) el.parentNode.removeChild(el); },
    };
  }

  // ════════════════════════════════════════════════════
  function mount(host, opts = {}) {
    let impl = null, dead = false, pendOpen = null;
    const ctrl = {
      knock(n) { if (impl) impl.knock(n); },
      open(o) {
        if (impl) return impl.open(o);
        return (pendOpen = pendOpen || new Promise(r => { ctrl._pend = { o, r }; }));
      },
      skip() { if (impl) impl.skip(); },
      destroy() { dead = true; if (impl) impl.destroy(); impl = null; if (ctrl._pend) ctrl._pend.r(); },
    };
    const take = i => {
      if (dead) { i.destroy(); return; }
      impl = i;
      if (ctrl._pend) { const p = ctrl._pend; ctrl._pend = null; impl.open(p.o).then(p.r); }
    };
    ready().then(() => { if (!dead) take(build3D(host, opts, ctrl)); },
                 () => { if (!dead) take(build2D(host, opts)); });
    return ctrl;
  }

  window.LernChest = { mount, ready, SKINS };
})();
