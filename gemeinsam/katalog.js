// ═══════════════════════════════════════════════════════
//  Lernwelt – katalog.js   (Inhalts-Katalog und Themen-IDs, Infrastruktur Etappe 1)
//
//  Liest daten/katalog.json: Fächer → Bereiche → Themen (→ Stufen).
//  Jedes Thema hat eine feste ID wie 'ma.5.kopf.mittel' oder 'en.5.vok.u3'.
//  Alle Teile der Lernwelt sprechen über diese IDs miteinander
//  (später: Freischaltung, Wiederholung, Fehlerheft, Infokarten).
//
//  Brücke zu den alten Formen – es wird NICHTS umgeschrieben:
//    ergebnis  Dateiname, unter dem navbar.js Ergebnisse und Sterne speichert
//              ('kopfrechnen.html') → gilt für das Thema der App
//    inhalt    alte Inhalt-ID aus „Meine Themen“ ('kopf5-mittel', 'vok5:unit3').
//              'vok5:unit3' passt auch zu 'vok5:unit3/theme1' (alles darunter).
//
//  Wird geladen von: gemeinsam/aufgaben.js (Spiele) – später auch Startseite/Admin.
//  Steht nach dem ersten Laden auch offline sofort bereit (Zwischenspeicher).
//
//  API (window.LernKatalog):
//    bereit                    Promise → true, sobald die aktuelle Fassung geladen ist
//    geladen()                 true, wenn Daten da sind (auch aus dem Zwischenspeicher)
//    thema(id)                 → Thema oder null
//    themen({ fach, klasse, bisKlasse, nurOben }) → Liste
//    stufen(id)                → Stufen eines Themas (geordnet)
//    oben(id)                  → Thema ohne Stufe (für 'ma.5.kopf.mittel' → 'ma.5.kopf')
//    fuerInhalt('kopf5-mittel')          → 'ma.5.kopf.mittel'
//    fuerErgebnis('kopfrechnen.html?x')  → 'ma.5.kopf'
//    zuordnen(ergebnisKey, inhalt)       → genaueste ID (Inhalt vor App)
//    inhaltFuer(id)            → alte Inhalt-ID für die Spiele ('kopf5-mittel') oder null
//    ergebnisSchluessel(id)    → Dateinamen, unter denen Ergebnisse/Sterne liegen
//    faecher()                 → [{ id, name, bereiche: [{ id, titel }] }]
//  Ereignis 'lernkatalog:ready' nach dem Laden der aktuellen Fassung.
// ═══════════════════════════════════════════════════════

