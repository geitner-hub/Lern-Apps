// ═══════════════════════════════════════════════════════
//  Lernwelt-Admin (neu) – Datenschicht  (Admin-Umbau Etappe 1)
//  Alle Module lesen und schreiben config.json NUR hierüber:
//
//    await LWAdmin.store.laden({ beiKonflikt })   // config.json über den Worker holen, Entwurf wieder aufnehmen
//    LWAdmin.store.daten()                        // aktueller Stand (Entwurf) – nur lesen, nie direkt ändern
//    LWAdmin.store.aendern('App X ausgeblendet', cfg => { … })   // Änderung am Entwurf, mit kurzer Beschreibung
//    LWAdmin.store.unterschiede()                 // [{ pfad, alt, neu }] Entwurf ↔ veröffentlichter Stand
//    LWAdmin.store.aenderungen()                  // Beschreibungen der Änderungen im Entwurf
//    await LWAdmin.store.veroeffentlichen()       // alles mit EINEM Commit schreiben → { ok, status, fehler }
//    LWAdmin.store.verwerfen()                    // Entwurf weg, veröffentlichter Stand gilt wieder
//    LWAdmin.store.abonnieren(fn)                 // fn(store) nach jeder Änderung → Abmelde-Funktion
//
//  Entwurf im localStorage (lernwelt-admin-entwurf), Format seit dem bisherigen Admin unverändert:
//  { basis: sha, aenderungen: [text], zeit, config } – ein Entwurf von vor dem Umbau wird übernommen.
//  Abhängigkeiten: shared.js, config-api.js
// ═══════════════════════════════════════════════════════
'use strict';

window.LWAdmin = window.LWAdmin || {};

