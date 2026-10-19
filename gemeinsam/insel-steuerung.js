// ═══════════════════════════════════════════════════════
//  Lernwelt – insel-steuerung.js   („Die Insel“: Joystick, Kamera, Bewegung)
//
//  Wird geladen von: spiele/insel.html
//  Braucht: spiel-hilfen.js (LernSpiel.zeiger: mehrere Finger, räumt „Geisterfinger“ auf)
//
//  Ziel: Ein Kind läuft ohne Erklärung los.
//    - Joystick (linke Hälfte): erscheint dort, wo der Daumen aufsetzt, verschwindet beim
//      Loslassen. Kleine Totzone, wenig Auslenkung = gehen, ab 70 % = rennen.
//      Richtung relativ zur Kamera (nach oben = vom Betrachter weg).
//    - Kamera (rechte Hälfte): Wischen dreht um die Figur. Beim Vorwärtslaufen schwenkt sie
//      langsam von selbst hinter die Figur (nicht bei „Bewegung reduzieren“).
//    - Kollision mit dem Blockgitter, Gleiten an Wänden, Stufen von einem Block steigt die
//      Figur von selbst hoch. Wasser und Inselrand sind nicht begehbar.
//    - Lehrer-PC: WASD oder Pfeiltasten, Q/E Kamera, Leertaste = Aktion.
//
//  API (window.LernInselSteuerung):
//    erstelle({ flaeche, welt, spieler, aktion, optionen })
//      flaeche   Element, das die Finger bekommt (Bildschirm hinter dem HUD)
//      welt      aus LernInselWelt (fest, kamera, nass, boden)
//      spieler   { x, y, z, blick } – wird verändert (y = Füße; blick = Drehung der Figur)
//      aktion()  wird bei Leertaste/Enter aufgerufen
//      darf(x, z) → false: dort nicht hineinlaufen (geschlossenes Gebiet, ab Etappe 2)
//      gesperrt(x, z)  wird aufgerufen, wenn darf() den Weg versperrt (Hinweis zeigen)
//      tippen(x, y)    kurzes Antippen ohne Wischen (Bildschirmkoordinaten) – z. B. Block setzen
//      optionen  { seitenTauschen, joystickGroesse (1 = 60 px), kameraTempo (1), reduce, kameraHoch (Baumodus) }
//    → { update(dt) → { lauf 0–1, rennt, bewegt }, kamera(cam, dt) → Abstand, yaw, setzeOptionen(o),
//        stopp(), destroy(), aktiv() }
// ═══════════════════════════════════════════════════════

