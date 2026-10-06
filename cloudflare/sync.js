// ═══════════════════════════════════════════════════════
//  Lernwelt – Cloudflare Worker, Modul „Pass-Sicherung“ (sync.js)
//
//  Automatische Sicherung des Lernwelt-Passes ohne Accounts.
//  Jede Sicherungskarte hat einen Code. Aus dem Code leitet das GERÄT
//  eine Kennung (id), ein Anmelde-Token (auth) und einen Schlüssel ab.
//  Hier kommen nur id, auth und der bereits VERSCHLÜSSELTE Stand an.
//  Der Worker kann die Stände nicht lesen und kennt keine Namen.
//
//  Benötigt (Worker → Settings → Bindings):
//    SYNC_DB  – D1-Datenbank (z. B. „lernwelt-sync“)
//  Tabellen werden beim ersten Aufruf automatisch angelegt.
//
//  Endpunkte (alle POST, JSON):
//   Geräte
//    /sync/holen      { id, auth, seitRev? }
//        → { ok, rev, score, blob, letzteSync }      (rev 0 = Karte noch leer)
//        → { ok, rev, unveraendert: true }           (wenn seitRev === rev)
//    /sync/speichern  { id, auth, baseRev, score, blob }
//        → { ok, rev }                               (gespeichert)
//        → 409 { konflikt: true, rev, score, blob }  (Server hat inzwischen neueren Stand)
//        → 429 { warteMs }                           (zu schnell hintereinander)
//        Unbekannter Code und falsches auth → beide 403 „Code ungültig“.
//    /sync/statistik  { id, auth, eintraege:[{ was, woche, runden, aufgaben, richtig }] }   (Gruppenauswertung)
//        → { ok }   Die Zahlen werden auf die GRUPPE der Karte aufaddiert; welche Karte sie
//                   geschickt hat, wird nicht gespeichert. was = Themen-ID oder Datei der App,
//                   woche = Montag 'JJJJ-MM-TT'. Höchstens alle SYNC_STAT_ABSTAND_MS je Karte.
//   Admin (Header Authorization: Bearer <Anmelde-Schlüssel>)
//    /sync/admin/gruppen            {}                          → { ok, gruppen:[{ id, name, erstellt, codes:[…] }] }
//    /sync/admin/gruppe-anlegen     { name, eintraege:[{ nr, id, authHash }], gruppeId? }
//                                   (mit gruppeId: Codes zu bestehender Gruppe hinzufügen)
//    /sync/admin/gruppe-umbenennen  { gruppeId, name }
//    /sync/admin/gruppe-loeschen    { gruppeId }                (samt allen Ständen)
//    /sync/admin/code-loeschen      { id }                      (Karte ungültig machen)
//    /sync/admin/statistik          { gruppeId?, wochen? }      → { ok, zeilen:[{ gruppe, was, woche, runden, aufgaben, richtig }] }
//
//  Aufräumen: syncAufraeumen(env) löscht Stände, die seit SYNC_AUFBEWAHRUNG_TAGE
//  nicht gesichert wurden, und Auswertungs-Wochen älter als SYNC_STAT_TAGE
//  (Cron-Trigger, siehe ANLEITUNG-SYNC.md).
//
//  Hinweis: Alle Namen beginnen mit „sync“, damit das Modul notfalls auch
//  direkt ans Ende von worker.js kopiert werden kann, ohne Namenskonflikte.
// ═══════════════════════════════════════════════════════

const SYNC_MAX_BODY          = 100_000;   // Zeichen pro Anfrage
const SYNC_MAX_BLOB          = 90_000;    // Zeichen verschlüsselter Stand (≈ 64 KB)
const SYNC_MIN_ABSTAND_MS    = 10_000;    // höchstens 1 Speichern pro Code alle 10 s
const SYNC_MAX_CODES_GRUPPE  = 60;
const SYNC_MAX_CODES_AUFRUF  = 40;
const SYNC_AUFBEWAHRUNG_TAGE = 730;       // 2 Jahre
const SYNC_STAT_TAGE         = 200;       // Gruppenauswertung: Wochen so lange aufheben (≈ ein Schuljahr)
const SYNC_STAT_ABSTAND_MS   = 60_000;    // höchstens 1 Meldung pro Karte und Minute (je Worker-Instanz)
const SYNC_STAT_MAX          = 30;        // Einträge pro Meldung

