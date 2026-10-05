// ═══════════════════════════════════════════════════════
//  Lernwelt – pass.js   (Lernwelt-Pass: XP, Level, Serie, Sterne)
//
//  Wird geladen von:
//    - index.html / admin.html
//    - jeder App automatisch über navbar.js
//
//  Inhalte (Titel, Abzeichen, Cosmetics, Events) stehen in der reinen
//  Datendatei lernwelt-inhalte.json. Sobald sie geladen ist, steht
//  window.LernPass bereit und das Ereignis 'lernpass:ready' wird ausgelöst.
//  Einstellungen (Saison-Modus, aktive Events) kommen aus config.json → "pass",
//  die für die Spiele („Meine Themen“) aus config.json → "spiele".
//
//  Alle Daten bleiben im localStorage des Geräts ('lernwelt-pass').
//  Sicherung/Umzug: automatisch über die Sicherungskarte (gemeinsam/sync.js).
//
//  Jede gewertete Runde löst 'lernpass:gewertet' aus (für „Mein Dorf“).
//
//  ⚙ Stellschrauben stehen gesammelt in RULES (unten).
// ═══════════════════════════════════════════════════════

(function () {
  'use strict';
  if (window.LernPass || window.__lernPassLoading) return;   // doppeltes Laden verhindern
  window.__lernPassLoading = true;

  // Inhalte laden (daten/ im Hauptordner); offline aus dem Zwischenspeicher
  const CONTENT_CACHE = 'lernwelt-inhalte-cache';
  const here = (document.currentScript && document.currentScript.src) || location.href;
  const ROOT = new URL('../', here).href;           // Hauptordner der Lernwelt (pass.js liegt in gemeinsam/)
  const contentFile = new URL('daten/lernwelt-inhalte.json', ROOT).href;
  const inhalte = fetch(contentFile, { cache: 'no-cache' })
    .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(c => { try { localStorage.setItem(CONTENT_CACHE, JSON.stringify(c)); } catch (e) {} return c; })
    .catch(() => { try { return JSON.parse(localStorage.getItem(CONTENT_CACHE) || '{}'); } catch (e) { return {}; } });
  Promise.all([inhalte, ladeKompression()]).then(([c]) => start(c));

  // Kompression (vendor/fflate.min.js): Ersatz für sync.js auf älteren iPads
  // ohne CompressionStream. Fehlt sie, startet der Pass trotzdem (nach max. 4 s).
  function ladeKompression() {
    if (window.fflate) return Promise.resolve();
    return new Promise(fertig => {
      const sc = document.createElement('script');
      sc.src = new URL('vendor/fflate.min.js', ROOT).href;
      sc.onload = sc.onerror = () => fertig();
      (document.head || document.documentElement).appendChild(sc);
      setTimeout(fertig, 4000);                      // nie länger als 4 s auf den Pass warten
    });
  }

  function start(C) {

  const STORE_KEY   = 'lernwelt-pass';
  const RESULTS_KEY = 'lern-apps-results';
  const CONFIG_KEY  = 'lernwelt-config-cache';
  const DORF_KEY    = 'lernwelt-dorf';               // Spielstand „Mein Dorf“ (gemeinsam/dorf-kern.js)
  const EXPED_KEY   = 'lernwelt-expedition';         // Stempel der Entdecker-Expedition (spiele/expedition.html)
  const VERSION     = 1;

  // ── Regeln (hier anpassen) ──────────────────────────────
  const RULES = {
    baseXp:          5,     // Abschluss einer Runde (halbiert gegenüber Konzept)
    baseXpLow:       2,     // Abschluss bei unter lowPct % richtig
    lowPct:          30,
    perfXpMax:       10,    // Leistungs-XP, linear von perfFromPct bis 100 %
    perfFromPct:     30,    // darunter gibt es keine Leistungs-XP
    fullSizeItems:   10,    // ab so vielen Aufgaben volle Leistungs-XP (kleine Runden zählen anteilig)
    recordXp:        3,     // neuer persönlicher Rekord in der App (ab recordMinPct)
    recordMinPct:    60,
    firstOfDayXp:    5,     // erste gute Runde des Tages (ab goodPct)
    goodPct:         50,    // ab hier zählt eine Runde als „geübt“ (Wochenziel)
    minSeconds:      10,    // schneller → keine XP (Durchklicken)
    rushSeconds:     30,    // schneller UND unter goodPct → keine XP
    fullRoundsPerApp: 3,    // pro App & Tag volle XP …
    halfRoundsPerApp: 6,    // … bis hier halbe XP, danach 0 (Sterne zählen weiter)
    dailySoftCap:    150,   // über diesem Tageswert nur noch halbe XP
    lowerClassFactor: 0.5,  // Apps nur für niedrigere Klassen
    weekGoalDays:    3,     // Tage pro Woche für das Wochenziel
    chestEveryXp:    250,   // alle X XP eine Truhe
    eventChestShare: 0.6,   // Anteil Event-Teile in Truhen während eines Events
    eventGiftChests: 1,     // Geschenk-Truhen je Event & Schuljahr (nach erster guter Runde)
    starPct:         [60, 80, 90],  // Bronze, Silber, Gold
    starDays:        2,     // an so vielen verschiedenen Tagen erreicht
    // Endlos-Modus (z. B. Runner): XP für den besten Lauf des Tages, als Differenz ausgezahlt
    endlessXpPerCorrect: 1, // XP je richtiger Antwort
    endlessXpCap:    30,    // höchstens so viele Endlos-XP pro App und Tag
    endlessGoodCorrect: 10, // ab so vielen richtigen Antworten zählt der Lauf als „guter Tag“ (Wochenziel)
    // Schuljahreswechsel: nach dem 1. August einmal nach der neuen Klasse fragen
    klassenAbfrage:  true,
  };

  C = C && typeof C === 'object' ? C : {};
  const LEVEL_TITLES = Array.isArray(C.TITEL) && C.TITEL.length ? C.TITEL : ['Neuling'];
  const RAW_ITEMS  = Array.isArray(C.ITEMS) ? C.ITEMS : [];
  // Farbvarianten: { basis: 'andere-id', tausch: { '#alt': '#neu' } } übernimmt das Modell der Basis
  const RAW_BY_ID  = Object.fromEntries(RAW_ITEMS.map(i => [i.id, i]));
  const ITEMS = RAW_ITEMS.map(i => {
    const b = i.basis && RAW_BY_ID[i.basis];
    if (!b) return i;
    let json = JSON.stringify({ modell: b.modell, kleidung: b.kleidung, muster: b.muster, versteckt: b.versteckt });
    Object.entries(i.tausch || {}).forEach(([a, n]) => { json = json.split(a).join(n).split(a.toUpperCase()).join(n); });
    return Object.assign(JSON.parse(json), i);
  });
  const ITEM_BY_ID = Object.fromEntries(ITEMS.map(i => [i.id, i]));
  const AVATAR     = C.AVATAR || {};
  const BADGES     = Array.isArray(C.ABZEICHEN) ? C.ABZEICHEN : [];
  const EVENTS     = Array.isArray(C.EVENTS) ? C.EVENTS : [];
  const RARITY     = C.SELTENHEIT || {};
  const SLOTS      = C.SLOTS || {};

  // ── Aussehen (Figur) ─────────────────────────────────
  const LOOK_KEYS = ['haut', 'frisur', 'haarfarbe', 'augen', 'mund'];
  const lists = {
    haut: () => (AVATAR.HAUT || []).map((_, i) => i),
    haarfarbe: () => (AVATAR.HAARFARBEN || []).map((_, i) => i),
    frisur: () => (AVATAR.FRISUREN || []).map(x => x.id),
    augen: () => (AVATAR.AUGEN || []).map(x => x.id),
    mund: () => (AVATAR.MUENDER || []).map(x => x.id),
  };
  function cleanLook(l) {
    const out = {};
    LOOK_KEYS.forEach(k => { const opts = lists[k](); out[k] = l && opts.includes(l[k]) ? l[k] : (opts.length ? opts[0] : null); });
    return out;
  }
  function randomLook() {
    const out = {};
    LOOK_KEYS.forEach(k => { const opts = lists[k](); out[k] = opts.length ? opts[Math.floor(Math.random() * opts.length)] : null; });
    out.mund = lists.mund()[0] || null;
    return out;
  }

  // ── Datum ───────────────────────────────────────────────
  const pad = n => String(n).padStart(2, '0');
  function dayKey(d = new Date()) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseDay(k) { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); }
  function weekKey(d = new Date()) {             // Montag der Woche
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
    return dayKey(x);
  }
  function prevWeek(wk) { const d = parseDay(wk); d.setDate(d.getDate() - 7); return dayKey(d); }
  // Schuljahr = Saison, Wechsel am 1. August  →  '2026/27'
  function seasonId(d = new Date()) {
    const y = d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1;
    return y + '/' + pad((y + 1) % 100);
  }

  // ── Speicher ────────────────────────────────────────────
  function blank() {
    return {
      v: VERSION,
      profile: null,             // { name, look, klasse, created }
      xp: 0,
      rounds: 0,
      today: { day: '', xp: 0, good: false },
      weeks: {},                 // { 'YYYY-MM-DD'(Montag): Anzahl guter Tage }
      weekDays: {},              // { Montag: ['YYYY-MM-DD', …] } nur aktuelle + letzte Woche
      apps: {},                  // { key: { h:{60:[],80:[],90:[]}, best, last, day, n } }
      seenLevel: 1,
      goodRounds: 0,             // Runden mit mind. goodPct
      seasons: {},               // { '2026/27': XP in diesem Schuljahr }
      chestsOpened: 0,
      bonusChests: 0,            // Geschenk-Truhen (Events)
      levelChests: 0,            // Level-Truhen (je Level-Aufstieg eine)
      levelOpened: 0,            // davon geöffnet (zählen auch in chestsOpened)
      dust: 0,                   // Sternenstaub (wenn der Pool leer ist)
      inventory: [],             // Cosmetics (IDs)
      equipped: {},              // Slot → ID
      badges: [],                // Abzeichen (IDs)
      flags: {},                 // z. B. comeback
      eventDays: {},             // { 'halloween|2026/27': ['YYYY-MM-DD', …] }
      eventGifts: {},            // { 'halloween|2026/27': true }
      endless: {},               // { key: { day, best, paid, good } } Endlos-Modus, nur heute
      lernstand: {},             // { 'vok5:unit1/theme1': { n, best, last, p:[Top-3 %], f } } für „Meine Themen“
    };
  }

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      if (!raw || typeof raw !== 'object') return blank();
      const st = { ...blank(), ...raw, today: { ...blank().today, ...(raw.today || {}) } };
      if (st.profile) {
        st.profile.look = cleanLook(st.profile.look);
        // ältere Pässe: Klasse gilt als im laufenden Schuljahr bestätigt (keine Abfrage bis zum nächsten August)
        if (!st.profile.klasseSeason) st.profile.klasseSeason = seasonId();
      }
      if (!st.endless || typeof st.endless !== 'object') st.endless = {};
      if (!st.lernstand || typeof st.lernstand !== 'object' || Array.isArray(st.lernstand)) st.lernstand = {};
      return st;
    } catch (e) { return blank(); }
  }

  let S = load();
  // Browser bitten, die Daten nicht automatisch zu löschen (wird nicht überall gewährt)
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persisted().then(p => p || navigator.storage.persist()).catch(() => {}); } catch (e) {}
  const listeners = [];
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) {}
    listeners.forEach(fn => { try { fn(S); } catch (e) {} });
  }
  // Änderungen aus anderen Tabs übernehmen (z. B. App in neuem Tab)
  window.addEventListener('storage', e => {
    if (e.key === STORE_KEY) { S = load(); listeners.forEach(fn => { try { fn(S); } catch (x) {} }); }
  });

  // ── Einstellungen aus config.json ("pass") ─────────────
  let SETTINGS = null;
  function readConfigCache() {
    try { return JSON.parse(localStorage.getItem(CONFIG_KEY) || 'null'); } catch (e) { return null; }
  }
  function readSettings() {
    const cfg = readConfigCache();
    const base = SETTINGS || sanitizeSettings(cfg && cfg.pass);
    return Object.assign({}, base, { spiele: sanitizeSpiele(SPIELE_RAW !== undefined ? SPIELE_RAW : cfg && cfg.spiele) });
  }

  // ── Spiele: „Meine Themen“ (config.json → "spiele") ────
  const SPIELE_DEFAULT = {
    auswahl: 'auto+frei',            // 'auto' | 'auto+frei' | 'frei'
    schwelle: 70,                    // % je Runde
    runden: 2,                       // so viele Runden ab schwelle → freigeschaltet
    starter: { 5: ['kopf4-leicht', '1x1-klein'], 6: ['kopf5-leicht', '1x1-klein'] },
    wortBis: { 5: 'unit1', 6: 'unit1' },   // Wort des Tages: Vokabeln bis zu dieser Unit ('' = alle)
  };
  let SPIELE_RAW;                    // von setSpiele() gesetzt (Admin/Startseite), sonst aus dem Config-Cache
  const INHALT_ID = /^[a-z0-9][a-z0-9:/_.+-]{0,79}$/i;
  function sanitizeSpiele(raw) {
    const r = raw && typeof raw === 'object' ? raw : {};
    const int = (v, lo, hi, d) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d; };
    const out = {
      auswahl: ['auto', 'auto+frei', 'frei'].includes(r.auswahl) ? r.auswahl : SPIELE_DEFAULT.auswahl,
      schwelle: int(r.schwelle, 50, 100, SPIELE_DEFAULT.schwelle),
      runden: int(r.runden, 1, 3, SPIELE_DEFAULT.runden),
      starter: {},
    };
    const st = r.starter && typeof r.starter === 'object' ? r.starter : {};
    [5, 6, 7, 8, 9].forEach(k => {
      const v = st[k] !== undefined ? st[k] : st[String(k)];
      if (Array.isArray(v)) out.starter[k] = [...new Set(v.filter(x => typeof x === 'string' && INHALT_ID.test(x)))].slice(0, 30);
      else if (SPIELE_DEFAULT.starter[k]) out.starter[k] = SPIELE_DEFAULT.starter[k].slice();
    });
    // Wort des Tages: gleiche Unit-Grenze für die ganze Klasse
    const wb = r.wortBis && typeof r.wortBis === 'object' ? r.wortBis : {};
    out.wortBis = {};
    [5, 6].forEach(k => {
      const v = wb[k] !== undefined ? wb[k] : wb[String(k)];
      out.wortBis[k] = typeof v === 'string' && /^[a-z0-9_]{0,20}$/i.test(v) ? v : SPIELE_DEFAULT.wortBis[k];
    });
    return out;
  }
  function setSpiele(raw) { SPIELE_RAW = raw === undefined ? null : raw; }   // null → Standardwerte
  function sanitizeSettings(raw) {
    const out = { seasons: false, events: [], avatar: true };
    if (raw && typeof raw === 'object') {
      out.seasons = raw.seasons === true;
      out.avatar = raw.avatar !== false;
      const ev = raw.events && typeof raw.events === 'object' ? raw.events : {};
      out.events = EVENTS.filter(e => ev[e.id] === true).map(e => e.id);
    }
    return out;
  }
  function setSettings(raw) { SETTINGS = sanitizeSettings(raw); listeners.forEach(fn => { try { fn(S); } catch (e) {} }); }
  function activeEvents() { const ids = readSettings().events; return EVENTS.filter(e => ids.includes(e.id)); }
  function seasonsOn() { return readSettings().seasons; }

  // ── Level ───────────────────────────────────────────────
  // Gesamt-XP für Level n:  100·(n−1) + 25·(n−1)(n−2)   → L2:100, L3:250, L4:450, L5:700 …
  function xpForLevel(n) { return 100 * (n - 1) + 25 * (n - 1) * (n - 2); }
  /** XP, nach denen sich das angezeigte Level richtet (Saison oder gesamt) */
  function levelXp() { return seasonsOn() ? (S.seasons[seasonId()] || 0) : S.xp; }
  function levelInfo(xp = levelXp()) {
    let n = 1;
    while (xpForLevel(n + 1) <= xp) n++;
    const from = xpForLevel(n), to = xpForLevel(n + 1);
    const title = n <= LEVEL_TITLES.length ? LEVEL_TITLES[n - 1]
                : LEVEL_TITLES[LEVEL_TITLES.length - 1] + ' ' + '★'.repeat(Math.min(5, n - LEVEL_TITLES.length));
    return { level: n, title, xp, from, to, into: xp - from, need: to - from,
             pct: Math.round(((xp - from) / (to - from)) * 100) };
  }

  // ── Sterne ──────────────────────────────────────────────
  function starsFor(key) {
    const a = S.apps[key];
    if (!a || !a.h) return 0;
    let s = 0;
    RULES.starPct.forEach((p, i) => { if ((a.h[p] || []).length >= RULES.starDays) s = i + 1; });
    return s;
  }
  function starProgress(key) {        // für Anzeige „noch 1 Tag bis Silber“
    const a = S.apps[key] || { h: {} };
    const cur = starsFor(key);
    if (cur >= 3) return null;
    const p = RULES.starPct[cur];
    return { next: cur + 1, pct: p, days: (a.h[p] || []).length, needDays: RULES.starDays };
  }
  function starsSummary() {
    const out = { 1: 0, 2: 0, 3: 0 };
    Object.keys(S.apps).forEach(k => { const s = starsFor(k); if (s) out[s]++; });
    return out;
  }

  // ── Woche & Serie ───────────────────────────────────────
  function weekInfo() {
    const wk = weekKey();
    const goodDays = S.weeks[wk] || 0;
    // Serie: aufeinanderfolgende Wochen mit erreichtem Ziel.
    // Wochen ganz ohne Übung (Ferien, Krankheit) pausieren die Serie nur.
    // Wochen mit 1–2 Tagen beenden sie. Die laufende Woche zählt erst, wenn das Ziel erreicht ist.
    let streak = goodDays >= RULES.weekGoalDays ? 1 : 0;
    let w = prevWeek(wk);
    for (let i = 0; i < 80; i++, w = prevWeek(w)) {
      const n = S.weeks[w];
      if (n === undefined) continue;                  // keine Aktivität → pausiert
      if (n >= RULES.weekGoalDays) streak++;
      else break;
    }
    const total = Object.values(S.weeks).filter(n => n >= RULES.weekGoalDays).length;
    return { goodDays, goal: RULES.weekGoalDays, done: goodDays >= RULES.weekGoalDays, streak, totalWeeks: total };
  }

  // ── Truhen ──────────────────────────────────────────────
  //  Zwei Sorten: normale Truhen (XP + Geschenke) und Level-Truhen (je Level-Aufstieg).
  //  chestsOpened zählt alle geöffneten, levelOpened nur die Level-Truhen.
  function chestInfo() {
    const fromXp = Math.floor(S.xp / RULES.chestEveryXp);
    const lc = S.levelChests || 0, lo = Math.min(S.levelOpened || 0, lc);
    const earned = fromXp + (S.bonusChests || 0) + lc;
    const level = Math.max(0, lc - lo);
    const normal = Math.max(0, fromXp + (S.bonusChests || 0) - (S.chestsOpened - lo));
    const available = level + normal;
    return { earned, fromXp, bonus: S.bonusChests || 0, levelEarned: lc, opened: S.chestsOpened, available, level, normal,
             next: level > 0 ? 'level' : normal > 0 ? 'normal' : null,
             nextAt: (fromXp + 1) * RULES.chestEveryXp, progress: Math.round(((S.xp % RULES.chestEveryXp) / RULES.chestEveryXp) * 100) };
  }

  function owns(id) { const it = ITEM_BY_ID[id]; return !!it && (it.quelle === 'start' || S.inventory.includes(id)); }
  function ownedCount() { return ITEMS.filter(i => owns(i.id)).length; }

  // Erst Seltenheit nach Gewicht (z. B. 60/30/10) wählen – nur unter Stufen,
  // in denen noch Teile fehlen –, dann ein Teil dieser Stufe zufällig.
  function pickByRarity(pool) {
    const groups = {};
    pool.forEach(i => (groups[i.selten] = groups[i.selten] || []).push(i));
    const keys = Object.keys(groups);
    const w = k => (RARITY[k] && RARITY[k].gewicht) || 1;
    const total = keys.reduce((s, k) => s + w(k), 0);
    let r = Math.random() * total, pick = keys[keys.length - 1];
    for (const k of keys) { r -= w(k); if (r <= 0) { pick = k; break; } }
    const g = groups[pick];
    return g[Math.floor(Math.random() * g.length)];
  }
  function pickAny(pool) { return pool[Math.floor(Math.random() * pool.length)]; }

  /**
   * Öffnet eine Truhe. kind: 'level' | 'normal' | leer (= die nächste, Level-Truhen zuerst).
   * Level-Truhen ziehen (vorerst) nur aus dem normalen Truhen-Pool, ohne Event-Anteil.
   * → { ok, kind, item, event, dust }
   */
  function openChest(kind) {
    const ch = chestInfo();
    if (ch.available <= 0) return { ok: false };
    if (kind !== 'level' && kind !== 'normal') kind = ch.next;
    if (kind === 'level' && ch.level <= 0) kind = 'normal';
    if (kind === 'normal' && ch.normal <= 0) kind = 'level';
    const evIds = kind === 'level' ? [] : activeEvents().map(e => e.id);
    const eventPool = ITEMS.filter(i => i.quelle === 'event' && evIds.includes(i.event) && !owns(i.id));
    const normalPool = ITEMS.filter(i => i.quelle === 'truhe' && !owns(i.id));
    let item = null;
    if (eventPool.length && (Math.random() < RULES.eventChestShare || !normalPool.length)) item = pickAny(eventPool);
    else if (normalPool.length) item = pickByRarity(normalPool);
    S.chestsOpened++;
    if (kind === 'level') S.levelOpened = (S.levelOpened || 0) + 1;
    if (!item) { S.dust += 1; save(); return { ok: true, kind, item: null, dust: 1 }; }
    const clean = ITEM_BY_ID[item.id];
    S.inventory.push(clean.id);
    save();
    return { ok: true, kind, item: clean, event: clean.quelle === 'event' ? EVENTS.find(e => e.id === clean.event) : null };
  }

  /** Level-Truhen für Aufstiege gutschreiben (aus award/awardEndless). → Anzahl neuer Truhen */
  function grantLevelChests(before, after) {
    const n = Math.max(0, after.level - before.level);
    if (n) { S.levelChests = (S.levelChests || 0) + n; save(); }
    return n;
  }

  function equip(slot, id) {
    if (!SLOTS[slot]) return false;
    if (id === null || id === undefined || S.equipped[slot] === id) { delete S.equipped[slot]; save(); return true; }
    const it = ITEM_BY_ID[id];
    if (!it || it.slot !== slot || !owns(id)) return false;
    S.equipped[slot] = id; save(); return true;
  }
  function equippedItem(slot) { const id = S.equipped[slot]; return id && owns(id) ? ITEM_BY_ID[id] || null : null; }

  // ── Abzeichen ───────────────────────────────────────────
  function badgeProgress(b) {
    const ss = starsSummary();
    const playedApps = Object.values(S.apps).filter(a => a.last).length;
    switch (b.typ) {
      case 'runden':   return { cur: S.goodRounds || 0, n: b.n };
      case 'apps':     return { cur: playedApps, n: b.n };
      case 'sterne':   return { cur: ss[1] + ss[2] + ss[3], n: b.n };
      case 'gold':     return { cur: ss[3], n: b.n };
      case 'wochen':   return { cur: weekInfo().totalWeeks, n: b.n };
      case 'serie':    return { cur: weekInfo().streak, n: b.n };
      case 'xp':       return { cur: S.xp, n: b.n };
      case 'comeback': return { cur: S.flags.comeback ? 1 : 0, n: 1 };
      case 'event': {
        const days = Object.entries(S.eventDays).filter(([k]) => k.split('|')[0] === b.event).reduce((m, [, v]) => Math.max(m, v.length), 0);
        return { cur: days, n: b.n };
      }
      default: return { cur: 0, n: 1 };
    }
  }
  /** Prüft alle Abzeichen, vergibt neue inkl. Set-Teile. → [{badge, items}] */
  function checkBadges() {
    const fresh = [];
    BADGES.forEach(b => {
      if (S.badges.includes(b.id)) return;
      const p = badgeProgress(b);
      if (p.cur >= p.n) {
        S.badges.push(b.id);
        const items = ITEMS.filter(i => i.quelle === 'set' && i.set === b.id);
        items.forEach(i => { if (!owns(i.id)) S.inventory.push(i.id); });
        fresh.push({ badge: b, items });
      }
    });
    if (fresh.length) save();
    return fresh;
  }

  // ── Klassenstufe der App (aus der zwischengespeicherten Config) ──
  function appClasses(key) {
    try {
      const cfg = JSON.parse(localStorage.getItem(CONFIG_KEY) || 'null');
      const app = cfg && Array.isArray(cfg.apps) && cfg.apps.find(a => String(a.datei || '').split('#')[0].split('/').pop() === key);
      return app && Array.isArray(app.klassen) ? app.klassen : [];
    } catch (e) { return []; }
  }

  // ── Profil ──────────────────────────────────────────────
  function cleanName(n) { return String(n || '').replace(/[<>"'`\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16); }

  function ensureProfile() {
    if (!S.profile) {
      S.profile = { name: '', look: randomLook(), klasse: null, klasseSeason: seasonId(), created: Date.now() };
      Object.entries(AVATAR.START || {}).forEach(([sl, id]) => { if (SLOTS[sl] && ITEM_BY_ID[id]) S.equipped[sl] = id; });
      importHistory();
    }
  }

  function setProfile({ name, klasse } = {}) {
    ensureProfile();
    if (name !== undefined)   S.profile.name = cleanName(name);
    if (klasse !== undefined) {
      S.profile.klasse = [5, 6, 7, 8, 9].includes(Number(klasse)) ? Number(klasse) : null;
      S.profile.klasseSeason = seasonId();         // Klasse gilt für dieses Schuljahr als bestätigt
    }
    save();
    return S.profile;
  }

  // ── Schuljahreswechsel ─────────────────────────────────
  /** true, wenn seit dem letzten 1. August die Klasse noch nicht bestätigt wurde */
  function needsClassCheck() {
    return !!(RULES.klassenAbfrage && S.profile && S.profile.name && S.profile.klasse &&
              S.profile.klasseSeason !== seasonId());
  }
  /** Vorschlag für die neue Klasse (eins höher, höchstens 9) */
  function suggestedClass() {
    const k = S.profile && S.profile.klasse;
    return k ? Math.min(9, k + 1) : null;
  }
  /** Klasse für das neue Schuljahr bestätigen (auch gleiche Klasse, z. B. bei Wiederholung) */
  function confirmClass(klasse) { return setProfile({ klasse }); }

  // Bisherige Ergebnisse (vor dem Pass) als Sterne-Fortschritt übernehmen – ohne XP
  /** Aussehen ändern, z. B. setLook({ frisur: 'bob' }) */
  function setLook(part) {
    ensureProfile();
    S.profile.look = cleanLook(Object.assign({}, S.profile.look, part));
    save();
    return S.profile.look;
  }
  /** Aussehen + angezogene Teile für die 3D-Figur. preview = { slot: id|null } zum Anprobieren */
  function look(preview) {
    const base = cleanLook(S.profile && S.profile.look);
    const eq = {};
    Object.keys(SLOTS).forEach(sl => { const it = equippedItem(sl); if (it) eq[sl] = it.id; });
    if (preview) Object.entries(preview).forEach(([sl, id]) => { if (!SLOTS[sl]) return; if (id && ITEM_BY_ID[id]) eq[sl] = id; else delete eq[sl]; });
    return Object.assign(base, { eq });
  }

  function importHistory() {
    try {
      const res = JSON.parse(localStorage.getItem(RESULTS_KEY) || '{}');
      Object.entries(res).forEach(([key, r]) => {
        (Array.isArray(r && r.history) ? r.history : []).forEach(h => {
          if (typeof h.t === 'number' && typeof h.p === 'number') recordMastery(key, h.p, dayKey(new Date(h.t)));
        });
      });
    } catch (e) {}
  }

  function recordMastery(key, pct, day) {
    const a = S.apps[key] || (S.apps[key] = { h: {}, best: 0, last: '', day: '', n: 0 });
    RULES.starPct.forEach(p => {
      if (pct >= p) {
        const list = a.h[p] || (a.h[p] = []);
        if (!list.includes(day) && list.length < RULES.starDays) list.push(day);
      }
    });
    a.best = Math.max(a.best || 0, pct);
    if (!a.last || day > a.last) a.last = day;
  }

  // ── XP vergeben ─────────────────────────────────────────
  /**
   * @param {object} r  { key, score, max, seconds }
   * @returns {object}  { xp, lines[], blocked, levelUp, level, chest, stars, starUp }
   */
  function award(r) {
    const res = awardIntern(r);
    meldeGewertet(r, res);
    return res;
  }

  // Jede gewertete Runde (auch gesperrte) für Erweiterungen wie „Mein Dorf“ melden.
  // Sitzt hier und nicht in navbar.js, weil award() auch aus der Warteschlange
  // (Ergebnis kam, bevor pass.js geladen war) aufgerufen wird.
  // Ist dorf-kern.js noch nicht da, wartet die Meldung in window.__lernDorfQueue.
  function meldeGewertet(r, res) {
    const max = Number(r.max) || 0;
    const sec = Number(r.seconds);
    const detail = {
      app:     String(r.key || ''),
      prozent: typeof res.pct === 'number' ? res.pct
               : (max > 0 ? Math.max(0, Math.min(100, Math.round((Number(r.score) || 0) / max * 100))) : 0),
      anzahl:  max,
      dauer:   isFinite(sec) ? Math.round(sec) : null,
      blocked: res.blocked || null,             // 'fast' = Durchklicken, 'invalid' = unbrauchbar
      inhalt:  Array.isArray(r.inhalt) ? r.inhalt.slice() : [],
      tag:     dayKey(),
    };
    if (!window.LernDorf) {
      const q = window.__lernDorfQueue = window.__lernDorfQueue || [];
      q.push(detail);
      if (q.length > 20) q.shift();
    }
    try { window.dispatchEvent(new CustomEvent('lernpass:gewertet', { detail })); } catch (e) {}
  }

  function awardIntern(r) {
    const score = Number(r.score) || 0, max = Number(r.max) || 0;
    const key = String(r.key || '');
    if (!key || max <= 0) return { xp: 0, lines: [], blocked: 'invalid' };

    ensureProfile();
    const pct = Math.max(0, Math.min(100, Math.round((score / max) * 100)));
    const sec = Number(r.seconds);
    const day = dayKey();
    const wk  = weekKey();
    const before = levelInfo();
    const season = seasonId();
    const starsBefore = starsFor(key);
    const chestsBefore = chestInfo().fromXp;

    if (S.today.day !== day) S.today = { day, xp: 0, good: false };
    const a = S.apps[key] || (S.apps[key] = { h: {}, best: 0, last: '', day: '', n: 0 });
    const prevBest = a.best || 0;
    const hadPlayed = !!a.last && !a.nurEndlos;       // nur Endlos-Läufe zählen nicht als „schon gespielt“ (kein Schein-Rekord)
    delete a.nurEndlos;
    const prevLow = hadPlayed && prevBest < 50;

    // 1) Durchklick-Schutz
    if (isFinite(sec) && (sec < RULES.minSeconds || (sec < RULES.rushSeconds && pct < RULES.goodPct))) {
      S.rounds++;
      save();
      return { xp: 0, lines: [], blocked: 'fast', pct };
    }

    // 2) Runden pro App und Tag
    if (a.day !== day) { a.day = day; a.n = 0; }
    a.n++;
    const capFactor = a.n <= RULES.fullRoundsPerApp ? 1 : a.n <= RULES.halfRoundsPerApp ? 0.5 : 0;

    // 3) Klassenstufe
    const kl = appClasses(key);
    const myKl = S.profile && S.profile.klasse;
    const classFactor = (myKl && kl.length && Math.max(...kl) < myKl) ? RULES.lowerClassFactor : 1;

    // 4) Bausteine
    const lines = [];
    const base = pct < RULES.lowPct ? RULES.baseXpLow : RULES.baseXp;
    const size = Math.min(1, max / RULES.fullSizeItems);
    const perf = Math.round(RULES.perfXpMax * Math.max(0, Math.min(1, (pct - RULES.perfFromPct) / (100 - RULES.perfFromPct))) * size);
    const record = hadPlayed && pct > prevBest && pct >= RULES.recordMinPct && size >= 0.5 ? RULES.recordXp : 0;

    let xp = (base + perf + record) * capFactor * classFactor;
    lines.push(`Runde geschafft +${base}`);
    if (perf)   lines.push(`${pct} % richtig +${perf}`);
    if (record) lines.push(`Neuer Rekord +${record}`);

    const good = pct >= RULES.goodPct;
    if (good && !S.today.good && capFactor > 0) {
      xp += RULES.firstOfDayXp;
      lines.push(`Erste gute Runde heute +${RULES.firstOfDayXp}`);
    }
    if (capFactor < 1)    lines.push(capFactor === 0 ? 'Heute genug in dieser App – probier eine andere!' : 'Oft gespielt heute: halbe XP');
    if (classFactor < 1)  lines.push('App für jüngere Klassen: halbe XP');

    // 5) Tages-Deckel
    if (S.today.xp >= RULES.dailySoftCap) { xp = xp / 2; lines.push('Viel geübt heute: halbe XP'); }
    xp = Math.round(xp);

    // 6) Übernehmen
    S.xp += xp;
    S.seasons[season] = (S.seasons[season] || 0) + xp;
    S.rounds++;
    S.today.xp += xp;
    if (good) S.goodRounds = (S.goodRounds || 0) + 1;
    if (pct >= 80 && (prevLow || (a.low && !S.flags.comeback))) S.flags.comeback = true;
    if (pct < 50) a.low = true;

    // Events: gute Tage zählen, Geschenk-Truhe nach erster guter Runde
    let eventGift = null;
    if (good) {
      activeEvents().forEach(ev => {
        const k = ev.id + '|' + season;
        const days = S.eventDays[k] || (S.eventDays[k] = []);
        if (!days.includes(day)) days.push(day);
        if (!S.eventGifts[k] && RULES.eventGiftChests > 0) {
          S.eventGifts[k] = true;
          S.bonusChests = (S.bonusChests || 0) + RULES.eventGiftChests;
          eventGift = ev;
        }
      });
    }
    if (good) {
      if (!S.today.good) { S.weeks[wk] = (S.weeks[wk] || 0) + 1; }
      S.today.good = true;
    } else if (S.weeks[wk] === undefined) {
      S.weeks[wk] = 0;                                 // aktiv, aber noch kein guter Tag
    }
    recordMastery(key, pct, day);
    pruneWeeks();
    save();

    const newBadges = checkBadges();
    const after = levelInfo();
    const levelChest = grantLevelChests(before, after);
    const starsAfter = starsFor(key);
    return {
      xp, lines, pct, blocked: null, eventGift, newBadges,
      levelUp: after.level > before.level ? after : null,
      level: after, levelChest,
      chest: chestInfo().fromXp > chestsBefore,
      stars: starsAfter,
      starUp: starsAfter > starsBefore ? starsAfter : 0,
      week: weekInfo(),
    };
  }

  function pruneWeeks() {
    const keys = Object.keys(S.weeks).sort();
    while (keys.length > 80) delete S.weeks[keys.shift()];
  }

  // ── XP im Endlos-Modus ──────────────────────────────────
  /**
   * Zählt nur der beste Lauf des Tages (je App): 1 XP je richtiger Antwort,
   * höchstens RULES.endlessXpCap. Wer später besser läuft, bekommt die Differenz.
   * Sterne gibt es hier nicht (die beruhen auf Prozent) – nur im Rundenmodus.
   * @param {object} r  { key, correct, seconds }
   * @returns {object}  wie award(), zusätzlich { endless, correct, dayBest, newDayBest, capReached }
   */
  function awardEndless(r) {
    const key = String(r.key || '');
    const correct = Math.max(0, Math.floor(Number(r.correct) || 0));
    if (!key) return { xp: 0, lines: [], blocked: 'invalid' };

    ensureProfile();
    const sec = Number(r.seconds);
    const day = dayKey(), wk = weekKey(), season = seasonId();
    const before = levelInfo();
    const chestsBefore = chestInfo().fromXp;
    if (S.today.day !== day) S.today = { day, xp: 0, good: false };

    if (isFinite(sec) && sec < RULES.minSeconds) {
      S.rounds++; save();
      return { xp: 0, lines: [], blocked: 'fast', endless: true, correct };
    }

    let e = S.endless[key];
    if (!e || e.day !== day) e = S.endless[key] = { day, best: 0, paid: 0, good: false };
    Object.keys(S.endless).forEach(k => { if (S.endless[k].day !== day) delete S.endless[k]; });   // alte Tage aufräumen

    const prevBest = e.best;
    const newDayBest = correct > prevBest;
    e.best = Math.max(prevBest, correct);
    const target = Math.min(RULES.endlessXpCap, e.best * RULES.endlessXpPerCorrect);
    let xp = Math.max(0, target - e.paid);
    e.paid += xp;
    const capReached = e.paid >= RULES.endlessXpCap;

    const lines = [];
    if (xp > 0) lines.push(prevBest > 0 ? `Neuer Tagesbestwert: ${correct} richtig +${xp}` : `${correct} richtige Antworten +${xp}`);
    else if (correct > 0 && capReached) lines.push('Endlos-XP für heute schon komplett – morgen gibt es wieder welche!');
    else if (correct > 0) lines.push(`Heute zählt dein bester Lauf (${e.best} richtig) – übertriff ihn für mehr XP!`);
    if (capReached && xp > 0) lines.push(`Tagesgrenze erreicht (${RULES.endlessXpCap} XP)`);
    if (correct === 0) lines.push('Beim nächsten Lauf klappt es besser!');

    if (xp > 0 && S.today.xp >= RULES.dailySoftCap) { xp = Math.round(xp / 2); lines.push('Viel geübt heute: halbe XP'); }

    // „Guter Tag“ fürs Wochenziel, einmal pro Tag und App
    const good = correct >= RULES.endlessGoodCorrect;
    let eventGift = null;
    if (good && !e.good) {
      e.good = true;
      S.goodRounds = (S.goodRounds || 0) + 1;
      activeEvents().forEach(ev => {
        const k = ev.id + '|' + season;
        const days = S.eventDays[k] || (S.eventDays[k] = []);
        if (!days.includes(day)) days.push(day);
        if (!S.eventGifts[k] && RULES.eventGiftChests > 0) {
          S.eventGifts[k] = true;
          S.bonusChests = (S.bonusChests || 0) + RULES.eventGiftChests;
          eventGift = ev;
        }
      });
    }
    if (good) {
      if (!S.today.good) S.weeks[wk] = (S.weeks[wk] || 0) + 1;
      S.today.good = true;
    } else if (S.weeks[wk] === undefined) {
      S.weeks[wk] = 0;
    }

    // App als „gespielt“ vermerken (für Abzeichen), ohne Sterne
    let a = S.apps[key];
    if (!a) a = S.apps[key] = { h: {}, best: 0, last: '', day: '', n: 0, nurEndlos: true };
    if (!a.last || day > a.last) a.last = day;

    S.xp += xp;
    S.seasons[season] = (S.seasons[season] || 0) + xp;
    S.rounds++;
    S.today.xp += xp;
    pruneWeeks();
    save();

    const newBadges = checkBadges();
    const after = levelInfo();
    const levelChest = grantLevelChests(before, after);
    return {
      xp, lines, blocked: null, endless: true, correct, dayBest: e.best, newDayBest, capReached,
      pct: good ? 100 : 0, eventGift, newBadges,
      levelUp: after.level > before.level ? after : null,
      level: after, levelChest,
      chest: chestInfo().fromXp > chestsBefore,
      stars: starsFor(key), starUp: 0,
      week: weekInfo(),
    };
  }

  // ── Lernstand für „Meine Themen“ ───────────────────────
  //  Die Lern-Apps melden über LernApps.saveResult({ …, inhalt }) mit, welcher Stoff
  //  geübt wurde (z. B. 'vok5:unit1/theme1', 'kopf5-mittel'). Gemerkt werden je Inhalt:
  //  n = gezählte Runden, best = beste %, last = Tag, p = die drei besten % (reicht für
  //  runden ≤ 3 und wirkt so auch rückwirkend, wenn die Lehrkraft die Schwelle ändert),
  //  f = freigeschaltet (bleibt dauerhaft).
  const LERN_MIN_AUFGABEN = 5;
  function erfuellt(e, sp) { return !!e && (e.f === true || (Array.isArray(e.p) && e.p.filter(x => x >= sp.schwelle).length >= sp.runden)); }
  /** Runde melden. ids: String oder Array, pct: 0–100, anzahl: Aufgaben der Runde, blocked: aus award() */
  function lernstandMelden(ids, pct, anzahl, blocked) {
    if (blocked === 'fast' || blocked === 'invalid') return false;
    if (!(Number(anzahl) >= LERN_MIN_AUFGABEN)) return false;
    pct = Math.max(0, Math.min(100, Math.round(Number(pct))));
    if (!Number.isFinite(pct)) return false;
    const liste = [...new Set((Array.isArray(ids) ? ids : [ids]).filter(x => typeof x === 'string' && INHALT_ID.test(x)))].slice(0, 10);
    if (!liste.length) return false;
    ensureProfile();
    const sp = readSettings().spiele, day = dayKey();
    liste.forEach(id => {
      const e = S.lernstand[id] || (S.lernstand[id] = { n: 0, best: 0, last: '', p: [] });
      e.n = (e.n || 0) + 1;
      e.best = Math.max(e.best || 0, pct);
      e.last = day;
      e.p = (Array.isArray(e.p) ? e.p : []).concat(pct).sort((a, b) => b - a).slice(0, 3);
      if (erfuellt(e, sp)) e.f = true;
    });
    save();
    return true;
  }
  /** Inhalt-IDs, die mit den aktuellen Einstellungen freigeschaltet sind */
  function freigeschaltet() {
    const sp = readSettings().spiele;
    let neu = false;
    const out = Object.keys(S.lernstand).filter(id => {
      const e = S.lernstand[id];
      if (!erfuellt(e, sp)) return false;
      if (e.f !== true) { e.f = true; neu = true; }
      return true;
    });
    if (neu) save();
    return out;
  }

  // ── Öffentliche API ─────────────────────────────────────
  window.LernPass = {
    RULES, LEVEL_TITLES, ITEMS, ITEM_BY_ID, BADGES, EVENTS, RARITY, SLOTS, AVATAR,
    get state()   { return S; },
    get settings(){ return readSettings(); },
    get lernstand() { return S.lernstand; },
    setSettings, setSpiele, lernstandMelden, freigeschaltet, activeEvents, seasonsOn, seasonId, levelXp, pastSeasons,
    openChest, equip, equippedItem, owns, ownedCount, checkBadges, badgeProgress, setLook, look,
    avatarHTML, cardBackground, itemPreviewHTML, itemSourceText,
    hasProfile()  { return !!(S.profile && S.profile.name); },
    profile()     { return S.profile; },
    setProfile, needsClassCheck, suggestedClass, confirmClass, levelInfo, xpForLevel, starsFor, starProgress, starsSummary, weekInfo, chestInfo,
    award, awardEndless, toast, showAvatar, celebrate,
    markLevelSeen() { S.seenLevel = levelInfo().level; save(); },
    onChange(fn)  { listeners.push(fn); },
    reset()       { S = blank(); save(); },
    _dayKey: dayKey, _weekKey: weekKey,
  };

  // ── Hinweis in Safari (iPad/iPhone): der Pass wohnt im App-Symbol ──
  function safariHint() {
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const app = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
    if (!ios || app || /admin\.html$/.test(location.pathname)) return;
    const KEY = 'lernwelt-safari-hinweis';
    try { if (localStorage.getItem(KEY) === dayKey()) return; } catch (e) { return; }
    const st = document.createElement('style');
    st.textContent = `
      #lw-safari{position:fixed;left:50%;top:max(10px,env(safe-area-inset-top));transform:translateX(-50%);z-index:10004;
        width:min(94vw,520px);background:#fff8e6;color:#2a1d00;border:2px solid #e6a817;border-radius:16px;
        box-shadow:0 12px 36px rgba(0,0,0,.35);padding:.75rem .9rem;font:700 .86rem/1.4 'Nunito','Segoe UI',sans-serif;}
      #lw-safari b{font-weight:900;}
      #lw-safari .row{display:flex;gap:.7rem;align-items:flex-start;}
      #lw-safari .ic{font-size:1.7rem;line-height:1;}
      #lw-safari .small{font-size:.74rem;color:#6b5a2a;margin-top:.35rem;font-weight:700;}
      #lw-safari button{margin-top:.55rem;background:#e6a817;color:#2a1d00;border:0;border-radius:10px;padding:.45rem .9rem;
        font:900 .84rem 'Nunito','Segoe UI',sans-serif;cursor:pointer;}`;
    document.head.appendChild(st);
    const el = document.createElement('div');
    el.id = 'lw-safari';
    el.setAttribute('role', 'alert');
    el.innerHTML = `<div class="row"><span class="ic">🧭</span><div>
      <b>Du bist gerade in Safari.</b> Dein Lernwelt-Pass wohnt im <b>Lernwelt-Symbol</b> auf dem Home-Bildschirm –
      was du hier übst, zählt dort nicht. Öffne lieber das Symbol und scanne QR-Codes dort mit <b>📷 QR scannen</b>.
      <div class="small">Noch kein Symbol? Teilen-Knopf → „Zum Home-Bildschirm“.</div>
      <button type="button">Verstanden</button></div></div>`;
    el.querySelector('button').onclick = () => { try { localStorage.setItem(KEY, dayKey()); } catch (e) {} el.remove(); };
    document.body.appendChild(el);
  }
  if (document.body) safariHint(); else document.addEventListener('DOMContentLoaded', safariHint);

  // Ergebnisse, die navbar.js vor dem Laden dieses Skripts gemeldet hat
  const q = window.__lernPassQueue;
  if (Array.isArray(q)) {
    q.splice(0).forEach(r => {
      const res = award(r);
      toast(res);
      if (r.inhalt) lernstandMelden(r.inhalt, r.max > 0 ? (r.score / r.max) * 100 : 0, r.max, res.blocked);
    });
  }
  try { window.dispatchEvent(new CustomEvent('lernpass:ready')); } catch (e) {}
  }
})();