(function () {
  'use strict';
  if (window.LernKatalog) return;

  const CACHE_KEY = 'lernwelt-katalog-cache';
  const here = (document.currentScript && document.currentScript.src) || location.href;
  const DATEI = new URL('../daten/katalog.json', here).href;     // katalog.js liegt in gemeinsam/
  const ID = /^[a-z]+(?:\.[a-z0-9-]+)+$/;

  let LISTE = [], BY = {}, FAECHER = [];

  function aufbauen(k) {
    const liste = [], by = {}, faecher = [];
    (k && Array.isArray(k.faecher) ? k.faecher : []).forEach(f => {
      const fe = { id: f.id, name: f.name, bereiche: [] };
      faecher.push(fe);
      (Array.isArray(f.bereiche) ? f.bereiche : []).forEach(b => {
        fe.bereiche.push({ id: b.id, titel: b.titel });
        (Array.isArray(b.themen) ? b.themen : []).forEach(t => {
          if (!t || !ID.test(t.id) || by[t.id]) return;
          const oben = Object.freeze({
            id: t.id, titel: t.titel || t.id, fach: f.name, fachId: f.id, bereich: b.titel, bereichId: b.id,
            klasse: Number(t.klasse) || null, foerder: !!t.foerder, stufe: null, eltern: null,
            quelle: t.quelle || null, inhalt: typeof t.inhalt === 'string' ? t.inhalt : null,
            ergebnis: Array.isArray(t.ergebnis) ? t.ergebnis.slice() : [],
            lehrplan: t.lehrplan || '', dauer: t.dauer || null, einsatz: t.einsatz || '',
            stufen: (Array.isArray(t.stufen) ? t.stufen : []).map(s => s && s.id).filter(Boolean),
          });
          liste.push(oben); by[oben.id] = oben;
          (Array.isArray(t.stufen) ? t.stufen : []).forEach((s, i) => {
            if (!s || !ID.test(s.id) || by[s.id]) return;
            const st = Object.freeze({
              id: s.id, titel: (t.titel || t.id) + ' – ' + (s.titel || s.id), kurz: s.titel || s.id,
              fach: f.name, fachId: f.id, bereich: b.titel, bereichId: b.id,
              klasse: Number(s.klasse || t.klasse) || null, foerder: !!(s.foerder ?? t.foerder),
              stufe: i + 1, eltern: t.id, quelle: s.quelle || t.quelle || null,
              inhalt: typeof s.inhalt === 'string' ? s.inhalt : null, ergebnis: [],
              lehrplan: s.lehrplan || t.lehrplan || '', dauer: s.dauer || t.dauer || null, einsatz: s.einsatz || t.einsatz || '',
              stufen: [],
            });
            liste.push(st); by[st.id] = st;
          });
        });
      });
    });
    LISTE = liste; BY = by; FAECHER = faecher;
  }

  // Sofort aus dem Zwischenspeicher (offline, synchron), dann frisch laden
  try { const c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); if (c) aufbauen(c); } catch (e) {}
  const bereit = fetch(DATEI, { cache: 'no-cache' })
    .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(k => {
      aufbauen(k);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(k)); } catch (e) {}
      try { window.dispatchEvent(new CustomEvent('lernkatalog:ready')); } catch (e) {}
      return true;
    })
    .catch(() => LISTE.length > 0);

  // ── Abfragen ─────────────────────────────────────────
  const thema = id => BY[String(id)] || null;
  const datei = key => String(key || '').split('#')[0].split('?')[0].split('/').pop();

  function themen(o = {}) {
    return LISTE.filter(t =>
      (!o.fach || t.fach === o.fach || t.fachId === o.fach) &&
      (o.klasse === undefined || t.klasse === Number(o.klasse)) &&
      (o.bisKlasse === undefined || (t.klasse || 0) <= Number(o.bisKlasse)) &&
      (!o.nurOben || !t.eltern));
  }
  const stufen = id => { const t = thema(id); return t ? t.stufen.map(thema).filter(Boolean) : []; };
  const oben = id => { const t = thema(id); return t ? (t.eltern ? thema(t.eltern) : t) : null; };

  /** Genaueste ID zu einer alten Inhalt-ID ('vok5:unit3/theme1' → 'en.5.vok.u3') */
  function fuerInhalt(s) {
    s = String(s || '');
    if (!s) return null;
    if (BY[s]) return s;                                   // ist schon eine neue ID
    let best = null;
    LISTE.forEach(t => {
      if (!t.inhalt) return;
      if ((s === t.inhalt || s.startsWith(t.inhalt + '/')) && (!best || t.inhalt.length > best.inhalt.length)) best = t;
    });
    return best ? best.id : null;
  }
  function fuerErgebnis(key) {
    const d = datei(key);
    if (!d) return null;
    const t = LISTE.find(x => x.ergebnis.includes(d));
    return t ? t.id : null;
  }
  function zuordnen(key, inhalt) {
    const l = Array.isArray(inhalt) ? inhalt : (inhalt ? [inhalt] : []);
    for (const s of l) { const id = fuerInhalt(s); if (id) return id; }
    return fuerErgebnis(key);
  }
  const inhaltFuer = id => { const t = thema(id); return t && t.inhalt ? t.inhalt : null; };
  function ergebnisSchluessel(id) {
    const t = thema(id);
    if (!t) return [];
    return t.ergebnis.length ? t.ergebnis.slice() : (t.eltern ? thema(t.eltern).ergebnis.slice() : []);
  }
  const faecher = () => FAECHER.map(f => ({ id: f.id, name: f.name, bereiche: f.bereiche.slice() }));

  window.LernKatalog = Object.freeze({
    bereit, geladen: () => LISTE.length > 0,
    thema, themen, stufen, oben, fuerInhalt, fuerErgebnis, zuordnen, inhaltFuer, ergebnisSchluessel, faecher,
    ID_MUSTER: ID,
  });
})();
