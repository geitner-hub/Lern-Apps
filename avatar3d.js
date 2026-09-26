// ═══════════════════════════════════════════════════════
//  Lernwelt – avatar3d.js   (3D-Avatar aus Blöcken)
//
//  Baut die Figur und alle Teile ausschließlich aus den Daten in
//  lernwelt-inhalte.json (Abschnitte AVATAR und ITEMS). Neue Teile
//  brauchen keinen Code – siehe README, Abschnitt „Avatar-Teile“.
//
//  three.js wird erst bei Bedarf aus vendor/three.min.js geladen.
//
//  API (window.LernAvatar):
//    ready()                    → Promise, sobald 3D bereit ist
//    mount(host, {drehbar})     → { setLook(look), cheer(), destroy() }
//    snapshot(look, opts)       → Bild als data-URL
//    refresh()                  → alle [data-avatar-bild] neu zeichnen
//    figur(look?, opts)         → Promise: Figur für eigene Szenen (z. B. Runner)
//                                 { root, THREE, pose({lauf, phase, stolpern, jubel, t}), gesicht(mode) }
//
//  Automatisch befüllt werden Elemente mit
//    data-avatar-thumb="ITEM-ID"         Vorschau eines Teils
//    data-avatar-figur="frisur:ID" usw.  Vorschau einer Aussehen-Option
//    data-avatar-bild="portrait|ganz"    (img) aktueller Avatar
// ═══════════════════════════════════════════════════════

