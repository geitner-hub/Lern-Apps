// ═══════════════════════════════════════════════════════
//  Lernwelt – dorf-kern.js   (Aufbauspiel „Mein Dorf“: Spielstand & Regeln)
//
//  Wird geladen von:
//    - jeder App automatisch über navbar.js (damit Aufträge auch dann
//      zählen, wenn das Dorf gerade nicht geöffnet ist)
//    - spiele/dorf.html (ebenfalls über navbar.js)
//
//  Inhalte und Startwerte: daten/dorf-inhalte.json (wird erst geladen,
//  wenn ein Kind das Dorf begonnen hat).
//  Spielstand: localStorage 'lernwelt-dorf' – bewusst kompakt, weil er
//  unverändert im Sicherungscode des Passes mitreist (pass.js, LW3).
//  Runden kommen über das Ereignis 'lernpass:gewertet' aus pass.js.
//  Klasse und „zuletzt gespielt“ liest es direkt aus 'lernwelt-pass',
//  die App-Liste aus dem Config-Zwischenspeicher (config-api.js).
//
//  Solange ein Kind das Dorf nie geöffnet hat, wird NICHTS gespeichert
//  (kein Dorf im Sicherungscode, keine Aufträge).
//
//  Stand Etappe 4: Auftragsbrett (Aufträge erzeugen, zählen, belohnen,
//  tauschen, täglich nachfüllen), Wochenauftrag (automatisch oder von der
//  Lehrkraft), Bauen (Gebäude, Stufen 1–4, Bauzeit, Bauplätze über das Rathaus,
//  Ansehen für Rathaus-Stufen, Boni, Rabatt), Bewohner mit eigenen Aufträgen,
//  Sammelbuch (Sammelstücke der Bewohner + Meilensteine), Dorfname. Einstellungen der Lehrkraft: config.json → "dorf" (Admin → 🏘️ Dorf).
//  Stand Etappe 5: Dorf-Events (Halloween, Weihnachten, Ostern …) nach EVENTS in dorf-inhalte.json,
//  gekoppelt an die Pass-Events (config.json → pass.events): Event-Währung, Startgeschenk, Festgebäude
//  auf der Festwiese, Event-Deko (frei platzierbar, bleibt stehen), Gast-Aufträge, Suche oder Kalender.
//  Stand Etappe 6 (Teil 1): Landschaft im Umland und Dorf-Deko wachsen ohne Kosten mit (LANDSCHAFT,
//  DEKO in dorf-inhalte.json, Bedingungen „ab“); neue Elemente erscheinen als Neuigkeit.
//  Stand Etappe 6 (Teil 2): Challenges über zwei Wochen (rotierend oder von der Lehrkraft geplant,
//  config.json → dorf.challenges / dorf.challengeRotation) mit Trophäen, Bonus-Gebäude für Trophäen,
//  Tausch Holz ↔ Stein am Marktplatz.
//  Stand Etappe 6c (UX und Erweiterungen): Rohstoff-Lenkung (Aufträge bringen eher, was fehlt),
//  Runden je App (config.json → apps[].dorfRunden), Sparziel (zg), Lehrer-Zettel (config.json →
//  dorf.lehrerZettel), Fleißzettel (einmal am Tag, wenn alle Tageszettel erledigt sind), Werkstatt-Bonus
//  (Apps mit wenigen Meisterschafts-Sternen), Bewohner-Briefe auf Englisch, Liste aller offenen
//  Aufträge für Startseite und Heute-Leiste (offeneAuftraege).
//  Die 3D-Szene: gemeinsam/dorf-szene.js.
// ═══════════════════════════════════════════════════════

