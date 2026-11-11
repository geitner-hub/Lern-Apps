// ═══════════════════════════════════════════════════════
//  Lernwelt – weg-kern.js   (Lernweg-Engine in 2D, Aktionsplan „Lernwelt – Tempo“, Etappe 2)
//
//  Ein Lernweg für jedes Fach als reine Datendatei, ohne neuen Code und ohne three.js:
//    daten/wege/liste.json            Verzeichnis: [{ id, titel, fach, klasse, ico }]
//    daten/wege/<Weg-ID>.json         { id, titel, fach, klasse, ico, buch?, kann?, abschnitte: [{ id, titel, ico, wahlMin?, schritte }] }
//    daten/wege/bausteine-<Weg-ID>.json  Hefteinträge und eigene Übungen ({ bausteine: [{ id, art, titel, … }] })
//  Seite: apps/typen/weg.html?weg=<Weg-ID>. Format und Regeln: README → Lernweg-Engine, pruefen.py Regel 24.
//
//  Schritt: { id, art, stufe?, … }
//    art   hefteintrag (baustein) · uebung (text, buch?, baustein?) · app (thema) · medium (titel, link) · check (text, thema?)
//    stufe 'pflicht' (Standard) zählt für den Abschluss · 'wahl': wahlMin am Abschnitt (Standard 1) · 'stern': Zusatz, zählt nie
//  Erledigt: app = eine Runde mit ≥ 70 % im Lernstand des Themas (nur gelesen, kein eigener Punktestand) ·
//    check mit thema = einmal bearbeitet · alles andere selbst abgehakt (LernPass.wegMerken → jw:<Schritt-ID>, reist mit der Sicherung).
//  Freigabe wie im English Journey: config.journey.wege.<Weg-ID>.bis = { wer: Abschnitt-ID } – Gruppe vor Klasse vor „alle“.
//  Sichtbar ist der ganze Weg, offen sind die Abschnitte bis einschließlich diesem (dahinter: Schranke der Lehrkraft).
//  Ohne Eintrag ist der Weg nicht freigegeben; mit Admin-Anmeldung ist alles offen.
//
//    LernWeg.liste()                → Promise<[Verzeichnis-Einträge]>
//    LernWeg.laden(id)              → Promise<{ W, B }>  (Weg, Bausteine nach ID)
//    LernWeg.stand(W, ohneAdmin)    → { frei, abschnitte: [{ a, zustand, fertig, soll, … }], dran, schritt, fertig, soll, alles }
//          zustand: 'fertig' | 'dran' (als Nächstes) | 'offen' | 'gesperrt'
//    LernWeg.abschnittStand(a) · LernWeg.erledigt(s) · LernWeg.merken(s, an) · LernWeg.stufe(s)
//    LernWeg.link(s)                → Adresse ab Hauptordner für App-/Check-/Medium-Schritte oder null
//    LernWeg.meldung(W)             → { e: [Schritt-IDs erledigt], f: [Abschnitt-IDs fertig] } für die Klassenübersicht (Etappe 6a)
//    LernWeg.freigegebene()         → Promise<[{ eintrag, W, st, href }]> – für Startseite („Weiter lernen“, „Mein Laufzettel“)
// ═══════════════════════════════════════════════════════
'use strict';