(function () {
  'use strict';
  if (window.LernAvatar) return;

  const here = (document.currentScript && document.currentScript.src) || location.href;
  const THREE_URL = new URL('vendor/three.min.js', here).href;
  const PORTRAIT_KEY = 'lernwelt-avatar-bild';
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  let T3 = null, AV = null, PASS = null, readyP = null;

  function webglOk() {
    try { const c = document.createElement('canvas'); return !!(c.getContext('webgl') || c.getContext('experimental-webgl')); }
    catch (e) { return false; }
  }
  function loadThree() {
    if (window.THREE) return Promise.resolve(window.THREE);
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = THREE_URL;
      s.onload = () => (window.THREE ? res(window.THREE) : rej(new Error('three')));
      s.onerror = () => rej(new Error('three'));
      document.head.appendChild(s);
    });
  }
  function passReady() {
    return new Promise(res => {
      if (window.LernPass) res(window.LernPass);
      else window.addEventListener('lernpass:ready', () => res(window.LernPass), { once: true });
    });
  }
  function ready() {
    if (!readyP) {
      readyP = (webglOk() ? Promise.all([loadThree(), passReady()]) : Promise.reject(new Error('webgl')))
        .then(([t, P]) => { T3 = t; PASS = P; AV = P.AVATAR || {}; initShared(); return true; });
      readyP.catch(() => {});
    }
    return readyP;
  }

  // ── Farben & Zufall ──────────────────────────────────────
  function mix(a, b, t) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const ch = sh => Math.round(((pa >> sh) & 255) * (1 - t) + ((pb >> sh) & 255) * t);
    return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
  }
  const dk = (c, t = .25) => mix(c, '#000000', t), lt = (c, t = .3) => mix(c, '#ffffff', t);
  function rng(seed) { seed = seed || 1; return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }

  // ── Caches ───────────────────────────────────────────────
  const geoC = {}, matC = {}, texC = {};
  const G = (w, h, d) => geoC[w + '|' + h + '|' + d] || (geoC[w + '|' + h + '|' + d] = new T3.BoxGeometry(w, h, d));
  const CONE = (r, h) => geoC['c' + r + '|' + h] || (geoC['c' + r + '|' + h] = new T3.ConeGeometry(r, h, 8));

  function colMat(c, o = {}) {
    const k = c + '|' + (o.licht || 0) + '|' + (o.metall ? 1 : 0) + '|' + (o.glas || 0);
    if (matC[k]) return matC[k];
    const m = o.metall ? new T3.MeshStandardMaterial({ color: c, metalness: .3, roughness: .35 })
                       : new T3.MeshLambertMaterial({ color: c });
    if (o.glas) { m.transparent = true; m.opacity = o.glas; m.depthWrite = false; }
    if (o.licht) { m.emissive = new T3.Color(c); m.emissiveIntensity = o.licht; }
    return (matC[k] = m);
  }

  // Pixel-Muster → Textur. face: 'vorne' | 'hinten' | 'seite'
  function musterTex(def, face, key) {
    const k = key + '|' + face;
    if (texC[k]) return texC[k];
    const w = def.w || 16, h = def.h || 16;
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const x = cv.getContext('2d');
    const R = (col, X, Y, W = 1, H = 1) => { x.fillStyle = col; x.fillRect(X, Y, W, H); };
    if (def.verlauf) {
      const g = x.createLinearGradient(0, 0, w, h), n = def.verlauf.length - 1 || 1;
      def.verlauf.forEach((col, i) => g.addColorStop(i / n, col));
      x.fillStyle = g; x.fillRect(0, 0, w, h);
    } else R(def.basis || '#cccccc', 0, 0, w, h);
    if (def.streifen) { const s = def.streifen, hh = s.hoehe || 2; for (let y = 0, i = 0; y < h; y += hh, i++) R(s.farben[i % s.farben.length], 0, y, w, hh); }
    if (def.senkrecht) { const s = def.senkrecht, ww = s.breite || 2; for (let X = 0, i = 0; X < w; X += ww, i++) R(s.farben[i % s.farben.length], X, 0, ww, h); }
    if (def.karo) { const s = def.karo, g = s.groesse || 2; for (let y = 0; y < h; y++) for (let X = 0; X < w; X++) R(s.farben[(Math.floor(X / g) + Math.floor(y / g)) % s.farben.length], X, y); }
    if (def.punkte) { const p = def.punkte, r = rng((p.seed || 1) + (face === 'vorne' ? 0 : face === 'hinten' ? 7 : 13)); for (let i = 0; i < p.n; i++) R(p.farben[i % p.farben.length], Math.floor(r() * w), Math.floor(r() * h)); }
    (def.rects || []).forEach(a => R(...a));
    (def[face] || []).forEach(a => R(...a));
    (def.loecher || []).forEach(([X, Y, W, H]) => x.clearRect(X, Y, W, H));
    const t = new T3.CanvasTexture(cv);
    t.magFilter = T3.NearestFilter; t.minFilter = T3.NearestFilter; t.generateMipmaps = false;
    return (texC[k] = t);
  }
  function musterMat(def, face, key, o = {}) {
    const k = 'm|' + key + '|' + face + '|' + (o.licht || 0) + '|' + (o.metall ? 1 : 0);
    if (matC[k]) return matC[k];
    const map = musterTex(def, face, key);
    const m = o.metall ? new T3.MeshStandardMaterial({ map, metalness: .3, roughness: .35 }) : new T3.MeshLambertMaterial({ map });
    if (def.loecher) m.alphaTest = .5;
    if (o.licht) { m.emissive = new T3.Color('#ffffff'); m.emissiveMap = map; m.emissiveIntensity = o.licht; }
    return (matC[k] = m);
  }

  // Farb-Wörter in Teilen: haar, haar2, haut, haut2
  function color(spec, ctx) { return ctx[spec] || spec; }

  // Material für eine Seite
  function single(spec, face, o, ctx) {
    spec = spec || '#cccccc';
    if (typeof spec === 'string' && spec.startsWith('muster:')) {
      const id = spec.slice(7);
      const def = (ctx.muster && ctx.muster[id]) || (AV.MUSTER && AV.MUSTER[id]);
      if (def) return musterMat(def, face, (ctx.muster && ctx.muster[id] ? ctx.key : 'global') + ':' + id, o);
      spec = '#ff00ff';
    }
    return colMat(color(spec, ctx), o);
  }
  // Material (oder Liste je Seite) für einen Block. Reihenfolge three.js: +x −x +y −y +z −z
  function mat(spec, o, ctx) {
    if (spec && typeof spec === 'object') {
      const f = (n, face) => single(spec[n] || spec.sonst, face, o, ctx);
      return [f('rechts', 'seite'), f('links', 'seite'), f('oben', 'seite'), f('unten', 'seite'), f('vorne', 'vorne'), f('hinten', 'hinten')];
    }
    if (typeof spec === 'string' && spec.startsWith('muster:')) {
      const s = single(spec, 'seite', o, ctx);
      return [s, s, s, s, single(spec, 'vorne', o, ctx), single(spec, 'hinten', o, ctx)];
    }
    return single(spec, 'seite', o, ctx);
  }

  // ── Animationen (Namen in den Daten: "anim") ─────────────
  function uniqueMats(obj) {
    const out = [];
    obj.traverse(m => {
      if (!m.isMesh) return;
      m.material = Array.isArray(m.material) ? m.material.map(x => x.clone()) : m.material.clone();
      (Array.isArray(m.material) ? m.material : [m.material]).forEach(x => { if (x.emissive) out.push(x); });
    });
    return out;
  }
  const ANIM = {
    drehen:    (o, a) => t => { o.rotation.y = a.ry + t * 1.6; },
    pulsieren: (o) => t => { const k = 1 + .12 * Math.sin(t * 6); o.scale.set(k, k, k); },
    blinken:   (o) => { const ms = uniqueMats(o); return t => ms.forEach(m => { m.emissiveIntensity = Math.sin(t * 5) > 0 ? 1 : .1; }); },
    leuchten:  (o) => { const ms = uniqueMats(o); return t => ms.forEach(m => { m.emissiveIntensity = .35 + .25 * Math.sin(t * 2); }); },
    flattern:  (o, a) => t => { o.rotation.y = a.ry + .3 * Math.sin(t * 2.6); },
    schlagen:  (o, a) => t => { o.rotation.z = a.rz + .45 * Math.sin(t * 8); },
    wehen:     (o, a) => t => { o.rotation.x = a.rx + .05 * Math.sin(t * 1.6); },
    flackern:  (o) => t => { o.scale.y = 1 + .3 * Math.sin(t * 38); },
    schweben:  (o, a) => t => { o.position.y = a.py + .8 * Math.sin(t * 2); },
    wedeln:    (o, a) => t => { o.rotation.z = a.rz + .35 * Math.sin(t * 2.2); },
    wackeln:   (o, a) => t => { o.rotation.y = a.ry + .5 * Math.sin(t * 9); },
    pendeln:   (o, a) => t => { o.rotation.z = a.rz + .12 * Math.sin(t * 1.8); },
  };

  // ── Teile bauen ──────────────────────────────────────────
  function node(parent, d, ctx, P) {
    if (d.zone && ctx.hidden && ctx.hidden.includes(d.zone)) return;
    const holders = [parent];
    if (d.paar) { const m = new T3.Group(); m.scale.x = -1; parent.add(m); holders.push(m); }
    holders.forEach(h => {
      const o = { licht: d.licht, metall: d.metall, glas: d.glas };
      let obj;
      if (d.g) obj = new T3.Mesh(G(d.g[0], d.g[1], d.g[2]), mat(d.f, o, ctx));
      else if (d.kegel) obj = new T3.Mesh(CONE(d.kegel[0], d.kegel[1]), single(d.f, 'seite', o, ctx));
      else obj = new T3.Group();
      if (d.glas) obj.renderOrder = 2;
      if (d.p) obj.position.set(d.p[0], d.p[1], d.p[2]);
      if (d.r) obj.rotation.set(d.r[0], d.r[1], d.r[2]);
      if (d.s) obj.scale.set(d.s[0], d.s[1], d.s[2]);
      if (d.rand && d.g) {
        const eg = geoC['e' + d.g.join('|')] || (geoC['e' + d.g.join('|')] = new T3.EdgesGeometry(G(d.g[0], d.g[1], d.g[2])));
        obj.add(new T3.LineSegments(eg, new T3.LineBasicMaterial({ color: color(d.rand, ctx) })));
      }
      (d.teile || []).forEach(c => node(obj, c, ctx, P));
      if (d.anim && ANIM[d.anim]) {
        const f = ANIM[d.anim](obj, { rx: obj.rotation.x, ry: obj.rotation.y, rz: obj.rotation.z, py: obj.position.y });
        if (f) P.anim.push(f);
      }
      h.add(obj);
    });
  }
  function grp(p, x = 0, y = 0, z = 0) { const g = new T3.Group(); g.position.set(x, y, z); p.add(g); return g; }
  function box(p, w, h, d, x, y, z, m) { const me = new T3.Mesh(G(w, h, d), m); me.position.set(x, y, z); p.add(me); return me; }

  // ── Gesicht ──────────────────────────────────────────────
  function faceMat(look, mode, hautC, haarC) {
    const augen = (AV.AUGEN || []).find(a => a.id === look.augen) || (AV.AUGEN || [])[0] || {};
    const mund = (AV.MUENDER || []).find(a => a.id === look.mund) || (AV.MUENDER || [])[0] || {};
    const key = ['face', hautC, haarC, augen.id, mund.id, mode].join('|');
    if (matC[key]) return matC[key];
    const cv = document.createElement('canvas'); cv.width = cv.height = 16;
    const x = cv.getContext('2d');
    const C = { d: '#1f1b2e', w: '#ffffff', h: dk(haarC, .1), k: '#f29aa6', r: '#6b2a36', o: '#7a2638', z: '#f47188', l: mund.farbe || '#e76f8f' };
    const R = ([c, X, Y, W, H]) => { x.fillStyle = C[c] || c; x.fillRect(X, Y, W, H); };
    x.fillStyle = hautC; x.fillRect(0, 0, 16, 16);
    (augen.brauen || [['h', 3, 5, 3, 1], ['h', 10, 5, 3, 1]]).forEach(R);
    (mode === 'blink' ? (augen.zu || [['d', 4, 9, 2, 1], ['d', 10, 9, 2, 1]]) : (augen.offen || [])).forEach(R);
    [['k', 2, 11, 2, 1], ['k', 12, 11, 2, 1]].forEach(R);
    (mode === 'cheer' ? (mund.jubel || [['o', 6, 12, 4, 2], ['z', 7, 13, 2, 1]]) : (mund.teile || [])).forEach(R);
    const t = new T3.CanvasTexture(cv);
    t.magFilter = T3.NearestFilter; t.minFilter = T3.NearestFilter; t.generateMipmaps = false;
    return (matC[key] = new T3.MeshLambertMaterial({ map: t }));
  }

  // ── Figur ────────────────────────────────────────────────
  const ITEM = id => (PASS && PASS.ITEM_BY_ID[id]) || null;
  const DEFAULT_ANCHOR = { kopf: 'kopf', gesicht: 'kopf', oberteil: 'koerper', hose: 'beine', schuhe: 'beine', ruecken: 'koerper', hand: 'hand', begleiter: 'begleiter' };

  /**
   * look = { haut, frisur, haarfarbe, augen, mund, eq: {slot: itemId} }
   * o    = { ghost, only:'begleiter', noHead, noPet, noHair }
   */
  function build(look, o = {}) {
    look = look || {};
    const eq = look.eq || {};
    const ghost = !!o.ghost;
    const hautC = ghost ? '#cdd3e8' : ((AV.HAUT || [])[look.haut] || (AV.HAUT || ['#e9b791'])[0]);
    const haarC = (AV.HAARFARBEN || [])[look.haarfarbe] || (AV.HAARFARBEN || ['#6b3e1f'])[0];
    const base = { haut: hautC, haut2: dk(hautC, .12), haar: haarC, haar2: lt(haarC, .2) };
    const item = s => (eq[s] ? ITEM(eq[s]) : null);
    const P = { root: new T3.Group(), anim: [], look, ghost, hautC, haarC, anchors: {} };
    const A = P.anchors;
    const addItem = (it, fallbackAnchor) => {
      if (!it) return;
      const ctx = Object.assign({}, base, { muster: it.muster || {}, key: it.id, hidden: P.hidden });
      (it.modell || []).forEach(d => { const a = A[d.an || fallbackAnchor]; if (a) node(a, d, ctx, P); });
    };

    if (o.only === 'begleiter') {
      A.begleiter = grp(P.root);
      addItem(item('begleiter'), 'begleiter');
      return P;
    }

    const fig = grp(P.root); P.fig = fig; A.figur = fig; A.boden = P.root;
    const skinM = colMat(hautC);

    // Beine und Hose
    const lower = grp(fig); A.beine = lower;
    for (const s of [-1, 1]) box(lower, 3.8, 9, 3.8, s * 2.2, 4.5, 0, skinM);
    const hose = item('hose');
    const hk = hose ? hose.kleidung : (ghost ? null : AV.OHNE && AV.OHNE.hose);
    if (hk) {
      const ctx = Object.assign({}, base, { muster: (hose && hose.muster) || {}, key: hose ? hose.id : 'ohne-hose' });
      const m = mat(hk.muster || hk.farbe, { metall: hk.metall, licht: hk.licht }, ctx);
      for (const s of [-1, 1]) {
        if (hk.lang !== false) box(lower, 4.3, 7.4, 4.3, s * 2.2, 5.3, 0, m);
        else box(lower, 4.3, 3.8, 4.3, s * 2.2, 7.1, 0, m);
      }
      box(lower, 9.2, 1.6, 5.2, 0, 8.4, 0, m);
    }
    addItem(hose, 'beine');
    const schuhe = item('schuhe') || (ghost ? null : AV.OHNE && AV.OHNE.schuhe);
    addItem(schuhe, 'beine');

    // Oberkörper
    const up = grp(fig); P.upper = up; A.koerper = up; A.ruecken = up;
    const ober = item('oberteil');
    const ok = ober ? ober.kleidung : (ghost ? null : AV.OHNE && AV.OHNE.oberteil && AV.OHNE.oberteil.kleidung);
    const octx = Object.assign({}, base, { muster: (ober && ober.muster) || {}, key: ober ? ober.id : 'ohne-oberteil' });
    const oo = ok ? { metall: ok.metall, licht: ok.licht } : {};
    box(up, 9, 10, 5, 0, 14, 0, ok ? mat(ok.muster || ok.farbe, oo, octx) : skinM);

    const arm = s => {
      const a = grp(up, s * 6.3, 18.6, 0);
      box(a, 3.4, 9.6, 3.4, 0, -4.8, 0, skinM);
      if (ok && ok.aermel !== 'ohne') {
        const len = ok.aermel === 'lang' ? 9.2 : 3.8;
        box(a, 3.9, len, 3.9, 0, -len / 2 + .3, 0, single(ok.aermelFarbe || ok.muster || ok.farbe, 'seite', oo, octx));
        if (ok.bund) box(a, 4, .9, 4, 0, -len + .75, 0, colMat(ok.bund));
      }
      a.rotation.z = s * .1;
      return a;
    };
    P.armL = arm(-1); P.armR = arm(1);
    A.armL = P.armL; A.armR = P.armR;
    A.hand = grp(P.armR, 0, -9.4, 1.4);

    // Kopf
    const hut = item('kopf');
    P.hidden = (hut && hut.versteckt) || [];
    if (!o.noHead) {
      const head = grp(up, 0, 24.7, 0); P.head = head; A.kopf = head;
      const fm = ghost ? skinM : faceMat(look, 'open', hautC, haarC);
      P.headMesh = box(head, 11, 11, 11, 0, 0, 0, [skinM, skinM, skinM, skinM, fm, skinM]);
      if (!ghost && !o.noHair) {
        const fr = (AV.FRISUREN || []).find(f => f.id === look.frisur) || (AV.FRISUREN || [])[0];
        if (fr) { const ctx = Object.assign({}, base, { muster: fr.muster || {}, key: 'frisur-' + fr.id, hidden: P.hidden }); (fr.teile || []).forEach(d => node(head, d, ctx, P)); }
      }
    }
    addItem(ober, 'koerper');
    if (!o.noHead) { addItem(item('gesicht'), 'kopf'); addItem(hut, 'kopf'); }
    addItem(item('ruecken'), 'koerper');
    addItem(item('hand'), 'hand');

    if (!o.noPet) {
      const pet = item('begleiter');
      if (pet) {
        const po = grp(P.root, 13, 0, 3.5); po.rotation.y = -.5; A.begleiter = po; P.pet = po;
        addItem(pet, 'begleiter');
        const ps = new T3.Mesh(SHADOW_GEO, shadowMat()); ps.rotation.x = -Math.PI / 2; ps.scale.set(.6, .6, .6); ps.position.set(13, .06, 3.5); P.root.add(ps);
      }
    }
    if (!o.noShadow) { const s = new T3.Mesh(SHADOW_GEO, shadowMat()); s.rotation.x = -Math.PI / 2; s.position.y = .05; P.root.add(s); }
    return P;
  }

  let SHADOW_GEO = null;
  function shadowMat() {
    if (matC.shadow) return matC.shadow;
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 2, 32, 32, 32);
    g.addColorStop(0, 'rgba(0,0,0,.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    return (matC.shadow = new T3.MeshBasicMaterial({ map: new T3.CanvasTexture(c), transparent: true, depthWrite: false }));
  }
  function addLights(sc) {
    sc.add(new T3.HemisphereLight(0xeef0ff, 0x40305a, .9));
    const d = new T3.DirectionalLight(0xffffff, .75); d.position.set(25, 45, 40); sc.add(d);
    const r = new T3.DirectionalLight(0x9aa5ff, .5); r.position.set(-30, 20, -40); sc.add(r);
  }

  // ── Standbilder (Vorschauen, Pass-Karte) ─────────────────
  let snapR = null, snapScene = null, snapCam = null;
  const VIEWS = {
    ganz:      { t: [0, 20, 0], d: 100 },
    portrait:  { t: [0, 25, 0], d: 46, dir: [.3, .08, 1] },
    kopf:      { t: [0, 31, 0], d: 52 },
    gesicht:   { t: [0, 24.4, 0], d: 24 },
    oberteil:  { t: [0, 14, 0], d: 36 },
    hose:      { t: [0, 5, 0], d: 30 },
    schuhe:    { t: [0, 1.8, 0], d: 19, dir: [.5, .55, 1] },
    ruecken:   { t: [0, 13, 0], d: 58, yaw: Math.PI * .8 },
    hand:      { t: [8, 14, 3], d: 52, dir: [.9, .3, 1] },
    begleiter: { t: [0, 6, 0], d: 32 },
    frisur:    { t: [0, 25, -1.5], d: 44, dir: [1.1, .15, .9] },
    augen:     { t: [0, 24.7, 0], d: 21, dir: [.15, .05, 1] },
    mund:      { t: [0, 24.7, 0], d: 21, dir: [.15, .05, 1] },
  };
  function initShared() {
    SHADOW_GEO = new T3.CircleGeometry(8, 32);
    snapR = new T3.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    snapR.setPixelRatio(1);
    snapScene = new T3.Scene(); addLights(snapScene);
    snapCam = new T3.PerspectiveCamera(30, 1, 1, 600);
  }
  function snapshot(look, o = {}) {
    const v = VIEWS[o.view || 'ganz'] || VIEWS.ganz;
    const w = o.w || 200, h = o.h || 200;
    snapR.setSize(w, h, false);
    const B = build(look, Object.assign({ noShadow: o.view !== 'ganz' }, o));
    if (v.yaw) B.root.rotation.y = v.yaw;
    else if (o.view === 'ganz') B.root.rotation.y = .35;
    B.anim.forEach(f => f(0));
    snapScene.add(B.root);
    const d = new T3.Vector3(...(v.dir || [.35, .2, 1])).normalize();
    snapCam.aspect = w / h; snapCam.updateProjectionMatrix();
    snapCam.position.set(v.t[0] + d.x * v.d, v.t[1] + d.y * v.d, v.t[2] + d.z * v.d);
    snapCam.lookAt(v.t[0], v.t[1], v.t[2]);
    snapR.render(snapScene, snapCam);
    const url = snapR.domElement.toDataURL('image/png');
    snapScene.remove(B.root);
    return url;
  }
  const thumbCache = {};
  function itemThumb(id) {
    if (thumbCache[id]) return thumbCache[id];
    const it = ITEM(id); if (!it) return '';
    const look = { haut: 0, frisur: '', haarfarbe: 0, augen: '', mund: '', eq: { [it.slot]: it.id } };
    return (thumbCache[id] = snapshot(look, {
      view: it.slot, ghost: true, only: it.slot === 'begleiter' ? 'begleiter' : null,
      noPet: it.slot !== 'begleiter', noHead: ['oberteil', 'hose', 'schuhe', 'hand'].includes(it.slot),
    }));
  }
  function figurThumb(spec) {
    const [kind, id] = spec.split(':');
    const cur = PASS.look();
    const look = Object.assign({}, cur, { eq: {} });
    if (kind === 'frisur') look.frisur = id;
    if (kind === 'augen') look.augen = id;
    if (kind === 'mund') look.mund = id;
    const key = [kind, id, look.haut, look.haarfarbe, look.frisur, look.augen, look.mund].join('|');
    return thumbCache[key] || (thumbCache[key] = snapshot(look, { view: kind, noPet: true }));
  }

  // ── Automatisch befüllen ─────────────────────────────────
  const queue = new Set();
  let pumping = false;
  function enqueue(root) {
    const sel = '[data-avatar-thumb],[data-avatar-figur],[data-avatar-bild]';
    if (root.matches && root.matches(sel)) queue.add(root);
    if (root.querySelectorAll) root.querySelectorAll(sel).forEach(el => queue.add(el));
    pump();
  }
  function pump() {
    if (pumping || !queue.size) return;
    pumping = true;
    ready().then(() => {
      const step = () => {
        const t0 = performance.now();
        for (const el of queue) {
          queue.delete(el);
          if (el.isConnected) fill(el);
          if (performance.now() - t0 > 24) break;
        }
        if (queue.size) requestAnimationFrame(step); else pumping = false;
      };
      step();
    }, () => {
      queue.forEach(el => { if (el.dataset.avatarBild === undefined) el.textContent = '❔'; });
      queue.clear(); pumping = false;
    });
  }
  function setImg(el, url) {
    if (el.tagName === 'IMG') { el.src = url; el.hidden = false; const fb = el.parentNode && el.parentNode.querySelector('.pa-fb'); if (fb) fb.remove(); }
    else el.innerHTML = `<img alt="" src="${url}">`;
  }
  function fill(el) {
    try {
      if (el.dataset.avatarThumb) setImg(el, itemThumb(el.dataset.avatarThumb));
      else if (el.dataset.avatarFigur) setImg(el, figurThumb(el.dataset.avatarFigur));
      else if (el.dataset.avatarBild !== undefined) {
        const kind = el.dataset.avatarBild || 'portrait';
        const url = snapshot(PASS.look(), kind === 'ganz' ? { view: 'ganz', w: 360, h: 420 } : { view: 'portrait', w: 160, h: 160, noPet: true });
        setImg(el, url);
        if (kind !== 'ganz') { try { localStorage.setItem(PORTRAIT_KEY, url); } catch (e) {} }
      }
    } catch (e) { /* ein fehlerhaftes Teil darf die Seite nicht stören */ }
  }
  function refresh() { document.querySelectorAll('[data-avatar-bild]').forEach(el => queue.add(el)); pump(); }

  if ('MutationObserver' in window) {
    const mo = new MutationObserver(list => list.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1) enqueue(n); })));
    const start = () => { mo.observe(document.body, { childList: true, subtree: true }); enqueue(document.body); };
    if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  }
  passReady().then(P => {
    let t = null;
    P.onChange(() => { clearTimeout(t); t = setTimeout(refresh, 250); });
  });

  // ── Bühne (drehbare Figur) ───────────────────────────────
  let live = null;
  function liveInit() {
    const renderer = new T3.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const cv = renderer.domElement;
    cv.style.cssText = 'width:100%;height:100%;display:block;touch-action:pan-y;cursor:grab;outline:none';
    const scene = new T3.Scene(); addLights(scene);
    const camera = new T3.PerspectiveCamera(30, 1, 1, 600);
    const plat = new T3.Mesh(new T3.CylinderGeometry(17, 18.5, 2.4, 48), colMat('#262a55')); plat.position.y = -1.2; scene.add(plat);
    const ring = new T3.Mesh(new T3.TorusGeometry(17.2, .35, 8, 72), colMat('#b98612', { licht: .35 }));
    ring.rotation.x = Math.PI / 2; ring.position.y = .02; scene.add(ring);
    live = { renderer, cv, scene, camera, plat, ring, P: null, waveT: -1, cheerLeft: 0, host: null, ro: null, raf: 0, clock: new T3.Clock(), t: 0,
             ctl: { yaw: .35, v: 0, drag: false, lastX: 0, idle: 10 }, cheerT: -1, blinkT: 2.5, blinkOn: false };
    const c = live.ctl;
    cv.addEventListener('pointerdown', e => { c.drag = true; c.lastX = e.clientX; c.v = 0; try { cv.setPointerCapture(e.pointerId); } catch (x) {} cv.style.cursor = 'grabbing'; });
    cv.addEventListener('pointermove', e => {
      if (!c.drag) return;
      const dx = e.clientX - c.lastX; c.lastX = e.clientX;
      c.yaw += dx * .012; c.v = dx * .006; c.idle = 0;
      if (live.host) live.host.dispatchEvent(new CustomEvent('avatar:gedreht', { bubbles: true }));
    });
    const end = () => { c.drag = false; c.idle = 0; cv.style.cursor = 'grab'; };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  }
  function fit() {
    if (!live || !live.host) return;
    const w = live.host.clientWidth, h = live.host.clientHeight;
    if (!w || !h) return;
    live.renderer.setSize(w, h, false);
    const cam = live.camera; cam.aspect = w / h;
    const tan = Math.tan(T3.MathUtils.degToRad(15));
    const f = live.frame || { cy: 21.5, hh: 27, hw: 19.5 };
    const dist = Math.max(f.hh / tan, (f.hw / cam.aspect) / tan);
    cam.position.set(0, f.cy + 4.5, dist); cam.lookAt(0, f.cy, 0); cam.updateProjectionMatrix();
  }
  function setFace(mode) {
    const P = live && live.P;
    if (P && P.headMesh && !P.ghost) P.headMesh.material[4] = faceMat(P.look, mode, P.hautC, P.haarC);
  }
  function loop() {
    live.raf = requestAnimationFrame(loop);
    const L = live, P = L.P;
    const dt = Math.min(L.clock.getDelta(), .05); L.t += dt;
    if (!P) return;
    const c = L.ctl;
    if (!c.drag) {
      c.yaw += c.v; c.v *= .9; c.idle += dt;
      if (c.idle > 3.5 && !reduce) c.yaw += (.4 * Math.sin(L.t * .4) - c.yaw) * .012;
    }
    P.root.rotation.y = c.yaw;
    if (!reduce) { P.upper.position.y = Math.sin(L.t * 1.9) * .14; P.anim.forEach(f => f(L.t)); }
    L.blinkT -= dt;
    if (!L.blinkOn && L.blinkT < 0 && L.cheerT < 0) { setFace('blink'); L.blinkOn = true; }
    if (L.blinkOn && L.blinkT < -.13) { setFace('open'); L.blinkOn = false; L.blinkT = 2.5 + Math.random() * 3; }
    let k = 0, w = 0, wave = 0;
    if (L.cheerT >= 0) {
      L.cheerT += dt;
      const p = L.cheerT / 1.15;
      if (p >= 1) {
        if (L.cheerLeft > 0) { L.cheerLeft--; L.cheerT = 0; }
        else { L.cheerT = -1; setFace('open'); }
        P.fig.position.y = 0; if (P.pet) P.pet.position.y = 0;
      } else {
        k = p < .18 ? p / .18 : p > .8 ? (1 - p) / .2 : 1;
        if (L.cheerLeft > 0 && p > .8) k = 1;
        if (!reduce) {
          P.fig.position.y = p < .45 ? Math.sin(p / .45 * Math.PI) * 7 : p < .7 ? Math.sin((p - .45) / .25 * Math.PI) * 2 : 0;
          if (P.pet) { const q = p - .1; P.pet.position.y = q > 0 && q < .4 ? Math.sin(q / .4 * Math.PI) * 4 : 0; }
        }
      }
    }
    if (L.waveT >= 0) {
      L.waveT += dt;
      const p = L.waveT / 2.2;
      if (p >= 1) { L.waveT = -1; setFace('open'); }
      else { w = p < .15 ? p / .15 : p > .85 ? (1 - p) / .15 : 1; wave = reduce ? 0 : Math.sin(L.waveT * 11) * .35 * w; }
    }
    P.armL.rotation.z = -(.1 + 2.3 * k);
    P.armR.rotation.z = .1 + Math.max(2.3 * k, 2.5 * w) + wave;
    L.renderer.render(L.scene, L.camera);
  }
  /** Zeigt die drehbare Figur in host. Nur eine Bühne gleichzeitig. */
  function mount(host, opts = {}) {
    const ctrl = { look: opts.look || null, dead: false };
    ctrl.setLook = look => {
      ctrl.look = look;
      if (ctrl.dead || !live || live.host !== host) return;
      if (live.P) live.scene.remove(live.P.root);
      live.P = build(look);
      live.scene.add(live.P.root);
      live.blinkOn = false; live.blinkT = 2;
      if (opts.boden) live.plat.material = colMat(opts.boden);
    };
    ctrl.wave = () => { if (live && live.host === host && live.P) { live.cheerT = -1; live.waveT = 0; setFace('cheer'); } };
    ctrl.setBoden = c => { if (live && live.host === host) live.plat.material = colMat(c || '#262a55'); };
    ctrl.cheer = (n = 1) => { if (live && live.host === host && live.P) { live.waveT = -1; live.cheerT = 0; live.cheerLeft = Math.max(0, n - 1); setFace('cheer'); } };
    ctrl.destroy = () => {
      ctrl.dead = true;
      if (!live || live.host !== host) return;
      cancelAnimationFrame(live.raf); live.raf = 0;
      if (live.ro) live.ro.disconnect();
      if (live.cv.parentNode) live.cv.parentNode.removeChild(live.cv);
      if (live.P) live.scene.remove(live.P.root);
      live.P = null; live.host = null;
    };
    ready().then(() => {
      if (ctrl.dead) return;
      if (!live) liveInit();
      if (live.host && live.host !== host) { cancelAnimationFrame(live.raf); if (live.ro) live.ro.disconnect(); if (live.P) live.scene.remove(live.P.root); live.P = null; }
      live.host = host;
      live.plat.visible = live.ring.visible = opts.buehne !== false;
      live.frame = opts.buehne === false ? { cy: 19.5, hh: 22, hw: 16 } : null;
      live.cv.style.pointerEvents = opts.drehbar === false ? 'none' : '';
      live.cheerT = live.waveT = -1; live.cheerLeft = 0;
      live.ctl.yaw = .35; live.ctl.v = 0;
      host.appendChild(live.cv);
      live.ro = new ResizeObserver(fit); live.ro.observe(host); fit();
      live.ctl.idle = 10;
      ctrl.setLook(ctrl.look || PASS.look());
      if (opts.boden) live.plat.material = colMat(opts.boden);
      live.clock.getDelta();
      if (!live.raf) loop();
      if (opts.onReady) opts.onReady();
    }, () => {
      host.innerHTML = '<div style="display:grid;place-items:center;height:100%;font-size:3rem">🧭</div>';
      if (opts.onFail) opts.onFail();
    });
    return ctrl;
  }

  // ── Figur für eigene 3D-Szenen (Runner & Co.) ──────────
  /**
   * Baut die Figur ohne Bühne, damit ein Spiel sie in seine eigene Szene setzen kann.
   * Die Beine werden dafür auf zwei Hüftgelenke verteilt (auch Hosen und Schuhe),
   * damit sie beim Laufen schwingen können.
   * Blickrichtung der Figur: +z.  Einheiten: Figur ca. 31 hoch.
   */
  function figur(look, o = {}) {
    const P = build(look || PASS.look(), { noShadow: !!o.ohneSchatten });
    const lower = P.anchors.beine;
    const huefte = { '-1': grp(lower, -2.2, 9, 0), '1': grp(lower, 2.2, 9, 0) };
    P.root.updateMatrixWorld(true);
    const b = new T3.Box3(), c = new T3.Vector3();
    [...lower.children].forEach(ch => {
      if (ch === huefte['-1'] || ch === huefte['1']) return;
      b.setFromObject(ch);
      if (b.isEmpty()) return;
      b.getCenter(c);
      if (Math.abs(c.x) < .9) return;                      // Mittelteile (Bund, Rock) bleiben stehen
      huefte[c.x < 0 ? '-1' : '1'].attach(ch);
    });
    let faceMode = 'open';
    return {
      root: P.root, THREE: T3,
      /** lauf 0–1 (Stärke), phase (Schrittzyklus), stolpern 0–1, jubel 0–1, t (Zeit für Teile-Animationen) */
      pose({ lauf = 0, phase = 0, stolpern = 0, jubel = 0, t = 0 } = {}) {
        const sw = Math.sin(phase) * .85 * lauf;
        huefte['-1'].rotation.x = sw;
        huefte['1'].rotation.x = -sw;
        P.armL.rotation.x = -sw * .9 * (1 - jubel);
        P.armR.rotation.x = sw * .9 * (1 - jubel);
        P.armL.rotation.z = -(.1 + 2.3 * jubel);
        P.armR.rotation.z = .1 + 2.3 * jubel;
        P.upper.position.y = Math.abs(Math.cos(phase)) * .9 * lauf;
        P.fig.rotation.x = .1 * lauf + .55 * stolpern;
        if (P.pet) P.pet.position.y = Math.abs(Math.sin(phase * .75)) * 2.5 * lauf;
        if (!reduce) P.anim.forEach(f => f(t));
      },
      /** 'open' | 'blink' | 'cheer' */
      gesicht(mode) {
        if (mode === faceMode || !P.headMesh || P.ghost) return;
        faceMode = mode;
        P.headMesh.material[4] = faceMat(P.look, mode, P.hautC, P.haarC);
      },
    };
  }

  // ── Auftritt in der Ecke (nach Runden, Begrüßung) ──────
  let pop = null, popCtrl = null, popT = null, popHideT = null;
  function popEl() {
    if (pop) return pop;
    const st = document.createElement('style');
    st.textContent = `
      #lw-avatar-pop{position:fixed;right:max(10px,env(safe-area-inset-right));bottom:max(10px,env(safe-area-inset-bottom));z-index:10002;
        width:150px;height:190px;pointer-events:none;transform:translateY(130%);opacity:0;
        transition:transform .45s cubic-bezier(.2,.9,.3,1.25),opacity .3s;}
      #lw-avatar-pop.show{transform:translateY(0);opacity:1;}
      #lw-avatar-pop .lwa-stage{position:absolute;inset:0;}
      #lw-avatar-pop .lwa-glow{position:absolute;left:12%;right:12%;bottom:2px;height:26px;border-radius:50%;
        background:radial-gradient(closest-side,rgba(230,168,23,.55),rgba(230,168,23,0));}
      #lw-avatar-pop .lwa-bubble{position:absolute;right:112px;bottom:128px;background:#fff;color:#1b1929;border-radius:16px;
        padding:.5rem .75rem;font:800 .9rem/1.25 'Nunito','Segoe UI',sans-serif;width:max-content;max-width:210px;
        box-shadow:0 8px 24px rgba(0,0,0,.3);transform-origin:bottom right;transform:scale(.4);opacity:0;
        transition:transform .35s cubic-bezier(.2,.9,.3,1.4) .25s,opacity .2s .25s;}
      #lw-avatar-pop.show .lwa-bubble{transform:scale(1);opacity:1;}
      #lw-avatar-pop .lwa-bubble::after{content:'';position:absolute;right:-7px;bottom:12px;border:8px solid transparent;border-left-color:#fff;border-right:0;}
      #lw-avatar-pop .lwa-bubble.big{background:linear-gradient(135deg,#fde68a,#e6a817);font-size:1rem;}
      #lw-avatar-pop .lwa-bubble.big::after{border-left-color:#eab308;}
      @media (max-width:600px){#lw-avatar-pop{width:118px;height:150px;}#lw-avatar-pop .lwa-bubble{right:88px;bottom:100px;max-width:170px;font-size:.82rem;}}
      @media (prefers-reduced-motion: reduce){#lw-avatar-pop,#lw-avatar-pop .lwa-bubble{transition:opacity .2s;}}`;
    document.head.appendChild(st);
    pop = document.createElement('div');
    pop.id = 'lw-avatar-pop';
    pop.setAttribute('aria-hidden', 'true');
    pop.innerHTML = '<div class="lwa-glow"></div><div class="lwa-stage"></div><div class="lwa-bubble"></div>';
    document.body.appendChild(pop);
    return pop;
  }
  function hidePop() {
    if (!pop) return;
    pop.classList.remove('show');
    clearTimeout(popHideT);
    popHideT = setTimeout(() => { if (popCtrl) { popCtrl.destroy(); popCtrl = null; } }, 500);
  }
  /**
   * Lässt die Figur unten rechts erscheinen.
   * o = { text, big, aktion: 'jubeln'|'winken', dauer (ms) }
   */
  function appear(o = {}) {
    return ready().then(() => {
      if (live && live.host && (!pop || !pop.contains(live.host))) return;   // Bühne (z. B. Garderobe) ist gerade in Benutzung
      const el = popEl();
      const b = el.querySelector('.lwa-bubble');
      b.textContent = o.text || '';
      b.className = 'lwa-bubble' + (o.big ? ' big' : '');
      b.style.display = o.text ? '' : 'none';
      clearTimeout(popT); clearTimeout(popHideT);
      const act = () => {
        if (!popCtrl) return;
        if (o.aktion === 'winken') popCtrl.wave(); else popCtrl.cheer(o.big ? 3 : 2);
      };
      if (popCtrl && !popCtrl.dead) { popCtrl.setLook(PASS.look()); act(); }
      else popCtrl = mount(el.querySelector('.lwa-stage'), { buehne: false, drehbar: false, onReady: act });
      requestAnimationFrame(() => el.classList.add('show'));
      popT = setTimeout(hidePop, o.dauer || (o.big ? 5200 : 3400));
    }, () => {});
  }

  window.LernAvatar = { ready, mount, appear, hide: hidePop, snapshot: (l, o) => snapshot(l, o), refresh, PORTRAIT_KEY,
                        figur: (look, o) => ready().then(() => figur(look, o)) };
})();
