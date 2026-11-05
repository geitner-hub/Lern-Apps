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

  /* ---------- Brustwirbel von lateral (Gray Fig. 90) ---------- */
  T.push({
    id: 'brustwirbel-lateral', title: 'Brustwirbel', view: 'Mittlerer Brustwirbel von rechts-lateral (ventral rechts)', unit: '1.6', ref: 'S. 118 B, S. 119 C',
    bild: B + 'gray90.png', w: 450, h: 344, nachweis: 'gray90',
    masken: [[66, 18, 148, 19], [298, 22, 145, 22], [2, 97, 134, 31], [215, 88, 45, 30, G], [250, 70, 42, 42, G], [362, 100, 40, 20, G],
      [274, 182, 148, 22], [168, 182, 40, 36, G], [221, 222, 143, 19]],
    pins: [['corpus-vertebrae', 380, 135], ['fovea-costalis-superior', 325, 82], ['fovea-costalis-inferior', 315, 155], ['pediculus', 275, 100],
      ['incisura-vertebralis-inferior', 288, 132], ['proc-articularis-superior', 260, 40], ['proc-transversus', 235, 118],
      ['fovea-costalis-proc-transversi', 190, 110], ['proc-articularis-inferior', 254, 178], ['proc-spinosus', 150, 260]]
  });

  /* ---------- Besondere Brustwirbel (Gray Fig. 91) ---------- */
  T.push({
    id: 'brustwirbel-besondere', title: 'Besondere Brustwirbel', view: 'Th I, Th IX–XII von rechts-lateral (Nummern im Bild stehen lassen)', unit: '1.6 / 1.19', ref: 'S. 118 A, S. 145 C',
    bild: B + 'gray91.png', w: 429, h: 600, nachweis: 'gray91',
    masken: [[292, 58, 132, 32], [292, 228, 100, 15], [292, 334, 84, 16], [298, 400, 124, 42], [308, 464, 116, 64]],
    pins: [['fovea-costalis-inferior', 222, 104], ['fovea-costalis-superior', 183, 218], ['fovea-costalis-proc-transversi', 104, 212],
      ['proc-articularis-superior', 150, 180], ['proc-transversus', 40, 150]]
  });

  /* ---------- Lendenwirbel von dorsokranial (Gray Fig. 93) ---------- */
  T.push({
    id: 'lendenwirbel-dorsal', title: 'Lendenwirbel', view: 'Ansicht von kranial und dorsal (schräg)', unit: '1.4 / 1.7', ref: 'S. 120 A, S. 121 C',
    bild: B + 'gray93.png', w: 500, h: 357, nachweis: 'gray93',
    masken: [[12, 64, 99, 16], [385, 40, 96, 26], [374, 143, 97, 16], [394, 163, 93, 16], [53, 214, 96, 28]],
    pins: [['proc-costalis', 124, 120], ['proc-articularis-superior', 160, 140], ['facies-articularis-superior', 190, 160], ['lamina', 235, 125],
      ['proc-spinosus', 290, 40], ['proc-articularis-inferior', 365, 100], ['proc-mammillaris', 330, 175], ['proc-accessorius', 362, 180],
      ['foramen-vertebrale', 240, 200], ['corpus-vertebrae', 260, 300]]
  });

  /* ---------- Kreuzbein von ventral (Gray Fig. 95) ---------- */
  T.push({
    id: 'kreuzbein-ventral', title: 'Kreuzbein', view: 'Os sacrum, Facies pelvica (Ansicht von ventral); rote Linien = Muskelursprünge', unit: '1.8', ref: 'S. 122 A',
    bild: B + 'gray95.png', w: 525, h: 550, nachweis: 'gray95',
    masken: [[228, 15, 77, 17], [185, 51, 162, 16, G], [240, 91, 102, 35, G], [400, 81, 32, 24, G], [348, 128, 92, 36, G], [443, 183, 28, 124, G],
      [488, 132, 32, 164, G], [208, 526, 84, 16, G], [18, 94, 32, 66, G], [138, 262, 42, 176, G], [156, 486, 26, 32, G]],
    pins: [['promontorium', 235, 60], ['ala-ossis-sacri', 390, 100], ['foramina-sacralia-anteriora', 175, 165], ['lineae-transversae', 285, 182],
      ['pars-lateralis', 430, 320], ['apex-ossis-sacri', 250, 535]]
  });

  /* ---------- Kreuzbein von dorsal (Gray Fig. 96) – Muskelnamen bleiben stehen ---------- */
  T.push({
    id: 'kreuzbein-dorsal', title: 'Kreuzbein', view: 'Os sacrum, Facies dorsalis; rote Linien und Großbuchstaben = Muskelursprünge', unit: '1.8', ref: 'S. 122 B',
    bild: B + 'gray96.png', w: 567, h: 500, nachweis: 'gray96',
    masken: [[350, 20, 63, 53, G], [248, 66, 93, 17, G], [215, 80, 86, 29, G], [130, 95, 86, 36, G], [330, 85, 31, 26, G], [355, 95, 62, 46, G],
      [415, 73, 32, 78, G], [370, 120, 42, 56, G], [45, 160, 76, 21, G], [120, 155, 82, 61, G], [100, 233, 56, 23, G], [372, 205, 52, 19, G],
      [370, 310, 42, 17, G], [370, 395, 26, 31, G], [305, 410, 26, 41, G], [385, 458, 142, 33]],
    pins: [['proc-articularis-superior-sacri', 385, 50], ['tuberositas-ossis-sacri', 150, 120], ['facies-auricularis', 75, 200],
      ['crista-sacralis-mediana', 282, 330], ['crista-sacralis-medialis', 358, 280], ['crista-sacralis-lateralis', 430, 290],
      ['foramina-sacralia-posteriora', 388, 228], ['cornua-sacralia', 318, 430], ['hiatus-sacralis', 262, 470]]
  });

  /* ---------- Bewegungssegment mit Bändern, Medianschnitt (Gray Fig. 301) ---------- */
  T.push({
    id: 'baender-ws', title: 'Bänder der Wirbelsäule', view: 'Zwei Lendenwirbel, Median-Sagittalschnitt (ventral links)', unit: '1.9 / 1.10', ref: 'S. 125 D, S. 126 A–C, S. 127 D',
    bild: B + 'gray301.png', w: 492, h: 409, nachweis: 'gray301',
    masken: [[8, 95, 16, 235, '#f3f3ef'], [72, 78, 48, 20, '#eaecd1'], [55, 228, 50, 22, '#fdf7d1'], [100, 225, 70, 55, '#fdfbe9'], [28, 162, 108, 32, '#e6e8d3'],
      [178, 100, 16, 225, '#eaece7'], [200, 65, 16, 50, '#d8d4b8'], [200, 205, 16, 60, '#d8d4b8'], [226, 92, 52, 18, '#efedd8'], [222, 232, 56, 18, '#efedd8'],
      [248, 15, 72, 30, '#eaecdb'], [240, 160, 60, 30, '#e4e4de'], [300, 95, 130, 25, '#eae5c1'], [312, 245, 128, 30, '#fdf7d1'], [325, 182, 75, 30, '#b4b6b4'],
      [458, 90, 18, 175, '#f3f3ef'], [265, 318, 62, 30, '#a4a49b']],
    pins: [['lig-longitudinale-anterius', 16, 250], ['corpus-vertebrae', 100, 120], ['discus-intervertebralis', 60, 180], ['nucleus-pulposus', 92, 335], ['lig-longitudinale-posterius', 185, 220],
      ['pediculus', 207, 85], ['foramen-intervertebrale', 217, 160], ['lamina', 245, 250], ['lig-flavum', 265, 175], ['proc-articularis-superior', 275, 30],
      ['proc-spinosus', 360, 130], ['lig-interspinale', 360, 195], ['lig-supraspinale', 466, 200]]
  });

  /* ---------- Ligamenta flava (Gray Fig. 303) ---------- */
  T.push({
    id: 'ligg-flava', title: 'Ligamenta flava', view: 'Wirbelbögen dreier Brustwirbel von ventral (Pediculi durchtrennt)', unit: '1.10', ref: 'S. 126 A–C',
    bild: B + 'gray303.png', w: 349, h: 350, nachweis: 'gray303',
    masken: [[200, 28, 58, 22, '#beb999'], [113, 82, 60, 26, '#bdbcae'], [113, 163, 60, 26, '#cacbb8'], [265, 160, 82, 21], [217, 248, 51, 19]],
    pins: [['lig-flavum', 140, 150], ['pediculus', 180, 120], ['lamina', 155, 222], ['proc-transversus', 255, 40], ['proc-spinosus', 145, 320]]
  });

  /* ---------- Bänder der Kopfgelenke von dorsal (Gray Fig. 307) ---------- */
  T.push({
    id: 'kopfgelenke-dorsal', title: 'Bänder der Kopfgelenke', view: 'Ansicht von dorsal, Wirbelkanal eröffnet, Membrana tectoria nach oben umgeschlagen', unit: '1.12', ref: 'S. 130 A c–d, S. 131 C',
    bild: B + 'gray307.png', w: 600, h: 416, nachweis: 'gray307',
    masken: [[3, 40, 18, 240], [150, 108, 182, 36, '#f6f0c8'], [170, 150, 68, 24, '#dcdbd2'], [250, 148, 62, 24, '#c8c8c2'], [185, 183, 112, 18, '#e4e4de'],
      [232, 160, 16, 100, '#dad9d1'], [195, 255, 102, 22, '#f6f0c8'], [462, 125, 112, 33], [440, 165, 157, 42], [420, 265, 162, 42], [210, 360, 60, 40, '#c6c7bf']],
    pins: [['membrana-tectoria', 240, 60], ['os-occipitale', 100, 55], ['lig-cruciforme', 240, 140], ['ligg-alaria', 285, 165],
      ['lig-transversum-atlantis', 205, 192], ['fasciculi-longitudinales', 240, 228], ['axis', 220, 268], ['lig-longitudinale-posterius', 240, 385]]
  });

  /* ---------- Kopfgelenke im Medianschnitt (Gray Fig. 308) ---------- */
  T.push({
    id: 'kopfgelenke-median', title: 'Kopfgelenke im Medianschnitt', view: 'Hinterhaupt bis C III, Median-Sagittalschnitt (ventral links)', unit: '1.12', ref: 'S. 130 A, S. 131 B',
    bild: B + 'gray308.png', w: 500, h: 485, nachweis: 'gray308',
    masken: [[20, 65, 106, 26], [27, 98, 99, 16], [25, 110, 103, 29], [32, 140, 91, 17], [33, 160, 91, 17], [37, 180, 89, 27], [55, 203, 86, 17],
      [20, 222, 106, 17], [37, 240, 83, 27], [55, 370, 73, 29], [18, 420, 109, 29], [280, 30, 196, 19], [340, 72, 96, 19], [413, 118, 40, 22, '#d5cfb4'],
      [390, 155, 101, 29], [413, 195, 76, 29], [400, 223, 91, 17], [305, 238, 80, 48, '#d8d6cc'], [290, 290, 45, 40, '#979485'], [170, 290, 45, 15, '#e1e0be'],
      [163, 400, 70, 50, '#e6e2d0'], [138, 22, 55, 80, '#e8dfb4'], [312, 180, 30, 25, '#c1b9b4'], [181, 469, 162, 16]],
    pins: [['lig-apicis-dentis', 206, 147], ['fasciculi-longitudinales', 213, 128], ['membrana-tectoria', 245, 280], ['arcus-anterior', 172, 190],
      ['art-atlantoaxialis-mediana', 180, 205], ['dens-axis', 210, 192], ['lig-transversum-atlantis', 240, 212], ['axis', 190, 320],
      ['discus-intervertebralis', 190, 378], ['lig-longitudinale-anterius', 160, 430], ['lig-longitudinale-posterius', 256, 450],
      ['os-occipitale', 445, 135], ['arcus-posterior', 393, 207]]
  });

  /* ---------- Knöcherner Thorax von ventral (Gray Fig. 112, nach Spalteholz) ---------- */
  T.push({
    id: 'thorax', title: 'Knöcherner Brustkorb', view: 'Ansicht von ventral; dunkel = Rippenknorpel', unit: '1.17 / 1.18', ref: 'S. 140 A, S. 141 C, S. 142 A',
    bild: B + 'gray112.png', w: 436, h: 600, nachweis: 'gray112',
    masken: [[296, 6, 84, 18], [254, 476, 32, 28]],
    pins: [['apertura-superior', 180, 48], ['costa-prima', 302, 62], ['incisura-jugularis', 218, 75], ['incisura-clavicularis', 183, 84],
      ['manubrium', 220, 110], ['angulus-sterni', 220, 152], ['corpus-sterni', 220, 220], ['proc-xiphoideus', 218, 345],
      ['cartilago-costalis', 290, 198], ['costae-verae', 405, 262], ['arcus-costalis', 330, 420], ['costae-fluctuantes', 378, 548]]
  });

  /* ---------- Sternum und Rippenknorpel von ventral (Gray Fig. 115) – Muskelnamen bleiben stehen ---------- */
  T.push({
    id: 'sternum', title: 'Sternum und Rippenknorpel', view: 'Ansicht von ventral; rote Linien und Großbuchstaben = Muskelursprünge, Ziffern = Rippen', unit: '1.17', ref: 'S. 140 A, S. 141 C',
    bild: B + 'gray115.png', w: 526, h: 650, nachweis: 'gray115',
    masken: [[282, 15, 46, 23], [335, 25, 52, 26], [272, 40, 80, 48, '#f6f6f4'], [292, 148, 46, 112, '#f6f6f4'], [282, 355, 42, 31, '#f6f6f4'],
      [8, 250, 42, 118], [40, 140, 42, 122], [75, 34, 68, 112], [400, 80, 36, 185], [444, 280, 24, 160], [12, 440, 52, 205]],
    pins: [['incisura-jugularis', 300, 40], ['incisura-clavicularis', 335, 50], ['manubrium', 290, 80], ['angulus-sterni', 300, 132],
      ['corpus-sterni', 300, 220], ['proc-xiphoideus', 300, 395], ['costa-prima', 205, 58], ['cartilago-costalis', 370, 190],
      ['arcus-costalis', 430, 470], ['costae-fluctuantes', 110, 600]]
  });

  /* ---------- Rippen-Wirbel-Gelenke von ventral (Gray Fig. 312) ---------- */
  T.push({
    id: 'rippen-wirbel-gelenke', title: 'Rippen-Wirbel-Gelenke', view: 'Brustwirbelsäule mit Rippenansätzen von ventral-lateral; unten Rippenkopf angeschnitten', unit: '1.18 / 1.19', ref: 'S. 143 D, S. 145 C',
    bild: B + 'gray312.png', w: 500, h: 527, nachweis: 'gray312',
    masken: [[225, 45, 90, 35, '#d9d6c4'], [2, 205, 88, 42], [240, 193, 66, 15, '#c9c8c0'], [330, 235, 25, 76, '#c2c0b4'], [225, 265, 76, 21, '#beb58d'],
      [445, 70, 22, 345, '#d4d4d0'], [123, 505, 140, 21], [327, 505, 160, 21]],
    pins: [['proc-transversus', 235, 62], ['collum-costae', 260, 275], ['lig-capitis-costae-radiatum', 345, 272], ['caput-costae', 300, 397],
      ['art-capitis-costae', 332, 385], ['discus-intervertebralis', 380, 382], ['corpus-vertebrae', 395, 320], ['lig-longitudinale-anterius', 456, 230]]
  });

  /* ---------- Männliches Becken von ventral (Gray Fig. 241) ---------- */
  T.push({
    id: 'becken', title: 'Knöchernes Becken', view: 'Männliches Becken, Ansicht von ventral', unit: '1.20', ref: 'S. 146 A a, S. 146 B',
    bild: B + 'gray241.png', w: 1000, h: 808, nachweis: 'gray241',
    masken: [[195, 72, 86, 40, G], [486, 258, 26, 124, G], [325, 330, 32, 200, G], [484, 478, 28, 84, G], [316, 543, 76, 30, G], [248, 668, 84, 94, G], [453, 688, 114, 64, G]],
    pins: [['crista-iliaca', 140, 40], ['fossa-iliaca', 200, 180], ['sias', 18, 168], ['siai', 130, 450], ['os-ilium', 150, 300], ['promontorium', 500, 182],
      ['os-sacrum', 490, 300], ['art-sacroiliaca', 335, 330], ['linea-terminalis', 340, 430], ['os-pubis', 380, 570], ['tuberculum-pubicum', 455, 585],
      ['symphysis', 500, 620], ['foramen-obturatum', 370, 650], ['os-ischii', 270, 700], ['tuber-ischiadicum', 290, 760], ['angulus-subpubicus', 500, 722]]
  });

  /* ---------- Bänder des Beckens von ventral (Gray Fig. 319) ---------- */
  T.push({
    id: 'beckenbaender-ventral', title: 'Bänder des Beckens', view: 'Rechte Beckenhälfte mit Kreuzbein, Ansicht von ventral', unit: '1.21 / 1.22', ref: 'S. 148 A, S. 151 C',
    bild: B + 'gray319.png', w: 526, h: 677, nachweis: 'gray319',
    masken: [[205, 8, 116, 19], [243, 20, 102, 17], [350, 20, 112, 17], [375, 32, 130, 17], [27, 437, 93, 17], [47, 527, 117, 17], [107, 615, 120, 17], [423, 644, 102, 17]],
    pins: [['crista-iliaca', 48, 72], ['fossa-iliaca', 150, 250], ['sias', 30, 255], ['lig-iliolumbale', 285, 70], ['lig-longitudinale-anterius', 445, 120],
      ['lig-sacrospinale', 360, 420], ['symphysis', 465, 610]]
  });

  /* ---------- Kreuzbeinbasis von kranial (Gray Fig. 98) ---------- */
  T.push({
    id: 'kreuzbein-basis', title: 'Basis ossis sacri', view: 'Kreuzbein von kranial (dorsal oben)', unit: '1.8', ref: 'S. 122 A–B',
    bild: B + 'gray98.png', w: 500, h: 333, nachweis: 'gray98',
    masken: [[312, 30, 84, 19], [366, 52, 111, 19], [74, 175, 20, 40, '#cccfd2'], [355, 100, 92, 82, '#aeb1b3'], [222, 200, 46, 23, '#e4e7e9'], [380, 195, 72, 42, '#b9bcbf']],
    pins: [['canalis-vertebralis', 245, 125], ['proc-articularis-superior-sacri', 372, 100], ['ala-ossis-sacri', 70, 230], ['pars-lateralis', 440, 250],
      ['promontorium', 245, 282]]
  });

  /* ---------- Lig. longitudinale posterius (Gray Fig. 302) ---------- */
  T.push({
    id: 'lig-long-post', title: 'Hinteres Längsband', view: 'Brustwirbelsäule von dorsal, Wirbelbögen entfernt (Pediculi durchtrennt)', unit: '1.10', ref: 'S. 126 A–C',
    bild: B + 'gray302.png', w: 244, h: 300, nachweis: 'gray302',
    masken: [[158, 35, 72, 19], [158, 92, 82, 31], [76, 50, 14, 225, '#b5b8b5']],
    pins: [['lig-longitudinale-posterius', 95, 140], ['pediculus', 120, 45], ['discus-intervertebralis', 130, 100]]
  });

  /* ---------- Art. costotransversaria von kranial (Gray Fig. 313) ---------- */
  T.push({
    id: 'costotransversal', title: 'Rippen-Querfortsatz-Gelenk', view: 'Brustwirbel mit Rippenpaar, Ansicht von kranial (ventral oben)', unit: '1.18 / 1.19', ref: 'S. 143 D, S. 145 C a',
    bild: B + 'gray313.png', w: 566, h: 401, nachweis: 'gray313',
    masken: [[228, 65, 150, 45, '#eeeeec'], [28, 115, 152, 30], [3, 153, 127, 19], [3, 180, 100, 31], [100, 190, 75, 40, '#f6ebae'], [130, 210, 115, 48, '#f6ebae'],
      [255, 235, 100, 22, '#f6ebae'], [280, 300, 40, 45, '#f6ebae'], [360, 205, 105, 70, '#f6ebae'], [400, 175, 60, 45, '#f6ebae'], [468, 182, 98, 19], [470, 238, 50, 30, '#f6ebae'], [32, 306, 110, 19]],
    pins: [['discus-intervertebralis', 300, 60], ['foramen-vertebrale', 300, 180], ['art-capitis-costae', 380, 165], ['collum-costae', 440, 200],
      ['proc-transversus', 410, 240], ['art-costotransversaria', 452, 248], ['tuberculum-costae', 472, 262], ['lig-costotransversarium-laterale', 95, 262],
      ['lamina', 300, 250], ['proc-spinosus', 305, 350]]
  });

  /* ---------- Bänder des Beckens von dorsal (Gray Fig. 320) ---------- */
  T.push({
    id: 'beckenbaender-dorsal', title: 'Bänder des Beckens', view: 'Rechte Beckenhälfte mit Kreuzbein, Ansicht von dorsal', unit: '1.21 / 1.22', ref: 'S. 148 A b, S. 151 C',
    bild: B + 'gray320.png', w: 559, h: 700, nachweis: 'gray320',
    masken: [[20, 27, 112, 18], [50, 40, 127, 18], [140, 15, 105, 18], [435, 322, 124, 18], [362, 527, 117, 18], [7, 617, 127, 35], [160, 682, 120, 18]],
    pins: [['lig-supraspinale', 40, 150], ['ligg-sacroiliaca-posteriora', 110, 140], ['lig-iliolumbale', 185, 60], ['crista-iliaca', 330, 30],
      ['foramen-ischiadicum-majus', 215, 340], ['lig-sacrospinale', 215, 462], ['lig-sacrotuberale', 200, 505], ['foramen-ischiadicum-minus', 155, 545],
      ['tuber-ischiadicum', 230, 640]]
  });

  /* ---------- Sternum von lateral (Gray Fig. 117) ---------- */
  T.push({
    id: 'sternum-lateral', title: 'Sternum', view: 'Brustbein von links-lateral (ventral rechts)', unit: '1.17', ref: 'S. 140 A, S. 141 C',
    bild: B + 'gray117.png', w: 337, h: 500, nachweis: 'gray117',
    masken: [[192, 15, 110, 33], [192, 55, 132, 36], [152, 90, 80, 21], [16, 108, 50, 33], [140, 130, 160, 33], [120, 200, 180, 23], [104, 233, 36, 19],
      [104, 270, 177, 23], [104, 327, 177, 23], [104, 362, 177, 23], [104, 385, 177, 23], [90, 410, 102, 23]],
    pins: [['incisura-clavicularis', 170, 30], ['manubrium', 135, 80], ['angulus-sterni', 92, 125], ['corpus-sterni', 88, 250], ['proc-xiphoideus', 80, 440]]
  });

  window.TAFELN_RUMPF = T;
})();
