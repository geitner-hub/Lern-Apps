// ═══════════════════════════════════════════════════════
//  Lernwelt – insel-welt.js   („Die Insel“: Welt aus Blöcken)
//
//  Wird geladen von: spiele/insel.html
//  Braucht: three.js (kommt über avatar3d.js → LernAvatar.figur)
//
//  Etappe 1 (Probelauf): Testinsel aus einem festen Zufallswert (erzeuge, bleibt für Tests: ?seed=…).
//  Etappe 2: Welt aus daten/insel.json (ausDaten) – Höhenkarte, drei Gebiete, Gebäude nach
//  Vorlagen, Wege, Stege, Bauplätze, Schilder, Bäume, Absperrungen geschlossener Gebiete.
//
//  Grundsätze (für ältere iPads):
//    - Welt in Stücken (Chunks) zu 16 × 16 × 24 Blöcken, je Stück EIN Mesh
//      (ein Draw-Call), nur sichtbare Flächen, Farben als Vertex-Farben
//    - MeshLambertMaterial, keine Texturen, keine echten Schatten
//    - Wasser wird nicht als Blöcke gezeichnet, sondern als eine Meeresfläche
//      (die Wasserblöcke gibt es trotzdem: sie sperren den Weg)
//    - Bauen (ab Etappe 4) baut nur das betroffene Stück neu: szene.neuBauen(cx, cz)
//
//  Koordinaten: Block (x, y, z) füllt [x, x+1) × [y, y+1) × [z, z+1); y zeigt nach oben.
//
//  API (window.LernInselWelt):
//    BLOCK                              Block-Nummern (LUFT, GRAS, …) – nie umnummerieren (ab Etappe 4 im Spielstand)
//    ausDaten(daten, { offen })         → welt aus daten/insel.json (offen = Set offener Gebiets-IDs)
//    erzeuge(seed, opt?)                → welt (Testinsel, ohne Gebiete)
//      welt.N, welt.H, welt.W           Kantenlänge, Höhe, Wasserlinie (Oberfläche des Meers)
//      welt.get(x, y, z) / set(…, b)    Block lesen / setzen
//      welt.fest(x, y, z)               versperrt den Weg (außerhalb der Insel: ja)
//      welt.kamera(x, y, z)             hält die Kamera auf
//      welt.nass(x, y, z)               Wasser (nicht betretbar)
//      welt.steigbar(x, y, z)           false: nie hochsteigen (Zaun)
//      welt.boden(x, z)                 Höhe, auf der man in dieser Spalte steht
//      welt.start  { x, z, blick }      Startpunkt
//      welt.gebiete / gebiet(x, z)      Gebiete aus den Daten / ID des Gebiets an einer Stelle (null = Meer)
//      welt.absperren(offen)            Zäune geschlossener Gebiete setzen/entfernen → geänderte Stücke [{cx, cz}]
//      welt.orte   { gebaeude[], plaetze[], bauplaetze[], schilder[] }   (plaetze: Stellen für Bewohner)
//    szene(THREE, welt)                 → { gruppe, stuecke, neuBauen(cx, cz), sicht(x, z, weite) }
//    backe(THREE, obj)                  → Figur/Modell zu wenigen Meshes zusammengefügt (Bewohner)
// ═══════════════════════════════════════════════════════

