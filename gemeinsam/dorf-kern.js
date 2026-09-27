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
//  Stand Etappe 2: Auftragsbrett (Aufträge erzeugen, zählen, belohnen,
//  tauschen, täglich nachfüllen) und Bauen (Gebäude, Stufen, Bauzeit,
//  Bauplätze über das Rathaus, Boni). Die 3D-Szene: gemeinsam/dorf-szene.js.
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
  //  Weitere Felder späterer Etappen (Sammelbuch, Bewohner …) bleiben beim
  //  Säubern erhalten, damit ältere Geräte nichts wegwerfen.
  function leer() {
    return { v: VERSION, s: heute(), r: { h: 0, s: 0, g: 0 }, q: [], rr: 0, rd: '', fd: '', b: {}, an: 0, e: 0, n: 0, l: [] };
  }

  function auftragSaeubern(a) {
    if (!a || typeof a !== 'object' || Array.isArray(a) || !istKey(a.a) || !/^[a-z]{1,4}$/.test(a.r)) return null;
    const n = zahl(a.n, 1, 10);
    const q = { i: zahl(a.i, 0, 1e9), p: zahl(a.p, 1, 9), a: a.a, n, c: zahl(a.c, 0, n), m: zahl(a.m, 0, 100),
                r: a.r, b: zahl(a.b, 0, 10000), d: TAG.test(a.d) ? a.d : heute() };
    if (a.x) q.x = 1;
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
    Object.keys(raw).forEach(k => {
      if (!(k in d) && /^[a-z]{1,3}$/.test(k) && klein(raw[k], 4000)) d[k] = raw[k];
    });
    return d;
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

  function schreiben() {
    try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) {}
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

  // Stellschrauben aus dorf-inhalte.json (mit sicheren Standardwerten)
  function werte() {
    const A = (C && C.AUFTRAEGE) || {};
    const t = A.tag || {}, rr = A.rerolls || {}, ln = A.langeNichtGespielt || {};
    const bel = Array.isArray(t.belohnung) ? t.belohnung : [15, 25];
    const lo = wert(bel[0], 0, 1000, 15), hi = Math.max(lo, wert(bel[1], 0, 1000, 25));
    const plaetze = (Array.isArray(A.plaetze) ? A.plaetze : [])
      .filter(p => p && Number.isInteger(p.id) && (p.faecher === 'alle' || Array.isArray(p.faecher)));
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
      rrProTag: Math.round(wert(rr.proTag, 0, 10, 1)),
      rrMax:    Math.round(wert(rr.max, 0, 20, 3)),
      lnTage:   Math.round(wert(ln.tage, 1, 365, 14)),
      lnBonus:  wert(ln.bonus, 0, 5, 0.5),
    };
  }
  function rohstoffe() {
    const std = [{ id: 'h', name: 'Holz', icon: '🪵' }, { id: 's', name: 'Stein', icon: '🪨' }, { id: 'g', name: 'Gold', icon: '🪙' }];
    const l = C && Array.isArray(C.ROHSTOFFE) ? C.ROHSTOFFE.filter(r => r && /^[a-z]{1,4}$/.test(r.id)) : [];
    return l.length ? l : std;
  }
  function rohstoff(id) { return rohstoffe().find(r => r.id === id) || { id, name: id, icon: '📦' }; }

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
      .map(a => ({ key: appKey(a.datei), name: a.name, fach: a.fach, emoji: a.emoji || '📱', datei: a.datei }));
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

  function neuerAuftrag(platz, W, ausschluss) {
    const kl = klasse();
    if (!kl) return null;
    const liste = kandidaten(platz, kl, ausschluss);
    if (!liste.length) return null;
    const frisch = liste.filter(a => !D.l.includes(a.key));      // Abwechslung: nicht die zuletzt vergebenen
    const app = zufall(frisch.length ? frisch : liste);
    const t = heute();
    let b = W.belohnung[0] + Math.floor(Math.random() * (W.belohnung[1] - W.belohnung[0] + 1));
    const zuletzt = zuletztGespielt(app.key);
    const lange = !!zuletzt && tageZwischen(zuletzt, t) >= W.lnTage;
    if (lange) b = Math.round(b * (1 + W.lnBonus));
    D.n++;
    D.l = [app.key, ...D.l.filter(k => k !== app.key)].slice(0, 3);
    const q = { i: D.n, p: platz.id, a: app.key, n: W.runden, c: 0, m: W.schwelle, r: zufall(W.rohstoffe), b, d: t };
    if (lange) q.x = 1;
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
      D.q = D.q.filter(q => { if (erlaubt.has(q.a)) return true; ersetzen.add(q.p); return false; });
      const neuerTag = D.fd !== t;
      if (neuerTag || ersetzen.size) {
        W.plaetze.forEach(platz => {
          if (D.q.some(q => q.p === platz.id)) return;
          if (!neuerTag && !ersetzen.has(platz.id)) return;          // erledigte Plätze erst morgen wieder
          const q = neuerAuftrag(platz, W, D.q.map(x => x.a));
          if (q) D.q.push(q);
        });
        D.q.sort((a, b) => a.p - b.p);
        D.fd = t;
        geaendert = true;
      }
    }
    if (geaendert) speichern();
    return geaendert;
  }

  /** Kann der Auftrag auf diesem Platz getauscht werden? */
  function kannTauschen(platzId) {
    const q = D.q.find(x => x.p === platzId), kl = klasse();
    if (!q || D.rr < 1 || !kl) return false;
    const platz = werte().plaetze.find(p => p.id === platzId) || { id: platzId, faecher: 'alle' };
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
  function kostenfaktor() { const f = Number(C && C.BAU && C.BAU.kostenfaktor); return Number.isFinite(f) && f > 0 ? f : 1; }
  /** Kosten einer Stufe { h, s, … } (mit Kostenfaktor). Ein Gebäude darf eigene "kosten" haben. */
  function kosten(gebId, stufe) {
    const g = gebaeude(gebId);
    const eigene = g && Array.isArray(g.kosten) ? g.kosten : null;
    const tab = eigene || (C && C.BAU && Array.isArray(C.BAU.stufenKosten) ? C.BAU.stufenKosten : []);
    const zeile = tab.find(z => z && z.stufe === stufe) || {};
    const k = {};
    Object.keys(zeile).forEach(r => { if (r !== 'stufe' && /^[a-z]{1,4}$/.test(r)) k[r] = Math.round(zahl(zeile[r], 0, 1e6) * kostenfaktor()); });
    return k;
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
      if (info.naechste) { info.kosten = kosten(e[0], info.naechste); info.genug = genug(info.kosten); }
    }
    return info;
  }

  /** Welche Gebäude passen auf einen leeren Bauplatz? [{ gebaeude, kosten, genug }] */
  function baubar(platzId) {
    const info = platzInfo(platzId);
    if (!info || info.gesperrt || info.eintrag) return [];
    const stehen = Object.values(D.b).map(e => e[0]);
    return gebaeudeListe()
      .filter(g => info.def.fest ? g.id === info.def.fest
                                 : !plaetze().some(p => p.fest === g.id) && (g.mehrfach || !stehen.includes(g.id)))
      .map(g => { const k = kosten(g.id, 1); return { gebaeude: g, kosten: k, genug: genug(k) }; });
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
    speichern();
    return { ok: true, sofort: erster };
  }

  /** Fertiges Gebäude um eine Stufe ausbauen. */
  function ausbauen(platzId) {
    D = laden();
    const info = platzInfo(platzId);
    if (!info || !info.eintrag || !info.naechste) return { ok: false, grund: 'nicht-ausbaubar' };
    if (!info.genug) return { ok: false, grund: 'zu-wenig' };
    bezahlen(info.kosten);
    D.b[platzId] = [info.gebaeude.id, info.naechste, morgen()];
    D.an += ansehenFuer(info.gebaeude.id, info.naechste);
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

  // ── Runden aus pass.js empfangen ────────────────────────
  const rundenHandler = [];
  function rundeEmpfangen(runde) {
    if (!runde || typeof runde !== 'object' || !runde.app) return;
    if (gestartet()) auftragZaehlen(runde);
    rundenHandler.forEach(fn => { try { fn(runde, D); } catch (e) {} });
  }

  function auftragZaehlen(runde) {
    D = laden();                                       // anderer Tab (z. B. offenes Dorf) könnte geändert haben
    if (C && D.fd !== heute()) tagesCheck();
    const q = D.q.find(x => x.a === runde.app);
    if (!q || runde.blocked) return;
    if (!zaehlt(runde, q.m)) { toast('zuwenig', q); return; }
    q.c = Math.min(q.n, q.c + 1);
    if (q.c >= q.n) {
      q.b = lohn(q).gesamt;                            // Bonus von Sägewerk & Co. zum Zeitpunkt der Erfüllung
      D.r[q.r] = (D.r[q.r] || 0) + q.b;
      D.q = D.q.filter(x => x !== q);
      D.e++;
      speichern();
      toast('erfuellt', q);
    } else {
      speichern();
      toast('fortschritt', q);
    }
  }
  window.addEventListener('lernpass:gewertet', e => rundeEmpfangen(e.detail));

  // ── Meldung in der Lern-App ─────────────────────────────
  //  Unten in der Mitte, damit sie nicht mit der XP-Meldung (oben) kollidiert.
  function toast(art, q) {
    if (!document.body) return;
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
        @media (prefers-reduced-motion: reduce){#lw-dorf-toast{transition:none;}}`;
      document.head.appendChild(st);
      el = document.createElement('div');
      el.id = 'lw-dorf-toast';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    const r = rohstoff(q.r);
    if (art === 'erfuellt') {
      el.className = '';
      el.innerHTML = `<b>🏘️ Auftrag erfüllt!</b>+${q.b} ${r.icon} ${r.name} für dein Dorf`;
    } else if (art === 'fortschritt') {
      el.className = 'klein';
      el.textContent = `🏘️ Dorf-Auftrag: ${q.c} von ${q.n} Runden geschafft`;
    } else {
      el.className = 'klein';
      el.textContent = `🏘️ Für deinen Dorf-Auftrag brauchst du mindestens ${q.m} %`;
    }
    clearTimeout(el._t);
    requestAnimationFrame(() => el.classList.add('show'));
    el._t = setTimeout(() => el.classList.remove('show'), art === 'erfuellt' ? 5000 : 3500);
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
