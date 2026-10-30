// ═══════════════════════════════════════════════════════
//  Lernwelt – freigabe.js   (Freischaltung und Fokus-Modus, Infrastruktur Etappe 7)
//
//  Wertet zwei Felder aus config.json aus – ohne Accounts, ohne Eingreifen der Kinder:
//
//  freigaben – je Themen-ID, für wen was gilt:
//    { "en.5.vok.u5": { "alle": "2026-11-10" },             Unit 5 ab 10. November
//      "en.5.vok.u6": { "alle": "zu", "g:<gruppe>": "offen" },  gesperrt, für eine Sync-Gruppe offen
//      "ma.6.kopf":   { "k6": "zu" } }                       ganzes Thema für Klasse 6 gesperrt
//    Wer:  "alle" | "k5" (Klasse aus dem Pass) | "g:<32 hex>" (Sync-Gruppe der Sicherungskarte)
//    Wert: "zu" | "offen" | "JJJJ-MM-TT" (gesperrt bis zu diesem Tag, ab dann offen)
//    Es entscheidet der genaueste Eintrag: zuerst die Stufe selbst, dann das Thema darüber
//    ('ma.6.kopf.brueche' → 'ma.6.kopf'); je Eintrag Gruppe vor Klasse vor „alle“.
//    Ohne Eintrag ist alles offen – genau der Zustand vor Etappe 7. Ausnahme (Quellen-Detektiv Etappe 4): Stufen, die in
//    ihrer Inhaltsdatei "gesperrt": true tragen, sind ohne Eintrag ZU (erlaubt(id, true)) – so steht die Sperre im Repo
//    und kein alter Admin-Entwurf kann sie aus config.json löschen. Freigeben schreibt dann 'offen'.
//
//  fokus – „Für Gruppe 5a heute nur diese drei Apps“:
//    [{ id, fuer: "alle"|"k5"|"g:…", apps: ["apps/mathe/kopfrechnen.html", …], ab?: ms, bis: ms }]
//    Endet von selbst (bis). Gilt mehr als einer, gewinnt der genaueste (Gruppe vor Klasse vor alle).
//
//  spielsperre – Spiele (spiele/…, außer Mein Dorf) erst nach so vielen guten Lern-App-Runden heute:
//    { schwelle: 60, runden: { "alle": [Mo, Di, Mi, Do, Fr, Sa, So], "k5": […], "g:<gruppe>": […] } }
//    Es gilt die genaueste Liste (Gruppe vor Klasse vor „alle“); 0 = an diesem Tag keine Sperre.
//    Gezählt wird im Pass (lernwelt-pass → today.lr: Lern-App-Runden ab schwelle %, ohne Durchklicken).
//    ausnahmen (freiwillig): [{ id, wer, runden: 0–20, ab?: "JJJJ-MM-TT", bis?: "JJJJ-MM-TT" }]
//    Eine laufende Ausnahme geht den Wochentag-Listen vor (ohne bis = dauerhaft, ab/bis einschließlich).
//    Gilt mehr als eine, gewinnt die genaueste (Gruppe vor Klasse vor „alle“), bei gleichem „wer“ die,
//    die am frühesten endet (so schlägt „heute frei“ eine dauerhafte Ausnahme). 0 Runden = Spiele frei.
//
//  Eine Sperre nimmt nie Fortschritt weg: Ergebnisse, Sterne und gemeisterte Themen bleiben.
//
//  Quelle: die Offline-Kopie von config.json (schreibt die Startseite). Ist sie älter als
//  5 Minuten, wird config.json im Hintergrund frisch geholt (nur im Speicher, ohne die Kopie
//  zu ändern) und danach 'lernfreigabe:neu' gefeuert.
//
//  API (window.LernFreigabe):
//    erlaubt(themaId, standardZu?) → true/false (standardZu: ohne Eintrag gesperrt)
//    zugeteilt(themaId) → true/false – für Lernwege: OHNE Eintrag ZU (nur ausdrücklich zugeteilt ist offen)
//    status(themaId, standardZu?) → { frei, ab? }  (ab = Datum, ab dem es frei wird)
//    wer()              → ['g:…', 'k5', 'alle'] (was für dieses iPad gilt)
//    fokus()            → { id, apps, bis } oder null
//    imFokus(datei)     → true, wenn kein Fokus aktiv ist oder die App dazugehört
//    spielSperre()      → null (heute keine Sperre) oder { noetig, geschafft, frei }
//    spielGesperrt(datei) → true, wenn diese Datei ein Spiel ist und heute noch gesperrt
//    neu(config, leise) → mit frischer config.json neu auswerten (Startseite; leise = ohne Ereignis)
//    admin()            → Hauptzugang auf diesem Gerät angemeldet (Vorschau, z. B. Lernpfad ohne Kette)
//    feature(id)        → true/false – Feature-Schalter (Admin-Umbau Etappe 10), config.featureSchalter[id]:
//                         true = an für alle · false/fehlt = aus · { wer: ['admin', 'g:<Gruppe>', 'k5', 'alle'] } =
//                         nur dort an ('admin' = dieses Gerät ist mit dem Hauptzugang im Admin angemeldet).
//                         Neue Funktion hinter einen Schalter: Eintrag in daten/features.json + if (LernFreigabe.feature('id')).
//    journey(weg)       → config.journey.wege[weg] oder null – English Journey: Freigabe „bis Abschnitt“, HE-Nummern
//  Ereignis 'lernfreigabe:neu', wenn sich die Grundlage geändert hat. Solange die Seite sichtbar ist, fragt sie alle
//  2 Minuten nach (Unterrichtsmodus „Stufe jetzt freischalten“ kommt so ohne Neuladen an).
// ═══════════════════════════════════════════════════════

