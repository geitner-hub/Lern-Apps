// ═══════════════════════════════════════════════════════
//  Lernwelt – journey-welt.js   (English Journey Year 6: der 3D-Weg, Etappe 3 – Prototyp)
//
//  Ein Ort im Klötzchen-Stil der Pass-Figur mit einem gewundenen Weg und den Stationen einer Unit.
//  Station antippen → die Figur läuft auf dem Weg hin, die Kamera folgt weich. Kein Joystick.
//  Gespielt wird woanders (apps/englisch/english-journey.html öffnet die Übung); hier gibt es nur Bild und Bewegung.
//
//  Braucht: avatar3d.js (LernAvatar.figur, lädt vendor/three.min.js wie RUN!). Keine eigenen Speicher-Schlüssel.
//
//  Für ältere Schul-iPads:
//    - Ort als wenige zusammengeführte Meshes mit Vertex-Farben (Welt 1, je Station ein Wahrzeichen, Wasser, Wolken, Weg)
//    - DPR höchstens 1,5, kein Post-Processing, Schatten nur von der Sonne, Schattenkarte nur neu, wenn sich die Figur bewegt
//    - volle Bildrate nur bei Bewegung (Laufen, Kamera, Jubel); sonst ~15 Bilder/s für Wasser, Wolken, Möwen;
//      „Bewegung reduzieren“ → nur noch bei Änderungen zeichnen, Laufen als kurzer Sprung
//
//  API (window.LernJourneyWelt):
//    start(host, o) → Promise(welt)
//      o = { figur (LernAvatar.figur), szene: 'hafen', stationen: [{ id, nr, titel, ort, art, zustand }], aktuell: id,
//            onTippen(id) }      zustand: 'zu' | 'offen' | 'gemeistert' | 'bau' (wird gebaut), dazu optional naechste: true
//    welt.zustand(stationen)  Zustände neu setzen (Farben, Schilder, Flaggen; Wahrzeichen färben sich bei „gemeistert“)
//    welt.laufeZu(id)         → Promise, sobald die Figur angekommen ist
//    welt.zeige(id)           Kamera zur Station (Figur bleibt stehen)
//    welt.jubel()             Figur jubelt (wie der Avatar-Auftritt im Pass)
//    welt.stop()              alles aufräumen
//    welt.info()              Draw Calls, Dreiecke, DPR des letzten Bildes (Diagnose auf dem iPad)
//  Neue Orte: Eintrag in SZENEN (Wegpunkte, Plätze der Stationen, Bau-Funktion).
// ═══════════════════════════════════════════════════════

