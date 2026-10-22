// ═══════════════════════════════════════════════════════
//  Lernwelt-Admin – Listen vom Worker für Dashboard und Suche  (Admin-Umbau Etappe 4)
//
//    await LWAdmin.quellen.gruppen()   // [{ id, name, codes: [{ nr, verbundenAm, letzteSync }] }] (Sicherungskarten)
//    await LWAdmin.quellen.medien()    // { eintraege: [{ code, art, titel, ordner, aktiv … }], belegt, grenze, basis }
//
//  Einmal je Sitzung geladen (Fehler werden nicht gemerkt, der nächste Aufruf versucht es neu).
//  neu = true holt frisch.
// ═══════════════════════════════════════════════════════
'use strict';

window.LWAdmin = window.LWAdmin || {};

LWAdmin.quellen = (() => {
  const merk = {};
  function holen(name, pfad, umformen, neu) {
    if (neu || !merk[name]) {
      merk[name] = LWAdmin.store.worker(pfad, {}).then(umformen);
      merk[name].catch(() => { delete merk[name]; });
    }
    return merk[name];
  }
  return {
    gruppen: neu => holen('gruppen', '/sync/admin/gruppen', d =>
      (d.gruppen || []).filter(g => /^[0-9a-f]{32}$/.test(g.id)).map(g => ({ id: g.id, name: String(g.name || 'ohne Namen'), codes: Array.isArray(g.codes) ? g.codes : [] })), neu),
    medien: neu => holen('medien', '/medien/admin/liste', d => ({
      eintraege: Array.isArray(d.eintraege) ? d.eintraege : [], belegt: Number(d.belegt) || 0, grenze: Number(d.grenze) || 0,
      // Kurzlink-Basis (…/m/) – nur https bzw. lokal, wie in medien.js
      basis: typeof d.basis === 'string' && /^(https:\/\/[^\s"'<>]+|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?)\/m\/$/.test(d.basis) ? d.basis : '',
    }), neu),
  };
})();
