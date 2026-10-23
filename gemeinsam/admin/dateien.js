// ═══════════════════════════════════════════════════════
//  Lernwelt-Admin – Datenschicht für Inhaltsdateien im Repo  (Admin-Umbau Etappe 8: Editoren)
//
//  Wie store.js für config.json, aber für die Dateien, die der Worker schreiben darf
//  (cloudflare/dateien.js: daten/katalog.json, daten/vokabeln<5–10>.json):
//
//    const d = await LWAdmin.dateien.laden('daten/vokabeln6.json')  // { daten, nurLesen, veraltet }
//    LWAdmin.dateien.daten(pfad)                       // aktueller Stand (Entwurf) – nur lesen
//    LWAdmin.dateien.aendern(pfad, 'Wort ergänzt', d => { … })      // Änderung am Entwurf
//    LWAdmin.dateien.aenderungen(pfad) / anzahl(pfad)  // Beschreibungen bzw. Zahl (ohne pfad: alle Dateien)
//    await LWAdmin.dateien.speichern([pfad, …], text)  // alle genannten Entwürfe in EINEM Commit → { ok, status, fehler }
//    LWAdmin.dateien.verwerfen(pfad)                   // Entwurf weg
//    LWAdmin.dateien.abonnieren(fn)                    // fn() nach jeder Änderung → Abmelde-Funktion
//
//  Gespeichert wird sofort beim Klick auf „Speichern“ (nicht mit „Veröffentlichen“ der config.json) –
//  die Dateien sind nach 1–2 Minuten live, der Git-Verlauf ist die Sicherung.
//  Entwurf im localStorage (lernwelt-admin-dateien-entwurf): { pfad: { basis: sha, daten, aenderungen, zeit } }.
//  Solange bei Cloudflare der Worker ohne /dateien läuft: nur lesen (Datei direkt von der Seite).
// ═══════════════════════════════════════════════════════
'use strict';

window.LWAdmin = window.LWAdmin || {};

LWAdmin.dateien = (() => {
  const KEY = 'lernwelt-admin-dateien-entwurf';
  const ROOT = new URL('../../', document.currentScript.src).href;
  const klon = o => JSON.parse(JSON.stringify(o));
  const stand = {};          // pfad → { server, sha, daten, aenderungen, nurLesen, veraltet }
  const laufend = {};
  const hoerer = new Set();

  function entwuerfe() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
  function merken() {
    const e = {};
    Object.entries(stand).forEach(([p, s]) => { if (s.aenderungen.length) e[p] = { basis: s.basisEntwurf || s.sha, daten: s.daten, aenderungen: s.aenderungen, zeit: Date.now() }; });
    try { Object.keys(e).length ? localStorage.setItem(KEY, JSON.stringify(e)) : localStorage.removeItem(KEY); } catch (x) { console.warn('[Admin] Entwurf der Dateien nicht gespeichert', x); }
  }
  function melden() { hoerer.forEach(fn => { try { fn(); } catch (e) { console.error(e); } }); }

  async function holen(pfad) {
    try {
      const d = await LWAdmin.store.worker('/dateien/lesen', { pfade: [pfad] });
      const x = d.dateien && d.dateien[pfad];
      if (!x) throw new Error('Datei fehlt');
      return { server: x.daten, sha: x.sha, nurLesen: false };
    } catch (e) {
      if (e.status === 401) throw e;
      if (!(e.status === 404 && /Nicht gefunden/.test(e.message)) && e.status) throw e;
      // alter Worker (oder offline): nur lesen
      const r = await fetch(ROOT + pfad, { cache: 'no-store' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return { server: await r.json(), sha: null, nurLesen: true, grund: e.status ? 'alt' : 'offline' };
    }
  }

  /** Datei laden (einmal je Sitzung; neu = frisch holen). Ein Entwurf auf diesem Gerät wird wieder aufgenommen. */
  function laden(pfad, neu) {
    if (stand[pfad] && !neu) return Promise.resolve(stand[pfad]);
    if (!laufend[pfad] || neu) laufend[pfad] = holen(pfad).then(h => {
      const e = entwuerfe()[pfad];
      const s = { ...h, daten: klon(h.server), aenderungen: [], veraltet: false, basisEntwurf: null };
      if (e && e.daten && Array.isArray(e.aenderungen) && e.aenderungen.length) {
        s.daten = e.daten; s.aenderungen = e.aenderungen;
        // Entwurf auf älterem Stand: Speichern ginge über die neueren Änderungen hinweg → erst entscheiden
        if (h.sha && e.basis && e.basis !== h.sha) { s.veraltet = true; s.basisEntwurf = e.basis; }
      }
      stand[pfad] = s;
      melden();
      return s;
    }).finally(() => { delete laufend[pfad]; });
    return laufend[pfad];
  }

  function aendern(pfad, text, fn) {
    const s = stand[pfad];
    if (!s) throw new Error(pfad + ' ist nicht geladen');
    const neu = klon(s.daten);
    const r = fn(neu);
    s.daten = r === undefined ? neu : r;
    s.aenderungen.push(String(text));
    merken();
    melden();
  }

  /** Veralteten Entwurf trotzdem behalten (ersetzt beim Speichern den neueren Stand) */
  function entwurfBehalten(pfad) {
    const s = stand[pfad];
    if (s) { s.veraltet = false; s.basisEntwurf = null; merken(); melden(); }
  }

  function verwerfen(pfad) {
    const s = stand[pfad];
    if (!s) return;
    s.daten = klon(s.server); s.aenderungen = []; s.veraltet = false; s.basisEntwurf = null;
    merken(); melden();
  }

  async function speichern(pfade, text) {
    const liste = pfade.map(p => stand[p]).filter(s => s && s.aenderungen.length);
    if (!liste.length) return { ok: false, fehler: 'Keine Änderungen' };
    if (liste.some(s => s.nurLesen)) return { ok: false, fehler: 'Der Worker bei Cloudflare ist noch die alte Version – bitte cloudflare/worker.js und cloudflare/dateien.js einfügen' };
    if (liste.some(s => s.veraltet)) return { ok: false, fehler: 'Der Entwurf beruht auf einem älteren Stand – bitte erst entscheiden (oben)' };
    const mit = pfade.filter(p => stand[p] && stand[p].aenderungen.length);
    try {
      const d = await LWAdmin.store.worker('/dateien/speichern', {
        dateien: mit.map(p => ({ pfad: p, daten: stand[p].daten, sha: stand[p].sha })),
        text: String(text || stand[mit[0]].aenderungen.slice(-1)[0] || 'Inhalte aktualisiert').slice(0, 100),
      });
      mit.forEach(p => {
        const s = stand[p];
        s.server = klon(s.daten); s.sha = d.shas && d.shas[p] || s.sha; s.aenderungen = [];
      });
      merken(); melden();
      return { ok: true, commit: d.commit };
    } catch (e) {
      return { ok: false, status: e.status, fehler: e.message === 'CONFLICT' ? 'CONFLICT' : e.message };
    }
  }

  const alle = () => Object.values(stand);
  return {
    laden, aendern, verwerfen, speichern, entwurfBehalten,
    daten:       p => (stand[p] ? stand[p].daten : null),
    info:        p => stand[p] || null,
    aenderungen: p => (p ? (stand[p] ? stand[p].aenderungen.slice() : []) : alle().flatMap(s => s.aenderungen)),
    anzahl:      p => (p ? (stand[p] ? stand[p].aenderungen.length : 0) : alle().reduce((n, s) => n + s.aenderungen.length, 0)),
    abonnieren:  fn => { hoerer.add(fn); return () => hoerer.delete(fn); },
  };
})();