(function () {
  'use strict';
  if (window.LernJourneyWelt) return;

  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FIGUR_SKALA = 0.14;           // Pass-Figur ist ~31 hoch → ~4,3 Einheiten
  const TEMPO = 9;                    // Einheiten pro Sekunde beim Laufen
  const IDLE_MS = 66;                 // Ruhe-Takt (~15 Bilder/s)

  let T = null;

  // ── Farben ─────────────────────────────────────────────
  const C = {
    gras: 0x8cc66a, gras2: 0x7dbb5f, gras3: 0x9bd176, kai: 0xd9c9a8, kai2: 0xcdbb97, stein: 0xa9a196, stein2: 0x948b80,
    mauer: 0x8f8678, weg: 0xf0d9a6, weg2: 0xe6caa0, holz: 0x9a6b43, holz2: 0x7d5434, dach: 0x5b6475, dach2: 0x6e4a3f,
    fenster: 0x30405a, weiss: 0xf6f1e7, rot: 0xd9534f, blau: 0x4f86c6, gelb: 0xf2c94c, mint: 0x9fd8c4, rosa: 0xf1b5b0,
    creme: 0xf3e3c3, hellblau: 0xa9cfe8, gruen: 0x4f9d69, laub: 0x5aa85a, laub2: 0x4b9650, stamm: 0x7a5236, orange: 0xf08a4b,
    gold: 0xe6a817, indigo: 0x6366f1, wasser: 0x3fa6c8, sand: 0xead7a4,
  };

  // ── Baukasten: Klötze zu EINER Geometrie mit Vertex-Farben ──
  function Bau() {
    const pos = [], nor = [], col = [], idx = [];
    const c3 = new T.Color();
    const F = [   // je Seite: Normale und vier Ecken (Einheitswürfel 0..1)
      [[1, 0, 0], [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]]], [[-1, 0, 0], [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]]],
      [[0, 1, 0], [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]]], [[0, -1, 0], [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]]],
      [[0, 0, 1], [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]]], [[0, 0, -1], [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]]],
    ];
    return {
      /** Klotz: Mitte unten bei (x, y, z), Größe w × h × d, Farbe, optional Drehung um y (ry) und ohne Unterseite */
      box(x, y, z, w, h, d, farbe, ry = 0) {
        c3.setHex(farbe);
        const cs = Math.cos(ry), sn = Math.sin(ry);
        F.forEach(([n, ecken], fi) => {
          if (fi === 3 && y <= 0.01) return;                  // Unterseite am oder im Boden sieht niemand
          const b = pos.length / 3;
          const hell = fi === 2 ? 1 : fi === 4 || fi === 0 ? 0.93 : 0.86;   // leichte Schattierung je Seite (wirkt wie Klötzchen)
          ecken.forEach(([ex, ey, ez]) => {
            const lx = (ex - 0.5) * w, lz = (ez - 0.5) * d;
            pos.push(x + lx * cs + lz * sn, y + ey * h, z - lx * sn + lz * cs);
            nor.push(n[0] * cs + n[2] * sn, n[1], -n[0] * sn + n[2] * cs);
            col.push(c3.r * hell, c3.g * hell, c3.b * hell);
          });
          idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
        });
      },
      leer: () => !pos.length,
      geometrie() {
        const g = new T.BufferGeometry();
        g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
        g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
        g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
        g.setIndex(idx);
        g.computeBoundingSphere();
        return g;
      },
    };
  }
  const zufall = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(7);   // feste Zufallsfolge → jeder sieht denselben Ort
  const variiere = (farbe, st = 0.06) => { const c = new T.Color(farbe), k = 1 + (zufall() - 0.5) * 2 * st; return c.setRGB(Math.min(1, c.r * k), Math.min(1, c.g * k), Math.min(1, c.b * k)).getHex(); };

  // Bausteine, die mehrere Orte brauchen können
  function haus(B, x, z, w, d, h, wand, dach, ry = 0, fenster = true) {
    B.box(x, 0, z, w, h, d, wand, ry);
    for (let i = 0; i < 3; i++) B.box(x, h + i * 0.7, z, w + 0.4 - i * (w / 3.2), 0.7, d + 0.4, i ? dach : variiere(dach, 0.03), ry);   // Stufendach
    if (!fenster) return;
    const cs = Math.cos(ry), sn = Math.sin(ry), n = Math.max(1, Math.round(w / 2.4));
    for (let i = 0; i < n; i++) {
      const lx = (i - (n - 1) / 2) * (w / n), fz = d / 2 + 0.06;
      for (let s = 0; s < Math.floor(h / 2.6); s++) B.box(x + lx * cs + fz * sn, 1 + s * 2.6, z - lx * sn + fz * cs, 0.9, 1.1, 0.12, C.fenster, ry);
    }
  }
  function baum(B, x, z, s = 1) {
    B.box(x, 0, z, 0.6 * s, 1.6 * s, 0.6 * s, C.stamm);
    B.box(x, 1.4 * s, z, 2.6 * s, 1.4 * s, 2.6 * s, variiere(C.laub));
    B.box(x, 2.8 * s, z, 1.8 * s, 1.1 * s, 1.8 * s, variiere(C.laub2));
    B.box(x, 3.9 * s, z, 0.9 * s, 0.7 * s, 0.9 * s, variiere(C.laub));
  }
  function laterne(B, x, z) { B.box(x, 0, z, 0.25, 3.2, 0.25, 0x3b3f4a); B.box(x, 3.2, z, 0.6, 0.6, 0.6, 0xffe9a8); B.box(x, 3.8, z, 0.8, 0.15, 0.8, 0x3b3f4a); }
  function poller(B, x, z) { B.box(x, 0, z, 0.5, 0.7, 0.5, 0x3b3f4a); B.box(x, 0.7, z, 0.65, 0.18, 0.65, 0x3b3f4a); }
  function kiste(B, x, z, ry = 0) { B.box(x, 0, z, 1.1, 1, 1.1, variiere(C.holz, 0.1), ry); B.box(x, 1, z, 1.2, 0.08, 1.2, C.holz2, ry); }
  function boot(B, x, z, farbe, ry = 0, l = 5) {
    const cs = Math.cos(ry), sn = Math.sin(ry), p = (lx, lz) => [x + lx * cs + lz * sn, z - lx * sn + lz * cs];
    let q = p(0, 0); B.box(q[0], 0, q[1], 1.8, 0.8, l, farbe, ry);
    q = p(0, l / 2 + 0.4); B.box(q[0], 0.2, q[1], 1.1, 0.6, 0.8, farbe, ry);
    q = p(0, 0); B.box(q[0], 0.8, q[1], 1.9, 0.15, l + 0.1, C.weiss, ry);
    q = p(0, -l / 5); B.box(q[0], 0.95, q[1], 1.3, 1, 1.4, C.weiss, ry); B.box(q[0], 1.95, q[1], 1.5, 0.15, 1.6, C.rot, ry);
  }

  // ── Orte ───────────────────────────────────────────────
  //  plaetze: Stellen der Stationen am Weg (x, z) in Reihenfolge; seite: wohin Sockel und Wahrzeichen vom Weg aus stehen.
  //  weg: Wegpunkte (x, z) – der Weg geht durch alle Plätze. wahrzeichen[i](B, x, z): wird grau, bis Station i gemeistert ist.
  const SZENEN = {
    hafen: {
      himmel: ['#7cc3ef', '#bfe3f7', '#fde9c8'], nebel: 0xf3e6cf,
      start: [-74, 6],
      weg: [[-74, 6], [-66, 10], [-58, 12], [-51, 8], [-44, 2], [-37, 6], [-30, 11], [-23, 9], [-16, 4], [-9, 8], [-2, 12],
            [3, 4], [10, -6], [17, -6], [24, -2], [30, 5], [36, 10], [43, 7], [52, 2], [58, -2]],
      plaetze: [[-58, 12], [-44, 2], [-30, 11], [-16, 4], [-2, 12], [10, -6], [24, -2], [36, 10], [52, 2]],
      seite: [[0, -1], [0, -1], [0, -1], [0, -1], [0, 1], [0, -1], [0, -1], [0, 1], [1, -1]],
      kai: 18,                        // Kaimauer bei z = 18, südlich davon das Meer
      bauen: baueHafen,
      wahrzeichen: [
        (B, x, z) => { kiste(B, x - 2.5, z - 1, 0.2); kiste(B, x - 1.3, z - 1.4); kiste(B, x - 1.9, z - 1.2, 0.5); B.box(x + 2.4, 0, z - 0.6, 1, 1.4, 1, C.blau); B.box(x + 2.4, 1.4, z - 0.6, 1.1, 0.12, 1.1, C.weiss); },
        (B, x, z) => [-3, 0, 3].forEach((dx, i) => {   // Fischmarkt: Stände mit gestreiften Markisen
          B.box(x + dx, 0, z - 2, 2.4, 1.1, 1.4, C.holz); B.box(x + dx, 1.1, z - 2, 2.4, 0.2, 1.4, C.weiss);
          [-0.9, 0.9].forEach(px => B.box(x + dx + px, 1.1, z - 2.6, 0.15, 1.8, 0.15, C.holz2));
          [0, 1, 2, 3].forEach(s => B.box(x + dx - 0.9 + s * 0.6, 2.9, z - 2.1, 0.6, 0.25, 1.8, s % 2 ? C.weiss : [C.rot, C.blau, C.gruen][i]));
        }),
        (B, x, z) => { haus(B, x, z - 4, 6, 4, 3.6, C.mint, C.dach2); [-2.2, 0, 2.2].forEach(dx => { B.box(x + dx, 0, z - 1, 0.2, 2.2, 0.2, 0xffffff); B.box(x + dx, 2.2, z - 1, 1.8, 0.2, 1.8, [C.rot, C.gelb, C.blau][(dx + 2.2) / 2.2]); B.box(x + dx, 0, z - 0.2, 0.9, 0.7, 0.9, C.holz); }); },
        (B, x, z) => { B.box(x, 0, z - 2.5, 1.6, 0.8, 1.6, C.stein2); B.box(x, 0.8, z - 2.5, 0.9, 6.5, 0.9, C.gelb); B.box(x + 2.5, 7.3, z - 2.5, 7, 0.8, 0.8, C.gelb); B.box(x - 0.6, 6.8, z - 2.5, 1.6, 1.2, 1.2, C.orange); B.box(x + 5.2, 4.5, z - 2.5, 0.12, 2.8, 0.12, 0x333333); B.box(x + 5.2, 3.9, z - 2.5, 1.2, 0.8, 1.2, C.blau); },
        (B, x, z) => { for (let i = 0; i < 6; i++) B.box(x, 0.35, z + 4 + i * 1.6, 3, 0.25, 1.4, i % 2 ? C.holz : C.holz2); [-1.4, 1.4].forEach(dx => [0, 1, 2].forEach(k => B.box(x + dx, -1.6, z + 5 + k * 3.4, 0.35, 2.1, 0.35, C.holz2))); },
        (B, x, z) => {   // Schule: rotes Backsteinhaus mit Uhr und Glockentürmchen
          haus(B, x, z - 8, 14, 6, 6, 0xc0634f, C.dach, 0); B.box(x, 0, z - 4.9, 2.2, 2.8, 0.3, C.holz2);
          B.box(x, 8.1, z - 8, 2.4, 2.2, 2.4, C.creme); B.box(x, 10.3, z - 8, 2.8, 0.5, 2.8, C.dach); B.box(x, 10.8, z - 8, 1.6, 0.6, 1.6, C.dach);
          B.box(x, 8.6, z - 6.75, 1.4, 1.4, 0.1, C.weiss); B.box(x, 9.2, z - 6.68, 0.12, 0.6, 0.08, 0x222222);
        },
        (B, x, z) => { B.box(x - 3, 0, z - 3, 0.3, 3.6, 0.3, 0xdddddd); B.box(x - 3, 3.4, z - 2.6, 1.4, 1, 0.12, C.weiss); B.box(x - 3, 3.3, z - 2.2, 0.9, 0.08, 0.9, C.orange);
                         [1, 3].forEach(dx => { B.box(x + dx, 0.5, z - 3, 1.6, 0.15, 0.6, C.holz); B.box(x + dx, 0, z - 3, 0.2, 0.5, 0.5, C.holz2); });
                         B.box(x, 0.02, z - 1.5, 7, 0.04, 0.12, C.weiss); B.box(x + 1, 0.02, z - 1.2, 0.8, 0.04, 0.8, C.gelb); },
        (B, x, z) => { B.box(x, 0.6, z + 2.6, 2.6, 0.2, 0.8, C.holz); B.box(x, 0.8, z + 3, 2.6, 0.8, 0.15, C.holz); [-1.1, 1.1].forEach(dx => B.box(x + dx, 0, z + 2.6, 0.2, 0.6, 0.7, 0x3b3f4a)); laterne(B, x + 2.4, z + 2.8);
                         B.box(x - 2.4, 0, z + 2.6, 0.9, 0.7, 0.9, C.rot); B.box(x - 2.4, 0.7, z + 2.6, 0.5, 0.5, 0.5, C.laub); },
        (B, x, z) => {   // Smeaton's Tower: rot-weißer Leuchtturm auf dem Hoe
          B.box(x + 3, 0, z - 3, 5, 0.8, 5, C.stein);
          for (let i = 0; i < 8; i++) { const w = 3.2 - i * 0.18; B.box(x + 3, 0.8 + i * 1.2, z - 3, w, 1.2, w, i % 2 ? C.weiss : C.rot); }
          B.box(x + 3, 10.4, z - 3, 2.6, 0.3, 2.6, 0x3b3f4a); B.box(x + 3, 10.7, z - 3, 1.8, 1.4, 1.8, 0xfff2b0); B.box(x + 3, 12.1, z - 3, 2.2, 0.4, 2.2, C.rot); B.box(x + 3, 12.5, z - 3, 1.2, 0.6, 1.2, C.rot);
        },
      ],
    },
  };

  function baueHafen(B, S) {
    const kai = S.kai;
    // Boden: Klötze 4 × 4 – Kai (gepflastert) am Wasser, dahinter Gras; leicht unterschiedlich gefärbt
    for (let x = -96; x < 96; x += 4) for (let z = -64; z < kai; z += 4) {
      const amKai = z >= kai - 12 && x > -84 && x < 48;
      B.box(x + 2, -2, z + 2, 4, 2, 4, amKai ? variiere(C.kai, 0.03) : variiere(C.gras, 0.035));
    }
    B.box(0, -4, kai + 0.5, 192, 4, 1, C.mauer);              // Kaimauer
    for (let x = -94; x < 96; x += 3) B.box(x, -3.9, kai + 1.02, 2.8, 0.5, 0.06, C.stein2);
    for (let x = -80; x < 48; x += 6) poller(B, x, kai - 0.6);
    for (let x = -70; x < 48; x += 16) laterne(B, x + 5, kai - 2.2);
    // Barbican: bunte Reihenhäuser im Norden, dahinter Hügel von Devon
    const wand = [C.creme, C.rosa, C.hellblau, C.mint, C.gelb, C.weiss];
    for (let x = -92, i = 0; x < 92; i++) { const w = 4.5 + (i % 3); if (x + w / 2 < -8 || x - w / 2 > 32) haus(B, x + w / 2, -22, w, 7, 5 + (i * 5 % 3), wand[i % wand.length], i % 4 ? C.dach : C.dach2); x += w + 0.2; }
    for (let x = -96; x < 96; x += 8) B.box(x + 4, -2, -46 - (x * 13 & 7), 8 + (x & 4), 4 + ((x * 3) & 3), 10, variiere(C.gras2, 0.08));
    for (let x = -100; x < 100; x += 14) B.box(x, -2, -62, 15, 8 + ((x * 7) & 5), 6, variiere(0x7fae6a, 0.06));
    [[-80, -10], [-70, -14], [-62, -6], [-36, -12], [-20, -14], [-6, -16], [38, -12], [46, -16], [62, -10], [70, -4], [78, -14], [64, 8], [74, 10], [-88, 2], [-86, 12]]
      .forEach(([x, z], i) => baum(B, x, z, 0.8 + (i % 3) * 0.15));
    // Grüner Hügel des Hoe hinter Smeaton's Tower
    B.box(66, 0, -4, 18, 1, 16, C.gras3); B.box(68, 1, -6, 12, 1, 10, C.gras);
  }

  // ── Schilder (lesbar, immer zur Kamera) ─────────────────
  const ICON = { woerter: '📘', grammatik: '✏️', anwenden: '🛠️', finale: '🏁' };
  const ZUSTAND = { zu: '🔒 noch zu', offen: '▶ offen', gemeistert: '⭐ gemeistert', bau: '🚧 wird gebaut' };
  function schildTextur(st, alt) {
    const c = alt && alt.image || document.createElement('canvas'); c.width = 512; c.height = 224;
    const x = c.getContext('2d'), zu = st.zustand === 'zu' || st.zustand === 'bau', gold = st.zustand === 'gemeistert';
    x.clearRect(0, 0, 512, 224);
    const r = (px, py, w, h, rad) => { x.beginPath(); x.moveTo(px + rad, py); x.arcTo(px + w, py, px + w, py + h, rad); x.arcTo(px + w, py + h, px, py + h, rad); x.arcTo(px, py + h, px, py, rad); x.arcTo(px, py, px + w, py, rad); x.closePath(); };
    x.fillStyle = 'rgba(40,24,10,.35)'; r(14, 18, 488, 196, 26); x.fill();
    x.fillStyle = zu ? '#cfc8bd' : gold ? '#f8e2a0' : '#fbf3e1'; r(8, 8, 488, 196, 26); x.fill();
    x.lineWidth = 8; x.strokeStyle = zu ? '#9a9187' : gold ? '#e6a817' : st.naechste ? '#6366f1' : '#9a6b43'; r(8, 8, 488, 196, 26); x.stroke();
    x.fillStyle = zu ? '#8b8378' : gold ? '#e6a817' : '#6366f1';
    x.beginPath(); x.arc(70, 76, 44, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = '48px "Fredoka One", "Nunito", sans-serif'; x.fillText(String(st.nr), 70, 80);
    x.textAlign = 'left'; x.fillStyle = zu ? '#5f574e' : '#2b2118';
    let gr = 46; x.font = gr + 'px "Fredoka One", "Nunito", sans-serif';
    const titel = (ICON[st.art] || '') + ' ' + st.titel;
    while (x.measureText(titel).width > 360 && gr > 18) { gr -= 2; x.font = gr + 'px "Fredoka One", "Nunito", sans-serif'; }
    x.fillText(titel, 128, 78);
    x.font = '800 30px "Nunito", sans-serif'; x.fillStyle = zu ? '#6f675d' : '#6b5a48';
    x.fillText(st.ort || '', 128, 136);
    x.font = '800 30px "Nunito", sans-serif'; x.fillStyle = zu ? '#6f675d' : gold ? '#a06d00' : '#4f46e5';
    x.fillText(st.naechste && st.zustand === 'offen' ? '👉 Dein nächstes Ziel' : ZUSTAND[st.zustand] || '', 40, 184);
    if (alt) { alt.needsUpdate = true; return alt; }
    const t = new T.CanvasTexture(c); t.anisotropy = 2; return t;
  }

  // ── Welt starten ───────────────────────────────────────
  async function start(host, o) {
    T = o.figur.THREE;
    const S = SZENEN[o.szene] || SZENEN.hafen;
    try { await Promise.race([document.fonts && document.fonts.load('40px "Fredoka One"'), new Promise(r => setTimeout(r, 1200))]); } catch (e) {}

    const renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = false;
    host.appendChild(renderer.domElement);
    const scene = new T.Scene();
    const hc = document.createElement('canvas'); hc.width = 2; hc.height = 256;
    const hx = hc.getContext('2d'), hg = hx.createLinearGradient(0, 0, 0, 256);
    hg.addColorStop(0, S.himmel[0]); hg.addColorStop(0.6, S.himmel[1]); hg.addColorStop(1, S.himmel[2]);
    hx.fillStyle = hg; hx.fillRect(0, 0, 2, 256);
    scene.background = new T.CanvasTexture(hc);
    scene.fog = new T.Fog(S.nebel, 110, 250);
    scene.add(new T.HemisphereLight(0xfff4e0, 0x6f8f5e, 0.62));
    const sonne = new T.DirectionalLight(0xffe2b4, 0.78);
    sonne.position.set(-40, 70, 45);
    sonne.castShadow = true;
    sonne.shadow.mapSize.set(1024, 1024);
    Object.assign(sonne.shadow.camera, { left: -60, right: 60, top: 45, bottom: -45, near: 10, far: 220 });
    sonne.shadow.bias = -0.0008;
    scene.add(sonne, sonne.target);
    const camera = new T.PerspectiveCamera(40, 1, 1, 400);
    // Zeichnen nur bei Bedarf (bitte() weckt die Schleife)
    let raf = 0, letzt = performance.now(), t = 0, naechstesIdle = 0, wach = true, laeuft = true;
    function bitte() { wach = true; if (!raf && laeuft) raf = requestAnimationFrame(schritt); }

    const vcMat = new T.MeshLambertMaterial({ vertexColors: true });
    const zeug = [];                       // zum Aufräumen
    const merke = m => { zeug.push(m); return m; };

    // Ort
    const B = Bau(); S.bauen(B, S);
    const welt = merke(new T.Mesh(B.geometrie(), vcMat)); welt.receiveShadow = true; welt.castShadow = true; scene.add(welt);

    // Weg: gewundenes Band (Kurve durch alle Wegpunkte), aus Platten in zwei Tönen
    const kurve = new T.CatmullRomCurve3(S.weg.map(([x, z]) => new T.Vector3(x, 0, z)), false, 'centripetal');
    const LAENGE = kurve.getLength();
    {
      const W = Bau(), n = Math.ceil(LAENGE / 1.25);
      for (let i = 0; i <= n; i++) {
        const u = i / n, p = kurve.getPointAt(u), tg = kurve.getTangentAt(u), ry = Math.atan2(tg.x, tg.z);
        W.box(p.x, 0.02 + (i % 2) * 0.004, p.z, 3.2, 0.06, 1.35, i % 2 ? C.weg : C.weg2, ry);
        if (i % 3 === 0) [-1, 1].forEach(sd => W.box(p.x + Math.cos(ry) * sd * 1.85, 0.02, p.z - Math.sin(ry) * sd * 1.85, 0.5, 0.12, 0.6, C.stein, ry));
      }
      const m = merke(new T.Mesh(W.geometrie(), vcMat)); m.receiveShadow = true; scene.add(m);
    }

    // Wasser: Low-Poly-Fläche mit sanften Wellen (Phong mit flacher Schattierung, Normalen aus dem Shader)
    const wGeo = new T.PlaneGeometry(260, 110, 52, 22); wGeo.rotateX(-Math.PI / 2); wGeo.translate(0, -1.4, S.kai + 55);
    const wPos = wGeo.attributes.position, wBasis = Float32Array.from(wPos.array);
    const wasser = merke(new T.Mesh(wGeo, new T.MeshPhongMaterial({ color: C.wasser, flatShading: true, shininess: 70, specular: 0x9fd9ee, transparent: true, opacity: 0.94 })));
    wasser.receiveShadow = true; scene.add(wasser);
    function wellen(t) {
      if (reduce) return;
      const a = wPos.array;
      for (let i = 0; i < a.length; i += 3) a[i + 1] = wBasis[i + 1] + Math.sin(wBasis[i] * 0.21 + t * 1.1) * 0.22 + Math.cos(wBasis[i + 2] * 0.27 + t * 0.8) * 0.18;
      wPos.needsUpdate = true;
    }

    // Boote auf dem Wasser (schaukeln), Wolken (ziehen), Möwen (kreisen)
    const boote = [[-40, 30, C.rot, 0.4], [-12, 27, C.blau, -0.3], [22, 34, C.gelb, 1.2], [-70, 36, C.gruen, 2.2]].map(([x, z, f, ry]) => {
      const BB = Bau(); boot(BB, 0, 0, f, 0);
      const m = merke(new T.Mesh(BB.geometrie(), vcMat)); m.position.set(x, -1.5, z); m.rotation.y = ry; m.castShadow = true; scene.add(m);
      return m;
    });
    const wolken = [];
    for (let i = 0; i < 6; i++) {
      const W = Bau(), s = 1 + zufall() * 0.8;
      W.box(0, 0, 0, 9 * s, 2.2 * s, 5 * s, 0xffffff); W.box(-2 * s, 1.6 * s, 0, 5 * s, 2 * s, 4 * s, 0xffffff); W.box(2.5 * s, 1 * s, 0.5, 4 * s, 2 * s, 3.5 * s, 0xf4f8ff);
      const m = merke(new T.Mesh(W.geometrie(), new T.MeshLambertMaterial({ vertexColors: true, emissive: 0x666666 })));
      m.position.set(-120 + i * 45 + zufall() * 20, 34 + zufall() * 12, -40 - zufall() * 50); scene.add(m); wolken.push(m);
    }
    const moewen = [0, 1, 2].map(i => {
      const g = new T.Group(), mat = new T.MeshLambertMaterial({ color: 0xffffff });
      const k = new T.Mesh(new T.BoxGeometry(0.5, 0.4, 1.2), mat); g.add(k);
      const fl = [-1, 1].map(sd => { const f = new T.Mesh(new T.BoxGeometry(1.6, 0.1, 0.6), mat); f.geometry.translate(sd * 0.8, 0, 0); g.add(f); return f; });
      scene.add(g); zeug.push(k, ...fl);
      return { g, fl, r: 18 + i * 9, h: 16 + i * 3, v: 0.25 + i * 0.07, mx: -30 + i * 30, mz: 10 + i * 6, p: i * 2 };
    });

    // Stationen: Platz auf der Kurve (u), Sockel, Wahrzeichen, Flagge, Schild, Leuchtring
    const N = o.stationen.length;
    const probe = Array.from({ length: 600 }, (_, i) => kurve.getPointAt(i / 599));
    const uFuer = (x, z) => { let b = 0, bd = 1e9; probe.forEach((p, i) => { const d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < bd) { bd = d; b = i; } }); return b / 599; };
    const sockelGeo = new T.CylinderGeometry(1.5, 1.75, 0.6, 8);
    const sockelMat = {
      zu: new T.MeshLambertMaterial({ color: 0x9c968d }), bau: new T.MeshLambertMaterial({ color: 0xb59a6a }),
      offen: new T.MeshLambertMaterial({ color: 0x8b8ff8, emissive: 0x3438c9, emissiveIntensity: 0.5 }),
      gemeistert: new T.MeshLambertMaterial({ color: C.gold, emissive: 0x7a5200, emissiveIntensity: 0.35 }),
    };
    const ringGeo = new T.RingGeometry(1.9, 2.5, 32); ringGeo.rotateX(-Math.PI / 2);
    const fahneGeo = new T.BoxGeometry(1.6, 1, 0.08); fahneGeo.translate(0.8, 0, 0);
    const pfeilGeo = new T.OctahedronGeometry(0.7, 0);
    const pfeilMat = new T.MeshLambertMaterial({ color: C.gold, emissive: 0x8a5a00, emissiveIntensity: 0.6 });
    const ST = o.stationen.map((st, i) => {
      const pl = S.plaetze[i], u = pl ? uFuer(pl[0], pl[1]) : (i + 0.5) / N;   // mehr Stationen als Plätze: gleichmäßig verteilt
      const p = kurve.getPointAt(u), tg = kurve.getTangentAt(u);
      const sd = S.seite[i] || [0, -1];
      const nord = new T.Vector3(-tg.z, 0, tg.x); if (nord.z > 0) nord.negate();            // die von der Kamera abgewandte Seite
      const quer = sd[1] < 0 ? nord : nord.clone().negate();                                // Seite des Wahrzeichens
      // Sockel und Schild immer hinter dem Weg – so verdeckt das Schild nie die Figur
      const sp = p.clone().addScaledVector(nord, 4.2), wp = p.clone().addScaledVector(quer, 3.4);
      const g = new T.Group(); g.position.copy(sp); scene.add(g);
      const sockel = new T.Mesh(sockelGeo, sockelMat.zu); sockel.position.y = 0.3; sockel.castShadow = sockel.receiveShadow = true; g.add(sockel);
      const ring = new T.Mesh(ringGeo, new T.MeshBasicMaterial({ color: 0x818cf8, transparent: true, opacity: 0.6, depthWrite: false }));
      ring.position.y = 0.05; g.add(ring); zeug.push(ring.material);
      const mast = new T.Mesh(new T.BoxGeometry(0.16, 4.2, 0.16), new T.MeshLambertMaterial({ color: 0xeeeeee })); mast.position.set(0.9, 2.7, -0.6); g.add(mast); zeug.push(mast.geometry, mast.material);
      const fahne = new T.Mesh(fahneGeo, new T.MeshLambertMaterial({ color: C.gold })); fahne.position.set(0.98, 4.2, -0.6); g.add(fahne); zeug.push(fahne.material);
      const pfeil = new T.Mesh(pfeilGeo, pfeilMat); pfeil.scale.set(0.7, 1, 0.7); pfeil.position.y = 6.9; g.add(pfeil);
      const tex = schildTextur(st);
      const schild = new T.Sprite(new T.SpriteMaterial({ map: tex, depthWrite: false })); schild.position.y = 5; schild.renderOrder = 2; g.add(schild);
      zeug.push(tex, schild.material);
      // Wahrzeichen (grau, bis die Station gemeistert ist)
      let lm = null, farben = null, grau = null;
      const wz = S.wahrzeichen && S.wahrzeichen[i];
      if (wz) {
        const LB = Bau(); wz(LB, wp.x, wp.z);
        if (!LB.leer()) {
          const geo = LB.geometrie(); farben = Float32Array.from(geo.attributes.color.array); grau = farben.slice();
          for (let k = 0; k < grau.length; k += 3) { const l = (farben[k] * 0.3 + farben[k + 1] * 0.59 + farben[k + 2] * 0.11) * 0.75 + 0.22; grau[k] = grau[k + 1] = grau[k + 2] = l; }
          lm = merke(new T.Mesh(geo, vcMat)); lm.castShadow = lm.receiveShadow = true; scene.add(lm);
        }
      }
      // Tippfläche: großer unsichtbarer Klotz um Sockel und Schild
      const hit = new T.Mesh(new T.BoxGeometry(5, 7, 5), new T.MeshBasicMaterial({ visible: false })); hit.position.y = 3; g.add(hit); zeug.push(hit.geometry, hit.material);
      hit.userData.id = st.id;
      return { st, i, u, p, g, sockel, ring, mast, fahne, pfeil, schild, tex, lm, farben, grau, hit, zustand: '' };
    });
    zeug.push(sockelGeo, ringGeo, fahneGeo, pfeilGeo, pfeilMat, ...Object.values(sockelMat));
    const nachId = id => ST.find(s => s.st.id === id);

    function setzeZustand(liste) {
      liste.forEach(n => {
        const s = nachId(n.id); if (!s) return;
        s.st = Object.assign({}, s.st, n);
        const z = s.st.zustand;
        s.sockel.material = sockelMat[z] || sockelMat.zu;
        s.ring.visible = z === 'offen';
        s.mast.visible = s.fahne.visible = z === 'gemeistert';
        s.pfeil.visible = !!s.st.naechste && z === 'offen';
        schildTextur(s.st, s.tex);
        if (s.lm) { s.lm.geometry.attributes.color.array.set(z === 'gemeistert' ? s.farben : s.grau); s.lm.geometry.attributes.color.needsUpdate = true; }
      });
      renderer.shadowMap.needsUpdate = true;
      bitte();
    }

    // Figur
    const figur = o.figur, spieler = new T.Group();
    figur.root.scale.setScalar(FIGUR_SKALA);
    figur.root.traverse(m => { if (m.isMesh) m.castShadow = true; });
    spieler.add(figur.root); scene.add(spieler);
    const schatten = new T.Mesh(new T.CircleGeometry(1, 16), new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18, depthWrite: false }));
    schatten.rotation.x = -Math.PI / 2; schatten.position.y = 0.07; spieler.add(schatten); zeug.push(schatten.geometry, schatten.material);
    const F = { u: 0, ziel: null, phase: 0, jubelT: -1, blick: 0, fertig: null };
    const startS = o.aktuell && nachId(o.aktuell);
    F.u = startS ? startS.u : uFuer(S.start[0], S.start[1]);
    function stelleFigur() {
      const p = kurve.getPointAt(F.u);
      spieler.position.set(p.x, 0.08, p.z);
      spieler.rotation.y += ((F.blick - spieler.rotation.y + Math.PI * 3) % (Math.PI * 2) - Math.PI) * 0.25;
    }
    // ruhend schaut die Figur leicht zur Kamera
    F.blick = 0.35; spieler.rotation.y = F.blick; stelleFigur();

    // Kamera: folgt weich, Ziehen verschiebt die Sicht (begrenzt), Antippen wählt Station
    const ziel = new T.Vector3().copy(spieler.position), sicht = new T.Vector3().copy(ziel), schwenk = new T.Vector3();
    let breit = 1;
    function resize() {
      const w = host.clientWidth || 1, h = host.clientHeight || 1;
      renderer.setSize(w, h, false); renderer.domElement.style.width = w + 'px'; renderer.domElement.style.height = h + 'px';
      camera.aspect = w / h; breit = w / h; camera.fov = breit < 0.8 ? 50 : 40; camera.updateProjectionMatrix();
      const sk = breit < 0.8 ? 10.5 : 8.5;                    // Schilder auf schmalen Bildschirmen größer (lesbar)
      ST.forEach(s => { s.schild.scale.set(sk, sk * 224 / 512, 1); s.schild.position.y = 4.4 + sk * 0.12; });
      bitte();
    }
    const ro = new ResizeObserver(resize); ro.observe(host); resize();

    // Eingabe
    const ray = new T.Raycaster(), maus = new T.Vector2();
    let zug = null;
    const el = renderer.domElement;
    el.style.touchAction = 'none';
    el.addEventListener('pointerdown', e => { zug = { x: e.clientX, y: e.clientY, sx: schwenk.x, sz: schwenk.z, weit: false, id: e.pointerId }; try { el.setPointerCapture(e.pointerId); } catch (er) {} });
    el.addEventListener('pointermove', e => {
      if (!zug || e.pointerId !== zug.id) return;
      const dx = e.clientX - zug.x, dy = e.clientY - zug.y;
      if (Math.abs(dx) + Math.abs(dy) > 10) zug.weit = true;
      if (!zug.weit) return;
      const f = 60 / (host.clientWidth || 600) * (breit < 0.8 ? 1.3 : 1);
      schwenk.x = Math.max(-90, Math.min(90, zug.sx - dx * f));
      schwenk.z = Math.max(-16, Math.min(16, zug.sz - dy * f));
      bitte();
    });
    el.addEventListener('pointerup', e => {
      if (!zug || e.pointerId !== zug.id) return;
      const war = zug; zug = null;
      if (war.weit) return;
      const r = el.getBoundingClientRect();
      maus.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
      ray.setFromCamera(maus, camera);
      const treffer = ray.intersectObjects(ST.map(s => s.hit).concat(ST.map(s => s.schild)), false)[0];
      if (!treffer) return;
      const s = ST.find(x => x.hit === treffer.object || x.schild === treffer.object);
      if (s && o.onTippen) o.onTippen(s.st.id);
    });
    el.addEventListener('pointercancel', () => { zug = null; });

    // ── Schleife: volle Rate bei Bewegung, sonst Ruhe-Takt ──
    function schritt(jetzt) {
      raf = 0;
      if (!laeuft) return;
      const dt = Math.min(0.05, (jetzt - letzt) / 1000); letzt = jetzt; t += dt;
      let bewegt = false;
      // Laufen auf dem Weg
      if (F.ziel !== null) {
        const rest = F.ziel - F.u, schrittU = TEMPO * dt / LAENGE * Math.min(1, 0.35 + Math.abs(rest) * LAENGE / 4);
        if (Math.abs(rest) <= schrittU) { F.u = F.ziel; F.ziel = null; F.blick = 0.35; renderer.shadowMap.needsUpdate = true; const f = F.fertig; F.fertig = null; if (f) setTimeout(f, 120); }
        else {
          F.u += Math.sign(rest) * schrittU;
          const tg = kurve.getTangentAt(F.u); F.blick = Math.atan2(tg.x, tg.z) + (rest < 0 ? Math.PI : 0);
          F.phase += dt * 11; renderer.shadowMap.needsUpdate = true;
        }
        bewegt = true;
      }
      stelleFigur();
      let jubel = 0, hupf = 0;
      if (F.jubelT >= 0) {
        F.jubelT += dt; const p = F.jubelT / 0.8;
        jubel = Math.sin(Math.min(1, (p % 1) * 1.6) * Math.PI) * 0.9; hupf = Math.max(0, Math.sin((p % 1) * Math.PI)) * 0.9;
        if (F.jubelT > 2.4) { F.jubelT = -1; figur.gesicht('open'); }
        bewegt = true;
      }
      figur.root.position.y = hupf;
      figur.pose({ lauf: F.ziel !== null ? 1 : 0, phase: F.phase, jubel, t });
      // Kamera folgt weich
      ziel.copy(spieler.position).add(schwenk);
      const k = 1 - Math.exp(-dt * 3.2);
      const vorher = sicht.clone(); sicht.lerp(ziel, k);
      if (vorher.distanceToSquared(sicht) > 1e-5) bewegt = true;
      const abst = breit < 0.8 ? 1.3 : breit < 1.2 ? 1.1 : 1;
      camera.position.set(sicht.x - 9 * abst, sicht.y + 30 * abst, sicht.z + 44 * abst);
      camera.lookAt(sicht.x, sicht.y + 1, sicht.z + 3);
      sonne.position.set(sicht.x - 40, 70, sicht.z + 45); sonne.target.position.copy(sicht);
      // Umgebung (Ruhe-Takt)
      const idle = !reduce && jetzt >= naechstesIdle;
      if (idle) {
        naechstesIdle = jetzt + IDLE_MS;
        wellen(t);
        boote.forEach((b, i) => { b.position.y = -1.5 + Math.sin(t * 1.3 + i) * 0.2; b.rotation.z = Math.sin(t * 1.1 + i * 2) * 0.05; });
        wolken.forEach((w, i) => { w.position.x += 0.4 * (IDLE_MS / 1000) * (1 + i % 2); if (w.position.x > 150) w.position.x = -150; });
        moewen.forEach(m => { const a = t * m.v + m.p; m.g.position.set(m.mx + Math.cos(a) * m.r, m.h + Math.sin(t * 0.7 + m.p) * 1.2, m.mz + Math.sin(a) * m.r * 0.5); m.g.rotation.y = -a; m.fl.forEach((f, j) => { f.rotation.z = (j ? -1 : 1) * Math.sin(t * 6 + m.p) * 0.5; }); });
        ST.forEach(s => {
          if (s.ring.visible) { const q = 1 + Math.sin(t * 2.4 + s.i) * 0.12; s.ring.scale.set(q, 1, q); s.ring.material.opacity = 0.45 + Math.sin(t * 2.4 + s.i) * 0.2; }
          if (s.fahne.visible) s.fahne.rotation.y = Math.sin(t * 3 + s.i) * 0.25;
          if (s.pfeil.visible) { s.pfeil.position.y = 6.9 + Math.sin(t * 2.2) * 0.35; s.pfeil.rotation.y = t; }
        });
      }
      if (bewegt || idle || wach) { renderer.render(scene, camera); wach = false; }
      if (bewegt || !reduce) raf = requestAnimationFrame(schritt);
    }
    const sichtbar = () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else { letzt = performance.now(); bitte(); } };
    document.addEventListener('visibilitychange', sichtbar);

    setzeZustand(o.stationen);
    // Kamera gleich am Ziel
    sicht.copy(spieler.position); renderer.shadowMap.needsUpdate = true; bitte();

    return {
      zustand: setzeZustand,
      laufeZu(id) {
        const s = nachId(id);
        if (!s) return Promise.resolve();
        schwenk.set(0, 0, 0);
        if (reduce || Math.abs(s.u - F.u) * LAENGE < 0.5) { F.u = s.u; F.ziel = null; renderer.shadowMap.needsUpdate = true; bitte(); return Promise.resolve(); }
        return new Promise(res => { if (F.fertig) F.fertig(); F.ziel = s.u; F.fertig = res; bitte(); });
      },
      zeige(id) { const s = nachId(id); if (!s) return; schwenk.set(s.p.x - spieler.position.x, 0, Math.max(-16, Math.min(16, s.p.z - spieler.position.z))); bitte(); },
      jubel() { F.jubelT = 0; figur.gesicht('cheer'); bitte(); },
      info: () => ({ drawCalls: renderer.info.render.calls, dreiecke: renderer.info.render.triangles, dpr: renderer.getPixelRatio() }),   // Diagnose (Konsole)
      stop() {
        laeuft = false; cancelAnimationFrame(raf); ro.disconnect(); document.removeEventListener('visibilitychange', sichtbar);
        zeug.forEach(z => { try { if (z.geometry) z.geometry.dispose(); if (z.dispose) z.dispose(); } catch (e) {} });
        wGeo.dispose(); vcMat.dispose(); scene.background.dispose(); renderer.dispose(); el.remove();
      },
    };
  }

  window.LernJourneyWelt = { start, SZENEN: Object.keys(SZENEN) };
})();