LWAdmin.store = (() => {
  const ENTWURF_KEY = 'lernwelt-admin-entwurf';
  let veroeffentlicht = null;     // Stand von config.json beim Laden (bzw. nach dem letzten Veröffentlichen)
  let config = null;              // aktueller Stand = Entwurf, falls vorhanden
  let sha = '';                   // Version von config.json; null = Laden fehlgeschlagen → Schreiben gesperrt
  let entwurf = null;             // { basis, aenderungen: [], zeit } oder null
  let beschaeftigt = false;
  const hoerer = new Set();

  const klon = o => JSON.parse(JSON.stringify(o));
  const gleich = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  function melden() { hoerer.forEach(fn => { try { fn(api); } catch (e) { console.error('[Admin] Hörer:', e); } }); }

  function entwurfLesen() {
    try {
      const e = JSON.parse(localStorage.getItem(ENTWURF_KEY) || 'null');
      return e && e.config && Array.isArray(e.config.apps) ? e : null;
    } catch (e) { return null; }
  }
  function entwurfSchreiben() {
    try {
      if (entwurf) localStorage.setItem(ENTWURF_KEY, JSON.stringify({ ...entwurf, config }));
      else localStorage.removeItem(ENTWURF_KEY);
      return true;
    } catch (e) { return false; }
  }

  /**
   * config.json über den Worker laden und einen gemerkten Entwurf wieder aufnehmen.
   * beiKonflikt(n) wird gefragt, wenn der Entwurf auf einem älteren Stand beruht → true = trotzdem übernehmen.
   * → { ok, fehler?, entwurfWieder? (Anzahl Änderungen) }
   */
  async function laden(opts = {}) {
    try {
      const r = await ConfigAPI.loadAdmin();
      veroeffentlicht = r.config;
      sha = r.sha;
    } catch (e) {
      console.error('[Admin] Ladefehler:', e);
      veroeffentlicht = veroeffentlicht || ConfigAPI.migrate({});
      config = config || klon(veroeffentlicht);
      sha = null;
      melden();
      return { ok: false, fehler: e.message || 'Laden fehlgeschlagen' };
    }
    config = klon(veroeffentlicht);
    entwurf = null;
    let entwurfWieder = 0;
    const e = entwurfLesen();
    if (e) {
      const n = (e.aenderungen || []).length;
      const nehmen = e.basis === sha || (opts.beiKonflikt ? !!opts.beiKonflikt(n) : false);
      if (nehmen) {
        config = ConfigAPI.migrate(e.config);
        entwurf = { basis: sha, aenderungen: e.aenderungen || [], zeit: e.zeit || Date.now() };
        entwurfWieder = n;
      }
      entwurfSchreiben();
    }
    melden();
    return { ok: true, entwurfWieder };
  }

  /** Änderung am Entwurf: fn bekommt eine Kopie und ändert sie. → true, wenn sich etwas geändert hat */
  function aendern(text, fn) {
    if (sha === null) throw new Error('Speichern gesperrt – bitte Seite neu laden');
    if (!config) throw new Error('Noch nicht geladen');
    const neu = klon(config);
    const r = fn(neu);
    const ergebnis = r && typeof r === 'object' ? r : neu;     // fn darf auch ein neues Objekt zurückgeben
    if (gleich(ergebnis, config)) return false;
    config = ergebnis;
    if (!entwurf) entwurf = { basis: sha, aenderungen: [], zeit: Date.now() };
    const t = String(text || 'Einstellungen geändert').slice(0, 120);
    if (entwurf.aenderungen[entwurf.aenderungen.length - 1] !== t) entwurf.aenderungen.push(t);
    entwurf.zeit = Date.now();
    if (gleich(config, veroeffentlicht)) entwurf = null;        // zurückgeändert → kein Entwurf mehr
    const gemerkt = entwurfSchreiben();
    melden();
    if (!gemerkt) console.warn('[Admin] Entwurf konnte nicht gemerkt werden');
    return true;
  }

  // ── Unterschiede Entwurf ↔ veröffentlicht ─────────────
  //  Listen von Objekten mit id oder name werden darüber verglichen (Umsortieren ≠ Änderung jedes Eintrags).
  function schluessel(a, b) {
    const ok = (l, k) => l.every(x => x && typeof x === 'object' && !Array.isArray(x) && typeof x[k] === 'string' && x[k])
      && new Set(l.map(x => x[k])).size === l.length;
    if (!a.length && !b.length) return null;
    return ['id', 'name'].find(k => ok(a, k) && ok(b, k)) || null;
  }
  function vergleiche(a, b, pfad, aus) {
    if (gleich(a, b)) return;
    if (Array.isArray(a) && Array.isArray(b)) {
      const k = schluessel(a, b);
      if (k) {
        const ma = new Map(a.map(x => [x[k], x])), mb = new Map(b.map(x => [x[k], x]));
        ma.forEach((x, id) => mb.has(id) ? vergleiche(x, mb.get(id), `${pfad}[${id}]`, aus) : aus.push({ pfad: `${pfad}[${id}]`, alt: x, neu: undefined }));
        mb.forEach((x, id) => { if (!ma.has(id)) aus.push({ pfad: `${pfad}[${id}]`, alt: undefined, neu: x }); });
        if (!gleich(a.map(x => x[k]).filter(id => mb.has(id)), b.map(x => x[k]).filter(id => ma.has(id)))) aus.push({ pfad: pfad + ' (Reihenfolge)', alt: '…', neu: '…' });
        return;
      }
    }
    const objA = a && typeof a === 'object' && !Array.isArray(a), objB = b && typeof b === 'object' && !Array.isArray(b);
    if (objA && objB) {
      new Set([...Object.keys(a), ...Object.keys(b)]).forEach(k => vergleiche(a[k], b[k], pfad ? pfad + '.' + k : k, aus));
      return;
    }
    aus.push({ pfad, alt: a, neu: b });
  }
  function unterschiede() {
    if (!config || !veroeffentlicht) return [];
    const aus = [];
    vergleiche(veroeffentlicht, config, '', aus);
    return aus;
  }

  /** Alles mit einem Commit veröffentlichen. → { ok, status?, fehler? } (fehler 'CONFLICT' = woanders geändert) */
  async function veroeffentlichen() {
    if (sha === null) return { ok: false, fehler: 'Speichern gesperrt – bitte Seite neu laden' };
    if (!entwurf || !entwurf.aenderungen.length) return { ok: false, fehler: 'Keine Änderungen' };
    if (beschaeftigt) return { ok: false, fehler: 'Wird schon veröffentlicht' };
    beschaeftigt = true; melden();
    const a = entwurf.aenderungen;
    const msg = a.length === 1 ? a[0] : `${a.length} Änderungen: ` + a.slice(-3).reverse().join(' · ');
    const r = await ConfigAPI.save(config, sha, msg);
    beschaeftigt = false;
    if (r.ok) {
      sha = r.newSha;
      veroeffentlicht = klon(config);
      entwurf = null;
      entwurfSchreiben();
    }
    melden();
    return r.ok ? { ok: true } : { ok: false, status: r.status, fehler: r.error };
  }

  function verwerfen() {
    entwurf = null;
    entwurfSchreiben();
    if (veroeffentlicht) config = klon(veroeffentlicht);
    melden();
  }

  /** Die letzten Veröffentlichungen (Commits an config.json) – öffentliche GitHub-Schnittstelle */
  async function historie(n = 5) {
    const owner = location.hostname.split('.')[0], repo = location.pathname.split('/').filter(Boolean)[0] || '';
    const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?path=config.json&per_page=${n}`, { cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return (await r.json()).map(c => ({
      zeit: new Date(c.commit.committer.date),
      text: String(c.commit.message).split('\n')[0].replace(/^Admin: /, ''),
    }));
  }

  function abonnieren(fn) { hoerer.add(fn); return () => hoerer.delete(fn); }

  const api = {
    laden, aendern, unterschiede, veroeffentlichen, verwerfen, historie, abonnieren,
    daten:       () => config,
    aenderungen: () => (entwurf ? entwurf.aenderungen.slice() : []),
    anzahl:      () => (entwurf ? entwurf.aenderungen.length : 0),
    geladen:     () => !!config,
    gesperrt:    () => sha === null,
    beschaeftigt: () => beschaeftigt,
  };
  return api;
})();
