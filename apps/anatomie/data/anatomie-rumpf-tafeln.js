/* ═══════════════════════════════════════════════════════
   Lernwelt – apps/anatomie/data/anatomie-rumpf-tafeln.js
   Tafeln Rumpfwand: Knochen, Bänder, Gelenke – echte Abbildungen (Gray's Anatomy, 1918, gemeinfrei)
   Je Tafel:
     bild      Pfad relativ zur Seite apps/anatomie/anatomie-testat.html
     w, h      Pixelmaße des Bildes (alle Koordinaten in diesen Pixeln)
     masken    [x, y, breite, höhe, farbe?] – decken die Originalbeschriftung ab (Standard weiß)
     pins      [strukturId, x, y] – strukturId aus anatomie-rumpf-inhalte.js
     nachweis  Schlüssel in anatomie-bildnachweise.js
     unit/ref  Lerneinheit und Verweis auf den Prometheus (Buchseite, Abbildung)
   Pins wurden einzeln am gerenderten Bild geprüft (werkzeuge: Prüfbild mit Pin-Namen).
   ═══════════════════════════════════════════════════════ */
(function () {
  const T = [];
  const B = 'bilder/';
  const G = '#ececec';   // Maskenfarbe auf hell schattiertem Knochen

  /* ---------- Lendenwirbel von kranial (Gray Fig. 94, ohne Beschriftung) ---------- */
  T.push({
    id: 'lendenwirbel-kranial', title: 'Lendenwirbel', view: 'Ansicht von kranial (dorsal oben)', unit: '1.4 / 1.7', ref: 'S. 114 A, S. 121 C',
    bild: B + 'gray94.png', w: 400, h: 391, nachweis: 'gray94', masken: [],
    pins: [['corpus-vertebrae', 210, 310], ['epiphysis-anularis', 103, 292], ['foramen-vertebrale', 200, 190], ['pediculus', 125, 212],
      ['proc-costalis', 30, 200], ['proc-articularis-superior', 100, 152], ['facies-articularis-superior', 130, 160], ['proc-mammillaris', 80, 132],
      ['lamina', 158, 135], ['proc-spinosus', 200, 60]]
  });

  /* ---------- Halswirbel von kranial (Gray Fig. 84) ---------- */
  T.push({
    id: 'halswirbel-kranial', title: 'Halswirbel', view: 'Typischer Halswirbel, Ansicht von kranial (ventral oben)', unit: '1.5', ref: 'S. 116 A, S. 117 C',
    bild: B + 'gray84.png', w: 500, h: 252, nachweis: 'gray84',
    masken: [[30, 3, 112, 29], [88, 34, 53, 16], [30, 50, 90, 15], [3, 62, 118, 15], [16, 75, 104, 16], [229, 34, 39, 18, G], [307, 61, 48, 24, G],
      [370, 23, 114, 19], [396, 90, 104, 32], [396, 124, 104, 30], [279, 137, 33, 33, G], [233, 226, 44, 26]],
    pins: [['corpus-vertebrae', 228, 66], ['proc-uncinatus', 300, 22], ['foramen-transversarium', 172, 58], ['tuberculum-anterius', 155, 32],
      ['tuberculum-posterius', 130, 64], ['foramen-vertebrale', 255, 110], ['pediculus', 316, 82], ['proc-articularis-superior', 160, 100],
      ['facies-articularis-superior', 355, 106], ['proc-articularis-inferior', 368, 140], ['lamina', 300, 158], ['proc-spinosus-bifidus', 228, 222]]
  });

  /* ---------- Atlas von kranial (Gray Fig. 86) ---------- */
  T.push({
    id: 'atlas-kranial', title: 'Atlas', view: 'Atlas (C I) von kranial, Dens axis und Lig. transversum als Umriss', unit: '1.5 / 1.12', ref: 'S. 117 C, S. 131 B',
    bild: B + 'gray86.png', w: 500, h: 235, nachweis: 'gray86',
    masken: [[103, 11, 94, 18], [199, 32, 64, 17, G], [333, 9, 165, 27], [352, 36, 147, 26], [1, 83, 60, 27], [134, 54, 42, 78, G],
      [276, 75, 87, 21, G], [420, 77, 80, 38], [350, 150, 150, 27], [197, 178, 70, 19, G], [121, 218, 94, 18]],
    pins: [['tuberculum-anterius-atlantis', 225, 21], ['arcus-anterior', 285, 46], ['dens-axis', 240, 72], ['lig-transversum-atlantis', 240, 103],
      ['massa-lateralis', 163, 142], ['fovea-articularis-superior', 318, 112], ['foramen-transversarium', 103, 95], ['proc-transversus', 72, 108],
      ['sulcus-a-vertebralis', 318, 155], ['arcus-posterior', 300, 176], ['tuberculum-posterius-atlantis', 236, 214]]
  });

  /* ---------- Halswirbel von lateral (Gray Fig. 85) ---------- */
  T.push({
    id: 'halswirbel-lateral', title: 'Halswirbel', view: 'Typischer Halswirbel, Ansicht von links-lateral (ventral links)', unit: '1.5', ref: 'S. 116 A, S. 117 C',
    bild: B + 'gray85.png', w: 500, h: 197, nachweis: 'gray85',
    masken: [[258, 25, 168, 20], [288, 43, 102, 21], [96, 80, 36, 18], [3, 94, 130, 32], [66, 160, 107, 22], [187, 163, 131, 34], [388, 150, 110, 22]],
    pins: [['corpus-vertebrae', 142, 118], ['tuberculum-anterius', 163, 100], ['sulcus-n-spinalis', 180, 125], ['tuberculum-posterius', 200, 132],
      ['facies-articularis-superior', 245, 62], ['proc-articularis-inferior', 268, 140], ['proc-spinosus', 372, 160]]
  });

  /* ---------- Axis von kranial (Gray Fig. 87) ---------- */
  T.push({
    id: 'axis-kranial', title: 'Axis', view: 'Axis (C II) von kranial (ventral oben)', unit: '1.5 / 1.12', ref: 'S. 116 B, S. 117 C',
    bild: B + 'gray87.png', w: 400, h: 351, nachweis: 'gray87',
    masken: [[136, 10, 36, 15], [187, 26, 119, 18], [203, 60, 172, 19], [256, 82, 116, 29], [111, 142, 46, 17, '#cfcfcf'], [276, 140, 110, 29], [89, 333, 102, 17]],
    pins: [['dens-axis', 135, 55], ['corpus-vertebrae', 140, 125], ['facies-articularis-superior', 220, 115], ['foramen-transversarium', 236, 162],
      ['proc-transversus', 15, 182], ['proc-articularis-inferior', 55, 232], ['foramen-vertebrale', 140, 210], ['lamina', 98, 235], ['proc-spinosus', 110, 310]]
  });

  /* ---------- Axis von lateral (Gray Fig. 88) ---------- */
  T.push({
    id: 'axis-lateral', title: 'Axis', view: 'Axis (C II) von links-lateral (ventral rechts)', unit: '1.5 / 1.12', ref: 'S. 116 B, S. 117 C',
    bild: B + 'gray88.png', w: 500, h: 280, nachweis: 'gray88',
    masken: [[276, 15, 97, 19], [82, 58, 181, 21], [45, 95, 216, 21], [370, 72, 129, 31], [276, 138, 67, 30, G], [186, 180, 49, 17, G],
      [370, 200, 31, 19], [3, 213, 95, 21], [251, 248, 109, 19], [158, 258, 143, 22]],
    pins: [['dens-axis', 320, 55], ['facies-articularis-superior', 325, 174], ['corpus-vertebrae', 345, 215], ['foramen-transversarium', 292, 198],
      ['proc-transversus', 295, 228], ['proc-articularis-inferior', 228, 245], ['lamina', 170, 180], ['proc-spinosus', 115, 222]]
  });

  /* ---------- 7. Halswirbel von kranial (Gray Fig. 89) ---------- */
  T.push({
    id: 'vertebra-prominens', title: 'Vertebra prominens', view: '7. Halswirbel (C VII) von kranial (ventral oben)', unit: '1.5', ref: 'S. 109 C, S. 116 A',
    bild: B + 'gray89.png', w: 350, h: 367, nachweis: 'gray89',
    masken: [[172, 10, 34, 15], [4, 60, 62, 22], [261, 68, 53, 16], [288, 153, 58, 16], [50, 200, 53, 37], [126, 352, 95, 15]],
    pins: [['corpus-vertebrae', 170, 85], ['foramen-transversarium', 78, 110], ['proc-transversus', 18, 113], ['facies-articularis-superior', 78, 165],
      ['foramen-vertebrale', 170, 145], ['pediculus', 228, 135], ['lamina', 208, 188], ['proc-spinosus', 172, 285]]
  });

  window.TAFELN_RUMPF = T;
})();
