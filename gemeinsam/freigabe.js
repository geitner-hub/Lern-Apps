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
//    Ohne Eintrag ist alles offen – genau der Zustand vor Etappe 7.
//
//  fokus – „Für Gruppe 5a heute nur diese drei Apps“:
//    [{ id, fuer: "alle"|"k5"|"g:…", apps: ["apps/mathe/kopfrechnen.html", …], ab?: ms, bis: ms }]
//    Endet von selbst (bis). Gilt mehr als einer, gewinnt der genaueste (Gruppe vor Klasse vor alle).
//
//  spielsperre – Spiele (spiele/…, außer Mein Dorf) erst nach so vielen guten Lern-App-Runden heute:
//    { schwelle: 60, runden: { "alle": [Mo, Di, Mi, Do, Fr, Sa, So], "k5": […], "g:<gruppe>": […] } }
//    Es gilt die genaueste Liste (Gruppe vor Klasse vor „alle“); 0 = an diesem Tag keine Sperre.
//    Gezählt wird im Pass (lernwelt-pass → today.lr: Lern-App-Runden ab schwelle %, ohne Durchklicken).
//
//  Eine Sperre nimmt nie Fortschritt weg: Ergebnisse, Sterne und gemeisterte Themen bleiben.
//
//  Quelle: die Offline-Kopie von config.json (schreibt die Startseite). Ist sie älter als
//  5 Minuten, wird config.json im Hintergrund frisch geholt (nur im Speicher, ohne die Kopie
//  zu ändern) und danach 'lernfreigabe:neu' gefeuert.
//
//  API (window.LernFreigabe):
//    erlaubt(themaId)   → true/false
//    status(themaId)    → { frei, ab? }  (ab = Datum, ab dem es frei wird)
//    wer()              → ['g:…', 'k5', 'alle'] (was für dieses iPad gilt)
//    fokus()            → { id, apps, bis } oder null
//    imFokus(datei)     → true, wenn kein Fokus aktiv ist oder die App dazugehört
//    spielSperre()      → null (heute keine Sperre) oder { noetig, geschafft, frei }
//    spielGesperrt(datei) → true, wenn diese Datei ein Spiel ist und heute noch gesperrt
//    neu(config, leise) → mit frischer config.json neu auswerten (Startseite; leise = ohne Ereignis)
//  Ereignis 'lernfreigabe:neu', wenn sich die Grundlage geändert hat.
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

  function status(themaId) {
    const F = CFG && CFG.freigaben;
    if (!themaId || !F || typeof F !== 'object') return { frei: true };
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
    return { frei: true };
  }
  const erlaubt = themaId => status(themaId).frei;

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
  function spielSperre() {
    const S = CFG && CFG.spielsperre, R = S && S.runden;
    if (!R || typeof R !== 'object') return null;
    const liste = wer().map(w => R[w]).find(l => Array.isArray(l) && l.length === 7);
    const noetig = liste ? Number(liste[(new Date().getDay() + 6) % 7]) || 0 : 0;   // Montag = 0
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
  setTimeout(function auffrischen() {
    const ts = Number(localStorage.getItem(CONFIG_TS_KEY)) || 0;
    if (bekommen || Date.now() - ts < FRISCH_MS || !window.fetch || !navigator.onLine) return;
    fetch(root + 'config.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).then(c => {
      if (!c || bekommen) return;
      const vorher = JSON.stringify([CFG.freigaben, CFG.fokus, CFG.spielsperre]);
      CFG = c;
      if (JSON.stringify([c.freigaben, c.fokus, c.spielsperre]) !== vorher) melden();
    }).catch(() => {});
  }, 1500);

  window.LernFreigabe = { erlaubt, status, wer, fokus, imFokus, spielSperre, spielGesperrt, neu };
})();
