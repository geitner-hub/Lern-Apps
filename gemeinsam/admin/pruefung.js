// ═══════════════════════════════════════════════════════
//  Lernwelt-Admin – Prüfung vor dem Veröffentlichen  (Admin-Umbau Etappe 3)
//
//    const { fehler, warnungen } = await LWAdmin.pruefen(config);
//
//  Dieselben Regeln wie werkzeuge/pruefen.py für alles, was der Admin an config.json ändern kann.
//  Eine Veröffentlichung ist ein Commit an config.json – danach läuft pruefen.py in GitHub (CI).
//  Was dort rot würde, ist hier ein FEHLER und blockiert; was dort gelb wäre, eine WARNUNG zum Bestätigen.
//  Den Rest (Format jedes Felds) prüft der Worker ohnehin (validateConfig).
// ═══════════════════════════════════════════════════════
'use strict';

window.LWAdmin = window.LWAdmin || {};

(() => {
  const ROOT = new URL('../../', document.currentScript.src).href;     // Hauptordner (Datei liegt in gemeinsam/admin/)
  let katalog = null;            // Promise: { ids:Set, appThemen:Set }
  const dateiDa = new Map();     // Pfad → Promise<boolean> (einmal je Sitzung nachsehen)

  const lokal = d => { const p = String(d || '').split('#')[0].split('?')[0].trim(); return !p || p.startsWith('http') ? '' : p; };

  function katalogLaden() {
    if (!katalog) katalog = fetch(ROOT + 'daten/katalog.json', { cache: 'no-store' }).then(r => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(k => {
      const ids = new Set(), appThemen = new Set(), titel = new Map();
      (k.faecher || []).forEach(f => (f.bereiche || []).forEach(b => (b.themen || []).forEach(th => {
        ids.add(th.id); titel.set(th.id, th.titel || th.id);
        if (th.quelle && th.quelle.app) appThemen.add(th.quelle.app);
        (th.stufen || []).forEach(s => { ids.add(s.id); titel.set(s.id, (th.titel ? th.titel + ' – ' : '') + (s.titel || s.id)); if (s.quelle && s.quelle.app) appThemen.add(s.quelle.app); });
      })));
      return { ids, appThemen, titel };
    }).catch(e => { katalog = null; throw e; });
    return katalog;
  }

  function vorhanden(pfad) {
    if (!dateiDa.has(pfad)) dateiDa.set(pfad, fetch(ROOT + pfad, { method: 'HEAD', cache: 'no-store' })
      .then(r => r.ok).catch(() => null));                              // null = nicht prüfbar (offline)
    return dateiDa.get(pfad);
  }

  async function pruefen(cfg) {
    const fehler = [], warnungen = [];
    const apps = Array.isArray(cfg && cfg.apps) ? cfg.apps : [];

    // Apps: Name, Datei, Fach, App des Tages
    const namen = new Map();
    apps.forEach(a => {
      const n = String(a.name || '').trim();
      if (!n) fehler.push(`Eine App hat keinen Namen (${a.datei || 'ohne Datei'})`);
      else if (namen.has(n)) fehler.push(`App-Name doppelt: „${n}“ – Namen müssen eindeutig sein`);
      namen.set(n, a);
      if (!isSafeLink(a.datei)) fehler.push(`„${n || '?'}“: Datei/Link ungültig („${a.datei || ''}“)`);
      if (!FAECHER.includes(a.fach)) fehler.push(`„${n || '?'}“ hat kein gültiges Fach`);
    });
    const aod = apps.filter(a => a.aod);
    if (aod.length > 1) fehler.push(`Mehr als eine App des Tages: ${aod.map(a => '„' + a.name + '“').join(', ')}`);

    // Dateien vorhanden? (wie pruefen.py: „config.json: Datei fehlt“)
    const pfade = [...new Set(apps.map(a => lokal(a.datei)).filter(Boolean))];
    const da = await Promise.all(pfade.map(vorhanden));
    pfade.forEach((p, i) => {
      const wer = apps.filter(a => lokal(a.datei) === p).map(a => '„' + a.name + '“').join(', ');
      if (da[i] === false) fehler.push(`Datei fehlt: ${p} (${wer})`);
      else if (da[i] === null) warnungen.push(`Datei nicht prüfbar (offline?): ${p}`);
    });

    // Regale: unbekannt oder anderes Fach (pruefen.py: gelb)
    const regale = new Map((cfg.gruppen || []).map(g => [g.id, g]));
    apps.forEach(a => {
      if (a.gruppe === undefined) return;
      const g = regale.get(a.gruppe);
      if (!g) warnungen.push(`„${a.name}“ steht in einem unbekannten Regal (erscheint ohne Regal)`);
      else if (g.fach !== a.fach) warnungen.push(`„${a.name}“ steht im Regal „${g.name}“ eines anderen Fachs`);
    });

    // Katalog: jede Lern-App braucht ein Thema (pruefen.py: rot), Freigaben nennen Katalog-IDs (gelb)
    try {
      const k = await katalogLaden();
      pfade.filter(p => p.startsWith('apps/') && !k.appThemen.has(p)).forEach(p =>
        fehler.push(`${p} hat kein Thema in daten/katalog.json – erst dort eintragen (sonst wird die Prüfung in GitHub rot)`));
      Object.keys(cfg.freigaben || {}).filter(id => !k.ids.has(id)).forEach(id =>
        warnungen.push(`Freigabe für unbekannte Themen-ID ${id} (wirkt nicht)`));
    } catch (e) {
      warnungen.push('Katalog nicht geladen (' + (e.message || e) + ') – Themen wurden nicht geprüft');
    }

    // Verweise auf Apps (laufender Fokus, aktueller Lehrer-Zettel) – gelb: wirken dann einfach nicht
    const dateien = new Set(apps.map(a => a.datei));
    const d = new Date(), heute = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    (cfg.fokus || []).filter(f => Number(f.bis) > Date.now()).forEach(f => (f.apps || []).filter(d => !dateien.has(d)).forEach(d =>
      warnungen.push(`Fokus „${f.id}“ nennt eine App, die es nicht mehr gibt: ${d}`)));
    ((cfg.dorf || {}).lehrerZettel || []).filter(z => z.app && !(z.bis < heute) && !dateien.has(z.app) && ![...dateien].some(d => String(d).split('/').pop() === z.app))
      .forEach(z => warnungen.push(`Lehrer-Zettel „${z.id}“ nennt eine unbekannte App: ${z.app}`));

    return { fehler, warnungen };
  }

  LWAdmin.pruefen = pruefen;
  LWAdmin.katalog = katalogLaden;     // → Promise<{ ids, appThemen, titel: Map(id → Titel) }> (auch für den Kalender)
})();
