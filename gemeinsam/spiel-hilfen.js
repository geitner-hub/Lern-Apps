// ═══════════════════════════════════════════════════════
//  Lernwelt – spiel-hilfen.js   (kleine Bausteine für die Spiele)
//
//  Für die neuen Spiele (Tauziehen, Wort des Tages, Zauberwort,
//  Sprach-Küche, Expedition). RUN! und Tower Defense bleiben, wie sie sind.
//
//  API (window.LernSpiel):
//    whenPass(fn)                       fn(LernPass), sobald der Pass geladen ist
//    speichereRunde({ score, max, titel, skill, inhalt })
//                                       Runde an die Lernwelt melden (XP, Sterne, Dorf-Filter).
//                                       Alle Runden zählen als EINE App, auch mit ?pool=… im Link.
//    endlos({ key, correct, seconds })  Endlos-/Übungsmodus: XP höchstens einmal am Tag
//                                       (LernPass.awardEndless, wie in RUN!)
//    zeiger(el, { down, move, up, cancel })
//                                       Finger bzw. Maus verfolgen, auch mehrere gleichzeitig.
//                                       Räumt hängengebliebene Finger selbst auf.
//                                       → { aktive: Map, reset(), destroy() }
//    zufall(seed)                       wiederholbarer Zufall (0…1), z. B. für „Wort des Tages“
//    tagSchluessel(datum?)              '2026-09-28' in Ortszeit
// ═══════════════════════════════════════════════════════

(function () {
  'use strict';
  if (window.LernSpiel) return;

  function whenPass(fn) {
    if (window.LernPass) fn(window.LernPass);
    else window.addEventListener('lernpass:ready', () => fn(window.LernPass), { once: true });
  }

  /** Runde melden. Der Link-Teil (?pool=…) wird kurz ausgeblendet, damit alle Runden zur selben App zählen. */
  function speichereRunde(r) {
    if (!window.LernApps || !r) return;
    const s = location.search;
    const eintrag = { score: Number(r.score) || 0, max: Number(r.max) || 0,
      label: String(r.label || `${r.score} / ${r.max} ${r.titel || ''}`).trim().slice(0, 40) };
    if (r.skill) eintrag.skill = String(r.skill);
    if (r.inhalt) eintrag.inhalt = r.inhalt;
    try { if (s) history.replaceState(null, '', location.pathname); } catch (e) {}
    try { window.LernApps.saveResult(eintrag); } catch (e) {}
    try { if (s) history.replaceState(null, '', location.pathname + s); } catch (e) {}
  }

  /** Endlos-Modus: XP für den besten Lauf des Tages (Schlüssel = Dateiname der Seite). */
  function endlos(r) {
    whenPass(P => {
      if (!P || !P.awardEndless) return;
      const key = r.key || (location.pathname.split('/').pop() || 'spiel');
      try { P.toast(P.awardEndless({ key, correct: r.correct, seconds: r.seconds })); } catch (e) {}
    });
  }

  /**
   * Zeiger verfolgen – robust gegen iPad-Eigenheiten.
   * iPadOS schickt nicht immer pointerup/pointercancel (Handballen am Rand, Systemgesten,
   * Wechsel der Ansicht mitten in der Berührung). Ohne Aufräumen bleiben dann „Geisterfinger“
   * hängen und jedes neue Tippen wird falsch gedeutet. Deshalb:
   *   – erster Finger einer neuen Berührung (isPrimary) → alte Einträge verwerfen
   *   – lostpointercapture ohne pointerup → wie Abbruch behandeln
   *   – Seite verdeckt oder Fenster verliert den Fokus → alles abbrechen
   * Handler bekommen p = { id, x, y, startX, startY, t0, typ, daten } (daten = frei für das Spiel).
   * down(p, e) darf false liefern → dieser Finger wird ignoriert.
   */
  function zeiger(el, h = {}) {
    const aktive = new Map();
    const call = (name, p, e) => { try { return h[name] ? h[name](p, e) : undefined; } catch (err) { console.error(err); } };
    const abbrechen = id => { const p = aktive.get(id); if (!p) return; aktive.delete(id); call('cancel', p); };
    const alleAbbrechen = () => [...aktive.keys()].forEach(abbrechen);

    const onDown = e => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (e.isPrimary && aktive.size) alleAbbrechen();               // Reste einer früheren Berührung
      const p = { id: e.pointerId, x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY,
                  t0: performance.now(), typ: e.pointerType, daten: {} };
      if (call('down', p, e) === false) return;
      aktive.set(e.pointerId, p);
      try { el.setPointerCapture(e.pointerId); } catch (x) {}
    };
    const onMove = e => {
      const p = aktive.get(e.pointerId);
      if (!p) return;
      p.x = e.clientX; p.y = e.clientY;
      call('move', p, e);
    };
    const onUp = e => {
      const p = aktive.get(e.pointerId);
      if (!p) return;
      aktive.delete(e.pointerId);
      p.x = e.clientX; p.y = e.clientY;
      call('up', p, e);
    };
    const onCancel = e => abbrechen(e.pointerId);
    const onVis = () => { if (document.hidden) alleAbbrechen(); };

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onCancel);
    el.addEventListener('lostpointercapture', onCancel);             // nach pointerup schon weg → nichts passiert
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('blur', alleAbbrechen);
    if (!el.style.touchAction) el.style.touchAction = 'none';

    return {
      aktive,
      reset: alleAbbrechen,
      destroy() {
        alleAbbrechen();
        el.removeEventListener('pointerdown', onDown);
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerup', onUp);
        el.removeEventListener('pointercancel', onCancel);
        el.removeEventListener('lostpointercapture', onCancel);
        document.removeEventListener('visibilitychange', onVis);
        window.removeEventListener('blur', alleAbbrechen);
      },
    };
  }

  /** Wiederholbarer Zufall aus einem Text oder einer Zahl (mulberry32). */
  function zufall(seed) {
    let h = 2166136261 >>> 0;
    const str = String(seed);
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    let a = h >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function tagSchluessel(d = new Date()) {
    const z = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
  }

  window.LernSpiel = { whenPass, speichereRunde, endlos, zeiger, zufall, tagSchluessel };
})();