(function () {
  'use strict';
  if (window.LernDorf) return;                         // doppeltes Laden verhindern

  const KEY           = 'lernwelt-dorf';
  const CONTENT_CACHE = 'lernwelt-dorf-inhalte-cache';
  const CONFIG_KEY    = 'lernwelt-config-cache';       // von config-api.js geschrieben
  const PASS_KEY      = 'lernwelt-pass';               // von pass.js geschrieben
  const VERSION       = 1;
  const here = (document.currentScript && document.currentScript.src) || location.href;
  const ROOT = new URL('../', here).href;              // Hauptordner (dorf-kern.js liegt in gemeinsam/)

  // ── Hilfen ──────────────────────────────────────────────
  // Tage als 'JJJJMMTT' – kompakt, weil sie im Sicherungscode stehen
  const TAG = /^\d{8}$/;
  function heute(d = new Date()) {
    return d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
  }
  function tageZwischen(a, b) {                        // ganze Kalendertage von a bis b
    const t = s => Date.UTC(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8));
    return Math.round((t(b) - t(a)) / 864e5);
  }
  const zahl = (v, lo, hi) => { const n = Math.floor(Number(v)); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : lo; };
  const wert = (v, lo, hi, std) => (v === undefined || v === null || !Number.isFinite(Number(v))) ? std : Math.max(lo, Math.min(hi, Number(v)));
  const istId  = v => typeof v === 'string' && /^[a-z0-9][a-z0-9_-]{0,39}$/i.test(v);
  const istKey = v => typeof v === 'string' && /^[^\s"'<>\\/]{1,120}$/.test(v);    // Dateiname (+ ?parameter)
  const klein  = (v, max) => { try { return JSON.stringify(v).length <= max; } catch (e) { return false; } };
  const zufall = l => l[Math.floor(Math.random() * l.length)];

  // ── Spielstand ──────────────────────────────────────────
  //  Kurzschlüssel, weil der Stand im Sicherungscode mitreist:
  //    v   Version des Spielstands
  //    s   Starttag 'JJJJMMTT'
  //    r   Rohstoffe { h: Holz, s: Stein, g: Gold, … später Event-Währungen }
  //    q   offene Aufträge [{ i: Nr, p: Platz, a: App-Schlüssel, n: Runden nötig, c: geschafft,
  //                           m: Mindest-%, r: Rohstoff, b: Belohnung, x: 1 = Lange-nicht-gespielt-Bonus,
  //                           d: erstellt am }]
  //    rr  angesparte Rerolls · rd Tag der letzten Reroll-Gutschrift · fd Tag des letzten Nachfüllens
  //    b   Bauplätze { '1': [gebäudeId, stufe, fertigAb 'JJJJMMTT'] }
  //    an  Ansehen · e erledigte Aufträge (gesamt)
  //    n   laufende Nummer für Auftrags-IDs · l die zuletzt vergebenen Apps (für Abwechslung)
  //    bw  Bewohner [[bewohnerId, platzNr]] in Einzugsreihenfolge
  //    bq  Bewohner-Auftrag { i, b: bewohnerId, g: Geschichte, a: App, n, c, m, d } · bd Tag des letzten erledigten
  //    sa  Sammelbuch: gesammelte Stück-IDs · nz neu, noch nicht im Dorf angezeigt ('b:id' Bewohner, 's:id' Stück)
  //    we  erledigte Wochenaufträge (gesamt) · dn Name des Dorfs · pz Auftragsplätze, die es schon gab
  //    w   Wochenauftrag { i: ID, k: Montag 'JJJJMMTT', a: 'auftraege'|'app'|'thema', z: Ziel,
  //                        t: Text der Lehrkraft, p: App für den Knopf, n: nötig, c: geschafft, m: Mindest-%, f: 1 = erledigt }
  //    ev  Dorf-Events { eventId: { j: Schuljahr der Zähler, sg: 1 = Startgeschenk bekommen, g: Festgebäude [stufe, fertigAb],
  //                      d: freigeschaltete Deko-IDs, kz: freigeschaltete Kalendertüren, kg: geöffnete, kt: Tag der letzten Tür,
  //                      sv: Versteck (−1 = nichts versteckt), sd: Tag des letzten Versteckens, sf: gefunden (gesamt),
  //                      q: Gast-Auftrag { i, g: Geschichte, a, n, c, m, d }, qd: Tag des letzten erledigten } }
  //    dp  platzierte Deko { dekoPlatzId: 'eventId/dekoId' } (Dorf-Deko: 'dorf/dekoId')
  //    ls  bereits gemeldete Landschafts-Elemente · lk bereits gemeldete Dorf-Deko (für Neuigkeiten)
  //    ch  laufende Challenge { i: challengeId@Starttag, c: geschafft, d: Tag der letzten gezählten Runde (art tage),
  //                            l: geübte Apps (art apps), f: 1 = erledigt } · tr Trophäen { challengeId: wie oft geschafft }
  //    zg  Sparziel { p: Bauplatz, g: Gebäude-Id, s: Stufe } · lz Ids der schon vergebenen Lehrer-Zettel
//    fz  Tag des letzten Fleißzettels · Aufträge zusätzlich: w: 1 = Werkstatt-Bonus, k: Id des Lehrer-Zettels
//  Weitere Felder späterer Etappen (Sammelbuch, Bewohner …) bleiben beim
  //  Säubern erhalten, damit ältere Geräte nichts wegwerfen.
  function leer() {
    return { v: VERSION, s: heute(), r: { h: 0, s: 0, g: 0 }, q: [], rr: 0, rd: '', fd: '', b: {}, an: 0, e: 0, n: 0, l: [],
             bw: [], sa: [], nz: [], we: 0, bd: '', dn: '' };
  }

  function auftragSaeubern(a) {
    if (!a || typeof a !== 'object' || Array.isArray(a) || !istKey(a.a) || !/^[a-z]{1,4}$/.test(a.r)) return null;
    const n = zahl(a.n, 1, 10);
    const q = { i: zahl(a.i, 0, 1e9), p: zahl(a.p, 1, 9), a: a.a, n, c: zahl(a.c, 0, n), m: zahl(a.m, 0, 100),
                r: a.r, b: zahl(a.b, 0, 10000), d: TAG.test(a.d) ? a.d : heute() };
    if (a.x) q.x = 1;
    if (a.w) q.w = 1;
    if (typeof a.k === 'string' && /^[a-z0-9_-]{1,40}$/i.test(a.k)) q.k = a.k;
    return q;
  }

  function saeubern(raw) {
    const d = leer();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return d;
    if (TAG.test(raw.s)) d.s = raw.s;
    if (raw.r && typeof raw.r === 'object' && !Array.isArray(raw.r)) {
      Object.entries(raw.r).slice(0, 20).forEach(([k, v]) => { if (/^[a-z]{1,4}$/.test(k)) d.r[k] = zahl(v, 0, 1e6); });
    }
    if (Array.isArray(raw.q)) {
      const plaetze = new Set();
      raw.q.slice(0, 10).map(auftragSaeubern).forEach(q => { if (q && !plaetze.has(q.p)) { plaetze.add(q.p); d.q.push(q); } });
    }
    d.rr = zahl(raw.rr, 0, 99);
    if (TAG.test(raw.rd)) d.rd = raw.rd;
    if (TAG.test(raw.fd)) d.fd = raw.fd;
    if (raw.b && typeof raw.b === 'object' && !Array.isArray(raw.b)) {
      Object.entries(raw.b).slice(0, 60).forEach(([platz, v]) => {
        if (/^\d{1,3}$/.test(platz) && Array.isArray(v) && istId(v[0])) {
          d.b[platz] = [v[0], zahl(v[1], 1, 20), TAG.test(v[2]) ? v[2] : d.s];
        }
      });
    }
    d.an = zahl(raw.an, 0, 1e6);
    d.e  = zahl(raw.e, 0, 1e6);
    d.n  = zahl(raw.n, 0, 1e9);
    if (Array.isArray(raw.l)) d.l = raw.l.filter(istKey).slice(0, 3);
    if (Array.isArray(raw.bw)) {
      const ids = new Set();
      raw.bw.slice(0, 40).forEach(x => { if (Array.isArray(x) && istId(x[0]) && !ids.has(x[0])) { ids.add(x[0]); d.bw.push([x[0], zahl(x[1], 0, 999)]); } });
    }
    const bq = raw.bq;
    if (bq && typeof bq === 'object' && !Array.isArray(bq) && istId(bq.b) && istKey(bq.a)) {
      const n = zahl(bq.n, 1, 10);
      d.bq = { i: zahl(bq.i, 0, 1e9), b: bq.b, g: zahl(bq.g, 0, 9), a: bq.a, n, c: zahl(bq.c, 0, n), m: zahl(bq.m, 0, 100), d: TAG.test(bq.d) ? bq.d : heute() };
    }
    if (TAG.test(raw.bd)) d.bd = raw.bd;
    if (Array.isArray(raw.sa)) d.sa = [...new Set(raw.sa.filter(istId))].slice(0, 300);
    if (Array.isArray(raw.nz)) d.nz = raw.nz.filter(x => typeof x === 'string' && /^[bslkt]:[a-z0-9_-]{1,40}$/i.test(x)).slice(0, 20);
    if (Array.isArray(raw.ls)) d.ls = [...new Set(raw.ls.filter(istId))].slice(0, 100);
    if (Array.isArray(raw.lk)) d.lk = [...new Set(raw.lk.filter(istId))].slice(0, 100);
    const ch = raw.ch;
    if (ch && typeof ch === 'object' && !Array.isArray(ch) && typeof ch.i === 'string' && /^[a-z0-9_-]{1,40}@\d{8}$/i.test(ch.i)) {
      d.ch = { i: ch.i, c: zahl(ch.c, 0, 999), d: TAG.test(ch.d) ? ch.d : '', l: Array.isArray(ch.l) ? ch.l.filter(istKey).slice(0, 20) : [], f: ch.f ? 1 : 0 };
    }
    if (raw.tr && typeof raw.tr === 'object' && !Array.isArray(raw.tr)) {
      d.tr = {};
      Object.entries(raw.tr).slice(0, 50).forEach(([k, v]) => { if (istId(k)) d.tr[k] = zahl(v, 0, 999); });
    }
    const zg = raw.zg;
    if (zg && typeof zg === 'object' && !Array.isArray(zg) && Number.isInteger(zg.p) && istId(zg.g)) d.zg = { p: zahl(zg.p, 1, 999), g: zg.g, s: zahl(zg.s, 1, 20) };
    if (Array.isArray(raw.lz)) d.lz = raw.lz.filter(x => typeof x === 'string' && /^[a-z0-9_-]{1,40}$/i.test(x)).slice(-10);
    if (TAG.test(raw.fz)) d.fz = raw.fz;
    d.we = zahl(raw.we, 0, 1e5);
    if (Array.isArray(raw.pz)) d.pz = raw.pz.filter(x => Number.isInteger(x) && x > 0 && x < 10).slice(0, 10);
    if (typeof raw.dn === 'string') d.dn = raw.dn.replace(/[<>"'`\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, 24);
    const w = raw.w;
    if (w && typeof w === 'object' && !Array.isArray(w) && TAG.test(w.k) && ['auftraege', 'app', 'thema'].includes(w.a)) {
      const n = zahl(w.n, 1, 50);
      d.w = { i: String(w.i || '').slice(0, 40), k: w.k, a: w.a, z: typeof w.z === 'string' ? w.z.slice(0, 120) : '',
              t: typeof w.t === 'string' ? w.t.slice(0, 80) : '', p: istKey(w.p) ? w.p : '', n, c: zahl(w.c, 0, n), m: zahl(w.m, 0, 100), f: w.f ? 1 : 0 };
    }
    if (raw.ev && typeof raw.ev === 'object' && !Array.isArray(raw.ev)) {
      d.ev = {};
      Object.entries(raw.ev).slice(0, 20).forEach(([id, z]) => { if (istId(id) && z && typeof z === 'object' && !Array.isArray(z)) d.ev[id] = evSaeubern(z); });
    }
    if (raw.dp && typeof raw.dp === 'object' && !Array.isArray(raw.dp)) {
      d.dp = {};
      Object.entries(raw.dp).slice(0, 80).forEach(([platz, key]) => { if (istId(platz) && typeof key === 'string' && DEKO_KEY.test(key)) d.dp[platz] = key; });
    }
    Object.keys(raw).forEach(k => {
      if (!(k in d) && /^[a-z]{1,3}$/.test(k) && klein(raw[k], 4000)) d[k] = raw[k];
    });
    return d;
  }
  const DEKO_KEY = /^[a-z0-9][a-z0-9_-]{0,39}\/[a-z0-9][a-z0-9_-]{0,39}$/i;
  const SAISON = /^\d{4}\/\d{2}$/;
  function evSaeubern(z) {
    const o = { j: SAISON.test(z.j) ? z.j : '', sg: z.sg ? 1 : 0 };
    if (Array.isArray(z.g) && TAG.test(z.g[1])) o.g = [zahl(z.g[0], 1, 9), z.g[1]];
    o.d = Array.isArray(z.d) ? [...new Set(z.d.filter(istId))].slice(0, 30) : [];
    o.kz = zahl(z.kz, 0, 60); o.kg = Math.min(o.kz, zahl(z.kg, 0, 60)); o.kt = TAG.test(z.kt) ? z.kt : '';
    o.sv = Number.isInteger(z.sv) && z.sv >= 0 && z.sv < 100 ? z.sv : -1; o.sd = TAG.test(z.sd) ? z.sd : ''; o.sf = zahl(z.sf, 0, 1e5);
    const q = z.q;
    if (q && typeof q === 'object' && !Array.isArray(q) && istKey(q.a)) {
      const n = zahl(q.n, 1, 10);
      o.q = { i: zahl(q.i, 0, 1e9), g: zahl(q.g, 0, 9), a: q.a, n, c: zahl(q.c, 0, n), m: zahl(q.m, 0, 100), d: TAG.test(q.d) ? q.d : heute() };
    }
    o.qd = TAG.test(z.qd) ? z.qd : '';
    return o;
  }

  function roh() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function laden() {
    try { const s = roh(); return s ? saeubern(JSON.parse(s)) : leer(); } catch (e) { return leer(); }
  }

  let D = laden();
  const listeners = [];
  function melden() { listeners.forEach(fn => { try { fn(D); } catch (e) {} }); }

  /** Hat das Kind das Dorf schon begonnen? Vorher wird nichts gespeichert. */
  function gestartet() { return !!roh(); }

  // Event-Zustände ohne Standardwerte speichern (der Stand reist im Sicherungscode mit)
  const EV_STD = { sg: 0, kz: 0, kg: 0, kt: '', sv: -1, sd: '', sf: 0, qd: '' };
  function kompakt(d) {
    if (!d.ev) return d;
    const ev = {};
    Object.entries(d.ev).forEach(([id, z]) => {
      const o = {};
      Object.entries(z || {}).forEach(([k, v]) => {
        if (v === null || v === undefined || EV_STD[k] === v || (k === 'd' && Array.isArray(v) && !v.length)) return;
        o[k] = v;
      });
      ev[id] = o;
    });
    return Object.assign({}, d, { ev });
  }
  function schreiben() {
    try { localStorage.setItem(KEY, JSON.stringify(kompakt(D))); } catch (e) {}
    melden();
  }
  /** Spielstand speichern – nur, wenn das Dorf schon begonnen wurde. */
  function speichern() { if (gestartet()) schreiben(); }

  /** Dorf beginnen (erster Besuch in spiele/dorf.html). Füllt das Auftragsbrett, sobald die Inhalte da sind. */
  function starten() {
    if (!gestartet()) { D = leer(); schreiben(); }
    return bereit();
  }

  function neuLaden() { D = laden(); melden(); }
  // Änderungen aus anderen Tabs und nach „Pass wiederherstellen“ übernehmen
  window.addEventListener('storage', e => { if (e.key === KEY) neuLaden(); });
  window.addEventListener('lernpass:wiederhergestellt', () => { neuLaden(); if (gestartet()) bereit(); });

  // ── Inhalte (daten/dorf-inhalte.json), offline aus dem Zwischenspeicher ──
  let C = null;                                        // geladene Inhalte
  let inhaltePromise = null;
  function inhalte() {
    if (!inhaltePromise) {
      inhaltePromise = fetch(new URL('daten/dorf-inhalte.json', ROOT).href, { cache: 'no-cache' })
        .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(c => { try { localStorage.setItem(CONTENT_CACHE, JSON.stringify(c)); } catch (e) {} return c; })
        .catch(() => { try { return JSON.parse(localStorage.getItem(CONTENT_CACHE) || '{}'); } catch (e) { return {}; } })
        .then(c => { C = c && typeof c === 'object' ? c : {}; return C; });
    }
    return inhaltePromise;
  }
  /** Inhalte laden und den Tag prüfen (Nachfüllen, Rerolls). Liefert den Spielstand. */
  function bereit() { return inhalte().then(() => { tagesCheck(); return D; }); }

  // Einstellungen der Lehrkraft (config.json → "dorf", über den Admin)
  function lehrkraft() {
    const cfg = lesen(CONFIG_KEY);
    return cfg && cfg.dorf && typeof cfg.dorf === 'object' && !Array.isArray(cfg.dorf) ? cfg.dorf : {};
  }

  // Stellschrauben aus dorf-inhalte.json, überschrieben vom Admin (mit sicheren Standardwerten)
  function werte() {
    const A = (C && C.AUFTRAEGE) || {}, L = lehrkraft();
    const t = A.tag || {}, ln = A.langeNichtGespielt || {}, wo = A.woche || {};
    const rr = { proTag: L.rerollsProTag !== undefined ? L.rerollsProTag : (A.rerolls || {}).proTag,
                 max: L.rerollsMax !== undefined ? L.rerollsMax : (A.rerolls || {}).max };
    const bel = Array.isArray(t.belohnung) ? t.belohnung : [15, 25];
    const lo = wert(bel[0], 0, 1000, 15), hi = Math.max(lo, wert(bel[1], 0, 1000, 25));
    const alle = (Array.isArray(A.plaetze) ? A.plaetze : [])
      .filter(p => p && Number.isInteger(p.id) && (p.faecher === 'alle' || Array.isArray(p.faecher)))
      .sort((a, b) => a.id - b.id);
    // Plätze ohne Gebäude: Admin kann sie begrenzen. Plätze mit Gebäude (Bibliothek): nur, wenn es fertig steht.
    let plaetze = alle.filter(p => !p.gebaeude && !p.extra);
    if (Number.isInteger(L.plaetze) && L.plaetze >= 1) plaetze = plaetze.slice(0, L.plaetze);
    plaetze = plaetze.concat(alle.filter(p => p.gebaeude && !p.extra && steht(p.gebaeude)));
    const fleiss = alle.find(p => p.extra === 'fleiss') || null;
    const ws = A.werkstatt || {}, fl = A.fleiss || {};
    const rohstoffe = (Array.isArray(t.rohstoffe) ? t.rohstoffe : []).filter(r => /^[a-z]{1,4}$/.test(r));
    return {
      plaetze: plaetze.length ? plaetze : [
        { id: 1, name: 'Mathematik', faecher: ['Mathematik'] },
        { id: 2, name: 'Englisch/GPG', faecher: ['Englisch', 'GPG'] },
        { id: 3, name: 'Freie Wahl', faecher: 'alle' }],
      runden:   Math.round(wert(t.runden, 1, 10, 2)),
      schwelle: Math.round(wert(t.schwelle, 0, 100, 70)),
      belohnung: [Math.round(lo), Math.round(hi)],
      rohstoffe: rohstoffe.length ? rohstoffe : ['h', 's'],
      lenkung:  wert(t.rohstoffLenkung, 0, 1, 0),
      werkstatt: { bonus: wert(ws.bonus, 0, 5, 0), sterneBis: Math.round(wert(ws.sterneBis, 0, 3, 1)) },
      fleiss: fleiss ? { platz: fleiss, anteil: wert(fl.anteil, 0, 1, .5) } : null,
      lehrerPlatz: Math.round(wert((A.lehrer || {}).platz, 1, 9, 5)),
      rrProTag: Math.round(wert(rr.proTag, 0, 10, 1)),
      rrMax:    Math.round(wert(rr.max, 0, 20, 3)),
      lnTage:   Math.round(wert(ln.tage, 1, 365, 14)),
      lnBonus:  wert(ln.bonus, 0, 5, 0.5),
      bewohner: {
        runden:  Math.round(wert((A.bewohner || {}).runden, 1, 10, 2)),
        ansehen: Math.round(wert((A.bewohner || {}).ansehen, 0, 1000, 10)),
        englisch: wert((A.bewohner || {}).englischAnteil, 0, 1, 0),
      },
      woche: {
        rohstoffe: Math.round(wert(wo.rohstoffe, 0, 1000, 60)),
        gold:      Math.round(wert(wo.gold, 0, 100, 2)),
        auftraege: Math.round(wert(wo.auftraege, 1, 20, 5)),
        runden:    Math.round(wert(wo.runden, 1, 20, 3)),
      },
    };
  }
  function rohstoffe() {
    const std = [{ id: 'h', name: 'Holz', icon: '🪵' }, { id: 's', name: 'Stein', icon: '🪨' }, { id: 'g', name: 'Gold', icon: '🪙' }];
    const l = C && Array.isArray(C.ROHSTOFFE) ? C.ROHSTOFFE.filter(r => r && /^[a-z]{1,4}$/.test(r.id)) : [];
    return l.length ? l : std;
  }
  function rohstoff(id) { return rohstoffe().find(r => r.id === id) || waehrungen().find(r => r.id === id) || { id, name: id, icon: '📦' }; }

  // ── Daten aus dem Pass und der Config ───────────────────
  function lesen(key) { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; } }
  function klasse() {
    const p = lesen(PASS_KEY);
    const k = p && p.profile && p.profile.klasse;
    return [5, 6, 7, 8, 9].includes(k) ? k : null;
  }
  function zuletztGespielt(key) {                      // 'JJJJMMTT' oder ''
    const p = lesen(PASS_KEY);
    const a = p && p.apps && p.apps[key];
    return a && /^\d{4}-\d{2}-\d{2}$/.test(a.last) ? a.last.replace(/-/g, '') : '';
  }
  function configApps() {
    const cfg = lesen(CONFIG_KEY);
    return cfg && Array.isArray(cfg.apps) ? cfg.apps : null;
  }

  // ── Welche Apps können Aufträge bekommen? ───────────────
  //  Nur echte Lern-Apps: nicht versteckt, nicht mit "dorf": false ausgeschlossen,
  //  für die Klasse freigeschaltet, keine Spiele (Ordner spiele/) und keine externen Links.
  //  Rückgabe: [{ key, name, fach, emoji, datei }] – key = Dateiname wie in den Ergebnissen.
  function appKey(datei) { return String(datei || '').split('/').pop(); }
  function dorfApps(kl) {
    return (configApps() || []).filter(a => a && typeof a === 'object'
        && typeof a.datei === 'string' && a.datei && !/^https?:/i.test(a.datei)
        && !a.datei.startsWith('spiele/') && a.fach !== 'Allgemein'
        && a.hidden !== true && a.dorf !== false
        && Array.isArray(a.klassen) && a.klassen.includes(kl))
      .map(a => ({ key: appKey(a.datei), name: a.name, fach: a.fach, emoji: a.emoji || '📱', datei: a.datei,
                   runden: Number.isInteger(a.dorfRunden) && a.dorfRunden >= 1 && a.dorfRunden <= 10 ? a.dorfRunden : 0 }));
  }
  /** Runden für einen Auftrag in dieser App: eigener Wert der App (Admin) oder der Standard. */
  function rundenFuer(key, std) {
    const a = (configApps() || []).find(x => x && appKey(x.datei) === key);
    return a && Number.isInteger(a.dorfRunden) && a.dorfRunden >= 1 && a.dorfRunden <= 10 ? a.dorfRunden : std;
  }
  /** Anzeige-Daten einer App (auch wenn sie inzwischen versteckt ist). */
  function appInfo(key) {
    const a = (configApps() || []).find(x => x && appKey(x.datei) === key);
    return a ? { key, name: a.name, fach: a.fach, emoji: a.emoji || '📱', datei: a.datei, link: new URL(a.datei, ROOT).href }
             : { key, name: key.replace(/\.html.*$/, ''), fach: '', emoji: '📱', datei: '', link: '' };
  }

  /** Zählt eine Runde für Aufträge? Nicht durchgeklickt und mindestens schwelle %.
   *  Ob sie wegen des XP-Tageslimits noch XP bringt, spielt keine Rolle. */
  function zaehlt(runde, schwelle) {
    return !!runde && !runde.blocked && Number(runde.prozent) >= (Number(schwelle) || 0);
  }

  // ── Aufträge ────────────────────────────────────────────
  //  Platz-Regeln: Platz 1 Mathematik, Platz 2 Englisch/GPG, Platz 3 alle Lern-Apps.
  //  Eine App steht nie auf zwei Plätzen. Ist die Kategorie leer (oder alle ihre
  //  Apps stehen schon auf anderen Plätzen), springt der Platz auf „alle Lern-Apps“.
  function kandidaten(platz, kl, ausschluss) {
    const alle = dorfApps(kl).filter(a => !ausschluss.includes(a.key));
    const passt = a => platz.faecher === 'alle' || (Array.isArray(platz.faecher) && platz.faecher.includes(a.fach));
    const eigene = alle.filter(passt);
    return eigene.length ? eigene : alle;
  }

  /** Welcher Rohstoff fehlt gerade am meisten? Erst fürs Sparziel, sonst der kleinere Vorrat (null = egal). */
  function fehlenderRohstoff(W) {
    const nur = W.rohstoffe.filter(r => r === 'h' || r === 's');
    if (nur.length < 2) return null;
    const z = zielInfo();
    if (z && !z.genug) {
      const f = nur.map(r => [r, z.fehlt[r] || 0]).sort((a, b) => b[1] - a[1]);
      if (f[0][1] > f[1][1]) return f[0][0];
    }
    const v = nur.map(r => [r, D.r[r] || 0]).sort((a, b) => a[1] - b[1]);
    return v[0][1] < v[1][1] ? v[0][0] : null;
  }
  function rohstoffWahl(W) {
    const f = fehlenderRohstoff(W);
    return f && Math.random() < W.lenkung ? f : zufall(W.rohstoffe);
  }
  function sterne(key) {
    try { return window.LernPass && typeof window.LernPass.starsFor === 'function' ? window.LernPass.starsFor(key) : null; } catch (e) { return null; }
  }
  /** Neuer Auftrag für einen Platz. o.app: feste App (Lehrer-Zettel), o.anteil: Teil der Belohnung (Fleißzettel) */
  function neuerAuftrag(platz, W, ausschluss, o = {}) {
    const kl = klasse();
    if (!kl) return null;
    let app = null;
    if (o.app) app = dorfApps(kl).find(a => a.key === o.app) || null;
    else {
      const liste = kandidaten(platz, kl, ausschluss);
      if (!liste.length) return null;
      const frisch = liste.filter(a => !D.l.includes(a.key));      // Abwechslung: nicht die zuletzt vergebenen
      app = zufall(frisch.length ? frisch : liste);
    }
    if (!app) return null;
    const t = heute();
    let b = W.belohnung[0] + Math.floor(Math.random() * (W.belohnung[1] - W.belohnung[0] + 1));
    const zuletzt = zuletztGespielt(app.key);
    const lange = !!zuletzt && tageZwischen(zuletzt, t) >= W.lnTage;
    const st = zuletzt && !lange ? sterne(app.key) : null;
    const werkstatt = W.werkstatt.bonus > 0 && st !== null && st <= W.werkstatt.sterneBis;
    if (lange) b = Math.round(b * (1 + W.lnBonus));
    else if (werkstatt) b = Math.round(b * (1 + W.werkstatt.bonus));
    if (o.anteil !== undefined) b = Math.max(1, Math.round(b * o.anteil));
    D.n++;
    if (!o.app) D.l = [app.key, ...D.l.filter(k => k !== app.key)].slice(0, 3);
    const n = o.runden || app.runden || W.runden;
    const q = { i: D.n, p: platz.id, a: app.key, n, c: 0, m: W.schwelle, r: rohstoffWahl(W), b, d: t };
    if (lange) q.x = 1;
    else if (werkstatt) q.w = 1;
    if (o.k) q.k = o.k;
    return q;
  }

  /** Einmal pro Tag: Rerolls gutschreiben, freie Plätze nachfüllen.
   *  Aufträge, deren App nicht mehr erlaubt ist (versteckt, ausgeschlossen,
   *  andere Klasse), werden sofort ersetzt. Gibt true zurück, wenn sich etwas geändert hat. */
  function tagesCheck() {
    if (!gestartet() || !C) return false;
    D = laden();
    const W = werte(), t = heute();
    let geaendert = false;

    // Rerolls: 1 pro vergangenem Tag (auch für Tage ohne Besuch), angespart bis max
    if (D.rd !== t) {
      const tage = D.rd ? Math.max(0, tageZwischen(D.rd, t)) : 1;
      D.rr = Math.max(D.rr, Math.min(W.rrMax, D.rr + tage * W.rrProTag));
      D.rd = t;
      geaendert = true;
    }

    const kl = klasse();
    if (kl && configApps()) {
      const erlaubt = new Set(dorfApps(kl).map(a => a.key));
      const ersetzen = new Set();
      const aktiv = new Set(W.plaetze.map(p => p.id).concat(W.lehrerPlatz, W.fleiss ? [W.fleiss.platz.id] : []));
      D.q = D.q.filter(q => aktiv.has(q.p));                            // Platz im Admin abgeschaltet
      D.q = D.q.filter(q => { if (erlaubt.has(q.a)) return true; ersetzen.add(q.p); return false; });
      const neuerTag = D.fd !== t;
      const bekannt = new Set(D.pz || []);
      const neuePlaetze = W.plaetze.filter(p => !bekannt.has(p.id)).map(p => p.id);  // z. B. Bibliothek gerade fertig
      if (neuerTag || ersetzen.size || neuePlaetze.length) {
        W.plaetze.forEach(platz => {
          if (D.q.some(q => q.p === platz.id)) return;
          if (!neuerTag && !ersetzen.has(platz.id) && !neuePlaetze.includes(platz.id)) return;   // erledigte Plätze erst morgen wieder
          const q = neuerAuftrag(platz, W, D.q.map(x => x.a));
          if (q) D.q.push(q);
        });
        D.q.sort((a, b) => a.p - b.p);
        D.pz = [...new Set([...(D.pz || []), ...W.plaetze.map(p => p.id)])].slice(0, 10);
        D.fd = t;
        geaendert = true;
      }
    }
    if (lehrerCheck(W)) geaendert = true;
    if (fleissCheck(W)) geaendert = true;
    if (zielCheck()) geaendert = true;
    if (wocheCheck(W)) geaendert = true;
    if (bewohnerCheck()) geaendert = true;
    if (bewohnerAuftragCheck(W)) geaendert = true;
    if (eventCheck(W)) geaendert = true;
    if (challengeCheck()) geaendert = true;
    if (meilensteinCheck()) geaendert = true;
    if (geaendert) speichern();
    return geaendert;
  }

  // ── Lehrer-Zettel ───────────────────────────────────────
  //  Die Lehrkraft hängt im Admin eine App an das Brett (config.json → dorf.lehrerZettel:
  //  [{ id, start 'JJJJ-MM-TT', bis 'JJJJ-MM-TT', app: Dateiname, text, runden, klassen }]).
  //  Er gilt von start bis bis, jeder Zettel kommt pro Kind nur einmal. Belohnung wie ein Tagesauftrag.
  function lehrerZettelListe() { const L = lehrkraft().lehrerZettel; return Array.isArray(L) ? L : []; }
  function lehrerAktiv() {
    const kl = klasse(), t = heute();
    if (!kl) return null;
    const erlaubt = new Set(dorfApps(kl).map(a => a.key));
    return lehrerZettelListe().filter(x => x && typeof x === 'object' && /^[a-z0-9_-]{1,40}$/i.test(x.id || '')
        && String(x.start || '').replace(/-/g, '') <= t && t <= String(x.bis || x.start || '').replace(/-/g, '')
        && (!Array.isArray(x.klassen) || !x.klassen.length || x.klassen.includes(kl)) && erlaubt.has(x.app))
      .sort((a, b) => (a.start < b.start ? 1 : -1))[0] || null;
  }
  function lehrerInfo(q) {
    const x = q && q.k ? lehrerZettelListe().find(y => y && y.id === q.k) : null;
    return x ? { text: typeof x.text === 'string' ? x.text.slice(0, 120) : '', bis: String(x.bis || x.start || '').replace(/-/g, '') } : { text: '', bis: '' };
  }
  function lehrerCheck(W) {
    if (!klasse() || !configApps()) return false;
    const lp = W.lehrerPlatz, akt = lehrerAktiv(), offen = D.q.find(q => q.p === lp);
    let geaendert = false;
    if (offen && (!akt || offen.k !== akt.id)) { D.q = D.q.filter(q => q !== offen); geaendert = true; }   // abgelaufen, entfernt, ersetzt
    if (akt && !D.q.some(q => q.p === lp) && !(D.lz || []).includes(akt.id)) {
      const q = neuerAuftrag({ id: lp, faecher: 'alle' }, W, [], { app: akt.app, k: akt.id,
        runden: Number.isInteger(akt.runden) && akt.runden >= 1 && akt.runden <= 10 ? akt.runden : 0 });
      if (q) { D.q.push(q); D.q.sort((a, b) => a.p - b.p); D.lz = [...(D.lz || []), akt.id].slice(-10); geaendert = true; }
    }
    return geaendert;
  }

  // ── Fleißzettel ─────────────────────────────────────────
  //  Einmal am Tag: Sind alle Tageszettel erledigt, hängt ein Extra-Auftrag mit halber Belohnung.
  function fleissCheck(W) {
    const F = W.fleiss;
    if (!F || !klasse() || !configApps() || !W.plaetze.length) return false;
    if (D.fz === heute() || D.fd !== heute() || D.q.some(q => q.p === F.platz.id)) return false;
    if (W.plaetze.some(p => D.q.some(q => q.p === p.id))) return false;
    const q = neuerAuftrag(F.platz, W, D.q.map(x => x.a), { anteil: F.anteil });
    if (!q) return false;
    D.q.push(q); D.q.sort((a, b) => a.p - b.p);
    D.fz = heute();
    return true;
  }

  // ── Sparziel ────────────────────────────────────────────
  //  Das Kind wählt ein Gebäude (oder die nächste Stufe) als Ziel. Anzeige im Dorf und in den Apps.
  function zielSetzen(platzId, gebId) {
    D = laden();
    const i = platzInfo(platzId);
    if (!i || i.gesperrt) return { ok: false };
    if (i.eintrag) { if (!i.naechste) return { ok: false }; D.zg = { p: platzId, g: i.gebaeude.id, s: i.naechste }; }
    else { if (!baubar(platzId).some(b => b.gebaeude.id === gebId)) return { ok: false }; D.zg = { p: platzId, g: gebId, s: 1 }; }
    speichern();
    return { ok: true };
  }
  function zielWeg() { D = laden(); if (!D.zg) return; delete D.zg; speichern(); }
  /** Ist das Ziel erreicht oder nicht mehr möglich? Dann weg damit. */
  function zielCheck() {
    const z = D.zg;
    if (!z || !C) return false;
    const e = D.b[z.p];
    const weg = e ? (e[0] !== z.g || e[1] >= z.s) : (z.s !== 1 || !baubar(z.p).some(b => b.gebaeude.id === z.g));
    if (weg) { delete D.zg; return true; }
    return false;
  }
  /** { platz, gebaeude, stufe, kosten, fehlt, genug, ansehen, ansehenFehlt, auftraege } oder null */
  function zielInfo() {
    const z = D.zg;
    if (!z || !C) return null;
    const g = gebaeude(z.g);
    if (!g) return null;
    const k = kosten(z.g, z.s), fehlt = {};
    Object.entries(k).forEach(([r, n]) => { const f = n - (D.r[r] || 0); if (f > 0) fehlt[r] = f; });
    const ansehen = z.s > 1 ? ansehenNoetig(z.g, z.s) : 0, ansehenFehlt = Math.max(0, ansehen - D.an);
    const W = werte(), schnitt = (W.belohnung[0] + W.belohnung[1]) / 2;
    const hs = (fehlt.h || 0) + (fehlt.s || 0);
    const e = D.b[z.p];
    return { platz: z.p, gebaeude: g, stufe: z.s, kosten: k, fehlt, genug: !Object.keys(fehlt).length, ansehen, ansehenFehlt,
             auftraege: hs ? Math.max(1, Math.ceil(hs / schnitt)) : 0, imBau: !!e && !fertig(e) };
  }
  /** Was kann das Kind gerade bauen oder ausbauen? [{ platz, gebaeude, art: 'bauen'|'ausbauen', stufe }] */
  function bauMoeglich() {
    const aus = [];
    plaetze().forEach(p => {
      const i = platzInfo(p.id);
      if (!i || i.gesperrt) return;
      if (!i.eintrag) baubar(p.id).filter(b => b.genug).forEach(b => aus.push({ platz: p.id, gebaeude: b.gebaeude, art: 'bauen', stufe: 1 }));
      else if (i.naechste && i.genug && i.ansehenOk) aus.push({ platz: p.id, gebaeude: i.gebaeude, art: 'ausbauen', stufe: i.naechste });
    });
    return aus;
  }
  /** Meldungs-Zeile fürs Ziel (in den Lern-Apps) */
  function zielZeile() {
    const z = zielInfo();
    if (!z || z.imBau) return '';
    const name = `${z.gebaeude.icon || '🏠'} ${z.gebaeude.name}${z.stufe > 1 ? ' Stufe ' + z.stufe : ''}`;
    if (z.genug && !z.ansehenFehlt) return `🎯 Du hast genug für ${name}! Bau es im Dorf.`;
    if (z.auftraege) return `🎯 ${name}: noch etwa ${z.auftraege} ${z.auftraege === 1 ? 'Auftrag' : 'Aufträge'}`;
    if (z.fehlt.g) return `🎯 ${name}: dir fehlt noch Gold (Wochenauftrag)`;
    return '';
  }

  /** Jahreszeit nach Datum (JAHRESZEITEN in dorf-inhalte.json, nur Optik) oder null */
  function jahreszeit(d = new Date()) {
    const L = C && Array.isArray(C.JAHRESZEITEN) ? C.JAHRESZEITEN.filter(j => j && istId(j.id) && /^\d{2}-\d{2}$/.test(j.ab || '')) : [];
    if (!L.length) return null;
    const md = String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const sort = L.slice().sort((a, b) => a.ab.localeCompare(b.ab));
    return sort.filter(j => j.ab <= md).pop() || sort[sort.length - 1];      // vor dem ersten Beginn: die letzte (Winter)
  }

  /** Alle offenen Aufträge mit App (für die Heute-Leiste und die Startseite) */
  function offeneAuftraege() {
    if (!gestartet()) return [];
    const W = werte(), out = [];
    D.q.forEach(q => out.push({ art: q.p === W.lehrerPlatz && q.k ? 'lehrer' : W.fleiss && q.p === W.fleiss.platz.id ? 'fleiss' : 'tag',
      app: q.a, c: q.c, n: q.n, auftrag: q }));
    const bi = bewohnerAuftragInfo();
    if (bi) out.push({ art: 'bewohner', app: bi.auftrag.a, c: bi.auftrag.c, n: bi.auftrag.n, von: bi.bewohner });
    const gi = gastAuftragInfo();
    if (gi) out.push({ art: 'gast', app: gi.auftrag.a, c: gi.auftrag.c, n: gi.auftrag.n, von: gi.gast });
    const w = D.w;
    if (w && !w.f && (w.a === 'app' || w.p)) out.push({ art: 'woche', app: w.a === 'app' ? w.z : w.p, c: w.c, n: w.n });
    const rang = { lehrer: 0, tag: 1, fleiss: 2, bewohner: 3, gast: 4, woche: 5 };
    return out.sort((a, b) => rang[a.art] - rang[b.art]);
  }

  // ── Wochenauftrag ───────────────────────────────────────
  //  Jede Woche (Montag bis Sonntag) ein Auftrag: von der Lehrkraft (Admin, je Klasse)
  //  oder automatisch „Erledige 5 Aufträge vom Brett“. Belohnung: 60 Rohstoffe + 2 Gold.
  //  Ein neuer Auftrag der Lehrkraft ersetzt einen noch offenen; ein erledigter bleibt
  //  erledigt, bis eine neue Woche beginnt oder die Lehrkraft einen neuen setzt.
  function montag(d = new Date()) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() - (x.getDay() + 6) % 7);
    return heute(x);
  }
  function wocheSoll(W) {
    const mo = montag(), kl = klasse();
    const liste = Array.isArray(lehrkraft().wochen) ? lehrkraft().wochen : [];
    const erlaubt = kl ? new Set(dorfApps(kl).map(a => a.key)) : new Set();
    const lk = liste.find(x => x && typeof x === 'object' && String(x.start || '').replace(/-/g, '') === mo
      && ['app', 'thema'].includes(x.art) && typeof x.ziel === 'string' && x.ziel
      && (!Array.isArray(x.klassen) || !x.klassen.length || x.klassen.includes(kl))
      && (x.art !== 'app' || erlaubt.has(x.ziel)));
    if (lk) {
      return { i: String(lk.id || 'lk').slice(0, 40), k: mo, a: lk.art, z: lk.ziel.slice(0, 120), t: String(lk.name || '').slice(0, 80),
               p: lk.art === 'app' ? lk.ziel : (istKey(lk.app) ? lk.app : ''), n: zahl(lk.runden || W.woche.runden, 1, 20), c: 0, m: W.schwelle, f: 0 };
    }
    return { i: 'auto-' + mo, k: mo, a: 'auftraege', z: '', t: '', p: '', n: W.woche.auftraege, c: 0, m: W.schwelle, f: 0 };
  }
  function wocheCheck(W) {
    if (!klasse() || !configApps()) return false;
    const soll = wocheSoll(W), w = D.w;
    if (w && w.k === soll.k && (w.i === soll.i || (w.f && soll.a === 'auftraege'))) return false;
    D.w = soll;
    return true;
  }
  function wocheLohn() {
    const W = werte().woche, roh = Math.round(W.rohstoffe * (1 + bonus('woche'))), halb = Math.floor(roh / 2);
    return { h: roh - halb, s: halb, g: W.gold };
  }
  /** Passt die Runde zum Wochenauftrag? (bei „auftraege“ zählt stattdessen jeder erfüllte Tagesauftrag) */
  function passtZurWoche(runde) {
    const w = D.w;
    if (!w || w.f || !zaehlt(runde, w.m)) return false;
    if (w.a === 'app') return runde.app === w.z;
    if (w.a === 'thema') return (runde.inhalt || []).some(id => id === w.z || id.startsWith(w.z + '/') || id.startsWith(w.z + ':'));
    return false;
  }
  function wocheZaehlen() {
    const w = D.w;
    w.c = Math.min(w.n, w.c + 1);
    if (w.c < w.n) return 'woche-fortschritt';
    w.f = 1;
    D.we++;
    Object.entries(wocheLohn()).forEach(([r, n]) => { D.r[r] = (D.r[r] || 0) + n; });
    return 'woche-erfuellt';
  }

  // ── Bewohner ────────────────────────────────────────────
  //  Jede fertige Stufe eines Wohnhauses bringt einen Bewohner ("bewohner" je Stufe),
  //  in der Reihenfolge von BEWOHNER in dorf-inhalte.json. Wer eingezogen ist, bleibt.
  function bewohnerListe() { return C && Array.isArray(C.BEWOHNER) ? C.BEWOHNER.filter(b => b && istId(b.id)) : []; }
  function bewohnerDef(id) { return bewohnerListe().find(b => b.id === id) || null; }
  function bewohnerCheck() {
    if (!C || !bewohnerListe().length) return false;
    let neu = false;
    // Bewohner, die es in dorf-inhalte.json nicht mehr gibt, ziehen aus – ihr Platz wird neu besetzt
    const vorher = D.bw.length;
    D.bw = D.bw.filter(x => bewohnerDef(x[0]));
    if (D.bw.length !== vorher) neu = true;
    if (D.bq && !bewohnerDef(D.bq.b)) { D.bq = null; neu = true; }
    const frei = bewohnerListe().filter(b => !D.bw.some(x => x[0] === b.id));
    Object.entries(D.b).sort((a, b) => a[0] - b[0]).forEach(([platz, e]) => {
      const g = gebaeude(e[0]);
      if (!g || !g.bewohner) return;
      const soll = stehendeStufe(e) * zahl(g.bewohner, 0, 10);
      let ist = D.bw.filter(x => x[1] === Number(platz)).length;
      while (ist < soll && frei.length) {
        const b = frei.shift();
        D.bw.push([b.id, Number(platz)]);
        D.nz = [...D.nz, 'b:' + b.id].slice(-20);
        ist++; neu = true;
      }
    });
    return neu;
  }

  // ── Bewohner-Aufträge ───────────────────────────────────
  //  Einer auf einmal, mit kleiner Geschichte. Nach dem Erledigen kommt am nächsten
  //  Tag der nächste. Belohnung: Ansehen + Sammelstück aus der Geschichte.
  //  Wer noch Geschichten übrig hat, kommt zuerst dran.
  function offeneGeschichten(b) {
    return (b.geschichten || []).map((g, i) => i).filter(i => {
      const st = b.geschichten[i].stueck;
      return st && istId(st.id) && !D.sa.includes(st.id);
    });
  }
  function bewohnerAuftragCheck(W) {
    const kl = klasse();
    if (!kl || !configApps()) return false;
    const erlaubt = dorfApps(kl);
    if (D.bq) {                                                    // App nicht mehr erlaubt → neue App, gleiche Geschichte
      if (erlaubt.some(a => a.key === D.bq.a) || !erlaubt.length) return false;
      D.bq.a = zufall(erlaubt).key; D.bq.c = 0;
      return true;
    }
    if (!D.bw.length || D.bd === heute() || !erlaubt.length) return false;
    const da = D.bw.map(x => bewohnerDef(x[0])).filter(Boolean);
    if (!da.length) return false;
    const mitGeschichte = da.filter(b => offeneGeschichten(b).length);
    const b = zufall(mitGeschichte.length ? mitGeschichte : da);
    const offen = offeneGeschichten(b);
    const g = offen.length ? offen[0] : Math.floor(Math.random() * Math.max(1, (b.geschichten || []).length));
    const belegt = D.q.map(q => q.a).concat(gastApps());
    let apps = erlaubt.filter(a => !belegt.includes(a.key));
    if (!apps.length) apps = erlaubt;
    const brief = (b.geschichten || [])[g] && b.geschichten[g].en;       // Brief auf Englisch → gern in einer Englisch-App
    const en = apps.filter(a => a.fach === 'Englisch');
    if (brief && en.length && Math.random() < W.bewohner.englisch) apps = en;
    const app = zufall(apps);
    D.n++;
    D.bq = { i: D.n, b: b.id, g, a: app.key, n: app.runden || W.bewohner.runden, c: 0, m: W.schwelle, d: heute() };
    return true;
  }
  function bewohnerAuftragInfo() {
    if (!D.bq) return null;
    const b = bewohnerDef(D.bq.b);
    if (!b) return null;
    const gesch = (b.geschichten || [])[D.bq.g] || {};
    const st = gesch.stueck && !D.sa.includes(gesch.stueck.id) ? gesch.stueck : null;
    const brief = appInfo(D.bq.a).fach === 'Englisch' && typeof gesch.en === 'string' && gesch.en ? gesch.en : '';
    return { auftrag: D.bq, bewohner: b, text: gesch.text || '', brief, stueck: st, ansehen: werte().bewohner.ansehen };
  }

  // ── Meilensteine (landen im Sammelbuch) ─────────────────
  function meilensteine() { return C && Array.isArray(C.MEILENSTEINE) ? C.MEILENSTEINE.filter(m => m && istId(m.id) && m.bedingung) : []; }
  function erfuellt(bed) {
    const w = Number(bed.wert) || 0;
    const stehen = Object.values(D.b).filter(e => stehendeStufe(e) > 0);
    switch (bed.art) {
      case 'gebaeude':     return stehen.length >= w;
      case 'rathaus':      return rathausStufe() >= w;
      case 'auftraege':    return D.e >= w;
      case 'wochen':       return D.we >= w;
      case 'bewohner':     return D.bw.length >= w;
      case 'stufe':        return stehen.some(e => stehendeStufe(e) >= w);
      case 'alleGebaeude': return gebaeudeListe().filter(g => !g.bonusGebaeude).every(g => stehen.some(e => e[0] === g.id));
      default:             return false;
    }
  }
  function meilensteinCheck() {
    if (!C) return false;
    let neu = false;
    meilensteine().forEach(m => {
      if (!D.sa.includes(m.id) && erfuellt(m.bedingung)) { D.sa.push(m.id); D.nz = [...D.nz, 's:' + m.id].slice(-20); neu = true; }
    });
    eventListe().forEach(e => {                                  // Fest-Meilenstein: Festgebäude steht
      const m = e.meilenstein;
      if (m && istId(m.id) && !D.sa.includes(m.id) && festStufe(e.id) >= 1) { D.sa.push(m.id); D.nz = [...D.nz, 's:' + m.id].slice(-20); neu = true; }
    });
    if (landschaftCheck()) neu = true;
    return neu;
  }

  /** Sammelbuch für die Anzeige: Bewohner (mit ihren Stücken) und Meilensteine */
  function sammelbuch() {
    const bewohner = bewohnerListe().map(b => ({
      id: b.id, name: b.name, icon: b.icon, text: b.text,
      da: D.bw.some(x => x[0] === b.id),
      stuecke: (b.geschichten || []).map(g => g.stueck).filter(Boolean).map(st => ({ ...st, hat: D.sa.includes(st.id) })),
    }));
    const meilen = meilensteine().map(m => ({ id: m.id, name: m.name, icon: m.icon, text: m.text, hat: D.sa.includes(m.id) }));
    const feste = eventListe().map(e => {
      const w = e.waehrung, gast = e.gast || null;
      const stuecke = festStuecke(e).map(st => ({ ...st, hat: D.sa.includes(st.id) }));
      return { id: e.id, name: e.name, icon: e.icon, titel: e.titel || e.name, waehrung: w, menge: D.r[w.id] || 0,
               gast: gast ? { name: gast.name, icon: gast.icon, text: gast.text } : null, stufe: festStufe(e.id),
               festgebaeude: e.festgebaeude ? { name: e.festgebaeude.name, icon: e.festgebaeude.icon, max: (e.festgebaeude.stufen || []).length } : null,
               deko: (e.deko || []).length, dekoHat: (evLesen(e.id).d || []).length, stuecke, aktiv: (aktivesEvent() || {}).id === e.id };
    });
    const alle = bewohner.flatMap(b => b.stuecke).concat(meilen, feste.flatMap(f => f.stuecke));
    const trophaeenListe = challengeListe().map(c => ({ id: c.id, name: c.name, icon: c.icon, text: c.text, mal: (D.tr || {})[c.id] || 0 }));
    const landschaft = landschaftListe().map(l => ({ id: l.id, name: l.name, icon: l.icon, text: l.text, hat: bedingungOk(l.ab), hinweis: bedingungText(l.ab) }));
    return { bewohner, meilensteine: meilen, feste, landschaft, trophaeen: trophaeenListe, gesamt: alle.length, gesammelt: alle.filter(x => x.hat).length };
  }
  /** Was ist neu seit dem letzten Blick ins Dorf? Liefert und leert die Liste. */
  function neuigkeiten() {
    D = laden();
    const l = D.nz.slice();
    if (!l.length) return [];
    D.nz = [];
    speichern();
    const stueck = id => {
      for (const b of bewohnerListe()) for (const g of b.geschichten || []) if (g.stueck && g.stueck.id === id) return { ...g.stueck, von: b.name };
      const m = meilensteine().find(x => x.id === id);
      if (m) return { id: m.id, name: m.name, icon: m.icon, text: m.text };
      for (const e of eventListe()) {
        const st = festStuecke(e).find(x => x.id === id);
        if (st) return { ...st, von: st.von || e.name };
      }
      return null;
    };
    return l.map(x => {
      const id = x.slice(2);
      if (x.startsWith('b:')) return { art: 'bewohner', ...(bewohnerDef(id) || {}) };
      if (x.startsWith('l:')) { const e = landschaftListe().find(y => y.id === id); return e ? { art: 'landschaft', name: e.name, icon: e.icon, text: e.text } : {}; }
      if (x.startsWith('k:')) { const e = dekoDef('dorf/' + id); return e ? { art: 'deko', name: e.name, icon: e.icon } : {}; }
      if (x.startsWith('t:')) { const c = challengeListe().find(y => y.id === id); return c ? { art: 'trophaee', name: c.name, icon: TROPHAEE[Math.min(3, (D.tr || {})[id] || 1) - 1], text: c.text } : {}; }
      return { art: 'stueck', ...(stueck(id) || {}) };
    }).filter(x => x.name);
  }
  function dorfname(name) {
    if (name === undefined) return D.dn;
    D = laden();
    D.dn = String(name).replace(/[<>"'`\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, 24);
    speichern();
    return D.dn;
  }

  /** Kann der Auftrag auf diesem Platz getauscht werden? */
  function kannTauschen(platzId) {
    const q = D.q.find(x => x.p === platzId), kl = klasse();
    if (!q || D.rr < 1 || !kl) return false;
    const platz = werte().plaetze.find(p => p.id === platzId);          // Lehrer- und Fleißzettel: kein Tausch
    if (!platz) return false;
    return kandidaten(platz, kl, D.q.map(x => x.a)).length > 0;
  }

  /** Auftrag gegen eine andere App tauschen (kostet einen Reroll, Fortschritt beginnt neu). */
  function tauschen(platzId) {
    D = laden();
    if (!kannTauschen(platzId)) return { ok: false };
    const W = werte();
    const alt = D.q.find(x => x.p === platzId);
    const platz = W.plaetze.find(p => p.id === platzId) || { id: platzId, faecher: 'alle' };
    const neu = neuerAuftrag(platz, W, D.q.map(x => x.a));
    if (!neu) return { ok: false };
    D.q = D.q.map(x => x === alt ? neu : x);
    D.rr--;
    speichern();
    return { ok: true, auftrag: neu };
  }

  // ── Bauen ───────────────────────────────────────────────
  //  Ein Eintrag in D.b: [gebäudeId, stufe, fertigAb]. Solange fertigAb nach heute
  //  liegt, ist die Stufe „im Bau“ (die vorige Stufe steht noch bzw. nur das Fundament).
  //  Ein Bau ist ab dem nächsten Kalendertag fertig, der allererste sofort.
  function gebaeudeListe() { return C && Array.isArray(C.GEBAEUDE) ? C.GEBAEUDE.filter(g => g && istId(g.id)) : []; }
  function gebaeude(id) { return gebaeudeListe().find(g => g.id === id) || null; }
  function plaetze() {
    return C && Array.isArray(C.BAUPLAETZE)
      ? C.BAUPLAETZE.filter(p => p && Number.isInteger(p.id)).map(p => ({ id: p.id, rathaus: zahl(p.rathaus, 0, 20), fest: p.fest || null, x: Number(p.x) || 0, z: Number(p.z) || 0 }))
      : [];
  }
  function morgen() { const d = new Date(); d.setDate(d.getDate() + 1); return heute(d); }
  function fertig(e) { return !!e && e[2] <= heute(); }
  /** Stufe, die gerade steht (während eines Ausbaus die alte). */
  function stehendeStufe(e) { return !e ? 0 : (fertig(e) ? e[1] : e[1] - 1); }
  function rathausStufe() {
    const p = plaetze().find(x => x.fest === 'rathaus');
    const e = p && D.b[p.id];
    return e && e[0] === 'rathaus' ? stehendeStufe(e) : 0;
  }
  function kostenfaktor() {
    const L = Number(lehrkraft().kostenfaktor);
    if (Number.isFinite(L) && L >= .25 && L <= 4) return L;
    const f = Number(C && C.BAU && C.BAU.kostenfaktor); return Number.isFinite(f) && f > 0 ? f : 1;
  }
  /** Kosten einer Stufe { h, s, … } (mit Kostenfaktor). Ein Gebäude darf eigene "kosten" haben. */
  //  Holz und Stein: × Kostenfaktor × (1 − Rabatt der Schmiede). Gold bleibt, wie es ist.
  //  "zusatz" eines Gebäudes kommt je Stufe dazu (z. B. Gold für die Bibliothek).
  function kosten(gebId, stufe) {
    const g = gebaeude(gebId);
    const eigene = g && Array.isArray(g.kosten) ? g.kosten : null;
    const tab = eigene || (C && C.BAU && Array.isArray(C.BAU.stufenKosten) ? C.BAU.stufenKosten : []);
    const zeile = tab.find(z => z && z.stufe === stufe) || {};
    const faktor = kostenfaktor() * (1 - Math.min(.5, bonus('rabatt')));
    const k = {};
    const dazu = (r, n) => { if (/^[a-z]{1,4}$/.test(r) && n > 0) k[r] = (k[r] || 0) + n; };
    Object.keys(zeile).forEach(r => { if (r !== 'stufe') dazu(r, r === 'g' ? zahl(zeile[r], 0, 1e6) : Math.round(zahl(zeile[r], 0, 1e6) * faktor)); });
    if (g && g.zusatz && typeof g.zusatz === 'object') Object.entries(g.zusatz).forEach(([r, l]) => {
      if (Array.isArray(l)) dazu(r, r === 'g' ? zahl(l[stufe - 1], 0, 1e6) : Math.round(zahl(l[stufe - 1], 0, 1e6) * faktor));
    });
    return k;
  }
  /** Steht dieses Gebäude irgendwo fertig (mind. Stufe 1)? */
  function steht(gebId) { return Object.values(D.b).some(e => e[0] === gebId && stehendeStufe(e) > 0); }
  /** Nötiges Ansehen für eine Stufe (0 = keins) */
  function ansehenNoetig(gebId, stufe) {
    const g = gebaeude(gebId);
    return g && Array.isArray(g.ansehenNoetig) ? zahl(g.ansehenNoetig[stufe - 1], 0, 1e6) : 0;
  }
  function genug(k) { return Object.entries(k).every(([r, n]) => (D.r[r] || 0) >= n); }

  /** Alles, was die Oberfläche über einen Bauplatz wissen muss. */
  function platzInfo(platzId) {
    const def = plaetze().find(p => p.id === platzId);
    if (!def) return null;
    const e = D.b[platzId] || null;
    const info = { id: platzId, def, gesperrt: def.rathaus > rathausStufe(), noetig: def.rathaus, eintrag: e };
    if (e) {
      const g = gebaeude(e[0]) || { id: e[0], name: e[0], icon: '🏠', maxStufe: e[1] };
      const max = zahl(g.maxStufe, 1, 20);
      Object.assign(info, {
        gebaeude: g, stufe: stehendeStufe(e), imBau: !fertig(e), zielStufe: e[1], fertigAb: e[2],
        naechste: fertig(e) && e[1] < max ? e[1] + 1 : null,
      });
      if (info.naechste) {
        info.kosten = kosten(e[0], info.naechste);
        info.genug = genug(info.kosten);
        info.ansehen = ansehenNoetig(e[0], info.naechste);            // 0 = kein Ansehen nötig
        info.ansehenOk = D.an >= info.ansehen;
      }
    }
    return info;
  }

  /** Welche Gebäude passen auf einen leeren Bauplatz? [{ gebaeude, kosten, genug }] */
  function baubar(platzId) {
    const info = platzInfo(platzId);
    if (!info || info.gesperrt || info.eintrag) return [];
    const stehen = Object.values(D.b).map(e => e[0]);
    // "mehrfach": true = beliebig oft, eine Zahl = höchstens so oft, fehlt = nur einmal
    const hoechstens = g => g.mehrfach === true ? Infinity : (Number.isInteger(g.mehrfach) && g.mehrfach > 0 ? g.mehrfach : 1);
    return gebaeudeListe()
      .filter(g => info.def.fest ? g.id === info.def.fest
                                 : !plaetze().some(p => p.fest === g.id) && stehen.filter(id => id === g.id).length < hoechstens(g))
      .map(g => {
        const k = kosten(g.id, 1), fehlen = Math.max(0, zahl(g.trophaeen, 0, 99) - trophaeen());
        return { gebaeude: g, kosten: k, genug: genug(k) && !fehlen, trophaeenFehlen: fehlen };
      });
  }

  function ansehenFuer(gebId, stufe) {
    const g = gebaeude(gebId);
    return g && Array.isArray(g.ansehen) ? zahl(g.ansehen[stufe - 1], 0, 1000) : 0;
  }
  function bezahlen(k) { Object.entries(k).forEach(([r, n]) => { D.r[r] = (D.r[r] || 0) - n; }); }

  /** Gebäude auf einen leeren Bauplatz setzen. */
  function bauen(platzId, gebId) {
    D = laden();
    const wahl = baubar(platzId).find(b => b.gebaeude.id === gebId);
    if (!wahl) return { ok: false, grund: 'nicht-baubar' };
    if (!wahl.genug) return { ok: false, grund: 'zu-wenig' };
    const erster = Object.keys(D.b).length === 0;
    bezahlen(wahl.kosten);
    D.b[platzId] = [gebId, 1, erster ? heute() : morgen()];
    D.an += ansehenFuer(gebId, 1);
    bewohnerCheck();
    meilensteinCheck();
    zielCheck();
    speichern();
    return { ok: true, sofort: erster };
  }

  /** Fertiges Gebäude um eine Stufe ausbauen. */
  function ausbauen(platzId) {
    D = laden();
    const info = platzInfo(platzId);
    if (!info || !info.eintrag || !info.naechste) return { ok: false, grund: 'nicht-ausbaubar' };
    if (!info.ansehenOk) return { ok: false, grund: 'ansehen' };
    if (!info.genug) return { ok: false, grund: 'zu-wenig' };
    bezahlen(info.kosten);
    D.b[platzId] = [info.gebaeude.id, info.naechste, morgen()];
    D.an += ansehenFuer(info.gebaeude.id, info.naechste);
    meilensteinCheck();
    zielCheck();
    speichern();
    return { ok: true };
  }

  /** Bonus auf einen Rohstoff aus fertigen Gebäuden (z. B. Sägewerk → Holz), als Anteil (0.2 = +20 %). */
  function bonus(r) {
    let summe = 0;
    Object.values(D.b).forEach(e => {
      const g = gebaeude(e[0]), st = stehendeStufe(e);
      const l = g && g.bonus && Array.isArray(g.bonus[r]) ? g.bonus[r] : null;
      if (l && st > 0) summe += Math.max(0, Math.min(5, Number(l[Math.min(st, l.length) - 1]) || 0));
    });
    return summe;
  }
  /** Belohnung eines Auftrags: { basis, extra, gesamt } */
  function lohn(q) {
    const extra = Math.round(q.b * bonus(q.r));
    return { basis: q.b, extra, gesamt: q.b + extra };
  }

  // ── Dorf-Events ─────────────────────────────────────────
  //  Welches Event gerade läuft, bestimmt der Pass (Admin → Pass → Events). Das Dorf nimmt
  //  das erste aktive in der Reihenfolge der Pass-Events. Hat es in dorf-inhalte.json keinen
  //  Eintrag unter EVENTS, bekommt das Dorf nur Wimpel in den Event-Farben (ohne Inhalte).
  //  Alles, was ein Kind im Event bekommt, bleibt: Währung, Festgebäude (erscheint im nächsten
  //  Event wieder), Deko (bleibt stehen, wo sie platziert wurde), Sammelstücke.
  function eventListe() {
    return C && Array.isArray(C.EVENTS) ? C.EVENTS.filter(e => e && istId(e.id) && e.waehrung && /^[a-z]{1,4}$/.test(e.waehrung.id)) : [];
  }
  function eventDef(id) { return eventListe().find(e => e.id === id) || null; }
  function waehrungen() { return eventListe().map(e => ({ id: e.waehrung.id, name: e.waehrung.name, icon: e.waehrung.icon, event: e.id })); }
  function eventWerte() {
    const E = (C && C.EVENT_WERTE) || {}, g = E.gast || {};
    return {
      start:      Math.round(wert(E.startgeschenk, 0, 1000, 5)),
      proAuftrag: Math.round(wert(E.proAuftrag, 0, 1000, 3)),
      mechanik:   Math.round(wert(E.mechanik, 0, 1000, 3)),
      gast: { runden: Math.round(wert(g.runden, 1, 10, 2)), lohn: Math.round(wert(g.lohn, 0, 1000, 8)), lohnWieder: Math.round(wert(g.lohnWieder, 0, 1000, 5)) },
    };
  }
  /** Aktive Pass-Events in ihrer Reihenfolge ([{ id, name, icon, farbe, farbe2, titel }]) */
  function passEvents() {
    try { if (window.LernPass && typeof window.LernPass.activeEvents === 'function') return window.LernPass.activeEvents(); } catch (e) {}
    const cfg = lesen(CONFIG_KEY), an = cfg && cfg.pass && cfg.pass.events && typeof cfg.pass.events === 'object' ? cfg.pass.events : {};
    const pc = lesen('lernwelt-inhalte-cache');
    const liste = pc && Array.isArray(pc.EVENTS) ? pc.EVENTS : eventListe();
    return liste.filter(e => e && an[e.id] === true);
  }
  /** Das Event, das im Dorf gerade gilt: { id, pass, def (null = nur Wimpel), mehrere } oder null */
  function aktivesEvent() {
    const l = passEvents();
    if (!l.length) return null;
    return { id: l[0].id, pass: l[0], def: eventDef(l[0].id), mehrere: l.length > 1 };
  }
  // Schuljahr wie im Pass ('2026/27', Wechsel am 1. August)
  function saison() {
    try { if (window.LernPass && typeof window.LernPass.seasonId === 'function') return window.LernPass.seasonId(); } catch (e) {}
    const d = new Date(), y = d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1;
    return y + '/' + String((y + 1) % 100).padStart(2, '0');
  }
  function evLesen(id) { return (D.ev && D.ev[id]) || { d: [], kz: 0, kg: 0, sv: -1, sf: 0 }; }
  /** Zustand eines Events zum Schreiben. Neues Schuljahr: Kalender und Startgeschenk beginnen neu. */
  function evZustand(id) {
    if (!D.ev) D.ev = {};
    const z = D.ev[id] || (D.ev[id] = evSaeubern({}));
    if (z.j !== saison()) { z.j = saison(); z.sg = 0; z.kz = 0; z.kg = 0; z.kt = ''; }
    return z;
  }
  function gutschrift(rid, n) { if (n > 0) D.r[rid] = (D.r[rid] || 0) + n; }
  function flaechen() {
    const F = (C && C.FLAECHEN) || {};
    const fw = F.festwiese && typeof F.festwiese === 'object' ? F.festwiese : {};
    const pos = (v, std) => Array.isArray(v) && v.length === 2 ? [Number(v[0]) || 0, Number(v[1]) || 0] : std;
    const festwiese = { x: Number(fw.x) || 80, z: Number(fw.z) || 0, breite: Number(fw.breite) || 24, tiefe: Number(fw.tiefe) || 26 };
    festwiese.gebaeude = pos(fw.gebaeude, [festwiese.x, festwiese.z - 3]);
    festwiese.gast = pos(fw.gast, [festwiese.x - 10, festwiese.z - 5]);
    festwiese.begleiter = pos(fw.begleiter, [festwiese.x + 8, festwiese.z + 6]);
    return {
      dorf: Number(F.dorf) || 57, festwiese,
      dekoplaetze: (Array.isArray(F.dekoplaetze) ? F.dekoplaetze : []).filter(p => p && istId(p.id))
        .map(p => ({ id: p.id, x: Number(p.x) || 0, z: Number(p.z) || 0, festwiese: !!p.festwiese })),
      verstecke: (Array.isArray(F.verstecke) ? F.verstecke : []).map(p => ({ x: Number(p && p.x) || 0, z: Number(p && p.z) || 0 })),
      umland: Array.isArray(F.umland) ? F.umland : [],
      wege: {
        gitter: (F.wege && Array.isArray(F.wege.gitter) ? F.wege.gitter : [-50, -30, -10, 10, 30, 50]).map(Number).filter(Number.isFinite).sort((a, b) => a - b),
        tempo: wert(F.wege && F.wege.tempo, .5, 10, 3.2),
      },
    };
  }

  // Festgebäude auf der Festwiese: [stufe, fertigAb] – fertig ab dem nächsten Tag
  function festStufe(id) {
    const g = evLesen(id).g;
    return !g ? 0 : (g[1] <= heute() ? g[0] : g[0] - 1);
  }
  function eventKosten(n) { return Math.max(0, Math.round(zahl(n, 0, 1e5) * kostenfaktor())); }
  function festInfo(id) {
    const a = aktivesEvent();
    id = id || (a && a.id);
    const e = eventDef(id);
    if (!e || !e.festgebaeude) return null;
    const fg = e.festgebaeude, max = Math.min(9, Array.isArray(fg.stufen) ? fg.stufen.length : 0), g = evLesen(id).g || null;
    const stufe = festStufe(id), imBau = !!g && g[1] > heute(), ziel = g ? g[0] : 0;
    const info = { event: e, gebaeude: fg, max, stufe, zielStufe: ziel, imBau, fertigAb: g ? g[1] : '', aktiv: !!a && a.id === id,
                   naechste: !imBau && ziel < max ? ziel + 1 : null };
    if (info.naechste) {
      info.kosten = { [e.waehrung.id]: eventKosten((fg.kosten || [])[info.naechste - 1]) };
      info.genug = genug(info.kosten);
    }
    return info;
  }
  function festBauen() {
    D = laden();
    const a = aktivesEvent(), info = a && festInfo(a.id);
    if (!info || !info.aktiv) return { ok: false, grund: 'kein-event' };
    if (!info.naechste) return { ok: false, grund: 'nicht-ausbaubar' };
    if (!info.genug) return { ok: false, grund: 'zu-wenig' };
    const z = evZustand(a.id);
    bezahlen(info.kosten);
    z.g = [info.naechste, morgen()];
    meilensteinCheck();
    speichern();
    return { ok: true };
  }

  // Deko: im Event mit Event-Währung freischalten, danach für immer in der Festkiste
  function dekoDef(key) {
    if (typeof key !== 'string' || !DEKO_KEY.test(key)) return null;
    const [eid, did] = key.split('/');
    if (eid === 'dorf') {
      const d = dorfDekoListe().find(x => x.id === did);
      return d ? Object.assign({}, d, { key, eventId: 'dorf', eventName: 'Dorf', eventIcon: '🏘️', dorf: true }) : null;
    }
    const e = eventDef(eid);
    const d = e && (e.deko || []).find(x => x && x.id === did);
    return d ? Object.assign({}, d, { key, eventId: eid, eventName: e.name, eventIcon: e.icon }) : null;
  }
  function dekoShop() {
    const a = aktivesEvent();
    if (!a || !a.def) return [];
    const hat = evLesen(a.id).d || [];
    return (a.def.deko || []).filter(d => d && istId(d.id)).map(d => {
      const k = { [a.def.waehrung.id]: eventKosten(d.kosten) };
      return { key: a.id + '/' + d.id, deko: d, hat: hat.includes(d.id), kosten: k, genug: genug(k) };
    });
  }
  function dekoKaufen(key) {
    D = laden();
    const w = dekoShop().find(x => x.key === key);
    if (!w) return { ok: false, grund: 'kein-event' };
    if (w.hat) return { ok: false, grund: 'schon-da' };
    if (!w.genug) return { ok: false, grund: 'zu-wenig' };
    const z = evZustand(key.split('/')[0]);
    bezahlen(w.kosten);
    z.d = [...z.d, w.deko.id];
    speichern();
    return { ok: true };
  }
  function dekoPlaetze() {
    const dp = D.dp || {};
    return flaechen().dekoplaetze.map(p => Object.assign({}, p, { belegt: dp[p.id] && dekoDef(dp[p.id]) ? dp[p.id] : null }));
  }
  /** Alle freigeschalteten Deko-Stücke (aus allen Events) mit ihrem Platz (null = in der Festkiste) */
  function festkiste() {
    const dp = D.dp || {}, wo = {};
    Object.entries(dp).forEach(([p, k]) => { wo[k] = p; });
    const out = [];
    dorfDekoListe().filter(d => bedingungOk(d.ab)).forEach(x => {
      const d = dekoDef('dorf/' + x.id);
      if (d) out.push({ key: d.key, deko: d, platz: wo[d.key] || null });
    });
    eventListe().forEach(e => (evLesen(e.id).d || []).forEach(id => {
      const d = dekoDef(e.id + '/' + id);
      if (d) out.push({ key: d.key, deko: d, platz: wo[d.key] || null });
    }));
    return out;
  }
  function dekoSetzen(platzId, key) {
    D = laden();
    const platz = flaechen().dekoplaetze.find(p => p.id === platzId);
    if (!platz || !festkiste().some(x => x.key === key)) return { ok: false };
    if (!D.dp) D.dp = {};
    Object.keys(D.dp).forEach(p => { if (D.dp[p] === key) delete D.dp[p]; });   // versetzen: alter Platz wird frei
    D.dp[platzId] = key;
    speichern();
    return { ok: true };
  }
  function dekoWeg(platzId) {
    D = laden();
    if (!D.dp || !D.dp[platzId]) return { ok: false };
    delete D.dp[platzId];
    speichern();
    return { ok: true };
  }

  // Startgeschenk beim ersten Dorfbesuch im Event (einmal pro Schuljahr)
  function eventBesuch() {
    if (!gestartet() || !C) return null;
    D = laden();
    const a = aktivesEvent();
    if (!a || !a.def) return a ? { event: a } : null;
    const z = evZustand(a.id);
    let start = 0;
    if (!z.sg) { z.sg = 1; start = eventWerte().start; gutschrift(a.def.waehrung.id, start); }
    speichern();
    return { event: a, start };
  }

  // Gast-Auftrag: einer auf einmal, der nächste am Tag danach
  function gastApps() {
    const a = aktivesEvent(), z = a && D.ev && D.ev[a.id];
    return z && z.q ? [z.q.a] : [];
  }
  function gastOffen(g) {
    return (g.geschichten || []).map((x, i) => i).filter(i => { const st = g.geschichten[i].stueck; return st && istId(st.id) && !D.sa.includes(st.id); });
  }
  function eventCheck(W) {
    const a = aktivesEvent();
    if (!a || !a.def) return false;
    const vorher = JSON.stringify((D.ev || {})[a.id] || null);
    const z = evZustand(a.id), g = a.def.gast, kl = klasse();
    if (g && Array.isArray(g.geschichten) && g.geschichten.length && kl && configApps()) {
      const erlaubt = dorfApps(kl);
      if (z.q) {
        if (!erlaubt.some(x => x.key === z.q.a) && erlaubt.length) { z.q.a = zufall(erlaubt).key; z.q.c = 0; }
      } else if (z.qd !== heute() && erlaubt.length) {
        const offen = gastOffen(g);
        const nr = offen.length ? offen[0] : Math.floor(Math.random() * g.geschichten.length);
        const belegt = D.q.map(q => q.a).concat(D.bq ? [D.bq.a] : []);
        const apps = erlaubt.filter(x => !belegt.includes(x.key));
        D.n++;
        const app = zufall(apps.length ? apps : erlaubt);
        z.q = { i: D.n, g: nr, a: app.key, n: app.runden || eventWerte().gast.runden, c: 0, m: W.schwelle, d: heute() };
      }
    }
    return JSON.stringify(z) !== vorher;
  }
  function gastAuftragInfo() {
    const a = aktivesEvent();
    if (!a || !a.def || !a.def.gast) return null;
    const z = evLesen(a.id);
    if (!z.q) return null;
    const g = a.def.gast, gesch = (g.geschichten || [])[z.q.g] || {};
    const st = gesch.stueck && !D.sa.includes(gesch.stueck.id) ? gesch.stueck : null;
    const E = eventWerte().gast;
    return { auftrag: z.q, gast: g, event: a.def, text: gesch.text || '', stueck: st, lohn: st ? E.lohn : E.lohnWieder, waehrung: a.def.waehrung };
  }
  /** Sammelstücke eines Events: Geschichten des Gasts, Kalender-Stück, Fest-Meilenstein */
  function festStuecke(e) {
    const l = [];
    ((e.gast && e.gast.geschichten) || []).forEach(x => { if (x && x.stueck && istId(x.stueck.id)) l.push(Object.assign({}, x.stueck, { von: e.gast.name })); });
    const m = e.mechanik || {};
    if (m.art === 'kalender' && m.stueck && istId(m.stueck.id)) l.push(Object.assign({}, m.stueck, { von: m.name || 'Kalender' }));
    if (e.meilenstein && istId(e.meilenstein.id)) l.push(Object.assign({}, e.meilenstein, { meilenstein: true }));
    return l;
  }

  // Suche: nach dem ersten erfüllten Auftrag des Tages versteckt sich etwas im Dorf
  function versteckWaehlen() {
    const F = flaechen(), belegt = dekoPlaetze().filter(p => p.belegt);
    const frei = F.verstecke.map((v, i) => i).filter(i => belegt.every(p => Math.hypot(p.x - F.verstecke[i].x, p.z - F.verstecke[i].z) > 6));
    return frei.length ? zufall(frei) : (F.verstecke.length ? Math.floor(Math.random() * F.verstecke.length) : -1);
  }
  function sucheInfo() {
    const a = aktivesEvent(), m = a && a.def && a.def.mechanik;
    if (!m || m.art !== 'suche') return null;
    const z = evLesen(a.id), v = z.sv >= 0 ? flaechen().verstecke[z.sv] : null;
    return { mechanik: m, versteck: v || null, nr: z.sv, gefunden: z.sf || 0, lohn: eventWerte().mechanik, waehrung: a.def.waehrung };
  }
  function gefunden() {
    D = laden();
    const a = aktivesEvent(), m = a && a.def && a.def.mechanik;
    if (!m || m.art !== 'suche') return { ok: false };
    const z = evZustand(a.id);
    if (z.sv < 0) return { ok: false };
    const n = eventWerte().mechanik;
    z.sv = -1; z.sf = (z.sf || 0) + 1;
    gutschrift(a.def.waehrung.id, n);
    speichern();
    return { ok: true, lohn: n, waehrung: a.def.waehrung };
  }

  // Kalender: jeder Tag mit einer guten Runde schaltet eine Tür frei (nicht an Daten gebunden)
  function kalenderInfo() {
    const a = aktivesEvent(), m = a && a.def && a.def.mechanik;
    if (!m || m.art !== 'kalender') return null;
    const z = D.ev && D.ev[a.id] && D.ev[a.id].j === saison() ? D.ev[a.id] : { kz: 0, kg: 0, kt: '' };
    const tueren = zahl(m.tueren || 24, 1, 60);
    return { mechanik: m, tueren, frei: Math.min(tueren, z.kz), offen: z.kg, heuteSchon: z.kt === heute(), lohn: eventWerte().mechanik,
             waehrung: a.def.waehrung, stueck: m.stueck || null, stueckHat: !!(m.stueck && D.sa.includes(m.stueck.id)) };
  }
  function tuerOeffnen() {
    D = laden();
    const k = kalenderInfo();
    if (!k || k.offen >= k.frei) return { ok: false };
    const a = aktivesEvent(), z = evZustand(a.id);
    z.kg++;
    const n = eventWerte().mechanik;
    gutschrift(k.waehrung.id, n);
    let stueck = null;
    if (z.kg >= k.tueren && k.stueck && istId(k.stueck.id) && !D.sa.includes(k.stueck.id)) {
      stueck = k.stueck; D.sa.push(stueck.id); D.nz = [...D.nz, 's:' + stueck.id].slice(-20);
    }
    speichern();
    return { ok: true, nr: z.kg, lohn: n, waehrung: k.waehrung, stueck };
  }

  /** Eine Runde für das laufende Dorf-Event auswerten. Liefert { gast, zeilen[] } für die Meldung. */
  function eventRunde(runde, o) {
    const out = { gast: null, zeilen: [] };
    const a = aktivesEvent();
    if (!a || !a.def) return out;
    const e = a.def, w = e.waehrung, E = eventWerte(), W = werte();
    const z = evZustand(a.id);
    // Gast-Auftrag
    if (z.q && z.q.a === runde.app && zaehlt(runde, z.q.m)) {
      const info = gastAuftragInfo();
      z.q.c = Math.min(z.q.n, z.q.c + 1);
      if (z.q.c >= z.q.n) {
        gutschrift(w.id, info.lohn);
        if (info.stueck) { D.sa.push(info.stueck.id); D.nz = [...D.nz, 's:' + info.stueck.id].slice(-20); }
        z.q = null; z.qd = heute();
        out.gast = { art: 'gast-erfuellt', info };
        o.erfuellt = true;
      } else out.gast = { art: 'gast-fortschritt', info: gastAuftragInfo() };
    }
    // Währung für jeden erfüllten Tagesauftrag
    if (o.tagesauftrag && E.proAuftrag) { gutschrift(w.id, E.proAuftrag); out.zeilen.push(`${w.icon} +${E.proAuftrag} ${w.name} fürs Fest`); }
    const m = e.mechanik || {};
    // Kalender: erste gute Runde des Tages schaltet eine Tür frei
    if (m.art === 'kalender' && zaehlt(runde, W.schwelle) && z.kt !== heute()) {
      const tueren = zahl(m.tueren || 24, 1, 60);
      z.kt = heute();
      if (z.kz < tueren) { z.kz++; out.zeilen.push(`${m.icon || '🗓️'} Eine neue Tür im ${m.name || 'Kalender'} wartet im Dorf!`); }
    }
    // Suche: nach dem ersten erfüllten Auftrag des Tages versteckt sich etwas
    if (m.art === 'suche' && (o.erfuellt || out.gast && out.gast.art === 'gast-erfuellt') && z.sv < 0 && z.sd !== heute()) {
      const nr = versteckWaehlen();
      if (nr >= 0) { z.sv = nr; z.sd = heute(); out.zeilen.push(`${m.icon || '🔍'} Im Dorf hat sich ${m.ding || 'etwas'} versteckt!`); }
    }
    return out;
  }

  // ── Landschaft und Dorf-Deko (wachsen ohne Kosten mit) ──
  //  Bedingung „ab“: { rathaus, ansehen, bewohner, meilensteine, gebaeude + stufe } – alles muss stimmen.
  function landschaftListe() { return C && Array.isArray(C.LANDSCHAFT) ? C.LANDSCHAFT.filter(l => l && istId(l.id) && l.art) : []; }
  function dorfDekoListe() { return C && Array.isArray(C.DEKO) ? C.DEKO.filter(d => d && istId(d.id) && Array.isArray(d.modell)) : []; }
  function meilensteinZahl() { return D.sa.filter(id => meilensteine().some(m => m.id === id)).length; }
  function gebaeudeStufe(id) { return Object.values(D.b).reduce((m, e) => e[0] === id ? Math.max(m, stehendeStufe(e)) : m, 0); }
  function bedingungOk(ab) {
    if (!ab || typeof ab !== 'object') return true;
    if (ab.rathaus !== undefined && rathausStufe() < Number(ab.rathaus)) return false;
    if (ab.ansehen !== undefined && D.an < Number(ab.ansehen)) return false;
    if (ab.bewohner !== undefined && D.bw.length < Number(ab.bewohner)) return false;
    if (ab.meilensteine !== undefined && meilensteinZahl() < Number(ab.meilensteine)) return false;
    if (ab.gebaeude !== undefined && gebaeudeStufe(ab.gebaeude) < Math.max(1, Number(ab.stufe) || 1)) return false;
    if (ab.trophaeen !== undefined && trophaeen() < Number(ab.trophaeen)) return false;
    return true;
  }
  function bedingungText(ab) {
    if (!ab || typeof ab !== 'object') return '';
    const t = [];
    if (ab.rathaus) t.push(Number(ab.rathaus) === 1 ? 'Rathaus bauen' : 'Rathaus auf Stufe ' + ab.rathaus);
    if (ab.gebaeude) { const g = gebaeude(ab.gebaeude); t.push((g ? g.name : ab.gebaeude) + (Number(ab.stufe) > 1 ? ' auf Stufe ' + ab.stufe : ' bauen')); }
    if (ab.ansehen) t.push(ab.ansehen + ' Ansehen');
    if (ab.bewohner) t.push(ab.bewohner + ' Bewohner');
    if (ab.meilensteine) t.push(ab.meilensteine + ' Meilensteine');
    if (ab.trophaeen) t.push(ab.trophaeen + (Number(ab.trophaeen) === 1 ? ' Trophäe' : ' Trophäen'));
    return t.join(' · ');
  }
  function landschaftAktiv() { return landschaftListe().filter(l => bedingungOk(l.ab)); }
  /** Neu gewachsene Landschaft und neue Dorf-Deko als Neuigkeit melden. Beim allerersten Mal still. */
  function landschaftCheck() {
    if (!C || !landschaftListe().length) return false;
    const land = landschaftAktiv().map(l => l.id), deko = dorfDekoListe().filter(d => bedingungOk(d.ab)).map(d => d.id);
    if (!Array.isArray(D.ls) || !Array.isArray(D.lk)) { D.ls = land; D.lk = deko; return true; }
    let neu = false;
    land.filter(id => !D.ls.includes(id)).forEach(id => { D.ls.push(id); D.nz = [...D.nz, 'l:' + id].slice(-20); neu = true; });
    deko.filter(id => !D.lk.includes(id)).forEach(id => { D.lk.push(id); D.nz = [...D.nz, 'k:' + id].slice(-20); neu = true; });
    return neu;
  }

  // ── Challenges (zwei Wochen, mit Trophäen) ──────────────
  //  Welche läuft: zuerst eine, die die Lehrkraft für diesen Zeitraum (und diese Klasse) geplant hat
  //  (config.json → dorf.challenges: [{ id, start 'JJJJ-MM-TT', klassen? }]), sonst die nächste im
  //  Wechsel (ab CHALLENGE_WERTE.start alle „tage“ Tage). dorf.challengeRotation: false schaltet den Wechsel ab.
  const TROPHAEE = ['🥉', '🥈', '🥇'];
  function challengeListe() { return C && Array.isArray(C.CHALLENGES) ? C.CHALLENGES.filter(c => c && istId(c.id) && c.art && Number(c.ziel) > 0) : []; }
  function challengeWerte() {
    const W = (C && C.CHALLENGE_WERTE) || {};
    return { tage: Math.round(wert(W.tage, 3, 60, 14)), start: /^\d{4}-\d{2}-\d{2}$/.test(W.start || '') ? W.start.replace(/-/g, '') : '20260914',
             ansehen: Math.round(wert(W.ansehen, 0, 1000, 15)), gold: Math.round(wert(W.gold, 0, 50, 1)) };
  }
  function tagPlus(tag, n) { const d = new Date(+tag.slice(0, 4), +tag.slice(4, 6) - 1, +tag.slice(6, 8)); d.setDate(d.getDate() + n); return heute(d); }
  function aktuelleChallenge() {
    const liste = challengeListe();
    if (!liste.length) return null;
    const W = challengeWerte(), t = heute(), L = lehrkraft(), kl = klasse();
    const geplant = (Array.isArray(L.challenges) ? L.challenges : []).map(x => x && typeof x === 'object' ? {
        def: liste.find(c => c.id === x.id), start: String(x.start || '').replace(/-/g, ''),
        klassen: Array.isArray(x.klassen) ? x.klassen : null } : null)
      .filter(x => x && x.def && TAG.test(x.start) && x.start <= t && t < tagPlus(x.start, W.tage) && (!x.klassen || !x.klassen.length || x.klassen.includes(kl)))
      .sort((a, b) => (a.start < b.start ? 1 : -1))[0];
    if (geplant) return { def: geplant.def, start: geplant.start, ende: tagPlus(geplant.start, W.tage - 1), i: geplant.def.id + '@' + geplant.start, vonLk: true };
    if (L.challengeRotation === false || t < W.start) return null;
    const nr = Math.floor(tageZwischen(W.start, t) / W.tage), start = tagPlus(W.start, nr * W.tage);
    const def = liste[nr % liste.length];
    return { def, start, ende: tagPlus(start, W.tage - 1), i: def.id + '@' + start, vonLk: false };
  }
  function challengeCheck() {
    const a = aktuelleChallenge();
    if (!a) { if (D.ch) { D.ch = null; return true; } return false; }
    if (D.ch && D.ch.i === a.i) return false;
    D.ch = { i: a.i, c: 0, d: '', l: [], f: 0 };
    return true;
  }
  function trophaeen() { return Object.values(D.tr || {}).reduce((s, n) => s + n, 0); }
  function challengeInfo() {
    const a = aktuelleChallenge();
    if (!a) return null;
    const z = D.ch && D.ch.i === a.i ? D.ch : { c: 0, f: 0 };
    const W = challengeWerte(), mal = (D.tr || {})[a.def.id] || 0;
    return { def: a.def, start: a.start, ende: a.ende, vonLk: a.vonLk, c: Math.min(z.c, a.def.ziel), ziel: Number(a.def.ziel), f: !!z.f,
             restTage: Math.max(0, tageZwischen(heute(), a.ende)), lohn: { ansehen: W.ansehen, gold: W.gold },
             trophaee: TROPHAEE[Math.min(2, z.f ? mal - 1 : mal)], mal };
  }
  /** Runde für die Challenge zählen. Liefert Zeilen für die Meldung. */
  function challengeRunde(runde, o) {
    const a = aktuelleChallenge();
    if (!a) return [];
    if (!D.ch || D.ch.i !== a.i) challengeCheck();
    const z = D.ch, c = a.def, W = werte();
    if (!z || z.f) return [];
    const gut = zaehlt(runde, W.schwelle), vorher = z.c;
    if (c.art === 'auftraege' && o.tagesauftrag) z.c++;
    else if (c.art === 'tage' && gut && z.d !== heute()) { z.c++; z.d = heute(); }
    else if (c.art === 'fach' && gut && (Array.isArray(c.faecher) ? c.faecher : [c.faecher]).includes(appInfo(runde.app).fach)) z.c++;
    else if (c.art === 'apps' && gut && !z.l.includes(runde.app)) { z.l = [...z.l, runde.app].slice(-20); z.c = z.l.length; }
    else if (c.art === 'stark' && !runde.blocked && Number(runde.prozent) >= (Number(c.prozent) || 90)) z.c++;
    if (z.c === vorher) return [];
    if (z.c < c.ziel) return [`${c.icon} Challenge „${c.name}“: ${z.c} von ${c.ziel}`];
    const aus = [];
    z.f = 1;
    const Wc = challengeWerte();
    if (!D.tr) D.tr = {};
    D.tr[c.id] = (D.tr[c.id] || 0) + 1;
    D.an += Wc.ansehen; gutschrift('g', Wc.gold);
    D.nz = [...D.nz, 't:' + c.id].slice(-20);
    aus.push(`${TROPHAEE[Math.min(3, D.tr[c.id]) - 1]} Challenge „${c.name}“ geschafft! +${Wc.ansehen} ⭐${Wc.gold ? ' +' + Wc.gold + ' 🪙' : ''} und eine Trophäe`);
    aus.geschafft = true;
    return aus;
  }

  // ── Marktplatz: Holz gegen Stein tauschen (mit Verlust) ──
  function marktInfo() {
    const e = Object.entries(D.b).find(([, v]) => v[0] === 'marktplatz' && stehendeStufe(v) > 0);
    if (!e) return null;
    const M = (C && C.MARKT) || {}, st = stehendeStufe(e[1]);
    const kurs = Array.isArray(M.tausch) ? wert(M.tausch[Math.min(st, M.tausch.length) - 1], .1, 1, .6) : .6;
    const mengen = (Array.isArray(M.mengen) ? M.mengen : [10, 50]).map(n => zahl(n, 1, 1000)).filter(n => n > 0);
    return { stufe: st, kurs, mengen };
  }
  function marktTausch(von, nach, menge) {
    D = laden();
    const m = marktInfo();
    if (!m || !['h', 's'].includes(von) || !['h', 's'].includes(nach) || von === nach || !m.mengen.includes(menge)) return { ok: false };
    if ((D.r[von] || 0) < menge) return { ok: false, grund: 'zu-wenig' };
    const bekommt = Math.floor(menge * m.kurs);
    D.r[von] -= menge; gutschrift(nach, bekommt);
    speichern();
    return { ok: true, gibt: menge, bekommt };
  }

  // ── Runden aus pass.js empfangen ────────────────────────
  const rundenHandler = [];
  function rundeEmpfangen(runde) {
    if (!runde || typeof runde !== 'object' || !runde.app) return;
    if (gestartet()) auftragZaehlen(runde);
    rundenHandler.forEach(fn => { try { fn(runde, D); } catch (e) {} });
  }

  function auftragZaehlen(runde) {
    if (!C) { inhalte().then(() => { if (C) auftragZaehlen(runde); }); return; }   // Inhalte erst laden (Events, Gast)
    D = laden();                                       // anderer Tab (z. B. offenes Dorf) könnte geändert haben
    if (D.fd !== heute()) tagesCheck();
    if (runde.blocked) return;
    // Eine App kann gleichzeitig auf dem Brett und auf dem Lehrer-Zettel stehen: beide zählen
    const passende = D.q.filter(x => x.a === runde.app);
    let q = passende[0] || null, meldung = null, wochenMeldung = null, erfuellt = false, fleissNeu = false;
    const rang = { zuwenig: 1, fortschritt: 2, erfuellt: 3 };
    passende.forEach(x => {
      let m;
      if (!zaehlt(runde, x.m)) m = 'zuwenig';
      else {
        x.c = Math.min(x.n, x.c + 1);
        if (x.c >= x.n) {
          x.b = lohn(x).gesamt;                        // Bonus von Sägewerk & Co. zum Zeitpunkt der Erfüllung
          D.r[x.r] = (D.r[x.r] || 0) + x.b;
          D.q = D.q.filter(y => y !== x);
          D.e++;
          m = 'erfuellt'; erfuellt = true;
          if (D.w && !D.w.f && D.w.a === 'auftraege') wochenMeldung = wocheZaehlen();
        } else m = 'fortschritt';
      }
      if (!meldung || rang[m] > rang[meldung]) { meldung = m; q = x; }
    });
    if (meldung === 'erfuellt') fleissNeu = fleissCheck(werte());
    if (passtZurWoche(runde)) wochenMeldung = wocheZaehlen();
    if (wochenMeldung === 'woche-erfuellt') erfuellt = true;
    let bewohnerMeldung = null;
    if (D.bq && D.bq.a === runde.app && zaehlt(runde, D.bq.m)) {
      const info = bewohnerAuftragInfo();
      D.bq.c = Math.min(D.bq.n, D.bq.c + 1);
      if (D.bq.c >= D.bq.n) {
        D.an += werte().bewohner.ansehen;
        if (info && info.stueck) { D.sa.push(info.stueck.id); D.nz = [...D.nz, 's:' + info.stueck.id].slice(-20); }
        bewohnerMeldung = { art: 'bewohner-erfuellt', info };
        D.bq = null; D.bd = heute(); erfuellt = true;
      } else bewohnerMeldung = { art: 'bewohner-fortschritt', info };
    }
    // Dorf-Event: Gast-Auftrag, Währung für erfüllte Tagesaufträge, Kalendertür, Versteck
    const ev = eventRunde(runde, { tagesauftrag: meldung === 'erfuellt', erfuellt });
    if (ev.gast) erfuellt = true;
    const chZeilen = challengeRunde(runde, { tagesauftrag: meldung === 'erfuellt' });
    ev.zeilen.push(...chZeilen);
    if (!meldung && !wochenMeldung && !bewohnerMeldung && !ev.gast && !ev.zeilen.length) return;
    meilensteinCheck();
    speichern();
    if (fleissNeu) ev.zeilen.push('💪 Alle Tageszettel geschafft! Am Brett hängt ein Fleißzettel.');
    if (erfuellt) { const zz = zielZeile(); if (zz) ev.zeilen.push(zz); }
    const extra = ev.zeilen.map(z => `<small class="ev">${z}</small>`).join('');
    const gross = meldung === 'erfuellt' || wochenMeldung === 'woche-erfuellt' || (bewohnerMeldung && bewohnerMeldung.art === 'bewohner-erfuellt') || (ev.gast && ev.gast.art === 'gast-erfuellt');
    if (chZeilen.geschafft && !gross) { toast('challenge-erfuellt', null, null, extra); return; }
    if (ev.gast && (ev.gast.art === 'gast-erfuellt' || (!meldung && !wochenMeldung && !bewohnerMeldung))) { toast(ev.gast.art, ev.gast.info, null, extra); return; }
    if (bewohnerMeldung && (bewohnerMeldung.art === 'bewohner-erfuellt' || (!meldung && !wochenMeldung))) {
      toast(bewohnerMeldung.art, bewohnerMeldung.info, null, extra); return;
    }
    // Wochenauftrag erfüllt ist die größere Nachricht; sonst zuerst der Tagesauftrag
    if (wochenMeldung === 'woche-erfuellt') toast('woche-erfuellt', D.w, null, extra);
    else if (meldung) toast(meldung, q, wochenMeldung ? D.w : null, extra);
    else if (wochenMeldung) toast(wochenMeldung, D.w, null, extra);
    else toast('event', null, null, extra);
  }
  window.addEventListener('lernpass:gewertet', e => rundeEmpfangen(e.detail));

  // ── Meldung in der Lern-App ─────────────────────────────
  //  Unten in der Mitte, damit sie nicht mit der XP-Meldung (oben) kollidiert.
  function baueToast() {
    let el = document.getElementById('lw-dorf-toast');
    if (!el) {
      const st = document.createElement('style');
      st.textContent = `
        #lw-dorf-toast{position:fixed;left:50%;bottom:4.6rem;transform:translate(-50%,160%);z-index:10000;
          background:#1b1929;color:#f1f0fb;border:1px solid rgba(74,222,128,.45);border-radius:16px;
          box-shadow:0 12px 40px rgba(0,0,0,.45);padding:.6rem 1rem;max-width:min(92vw,360px);text-align:center;
          font-family:'Nunito','Segoe UI',sans-serif;font-size:.9rem;line-height:1.35;opacity:0;
          transition:transform .35s cubic-bezier(.2,.9,.3,1.2),opacity .25s;pointer-events:none;}
        #lw-dorf-toast.show{transform:translate(-50%,0);opacity:1;}
        #lw-dorf-toast b{font-family:'Fredoka One','Nunito',sans-serif;font-weight:400;font-size:1.15rem;color:#4ade80;display:block;}
        #lw-dorf-toast.klein{border-color:rgba(255,255,255,.15);}
        #lw-dorf-toast small.ev{display:block;margin-top:.2rem;font-weight:700;color:#fde68a;}
        #lw-dorf-toast.klein small.ev:first-child{margin-top:0;}
        @media (max-width:640px){#lw-dorf-toast.hoch{bottom:8.2rem;}}
        #lw-dorf-zurueck{position:fixed;left:1.2rem;bottom:calc(1.2rem + 3.3rem + env(safe-area-inset-bottom,0px));z-index:9999;
          display:flex;align-items:center;gap:.45rem;background:#166534;color:#fff;text-decoration:none;
          font-family:'Nunito','Segoe UI',sans-serif;font-weight:800;font-size:.88rem;padding:.55rem 1.1rem .55rem .9rem;
          border-radius:99px;border:2px solid rgba(74,222,128,.6);box-shadow:0 4px 20px rgba(22,101,52,.45);
          transform:translateX(-140%);transition:transform .35s cubic-bezier(.2,.9,.3,1.2);}
        #lw-dorf-zurueck.show{transform:none;}
        @media (prefers-reduced-motion: reduce){#lw-dorf-zurueck{transition:none;}}
        @media (prefers-reduced-motion: reduce){#lw-dorf-toast{transition:none;}}`;
      document.head.appendChild(st);
      el = document.createElement('div');
      el.id = 'lw-dorf-toast';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    return el;
  }

  function toast(art, q, woche, extra = '') {
    if (!document.body) return;
    let el = baueToast();
    const zeigen = ms => { clearTimeout(el._t); requestAnimationFrame(() => el.classList.add('show')); el._t = setTimeout(() => el.classList.remove('show'), ms); };
    if (art === 'challenge-erfuellt') {
      el.className = 'hoch';
      zurueckKnopf();
      el.innerHTML = `<b>🏆 Challenge geschafft!</b>` + extra;
      zeigen(6000);
      return;
    }
    if (art === 'event') {                                           // nur Event-Neuigkeiten (z. B. neue Kalendertür)
      el.className = 'klein';
      el.innerHTML = extra;
      zeigen(4000);
      return;
    }
    if (art === 'gast-erfuellt' || art === 'gast-fortschritt') {
      const i = q || {}, g = i.gast || {}, a = i.auftrag || {}, w = i.waehrung || {};
      if (art === 'gast-erfuellt') {
        el.className = 'hoch';
        zurueckKnopf();
        el.innerHTML = `<b>${g.icon || '🙂'} ${g.name || ''} freut sich!</b>+${i.lohn} ${w.icon || ''}${i.stueck ? ` · ${i.stueck.icon} ${i.stueck.name} fürs Sammelbuch` : ''}` + extra;
      } else {
        el.className = 'klein';
        el.innerHTML = `${g.icon || '🙂'} Auftrag von ${g.name || ''}: ${a.c} von ${a.n} Runden` + extra;
      }
      zeigen(art === 'gast-erfuellt' ? 5500 : 3500);
      return;
    }
    if (art === 'bewohner-erfuellt' || art === 'bewohner-fortschritt') {
      const i = q || {}, b = i.bewohner || {}, a = i.auftrag || {};
      if (art === 'bewohner-erfuellt') {
        el.className = 'hoch';
        zurueckKnopf();
        el.innerHTML = `<b>${b.icon || '🙂'} ${b.name || ''} sagt Danke!</b>+${i.ansehen} ⭐ Ansehen${i.stueck ? ` · ${i.stueck.icon} ${i.stueck.name} fürs Sammelbuch` : ''}` + extra;
      } else {
        el.className = 'klein';
        el.innerHTML = `${b.icon || '🙂'} Auftrag von ${b.name || ''}: ${a.c} von ${a.n} Runden` + extra;
      }
      clearTimeout(el._t);
      requestAnimationFrame(() => el.classList.add('show'));
      el._t = setTimeout(() => el.classList.remove('show'), art === 'bewohner-erfuellt' ? 5500 : 3500);
      return;
    }
    const r = rohstoff(q.r || 'h');
    const wZeile = woche ? `<br><small>📅 Wochenauftrag: ${woche.c} von ${woche.n}</small>` : '';
    if (art === 'woche-erfuellt') {
      el.className = 'hoch';
      zurueckKnopf();
      const l = wocheLohn();
      el.innerHTML = `<b>📅 Wochenauftrag geschafft!</b>` + Object.entries(l).filter(([, n]) => n).map(([id, n]) => `+${n} ${rohstoff(id).icon}`).join(' ') + ' für dein Dorf' + extra;
    } else if (art === 'woche-fortschritt') {
      el.className = 'klein';
      el.innerHTML = `📅 Wochenauftrag: ${q.c} von ${q.n} geschafft` + extra;
    } else if (art === 'erfuellt') {
      el.className = 'hoch';
      zurueckKnopf();
      el.innerHTML = `<b>🏘️ Auftrag erfüllt!</b>+${q.b} ${r.icon} ${r.name} für dein Dorf` + wZeile + extra;
    } else if (art === 'fortschritt') {
      el.className = 'klein';
      el.innerHTML = `🏘️ Dorf-Auftrag: ${q.c} von ${q.n} Runden geschafft` + extra;
    } else {
      el.className = 'klein';
      el.innerHTML = `🏘️ Für deinen Dorf-Auftrag brauchst du mindestens ${q.m} %` + extra;
    }
    clearTimeout(el._t);
    requestAnimationFrame(() => el.classList.add('show'));
    el._t = setTimeout(() => el.classList.remove('show'), /erfuellt/.test(art) ? 5000 : 3500);
  }

  // Nach einem erfüllten Auftrag: 10 s lang ein Knopf zurück ins Dorf (über „Alle Apps“)
  function zurueckKnopf() {
    if (/\/spiele\/dorf\.html$/.test(location.pathname)) return;
    let a = document.getElementById('lw-dorf-zurueck');
    if (!a) {
      a = document.createElement('a');
      a.id = 'lw-dorf-zurueck';
      a.href = new URL('spiele/dorf.html', ROOT).href;
      a.innerHTML = '<span aria-hidden="true">🏘️</span> Zum Dorf';
      document.body.appendChild(a);
    }
    clearTimeout(a._t);
    requestAnimationFrame(() => a.classList.add('show'));
    a._t = setTimeout(() => a.classList.remove('show'), 10000);
  }

  // Tageswechsel, während eine Seite offen bleibt (iPad im Standby)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && C && gestartet() && tagesCheck()) melden();
  });

  // ── Öffentliche API ─────────────────────────────────────
  window.LernDorf = {
    VERSION, KEY, ROOT,
    get state() { return D; },
    gestartet, starten, bereit, speichern, neuLaden, inhalte, werte, rohstoffe, rohstoff,
    dorfApps, appKey, appInfo, klasse, zaehlt, heute, tagesCheck, kannTauschen, tauschen,
    gebaeudeListe, gebaeude, plaetze, platzInfo, baubar, bauen, ausbauen, kosten, rathausStufe, lohn, bonus,
    wocheLohn, montag, lehrkraft,
    bewohnerListe, bewohnerDef, bewohnerAuftragInfo, sammelbuch, neuigkeiten, dorfname, steht, ansehenNoetig,
    eventListe, eventDef, aktivesEvent, eventWerte, waehrungen, saison, flaechen, eventBesuch,
    festInfo, festBauen, dekoDef, dekoShop, dekoKaufen, dekoPlaetze, festkiste, dekoSetzen, dekoWeg,
    gastAuftragInfo, sucheInfo, gefunden, kalenderInfo, tuerOeffnen,
    landschaftListe, landschaftAktiv, dorfDekoListe, bedingungOk, bedingungText, gebaeudeStufe,
    challengeListe, challengeWerte, aktuelleChallenge, challengeInfo, trophaeen, marktInfo, marktTausch,
    zielSetzen, zielWeg, zielInfo, bauMoeglich, jahreszeit, offeneAuftraege, lehrerInfo, rundenFuer, fehlenderRohstoff,
    onChange(fn) { listeners.push(fn); },
    onRunde(fn)  { rundenHandler.push(fn); },
    _saeubern: saeubern, _leer: leer, _tageZwischen: tageZwischen,
  };

  // Schon begonnen? Dann Inhalte laden und den Tag prüfen.
  if (gestartet()) bereit();

  // Runden, die gemeldet wurden, bevor dieses Skript geladen war
  const q = window.__lernDorfQueue;
  if (Array.isArray(q)) setTimeout(() => q.splice(0).forEach(rundeEmpfangen), 0);

  try { window.dispatchEvent(new CustomEvent('lerndorf:ready')); } catch (e) {}
})();
