// ═══════════════════════════════════════════════════════
//  Lernwelt – insel-karte.js   („Die Insel“: Schatzkarte und Kompass)
//
//  Wird geladen von: spiele/insel.html
//  Braucht: insel-welt.js (Welt, Blockfarben)
//
//  Schatzkarte (Etappe 6): wird aus den Weltdaten gezeichnet – Gelände, Wasser, Bäume, Gebäude,
//  Planquadrate (Spalten A, B, C …, Zeilen 1, 2, 3 …), Landmarken, Nordpfeil und Maßstab
//  („1 cm = 5 Schritte“). Absichtlich OHNE „Du bist hier“ und ohne Schätze: Die Kinder lesen die Karte
//  und orientieren sich an Landmarken und Kompass (keine Minikarte).
//
//  API (window.LernInselKarte):
//    zeichnen(canvas, welt, { raster, landmarken, massstab, breite })
//      raster     { x0, z0, groesse, spalten, zeilen }   (daten/insel.json → raster)
//      landmarken [{ name, symbol, x, z }]
//      massstab   Schritte je cm auf der Karte (Maßstabsleiste = 1 cm)
//      breite, hoehe  verfügbarer Platz in CSS-Pixeln (die Karte passt sich an)
//    kompassWinkel(yaw)  → Drehung der Kompassrose in Grad (Norden = −z der Welt)
// ═══════════════════════════════════════════════════════

(function () {
  'use strict';
  if (window.LernInselKarte) return;

  const PAPIER = '#f6ecd2', TINTE = '#3b2a1a';
  function rgb(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const k = c => Math.max(0, Math.min(255, Math.round(c * f)));
    return `rgb(${k((n >> 16) & 255)},${k((n >> 8) & 255)},${k(n & 255)})`;
  }

  function zeichnen(cv, welt, o) {
    const R = o.raster, A = window.LernInselWelt.ART, B = window.LernInselWelt.BLOCK;
    const breite = R.spalten * R.groesse, tiefe = R.zeilen * R.groesse;
    const rand = 28;                                             // Platz für Beschriftung
    const px = Math.max(3, Math.floor(Math.min(((o.breite || 420) - 2 * rand) / breite, ((o.hoehe || 9999) - 2 * rand - 26) / tiefe, 640 / breite)));
    const W = breite * px + 2 * rand, H = tiefe * px + 2 * rand + 26;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    const g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = PAPIER; g.fillRect(0, 0, W, H);

    // Gelände: oberster Block je Spalte, heller je höher
    for (let z = 0; z < tiefe; z++) for (let x = 0; x < breite; x++) {
      const wx = R.x0 + x, wz = R.z0 + z;
      const y = welt.boden(wx, wz);
      let b = welt.get(wx, y - 1, wz);
      let farbe;
      if (y <= welt.W && (welt.nass(wx, y - 1, wz) || !b)) farbe = '#7fb4d9';
      else {
        const art = A[b] || A[B.GRAS];
        farbe = rgb(b === B.LAUB ? '#2f7a2c' : art.oben, .78 + Math.min(.3, (y - welt.W) * .02));
      }
      g.fillStyle = farbe;
      g.fillRect(rand + x * px, rand + z * px, px, px);
    }
    g.fillStyle = 'rgba(246,236,210,.18)'; g.fillRect(rand, rand, breite * px, tiefe * px);   // leicht „gedruckt“

    // Planquadrate
    g.strokeStyle = 'rgba(59,42,26,.75)'; g.lineWidth = 1.5;
    g.font = `bold ${Math.max(12, px * 1.6)}px Nunito, system-ui, sans-serif`;
    g.fillStyle = TINTE; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let i = 0; i <= R.spalten; i++) {
      const x = rand + i * R.groesse * px;
      g.beginPath(); g.moveTo(x, rand); g.lineTo(x, rand + tiefe * px); g.stroke();
      if (i < R.spalten) g.fillText('ABCDEFGH'[i], x + R.groesse * px / 2, rand / 2);
    }
    for (let j = 0; j <= R.zeilen; j++) {
      const y = rand + j * R.groesse * px;
      g.beginPath(); g.moveTo(rand, y); g.lineTo(rand + breite * px, y); g.stroke();
      if (j < R.zeilen) g.fillText(String(j + 1), rand / 2, y + R.groesse * px / 2);
    }

    // Landmarken
    g.textBaseline = 'middle';
    (o.landmarken || []).forEach(l => {
      const x = rand + (l.x - R.x0 + .5) * px, y = rand + (l.z - R.z0 + .5) * px;
      g.font = `${Math.max(16, px * 2.4)}px system-ui, sans-serif`;
      g.fillText(l.symbol || '●', x, y);
      g.font = `bold ${Math.max(10, px * 1.25)}px Nunito, system-ui, sans-serif`;
      g.fillStyle = 'rgba(246,236,210,.85)';
      const w = g.measureText(l.name).width + 6;
      g.fillRect(x - w / 2, y + px * 1.6, w, px * 1.6 + 2);
      g.fillStyle = TINTE;
      g.fillText(l.name, x, y + px * 2.45);
    });

    // Nordpfeil
    const nx = rand + breite * px - 16, ny = rand + 22;
    g.fillStyle = TINTE;
    g.beginPath(); g.moveTo(nx, ny - 16); g.lineTo(nx - 8, ny + 6); g.lineTo(nx, ny); g.lineTo(nx + 8, ny + 6); g.closePath(); g.fill();
    g.font = 'bold 13px Nunito, system-ui, sans-serif';
    g.fillText('N', nx, ny + 15);

    // Maßstab: Leiste = 1 cm = massstab Schritte
    const m = o.massstab || 5, lx = rand, ly = rand + tiefe * px + 16;
    g.fillStyle = TINTE;
    g.fillRect(lx, ly - 3, m * px, 6);
    g.fillRect(lx, ly - 8, 2, 16); g.fillRect(lx + m * px - 2, ly - 8, 2, 16);
    g.textAlign = 'left';
    g.font = 'bold 13px Nunito, system-ui, sans-serif';
    g.fillText(`= 1 cm auf der Karte = ${m} Schritte`, lx + m * px + 8, ly + 1);
    return { px, rand };
  }

  /** Kompassrose: Norden zeigt in Richtung −z der Welt; yaw = Blickrichtung der Kamera */
  function kompassWinkel(yaw) {
    return ((yaw - Math.PI) * 180 / Math.PI) % 360;
  }

  window.LernInselKarte = { zeichnen, kompassWinkel };
})();