(function () {
  'use strict';
  if (window.LernInselSteuerung) return;

  const BREITE = .3, GROESSE = 1.7;                  // halbe Breite, Höhe der Figur (in Blöcken)
  const GEHEN = 3.2, RENNEN = 5.6;                   // Blöcke pro Sekunde
  const TOTZONE = .15, RENN_AB = .7;
  const KAM_ABSTAND = 5.5, KAM_HOEHE = 2.6, KAM_ZIEL = 1.4;

  function erstelle(o) {
    const { flaeche, welt, spieler } = o;
    const opt = Object.assign({ seitenTauschen: false, joystickGroesse: 1, kameraTempo: 1, reduce: false }, o.optionen || {});
    let yaw = spieler.blick || 0;                    // Blickrichtung der Kamera (wie die Figur: 0 = +z)
    let vy = 0, amBoden = false, anzeigeY = spieler.y;
    let joy = null, kam = null, letzteKamera = -1e9;
    const jx = { x: 0, y: 0 };                       // Joystick −1…1 (y: oben = +1)
    const tasten = new Set();

    // ── Joystick-Anzeige ──────────────────────────────────
    const ring = document.createElement('div');
    const knopf = document.createElement('div');
    ring.className = 'insel-joy'; knopf.className = 'insel-joy-knopf';
    ring.appendChild(knopf);
    ring.hidden = true;
    flaeche.appendChild(ring);
    const radius = () => 60 * opt.joystickGroesse;

    function joyZeigen(p) {
      const r = radius();
      ring.style.width = ring.style.height = 2 * r + 'px';
      ring.style.left = (p.startX - r) + 'px';
      ring.style.top = (p.startY - r) + 'px';
      knopf.style.transform = 'translate(-50%,-50%)';
      ring.hidden = false;
    }
    function joyBewegen(p) {
      const r = radius();
      let dx = p.x - p.startX, dy = p.y - p.startY;
      const d = Math.hypot(dx, dy);
      if (d > r) { dx *= r / d; dy *= r / d; }
      knopf.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      jx.x = dx / r; jx.y = -dy / r;
    }
    function joyEnde() { joy = null; jx.x = jx.y = 0; ring.hidden = true; }

    const links = x => {
      const r = flaeche.getBoundingClientRect();
      const l = x - r.left < r.width / 2;
      return opt.seitenTauschen ? !l : l;
    };
    const zeiger = window.LernSpiel.zeiger(flaeche, {
      down(p) {
        p.daten.cx = p.x; p.daten.cy = p.y; p.daten.weit = 0;      // Bildschirmstelle für „Antippen“
        if (links(p.x)) {
          if (joy) return false;
          joy = p.id; p.daten.art = 'joy';
          const r = flaeche.getBoundingClientRect();
          p.startX -= r.left; p.startY -= r.top; p.x = p.startX; p.y = p.startY;
          joyZeigen(p);
        } else {
          if (kam) return false;
          kam = p.id; p.daten.art = 'kam'; p.daten.lx = p.x;
        }
      },
      move(p) {
        p.daten.weit = Math.max(p.daten.weit, Math.hypot(p.x - p.daten.cx, p.y - p.daten.cy));
        if (p.daten.art === 'joy') {
          const r = flaeche.getBoundingClientRect();
          p.x -= r.left; p.y -= r.top;
          joyBewegen(p);
        } else if (p.daten.art === 'kam') {
          yaw -= (p.x - p.daten.lx) * .009 * opt.kameraTempo;
          p.daten.lx = p.x;
          letzteKamera = performance.now();
        }
      },
      up(p) {
        // kurz angetippt, kaum bewegt → Antippen (z. B. Block setzen); Joystick/Kamera bleiben unberührt
        const tipp = o.tippen && p.daten.weit < 14 && performance.now() - p.t0 < 400;
        ende(p);
        if (tipp) o.tippen(p.daten.cx, p.daten.cy);
      },
      cancel(p) { ende(p); },
    });
    function ende(p) {
      if (p.daten.art === 'joy') joyEnde();
      else if (p.daten.art === 'kam') { kam = null; letzteKamera = performance.now(); }
    }

    // ── Tastatur ──────────────────────────────────────────
    const onKey = e => {
      if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (e.type === 'keydown' && (k === ' ' || k === 'Enter')) {
        if (e.target && e.target.tagName === 'BUTTON') return;
        e.preventDefault();
        if (!e.repeat && o.aktion) o.aktion();
        return;
      }
      if (!['w', 'a', 's', 'd', 'q', 'e', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Shift'].includes(k)) return;
      e.preventDefault();
      if (e.type === 'keydown') tasten.add(k); else tasten.delete(k);
    };
    const tastenLos = () => tasten.clear();
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    window.addEventListener('blur', tastenLos);

    // ── Kollision ─────────────────────────────────────────
    function stoesst(x, y, z) {
      const x0 = Math.floor(x - BREITE), x1 = Math.floor(x + BREITE - 1e-4);
      const z0 = Math.floor(z - BREITE), z1 = Math.floor(z + BREITE - 1e-4);
      const y0 = Math.floor(y + 1e-4), y1 = Math.floor(y + GROESSE - 1e-4);
      for (let by = y0; by <= y1; by++) for (let bz = z0; bz <= z1; bz++) for (let bx = x0; bx <= x1; bx++)
        if (welt.fest(bx, by, bz)) return true;
      return false;
    }
    /** Auf Zäune (Absperrungen) steigt die Figur nie, auch nicht von einem höheren Ufer aus */
    function steigbar(x, y, z) {
      if (!welt.steigbar) return true;
      for (let bz = Math.floor(z - BREITE); bz <= Math.floor(z + BREITE - 1e-4); bz++)
        for (let bx = Math.floor(x - BREITE); bx <= Math.floor(x + BREITE - 1e-4); bx++)
          if (!welt.steigbar(bx, y, bz)) return false;
      return true;
    }
    /** Darf die Figur hier stehen? Wasser (auch nach einem Sturz) sperrt. */
    function betretbar(x, z, y) {
      if (x < .5 || z < .5 || x > welt.N - .5 || z > welt.N - .5) return false;
      if (o.darf && !o.darf(x, z)) { if (o.gesperrt) o.gesperrt(x, z); return false; }   // geschlossenes Gebiet
      const bx = Math.floor(x), bz = Math.floor(z);
      for (let by = Math.floor(y + 1e-4) - 1; by >= 0; by--) {
        if (welt.nass(bx, by, bz)) return false;
        if (welt.fest(bx, by, bz)) return true;
      }
      return false;
    }
    /** Eine Achse bewegen; bei einer Stufe von einem Block hochsteigen. */
    function schritt(nx, nz) {
      if (!betretbar(nx, nz, spieler.y)) return false;
      if (!stoesst(nx, spieler.y, nz)) { spieler.x = nx; spieler.z = nz; return true; }
      if (amBoden) {
        const hoch = Math.floor(spieler.y + 1e-4) + 1;
        if (!stoesst(spieler.x, hoch, spieler.z) && !stoesst(nx, hoch, nz) && steigbar(nx, hoch - 1, nz)) {
          spieler.x = nx; spieler.z = nz; spieler.y = hoch; vy = 0;
          return true;
        }
      }
      return false;                                  // Wand: diese Achse bleibt stehen → Gleiten
    }

    // ── Bewegen (je Bild) ─────────────────────────────────
    function update(dt) {
      dt = Math.min(dt, .1);
      let ix = jx.x, iy = jx.y, rennt = false;
      if (tasten.size) {
        ix = (tasten.has('d') || tasten.has('ArrowRight') ? 1 : 0) - (tasten.has('a') || tasten.has('ArrowLeft') ? 1 : 0);
        iy = (tasten.has('w') || tasten.has('ArrowUp') ? 1 : 0) - (tasten.has('s') || tasten.has('ArrowDown') ? 1 : 0);
        const q = (tasten.has('q') ? 1 : 0) - (tasten.has('e') ? 1 : 0);
        if (q) { yaw += q * 2.2 * dt * opt.kameraTempo; letzteKamera = performance.now(); }
        const l = Math.hypot(ix, iy);
        if (l) { ix /= l; iy /= l; }
        rennt = !tasten.has('Shift');
      }
      const m = Math.min(1, Math.hypot(ix, iy));
      let lauf = 0, bewegt = false;
      if (m > TOTZONE) {
        if (!tasten.size) rennt = m >= RENN_AB;
        const tempo = rennt ? RENNEN : GEHEN;
        // vorwärts = Blickrichtung der Kamera, rechts = (−cos, +sin)
        const fx = Math.sin(yaw), fz = Math.cos(yaw), rx = -Math.cos(yaw), rz = Math.sin(yaw);
        let dx = (fx * iy + rx * ix) / m, dz = (fz * iy + rz * ix) / m;
        const weg = tempo * dt;
        const ax = spieler.x, az = spieler.z;
        schritt(spieler.x + dx * weg, spieler.z);
        schritt(spieler.x, spieler.z + dz * weg);
        bewegt = Math.hypot(spieler.x - ax, spieler.z - az) > 1e-4;
        lauf = rennt ? 1 : .55;
        // Figur dreht sich weich in Laufrichtung
        const ziel = Math.atan2(dx, dz);
        let d = ziel - spieler.blick;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        spieler.blick += d * Math.min(1, dt * 12);
        // Kamera schwenkt langsam hinter die Figur – nur beim Vorwärtslaufen, nicht direkt nach dem Wischen
        if (!opt.reduce && kam === null && performance.now() - letzteKamera > 1200) {
          const vor = Math.max(0, iy / m);
          let k = spieler.blick - yaw;
          k = Math.atan2(Math.sin(k), Math.cos(k));
          yaw += k * Math.min(1, dt * .9 * vor);
        }
      }
      // Schwerkraft (Fallen von Kanten)
      vy = Math.max(-20, vy - 30 * dt);
      const ny = spieler.y + vy * dt;
      if (stoesst(spieler.x, ny, spieler.z)) {
        if (vy < 0) { spieler.y = Math.floor(ny + 1e-4) + 1; amBoden = true; }
        vy = 0;
      } else { spieler.y = ny; amBoden = false; }
      if (stoesst(spieler.x, spieler.y, spieler.z)) spieler.y = Math.floor(spieler.y) + 1;   // stecken geblieben
      // Anzeige folgt weich (Stufen ohne Ruckeln)
      anzeigeY += (spieler.y - anzeigeY) * Math.min(1, dt * 14);
      if (Math.abs(spieler.y - anzeigeY) > 2) anzeigeY = spieler.y;
      spieler.anzeigeY = anzeigeY;
      return { lauf: bewegt ? lauf : 0, rennt, bewegt };
    }

    // ── Kamera (dritte Person, schräg von hinten) ─────────
    // Steht eine Wand oder ein Hang hinter der Figur, weicht die Kamera weich nach oben aus.
    const HOEHEN = [KAM_HOEHE - KAM_ZIEL, 2.4, 3.6, 4.8, 5.4];
    let kamHoehe = HOEHEN[0];
    /** Freier Abstand vom Kopf in Richtung Kamera (bis zur ersten Wand) */
    function frei(zx, zy, zz, wx, wy, wz) {
      const len = Math.hypot(wx, wy, wz);
      for (let s = .2; s <= len; s += .2) {
        if (welt.kamera(Math.floor(zx + wx * s / len), Math.floor(zy + wy * s / len), Math.floor(zz + wz * s / len))) return s;
      }
      return len;
    }
    /** Kamera setzen; liefert den Abstand zur Figur (sehr klein → Figur ausblenden) */
    function kamera(cam, dt = 1 / 30) {
      const zx = spieler.x, zy = anzeigeY + KAM_ZIEL, zz = spieler.z;
      const sx = -Math.sin(yaw), sz = -Math.cos(yaw);
      const waag = h => Math.sqrt(Math.max(1, KAM_ABSTAND * KAM_ABSTAND - h * h));   // gleicher Abstand, steilerer Winkel
      let ziel = HOEHEN[HOEHEN.length - 1], best = -1;
      for (const h of opt.kameraHoch ? HOEHEN.slice(2) : HOEHEN) {   // Baumodus: steiler von oben
        const w = waag(h), d = frei(zx, zy, zz, sx * w, h, sz * w);
        if (d >= KAM_ABSTAND * .8) { ziel = h; break; }
        if (d > best) { best = d; ziel = h; }
      }
      kamHoehe += (ziel - kamHoehe) * (opt.reduce ? 1 : Math.min(1, dt * 5));
      const w = waag(kamHoehe), wx = sx * w, wy = kamHoehe, wz = sz * w;
      const len = Math.hypot(wx, wy, wz);
      const d = Math.max(.3, Math.min(len, frei(zx, zy, zz, wx, wy, wz) - .3));
      cam.position.set(zx + wx * d / len, zy + wy * d / len, zz + wz * d / len);
      cam.lookAt(zx, zy, zz);
      return d;
    }

    function stopp() { zeiger.reset(); joyEnde(); kam = null; tasten.clear(); }

    return {
      update, kamera, stopp,
      get yaw() { return yaw; },
      aktiv: () => joy !== null || kam !== null || tasten.size > 0,
      setzeOptionen(n) { Object.assign(opt, n || {}); },
      destroy() {
        stopp(); zeiger.destroy(); ring.remove();
        window.removeEventListener('keydown', onKey);
        window.removeEventListener('keyup', onKey);
        window.removeEventListener('blur', tastenLos);
      },
    };
  }

  window.LernInselSteuerung = { erstelle };
})();
