// ═══════════════════════════════════════════════════════
//  Lernwelt – karten-ansicht.js   (Karten laden, zoomen, verschieben, antippen)
//
//  Genutzt von: apps/gpg/laender-finder.html, spiele/expedition.html
//  Kartendaten: daten/karten.json (Natural Earth, gemeinfrei; vorbereitet & vereinfacht)
//    { europa|deutschland: { w, h, v: Kernausschnitt [x,y,w,h], g: Gradnetz,
//                            f: [{ id, n: Name, d: Pfad, c?: Kontext, h?: [[x,y,r],…] Tipphilfe }] } }
//
//  API (window.LernKarte):
//    laden(url)                    → Promise: Kartendaten (einmal geladen, dann aus dem Speicher)
//    ansicht({ svg, wrap, onTap(id, x, y), onGeste(), maxZoom })
//                                  → { init(karte), fit(), zoomAt(x, y, f), centerZoom(f), reset(),
//                                      zuMap(x, y), zeige(x, y, w, h) }
//      Tippen, Ziehen (verschieben), zwei Finger (zoomen), Mausrad.
//      Hängengebliebene Finger werden aufgeräumt (iPad: kein pointerup nach Systemgesten).
//    mitte(pfad)                   → [x, y] Mitte des größten Teilstücks eines Kartenpfads
// ═══════════════════════════════════════════════════════