(function () {
  'use strict';
  if (window.LernFreigabe) return;

  const CONFIG_KEY = 'lernwelt-config-cache', CONFIG_TS_KEY = 'lernwelt-config-cache-ts';
  const PASS_KEY = 'lernwelt-pass', SYNC_KEY = 'lernwelt-sync';
  const FRISCH_MS = 5 * 60 * 1000;
  const DATUM = /^\d{4}-\d{2}-\d{2}$/;

  const lies = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  let CFG = lies(CONFIG_KEY) || {};

  function heute() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  /** Was gilt für dieses iPad? Genaueste Angabe zuerst. */
  function wer() {
    const liste = [];
    const s = lies(SYNC_KEY);
    if (s && s.gruppe && !s.ungueltig && /^[0-9a-f]{32}$/.test(s.gruppe)) liste.push('g:' + s.gruppe);
    const p = lies(PASS_KEY);
    const k = p && p.profile && Number(p.profile.klasse);
    if (k) liste.push('k' + k);
    liste.push('alle');
    return liste;
  }

  /** Themen-ID und alle IDs darüber: 'ma.6.kopf.brueche' → ['ma.6.kopf.brueche', 'ma.6.kopf', 'ma.6'] */
  function kette(id) {
    const teile = String(id || '').split('.'), out = [];
    for (let n = teile.length; n >= 2; n--) out.push(teile.slice(0, n).join('.'));
    return out;
  }

  function status(themaId, standardZu) {
    const F = CFG && CFG.freigaben;
    if (!themaId) return { frei: true };
    if (!F || typeof F !== 'object') return { frei: !standardZu };
    const w = wer();
    for (const t of kette(themaId)) {
      const e = F[t];
      if (!e || typeof e !== 'object') continue;
      for (const x of w) {
        const v = e[x];
        if (v === undefined) continue;
        if (v === 'offen') return { frei: true };
        if (v === 'zu') return { frei: false };
        if (typeof v === 'string' && DATUM.test(v)) return heute() >= v ? { frei: true } : { frei: false, ab: v };
      }
    }
    return { frei: !standardZu };
  }
  const erlaubt = (themaId, standardZu) => status(themaId, standardZu).frei;

  // Umgekehrte Regel – ohne Eintrag gesperrt (früher für die Lernwege, heute „Unit geöffnet“ im English Journey,
  // gemeinsam/journey-kern.js). Offen nur, wenn für dieses iPad (Gruppe vor Klasse vor „alle“) ausdrücklich 'offen'
  // oder ein erreichtes Datum eingetragen ist.
  function zugeteilt(themaId) {
    const F = CFG && CFG.freigaben, e = F && typeof F === 'object' ? F[themaId] : null;
    if (!e || typeof e !== 'object') return false;
    for (const x of wer()) {
      const v = e[x];
      if (v === undefined) continue;
      if (v === 'offen') return true;
      if (v === 'zu') return false;
      if (typeof v === 'string' && DATUM.test(v)) return heute() >= v;
    }
    return false;
  }

  function fokus() {
    const L = CFG && Array.isArray(CFG.fokus) ? CFG.fokus : [];
    if (!L.length) return null;
    const w = wer(), jetzt = Date.now();
    let best = null, rang = Infinity;
    L.forEach(f => {
      if (!f || !Array.isArray(f.apps) || !f.apps.length || !(Number(f.bis) > jetzt)) return;
      if (f.ab && Number(f.ab) > jetzt) return;
      const r = w.indexOf(f.fuer || 'alle');
      if (r >= 0 && r < rang) { best = f; rang = r; }
    });
    return best ? { id: best.id, apps: best.apps.slice(), bis: Number(best.bis) } : null;
  }
  // Vergleich ohne Ordner, aber MIT Parametern: kopfrechnen.html?klasse=6 ist eine andere Kachel als ?klasse=4
  const ohneOrdner = d => String(d || '').split('#')[0].split('/').pop();
  function imFokus(datei) {
    const f = fokus();
    if (!f) return true;
    return f.apps.some(a => a === datei || ohneOrdner(a) === ohneOrdner(datei));
  }

  // ── Spielsperre: Spiele erst nach guten Lern-Runden (je Wochentag und Gruppe/Klasse) ──
  /** Laufende Ausnahme für dieses iPad (genaueste; bei gleichem „wer“ die, die am frühesten endet) */
  function spielAusnahme(S) {
    const A = S && Array.isArray(S.ausnahmen) ? S.ausnahmen : [];
    if (!A.length) return null;
    const h = heute();
    const laeuft = a => a && typeof a === 'object' && Number.isFinite(Number(a.runden))
      && (!a.ab || !DATUM.test(a.ab) || a.ab <= h) && (!a.bis || !DATUM.test(a.bis) || h <= a.bis);
    for (const w of wer()) {
      const passend = A.filter(a => laeuft(a) && a.wer === w)
        .sort((x, y) => (x.bis && DATUM.test(x.bis) ? x.bis : '9999') < (y.bis && DATUM.test(y.bis) ? y.bis : '9999') ? -1 : 1);
      if (passend.length) return passend[0];
    }
    return null;
  }
  function spielSperre() {
    const S = CFG && CFG.spielsperre;
    if (!S || typeof S !== 'object') return null;
    const R = S.runden && typeof S.runden === 'object' ? S.runden : {};
    const aus = spielAusnahme(S);
    const liste = aus ? null : wer().map(w => R[w]).find(l => Array.isArray(l) && l.length === 7);
    const noetig = aus ? Math.max(0, Number(aus.runden) || 0)
      : liste ? Number(liste[(new Date().getDay() + 6) % 7]) || 0 : 0;   // Montag = 0
    if (noetig <= 0) return null;
    const p = lies(PASS_KEY), t = p && p.today;
    const geschafft = t && t.day === heute() ? Number(t.lr) || 0 : 0;
    return { noetig, geschafft: Math.min(geschafft, noetig), frei: geschafft >= noetig };
  }
  const istGesperrtesSpiel = d => /(^|\/)spiele\//.test(String(d || '')) && !/(^|\/)dorf\.html/.test(String(d || ''));
  function spielGesperrt(datei) {
    if (!istGesperrtesSpiel(datei)) return false;
    const s = spielSperre();
    return !!s && !s.frei;
  }

  function melden() { try { window.dispatchEvent(new CustomEvent('lernfreigabe:neu')); } catch (e) {} }
  let bekommen = false;
  function neu(config, leise) {
    if (!config || typeof config !== 'object') return;
    CFG = config; bekommen = true;
    if (!leise) melden();
  }

  // Offline-Kopie zu alt (oder fehlt)? → frisch holen, nur im Speicher. Kurz warten:
  // Die Startseite lädt config.json ohnehin und reicht sie mit neu() herein.
  const root = (window.LW && LW.ROOT) || new URL('../', (document.currentScript && document.currentScript.src) || location.href).href;
  function holen(trotzdem) {
    if ((bekommen && !trotzdem) || !window.fetch || !navigator.onLine) return;
    fetch(root + 'config.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).then(c => {
      if (!c || (bekommen && !trotzdem)) return;
      const vorher = JSON.stringify([CFG.freigaben, CFG.fokus, CFG.spielsperre]);
      CFG = c;
      if (JSON.stringify([c.freigaben, c.fokus, c.spielsperre]) !== vorher) melden();
    }).catch(() => {});
  }
  setTimeout(() => {
    const ts = Number(localStorage.getItem(CONFIG_TS_KEY)) || 0;
    if (Date.now() - ts >= FRISCH_MS) holen(false);
  }, 1500);
  // Regelmäßig nachfragen, solange die Seite offen und sichtbar ist (Freischalten im Unterricht)
  setInterval(() => { if (document.visibilityState === 'visible') holen(true); }, 2 * 60 * 1000);

  /** Hauptzugang auf diesem Gerät angemeldet? (Schlüssel noch gültig, kein Kollegen-Schlüssel – nur für Vorschauen) */
  function adminHier() {
    const t = lies('lernwelt-admin-schluessel');
    if (!t || typeof t.token !== 'string' || !(t.exp > Date.now())) return false;
    try { return JSON.parse(atob(t.token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).r !== 'k'; } catch (e) { return false; }
  }
  function feature(id) {
    const v = CFG && CFG.featureSchalter && typeof CFG.featureSchalter === 'object' ? CFG.featureSchalter[id] : undefined;
    if (v === true) return true;
    if (!v || typeof v !== 'object' || !Array.isArray(v.wer)) return false;
    return v.wer.some(w => w === 'admin' ? adminHier() : wer().includes(w));
  }

  function journey(weg) { const w = CFG && CFG.journey && CFG.journey.wege; return (w && typeof w === 'object' && w[weg] && typeof w[weg] === 'object') ? w[weg] : null; }

  window.LernFreigabe = { erlaubt, zugeteilt, status, wer, fokus, imFokus, spielSperre, spielGesperrt, neu, feature, journey, admin: adminHier };
})();
