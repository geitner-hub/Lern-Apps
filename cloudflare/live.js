// ═══════════════════════════════════════════════════════
//  Lernwelt – Cloudflare Worker, Teil „Live-Abfrage“  (live.js, Aktionsplan „Live-Abfrage im Unterricht“)
//
//  Kurzes Klassen-Quiz für 2–10 Minuten: Die Lehrkraft startet im Unterrichtsmodus einen Raum, die Kinder
//  kommen per QR-Code (apps/typen/live.html?raum=CODE) hinein und antworten anonym. Keine WebSockets:
//  alle iPads fragen alle 2 Sekunden nach dem Stand.
//
//  Datenschutz: keine Namen, keine Gruppen-Zuordnung. Die Teilnehmer-Kennung ist zufällig je Raum (nur im Tab
//  des iPads) und verhindert nur doppelte Antworten. Raum, Einzelantworten und Kennungen sind nach „Beenden“
//  weg, spätestens nach LIVE_RAUM_STUNDEN (Cron). Gespeichert bleiben nur die Quizze der Lehrkraft und – nur
//  wenn beim Quiz „Rückblick“ angehakt ist – eine anonyme Zusammenfassung je Frage (Anzahl, % richtig,
//  Verteilung; Ein-Wort-Antworten nur als Anzahl, nie als Text).
//
//  Tabellen in SYNC_DB (legen sich selbst an):
//    live_quizze     – gespeicherte Quizze (Titel, Fach, Klasse, Fragen, Optionen)
//    live_raeume     – offene Räume (Code, Quiz-Kopie, aktuelle Frage, Runde, Phase)
//    live_antworten  – Einzelantworten; frage = -1 ist der Beitritt (zählt „18 von 24“)
//    live_rueckblick – anonyme Zusammenfassungen (nur mit Haken „Rückblick“)
//
//  Endpunkte
//   Kinder (ohne Schlüssel)
//    GET  /live/raum/CODE?k=<kennung>&rev=<n>   → Frage ohne Lösung, Phase, eigene Antwort (Lösung erst beim Aufdecken)
//    POST /live/beitreten { raum, kennung }
//    POST /live/antwort   { raum, kennung, frage, runde, antwort }   → { ok } bzw. im Modus „Selbst“ { ok, richtig }
//   Lehrkraft (Header Authorization: Bearer <Anmelde-Schlüssel>; Haupt- oder Kollegen-Zugang, jeder nur eigene Räume)
//    POST /live/raum        { quizId } oder { quiz: { titel, fragen, optionen } }  → { code }
//    POST /live/raeume      {}                         → { raeume: [{ code, titel, phase, modus, erstellt, teilnehmer }] }
//    GET  /live/raum/CODE/stand                        → Zähler, Verteilung, Fragen mit Lösung
//    POST /live/raum/CODE/phase { aktion, … }          → start | aufdecken | zweite | loesung | weiter | markieren |
//                                                         ausblenden | anhaengen | ergebnis
//    POST /live/raum/CODE/ende                         → Rückblick schreiben (falls angehakt), Raum und Antworten löschen
//    POST /live/quizze      { archiv? }                → Liste der Quizze (Kollegen: nur nicht archivierte, ohne Inhalt)
//   Nur Hauptzugang
//    POST /live/quiz/lesen { id } · /live/quiz/speichern { id?, titel, fach, klasse, fragen, optionen }
//    POST /live/quiz/archivieren { id, archiviert } · /live/quiz/loeschen { id }
//    POST /live/rueckblicke { quizId? } · /live/rueckblick/loeschen { id }
//
//  Aufräumen: liveAufraeumen(env) im täglichen Cron (worker.js).
//  Alle Namen beginnen mit „live“, damit sich nichts mit worker.js überschneidet.
// ═══════════════════════════════════════════════════════

const LIVE_ZEICHEN        = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';  // ohne Verwechsler 0/O, 1/I/L
const LIVE_CODE           = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;
const LIVE_KENNUNG        = /^[0-9a-f]{32}$/;
const LIVE_ID             = /^[0-9a-f]{16}$/;
const LIVE_BILD           = /^daten\/inhalte\/[a-z]+\/[a-z0-9.-]{1,80}\.(svg|png|jpg|jpeg|webp)$/;
const LIVE_TYPEN          = ['auswahl', 'wahrfalsch', 'zahl', 'wort', 'schaetzen', 'ampel'];
const LIVE_ZEITEN         = [0, 20, 30, 60];
const LIVE_MAX_BODY       = 60_000;
const LIVE_MAX_FRAGEN     = 15;      // je gespeichertem Quiz
const LIVE_MAX_RAUMFRAGEN = 25;      // je Raum (mit spontan angehängten Fragen)
const LIVE_MAX_TEILNEHMER = 60;
const LIVE_MAX_QUIZZE     = 300;
const LIVE_MAX_RAEUME     = 5;       // offene Räume je Zugang
const LIVE_RAUM_STUNDEN   = 12;
const LIVE_RUECKBLICK_TAGE = 200;    // wie die Gruppen-Auswertung
const LIVE_RATE_FENSTER   = 10_000;  // Rate-Grenze je Raum: höchstens LIVE_RATE_MAX Antworten in 10 s
const LIVE_RATE_MAX       = 400;
const LIVE_SPIELRAUM_MS   = 3000;    // Zeitlimit: so viel später darf eine Antwort noch kommen (Netz)
const LIVE_AMPEL_ENDE     = 'Wie sicher fühlst du dich?';

// Einfacher Wortfilter für Ein-Wort-Antworten (nach Umlaut- und Ziffern-Ersatz, Teilwörter zählen)
const LIVE_FILTER = ['arsch', 'fick', 'fuck', 'scheis', 'scheiss', 'shit', 'hure', 'nutte', 'fotze', 'wichs', 'wixx', 'wixer',
  'schlampe', 'bitch', 'hurensohn', 'missgeburt', 'spast', 'behindert', 'schwuchtel', 'nazi', 'hitler', 'neger', 'kanake',
  'pimmel', 'penis', 'vagina', 'titte', 'porno', 'sex', 'kack', 'pisser', 'bastard', 'idiot', 'depp', 'trottel', 'loser'];