(function () {
  'use strict';
  if (window.LernKarte) return;

  let cache = null;
  function laden(url) {
    if (!cache) cache = fetch(url).then(r => { if (!r.ok) throw new Error('Karte nicht gefunden'); return r.json(); })
      .catch(e => { cache = null; throw e; });
    return cache;
  }

  /** Mitte des größten Teilstücks (Pfade: „M x y l dx dy … z“) */
  function mitte(d) {
    let best = null;
    String(d).split(/(?=M)/).forEach(teil => {
      const zahlen = (teil.match(/-?\d+(\.\d+)?/g) || []).map(Number);
      if (zahlen.length < 2) return;
      let x = zahlen[0], y = zahlen[1], minX = x, maxX = x, minY = y, maxY = y;
      for (let i = 2; i + 1 < zahlen.length; i += 2) {
        x += zahlen[i]; y += zahlen[i + 1];
        minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
      const flaeche = (maxX - minX) * (maxY - minY);
      if (!best || flaeche > best.f) best = { f: flaeche, x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
    });
    return best ? [best.x, best.y] : [0, 0];
  }

  function ansicht(o) {
    const svg = o.svg, wrap = o.wrap, MAX_ZOOM = o.maxZoom || 8;
    const geste = () => { try { o.onGeste && o.onGeste(); } catch (e) {} };
    let M = null, full = null, vb = null;

    function fit() {
      const r = wrap.getBoundingClientRect();
      if (!M || !r.width || !r.height) return;
      const [kx, ky, kw, kh] = M.v;                  // Kernausschnitt (Rand drumherum füllt breite Bildschirme)
      const A = r.width / r.height, pad = 1.03;
      let w, h;
      if (A > kw / kh) { h = kh * pad; w = h * A; } else { w = kw * pad; h = w / A; }
      const prev = full;
      full = { x: kx + (kw - w) / 2, y: ky + (kh - h) / 2, w, h };
      if (!vb || !prev) vb = { ...full };
      else {                                          // Zoomstufe & Mitte behalten
        const z = prev.w / vb.w, cx = vb.x + vb.w / 2, cy = vb.y + vb.h / 2;
        vb = { w: full.w / z, h: full.h / z, x: 0, y: 0 };
        vb.x = cx - vb.w / 2; vb.y = cy - vb.h / 2;
      }
      clamp(); apply();
    }
    function clamp() {
      if (vb.w >= full.w) { vb = { ...full }; return; }
      const [kx, ky, kw, kh] = M.v;
      const cx = Math.max(kx, Math.min(kx + kw, vb.x + vb.w / 2));
      const cy = Math.max(ky, Math.min(ky + kh, vb.y + vb.h / 2));
      vb.x = cx - vb.w / 2; vb.y = cy - vb.h / 2;
    }
    function apply() { svg.setAttribute('viewBox', `${vb.x.toFixed(1)} ${vb.y.toFixed(1)} ${vb.w.toFixed(1)} ${vb.h.toFixed(1)}`); }
    function scale() { const r = svg.getBoundingClientRect(); return Math.min(r.width / vb.w, r.height / vb.h); }
    function toMap(cx, cy, v = vb) {
      const r = svg.getBoundingClientRect(), s = Math.min(r.width / v.w, r.height / v.h);
      const ox = r.left + (r.width - v.w * s) / 2, oy = r.top + (r.height - v.h * s) / 2;
      return { x: v.x + (cx - ox) / s, y: v.y + (cy - oy) / s };
    }
    function zoomAt(cx, cy, factor, base = vb) {
      const p = toMap(cx, cy, base);
      const w = Math.max(full.w / MAX_ZOOM, Math.min(full.w, base.w / factor));
      const k = w / base.w;
      vb = { x: p.x - (p.x - base.x) * k, y: p.y - (p.y - base.y) * k, w, h: base.h * k };
      clamp(); apply(); geste();
    }
    function centerZoom(f) { const r = wrap.getBoundingClientRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, f); }
    /** Ausschnitt so setzen, dass das Rechteck (Kartenkoordinaten) sichtbar ist */
    function zeige(x, y, w, h) {
      if (!full) return;
      const A = full.w / full.h;
      let vw = Math.max(w, h * A) * 1.25; vw = Math.max(full.w / MAX_ZOOM, Math.min(full.w, vw));
      vb = { w: vw, h: vw / A, x: x + w / 2 - vw / 2, y: y + h / 2 - vw / A / 2 };
      clamp(); apply();
    }

    // Gesten
    const ptrs = new Map();
    let gest = null;
    const dist = () => { const [a, b] = [...ptrs.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
    const mid  = () => { const [a, b] = [...ptrs.values()]; return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; };

    svg.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (e.isPrimary && ptrs.size) { ptrs.clear(); gest = null; }      // Reste einer früheren Berührung
      try { svg.setPointerCapture(e.pointerId); } catch (_) {}
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 1) gest = { t: 'tap', sx: e.clientX, sy: e.clientY, v0: { ...vb } };
      else if (ptrs.size === 2) { const m = mid(); gest = { t: 'pinch', d0: dist(), m0: m, v0: { ...vb } }; }
      else gest = { t: 'none' };
    });
    svg.addEventListener('pointermove', e => {
      if (!ptrs.has(e.pointerId) || !gest) return;
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if ((gest.t === 'tap' || gest.t === 'pan') && ptrs.size === 1) {
        const dx = e.clientX - gest.sx, dy = e.clientY - gest.sy;
        if (gest.t === 'tap' && Math.hypot(dx, dy) > 9) gest.t = 'pan';
        if (gest.t === 'pan' && gest.v0.w < full.w) {
          const s = scale();
          vb = { ...gest.v0, x: gest.v0.x - dx / s, y: gest.v0.y - dy / s };
          clamp(); apply(); geste();
        }
      } else if (gest.t === 'pinch' && ptrs.size === 2) {
        const m = mid(), f = dist() / gest.d0;
        // Punkt unter den Fingern festhalten: erst um m0 zoomen, dann verschieben
        zoomAt(gest.m0.x, gest.m0.y, f, gest.v0);
        const s = scale();
        vb.x -= (m.x - gest.m0.x) / s; vb.y -= (m.y - gest.m0.y) / s;
        clamp(); apply();
      }
    });
    function end(e) {
      if (!ptrs.has(e.pointerId)) return;
      const wasTap = gest && gest.t === 'tap' && ptrs.size === 1 && e.type === 'pointerup';
      ptrs.delete(e.pointerId);
      if (wasTap) {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const hit = el && el.closest && el.closest('[data-id]');
        try { o.onTap && o.onTap(hit ? hit.getAttribute('data-id') : null, e.clientX, e.clientY); } catch (err) { console.error(err); }
      }
      if (ptrs.size === 0) gest = null;
      else if (gest && gest.t === 'pinch') gest = { t: 'none' };   // nach Pinch erst alle Finger lösen
    }
    svg.addEventListener('pointerup', end);
    svg.addEventListener('pointercancel', end);
    svg.addEventListener('lostpointercapture', end);
    document.addEventListener('visibilitychange', () => { ptrs.clear(); gest = null; });
    svg.addEventListener('wheel', e => { e.preventDefault(); zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.2 : 1 / 1.2); }, { passive: false });
    // iOS: Seiten-Zoom durch Gesten verhindern
    ['gesturestart', 'gesturechange'].forEach(t => wrap.addEventListener(t, e => e.preventDefault()));
    new ResizeObserver(() => fit()).observe(wrap);

    return {
      init(map) { ptrs.clear(); gest = null; M = map; full = null; vb = null; fit(); },
      fit, zoomAt, centerZoom, zeige,
      reset() { if (full) { vb = { ...full }; apply(); } },
      zuMap(x, y) { return toMap(x, y); },
    };
  }

  window.LernKarte = { laden, ansicht, mitte };
})();
