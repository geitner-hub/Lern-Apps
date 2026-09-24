// ═══════════════════════════════════════════════════════
//  Lernwelt – pass.js   (Lernwelt-Pass: XP, Level, Serie, Sterne)
//
//  Wird geladen von:
//    - index.html   (<script src="pass.js"></script>)
//    - jeder App automatisch über navbar.js
//
//  Alle Daten bleiben im localStorage des Geräts ('lernwelt-pass').
//  Sicherung/Umzug über einen Code bzw. QR (exportCode / parseCode).
//
//  ⚙ Stellschrauben stehen gesammelt in RULES (unten).
// ═══════════════════════════════════════════════════════

(function () {
  'use strict';
  if (window.LernPass) return;           // doppeltes Laden verhindern

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
    chestEveryXp:    250,   // alle X XP eine Truhe (Öffnen kommt später)
    starPct:         [60, 80, 90],  // Bronze, Silber, Gold
    starDays:        2,     // an so vielen verschiedenen Tagen erreicht
  };

  const LEVEL_TITLES = [
    'Neuling', 'Spurensucher', 'Pfadfinder', 'Kartenleser', 'Wegfinder',
    'Kartograf', 'Navigator', 'Kapitän', 'Weltenbummler', 'Entdecker',
    'Meister-Entdecker', 'Legende',
  ];

  const AVATARS = ['🦊','🐼','🐯','🦁','🐸','🐙','🦉','🐺','🐨','🐵','🦄','🐲',
                   '🐧','🦖','🐬','🦅','🐝','🐢','🦈','🐱','🐶','🐰','🦝','🐻'];

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

  // ── Speicher ────────────────────────────────────────────
  function blank() {
    return {
      v: VERSION,
      profile: null,             // { name, avatar, klasse, created }
      xp: 0,
      rounds: 0,
      today: { day: '', xp: 0, good: false },
      weeks: {},                 // { 'YYYY-MM-DD'(Montag): Anzahl guter Tage }
      weekDays: {},              // { Montag: ['YYYY-MM-DD', …] } nur aktuelle + letzte Woche
      apps: {},                  // { key: { h:{60:[],80:[],90:[]}, best, last, day, n } }
      seenLevel: 1,
      chestsOpened: 0,           // für spätere Truhen
      inventory: [],             // spätere Cosmetics (IDs)
      equipped: {},              // spätere Cosmetics (Slot → ID)
      badges: [],                // spätere Abzeichen (IDs)
    };
  }

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      if (!raw || typeof raw !== 'object') return blank();
      return { ...blank(), ...raw, today: { ...blank().today, ...(raw.today || {}) } };
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

  // ── Level ───────────────────────────────────────────────
  // Gesamt-XP für Level n:  100·(n−1) + 25·(n−1)(n−2)   → L2:100, L3:250, L4:450, L5:700 …
  function xpForLevel(n) { return 100 * (n - 1) + 25 * (n - 1) * (n - 2); }
  function levelInfo(xp = S.xp) {
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

  // ── Truhen (Vorbereitung) ───────────────────────────────
  function chestInfo() {
    const earned = Math.floor(S.xp / RULES.chestEveryXp);
    return { earned, opened: S.chestsOpened, available: Math.max(0, earned - S.chestsOpened),
             nextAt: (earned + 1) * RULES.chestEveryXp, progress: Math.round(((S.xp % RULES.chestEveryXp) / RULES.chestEveryXp) * 100) };
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
      S.profile = { name: '', avatar: '🧭', klasse: null, created: Date.now() };
      importHistory();
    }
  }

  function setProfile({ name, avatar, klasse } = {}) {
    ensureProfile();
    if (name !== undefined)   S.profile.name = cleanName(name);
    if (avatar !== undefined && AVATARS.includes(avatar)) S.profile.avatar = avatar;
    if (klasse !== undefined) S.profile.klasse = [5, 6, 7, 8, 9].includes(Number(klasse)) ? Number(klasse) : null;
    save();
    return S.profile;
  }

  // Bisherige Ergebnisse (vor dem Pass) als Sterne-Fortschritt übernehmen – ohne XP
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
    const starsBefore = starsFor(key);
    const chestsBefore = chestInfo().earned;

    if (S.today.day !== day) S.today = { day, xp: 0, good: false };
    const a = S.apps[key] || (S.apps[key] = { h: {}, best: 0, last: '', day: '', n: 0 });
    const prevBest = a.best || 0;
    const hadPlayed = !!a.last;

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
    S.rounds++;
    S.today.xp += xp;
    if (good) {
      if (!S.today.good) { S.weeks[wk] = (S.weeks[wk] || 0) + 1; }
      S.today.good = true;
    } else if (S.weeks[wk] === undefined) {
      S.weeks[wk] = 0;                                 // aktiv, aber noch kein guter Tag
    }
    recordMastery(key, pct, day);
    pruneWeeks();
    save();

    const after = levelInfo();
    const starsAfter = starsFor(key);
    return {
      xp, lines, pct, blocked: null,
      levelUp: after.level > before.level ? after : null,
      level: after,
      chest: chestInfo().earned > chestsBefore,
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
  //  Format:  LW1.<base64url(JSON)>.<Prüfsumme>
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
      v: VERSION,
      p: [S.profile.name, S.profile.avatar, S.profile.klasse || 0],
      x: S.xp, r: S.rounds, o: S.chestsOpened,
      w: Object.fromEntries(wkeys.map(k => [k.replace(/-/g, ''), S.weeks[k]])),
      a: apps,
      i: S.inventory, e: S.equipped, b: S.badges,
      t: dayKey().replace(/-/g, ''),
    };
    const body = b64urlEncode(JSON.stringify(payload));
    return 'LW1.' + body + '.' + fnv('lernwelt|' + body);
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
      if (parts.length !== 3 || parts[0] !== 'LW1') return { ok: false, error: 'Das ist kein gültiger Lernwelt-Code.' };
      if (fnv('lernwelt|' + parts[1]) !== parts[2]) return { ok: false, error: 'Der Code ist beschädigt oder unvollständig.' };
      const d = JSON.parse(b64urlDecode(parts[1]));
      if (!d || d.v !== 1 || !Array.isArray(d.p)) return { ok: false, error: 'Unbekanntes Code-Format.' };
      const ymd = s => String(s).replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3');
      const restored = blank();
      restored.profile = { name: cleanName(d.p[0]), avatar: AVATARS.includes(d.p[1]) ? d.p[1] : '🧭',
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
      restored.inventory = Array.isArray(d.i) ? d.i.filter(x => typeof x === 'string').slice(0, 500) : [];
      restored.equipped  = d.e && typeof d.e === 'object' ? d.e : {};
      restored.badges    = Array.isArray(d.b) ? d.b.filter(x => typeof x === 'string').slice(0, 200) : [];
      restored.seenLevel = levelInfo(restored.xp).level;
      return {
        ok: true,
        preview: { name: restored.profile.name || 'Ohne Namen', avatar: restored.profile.avatar,
                   level: levelInfo(restored.xp).level, title: levelInfo(restored.xp).title, xp: restored.xp,
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
    if (res.blocked === 'fast') {
      html = `<div class="t-xp" style="color:#f87171">0 XP</div>
              <div class="t-lines">Das ging sehr schnell. Nimm dir Zeit für die Aufgaben – dann gibt es XP!</div>`;
    } else {
      const lv = res.level;
      html = `<div class="t-xp">+${res.xp} XP</div>
              <div class="t-lines">${res.lines.map(esc).join('<br>')}</div>
              ${res.levelUp ? `<div class="t-big">🎉 Level ${lv.level}: ${esc(lv.title)}!</div>` : ''}
              ${res.starUp ? `<div class="t-big">${['', '🥉 Bronze', '🥈 Silber', '🥇 Gold'][res.starUp]}-Stern verdient!</div>` : ''}
              ${res.chest ? `<div class="t-big">🎁 Neue Truhe verdient!</div>` : ''}
              <div class="t-bar"><div class="t-fill" style="width:${lv.pct}%"></div></div>
              <div class="t-lines">Level ${lv.level} · ${lv.into} / ${lv.need} XP</div>`;
    }
    el.innerHTML = html;
    requestAnimationFrame(() => el.classList.add('show'));
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), res.levelUp || res.starUp || res.chest ? 6500 : 4200);
  }

  // ── Öffentliche API ─────────────────────────────────────
  window.LernPass = {
    RULES, LEVEL_TITLES, AVATARS,
    get state()   { return S; },
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
})();