const liveRate = new Map();          // code → { t, n } (je Worker-Instanz)
let liveSchemaOk = false;

// ── Einstieg: aus worker.js für alle /live/…-Pfade ─────
export async function handleLive(request, env, cors, url, h) {
  const noStore = { ...cors, 'Cache-Control': 'no-store' };
  if (!env.SYNC_DB) return h.json({ error: 'Dafür fehlt die Datenbank SYNC_DB (siehe cloudflare/ANLEITUNG-SYNC.md)' }, 501, cors);
  const db = env.SYNC_DB;
  await liveSchema(db);
  const p = url.pathname;

  // Kinder: Raum lesen
  let m = p.match(/^\/live\/raum\/([A-Z0-9]{6})$/);
  if (m && request.method === 'GET') return liveKindLesen(db, m[1], url, h, noStore);

  // Lehrkraft: Stand lesen (GET mit Schlüssel)
  m = p.match(/^\/live\/raum\/([A-Z0-9]{6})\/stand$/);
  if (m && request.method === 'GET') {
    const auth = await h.checkToken(request, env);
    if (!auth.ok) return h.json({ error: auth.error }, auth.status, cors);
    return liveStand(db, m[1], liveBesitzer(auth), h, noStore);
  }

  if (request.method !== 'POST') return h.json({ error: 'Nicht gefunden' }, 404, cors);
  const raw = await request.text();
  if (raw.length > LIVE_MAX_BODY) return h.json({ error: 'Zu groß' }, 413, cors);
  let body;
  try { body = raw ? JSON.parse(raw) : {}; } catch { return h.json({ error: 'Ungültiges JSON' }, 400, cors); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return h.json({ error: 'Ungültige Anfrage' }, 400, cors);

  if (p === '/live/beitreten') return liveBeitreten(db, body, h, cors);
  if (p === '/live/antwort')   return liveAntwortSenden(db, body, h, cors);

  // Ab hier nur mit Schlüssel
  const istHauptPfad = p.startsWith('/live/quiz/') || p.startsWith('/live/rueckblick');
  const auth = istHauptPfad ? await h.checkHaupt(request, env) : await h.checkToken(request, env);
  if (!auth.ok) return h.json({ error: auth.error }, auth.status, cors);
  const besitzer = liveBesitzer(auth);

  if (p === '/live/raum')   return liveRaumAnlegen(db, body, besitzer, h, cors);
  if (p === '/live/raeume') return liveRaeume(db, besitzer, h, noStore);
  if (p === '/live/quizze') return liveQuizze(db, body, auth.rolle === 'haupt', h, noStore);
  m = p.match(/^\/live\/raum\/([A-Z0-9]{6})\/(phase|ende)$/);
  if (m) return m[2] === 'phase' ? livePhase(db, m[1], body, besitzer, h, cors) : liveEnde(db, m[1], besitzer, h, cors);

  if (p === '/live/quiz/lesen')       return liveQuizLesen(db, body, h, noStore);
  if (p === '/live/quiz/speichern')   return liveQuizSpeichern(db, body, h, cors);
  if (p === '/live/quiz/archivieren') return liveQuizArchivieren(db, body, h, cors);
  if (p === '/live/quiz/loeschen')    return liveQuizLoeschen(db, body, h, cors);
  if (p === '/live/rueckblicke')      return liveRueckblicke(db, body, h, noStore);
  if (p === '/live/rueckblick/loeschen') return liveRueckblickLoeschen(db, body, h, cors);
  return h.json({ error: 'Nicht gefunden' }, 404, cors);
}

// ── Datenbank-Schema (einmal je Worker-Instanz) ────────
async function liveSchema(db) {
  if (liveSchemaOk) return;
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS live_quizze (
      id TEXT PRIMARY KEY, titel TEXT NOT NULL, fach TEXT NOT NULL DEFAULT '', klasse INTEGER NOT NULL DEFAULT 0,
      daten TEXT NOT NULL, archiviert INTEGER NOT NULL DEFAULT 0, erstellt INTEGER NOT NULL, geaendert INTEGER NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS live_raeume (
      code TEXT PRIMARY KEY, besitzer TEXT NOT NULL, quiz_id TEXT, daten TEXT NOT NULL, modus TEXT NOT NULL,
      frage INTEGER NOT NULL DEFAULT -1, runde INTEGER NOT NULL DEFAULT 1, phase TEXT NOT NULL, loesung INTEGER NOT NULL DEFAULT 0,
      seit INTEGER NOT NULL, ausgeblendet TEXT NOT NULL DEFAULT '{}', rev INTEGER NOT NULL DEFAULT 0, erstellt INTEGER NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS live_antworten (
      code TEXT NOT NULL, kennung TEXT NOT NULL, frage INTEGER NOT NULL, runde INTEGER NOT NULL,
      antwort TEXT NOT NULL, richtig INTEGER, versteckt INTEGER NOT NULL DEFAULT 0, zeit INTEGER NOT NULL,
      PRIMARY KEY (code, kennung, frage, runde))`),
    db.prepare(`CREATE TABLE IF NOT EXISTS live_rueckblick (
      id TEXT PRIMARY KEY, quiz_id TEXT, besitzer TEXT NOT NULL, titel TEXT NOT NULL, datum TEXT NOT NULL,
      daten TEXT NOT NULL, erstellt INTEGER NOT NULL)`),
    db.prepare('CREATE INDEX IF NOT EXISTS live_rueckblick_quiz ON live_rueckblick(quiz_id)'),
  ]);
  liveSchemaOk = true;
}

// ── Aufräumen (täglicher Cron) ─────────────────────────
export async function liveAufraeumen(env) {
  if (!env.SYNC_DB) return;
  const db = env.SYNC_DB;
  await liveSchema(db);
  const alt = Date.now() - LIVE_RAUM_STUNDEN * 3600e3;
  await db.batch([
    db.prepare('DELETE FROM live_antworten WHERE code IN (SELECT code FROM live_raeume WHERE erstellt < ?)').bind(alt),
    db.prepare('DELETE FROM live_raeume WHERE erstellt < ?').bind(alt),
    db.prepare('DELETE FROM live_antworten WHERE code NOT IN (SELECT code FROM live_raeume)'),
    db.prepare('DELETE FROM live_rueckblick WHERE erstellt < ?').bind(Date.now() - LIVE_RUECKBLICK_TAGE * 864e5),
  ]);
}

// ── Hilfen ─────────────────────────────────────────────
const liveBesitzer = auth => auth.rolle === 'kollege' ? 'k:' + auth.kid : 'haupt';
const liveHex = n => [...crypto.getRandomValues(new Uint8Array(n))].map(b => b.toString(16).padStart(2, '0')).join('');
const liveText = (v, max) => typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max) : '';
function liveNeuerCode() {
  const z = crypto.getRandomValues(new Uint8Array(6));
  return [...z].map(b => LIVE_ZEICHEN[b % LIVE_ZEICHEN.length]).join('');    // 31 Zeichen: kleine Schieflage, egal bei 6 Stellen
}
function liveDaten(r) { try { return JSON.parse(r.daten); } catch { return { titel: '', fragen: [], optionen: {} }; } }
/** Zahl aus einer Eingabe („3,5“, „−12“, „1 000“) oder null */
function liveZahl(v) {
  if (typeof v === 'number') return Number.isFinite(v) && Math.abs(v) < 1e9 ? v : null;
  const s = String(v ?? '').replace(/[\s  ]/g, '').replace('−', '-').replace(',', '.');
  if (!/^-?\d{1,9}(\.\d{1,6})?$/.test(s)) return null;
  return Number(s);
}
function liveWort(v) {
  const w = String(v ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
  if (!w || w.length > 20 || !/^[\p{L}\p{N}' -]+$/u.test(w)) return null;
  return w;
}
function liveGefiltert(w) {
  const n = w.replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's').replace(/[^a-z]/g, '');
  return LIVE_FILTER.some(f => n.includes(f));
}
const liveToleranz = f => typeof f.toleranz === 'number' ? f.toleranz : (f.max - f.min) / 10;
const liveBewertbar = f => (f.typ === 'auswahl' && Number.isInteger(f.richtig)) || (f.typ === 'wahrfalsch' && typeof f.wahr === 'boolean')
  || f.typ === 'zahl' || f.typ === 'schaetzen';

/** Frage prüfen und säubern → { f } oder { fehler } (spontan: Texte dürfen fehlen, Lösung darf offen sein) */
function liveFrage(x, spontan) {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return { fehler: 'Frage ist kein Objekt' };
  if (!LIVE_TYPEN.includes(x.typ)) return { fehler: 'Fragetyp unbekannt' };
  const f = { typ: x.typ, text: liveText(x.text, 200) };
  if (!f.text && !spontan && f.typ !== 'ampel') return { fehler: 'Fragetext fehlt' };
  if (f.typ === 'auswahl') {
    if (!Array.isArray(x.optionen) || x.optionen.length < 2 || x.optionen.length > 4) return { fehler: 'Auswahl: 2–4 Antworten' };
    f.optionen = x.optionen.map(o => liveText(o, 80));
    if (f.optionen.some(o => !o)) return { fehler: 'Auswahl: leere Antwort' };
    f.richtig = x.richtig === null || x.richtig === undefined ? null : x.richtig;
    if (f.richtig !== null && !(Number.isInteger(f.richtig) && f.richtig >= 0 && f.richtig < f.optionen.length)) return { fehler: 'Auswahl: richtige Antwort fehlt' };
    if (f.richtig === null && !spontan) return { fehler: 'Auswahl: richtige Antwort fehlt' };
  } else if (f.typ === 'wahrfalsch') {
    f.wahr = typeof x.wahr === 'boolean' ? x.wahr : null;
    if (f.wahr === null && !spontan) return { fehler: 'Wahr/Falsch: Lösung fehlt' };
  } else if (f.typ === 'zahl') {
    f.wert = liveZahl(x.wert);
    if (f.wert === null) return { fehler: 'Zahl: Lösung fehlt' };
  } else if (f.typ === 'schaetzen') {
    const min = liveZahl(x.min), max = liveZahl(x.max), wert = liveZahl(x.wert);
    if (min === null || max === null || wert === null || !(min < max) || wert < min || wert > max) return { fehler: 'Schätzfrage: Bereich und Wert prüfen (min < max, Wert dazwischen)' };
    Object.assign(f, { min, max, wert, einheit: liveText(x.einheit, 12) });
    if (x.toleranz !== undefined && x.toleranz !== null) {
      const t = liveZahl(x.toleranz);
      if (t === null || t < 0) return { fehler: 'Schätzfrage: Toleranz ungültig' };
      f.toleranz = t;
    }
  }
  f.zeit = LIVE_ZEITEN.includes(x.zeit) ? x.zeit : 0;
  if (x.zweite === true && ['auswahl', 'wahrfalsch', 'zahl', 'schaetzen'].includes(f.typ)) f.zweite = true;
  const emoji = liveText(x.emoji, 16);
  if (emoji && !/[<>"'&]/.test(emoji)) f.emoji = emoji;
  if (typeof x.bild === 'string' && LIVE_BILD.test(x.bild)) f.bild = x.bild;
  const erk = liveText(x.erklaerung, 200);
  if (erk) f.erklaerung = erk;
  return { f };
}

/** Quiz prüfen und säubern → { q } oder { fehler } */
function liveQuiz(x, spontan) {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return { fehler: 'Quiz fehlt' };
  const q = { titel: liveText(x.titel, 80) || (spontan ? 'Spontane Frage' : ''), fach: liveText(x.fach, 40), klasse: 0, fragen: [], optionen: {} };
  if (!q.titel) return { fehler: 'Titel fehlt' };
  if (x.klasse !== undefined && x.klasse !== null && x.klasse !== '') {
    if (!(Number.isInteger(x.klasse) && x.klasse >= 0 && x.klasse <= 13)) return { fehler: 'Klasse ungültig' };
    q.klasse = x.klasse;
  }
  if (!Array.isArray(x.fragen) || !x.fragen.length || x.fragen.length > LIVE_MAX_FRAGEN) return { fehler: `1 bis ${LIVE_MAX_FRAGEN} Fragen` };
  for (let i = 0; i < x.fragen.length; i++) {
    const r = liveFrage(x.fragen[i], spontan);
    if (r.fehler) return { fehler: `Frage ${i + 1}: ${r.fehler}` };
    q.fragen.push(r.f);
  }
  const o = x.optionen && typeof x.optionen === 'object' && !Array.isArray(x.optionen) ? x.optionen : {};
  q.optionen = {
    modus: o.modus === 'selbst' ? 'selbst' : 'fuehren',
    rueckblick: o.rueckblick === true,
    xp: o.xp === true,
    ampelEnde: o.ampelEnde === true,
  };
  return { q };
}

/** Antwort eines Kindes für Frage f prüfen → { a, r, v } oder null (a = gespeicherter Text, r = richtig 1/0/null, v = versteckt) */
function liveAntwort(f, roh) {
  if (f.typ === 'auswahl') {
    const i = Number(roh);
    if (!Number.isInteger(i) || i < 0 || i >= f.optionen.length) return null;
    return { a: String(i), r: Number.isInteger(f.richtig) ? (i === f.richtig ? 1 : 0) : null, v: 0 };
  }
  if (f.typ === 'wahrfalsch') {
    if (roh !== 'w' && roh !== 'f') return null;
    return { a: roh, r: typeof f.wahr === 'boolean' ? ((roh === 'w') === f.wahr ? 1 : 0) : null, v: 0 };
  }
  if (f.typ === 'ampel') return ['g', 'y', 'r'].includes(roh) ? { a: roh, r: null, v: 0 } : null;
  if (f.typ === 'zahl') {
    const n = liveZahl(roh);
    return n === null ? null : { a: String(n), r: Math.abs(n - f.wert) < 1e-9 ? 1 : 0, v: 0 };
  }
  if (f.typ === 'schaetzen') {
    const n = liveZahl(roh);
    if (n === null || n < f.min || n > f.max) return null;
    return { a: String(n), r: Math.abs(n - f.wert) <= liveToleranz(f) + 1e-9 ? 1 : 0, v: 0 };
  }
  if (f.typ === 'wort') {
    const w = liveWort(roh);
    return w === null ? null : { a: w, r: null, v: liveGefiltert(w) ? 1 : 0 };
  }
  return null;
}

/** Frage für Kinder: ohne Lösung und Erklärung */
function liveOhneLoesung(f) {
  const k = { typ: f.typ, text: f.text, zeit: f.zeit || 0 };
  if (f.optionen) k.optionen = f.optionen;
  if (f.typ === 'schaetzen') Object.assign(k, { min: f.min, max: f.max, einheit: f.einheit || '' });
  if (f.emoji) k.emoji = f.emoji;
  if (f.bild) k.bild = f.bild;
  return k;
}
function liveLoesung(f) {
  const l = {};
  if (f.typ === 'auswahl') l.richtig = Number.isInteger(f.richtig) ? f.richtig : null;
  if (f.typ === 'wahrfalsch') l.wahr = typeof f.wahr === 'boolean' ? f.wahr : null;
  if (f.typ === 'zahl') l.wert = f.wert;
  if (f.typ === 'schaetzen') Object.assign(l, { wert: f.wert, toleranz: liveToleranz(f) });
  if (f.erklaerung) l.erklaerung = f.erklaerung;
  return l;
}
async function liveRaumHolen(db, code) {
  if (!LIVE_CODE.test(code)) return null;
  return db.prepare('SELECT * FROM live_raeume WHERE code = ?').bind(code).first();
}
const liveRest = (raum, f) => f && f.zeit && raum.phase === 'sammeln' && raum.modus === 'fuehren' ? Math.max(0, raum.seit + f.zeit * 1000 - Date.now()) : null;

// ── Kinder ─────────────────────────────────────────────
async function liveKindLesen(db, code, url, h, cors) {
  const raum = await liveRaumHolen(db, code);
  if (!raum) return h.json({ error: 'Diesen Raum gibt es nicht (mehr).', ende: true }, 404, cors);
  const rev = Number(url.searchParams.get('rev'));
  if (Number.isInteger(rev) && rev === raum.rev) return h.json({ ok: true, unveraendert: true, rev: raum.rev }, 200, cors);
  const d = liveDaten(raum), k = String(url.searchParams.get('k') || '');
  const eigene = LIVE_KENNUNG.test(k)
    ? ((await db.prepare('SELECT frage, runde, antwort, richtig FROM live_antworten WHERE code = ? AND kennung = ? AND frage >= 0').bind(code, k).all()).results || [])
    : [];
  // Bilanz fürs Ende: je Frage die letzte Runde
  const letzte = {};
  eigene.forEach(e => { if (!letzte[e.frage] || e.runde > letzte[e.frage].runde) letzte[e.frage] = e; });
  const bilanz = { beantwortet: Object.keys(letzte).length, richtig: Object.values(letzte).filter(e => e.richtig === 1).length,
    wertbar: Object.keys(letzte).filter(i => d.fragen[i] && liveBewertbar(d.fragen[i])).length };
  const aus = { ok: true, rev: raum.rev, titel: d.titel, modus: raum.modus, phase: raum.phase, anzahl: d.fragen.length,
    xp: !!(d.optionen && d.optionen.xp), bilanz };
  if (raum.modus === 'selbst') {
    aus.fragen = d.fragen.map(liveOhneLoesung);
    aus.meine = {};
    eigene.forEach(e => { aus.meine[e.frage] = { a: e.antwort, r: e.richtig }; });
    return h.json(aus, 200, cors);
  }
  const f = d.fragen[raum.frage];
  if (f && (raum.phase === 'sammeln' || raum.phase === 'aufdecken')) {
    Object.assign(aus, { nr: raum.frage, runde: raum.runde, frage: liveOhneLoesung(f), rest: liveRest(raum, f) });
    const m = eigene.find(e => e.frage === raum.frage && e.runde === raum.runde);
    aus.meine = m ? { a: m.antwort } : null;
    if (raum.phase === 'aufdecken' && raum.loesung) {
      aus.loesung = liveLoesung(f);
      if (m) aus.meine.r = m.richtig;
    }
  }
  return h.json(aus, 200, cors);
}

async function liveBeitreten(db, body, h, cors) {
  const code = String(body.raum || '').toUpperCase(), k = String(body.kennung || '');
  if (!LIVE_CODE.test(code) || !LIVE_KENNUNG.test(k)) return h.json({ error: 'Code ungültig' }, 400, cors);
  const raum = await liveRaumHolen(db, code);
  if (!raum) return h.json({ error: 'Diesen Raum gibt es nicht (mehr).', ende: true }, 404, cors);
  const da = await db.prepare('SELECT 1 FROM live_antworten WHERE code = ? AND kennung = ? AND frage = -1').bind(code, k).first();
  if (da) return h.json({ ok: true }, 200, cors);
  const n = await db.prepare('SELECT COUNT(*) AS n FROM live_antworten WHERE code = ? AND frage = -1').bind(code).first();
  if (n && n.n >= LIVE_MAX_TEILNEHMER) return h.json({ error: 'Der Raum ist voll.' }, 409, cors);
  await db.prepare('INSERT OR IGNORE INTO live_antworten (code, kennung, frage, runde, antwort, zeit) VALUES (?, ?, -1, 0, \'\', ?)').bind(code, k, Date.now()).run();
  return h.json({ ok: true }, 200, cors);
}

async function liveAntwortSenden(db, body, h, cors) {
  const code = String(body.raum || '').toUpperCase(), k = String(body.kennung || '');
  const nr = Number(body.frage), runde = Number(body.runde);
  if (!LIVE_CODE.test(code) || !LIVE_KENNUNG.test(k) || !Number.isInteger(nr) || !Number.isInteger(runde)) return h.json({ error: 'Ungültige Antwort' }, 400, cors);
  // Rate-Grenze je Raum
  const jetzt = Date.now(), rt = liveRate.get(code);
  if (rt && jetzt - rt.t < LIVE_RATE_FENSTER) { if (++rt.n > LIVE_RATE_MAX) return h.json({ error: 'Zu viele Antworten – kurz warten' }, 429, cors); }
  else liveRate.set(code, { t: jetzt, n: 1 });
  if (liveRate.size > 500) liveRate.clear();

  const raum = await liveRaumHolen(db, code);
  if (!raum) return h.json({ error: 'Diesen Raum gibt es nicht (mehr).', ende: true }, 404, cors);
  const d = liveDaten(raum), f = d.fragen[nr];
  if (!f) return h.json({ error: 'Frage unbekannt' }, 400, cors);
  if (raum.modus === 'selbst') {
    if (raum.phase !== 'laeuft' || runde !== 1) return h.json({ error: 'Gerade keine Antworten', vorbei: true }, 409, cors);
  } else {
    if (raum.phase !== 'sammeln' || raum.frage !== nr || raum.runde !== runde) return h.json({ error: 'Diese Frage ist schon vorbei', vorbei: true }, 409, cors);
    if (f.zeit && jetzt > raum.seit + f.zeit * 1000 + LIVE_SPIELRAUM_MS) return h.json({ error: 'Die Zeit ist um', vorbei: true }, 409, cors);
  }
  const a = liveAntwort(f, body.antwort);
  if (!a) return h.json({ error: 'Antwort ungültig' }, 400, cors);
  const dabei = await db.prepare('SELECT 1 FROM live_antworten WHERE code = ? AND kennung = ? AND frage = -1').bind(code, k).first();
  if (!dabei) {                                                   // ohne Beitritt (z. B. Beitritt ging im WLAN verloren): nachholen
    const n = await db.prepare('SELECT COUNT(*) AS n FROM live_antworten WHERE code = ? AND frage = -1').bind(code).first();
    if (n && n.n >= LIVE_MAX_TEILNEHMER) return h.json({ error: 'Der Raum ist voll.' }, 409, cors);
    await db.prepare('INSERT OR IGNORE INTO live_antworten (code, kennung, frage, runde, antwort, zeit) VALUES (?, ?, -1, 0, \'\', ?)').bind(code, k, jetzt).run();
  }
  try {
    await db.prepare('INSERT INTO live_antworten (code, kennung, frage, runde, antwort, richtig, versteckt, zeit) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(code, k, nr, runde, a.a, a.r, a.v, jetzt).run();
  } catch (e) {
    return h.json({ error: 'Schon geantwortet', schon: true }, 409, cors);
  }
  // Modus „Selbst“: nur richtig/falsch zurück, nie die Lösung
  return h.json(raum.modus === 'selbst' ? { ok: true, richtig: a.r } : { ok: true }, 200, cors);
}

// ── Lehrkraft: Räume ───────────────────────────────────
async function liveRaumAnlegen(db, body, besitzer, h, cors) {
  const offen = await db.prepare('SELECT COUNT(*) AS n FROM live_raeume WHERE besitzer = ? AND erstellt > ?').bind(besitzer, Date.now() - LIVE_RAUM_STUNDEN * 3600e3).first();
  if (offen && offen.n >= LIVE_MAX_RAEUME) return h.json({ error: `Höchstens ${LIVE_MAX_RAEUME} offene Abfragen – bitte alte beenden` }, 409, cors);
  let q, quizId = null;
  if (body.quizId !== undefined) {
    quizId = String(body.quizId);
    if (!LIVE_ID.test(quizId)) return h.json({ error: 'Quiz unbekannt' }, 400, cors);
    const r = await db.prepare('SELECT * FROM live_quizze WHERE id = ?').bind(quizId).first();
    if (!r) return h.json({ error: 'Quiz nicht gefunden' }, 404, cors);
    const d = liveDaten(r);
    const g = liveQuiz({ titel: r.titel, fach: r.fach, klasse: r.klasse, fragen: d.fragen, optionen: d.optionen }, false);
    if (g.fehler) return h.json({ error: 'Gespeichertes Quiz ist fehlerhaft: ' + g.fehler }, 422, cors);
    q = g.q;
  } else {
    const g = liveQuiz(body.quiz, true);                            // spontane Frage(n) aus dem Unterrichtsmodus
    if (g.fehler) return h.json({ error: g.fehler }, 400, cors);
    q = g.q;
    q.optionen.modus = 'fuehren';
    q.spontan = true;
  }
  if (q.optionen.ampelEnde) q.fragen.push({ typ: 'ampel', text: LIVE_AMPEL_ENDE, zeit: 0 });
  const daten = JSON.stringify({ titel: q.titel, fragen: q.fragen, optionen: { rueckblick: q.optionen.rueckblick, xp: q.optionen.xp }, spontan: !!q.spontan });
  for (let i = 0; i < 10; i++) {
    const code = liveNeuerCode(), jetzt = Date.now();
    try {
      await db.prepare('INSERT INTO live_raeume (code, besitzer, quiz_id, daten, modus, frage, runde, phase, loesung, seit, rev, erstellt) VALUES (?, ?, ?, ?, ?, -1, 1, \'warten\', 0, ?, 1, ?)')
        .bind(code, besitzer, quizId, daten, q.optionen.modus, jetzt, jetzt).run();
      return h.json({ ok: true, code }, 200, cors);
    } catch (e) { /* Code schon vergeben → neu würfeln */ }
  }
  return h.json({ error: 'Kein freier Code – bitte nochmal versuchen' }, 503, cors);
}

async function liveRaeume(db, besitzer, h, cors) {
  const r = await db.prepare(`SELECT r.code, r.daten, r.phase, r.modus, r.erstellt,
      (SELECT COUNT(*) FROM live_antworten a WHERE a.code = r.code AND a.frage = -1) AS teilnehmer
      FROM live_raeume r WHERE r.besitzer = ? ORDER BY r.erstellt DESC`).bind(besitzer).all();
  const raeume = (r.results || []).map(x => ({ code: x.code, titel: liveDaten(x).titel, phase: x.phase, modus: x.modus, erstellt: x.erstellt, teilnehmer: x.teilnehmer }));
  return h.json({ ok: true, raeume }, 200, cors);
}

async function liveStand(db, code, besitzer, h, cors) {
  const raum = await liveRaumHolen(db, code);
  if (!raum || raum.besitzer !== besitzer) return h.json({ error: 'Diesen Raum gibt es nicht (mehr).', ende: true }, 404, cors);
  const d = liveDaten(raum), f = d.fragen[raum.frage];
  const tn = await db.prepare('SELECT COUNT(*) AS n FROM live_antworten WHERE code = ? AND frage = -1').bind(code).first();
  const aus = { ok: true, code, rev: raum.rev, titel: d.titel, modus: raum.modus, phase: raum.phase, nr: raum.frage, runde: raum.runde,
    loesung: !!raum.loesung, fragen: d.fragen, anzahl: d.fragen.length, teilnehmer: tn ? tn.n : 0, optionen: d.optionen || {},
    spontan: !!d.spontan, erstellt: raum.erstellt };
  if (raum.modus === 'selbst') {
    const r = await db.prepare('SELECT frage, COUNT(*) AS n, SUM(CASE WHEN richtig = 1 THEN 1 ELSE 0 END) AS richtig FROM live_antworten WHERE code = ? AND frage >= 0 GROUP BY frage').bind(code).all();
    aus.fortschritt = d.fragen.map((_, i) => { const z = (r.results || []).find(x => x.frage === i); return { n: z ? z.n : 0, richtig: z ? z.richtig : 0 }; });
    const fertig = await db.prepare('SELECT COUNT(*) AS n FROM (SELECT kennung FROM live_antworten WHERE code = ? AND frage >= 0 GROUP BY kennung HAVING COUNT(*) >= ?)').bind(code, d.fragen.length).first();
    aus.fertig = fertig ? fertig.n : 0;
    return h.json(aus, 200, cors);
  }
  if (f) {
    const ausgeblendet = (() => { try { return JSON.parse(raum.ausgeblendet || '{}')[raum.frage] || []; } catch { return []; } })();
    const r = await db.prepare('SELECT runde, antwort, MAX(richtig) AS richtig, COUNT(*) AS n, SUM(versteckt) AS v FROM live_antworten WHERE code = ? AND frage = ? GROUP BY runde, antwort')
      .bind(code, raum.frage).all();
    const runden = { 1: [], 2: [] };
    let gefiltert = 0;
    (r.results || []).forEach(x => {
      if (x.v) { gefiltert += x.n; return; }                      // Wortfilter: zählt als beantwortet, wird nie gezeigt
      if (runden[x.runde]) runden[x.runde].push({ a: x.antwort, n: x.n, r: x.richtig, aus: ausgeblendet.includes(x.antwort) || undefined });
    });
    const beantwortet = (runden[raum.runde] || []).reduce((s, x) => s + x.n, 0) + (raum.runde === 1 ? gefiltert : 0);
    Object.assign(aus, { antworten: runden, beantwortet, gefiltert, ausgeblendet, rest: liveRest(raum, f) });
  }
  return h.json(aus, 200, cors);
}

async function livePhase(db, code, body, besitzer, h, cors) {
  const raum = await liveRaumHolen(db, code);
  if (!raum || raum.besitzer !== besitzer) return h.json({ error: 'Diesen Raum gibt es nicht (mehr).', ende: true }, 404, cors);
  const d = liveDaten(raum), a = String(body.aktion || '');
  const neu = { phase: raum.phase, frage: raum.frage, runde: raum.runde, loesung: raum.loesung, seit: Date.now() };
  let datenNeu = null, ausgeblendetNeu = null;
  const f = d.fragen[raum.frage];
  const falsch = () => h.json({ error: 'Das geht gerade nicht' }, 409, cors);

  if (raum.modus === 'selbst') {
    if (a === 'start' && raum.phase === 'warten') neu.phase = 'laeuft';
    else if (a === 'ergebnis' && (raum.phase === 'laeuft' || raum.phase === 'ergebnis')) neu.phase = raum.phase === 'laeuft' ? 'ergebnis' : 'laeuft';
    else return falsch();
  } else if (a === 'start') {
    if (raum.phase !== 'warten') return falsch();
    Object.assign(neu, { phase: 'sammeln', frage: 0, runde: 1, loesung: 0 });
  } else if (a === 'aufdecken') {
    if (raum.phase !== 'sammeln' || !f) return falsch();
    Object.assign(neu, { phase: 'aufdecken', loesung: f.zweite ? 0 : 1 });   // zweite Runde: erst Verteilung bzw. Vergleich, Lösung auf Knopfdruck
  } else if (a === 'zweite') {
    if (raum.phase !== 'aufdecken' || raum.runde !== 1 || !f || !f.zweite) return falsch();
    Object.assign(neu, { phase: 'sammeln', runde: 2, loesung: 0 });
  } else if (a === 'loesung') {
    if (raum.phase !== 'aufdecken') return falsch();
    neu.loesung = 1;
  } else if (a === 'weiter') {
    if (raum.phase !== 'aufdecken' || raum.frage + 1 >= d.fragen.length) return falsch();
    Object.assign(neu, { phase: 'sammeln', frage: raum.frage + 1, runde: 1, loesung: 0 });
  } else if (a === 'markieren') {                                 // spontane Frage: richtige Antwort nachträglich antippen
    if (raum.phase !== 'aufdecken' || !f || !['auswahl', 'wahrfalsch'].includes(f.typ)) return falsch();
    if (f.typ === 'auswahl') {
      const i = body.richtig;
      if (!(Number.isInteger(i) && i >= 0 && i < f.optionen.length)) return h.json({ error: 'richtig ungültig' }, 400, cors);
      f.richtig = i;
    } else {
      if (typeof body.wahr !== 'boolean') return h.json({ error: 'wahr ungültig' }, 400, cors);
      f.wahr = body.wahr;
    }
    datenNeu = d;
    neu.loesung = 1;
    const soll = f.typ === 'auswahl' ? String(f.richtig) : (f.wahr ? 'w' : 'f');
    await db.prepare('UPDATE live_antworten SET richtig = CASE WHEN antwort = ? THEN 1 ELSE 0 END WHERE code = ? AND frage = ?').bind(soll, code, raum.frage).run();
  } else if (a === 'ausblenden') {                                // Ein-Wort: einzelne Wörter vor dem Aufdecken ausblenden
    const w = liveWort(body.wort);
    if (!f || f.typ !== 'wort' || w === null) return falsch();
    let alle = {};
    try { alle = JSON.parse(raum.ausgeblendet || '{}'); } catch {}
    const l = new Set(alle[raum.frage] || []);
    if (body.an === false) l.delete(w); else l.add(w);
    alle[raum.frage] = [...l].slice(0, 100);
    ausgeblendetNeu = JSON.stringify(alle);
    neu.seit = raum.seit;                                         // Zeitlimit läuft weiter
  } else if (a === 'anhaengen') {                                 // spontane Frage hinten anhängen und gleich stellen
    if (!['warten', 'aufdecken'].includes(raum.phase)) return falsch();
    if (d.fragen.length >= LIVE_MAX_RAUMFRAGEN) return h.json({ error: `Höchstens ${LIVE_MAX_RAUMFRAGEN} Fragen je Abfrage` }, 400, cors);
    const g = liveFrage(body.frage, true);
    if (g.fehler) return h.json({ error: g.fehler }, 400, cors);
    d.fragen.push(g.f);
    datenNeu = d;
    Object.assign(neu, { phase: 'sammeln', frage: d.fragen.length - 1, runde: 1, loesung: 0 });
  } else return h.json({ error: 'Aktion unbekannt' }, 400, cors);

  await db.prepare(`UPDATE live_raeume SET phase = ?, frage = ?, runde = ?, loesung = ?, seit = ?, rev = rev + 1
      ${datenNeu ? ', daten = ?' : ''}${ausgeblendetNeu ? ', ausgeblendet = ?' : ''} WHERE code = ?`)
    .bind(neu.phase, neu.frage, neu.runde, neu.loesung, neu.seit, ...(datenNeu ? [JSON.stringify(datenNeu)] : []), ...(ausgeblendetNeu ? [ausgeblendetNeu] : []), code).run();
  return liveStand(db, code, besitzer, h, cors);
}

/** Anonyme Zusammenfassung je Frage (nur Zahlen, keine Kennungen, keine freien Texte) */
function liveZusammenfassung(d, zeilen) {
  return d.fragen.map((f, i) => {
    const runde = n => {
      const l = zeilen.filter(z => z.frage === i && z.runde === n);
      if (!l.length) return null;
      const e = { n: l.length };
      if (liveBewertbar(f)) e.richtig = Math.round(100 * l.filter(z => z.richtig === 1).length / l.length);
      const zaehle = werte => werte.map(w => l.filter(z => z.antwort === w).length);
      if (f.typ === 'auswahl') e.verteilung = zaehle(f.optionen.map((_, k) => String(k)));
      if (f.typ === 'wahrfalsch') e.verteilung = zaehle(['w', 'f']);
      if (f.typ === 'ampel') e.verteilung = zaehle(['g', 'y', 'r']);
      if (f.typ === 'zahl') {
        const c = {};
        l.forEach(z => { if (z.richtig !== 1) c[z.antwort] = (c[z.antwort] || 0) + 1; });
        e.falsch = Object.entries(c).sort((x, y) => y[1] - x[1]).slice(0, 3);
      }
      if (f.typ === 'schaetzen') {
        const s = l.map(z => Number(z.antwort)).sort((x, y) => x - y);
        e.median = s[Math.floor(s.length / 2)];
      }
      return e;
    };
    const z = { typ: f.typ, text: f.text, r1: runde(1) };
    if (f.zweite) z.r2 = runde(2);
    return z;
  });
}

async function liveEnde(db, code, besitzer, h, cors) {
  const raum = await liveRaumHolen(db, code);
  if (!raum || raum.besitzer !== besitzer) return h.json({ ok: true, schonWeg: true }, 200, cors);
  const d = liveDaten(raum);
  let rueckblick = false;
  if (d.optionen && d.optionen.rueckblick) {
    const r = await db.prepare('SELECT frage, runde, antwort, richtig FROM live_antworten WHERE code = ? AND frage >= 0 AND versteckt = 0').bind(code).all();
    const zeilen = r.results || [];
    if (zeilen.length) {
      const tn = await db.prepare('SELECT COUNT(*) AS n FROM live_antworten WHERE code = ? AND frage = -1').bind(code).first();
      const daten = JSON.stringify({ modus: raum.modus, teilnehmer: tn ? tn.n : 0, fragen: liveZusammenfassung(d, zeilen) });
      await db.prepare('INSERT INTO live_rueckblick (id, quiz_id, besitzer, titel, datum, daten, erstellt) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(liveHex(8), raum.quiz_id, besitzer, d.titel, new Date().toISOString().slice(0, 10), daten, Date.now()).run();
      rueckblick = true;
    }
  }
  await db.batch([
    db.prepare('DELETE FROM live_antworten WHERE code = ?').bind(code),
    db.prepare('DELETE FROM live_raeume WHERE code = ?').bind(code),
  ]);
  liveRate.delete(code);
  return h.json({ ok: true, rueckblick }, 200, cors);
}

// ── Quizze ─────────────────────────────────────────────
async function liveQuizze(db, body, haupt, h, cors) {
  const archiv = haupt && body.archiv === true;
  const r = await db.prepare(`SELECT id, titel, fach, klasse, daten, archiviert, geaendert FROM live_quizze ${archiv ? '' : 'WHERE archiviert = 0'} ORDER BY fach, klasse, titel`).all();
  const quizze = (r.results || []).map(x => {
    const d = liveDaten(x);
    return { id: x.id, titel: x.titel, fach: x.fach, klasse: x.klasse, archiviert: !!x.archiviert, geaendert: x.geaendert,
      anzahl: (d.fragen || []).length, modus: (d.optionen && d.optionen.modus) || 'fuehren' };
  });
  return h.json({ ok: true, quizze }, 200, cors);
}
async function liveQuizLesen(db, body, h, cors) {
  const id = String(body.id || '');
  const r = LIVE_ID.test(id) ? await db.prepare('SELECT * FROM live_quizze WHERE id = ?').bind(id).first() : null;
  if (!r) return h.json({ error: 'Quiz nicht gefunden' }, 404, cors);
  const d = liveDaten(r);
  return h.json({ ok: true, quiz: { id: r.id, titel: r.titel, fach: r.fach, klasse: r.klasse, archiviert: !!r.archiviert, fragen: d.fragen || [], optionen: d.optionen || {} } }, 200, cors);
}
async function liveQuizSpeichern(db, body, h, cors) {
  const g = liveQuiz(body, false);
  if (g.fehler) return h.json({ error: g.fehler }, 400, cors);
  const q = g.q, jetzt = Date.now(), daten = JSON.stringify({ fragen: q.fragen, optionen: q.optionen });
  if (body.id !== undefined && body.id !== null && body.id !== '') {
    const id = String(body.id);
    if (!LIVE_ID.test(id)) return h.json({ error: 'id ungültig' }, 400, cors);
    const r = await db.prepare('UPDATE live_quizze SET titel = ?, fach = ?, klasse = ?, daten = ?, geaendert = ? WHERE id = ?').bind(q.titel, q.fach, q.klasse, daten, jetzt, id).run();
    if (!r.meta || r.meta.changes !== 1) return h.json({ error: 'Quiz nicht gefunden' }, 404, cors);
    return h.json({ ok: true, id }, 200, cors);
  }
  const n = await db.prepare('SELECT COUNT(*) AS n FROM live_quizze').first();
  if (n && n.n >= LIVE_MAX_QUIZZE) return h.json({ error: `Höchstens ${LIVE_MAX_QUIZZE} Quizze – bitte alte löschen` }, 400, cors);
  const id = liveHex(8);
  await db.prepare('INSERT INTO live_quizze (id, titel, fach, klasse, daten, archiviert, erstellt, geaendert) VALUES (?, ?, ?, ?, ?, 0, ?, ?)').bind(id, q.titel, q.fach, q.klasse, daten, jetzt, jetzt).run();
  return h.json({ ok: true, id }, 200, cors);
}
async function liveQuizArchivieren(db, body, h, cors) {
  const id = String(body.id || '');
  if (!LIVE_ID.test(id) || typeof body.archiviert !== 'boolean') return h.json({ error: 'Ungültige Angaben' }, 400, cors);
  const r = await db.prepare('UPDATE live_quizze SET archiviert = ? WHERE id = ?').bind(body.archiviert ? 1 : 0, id).run();
  if (!r.meta || r.meta.changes !== 1) return h.json({ error: 'Quiz nicht gefunden' }, 404, cors);
  return h.json({ ok: true }, 200, cors);
}
async function liveQuizLoeschen(db, body, h, cors) {
  const id = String(body.id || '');
  if (!LIVE_ID.test(id)) return h.json({ error: 'id ungültig' }, 400, cors);
  await db.batch([
    db.prepare('DELETE FROM live_quizze WHERE id = ?').bind(id),
    db.prepare('DELETE FROM live_rueckblick WHERE quiz_id = ?').bind(id),
  ]);
  return h.json({ ok: true }, 200, cors);
}

// ── Rückblicke (nur Hauptzugang) ───────────────────────
async function liveRueckblicke(db, body, h, cors) {
  const q = body.quizId === undefined ? null : String(body.quizId);
  if (q !== null && !LIVE_ID.test(q)) return h.json({ error: 'Quiz unbekannt' }, 400, cors);
  const r = q ? await db.prepare('SELECT * FROM live_rueckblick WHERE quiz_id = ? ORDER BY erstellt DESC LIMIT 100').bind(q).all()
              : await db.prepare('SELECT * FROM live_rueckblick ORDER BY erstellt DESC LIMIT 100').all();
  const rueckblicke = (r.results || []).map(x => {
    let d = {};
    try { d = JSON.parse(x.daten); } catch {}
    return { id: x.id, quizId: x.quiz_id, titel: x.titel, datum: x.datum, erstellt: x.erstellt, kollege: x.besitzer !== 'haupt', ...d };
  });
  return h.json({ ok: true, rueckblicke }, 200, cors);
}
async function liveRueckblickLoeschen(db, body, h, cors) {
  const id = String(body.id || '');
  if (!LIVE_ID.test(id)) return h.json({ error: 'id ungültig' }, 400, cors);
  await db.prepare('DELETE FROM live_rueckblick WHERE id = ?').bind(id).run();
  return h.json({ ok: true }, 200, cors);
}
