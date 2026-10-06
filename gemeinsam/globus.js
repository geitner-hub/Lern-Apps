// ═══════════════════════════════════════════════════════
//  Lernwelt – globus.js   (drehbarer Globus als SVG, Neue Lern-Apps Etappe 3)
//
//  Genutzt von: apps/gpg/laender-finder.html (Globus-Modi und Umschalter „Flach / Globus“)
//  Orthografische Projektion (so sieht die Erde aus dem All aus) über vendor/d3-geo.min.js –
//  kein WebGL, läuft also auch auf älteren iPads. Daten wie die flache Karte: daten/welt.json
//  (LernWelt), Ozeane aus daten/ozeane.json.
//
//  Ein Finger dreht, zwei Finger zoomen, Mausrad zoomt, leichter Schwung beim Loslassen
//  (nicht bei prefers-reduced-motion). Während des Drehens wird mit weniger Punkten gezeichnet.
//
//  API (window.LernGlobus):
//    ozeane()                 → Promise: [{ id, n, geo }] (fünf Ozeane, einmal geladen)
//    vereinfacht(geo, n)      → GeoJSON mit nur jedem n-ten Punkt (für Vorschaubilder/Drehen)
//    bild(elemente, mitte, groesse) → SVG-Inhalt eines stehenden Globus (Vorschaubilder)
//    ansicht({ svg, wrap, onTap(id, x, y, lonlat), onGeste })
//      → { setze(elemente), zeichne(), dreheZu([lon, lat], zoom?), mitte(), gradnetz(an), reset() }
//    elemente: [{ id: data-id, cls: Klassen, geo: GeoJSON, clip?: GeoJSON }] in Zeichenreihenfolge;
//    clip schneidet das Element auf eine Fläche zu (z. B. asiatischer Teil Russlands).
// ═══════════════════════════════════════════════════════

