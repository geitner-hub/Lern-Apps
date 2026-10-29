// ═══════════════════════════════════════════════════════
//  Lernwelt – journey-kern.js   (English Journey Year 6: Zustände der Stationen, Etappe 6)
//
//  Eine Quelle für die Regeln – genutzt vom Weg (apps/englisch/english-journey.html) und von „Heute für dich“
//  auf der Startseite. Kein eigener Spielstand, kein Speicher-Schlüssel: alles kommt aus Pass (Meisterschaft,
//  Lernstand), Freigaben (config.json) und Katalog.
//
//  Braucht (vorher geladen): LernPass (pass.js), LernKatalog (katalog.js), optional LernFreigabe (freigabe.js),
//  für den Nebel LernWiederholung (wiederholung.js).
//
//  API (window.LernJourney):
//    laden(datei?)           → Promise(journey) – daten/journey6.json
//    berechne(J, { admin })  → { alle: { id: { st, unit, gem, bau } }, z: { id: { zustand, grund?, ab?, fehlt?, naechste?, nebel? } },
//                                  geoeffnet: { unitId: true } }
//        zustand: 'gemeistert' | 'offen' | 'zu' | 'bau'. Lehrer-Grenze (Unit-Thema, thema, start) zuerst, dann Vorgänger
//        („braucht“, Stationen ohne App zählen nicht). Gemeistert bleibt gemeistert, auch nach einer späteren Sperre.
//        naechste: erste offene Station je Unit · nebel: gemeistert, aber eine Wiederholung ist fällig (7/21/60 Tage)
//        Unit von der Lehrkraft geöffnet (v101): steht das Unit-Thema in den Freigaben ausdrücklich auf „offen“ oder auf einem
//        erreichten Datum (LernFreigabe.zugeteilt), zählen Vorgänger aus anderen Units nicht – die Unit beginnt auch ohne das
//        Finale davor. Innerhalb der Unit bleibt die Reihenfolge. Ohne Eintrag wie bisher.
//    naechste(J, z)          → { st, unit } – das nächste Ziel in Buch-Reihenfolge oder null
// ═══════════════════════════════════════════════════════
(function () {
  'use strict';
  if (window.LernJourney) return;

  const here = (document.currentScript && document.currentScript.src) || location.href;
  const cache = {};
  function laden(datei = 'daten/journey6.json') {
    if (!cache[datei]) cache[datei] = fetch(new URL('../' + datei, here).href, { cache: 'no-cache' })
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .catch(e => { delete cache[datei]; throw e; });
    return cache[datei];
  }

  const stand = id => { try { return (window.LernPass && LernPass.themaStand && LernPass.themaStand(id)) || null; } catch (e) { return null; } };
  const gemeistert = id => { const s = stand(id); return !!(s && s.frei); };
  function hatApp(st) { const K = window.LernKatalog, t = K && K.thema(st.start || st.thema); return !!(t && t.quelle && t.quelle.app && !/^archiv\//.test(t.quelle.app)); }
  function lehrer(unit, st, admin) {
    const F = window.LernFreigabe;
    if (!F || admin) return { frei: true };
    for (const id of [unit.thema, st.thema, st.start].filter(Boolean)) { const s = F.status(id); if (!s.frei) return s; }
    return { frei: true };
  }
  /** Themen-IDs mit fälliger Wiederholung (samt Lernstand-IDs und dem Thema darüber) */
  function faellig() {
    const W = window.LernWiederholung, K = window.LernKatalog, ids = new Set();
    if (!W) return ids;
    try {
      W.faellig().forEach(x => {
        ids.add(x.thema); (x.inhalte || []).forEach(i => ids.add(i));
        const t = K && K.thema(x.thema); if (t && t.eltern) ids.add(t.eltern + '>' + x.thema);
      });
    } catch (e) {}
    return ids;
  }

  /** Unit ausdrücklich geöffnet (Freigaben: 'offen' oder erreichtes Datum für dieses iPad) */
  function geoeffnet(unit) { const F = window.LernFreigabe; try { return !!(F && F.zugeteilt && unit.thema && F.zugeteilt(unit.thema)); } catch (e) { return false; } }

  function berechne(J, o = {}) {
    const alle = {}, z = {}, admin = !!o.admin, f = faellig(), offenU = {};
    J.units.forEach(u => { if (geoeffnet(u)) offenU[u.id] = true; });
    J.units.forEach(u => u.stationen.forEach(st => { alle[st.id] = { st, unit: u, gem: gemeistert(st.thema), bau: !hatApp(st) }; }));
    Object.values(alle).forEach(x => {
      const { st, unit } = x;
      if (x.gem) {
        // Nebel: fällige Wiederholung genau dieser Station (Stufe) oder einer Stufe unter ihrem Thema (z. B. en.5.simple-past)
        const nebel = f.has(st.thema) || (st.start && f.has(st.start)) || [...f].some(i => i.startsWith(st.thema + '>'));
        z[st.id] = nebel ? { zustand: 'gemeistert', nebel: true } : { zustand: 'gemeistert' };
        return;
      }
      if (x.bau) { z[st.id] = { zustand: 'bau' }; return; }
      const l = lehrer(unit, st, admin);
      if (!l.frei) { z[st.id] = { zustand: 'zu', grund: 'lehrer', ab: l.ab }; return; }
      const fehlt = (st.braucht || []).filter(b => alle[b] && !alle[b].gem && !alle[b].bau      // Stationen ohne App halten niemanden auf
        && !(offenU[unit.id] && alle[b].unit !== unit));                                           // geöffnete Unit: Brücke von der Unit davor entfällt
      z[st.id] = fehlt.length && !admin ? { zustand: 'zu', grund: 'vorgaenger', fehlt } : { zustand: 'offen' };
    });
    J.units.forEach(u => { const n = u.stationen.find(st => z[st.id].zustand === 'offen'); if (n) z[n.id].naechste = true; });
    return { alle, z, geoeffnet: offenU };
  }

  function naechste(J, z) {
    for (const unit of J.units) for (const st of unit.stationen) if (z[st.id] && z[st.id].naechste) return { st, unit };
    return null;
  }

  window.LernJourney = { laden, berechne, naechste, hatApp };
})();