(function () {
  'use strict';
  if (window.LernInselWelt) return;

  const STUECK = 16;                                 // Kantenlänge eines Weltstücks

  // ── Blöcke ──────────────────────────────────────────────
  // oben/seite: Farben; fest: versperrt den Weg; nass: Wasser; kamera: false = Kamera fliegt hindurch;
  // steigen: false = die Figur steigt nie darauf (Zäune der Absperrungen);
  // unsichtbar: wird nicht gezeichnet (Meer)
  const BLOCK = {
    LUFT: 0, GRAS: 1, ERDE: 2, SAND: 3, STEIN: 4, WASSER: 5, STAMM: 6, LAUB: 7, PLANKE: 8,
    DACH: 9, WEG: 10, PUTZ: 11, FENSTER: 12, BRUNNEN: 13, DACH_BLAU: 14, DACH_GRUEN: 15, KIES: 16,
    ZAUN: 17, SCHILD: 18, PFLOCK: 19, DACH_GELB: 20,
    PFLANZE: 21, KISTE1: 22, KISTE10: 23, KISTE100: 24, KISTE1000: 25,   // Etappe 5: Felder und Lager
  };
  const ART = [];
  function art(id, oben, seite, o = {}) { ART[id] = Object.assign({ oben, seite: seite || oben, fest: true, nass: false, kamera: true, unsichtbar: false }, o); }
  art(BLOCK.LUFT, '#000000', null, { fest: false, kamera: false, unsichtbar: true });
  art(BLOCK.GRAS, '#6cbf4b', '#5aa63f');
  art(BLOCK.ERDE, '#8a5a36');
  art(BLOCK.SAND, '#ead79e', '#dcc78a');
  art(BLOCK.STEIN, '#959aa1', '#858a91');
  art(BLOCK.WASSER, '#3b9be0', null, { fest: false, nass: true, kamera: false, unsichtbar: true });
  art(BLOCK.STAMM, '#b88a55', '#7a4a28');
  art(BLOCK.LAUB, '#3f9a3c', '#378a35');
  art(BLOCK.PLANKE, '#c8955a', '#b8844c');
  art(BLOCK.DACH, '#c0473b', '#a83d33');
  art(BLOCK.WEG, '#c9b48a', '#a88f63');
  art(BLOCK.PUTZ, '#efe3c8', '#e6d7b6');
  art(BLOCK.FENSTER, '#5ea8d8');
  art(BLOCK.BRUNNEN, '#3f8fd6', null, { nass: true });
  art(BLOCK.DACH_BLAU, '#3b6fb6', '#335f9c');
  art(BLOCK.DACH_GRUEN, '#3f8a4a', '#36763f');
  art(BLOCK.KIES, '#b3aca0', '#9c958a');
  art(BLOCK.ZAUN, '#8b5e34', '#6f4a28', { steigen: false });
  art(BLOCK.SCHILD, '#e8c48a', '#d9b070');
  art(BLOCK.PFLOCK, '#f59e0b', '#d97706');
  art(BLOCK.DACH_GELB, '#e0a526', '#c38d1c');
  art(BLOCK.PFLANZE, '#58c24a', '#3f8f35');
  art(BLOCK.KISTE1, '#f1ece2', '#d9d2c4');
  art(BLOCK.KISTE10, '#f2cf3d', '#d6b42a');
  art(BLOCK.KISTE100, '#f08a2c', '#cf7220');
  art(BLOCK.KISTE1000, '#8a4b25', '#6f3a1b');

  // ── Zufall und Rauschen (wiederholbar) ──────────────────
  function seedZahl(s) {
    let h = 2166136261 >>> 0;
    const str = String(s);
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function zufall(seed) {                            // mulberry32 → 0…1
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function h2(x, z, s) {
    let h = (Math.imul(x, 374761393) + Math.imul(z, 668265263) + Math.imul(s, 1442695041)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  function rausch(x, z, s) {
    const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz;
    const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
    const a = h2(ix, iz, s), b = h2(ix + 1, iz, s), c = h2(ix, iz + 1, s), d = h2(ix + 1, iz + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, z, s) { return rausch(x / 22, z / 22, s) * .6 + rausch(x / 9, z / 9, s + 1) * .3 + rausch(x / 4, z / 4, s + 2) * .1; }
  const glatt = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  // ── Welt-Objekt ─────────────────────────────────────────
  function neueWelt(N, H, W) {
    const B = new Uint8Array(N * N * H);
    const drin = (x, y, z) => x >= 0 && z >= 0 && x < N && z < N && y >= 0 && y < H;
    const idx = (x, y, z) => (y * N + z) * N + x;
    const welt = {
      N, H, W, B,
      get(x, y, z) { return drin(x, y, z) ? B[idx(x, y, z)] : (y < 0 ? BLOCK.STEIN : (y < W && (x < 0 || z < 0 || x >= N || z >= N) ? BLOCK.WASSER : BLOCK.LUFT)); },
      set(x, y, z, b) { if (drin(x, y, z)) B[idx(x, y, z)] = b; },
      fest(x, y, z) {
        if (y < 0) return true;
        if (x < 0 || z < 0 || x >= N || z >= N) return true;  // Inselrand
        return y < H && ART[B[idx(x, y, z)]].fest;
      },
      kamera(x, y, z) { return drin(x, y, z) && ART[B[idx(x, y, z)]].kamera; },
      steigbar(x, y, z) { return ART[welt.get(x, y, z)].steigen !== false; },
      nass(x, y, z) { return ART[welt.get(x, y, z)].nass; },
      /** Höhe, auf der man steht (über dem obersten festen oder nassen Block der Spalte) */
      boden(x, z) {
        x = Math.floor(x); z = Math.floor(z);
        if (x < 0 || z < 0 || x >= N || z >= N) return W;
        for (let y = H - 1; y >= 0; y--) { const b = B[idx(x, y, z)]; if (b && (ART[b].fest || ART[b].nass)) return y + 1; }
        return 0;
      },
      start: { x: N / 2, z: N / 2, blick: 0 },
      orte: { platz: null, haeuser: [], gebaeude: [], plaetze: [], bauplaetze: [], schilder: [] },
      gebiete: [],
      gebiet: () => null,                            // Testinsel: keine Gebiete
      absperren: () => [],
    };
    return welt;
  }

  // ── Testinsel (Etappe 1) ────────────────────────────────
  /**
   * Erzeugt eine Insel aus einem festen Zufallswert. Gleicher seed → gleiche Insel.
   * opt: { N = 96, H = 24, W = 5 }
   */
  function erzeuge(seed = 'lernwelt-insel-1', opt = {}) {
    const N = opt.N || 96, H = opt.H || 24, W = opt.W || 5;
    const S = seedZahl(seed) % 100000;
    const rnd = zufall(seedZahl(seed + '/dinge'));
    const welt = neueWelt(N, H, W);
    const c = N / 2, R = N / 2 - 5;

    // Dorfplatz Richtung Süden, nah am Strand (später: Hafendorf)
    const PX = Math.round(c + (rnd() - .5) * 8), PZ = Math.round(c + R * .38), PH = W + 2;
    welt.orte.platz = { x: PX + .5, z: PZ + .5, y: PH };

    // Höhenkarte
    const hoehe = new Int16Array(N * N);
    for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
      const dx = (x + .5 - c) / R, dz = (z + .5 - c) / R;
      const d = Math.sqrt(dx * dx + dz * dz) + (fbm(x, z, S + 7) - .5) * .38;
      const t = 1 - d * d;
      let h = 2 + t * 12 + (fbm(x, z, S) - .5) * 9;
      const dp = Math.hypot(x - PX, z - PZ);                       // Dorfplatz einebnen
      const k = 1 - glatt(11, 17, dp);
      h = h * (1 - k) + PH * k;
      hoehe[z * N + x] = Math.max(1, Math.min(H - 7, Math.round(h)));
    }
    if (hoehe[PZ * N + PX] < W + 1) hoehe[PZ * N + PX] = PH;

    // Spalten füllen
    for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
      const h = hoehe[z * N + x];
      const strand = h <= W + 1;
      const oben = h <= W + 1 ? BLOCK.SAND : (h >= 15 ? BLOCK.STEIN : BLOCK.GRAS);
      for (let y = 0; y < h; y++) {
        let b = BLOCK.STEIN;
        if (y === h - 1) b = oben;
        else if (y >= h - 4) b = strand ? BLOCK.SAND : (oben === BLOCK.STEIN ? BLOCK.STEIN : BLOCK.ERDE);
        welt.set(x, y, z, b);
      }
      for (let y = h; y < W; y++) welt.set(x, y, z, BLOCK.WASSER);
    }

    // Belegt-Maske: hier keine Bäume
    const belegt = new Uint8Array(N * N);
    const belege = (x0, z0, x1, z1) => { for (let z = Math.max(0, z0); z <= Math.min(N - 1, z1); z++) for (let x = Math.max(0, x0); x <= Math.min(N - 1, x1); x++) belegt[z * N + x] = 1; };

    // Dorfplatz: Kies, Wege, Brunnen
    for (let z = PZ - 3; z <= PZ + 3; z++) for (let x = PX - 3; x <= PX + 3; x++) {
      if (Math.hypot(x - PX, z - PZ) <= 3.4) welt.set(x, PH - 1, z, BLOCK.KIES);
    }
    belege(PX - 9, PZ - 9, PX + 9, PZ + 9);
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      if (dx || dz) welt.set(PX + dx, PH, PZ + dz, BLOCK.STEIN);
      else { welt.set(PX, PH - 1, PZ, BLOCK.BRUNNEN); }
    }
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([dx, dz]) => welt.set(PX + dx, PH + 1, PZ + dz, BLOCK.STAMM));
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) welt.set(PX + dx, PH + 2, PZ + dz, BLOCK.DACH);

    // Vier Häuser rund um den Platz; Tür zeigt zum Platz
    const DAECHER = [BLOCK.DACH, BLOCK.DACH_BLAU, BLOCK.DACH_GRUEN, BLOCK.DACH];
    const FARBEN = ['rot', 'blau', 'gruen', 'rot'];
    [[-8, -2], [7, -3], [-7, 6], [6, 6]].forEach(([ox, oz], i) => {
      const hx = PX + ox, hz = PZ + oz;
      // Tür in der Wand, die am meisten zum Platz zeigt
      const vx = PX - hx, vz = PZ - hz;
      const seite = Math.abs(vx) > Math.abs(vz) ? (vx > 0 ? 'ost' : 'west') : (vz > 0 ? 'sued' : 'nord');
      haus(welt, hx, PH, hz, DAECHER[i], seite);
      belege(hx - 4, hz - 4, hx + 4, hz + 4);
      const tx = seite === 'ost' ? hx + 2 : seite === 'west' ? hx - 2 : hx;
      const tz = seite === 'sued' ? hz + 2 : seite === 'nord' ? hz - 2 : hz;
      const ax = seite === 'ost' ? 1 : seite === 'west' ? -1 : 0, az = seite === 'sued' ? 1 : seite === 'nord' ? -1 : 0;
      for (let s = 1; s <= 8; s++) {                                // Weg von der Tür zum Platz
        const wx = tx + ax * s, wz = tz + az * s;
        if (Math.hypot(wx - PX, wz - PZ) <= 3.4) break;
        if (welt.get(wx, PH - 1, wz) === BLOCK.GRAS) welt.set(wx, PH - 1, wz, BLOCK.WEG);
      }
      welt.orte.haeuser.push({ id: 'haus-' + (i + 1), farbe: FARBEN[i], x: hx + .5, z: hz + .5,
        vorTuer: { x: tx + ax * 1.6 + .5, z: tz + az * 1.6 + .5, blick: Math.atan2(ax, az) } });
    });

    // Bäume auf Gras
    for (let z = 3; z < N - 3; z++) for (let x = 3; x < N - 3; x++) {
      if (belegt[z * N + x] || rnd() > .028) continue;
      const h = hoehe[z * N + x];
      if (welt.get(x, h - 1, z) !== BLOCK.GRAS) continue;
      baum(welt, x, h, z, rnd);
      belege(x - 2, z - 2, x + 2, z + 2);
    }

    welt.orte.plaetze = welt.orte.haeuser.map((h, i) => Object.assign({ id: ['tom', 'mia', 'brown', 'haus-4'][i], gebiet: null }, h.vorTuer));
    // Start: südlich vom Brunnen, Blick zum Brunnen (Norden = −z)
    welt.start = { x: PX + .5, z: PZ + 3.5, blick: Math.PI };
    return welt;
  }

  /** Haus 5 × 5 mit Tür, Fenstern und Pyramidendach. (hx, hz) = Mitte, y = Boden */
  function haus(welt, hx, y, hz, dach, tuer) {
    for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
      const x = hx + dx, z = hz + dz;
      for (let yy = y - 3; yy < y; yy++) if (!welt.get(x, yy, z) || welt.nass(x, yy, z)) welt.set(x, yy, z, BLOCK.STEIN);  // Fundament
      welt.set(x, y - 1, z, BLOCK.PLANKE);
      const rand = Math.abs(dx) === 2 || Math.abs(dz) === 2, ecke = Math.abs(dx) === 2 && Math.abs(dz) === 2;
      for (let h = 0; h < 3; h++) welt.set(x, y + h, z, rand ? (ecke ? BLOCK.STAMM : BLOCK.PUTZ) : BLOCK.LUFT);
      for (let h = 3; h < 7; h++) welt.set(x, y + h, z, BLOCK.LUFT);
    }
    // Fenster mitten in jeder Wand, Tür in der Wand zum Platz
    const mitte = { nord: [0, -2], sued: [0, 2], west: [-2, 0], ost: [2, 0] };
    Object.keys(mitte).forEach(s => {
      const [dx, dz] = mitte[s];
      if (s === tuer) { welt.set(hx + dx, y, hz + dz, BLOCK.LUFT); welt.set(hx + dx, y + 1, hz + dz, BLOCK.LUFT); }
      else welt.set(hx + dx, y + 1, hz + dz, BLOCK.FENSTER);
    });
    for (let s = 0; s < 4; s++) {                                    // Dach: 7×7, 5×5, 3×3, 1×1
      const r = 3 - s;
      for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) welt.set(hx + dx, y + 3 + s, hz + dz, dach);
    }
  }

  function baum(welt, x, y, z, rnd) {
    const h = 3 + Math.floor(rnd() * 2);
    for (let i = 0; i < h; i++) welt.set(x, y + i, z, BLOCK.STAMM);
    const top = y + h;
    for (let dy = -1; dy <= 1; dy++) {
      const r = dy === 1 ? 1 : 2;
      for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
        if (r === 2 && Math.abs(dx) === 2 && Math.abs(dz) === 2) continue;      // Ecken weg
        if (dx === 0 && dz === 0 && dy < 0) continue;                          // Stamm
        if (!welt.get(x + dx, top + dy, z + dz)) welt.set(x + dx, top + dy, z + dz, BLOCK.LAUB);
      }
    }
    welt.set(x, top + 1, z, BLOCK.LAUB);
  }

  // ── Welt aus daten/insel.json (ab Etappe 2) ─────────────
  const ZIFFERN = '0123456789abcdefghijklmn';
  const SEITEN = { nord: [0, -1], sued: [0, 1], west: [-1, 0], ost: [1, 0] };
  const blockNr = (name, ersatz) => (name && BLOCK[name] !== undefined ? BLOCK[name] : ersatz);

  /**
   * Baut die Welt aus den Weltdaten (Format: README → Die Insel). Gleiche Daten → gleiche Welt.
   * opt.offen: Set der offenen Gebiets-IDs (bestimmt, welche Absperrungen stehen)
   * opt.frei:  weitere Freiflächen [{ x, z, r }] ohne Bäume (z. B. Warenkisten und Paket-Orte der Aufträge)
   */
  function ausDaten(d, opt = {}) {
    const N = d.groesse || 96, H = d.hoehe || 24, W = d.wasser || 5;
    const welt = neueWelt(N, H, W);
    const offen = opt.offen || new Set();

    // Gebiete: Zeichen der Gebietskarte → Gebiet
    welt.gebiete = (d.gebiete || []).map(g => Object.assign({}, g));
    const nachZeichen = {};
    welt.gebiete.forEach((g, i) => { nachZeichen[g.zeichen] = i + 1; });
    const GK = new Uint8Array(N * N);
    const hoehe = new Int16Array(N * N);
    for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
      const zeile = (d.hoehen || [])[z] || '', gz = (d.gebietskarte || [])[z] || '';
      hoehe[z * N + x] = Math.max(1, ZIFFERN.indexOf(zeile[x] || '1'));
      GK[z * N + x] = nachZeichen[gz[x]] || 0;
    }
    welt.gebiet = (x, z) => {
      x = Math.floor(x); z = Math.floor(z);
      if (x < 0 || z < 0 || x >= N || z >= N) return null;
      const i = GK[z * N + x];
      return i ? welt.gebiete[i - 1].id : null;
    };

    // Ebnen unter Gebäuden, Bauplätzen (Rand 1 Block): Höhe = Wert aus den Daten oder Mittel der Fläche
    const belegt = new Uint8Array(N * N);
    const belege = (x0, z0, x1, z1) => { for (let z = Math.max(0, z0); z <= Math.min(N - 1, z1); z++) for (let x = Math.max(0, x0); x <= Math.min(N - 1, x1); x++) belegt[z * N + x] = 1; };
    function ebene(x0, z0, x1, z1, y) {
      if (!y) {
        let s = 0, n = 0;
        for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) if (x >= 0 && z >= 0 && x < N && z < N) { s += hoehe[z * N + x]; n++; }
        y = Math.max(W + 1, Math.round(s / Math.max(1, n)));
      }
      for (let z = z0 - 1; z <= z1 + 1; z++) for (let x = x0 - 1; x <= x1 + 1; x++) if (x >= 0 && z >= 0 && x < N && z < N) hoehe[z * N + x] = y;
      return y;
    }
    const flaeche = (o, v) => {                                    // Grundfläche eines Gebäudes oder Bauplatzes
      const b = (v && v.breite) || o.breite || 5, t = (v && v.tiefe) || o.tiefe || 5;
      const x0 = Math.round(o.x - (b - 1) / 2), z0 = Math.round(o.z - (t - 1) / 2);
      return { x0, z0, x1: x0 + b - 1, z1: z0 + t - 1, b, t };
    };
    const vorlagen = d.vorlagen || {};
    const bauten = (d.gebaeude || []).map(g => {
      const v = vorlagen[g.vorlage] || {};
      const f = flaeche(g, v);
      f.y = ebene(f.x0, f.z0, f.x1, f.z1, g.y);
      belege(f.x0 - 3, f.z0 - 3, f.x1 + 3, f.z1 + 3);
      return { g, v, f };
    });
    const plaetzeBau = (d.bauplaetze || []).map(b => {
      const f = flaeche(b);
      if (b.ebnen !== false) f.y = ebene(f.x0, f.z0, f.x1, f.z1, b.y);
      belege(f.x0 - 2, f.z0 - 2, f.x1 + 2, f.z1 + 2);
      return { b, f };
    });

    // Gelände füllen: Sand an der Küste, Stein an Steilkanten, sonst Gras
    for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
      const h = hoehe[z * N + x];
      let steil = 0;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([a, c]) => {
        const nx = x + a, nz = z + c;
        if (nx >= 0 && nz >= 0 && nx < N && nz < N) steil = Math.max(steil, h - hoehe[nz * N + nx]);
      });
      const strand = h <= W + 1;
      const oben = strand ? BLOCK.SAND : (steil >= 3 || h >= 17 ? BLOCK.STEIN : BLOCK.GRAS);
      for (let y = 0; y < h; y++) {
        let b = BLOCK.STEIN;
        if (y === h - 1) b = oben;
        else if (y >= h - 4) b = strand ? BLOCK.SAND : (oben === BLOCK.STEIN ? BLOCK.STEIN : BLOCK.ERDE);
        welt.set(x, y, z, b);
      }
      for (let y = h; y < W; y++) welt.set(x, y, z, BLOCK.WASSER);
    }
    const oberste = (x, z) => hoehe[z * N + x];                   // Stehhöhe auf dem Gelände

    // Wege (Breite in Blöcken) – nur auf Land
    (d.wege || []).forEach(w => {
      const r = (w.breite || 2) / 2;
      linie(w.punkte, (x, z) => {
        for (let dz = -Math.ceil(r); dz <= Math.ceil(r); dz++) for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) {
          const cx = Math.floor(x + dx), cz = Math.floor(z + dz);
          if (Math.hypot(cx + .5 - x, cz + .5 - z) > r + .1 || cx < 0 || cz < 0 || cx >= N || cz >= N) continue;
          const y = oberste(cx, cz) - 1;
          const b = welt.get(cx, y, cz);
          if (b === BLOCK.GRAS || b === BLOCK.SAND || b === BLOCK.STEIN) welt.set(cx, y, cz, blockNr(w.block, BLOCK.WEG));
          belege(cx - 2, cz - 2, cx + 2, cz + 2);                  // keine Baumkronen über dem Weg
        }
      });
    });

    // Stege über das Wasser (Planken auf Höhe der Wasserlinie)
    (d.stege || []).forEach(s => {
      const r = (s.breite || 2) / 2;
      linie([s.von, s.bis], (x, z) => {
        for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
          const cx = Math.floor(x + dx), cz = Math.floor(z + dz);
          if (Math.abs(cx + .5 - x) > r || Math.abs(cz + .5 - z) > r) continue;
          if (welt.nass(cx, W - 1, cz) || !welt.get(cx, W - 1, cz)) welt.set(cx, W - 1, cz, BLOCK.PLANKE);
          belegt[Math.max(0, Math.min(N - 1, cz)) * N + Math.max(0, Math.min(N - 1, cx))] = 1;
        }
      });
    });

    // Gebäude
    welt.orte.gebaeude = [];
    bauten.forEach(({ g, v, f }) => {
      if (v.typ === 'brunnen') brunnen(welt, Math.round(g.x), f.y, Math.round(g.z));
      else gebaeude(welt, f, f.y, Object.assign({}, v, g), g.tuer || 'sued');
      const [ax, az] = SEITEN[g.tuer || 'sued'];
      const tx = ax ? (ax > 0 ? f.x1 : f.x0) : Math.round(g.x), tz = az ? (az > 0 ? f.z1 : f.z0) : Math.round(g.z);
      welt.orte.gebaeude.push({ id: g.id, gebiet: welt.gebiet(g.x, g.z), x: g.x + .5, z: g.z + .5, y: f.y,
        vorTuer: { x: tx + ax * 2.2 + .5, z: tz + az * 2.2 + .5, blick: Math.atan2(ax, az) } });
    });

    // Bauplätze: eben, Pflöcke an den Ecken (ab Etappe 4 wird hier gebaut)
    welt.orte.bauplaetze = plaetzeBau.map(({ b, f }) => {
      const y = f.y || oberste(f.x0, f.z0);
      [[f.x0 - 1, f.z0 - 1], [f.x1 + 1, f.z0 - 1], [f.x0 - 1, f.z1 + 1], [f.x1 + 1, f.z1 + 1]].forEach(([x, z]) => welt.set(x, y, z, BLOCK.PFLOCK));
      // Lücke je Zeile: Stellen unter der Bauhöhe (z. B. der Fluss unter der Brücke)
      const luecken = {};
      for (let z = f.z0; z <= f.z1; z++) {
        luecken[z] = [];
        for (let x = f.x0; x <= f.x1; x++) if (oberste(x, z) < y) luecken[z].push(x);
      }
      return { id: b.id, gebiet: b.gebiet || welt.gebiet(b.x, b.z), art: b.art || '', name: b.name || '', hoehe: b.hoehe || 3,
        vorrat: b.vorrat || '', plan: b.plan || null, material: b.material || null, frei: b.frei || [], verbrauch: b.verbrauch || {},
        luecken, x0: f.x0, z0: f.z0, x1: f.x1, z1: f.z1, y };
    });

    // Schilder: Pfosten mit Brett; Text steht in den Daten
    welt.orte.schilder = (d.schilder || []).map(s => {
      const x = Math.floor(s.x), z = Math.floor(s.z), y = oberste(x, z);
      welt.set(x, y, z, BLOCK.STAMM); welt.set(x, y + 1, z, BLOCK.SCHILD);
      belegt[z * N + x] = 1;
      return { id: s.id, x: x + .5, z: z + .5, y, text: String(s.text || '') };
    });

    // Plätze für Bewohner (an einem Gebäude oder frei)
    welt.orte.plaetze = (d.plaetze || []).map(p => {
      const g = p.gebaeude && welt.orte.gebaeude.find(o => o.id === p.gebaeude);
      const ort = g ? g.vorTuer : { x: p.x + .5, z: p.z + .5, blick: p.blick || 0 };
      return { id: p.id, gebiet: welt.gebiet(ort.x, ort.z), x: ort.x, z: ort.z, blick: p.blick !== undefined ? p.blick : ort.blick };
    });
    welt.orte.plaetze.forEach(p => { const x = Math.floor(p.x), z = Math.floor(p.z); belege(x - 2, z - 2, x + 2, z + 2); });

    // Freiflächen (z. B. Dorfplatz): dort wachsen keine Bäume
    (d.frei || []).concat(opt.frei || []).forEach(f => { const r = f.r || 4; belege(Math.floor(f.x - r), Math.floor(f.z - r), Math.ceil(f.x + r), Math.ceil(f.z + r)); });

    // Bäume: wiederholbarer Zufall, Dichte je Gebiet, nie auf Wegen und dicht an Gebäuden
    const bd = d.baeume || {};
    const rnd = zufall(seedZahl(bd.seed || 'insel-baeume'));
    for (let z = 2; z < N - 2; z++) for (let x = 2; x < N - 2; x++) {
      const r = rnd();
      const geb = welt.gebiet(x, z);
      const dichte = geb && bd.dichte ? (bd.dichte[geb] || 0) : 0;
      if (belegt[z * N + x] || r > dichte) continue;
      const h = oberste(x, z);
      if (welt.get(x, h - 1, z) !== BLOCK.GRAS || h + 7 > H) continue;
      baum(welt, x, h, z, rnd);
      belege(x - 2, z - 2, x + 2, z + 2);
    }

    // Absperrungen: Zaun, solange das Gebiet zu ist (welt.absperren baut sie auf und ab)
    const sperren = (d.absperrungen || []).map(a => {
      const zellen = [];
      linie(a.punkte, (x, z) => {
        const cx = Math.floor(x), cz = Math.floor(z);
        if (zellen.some(c => c.x === cx && c.z === cz)) return;
        // Zaun mindestens 2 hoch und bis zur Stehhöhe des höchsten Geländes im Umkreis von 2 Blöcken –
        // sonst wird er von einem höheren Ufer aus zum Boden, über den man hinwegläuft
        const y = Math.max(W, oberste(cx, cz));
        let oben = y + 1;
        for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
          const nx = cx + dx, nz = cz + dz;
          if (nx >= 0 && nz >= 0 && nx < N && nz < N) oben = Math.max(oben, oberste(nx, nz));
        }
        zellen.push({ x: cx, z: cz, y, hoch: oben - y + 1 });
      });
      return { gebiet: a.gebiet, zellen };
    });
    /** Zäune setzen bzw. entfernen; → Liste der geänderten Weltstücke [{cx, cz}] */
    welt.absperren = offeneGebiete => {
      const geaendert = new Map();
      sperren.forEach(s => {
        const zu = !offeneGebiete.has(s.gebiet);
        s.zellen.forEach(c => {
          for (let dy = 0; dy < c.hoch; dy++) {
            const ist = welt.get(c.x, c.y + dy, c.z);
            const soll = zu ? BLOCK.ZAUN : (ist === BLOCK.ZAUN ? BLOCK.LUFT : ist);
            if (ist !== soll && (ist === BLOCK.LUFT || ist === BLOCK.ZAUN)) {
              welt.set(c.x, c.y + dy, c.z, soll);
              const cx = Math.floor(c.x / STUECK), cz = Math.floor(c.z / STUECK);
              geaendert.set(cx + ',' + cz, { cx, cz });
            }
          }
        });
      });
      return [...geaendert.values()];
    };
    welt.absperren(offen);

    welt.faehre = d.faehre || null;
    const st = d.start || {};
    welt.start = { x: (st.x || N / 2) + .5, z: (st.z || N / 2) + .5, blick: st.blick || 0 };
    return welt;
  }

  /** Punkte einer Linie in Schritten von einem halben Block abgehen */
  function linie(punkte, fn) {
    if (!Array.isArray(punkte) || !punkte.length) return;
    if (punkte.length === 1) { fn(punkte[0][0] + .5, punkte[0][1] + .5); return; }
    for (let i = 0; i < punkte.length - 1; i++) {
      const [ax, az] = punkte[i], [bx, bz] = punkte[i + 1];
      const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) * 2));
      for (let k = 0; k <= n; k++) fn(ax + (bx - ax) * k / n + .5, az + (bz - az) * k / n + .5);
    }
  }

  /** Gebäude nach Vorlage: Wände, Ecken, Fenster, Tür, Stufendach. f = Grundfläche, y = Boden */
  function gebaeude(welt, f, y, v, tuer) {
    const hoch = v.hoehe || 3;
    const wand = blockNr(v.wand, BLOCK.PUTZ), ecke = blockNr(v.ecke, BLOCK.STAMM), dach = blockNr(v.dach, BLOCK.DACH);
    for (let z = f.z0; z <= f.z1; z++) for (let x = f.x0; x <= f.x1; x++) {
      for (let yy = y - 4; yy < y - 1; yy++) if (!welt.get(x, yy, z) || welt.nass(x, yy, z)) welt.set(x, yy, z, BLOCK.STEIN);
      welt.set(x, y - 1, z, blockNr(v.boden, BLOCK.PLANKE));
      const rx = x === f.x0 || x === f.x1, rz = z === f.z0 || z === f.z1;
      for (let h = 0; h < hoch; h++) welt.set(x, y + h, z, rx || rz ? (rx && rz ? ecke : wand) : BLOCK.LUFT);
    }
    // Fenster in der Mitte jeder Wand (mittlere Höhe), Tür in der Wand „tuer“
    const mx = Math.round((f.x0 + f.x1) / 2), mz = Math.round((f.z0 + f.z1) / 2);
    const mitte = { nord: [mx, f.z0], sued: [mx, f.z1], west: [f.x0, mz], ost: [f.x1, mz] };
    Object.keys(mitte).forEach(s => {
      const [x, z] = mitte[s];
      if (s === tuer) { welt.set(x, y, z, BLOCK.LUFT); welt.set(x, y + 1, z, BLOCK.LUFT); }
      else welt.set(x, y + 1, z, BLOCK.FENSTER);
    });
    // Dach: Stufen, die nach innen kleiner werden (1 Block Überstand)
    for (let s = 0; ; s++) {
      const x0 = f.x0 - 1 + s, x1 = f.x1 + 1 - s, z0 = f.z0 - 1 + s, z1 = f.z1 + 1 - s;
      if (x0 > x1 || z0 > z1) break;
      for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) welt.set(x, y + hoch + s, z, dach);
    }
  }

  /** Brunnen: Steinring mit Wasser, vier Pfosten, kleines Dach */
  function brunnen(welt, x, y, z) {
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      if (dx || dz) welt.set(x + dx, y, z + dz, BLOCK.STEIN);
      else welt.set(x, y - 1, z, BLOCK.BRUNNEN);
    }
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([dx, dz]) => welt.set(x + dx, y + 1, z + dz, BLOCK.STAMM));
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) welt.set(x + dx, y + 2, z + dz, BLOCK.DACH);
  }

  // ── Zeichnen: Weltstücke backen ─────────────────────────
  // Flächen gegen den Uhrzeigersinn von außen (Reihenfolge der Ecken: 0,1,2 / 2,1,3)
  const FLAECHEN = [
    { n: [-1, 0, 0], e: [[0, 1, 0], [0, 0, 0], [0, 1, 1], [0, 0, 1]] },
    { n: [1, 0, 0], e: [[1, 1, 1], [1, 0, 1], [1, 1, 0], [1, 0, 0]] },
    { n: [0, -1, 0], e: [[1, 0, 1], [0, 0, 1], [1, 0, 0], [0, 0, 0]] },
    { n: [0, 1, 0], e: [[0, 1, 1], [1, 1, 1], [0, 1, 0], [1, 1, 0]] },
    { n: [0, 0, -1], e: [[1, 0, 0], [0, 0, 0], [1, 1, 0], [0, 1, 0]] },
    { n: [0, 0, 1], e: [[0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]] },
  ];
  const farbCache = {};
  function rgb(hex) {
    if (farbCache[hex]) return farbCache[hex];
    const n = parseInt(hex.slice(1), 16);
    return (farbCache[hex] = [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]);
  }

  /** Geometrie eines Weltstücks (nur Flächen, an die Luft oder Wasser grenzt). */
  function stueckGeometrie(T, welt, cx, cz) {
    const pos = [], nor = [], col = [], ind = [];
    const x0 = cx * STUECK, z0 = cz * STUECK;
    for (let y = 0; y < welt.H; y++) for (let z = z0; z < z0 + STUECK; z++) for (let x = x0; x < x0 + STUECK; x++) {
      const b = welt.get(x, y, z);
      const a = ART[b];
      if (!a || a.unsichtbar) continue;
      const hell = .93 + h2(x, y * 131 + z, 7) * .12;               // leichte Unruhe je Block (Klötzchen-Stil)
      for (let f = 0; f < 6; f++) {
        const F = FLAECHEN[f];
        const nb = welt.get(x + F.n[0], y + F.n[1], z + F.n[2]);
        if (y + F.n[1] < 0) continue;
        if (!ART[nb].unsichtbar && nb !== BLOCK.LAUB) continue;      // verdeckt
        if (nb === BLOCK.LAUB && b === BLOCK.LAUB) continue;
        const c = rgb(f === 3 ? a.oben : a.seite);
        const s = hell * (f === 2 ? .7 : 1);
        const i0 = pos.length / 3;
        for (let k = 0; k < 4; k++) {
          const e = F.e[k];
          pos.push(x + e[0], y + e[1], z + e[2]);
          nor.push(F.n[0], F.n[1], F.n[2]);
          // Seitenflächen unten etwas dunkler (wirkt wie weiches Licht von oben)
          const unten = f !== 3 && f !== 2 && e[1] === 0 ? .88 : 1;
          col.push(c[0] * s * unten, c[1] * s * unten, c[2] * s * unten);
        }
        ind.push(i0, i0 + 1, i0 + 2, i0 + 2, i0 + 1, i0 + 3);
      }
    }
    if (!ind.length) return null;
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
    g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    g.setIndex(pos.length / 3 > 65535 ? new T.Uint32BufferAttribute(ind, 1) : new T.Uint16BufferAttribute(ind, 1));
    g.computeBoundingSphere();
    return g;
  }

  /**
   * Baut die Szene der Welt: alle Weltstücke, Meer und Meeresgrund.
   * sicht(x, z, weite): Stücke außerhalb der Sichtweite ausblenden (spart Draw-Calls).
   */
  function szene(T, welt) {
    const gruppe = new T.Group();
    const mat = new T.MeshLambertMaterial({ vertexColors: true });
    const anz = Math.ceil(welt.N / STUECK);
    const stuecke = [];
    function neuBauen(cx, cz) {
      let s = stuecke.find(t => t.cx === cx && t.cz === cz);
      if (!s) { s = { cx, cz, mesh: null }; stuecke.push(s); }
      if (s.mesh) { gruppe.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh = null; }
      const g = stueckGeometrie(T, welt, cx, cz);
      if (g) { s.mesh = new T.Mesh(g, mat); s.mesh.matrixAutoUpdate = false; gruppe.add(s.mesh); }
      return s;
    }
    for (let cz = 0; cz < anz; cz++) for (let cx = 0; cx < anz; cx++) neuBauen(cx, cz);

    // Meer: eine große Fläche knapp unter der Wasserlinie; darunter heller Grund
    const meer = new T.Mesh(new T.PlaneGeometry(600, 600), new T.MeshLambertMaterial({ color: '#3b9be0', transparent: true, opacity: .78 }));
    meer.rotation.x = -Math.PI / 2;
    meer.position.set(welt.N / 2, welt.W - .15, welt.N / 2);
    meer.renderOrder = 2;
    gruppe.add(meer);
    const grund = new T.Mesh(new T.PlaneGeometry(600, 600), new T.MeshLambertMaterial({ color: '#c9b98a' }));
    grund.rotation.x = -Math.PI / 2;
    grund.position.set(welt.N / 2, .5, welt.N / 2);
    gruppe.add(grund);

    function sicht(x, z, weite) {
      const r = weite + STUECK * .75;
      stuecke.forEach(s => {
        if (!s.mesh) return;
        const mx = (s.cx + .5) * STUECK, mz = (s.cz + .5) * STUECK;
        s.mesh.visible = Math.hypot(mx - x, mz - z) < r;
      });
    }
    return { gruppe, stuecke, neuBauen, sicht, meer };
  }

  /**
   * Figur oder Modell „backen“: alle einfarbigen Lambert-Klötze zu EINEM Mesh mit Vertex-Farben,
   * Besonderes (Texturen, Gesicht, durchsichtig, leuchtend) bleibt als eigenes Mesh.
   * Für Dinge, die sich nur als Ganzes bewegen (Bewohner, die stehen und sich drehen).
   * → neue Gruppe im Koordinatensystem von obj
   */
  function backe(T, obj) {
    obj.updateMatrixWorld(true);
    const inv = new T.Matrix4().copy(obj.matrixWorld).invert();
    const out = new T.Group(), bunt = [];
    const m4 = new T.Matrix4();
    obj.traverse(o => {
      if (!o.isMesh || !o.visible) return;
      let sichtbar = true;
      for (let p = o.parent; p && p !== obj; p = p.parent) if (!p.visible) sichtbar = false;
      if (!sichtbar) return;
      m4.multiplyMatrices(inv, o.matrixWorld);
      const mat = o.material;
      const einfach = mat && !Array.isArray(mat) && mat.isMeshLambertMaterial && !mat.map && !mat.transparent && !mat.vertexColors
        && !(mat.emissive && (mat.emissive.r || mat.emissive.g || mat.emissive.b)) && mat.visible !== false;
      if (einfach) {
        const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
        g.applyMatrix4(m4);
        g.userData.farbe = mat.color;
        bunt.push(g);
      } else {
        const k = new T.Mesh(o.geometry, mat);
        k.matrixAutoUpdate = false;
        k.matrix.copy(m4);
        out.add(k);
      }
    });
    if (bunt.length) {
      let n = 0;
      bunt.forEach(g => { n += g.attributes.position.count; });
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
      let o = 0;
      bunt.forEach(g => {
        const k = g.attributes.position.count, c = g.userData.farbe;
        pos.set(g.attributes.position.array, o * 3);
        nor.set(g.attributes.normal.array, o * 3);
        for (let i = 0; i < k; i++) { col[(o + i) * 3] = c.r; col[(o + i) * 3 + 1] = c.g; col[(o + i) * 3 + 2] = c.b; }
        o += k;
        g.dispose();
      });
      const bg = new T.BufferGeometry();
      bg.setAttribute('position', new T.BufferAttribute(pos, 3));
      bg.setAttribute('normal', new T.BufferAttribute(nor, 3));
      bg.setAttribute('color', new T.BufferAttribute(col, 3));
      bg.computeBoundingSphere();
      out.add(new T.Mesh(bg, backe.mat || (backe.mat = new T.MeshLambertMaterial({ vertexColors: true }))));
    }
    return out;
  }

  window.LernInselWelt = { BLOCK, ART, STUECK, ausDaten, erzeuge, szene, backe };
})();