(function () {
  'use strict';
  if (window.LernGlobus) return;
  const NS = 'http://www.w3.org/2000/svg';
  const REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MAX_ZOOM = 6;
  let ozeanPromise = null, clipNr = 0;

  function entpacke(p, teiler) {
    return { type: 'MultiPolygon', coordinates: p.map(poly => poly.map(r => {
      const ring = []; let x = 0, y = 0;
      for (let i = 0; i + 1 < r.length; i += 2) { x += r[i]; y += r[i + 1]; ring.push([x / teiler, y / teiler]); }
      ring.push(ring[0]);
      return ring;
    })) };
  }

  function ozeane() {
    if (ozeanPromise) return ozeanPromise;
    const root = (window.LW && LW.ROOT) || '../../';
    ozeanPromise = fetch(root + 'daten/ozeane.json').then(r => { if (!r.ok) throw new Error('Ozeane fehlen'); return r.json(); })
      .then(d => d.ozeane.map(o => ({ id: o.id, n: o.n, geo: { type: 'Feature', geometry: entpacke(o.p, 10) } })))
      .catch(e => { ozeanPromise = null; throw e; });
    return ozeanPromise;
  }

  /** Nur jeden n-ten Punkt behalten (Ringe mit weniger als 4 Punkten bleiben ganz) */
  function vereinfacht(geo, n) {
    const g = geo.geometry || geo;
    const ring = r => {
      if (r.length <= 4 * n) return r;
      const o = [];
      for (let i = 0; i < r.length - 1; i += n) o.push(r[i]);
      o.push(o[0]);
      return o;
    };
    const coords = g.type === 'MultiPolygon' ? g.coordinates.map(p => p.map(ring))
      : g.type === 'Polygon' ? g.coordinates.map(ring) : g.coordinates;
    return { type: g.type, coordinates: coords };
  }

  function projektion(mitte, groesse, zoom) {
    return d3.geoOrthographic().rotate([-mitte[0], -mitte[1]]).clipAngle(90).precision(0.6)
      .scale(groesse / 2 * 0.94 * (zoom || 1)).translate([groesse / 2, groesse / 2]);
  }

  /** Stehender Globus als SVG-Inhalt (viewBox 0 0 groesse groesse) */
  function bild(elemente, mitte, groesse) {
    const pfad = d3.geoPath(projektion(mitte, groesse)).digits(1);
    let s = `<path class="kugel" d="${pfad({ type: 'Sphere' })}"/>`;
    elemente.forEach(e => { const d = pfad(e.geo); if (d) s += `<path class="${e.cls}" d="${d}"/>`; });
    return s;
  }

  function ansicht(o) {
    const svg = o.svg, wrap = o.wrap;
    const geste = () => { try { o.onGeste && o.onGeste(); } catch (e) {} };
    let mitte = [10, 30], zoom = 1, W = 0, H = 0, netz = true;
    let liste = [], els = [], grob = [];
    const proj = d3.geoOrthographic().clipAngle(90).precision(0.6);
    const pfad = d3.geoPath(proj).digits(1);
    const gradnetz = d3.geoGraticule().step([20, 20])();
    const hauptlinien = { type: 'MultiLineString', coordinates: [
      d3.range(-180, 181, 5).map(x => [x, 0]),                         // Äquator
      d3.range(-90, 91, 5).map(y => [0, y]) ] };                        // Nullmeridian

    svg.innerHTML = '';
    const defs = document.createElementNS(NS, 'defs');
    const mk = (cls, eltern) => { const p = document.createElementNS(NS, 'path'); p.setAttribute('class', cls); (eltern || svg).appendChild(p); return p; };
    svg.appendChild(defs);
    const kugel = mk('kugel'), gNetz = mk('grat'), gHaupt = mk('grat grat-haupt');
    const gruppe = document.createElementNS(NS, 'g'); svg.appendChild(gruppe);
    const rand = mk('kugel-rand');

    function groesse() {
      const r = wrap.getBoundingClientRect();
      if (!r.width || !r.height) return false;
      W = r.width; H = r.height;
      svg.setAttribute('viewBox', `0 0 ${W.toFixed(0)} ${H.toFixed(0)}`);
      return true;
    }
    function basis() { return Math.min(W, H) / 2 * 0.92; }

    let idleT = 0;
    function zeichne(grobZeichnen) {
      if (!W && !groesse()) return;
      proj.rotate([-mitte[0], -mitte[1]]).scale(basis() * zoom).translate([W / 2, H / 2]);
      const kd = pfad({ type: 'Sphere' });
      kugel.setAttribute('d', kd); rand.setAttribute('d', kd);
      gNetz.setAttribute('d', netz ? pfad(gradnetz) || '' : '');
      gHaupt.setAttribute('d', netz ? pfad(hauptlinien) || '' : '');
      els.forEach((el, i) => {
        const e = liste[i];
        el.setAttribute('d', pfad(grobZeichnen ? grob[i] : e.geo) || '');
        if (el._clip) el._clip.setAttribute('d', pfad(e.clip) || '');
      });
    }
    /** Während Gesten grob zeichnen, kurz danach fein */
    let rafT = 0;
    function bald() {
      if (!rafT) rafT = requestAnimationFrame(() => { rafT = 0; zeichne(true); });
      clearTimeout(idleT);
      idleT = setTimeout(() => zeichne(false), 140);
    }

    function setze(elemente) {
      liste = elemente; els = []; grob = [];
      gruppe.innerHTML = ''; defs.innerHTML = '';
      elemente.forEach(e => {
        const p = document.createElementNS(NS, 'path');
        p.setAttribute('class', e.cls);
        if (e.id) p.setAttribute('data-id', e.id);
        if (e.clip) {
          const cp = document.createElementNS(NS, 'clipPath'), id = 'globus-clip-' + (++clipNr);
          cp.setAttribute('id', id);
          const cpath = document.createElementNS(NS, 'path'); cp.appendChild(cpath); defs.appendChild(cp);
          p.setAttribute('clip-path', `url(#${id})`);
          p._clip = cpath;
        }
        gruppe.appendChild(p); els.push(p);
        grob.push(vereinfacht(e.geo, 4));
      });
      zeichne(false);
    }

    // ── Drehen zu einem Ort (weich) ──────────────────
    let anim = 0;
    function stopAnim() { cancelAnimationFrame(anim); anim = 0; }
    function dreheZu(ziel, zielZoom) {
      stopAnim();
      const z1 = zielZoom || zoom;
      if (REDUCED) { mitte = ziel.slice(); zoom = z1; zeichne(false); return; }
      const start = mitte.slice(), z0 = zoom, t0 = performance.now(), dauer = 700;
      const interp = d3.geoInterpolate(start, ziel);
      const schritt = t => {
        const k = Math.min(1, (t - t0) / dauer), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        mitte = interp(e); zoom = z0 + (z1 - z0) * e;
        if (k < 1) { zeichne(true); anim = requestAnimationFrame(schritt); } else { anim = 0; zeichne(false); }
      };
      anim = requestAnimationFrame(schritt);
    }

    // ── Gesten ─────────────────────────────────────
    const ptrs = new Map();
    let gest = null, schwung = null;
    const dist = () => { const [a, b] = [...ptrs.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
    function drehen(dx, dy) {
      const k = 180 / Math.PI / (basis() * zoom);       // Pixel → Grad an der Kugelmitte
      mitte = [((mitte[0] - dx * k + 540) % 360) - 180, Math.max(-80, Math.min(80, mitte[1] + dy * k))];
    }

    svg.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (e.isPrimary && ptrs.size) { ptrs.clear(); gest = null; }
      stopAnim(); schwung = null;
      try { svg.setPointerCapture(e.pointerId); } catch (_) {}
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 1) gest = { t: 'tap', sx: e.clientX, sy: e.clientY, lx: e.clientX, ly: e.clientY, lt: performance.now(), vx: 0, vy: 0 };
      else if (ptrs.size === 2) gest = { t: 'pinch', d0: dist(), z0: zoom };
      else gest = { t: 'none' };
    });
    svg.addEventListener('pointermove', e => {
      if (!ptrs.has(e.pointerId) || !gest) return;
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if ((gest.t === 'tap' || gest.t === 'drehen') && ptrs.size === 1) {
        if (gest.t === 'tap' && Math.hypot(e.clientX - gest.sx, e.clientY - gest.sy) > 9) gest.t = 'drehen';
        if (gest.t === 'drehen') {
          const t = performance.now(), dx = e.clientX - gest.lx, dy = e.clientY - gest.ly, dt = Math.max(1, t - gest.lt);
          drehen(dx, dy);
          gest.vx = gest.vx * .5 + dx / dt * .5; gest.vy = gest.vy * .5 + dy / dt * .5;
          gest.lx = e.clientX; gest.ly = e.clientY; gest.lt = t;
          bald(); geste();
        }
      } else if (gest.t === 'pinch' && ptrs.size === 2) {
        zoom = Math.max(1, Math.min(MAX_ZOOM, gest.z0 * dist() / gest.d0));
        bald(); geste();
      }
    });
    function schwingen(vx, vy) {
      if (REDUCED || Math.hypot(vx, vy) < .15) return;
      let t0 = performance.now();
      schwung = { vx, vy };
      const schritt = t => {
        if (!schwung) return;
        const dt = t - t0; t0 = t;
        schwung.vx *= Math.pow(.94, dt / 16); schwung.vy *= Math.pow(.94, dt / 16);
        drehen(schwung.vx * dt, schwung.vy * dt); bald();
        if (Math.hypot(schwung.vx, schwung.vy) > .02) anim = requestAnimationFrame(schritt); else schwung = null;
      };
      anim = requestAnimationFrame(schritt);
    }
    function end(e) {
      if (!ptrs.has(e.pointerId)) return;
      const war = gest && gest.t, einzeln = ptrs.size === 1;
      ptrs.delete(e.pointerId);
      if (war === 'tap' && einzeln && e.type === 'pointerup') {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const hit = el && el.closest && el.closest('[data-id]');
        const r = svg.getBoundingClientRect();
        const ll = proj.invert([e.clientX - r.left, e.clientY - r.top]);
        const aufKugel = ll && d3.geoDistance(ll, mitte) < Math.PI / 2;
        try { o.onTap && o.onTap(hit && svg.contains(hit) ? hit.getAttribute('data-id') : null, e.clientX, e.clientY, aufKugel ? ll : null); } catch (err) { console.error(err); }
      } else if (war === 'drehen' && einzeln && e.type === 'pointerup' && performance.now() - gest.lt < 80) {
        schwingen(gest.vx, gest.vy);
      }
      if (ptrs.size === 0) gest = null;
      else if (gest && gest.t === 'pinch') gest = { t: 'none' };
    }
    svg.addEventListener('pointerup', end);
    svg.addEventListener('pointercancel', end);
    svg.addEventListener('lostpointercapture', end);
    document.addEventListener('visibilitychange', () => { ptrs.clear(); gest = null; });
    svg.addEventListener('wheel', e => { e.preventDefault(); zoom = Math.max(1, Math.min(MAX_ZOOM, zoom * (e.deltaY < 0 ? 1.2 : 1 / 1.2))); bald(); geste(); }, { passive: false });
    ['gesturestart', 'gesturechange'].forEach(t => wrap.addEventListener(t, e => e.preventDefault()));
    new ResizeObserver(() => { if (groesse()) zeichne(false); }).observe(wrap);

    return {
      setze, dreheZu,
      zeichne: () => zeichne(false),
      mitte: () => mitte.slice(),
      zoomen(f) { zoom = Math.max(1, Math.min(MAX_ZOOM, zoom * f)); zeichne(false); },
      gradnetz(an) { netz = !!an; zeichne(false); },
      reset() { stopAnim(); zoom = 1; zeichne(false); },
      groesse() { if (groesse()) zeichne(false); },
    };
  }

  window.LernGlobus = { ozeane, vereinfacht, bild, ansicht };
})();
