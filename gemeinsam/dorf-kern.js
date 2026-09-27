// ═══════════════════════════════════════════════════════
//  Lernwelt – dorf-kern.js   (Aufbauspiel „Mein Dorf“: Spielstand & Regeln)
//
//  Wird geladen von:
//    - jeder App automatisch über navbar.js (damit Aufträge auch dann
//      zählen, wenn das Dorf gerade nicht geöffnet ist)
//    - spiele/dorf.html
//
//  Inhalte und Startwerte: daten/dorf-inhalte.json (wird erst bei Bedarf geladen).
//  Spielstand: localStorage 'lernwelt-dorf' – bewusst kompakt, weil er
//  unverändert im Sicherungscode des Passes mitreist (pass.js, LW3).
//  Runden kommen über das Ereignis 'lernpass:gewertet' aus pass.js.
//
//  Solange ein Kind das Dorf nie geöffnet hat, wird NICHTS gespeichert
//  (kein Dorf im Sicherungscode, keine Aufträge).
//
//  Stand Etappe 0: Spielstand, Laden/Speichern, Inhalte, App-Auswahl,
//  Empfang der Runden. Aufträge (Etappe 1) und Bauen (Etappe 2) folgen.
// ═══════════════════════════════════════════════════════

(function () {
  'use strict';
  if (window.LernDorf) return;                         // doppeltes Laden verhindern

  const KEY           = 'lernwelt-dorf';
  const CONTENT_CACHE = 'lernwelt-dorf-inhalte-cache';
  const CONFIG_KEY    = 'lernwelt-config-cache';       // von config-api.js geschrieben
  const VERSION       = 1;
  const here = (document.currentScript && document.currentScript.src) || location.href;
  const ROOT = new URL('../', here).href;              // Hauptordner (dorf-kern.js liegt in gemeinsam/)

  // ── Hilfen ──────────────────────────────────────────────
  // Tage als 'JJJJMMTT' – kompakt, weil sie im Sicherungscode stehen
  const TAG = /^\d{8}$/;
  function heute(d = new Date()) {
    return d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
  }
  const zahl = (v, lo, hi) => { const n = Math.floor(Number(v)); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : lo; };
  const istId = v => typeof v === 'string' && /^[a-z0-9][a-z0-9_-]{0,39}$/i.test(v);
  const klein = (v, max) => { try { return JSON.stringify(v).length <= max; } catch (e) { return false; } };

  // ── Spielstand ──────────────────────────────────────────
  //  Kurzschlüssel, weil der Stand im Sicherungscode mitreist:
  //    v   Version des Spielstands
  //    s   Starttag 'JJJJMMTT'
  //    r   Rohstoffe { h: Holz, s: Stein, g: Gold, … später Event-Währungen }
  //    q   offene Aufträge (Aufbau folgt in Etappe 1)
  //    rr  angesparte Rerolls · rd Tag der letzten Reroll-Gutschrift · fd Tag des letzten Nachfüllens
  //    b   Bauplätze { '1': [gebäudeId, stufe, fertigAb 'JJJJMMTT'] }
  //    an  Ansehen
  //    n   laufende Nummer für Auftrags-IDs
  //  Weitere Felder späterer Etappen (Sammelbuch, Bewohner …) bleiben beim
  //  Säubern erhalten, damit ältere Geräte nichts wegwerfen.
  function leer() {
    return { v: VERSION, s: heute(), r: { h: 0, s: 0, g: 0 }, q: [], rr: 0, rd: '', fd: '', b: {}, an: 0, n: 0 };
  }

  function saeubern(raw) {
    const d = leer();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return d;
    if (TAG.test(raw.s)) d.s = raw.s;
    if (raw.r && typeof raw.r === 'object' && !Array.isArray(raw.r)) {
      Object.entries(raw.r).slice(0, 20).forEach(([k, v]) => { if (/^[a-z]{1,4}$/.test(k)) d.r[k] = zahl(v, 0, 1e6); });
    }
    if (Array.isArray(raw.q)) {
      d.q = raw.q.filter(a => a && typeof a === 'object' && !Array.isArray(a) && klein(a, 400)).slice(0, 10);
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
    d.n  = zahl(raw.n, 0, 1e9);
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

  /** Dorf beginnen (erster Besuch in spiele/dorf.html). */
  function starten() {
    if (!gestartet()) { D = leer(); schreiben(); }
    return D;
  }

  function neuLaden() { D = laden(); melden(); }
  // Änderungen aus anderen Tabs und nach „Pass wiederherstellen“ übernehmen
  window.addEventListener('storage', e => { if (e.key === KEY) neuLaden(); });
  window.addEventListener('lernpass:wiederhergestellt', neuLaden);

  // ── Inhalte (daten/dorf-inhalte.json), offline aus dem Zwischenspeicher ──
  let inhaltePromise = null;
  function inhalte() {
    if (!inhaltePromise) {
      inhaltePromise = fetch(new URL('daten/dorf-inhalte.json', ROOT).href, { cache: 'no-cache' })
        .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(c => { try { localStorage.setItem(CONTENT_CACHE, JSON.stringify(c)); } catch (e) {} return c; })
        .catch(() => { try { return JSON.parse(localStorage.getItem(CONTENT_CACHE) || '{}'); } catch (e) { return {}; } });
    }
    return inhaltePromise;
  }

  // ── Welche Apps können Aufträge bekommen? ───────────────
  //  Nur echte Lern-Apps: nicht versteckt, nicht mit "dorf": false ausgeschlossen,
  //  für die Klasse freigeschaltet, keine Spiele (Ordner spiele/) und keine externen Links.
  //  Rückgabe: [{ key, name, fach, emoji, datei }] – key = Dateiname wie in den Ergebnissen.
  function appKey(datei) { return String(datei || '').split('/').pop(); }
  function dorfApps(klasse) {
    let cfg = null;
    try { cfg = JSON.parse(localStorage.getItem(CONFIG_KEY) || 'null'); } catch (e) {}
    const apps = cfg && Array.isArray(cfg.apps) ? cfg.apps : [];
    return apps.filter(a => a && typeof a === 'object'
        && typeof a.datei === 'string' && a.datei && !/^https?:/i.test(a.datei)
        && !a.datei.startsWith('spiele/') && a.fach !== 'Allgemein'
        && a.hidden !== true && a.dorf !== false
        && Array.isArray(a.klassen) && a.klassen.includes(klasse))
      .map(a => ({ key: appKey(a.datei), name: a.name, fach: a.fach, emoji: a.emoji || '📱', datei: a.datei }));
  }

  /** Zählt eine Runde für Aufträge? Nicht durchgeklickt und mindestens schwelle %.
   *  Ob sie wegen des XP-Tageslimits noch XP bringt, spielt keine Rolle. */
  function zaehlt(runde, schwelle) {
    return !!runde && !runde.blocked && Number(runde.prozent) >= (Number(schwelle) || 0);
  }

  // ── Runden aus pass.js empfangen ────────────────────────
  //  Etappe 1 hängt hier die Auftragszählung an (onRunde).
  const rundenHandler = [];
  function rundeEmpfangen(runde) {
    if (!runde || typeof runde !== 'object' || !runde.app) return;
    rundenHandler.forEach(fn => { try { fn(runde, D); } catch (e) {} });
  }
  window.addEventListener('lernpass:gewertet', e => rundeEmpfangen(e.detail));

  // ── Öffentliche API ─────────────────────────────────────
  window.LernDorf = {
    VERSION, KEY,
    get state() { return D; },
    gestartet, starten, speichern, neuLaden, inhalte, dorfApps, appKey, zaehlt, heute,
    onChange(fn) { listeners.push(fn); },
    onRunde(fn)  { rundenHandler.push(fn); },
    _saeubern: saeubern, _leer: leer,
  };

  // Runden, die gemeldet wurden, bevor dieses Skript geladen war
  const q = window.__lernDorfQueue;
  if (Array.isArray(q)) setTimeout(() => q.splice(0).forEach(rundeEmpfangen), 0);

  try { window.dispatchEvent(new CustomEvent('lerndorf:ready')); } catch (e) {}
})();
