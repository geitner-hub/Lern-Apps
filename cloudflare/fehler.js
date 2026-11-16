// ═══════════════════════════════════════════════════════
//  Lernwelt – Cloudflare Worker, Teil „Fehlerzähler“  (fehler.js, Aktionsplan „Lernwelt – Tempo“, Etappe 8, v133)
//
//  Die iPads melden Skriptfehler (gemeinsam/umgebung.js, fehlerMerken), damit die Lehrkraft merkt, wenn nach einem
//  Upload eine Seite auf den Schul-iPads abstürzt. Mit Zustimmung der Schulleitung (Nov. 2026).
//
//  Datenschutz: Gezählt werden nur Summen je Tag, Version, Seite und Fehlermeldung. Keine Gerätekennung, keine
//  Sicherungskarte, keine Gruppe, keine IP-Adresse wird gespeichert. Die Meldung wird vor dem Speichern gekürzt
//  (Adressen ohne Parameter, lange Zahlen und E-Mail-Adressen ersetzt). Nach FEHLER_TAGE Tagen gelöscht (Cron).
//
//  Tabelle in SYNC_DB (legt sich selbst an):
//    fehler_zaehler – tag 'JJJJ-MM-TT', version, seite, meldung, anzahl   (PRIMARY KEY tag, version, seite, meldung)
//
//  Endpunkte
//   iPads (ohne Schlüssel, per navigator.sendBeacon als Text)
//    POST /fehler { v: 'v133', s: 'apps/kopfrechnen.html', m: 'Meldung' }  → 204
//   Admin (Header Authorization: Bearer <Anmelde-Schlüssel>, nur Hauptzugang)
//    POST /fehler/admin/liste   { tage: 1–60 }  → { ok, zeilen: [{ version, seite, meldung, anzahl, tage, erster, letzter }] }
//    POST /fehler/admin/loeschen {}             → { ok }   alle Zählerstände löschen
//
//  Aufräumen: fehlerAufraeumen(env) im täglichen Cron (worker.js).
//  Alle Namen beginnen mit „fehler“, damit sich nichts mit worker.js überschneidet.
// ═══════════════════════════════════════════════════════

const FEHLER_TAGE       = 60;      // so lange bleiben Zählerstände
const FEHLER_MAX_TAG    = 1500;    // höchstens so viele verschiedene Zeilen je Tag (danach nur noch bestehende hochzählen)
const FEHLER_MAX_MINUTE = 30;      // Meldungen je Minute und Absender (nur im Arbeitsspeicher, nichts gespeichert)
const fehlerTakt = new Map();

/** Meldung säubern: keine Parameter in Adressen, keine langen Zahlen, keine E-Mail-Adressen */
export function fehlerSaeubern(text) {
  return String(text == null ? '' : text)
    .replace(/[\u0000-\u001f<>]/g, ' ')
    .replace(/(https?:\/\/[^\s?#"']+)[?#][^\s"']*/gi, '$1')
    .replace(/[^\s@"']+@[^\s@"']+\.[a-z]{2,}/gi, '[E-Mail]')
    .replace(/\d{5,}/g, '#')
    .replace(/\s+/g, ' ').trim().slice(0, 200);
}
const fehlerTag = () => new Date().toISOString().slice(0, 10);

async function fehlerSchema(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS fehler_zaehler (
    tag TEXT NOT NULL, version TEXT NOT NULL, seite TEXT NOT NULL, meldung TEXT NOT NULL, anzahl INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (tag, version, seite, meldung))`).run();
}

export async function handleFehler(request, env, cors, url, deps) {
  if (!env.SYNC_DB) return deps.json({ error: 'SYNC_DB fehlt' }, 500, cors);
  const db = env.SYNC_DB;
  await fehlerSchema(db);

  // ── Meldung eines iPads ──
  if (url.pathname === '/fehler' && request.method === 'POST') {
    const leer = new Response(null, { status: 204, headers: cors });
    const wer = request.headers.get('CF-Connecting-IP') || '?', minute = Math.floor(Date.now() / 60000);
    const t = fehlerTakt.get(wer);
    if (t && t.m === minute && t.n >= FEHLER_MAX_MINUTE) return leer;
    fehlerTakt.set(wer, t && t.m === minute ? { m: minute, n: t.n + 1 } : { m: minute, n: 1 });
    if (fehlerTakt.size > 5000) fehlerTakt.clear();
    let d = null;
    try { const text = await request.text(); if (text.length <= 2000) d = JSON.parse(text); } catch { d = null; }
    if (!d || typeof d !== 'object') return leer;
    const v = String(d.v || ''), s = String(d.s || ''), m = fehlerSaeubern(d.m);
    if (!/^v\d{1,4}$/.test(v) || !/^[A-Za-z0-9._\/-]{1,80}$/.test(s) || !m) return leer;
    const tag = fehlerTag();
    const neu = await db.prepare('UPDATE fehler_zaehler SET anzahl = anzahl + 1 WHERE tag = ? AND version = ? AND seite = ? AND meldung = ?')
      .bind(tag, v, s, m).run();
    if (!neu.meta || !neu.meta.changes) {
      const n = await db.prepare('SELECT COUNT(*) AS n FROM fehler_zaehler WHERE tag = ?').bind(tag).first();
      if (!n || n.n < FEHLER_MAX_TAG) {
        await db.prepare(`INSERT INTO fehler_zaehler (tag, version, seite, meldung, anzahl) VALUES (?, ?, ?, ?, 1)
          ON CONFLICT (tag, version, seite, meldung) DO UPDATE SET anzahl = anzahl + 1`).bind(tag, v, s, m).run();
      }
    }
    return leer;
  }

  // ── Admin ──
  if (url.pathname.startsWith('/fehler/admin/') && request.method === 'POST') {
    const auth = await deps.checkHaupt(request, env);
    if (!auth.ok) return deps.json({ error: auth.error }, auth.status, cors);
    const body = await request.json().catch(() => ({}));
    if (url.pathname === '/fehler/admin/liste') {
      const tage = Math.max(1, Math.min(FEHLER_TAGE, Math.round(Number(body.tage) || 7)));
      const ab = new Date(Date.now() - (tage - 1) * 864e5).toISOString().slice(0, 10);
      const r = await db.prepare(`SELECT version, seite, meldung, SUM(anzahl) AS anzahl, COUNT(*) AS tage, MIN(tag) AS erster, MAX(tag) AS letzter
          FROM fehler_zaehler WHERE tag >= ? GROUP BY version, seite, meldung ORDER BY anzahl DESC LIMIT 300`).bind(ab).all();
      return deps.json({ ok: true, zeilen: r.results || [] }, 200, Object.assign({}, cors, { 'Cache-Control': 'no-store' }));
    }
    if (url.pathname === '/fehler/admin/loeschen') {
      await db.prepare('DELETE FROM fehler_zaehler').run();
      return deps.json({ ok: true }, 200, cors);
    }
  }
  return deps.json({ error: 'Nicht gefunden' }, 404, cors);
}

export async function fehlerAufraeumen(env) {
  if (!env.SYNC_DB) return;
  await fehlerSchema(env.SYNC_DB);
  await env.SYNC_DB.prepare('DELETE FROM fehler_zaehler WHERE tag < ?').bind(new Date(Date.now() - FEHLER_TAGE * 864e5).toISOString().slice(0, 10)).run();
}