const SYNC_HEX32 = /^[0-9a-f]{32}$/;
const SYNC_HEX64 = /^[0-9a-f]{64}$/;
const SYNC_B64URL = /^[A-Za-z0-9_-]+$/;

// ── Einstieg: wird aus worker.js für alle /sync/…-Pfade aufgerufen ──
export async function handleSync(request, env, cors, url, deps) {
  if (request.method !== 'POST') return syncJson({ error: 'Nur POST' }, 405, cors);
  if (!env.SYNC_DB) return syncJson({ error: 'Dafür fehlt die Datenbank SYNC_DB (siehe cloudflare/ANLEITUNG-SYNC.md)' }, 501, cors);

  const raw = await request.text();
  if (raw.length > SYNC_MAX_BODY) return syncJson({ error: 'Zu groß' }, 413, cors);
  let body;
  try { body = raw ? JSON.parse(raw) : {}; } catch { return syncJson({ error: 'Ungültiges JSON' }, 400, cors); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return syncJson({ error: 'Ungültige Anfrage' }, 400, cors);

  await syncSchema(env);
  const p = url.pathname;

  if (p === '/sync/holen')     return syncHolen(body, env, cors);
  if (p === '/sync/speichern') return syncSpeichern(body, env, cors);
  if (p === '/sync/statistik') return syncStatistik(body, env, cors);

  if (p.startsWith('/sync/admin/')) {
    const auth = await deps.checkToken(request, env);
    if (!auth.ok) return syncJson({ error: auth.error }, auth.status, cors);
    if (p === '/sync/admin/gruppen')           return syncAdminGruppen(env, cors);
    if (p === '/sync/admin/gruppe-anlegen')    return syncAdminAnlegen(body, env, cors);
    if (p === '/sync/admin/gruppe-umbenennen') return syncAdminUmbenennen(body, env, cors);
    if (p === '/sync/admin/gruppe-loeschen')   return syncAdminGruppeLoeschen(body, env, cors);
    if (p === '/sync/admin/code-loeschen')     return syncAdminCodeLoeschen(body, env, cors);
    if (p === '/sync/admin/statistik')         return syncAdminStatistik(body, env, cors);
  }
  return syncJson({ error: 'Nicht gefunden' }, 404, cors);
}

// ── Datenbank-Schema (einmal pro Worker-Instanz prüfen) ──
let syncSchemaOk = false;
async function syncSchema(env) {
  if (syncSchemaOk) return;
  await env.SYNC_DB.batch([
    env.SYNC_DB.prepare(`CREATE TABLE IF NOT EXISTS sync_gruppen (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, erstellt INTEGER NOT NULL)`),
    env.SYNC_DB.prepare(`CREATE TABLE IF NOT EXISTS sync_paesse (
      id TEXT PRIMARY KEY, gruppe_id TEXT NOT NULL, nr INTEGER NOT NULL,
      auth_hash TEXT NOT NULL, erstellt INTEGER NOT NULL,
      verbunden_am INTEGER, letzte_sync INTEGER,
      rev INTEGER NOT NULL DEFAULT 0, score INTEGER NOT NULL DEFAULT 0,
      groesse INTEGER NOT NULL DEFAULT 0, blob TEXT)`),
    env.SYNC_DB.prepare('CREATE INDEX IF NOT EXISTS sync_paesse_gruppe ON sync_paesse(gruppe_id)'),
    // Gruppenauswertung: nur Summen je Gruppe, Thema und Woche – keine Karten-Kennung
    env.SYNC_DB.prepare(`CREATE TABLE IF NOT EXISTS sync_statistik (
      gruppe_id TEXT NOT NULL, was TEXT NOT NULL, woche TEXT NOT NULL,
      runden INTEGER NOT NULL DEFAULT 0, aufgaben INTEGER NOT NULL DEFAULT 0, richtig INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (gruppe_id, was, woche))`),
  ]);
  syncSchemaOk = true;
}

// ── Gerät: Code prüfen ─────────────────────────────────
async function syncPruefen(body, env) {
  const id = String(body.id || ''), auth = String(body.auth || '');
  if (!SYNC_HEX32.test(id) || !SYNC_HEX64.test(auth)) return null;
  const row = await env.SYNC_DB.prepare('SELECT * FROM sync_paesse WHERE id = ?').bind(id).first();
  // Auch ohne Eintrag rechnen, damit die Antwortzeit nichts verrät
  const soll = row ? row.auth_hash : '0'.repeat(64);
  const ist  = await syncSha256Hex(syncHexToBytes(auth));
  if (!syncGleich(ist, soll) || !row) return null;
  return row;
}

// ── Gerät: Stand holen ─────────────────────────────────
async function syncHolen(body, env, cors) {
  const row = await syncPruefen(body, env);
  if (!row) return syncJson({ error: 'Code ungültig' }, 403, cors);
  const seit = Number(body.seitRev);
  if (row.rev > 0 && Number.isInteger(seit) && seit === row.rev) {
    return syncJson({ ok: true, rev: row.rev, unveraendert: true, gruppe: row.gruppe_id }, 200, syncNoStore(cors));
  }
  // gruppe: Kennung der Gruppe (zufällig, kein Name) – das iPad wertet damit Freigaben und Fokus aus (Etappe 7)
  return syncJson({ ok: true, rev: row.rev, score: row.score, blob: row.blob || null, letzteSync: row.letzte_sync || null, gruppe: row.gruppe_id }, 200, syncNoStore(cors));
}

// ── Gerät: Stand speichern ─────────────────────────────
async function syncSpeichern(body, env, cors) {
  const row = await syncPruefen(body, env);
  if (!row) return syncJson({ error: 'Code ungültig' }, 403, cors);

  const baseRev = Number(body.baseRev), score = Number(body.score), blob = body.blob;
  if (!Number.isInteger(baseRev) || baseRev < 0) return syncJson({ error: 'baseRev ungültig' }, 400, cors);
  if (!Number.isInteger(score) || score < 0 || score > 1e12) return syncJson({ error: 'score ungültig' }, 400, cors);
  if (typeof blob !== 'string' || !blob.length || blob.length > SYNC_MAX_BLOB || !SYNC_B64URL.test(blob)) {
    return syncJson({ error: 'Stand ungültig oder zu groß' }, 400, cors);
  }

  const jetzt = Date.now();
  if (row.letzte_sync && jetzt - row.letzte_sync < SYNC_MIN_ABSTAND_MS) {
    return syncJson({ error: 'Zu schnell', warteMs: SYNC_MIN_ABSTAND_MS - (jetzt - row.letzte_sync) }, 429, cors);
  }

  // Nur speichern, wenn sich der Server-Stand seit dem letzten Holen nicht geändert hat
  const r = await env.SYNC_DB.prepare(`UPDATE sync_paesse
      SET blob = ?, score = ?, groesse = ?, rev = rev + 1, letzte_sync = ?, verbunden_am = COALESCE(verbunden_am, ?)
      WHERE id = ? AND rev = ?`)
    .bind(blob, score, blob.length, jetzt, jetzt, row.id, baseRev).run();

  if (!r.meta || r.meta.changes !== 1) {
    const akt = await env.SYNC_DB.prepare('SELECT rev, score, blob FROM sync_paesse WHERE id = ?').bind(row.id).first();
    if (!akt) return syncJson({ error: 'Code ungültig' }, 403, cors);
    return syncJson({ konflikt: true, rev: akt.rev, score: akt.score, blob: akt.blob || null }, 409, syncNoStore(cors));
  }
  return syncJson({ ok: true, rev: baseRev + 1 }, 200, cors);
}

// ── Admin: Übersicht aller Gruppen ─────────────────────
async function syncAdminGruppen(env, cors) {
  const [g, c] = await env.SYNC_DB.batch([
    env.SYNC_DB.prepare('SELECT id, name, erstellt FROM sync_gruppen ORDER BY erstellt DESC'),
    env.SYNC_DB.prepare('SELECT id, gruppe_id, nr, verbunden_am, letzte_sync, groesse FROM sync_paesse ORDER BY nr'),
  ]);
  const gruppen = (g.results || []).map(x => ({ id: x.id, name: x.name, erstellt: x.erstellt, codes: [] }));
  const byId = Object.fromEntries(gruppen.map(x => [x.id, x]));
  (c.results || []).forEach(x => {
    const gr = byId[x.gruppe_id];
    if (gr) gr.codes.push({ id: x.id, nr: x.nr, verbundenAm: x.verbunden_am || null, letzteSync: x.letzte_sync || null, groesse: x.groesse || 0 });
  });
  return syncJson({ ok: true, gruppen }, 200, syncNoStore(cors));
}

// ── Admin: Gruppe anlegen / Codes hinzufügen ───────────
async function syncAdminAnlegen(body, env, cors) {
  const eintraege = Array.isArray(body.eintraege) ? body.eintraege : null;
  if (!eintraege || !eintraege.length || eintraege.length > SYNC_MAX_CODES_AUFRUF) {
    return syncJson({ error: `1 bis ${SYNC_MAX_CODES_AUFRUF} Codes pro Aufruf` }, 400, cors);
  }
  const ok = eintraege.every(e => e && Number.isInteger(e.nr) && e.nr >= 1 && e.nr <= 999
    && SYNC_HEX32.test(String(e.id)) && SYNC_HEX64.test(String(e.authHash)));
  if (!ok) return syncJson({ error: 'Codes ungültig' }, 400, cors);
  if (new Set(eintraege.map(e => e.id)).size !== eintraege.length) return syncJson({ error: 'Doppelte Codes' }, 400, cors);

  const jetzt = Date.now();
  let gruppeId = body.gruppeId, stmts = [];

  if (gruppeId !== undefined) {
    if (!SYNC_HEX32.test(String(gruppeId))) return syncJson({ error: 'Gruppe ungültig' }, 400, cors);
    const gr = await env.SYNC_DB.prepare('SELECT id FROM sync_gruppen WHERE id = ?').bind(gruppeId).first();
    if (!gr) return syncJson({ error: 'Gruppe nicht gefunden' }, 404, cors);
    const n = await env.SYNC_DB.prepare('SELECT COUNT(*) AS n FROM sync_paesse WHERE gruppe_id = ?').bind(gruppeId).first();
    if ((n ? n.n : 0) + eintraege.length > SYNC_MAX_CODES_GRUPPE) {
      return syncJson({ error: `Höchstens ${SYNC_MAX_CODES_GRUPPE} Codes pro Gruppe` }, 400, cors);
    }
  } else {
    const name = syncName(body.name);
    if (!name) return syncJson({ error: 'Name fehlt (1–40 Zeichen)' }, 400, cors);
    gruppeId = syncZufallHex(16);
    stmts.push(env.SYNC_DB.prepare('INSERT INTO sync_gruppen (id, name, erstellt) VALUES (?, ?, ?)').bind(gruppeId, name, jetzt));
  }

  eintraege.forEach(e => stmts.push(env.SYNC_DB.prepare(
    'INSERT INTO sync_paesse (id, gruppe_id, nr, auth_hash, erstellt) VALUES (?, ?, ?, ?, ?)'
  ).bind(e.id, gruppeId, e.nr, e.authHash, jetzt)));

  try { await env.SYNC_DB.batch(stmts); }
  catch (e) { return syncJson({ error: 'Code existiert bereits – bitte neu erzeugen' }, 409, cors); }
  return syncJson({ ok: true, gruppeId }, 200, cors);
}

// ── Gerät: Zahlen für die Gruppenauswertung melden ─────
//  Die Karte beweist nur, dass das iPad zu einer Gruppe gehört. Gespeichert wird
//  ausschließlich die Summe je Gruppe, Thema und Woche.
const syncStatTakt = new Map();                // Karte → letzte Meldung (nur im Speicher dieser Instanz)
const SYNC_STAT_WAS = /^[a-z0-9][a-z0-9._:?=&-]{0,79}$/i;
async function syncStatistik(body, env, cors) {
  const row = await syncPruefen(body, env);
  if (!row) return syncJson({ error: 'Code ungültig' }, 403, cors);
  const jetzt = Date.now(), letzte = syncStatTakt.get(row.id) || 0;
  if (jetzt - letzte < SYNC_STAT_ABSTAND_MS) return syncJson({ error: 'Zu schnell', warteMs: SYNC_STAT_ABSTAND_MS - (jetzt - letzte) }, 429, cors);
  const L = body.eintraege;
  if (!Array.isArray(L) || !L.length || L.length > SYNC_STAT_MAX) return syncJson({ error: `1 bis ${SYNC_STAT_MAX} Einträge` }, 400, cors);
  const frueh = new Date(jetzt - 35 * 864e5).toISOString().slice(0, 10), spaet = new Date(jetzt + 2 * 864e5).toISOString().slice(0, 10);
  const ganz = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
  const ok = L.every(e => e && typeof e === 'object' && SYNC_STAT_WAS.test(String(e.was || ''))
    && /^\d{4}-\d{2}-\d{2}$/.test(String(e.woche || '')) && e.woche >= frueh && e.woche <= spaet
    && ganz(e.runden, 1, 50) && ganz(e.aufgaben, 1, 2000) && ganz(e.richtig, 0, e.aufgaben));
  if (!ok) return syncJson({ error: 'Einträge ungültig' }, 400, cors);
  syncStatTakt.set(row.id, jetzt);
  if (syncStatTakt.size > 5000) syncStatTakt.clear();
  await env.SYNC_DB.batch(L.map(e => env.SYNC_DB.prepare(`INSERT INTO sync_statistik (gruppe_id, was, woche, runden, aufgaben, richtig)
      VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (gruppe_id, was, woche) DO UPDATE SET
      runden = runden + excluded.runden, aufgaben = aufgaben + excluded.aufgaben, richtig = richtig + excluded.richtig`)
    .bind(row.gruppe_id, e.was, e.woche, e.runden, e.aufgaben, e.richtig)));
  return syncJson({ ok: true }, 200, cors);
}

// ── Admin: Gruppenauswertung lesen ─────────────────────
async function syncAdminStatistik(body, env, cors) {
  const wochen = Number.isInteger(body.wochen) && body.wochen >= 1 && body.wochen <= 30 ? body.wochen : 4;
  const ab = new Date(Date.now() - wochen * 7 * 864e5).toISOString().slice(0, 10);
  const g = body.gruppeId === undefined ? null : String(body.gruppeId);
  if (g !== null && !SYNC_HEX32.test(g)) return syncJson({ error: 'Gruppe ungültig' }, 400, cors);
  const r = await (g
    ? env.SYNC_DB.prepare('SELECT gruppe_id, was, woche, runden, aufgaben, richtig FROM sync_statistik WHERE gruppe_id = ? AND woche >= ? ORDER BY woche').bind(g, ab)
    : env.SYNC_DB.prepare('SELECT gruppe_id, was, woche, runden, aufgaben, richtig FROM sync_statistik WHERE woche >= ? ORDER BY woche').bind(ab)).all();
  const zeilen = (r.results || []).map(x => ({ gruppe: x.gruppe_id, was: x.was, woche: x.woche, runden: x.runden, aufgaben: x.aufgaben, richtig: x.richtig }));
  return syncJson({ ok: true, zeilen }, 200, syncNoStore(cors));
}

// ── Admin: Gruppe umbenennen ───────────────────────────
async function syncAdminUmbenennen(body, env, cors) {
  const name = syncName(body.name);
  if (!SYNC_HEX32.test(String(body.gruppeId || '')) || !name) return syncJson({ error: 'Ungültige Angaben' }, 400, cors);
  const r = await env.SYNC_DB.prepare('UPDATE sync_gruppen SET name = ? WHERE id = ?').bind(name, body.gruppeId).run();
  if (!r.meta || r.meta.changes !== 1) return syncJson({ error: 'Gruppe nicht gefunden' }, 404, cors);
  return syncJson({ ok: true }, 200, cors);
}

// ── Admin: Gruppe löschen (samt Ständen) ───────────────
async function syncAdminGruppeLoeschen(body, env, cors) {
  const id = String(body.gruppeId || '');
  if (!SYNC_HEX32.test(id)) return syncJson({ error: 'Gruppe ungültig' }, 400, cors);
  await env.SYNC_DB.batch([
    env.SYNC_DB.prepare('DELETE FROM sync_paesse WHERE gruppe_id = ?').bind(id),
    env.SYNC_DB.prepare('DELETE FROM sync_statistik WHERE gruppe_id = ?').bind(id),
    env.SYNC_DB.prepare('DELETE FROM sync_gruppen WHERE id = ?').bind(id),
  ]);
  return syncJson({ ok: true }, 200, cors);
}

// ── Admin: einzelnen Code löschen (Karte ungültig) ─────
async function syncAdminCodeLoeschen(body, env, cors) {
  const id = String(body.id || '');
  if (!SYNC_HEX32.test(id)) return syncJson({ error: 'Code ungültig' }, 400, cors);
  await env.SYNC_DB.prepare('DELETE FROM sync_paesse WHERE id = ?').bind(id).run();
  return syncJson({ ok: true }, 200, cors);
}

// ── Aufräumen (Cron) ───────────────────────────────────
export async function syncAufraeumen(env) {
  if (!env.SYNC_DB) return;
  await syncSchema(env);
  const grenze = Date.now() - SYNC_AUFBEWAHRUNG_TAGE * 86400 * 1000;
  await env.SYNC_DB.batch([
    // lange nicht gesichert
    env.SYNC_DB.prepare('DELETE FROM sync_paesse WHERE letzte_sync IS NOT NULL AND letzte_sync < ?').bind(grenze),
    // nie benutzt und alt
    env.SYNC_DB.prepare('DELETE FROM sync_paesse WHERE letzte_sync IS NULL AND erstellt < ?').bind(grenze),
    // leere, alte Gruppen
    env.SYNC_DB.prepare('DELETE FROM sync_gruppen WHERE erstellt < ? AND id NOT IN (SELECT gruppe_id FROM sync_paesse)').bind(grenze),
    // alte Wochen der Gruppenauswertung und Zahlen gelöschter Gruppen
    env.SYNC_DB.prepare('DELETE FROM sync_statistik WHERE woche < ?').bind(new Date(Date.now() - SYNC_STAT_TAGE * 864e5).toISOString().slice(0, 10)),
    env.SYNC_DB.prepare('DELETE FROM sync_statistik WHERE gruppe_id NOT IN (SELECT id FROM sync_gruppen)'),
  ]);
}

// ── Hilfsfunktionen ────────────────────────────────────
function syncJson(obj, status, headers) {
  return new Response(JSON.stringify(obj), { status, headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' } });
}
function syncNoStore(cors) { return { ...cors, 'Cache-Control': 'no-store' }; }

function syncName(v) {
  const s = String(v ?? '').replace(/[\u0000-\u001f\u007f<>]/g, '').trim();
  return s.length >= 1 && s.length <= 40 ? s : '';
}
function syncZufallHex(bytes) {
  const b = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
}
function syncHexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}
async function syncSha256Hex(bytes) {
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return Array.from(h, x => x.toString(16).padStart(2, '0')).join('');
}
// Zeitkonstanter Vergleich zweier gleich langer Hex-Strings
function syncGleich(a, b) {
  const x = new TextEncoder().encode(a), y = new TextEncoder().encode(b);
  if (x.length !== y.length) return false;
  if (crypto.subtle.timingSafeEqual) return crypto.subtle.timingSafeEqual(x, y);
  let d = 0;
  for (let i = 0; i < x.length; i++) d |= x[i] ^ y[i];
  return d === 0;
}