(function () {
  if (window.LernWeg) return;
  const ID = /^[a-z][a-z0-9-]{1,29}$/;
  const P = () => window.LernPass, F = () => window.LernFreigabe;
  const hole = p => fetch(LW.ROOT + p).then(r => r.ok ? r.json() : Promise.reject(new Error(p + ': HTTP ' + r.status)));
  let listeP = null;
  const wegP = {};

  function liste() {
    if (!listeP) listeP = hole('daten/wege/liste.json').then(d => (Array.isArray(d.wege) ? d.wege : []).filter(e => e && ID.test(e.id)))
      .catch(e => { listeP = null; throw e; });
    return listeP;
  }
  function laden(id) {
    if (!ID.test(String(id))) return Promise.reject(new Error('Unbekannter Weg'));
    if (!wegP[id]) wegP[id] = hole('daten/wege/' + id + '.json').then(W => {
      if (!W || W.id !== id || !Array.isArray(W.abschnitte)) throw new Error('Weg-Datei ungültig');
      // Ausgeblendetes ("aus": true, Lernweg-Editor: ausblenden statt löschen) gibt es für die Kinder nicht
      W.abschnitte = W.abschnitte.filter(a => a && !a.aus).map(a => Object.assign({}, a, { schritte: (a.schritte || []).filter(s => s && !s.aus) }));
      const braucht = W.abschnitte.some(a => (a.schritte || []).some(s => s.baustein));
      return (braucht ? hole('daten/wege/bausteine-' + id + '.json') : Promise.resolve({})).then(b => {
        const B = {};
        (b.bausteine || []).forEach(x => { B[x.id] = x; });
        return { W, B };
      });
    }).catch(e => { delete wegP[id]; throw e; });
    return wegP[id];
  }

  // ── Lernstand ────────────────────────────────────────
  const stufe = s => (s.stufe === 'wahl' || s.stufe === 'stern') ? s.stufe : 'pflicht';
  const lies = id => { const L = P() && P().lernstand; return (L && L['jw:' + id]) || null; };
  function erledigt(s) {
    const L = (P() && P().lernstand) || {};
    if (s.art === 'app') { const e = L[s.thema]; return !!e && Array.isArray(e.p) && e.p.some(p => p >= 70); }
    if (s.art === 'check' && s.thema) {                  // Check vor der Probe (Etappe 5): bearbeitet = im Pass vermerkt
      const e = L[s.thema], C = (P() && P().checks) || {};
      return !!C[s.thema] || (!!e && Array.isArray(e.p) && e.p.length > 0);
    }
    return !!(lies(s.id) || {}).e;
  }
  /** Schritt abhaken oder Haken entfernen (nicht für App-Schritte – die liest der Weg aus dem Pass) */
  function merken(s, an) {
    if (!P() || !P().wegMerken || s.art === 'app' || (s.art === 'check' && s.thema)) return false;
    return P().wegMerken(s.id, an ? { e: 1 } : {});
  }
  function abschnittStand(a) {
    const l = a.schritte || [], pf = l.filter(s => stufe(s) === 'pflicht'), wa = l.filter(s => stufe(s) === 'wahl'), sn = l.filter(s => stufe(s) === 'stern');
    const wahlMin = wa.length ? Math.max(1, Math.min(wa.length, Number(a.wahlMin) || 1)) : 0;
    const pfF = pf.filter(erledigt).length, waF = wa.filter(erledigt).length;
    const soll = pf.length + wahlMin, fertig = pfF + Math.min(wahlMin, waF);
    return { soll, fertig, wahlMin, wahlFertig: waF, sterne: sn.filter(erledigt).length, sterneMax: sn.length, komplett: fertig >= soll };
  }

  // ── Freigabe ─────────────────────────────────────────
  const admin = () => !!(F() && F().admin && F().admin());
  function bisIndex(W, ohneAdmin) {
    if (!ohneAdmin && admin()) return W.abschnitte.length - 1;
    const c = F() && F().journey ? F().journey(W.id) : null, bis = (c && c.bis && typeof c.bis === 'object') ? c.bis : {};
    const w = ((F() && F().wer && F().wer()) || ['alle']).find(x => typeof bis[x] === 'string');
    return w ? W.abschnitte.findIndex(a => a.id === bis[w]) : -1;
  }
  function stand(W, ohneAdmin) {
    const bi = bisIndex(W, ohneAdmin);
    const abschnitte = W.abschnitte.map((a, i) => { const f = abschnittStand(a); return Object.assign({ a, i, zustand: i > bi ? 'gesperrt' : f.komplett ? 'fertig' : 'offen' }, f); });
    const dran = abschnitte.find(x => x.zustand === 'offen') || null;
    let schritt = null;
    if (dran) {
      dran.zustand = 'dran';
      schritt = dran.a.schritte.find(s => stufe(s) === 'pflicht' && !erledigt(s))
        || (dran.wahlFertig < dran.wahlMin ? dran.a.schritte.find(s => stufe(s) === 'wahl' && !erledigt(s)) : null) || null;
    }
    const frei = abschnitte.filter(x => x.zustand !== 'gesperrt');
    return { frei: bi >= 0, abschnitte, dran, schritt, fertig: frei.reduce((n, x) => n + x.fertig, 0), soll: frei.reduce((n, x) => n + x.soll, 0),
      alles: bi >= 0 && !dran, schranke: bi >= 0 && bi < W.abschnitte.length - 1 };
  }

  /** Für die Klassenübersicht (LernSync.wegMelden): erledigte Schritte und fertige Abschnitte der freigegebenen Abschnitte */
  function meldung(W) {
    const e = [], f = [];
    stand(W, true).abschnitte.forEach(x => {
      if (x.zustand === 'gesperrt') return;
      if (x.komplett) f.push(x.a.id);
      x.a.schritte.forEach(s => { if (erledigt(s)) e.push(s.id); });
    });
    return { e, f };
  }

  /** Wohin führt der Schritt? App/Check: über den Katalog (wiederholung.js) · Medium: geprüfter Link · sonst null */
  function link(s) {
    if ((s.art === 'app' || s.art === 'check') && s.thema) return window.LernWiederholung && LernWiederholung.link ? LernWiederholung.link(s.thema) : null;
    if (s.art === 'medium' && typeof s.link === 'string' && /^[a-z0-9][a-z0-9_\-./]*$/i.test(s.link) && !s.link.includes('..')) return s.link;
    return null;
  }
  const seite = id => 'apps/typen/weg.html?weg=' + encodeURIComponent(id);

  /** Alle für dieses iPad freigegebenen Wege mit Stand (Startseite). Lädt nur Wege, für die config.journey etwas einträgt. */
  async function freigegebene() {
    if (!F() || !F().journey) return [];
    const wer = (F().wer && F().wer()) || ['alle'], out = [];
    for (const e of await liste()) {
      const c = F().journey(e.id), bis = (c && c.bis) || {};
      if (!wer.some(x => typeof bis[x] === 'string')) continue;
      try {
        const { W } = await laden(e.id), st = stand(W, true);
        if (st.frei) out.push({ eintrag: e, W, st, href: seite(e.id) + (st.dran ? '#a=' + encodeURIComponent(st.dran.a.id) : '') });
      } catch (err) { console.warn('[LernWeg]', e.id, err); }
    }
    return out;
  }

  window.LernWeg = { liste, laden, stand, abschnittStand, erledigt, merken, stufe, link, freigegebene, seite, admin, meldung };
})();
