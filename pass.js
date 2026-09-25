// ═══════════════════════════════════════════════════════
//  Lernwelt – pass.js   (Lernwelt-Pass: XP, Level, Serie, Sterne)
//
//  Wird geladen von:
//    - index.html / admin.html / pass-karte.html
//    - jeder App automatisch über navbar.js
//
//  Inhalte (Titel, Abzeichen, Cosmetics, Events) stehen in der reinen
//  Datendatei lernwelt-inhalte.json. Sobald sie geladen ist, steht
//  window.LernPass bereit und das Ereignis 'lernpass:ready' wird ausgelöst.
//  Einstellungen (Saison-Modus, aktive Events) kommen aus config.json → "pass".
//
//  Alle Daten bleiben im localStorage des Geräts ('lernwelt-pass').
//  Sicherung/Umzug über einen Code bzw. QR (exportCode / parseCode).
//
//  ⚙ Stellschrauben stehen gesammelt in RULES (unten).
// ═══════════════════════════════════════════════════════

(function () {
  'use strict';
  if (window.LernPass || window.__lernPassLoading) return;   // doppeltes Laden verhindern
  window.__lernPassLoading = true;

  // Inhalte laden (liegt im selben Ordner wie diese Datei); offline aus dem Zwischenspeicher
  const CONTENT_CACHE = 'lernwelt-inhalte-cache';
  const here = (document.currentScript && document.currentScript.src) || location.href;
  const contentFile = new URL('lernwelt-inhalte.json', here).href;
  fetch(contentFile, { cache: 'no-cache' })
    .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(c => { try { localStorage.setItem(CONTENT_CACHE, JSON.stringify(c)); } catch (e) {} return c; })
    .catch(() => { try { return JSON.parse(localStorage.getItem(CONTENT_CACHE) || '{}'); } catch (e) { return {}; } })
    .then(start);

  function start(C) {

  const STORE_KEY   = 'lernwelt-pass';
  const RESULTS_KEY = 'lern-apps-results';
  const CONFIG_KEY  = 'lernwelt-config-cache';
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
      dust: 0,                   // Sternenstaub (wenn der Pool leer ist)
      inventory: [],             // Cosmetics (IDs)
      equipped: {},              // Slot → ID
      badges: [],                // Abzeichen (IDs)
      flags: {},                 // z. B. comeback
      eventDays: {},             // { 'halloween|2026/27': ['YYYY-MM-DD', …] }
      eventGifts: {},            // { 'halloween|2026/27': true }
    };
  }

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      if (!raw || typeof raw !== 'object') return blank();
      const st = { ...blank(), ...raw, today: { ...blank().today, ...(raw.today || {}) } };
      if (st.profile) st.profile.look = cleanLook(st.profile.look);
      return st;
    } catch (e) { return blank(); }
  }

  let S = load();
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
  function readSettings() {
    if (SETTINGS) return SETTINGS;
    let raw = null;
    try { const cfg = JSON.parse(localStorage.getItem(CONFIG_KEY) || 'null'); raw = cfg && cfg.pass; } catch (e) {}
    return sanitizeSettings(raw);
  }
  function sanitizeSettings(raw) {
    const out = { seasons: false, events: [] };
    if (raw && typeof raw === 'object') {
      out.seasons = raw.seasons === true;
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
  function chestInfo() {
    const fromXp = Math.floor(S.xp / RULES.chestEveryXp);
    const earned = fromXp + (S.bonusChests || 0);
    return { earned, fromXp, bonus: S.bonusChests || 0, opened: S.chestsOpened, available: Math.max(0, earned - S.chestsOpened),
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

  /** Öffnet eine Truhe. → { ok, item, event, dust } */
  function openChest() {
    if (chestInfo().available <= 0) return { ok: false };
    const evIds = activeEvents().map(e => e.id);
    const eventPool = ITEMS.filter(i => i.quelle === 'event' && evIds.includes(i.event) && !owns(i.id));
    const normalPool = ITEMS.filter(i => i.quelle === 'truhe' && !owns(i.id));
    let item = null;
    if (eventPool.length && (Math.random() < RULES.eventChestShare || !normalPool.length)) item = pickAny(eventPool);
    else if (normalPool.length) item = pickByRarity(normalPool);
    S.chestsOpened++;
    if (!item) { S.dust += 1; save(); return { ok: true, item: null, dust: 1 }; }
    const clean = ITEM_BY_ID[item.id];
    S.inventory.push(clean.id);
    save();
    return { ok: true, item: clean, event: clean.quelle === 'event' ? EVENTS.find(e => e.id === clean.event) : null };
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
      S.profile = { name: '', look: randomLook(), klasse: null, created: Date.now() };
      Object.entries(AVATAR.START || {}).forEach(([sl, id]) => { if (SLOTS[sl] && ITEM_BY_ID[id]) S.equipped[sl] = id; });
      importHistory();
    }
  }

  function setProfile({ name, klasse } = {}) {
    ensureProfile();
    if (name !== undefined)   S.profile.name = cleanName(name);
    if (klasse !== undefined) S.profile.klasse = [5, 6, 7, 8, 9].includes(Number(klasse)) ? Number(klasse) : null;
    save();
    return S.profile;
  }

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
    const hadPlayed = !!a.last;
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
    const starsAfter = starsFor(key);
    return {
      xp, lines, pct, blocked: null, eventGift, newBadges,
      levelUp: after.level > before.level ? after : null,
      level: after,
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

  // ── Sicherungs-Code ─────────────────────────────────────
  //  Format:  LW2.<base64url(JSON)>.<Prüfsumme>   (LW1 wird weiterhin gelesen)
  //  Die Prüfsumme erkennt Tippfehler und einfaches Herumbasteln –
  //  sie ist bewusst KEIN Kopierschutz (alles liegt ohnehin auf dem Gerät).
  function fnv(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return (h >>> 0).toString(36);
  }
  function b64urlEncode(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = ''; bytes.forEach(b => bin += String.fromCharCode(b));
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function b64urlDecode(s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    const bin = atob(s);
    return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
  }

  function exportCode() {
    ensureProfile();
    const apps = {};
    Object.entries(S.apps).forEach(([k, a]) => {
      const h = RULES.starPct.map(p => (a.h && a.h[p] ? a.h[p].length : 0)).join('');
      if (h !== '000' || a.best) apps[k] = [h, a.best || 0, (a.last || '').replace(/-/g, '')];
    });
    const wkeys = Object.keys(S.weeks).sort().slice(-30);
    const payload = {
      v: 2,
      p: [S.profile.name, LOOK_KEYS.map(k => S.profile.look[k]), S.profile.klasse || 0],
      x: S.xp, r: S.rounds, o: S.chestsOpened,
      w: Object.fromEntries(wkeys.map(k => [k.replace(/-/g, ''), S.weeks[k]])),
      a: apps,
      i: S.inventory, e: S.equipped, b: S.badges,
      z: S.seasons, g: S.goodRounds || 0, bc: S.bonusChests || 0, sd: S.dust || 0,
      f: S.flags.comeback ? 1 : 0,
      eg: Object.keys(S.eventGifts),
      ed: Object.fromEntries(Object.entries(S.eventDays).map(([k, v]) => [k, v.length])),
      t: dayKey().replace(/-/g, ''),
    };
    const body = b64urlEncode(JSON.stringify(payload));
    return 'LW2.' + body + '.' + fnv('lernwelt|' + body);
  }

  function restoreUrl() {
    return new URL('./', location.href).href + '#pass=' + exportCode();
  }

  /** Prüft einen Code. Gibt { ok, error } oder { ok, preview, apply() } zurück. */
  function parseCode(code) {
    try {
      code = String(code || '').trim();
      const m = code.match(/#pass=([^\s]+)$/);          // ganze URL eingefügt?
      if (m) code = decodeURIComponent(m[1]);
      const parts = code.split('.');
      if (parts.length !== 3 || !['LW1', 'LW2'].includes(parts[0])) return { ok: false, error: 'Das ist kein gültiger Lernwelt-Code.' };
      if (fnv('lernwelt|' + parts[1]) !== parts[2]) return { ok: false, error: 'Der Code ist beschädigt oder unvollständig.' };
      const d = JSON.parse(b64urlDecode(parts[1]));
      if (!d || ![1, 2].includes(d.v) || !Array.isArray(d.p)) return { ok: false, error: 'Unbekanntes Code-Format.' };
      const ymd = s => String(s).replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3');
      const restored = blank();
      const lk = Array.isArray(d.p[1]) ? Object.fromEntries(LOOK_KEYS.map((k, i) => [k, d.p[1][i]])) : null;
      restored.profile = { name: cleanName(d.p[0]), look: lk ? cleanLook(lk) : randomLook(),
                           klasse: [5, 6, 7, 8, 9].includes(d.p[2]) ? d.p[2] : null, created: Date.now() };
      restored.xp = Math.max(0, Math.min(1e6, Math.floor(Number(d.x) || 0)));
      restored.rounds = Math.max(0, Math.floor(Number(d.r) || 0));
      restored.chestsOpened = Math.max(0, Math.floor(Number(d.o) || 0));
      Object.entries(d.w || {}).forEach(([k, n]) => { if (/^\d{8}$/.test(k)) restored.weeks[ymd(k)] = Math.max(0, Math.min(7, Number(n) || 0)); });
      Object.entries(d.a || {}).forEach(([k, v]) => {
        if (!Array.isArray(v) || typeof k !== 'string' || k.length > 120) return;
        const h = {}; const last = ymd(v[2] || '');
        RULES.starPct.forEach((p, i) => {
          const n = Math.min(RULES.starDays, Number(String(v[0])[i]) || 0);
          h[p] = Array.from({ length: n }, (_, j) => 'import-' + j);   // Tage als Platzhalter
        });
        restored.apps[k] = { h, best: Math.max(0, Math.min(100, Number(v[1]) || 0)), last: /^\d{4}-\d{2}-\d{2}$/.test(last) ? last : '', day: '', n: 0 };
      });
      restored.inventory = Array.isArray(d.i) ? [...new Set(d.i.filter(x => typeof x === 'string' && ITEM_BY_ID[x]))].slice(0, 500) : [];
      restored.equipped  = {};
      if (d.e && typeof d.e === 'object') Object.entries(d.e).forEach(([sl, id]) => {
        if (SLOTS[sl] && ITEM_BY_ID[id] && ITEM_BY_ID[id].slot === sl && (restored.inventory.includes(id) || ITEM_BY_ID[id].quelle === 'start')) restored.equipped[sl] = id;
      });
      restored.badges    = Array.isArray(d.b) ? [...new Set(d.b.filter(x => typeof x === 'string' && BADGES.some(b => b.id === x)))] : [];
      const num = (v, max) => Math.max(0, Math.min(max, Math.floor(Number(v) || 0)));
      if (d.z && typeof d.z === 'object') Object.entries(d.z).forEach(([k, v]) => { if (/^\d{4}\/\d{2}$/.test(k)) restored.seasons[k] = num(v, 1e6); });
      else restored.seasons[seasonId()] = restored.xp;             // alte Codes ohne Saison-Daten
      restored.goodRounds = num(d.g, 1e6);
      restored.bonusChests = num(d.bc, 1000);
      restored.dust = num(d.sd, 1e5);
      restored.flags = d.f ? { comeback: true } : {};
      (Array.isArray(d.eg) ? d.eg : []).forEach(k => { if (typeof k === 'string' && /^[a-z-]+\|\d{4}\/\d{2}$/.test(k)) restored.eventGifts[k] = true; });
      if (d.ed && typeof d.ed === 'object') Object.entries(d.ed).forEach(([k, n]) => {
        if (/^[a-z-]+\|\d{4}\/\d{2}$/.test(k)) restored.eventDays[k] = Array.from({ length: num(n, 60) }, (_, j) => 'import-' + j);
      });
      restored.chestsOpened = Math.min(restored.chestsOpened, Math.floor(restored.xp / RULES.chestEveryXp) + restored.bonusChests);
      restored.seenLevel = 1;
      return {
        ok: true,
        preview: { name: restored.profile.name || 'Ohne Namen', look: Object.assign({}, restored.profile.look, { eq: Object.assign({}, restored.equipped) }),
                   level: levelInfo(seasonsOn() ? (restored.seasons[seasonId()] || 0) : restored.xp).level,
                   title: levelInfo(seasonsOn() ? (restored.seasons[seasonId()] || 0) : restored.xp).title, xp: restored.xp,
                   date: ymd(d.t || '') },
        apply() { S = restored; save(); },
      };
    } catch (e) {
      return { ok: false, error: 'Der Code konnte nicht gelesen werden.' };
    }
  }

  // ── Anzeige in Apps (Toast) ─────────────────────────────
  function toast(res) {
    if (!document.body || !res) return;
    let el = document.getElementById('lw-pass-toast');
    if (!el) {
      const st = document.createElement('style');
      st.textContent = `
        #lw-pass-toast{position:fixed;top:1rem;left:50%;transform:translate(-50%,-140%);z-index:10001;
          background:#1b1929;color:#f1f0fb;border:1px solid rgba(230,168,23,.45);border-radius:16px;
          box-shadow:0 12px 40px rgba(0,0,0,.45);padding:.7rem 1.1rem;min-width:220px;max-width:min(92vw,380px);
          font-family:'Nunito','Segoe UI',sans-serif;transition:transform .35s cubic-bezier(.2,.9,.3,1.2);text-align:center;}
        #lw-pass-toast.show{transform:translate(-50%,0);}
        #lw-pass-toast .t-xp{font-family:'Fredoka One','Nunito',sans-serif;font-size:1.5rem;color:#e6a817;line-height:1.1;}
        #lw-pass-toast .t-lines{font-size:.74rem;color:rgba(241,240,251,.65);margin-top:.25rem;line-height:1.35;}
        #lw-pass-toast .t-big{font-weight:900;font-size:.95rem;margin-top:.35rem;}
        #lw-pass-toast .t-bar{height:6px;border-radius:99px;background:rgba(255,255,255,.1);margin-top:.45rem;overflow:hidden;}
        #lw-pass-toast .t-fill{height:100%;background:linear-gradient(90deg,#6366f1,#e6a817);border-radius:99px;transition:width .6s ease;}
        @media (prefers-reduced-motion: reduce){#lw-pass-toast{transition:none;}}`;
      document.head.appendChild(st);
      el = document.createElement('div');
      el.id = 'lw-pass-toast';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    let html;
    if (res.notice) {
      html = (res.newBadges || []).map(n => `<div class="t-big">${esc(n.badge.icon)} Abzeichen „${esc(n.badge.name)}“!${n.items.length ? ' +' + n.items.length + ' Set-Teil' + (n.items.length > 1 ? 'e' : '') : ''}</div>`).join('');
    } else if (res.blocked === 'fast') {
      html = `<div class="t-xp" style="color:#f87171">0 XP</div>
              <div class="t-lines">Das ging sehr schnell. Nimm dir Zeit für die Aufgaben – dann gibt es XP!</div>`;
    } else {
      const lv = res.level;
      html = `<div class="t-xp">+${res.xp} XP</div>
              <div class="t-lines">${res.lines.map(esc).join('<br>')}</div>
              ${res.levelUp ? `<div class="t-big">🎉 Level ${lv.level}: ${esc(lv.title)}!</div>` : ''}
              ${res.starUp ? `<div class="t-big">${['', '🥉 Bronze', '🥈 Silber', '🥇 Gold'][res.starUp]}-Stern verdient!</div>` : ''}
              ${res.chest ? `<div class="t-big">🎁 Neue Truhe verdient!</div>` : ''}
              ${res.eventGift ? `<div class="t-big">${esc(res.eventGift.icon)} ${esc(res.eventGift.geschenk || res.eventGift.name + '-Geschenk')}: eine Truhe für dich!</div>` : ''}
              ${(res.newBadges || []).map(n => `<div class="t-big">${esc(n.badge.icon)} Abzeichen „${esc(n.badge.name)}“!${n.items.length ? ' +' + n.items.length + ' Set-Teil' + (n.items.length > 1 ? 'e' : '') : ''}</div>`).join('')}
              <div class="t-bar"><div class="t-fill" style="width:${lv.pct}%"></div></div>
              <div class="t-lines">Level ${lv.level} · ${lv.into} / ${lv.need} XP</div>`;
    }
    el.innerHTML = html;
    requestAnimationFrame(() => el.classList.add('show'));
    clearTimeout(el._t);
    const big = res.levelUp || res.starUp || res.chest || res.eventGift || (res.newBadges && res.newBadges.length);
    el._t = setTimeout(() => el.classList.remove('show'), big ? 6500 : 4200);
  }

  // ── Darstellung ─────────────────────────────────────────
  const escA = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  /** Avatar als Bild (wird von avatar3d.js gezeichnet und zwischengespeichert) */
  function avatarHTML(opts = {}) {
    let cached = '';
    try { cached = localStorage.getItem('lernwelt-avatar-bild') || ''; } catch (e) {}
    if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(cached)) cached = '';
    const lvl = opts.level ? `<span class="pass-lvl">${escA(opts.level)}</span>` : '';
    return `<div class="pass-avatar${opts.cls ? ' ' + opts.cls : ''}">` +
      (cached ? `<img data-avatar-bild="portrait" alt="" src="${cached}">` : `<img data-avatar-bild="portrait" alt="" hidden><span class="pa-fb">🧭</span>`) +
      lvl + `</div>`;
  }
  function cardBackground(preview) {
    const bg = preview !== undefined ? preview : equippedItem('hintergrund');
    return bg && bg.css ? bg.css : '';
  }
  /** Vorschau eines Teils. Hintergründe direkt, alles andere zeichnet avatar3d.js nach. */
  function itemPreviewHTML(it) {
    if (!it) return '';
    if (it.slot === 'hintergrund') return `<span class="it-prev it-bg" style="background:${escA(it.css || '')}">${it.deko || ''}</span>`;
    return `<span class="it-prev it-3d" data-avatar-thumb="${escA(it.id)}"></span>`;
  }
  function itemSourceText(it) {
    if (it.quelle === 'truhe') return 'Aus Truhen';
    if (it.quelle === 'start') return 'Startausstattung';
    if (it.quelle === 'event') { const e = EVENTS.find(x => x.id === it.event); return e ? `${e.icon} Nur im ${e.titel || e.name + '-Event'}` : 'Event'; }
    if (it.quelle === 'set')   { const b = BADGES.find(x => x.id === it.set); return b ? `${b.icon} Abzeichen „${b.name}“` : 'Abzeichen'; }
    return '';
  }
  function pastSeasons() {
    const cur = seasonId();
    return Object.entries(S.seasons).filter(([k, v]) => k < cur && v > 0).sort((a, b) => b[0].localeCompare(a[0]))
      .map(([k, v]) => ({ id: k, xp: v, ...levelInfo(v) }));
  }

  // ── Öffentliche API ─────────────────────────────────────
  window.LernPass = {
    RULES, LEVEL_TITLES, ITEMS, ITEM_BY_ID, BADGES, EVENTS, RARITY, SLOTS, AVATAR,
    get state()   { return S; },
    get settings(){ return readSettings(); },
    setSettings, activeEvents, seasonsOn, seasonId, levelXp, pastSeasons,
    openChest, equip, equippedItem, owns, ownedCount, checkBadges, badgeProgress, setLook, look,
    avatarHTML, cardBackground, itemPreviewHTML, itemSourceText,
    hasProfile()  { return !!(S.profile && S.profile.name); },
    profile()     { return S.profile; },
    setProfile, levelInfo, xpForLevel, starsFor, starProgress, starsSummary, weekInfo, chestInfo,
    award, toast, exportCode, restoreUrl, parseCode,
    markLevelSeen() { S.seenLevel = levelInfo().level; save(); },
    onChange(fn)  { listeners.push(fn); },
    reset()       { S = blank(); save(); },
    _dayKey: dayKey, _weekKey: weekKey,
  };

  // Ergebnisse, die navbar.js vor dem Laden dieses Skripts gemeldet hat
  const q = window.__lernPassQueue;
  if (Array.isArray(q)) { q.splice(0).forEach(r => toast(award(r))); }
  try { window.dispatchEvent(new CustomEvent('lernpass:ready')); } catch (e) {}
  }
})();
