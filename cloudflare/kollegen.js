// ═══════════════════════════════════════════════════════
//  Lernwelt – Cloudflare Worker, Teil „Kollegen-Zugänge“  (Admin-Umbau Etappe 10: Rollen)
//
//  Kolleginnen und Kollegen der eigenen Schule bekommen einen eigenen Zugangscode (16 Zeichen) statt des
//  Admin-Passworts. Damit sehen sie im Admin nur den Unterrichtsmodus (App-QR, Medien, „Spiele heute frei“,
//  Fokus) für die Gruppen, die ihnen zugeteilt sind. Der Worker prüft das selbst (kollegeDarf in worker.js):
//  ein Kollegen-Schlüssel darf in config.json nur fokus[] und spielsperre.ausnahmen[] ändern, und nur
//  Einträge für seine Gruppen (wer/fuer = g:<Gruppe>).
//
//  Tabelle kollegen in SYNC_DB (legt sich selbst an). Gespeichert wird nur ein Kürzel (kein voller Name nötig),
//  die Gruppen-IDs, Ablaufdatum, aktiv – und vom Code nur sein SHA-256-Wert. Der Code selbst wird einmal angezeigt.
//
//  Endpunkte (nur Hauptzugang, Header: Authorization: Bearer <schlüssel>):
//    POST /kollegen/liste        {}                                   → { kollegen: [{ id, kuerzel, gruppen, aktiv, bis, angelegt, zuletzt }] }
//    POST /kollegen/anlegen      { kuerzel, gruppen: [ids], bis }      → { id, code }
//    POST /kollegen/aendern      { id, kuerzel?, gruppen?, bis?, aktiv? }
//    POST /kollegen/neuer-code   { id }                               → { code }  (der alte gilt sofort nicht mehr)
//    POST /kollegen/loeschen     { id }
//  Alle Namen beginnen mit „kollege“, damit sich nichts mit worker.js überschneidet.
// ═══════════════════════════════════════════════════════

const KOLLEGE_ZEICHEN = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';      // ohne 0/O, 1/I – gut abzuschreiben
const KOLLEGE_MAX = 40;
const KOLLEGE_TAGE_MAX = 400;                                     // Ablauf höchstens gut ein Schuljahr voraus
let kollegeSchemaOk = false;

async function kollegeSchema(db) {
  if (kollegeSchemaOk) return;
  await db.prepare(`CREATE TABLE IF NOT EXISTS kollegen (
      id TEXT PRIMARY KEY, kuerzel TEXT NOT NULL, gruppen TEXT NOT NULL DEFAULT '[]',
      code_hash TEXT NOT NULL UNIQUE, aktiv INTEGER NOT NULL DEFAULT 1, bis INTEGER NOT NULL,
      angelegt INTEGER NOT NULL, zuletzt INTEGER NOT NULL DEFAULT 0)`).run();
  kollegeSchemaOk = true;
}

/** Eingabe beim Anmelden → normierter Code oder '' (kein Kollegen-Code) */
export function kollegeCodeNorm(text) {
  const c = String(text || '').toUpperCase().replace(/[\s-]/g, '');
  return c.length === 16 && [...c].every(z => KOLLEGE_ZEICHEN.includes(z)) ? c : '';
}
async function kollegeHash(code) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('lernwelt-kollege|' + code));
  return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('');
}
function kollegeNeuerCode() {
  const z = crypto.getRandomValues(new Uint8Array(16));
  const c = [...z].map(b => KOLLEGE_ZEICHEN[b % KOLLEGE_ZEICHEN.length]).join('');     // 256 / 32 Zeichen: gleichverteilt, 80 Bit
  return { code: c, anzeige: c.match(/.{4}/g).join('-') };
}
const kollegeZeile = r => r && ({ id: r.id, kuerzel: r.kuerzel, gruppen: JSON.parse(r.gruppen || '[]'), aktiv: !!r.aktiv, bis: r.bis, angelegt: r.angelegt, zuletzt: r.zuletzt });
const kollegeGilt = k => !!k && k.aktiv && k.bis > Date.now();

/** Anmeldung mit Code → Kollege (aktiv, nicht abgelaufen) oder null */
export async function kollegeFuerCode(env, code) {
  if (!env.SYNC_DB || !code) return null;
  await kollegeSchema(env.SYNC_DB);
  const r = await env.SYNC_DB.prepare('SELECT * FROM kollegen WHERE code_hash = ?').bind(await kollegeHash(code)).first();
  const k = kollegeZeile(r);
  if (!kollegeGilt(k)) return null;
  await env.SYNC_DB.prepare('UPDATE kollegen SET zuletzt = ? WHERE id = ?').bind(Date.now(), k.id).run();
  return k;
}
/** Bei jedem Schlüssel neu nachsehen: Sperren und Ablauf wirken sofort */
export async function kollegeHolen(env, id) {
  if (!env.SYNC_DB || !/^[0-9a-f]{16}$/.test(String(id))) return null;
  await kollegeSchema(env.SYNC_DB);
  const k = kollegeZeile(await env.SYNC_DB.prepare('SELECT * FROM kollegen WHERE id = ?').bind(id).first());
  return kollegeGilt(k) ? k : null;
}

function kollegeEingabe(body, neu) {
  const p = {};
  if (neu || body.kuerzel !== undefined) {
    const k = String(body.kuerzel || '').trim();
    if (!k || k.length > 20 || /[<>\u0000-\u001f]/.test(k)) return { fehler: 'Kürzel: 1–20 Zeichen' };
    p.kuerzel = k;
  }
  if (neu || body.gruppen !== undefined) {
    if (!Array.isArray(body.gruppen) || body.gruppen.length > 20 || body.gruppen.some(g => !/^[0-9a-f]{32}$/.test(String(g)))) return { fehler: 'gruppen: Liste von Gruppen-IDs' };
    p.gruppen = [...new Set(body.gruppen)];
  }
  if (neu || body.bis !== undefined) {
    const b = Number(body.bis);
    if (!Number.isFinite(b) || b <= Date.now() || b > Date.now() + KOLLEGE_TAGE_MAX * 864e5) return { fehler: `bis: Datum in der Zukunft (höchstens ${KOLLEGE_TAGE_MAX} Tage)` };
    p.bis = Math.round(b);
  }
  if (body.aktiv !== undefined) {
    if (typeof body.aktiv !== 'boolean') return { fehler: 'aktiv: true/false' };
    p.aktiv = body.aktiv ? 1 : 0;
  }
  return { p };
}

export async function handleKollegen(request, env, cors, url, h) {
  const auth = await h.checkHaupt(request, env);
  if (!auth.ok) return h.json({ error: auth.error }, auth.status, cors);
  if (request.method !== 'POST') return h.json({ error: 'Nur POST' }, 405, cors);
  if (!env.SYNC_DB) return h.json({ error: 'Dafür fehlt die Datenbank SYNC_DB (siehe cloudflare/ANLEITUNG-SYNC.md)' }, 501, cors);
  const raw = await request.text();
  if (raw.length > 5000) return h.json({ error: 'Zu groß' }, 413, cors);
  let body;
  try { body = JSON.parse(raw || '{}'); } catch { return h.json({ error: 'Ungültiges JSON' }, 400, cors); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return h.json({ error: 'Ungültige Anfrage' }, 400, cors);
  const db = env.SYNC_DB;
  await kollegeSchema(db);
  const p = url.pathname;

  if (p === '/kollegen/liste') {
    const r = await db.prepare('SELECT * FROM kollegen ORDER BY angelegt').all();
    return h.json({ kollegen: (r.results || []).map(kollegeZeile) }, 200, { ...cors, 'Cache-Control': 'no-store' });
  }
  if (p === '/kollegen/anlegen') {
    const n = await db.prepare('SELECT COUNT(*) AS n FROM kollegen').first();
    if (n && n.n >= KOLLEGE_MAX) return h.json({ error: `Höchstens ${KOLLEGE_MAX} Zugänge` }, 400, cors);
    const e = kollegeEingabe(body, true);
    if (e.fehler) return h.json({ error: e.fehler }, 400, cors);
    const id = [...crypto.getRandomValues(new Uint8Array(8))].map(b => b.toString(16).padStart(2, '0')).join('');
    const c = kollegeNeuerCode();
    await db.prepare('INSERT INTO kollegen (id, kuerzel, gruppen, code_hash, aktiv, bis, angelegt) VALUES (?, ?, ?, ?, 1, ?, ?)')
      .bind(id, e.p.kuerzel, JSON.stringify(e.p.gruppen), await kollegeHash(c.code), e.p.bis, Date.now()).run();
    return h.json({ ok: true, id, code: c.anzeige }, 200, { ...cors, 'Cache-Control': 'no-store' });
  }
  const id = String(body.id || '');
  if (!/^[0-9a-f]{16}$/.test(id)) return h.json({ error: 'id fehlt' }, 400, cors);
  const da = await db.prepare('SELECT id FROM kollegen WHERE id = ?').bind(id).first();
  if (!da) return h.json({ error: 'Zugang nicht gefunden' }, 404, cors);
  if (p === '/kollegen/aendern') {
    const e = kollegeEingabe(body, false);
    if (e.fehler) return h.json({ error: e.fehler }, 400, cors);
    const felder = Object.keys(e.p);
    if (!felder.length) return h.json({ error: 'Nichts zu ändern' }, 400, cors);
    const werte = felder.map(f => f === 'gruppen' ? JSON.stringify(e.p[f]) : e.p[f]);
    await db.prepare(`UPDATE kollegen SET ${felder.map(f => f + ' = ?').join(', ')} WHERE id = ?`).bind(...werte, id).run();
    return h.json({ ok: true }, 200, cors);
  }
  if (p === '/kollegen/neuer-code') {
    const c = kollegeNeuerCode();
    await db.prepare('UPDATE kollegen SET code_hash = ? WHERE id = ?').bind(await kollegeHash(c.code), id).run();
    return h.json({ ok: true, code: c.anzeige }, 200, { ...cors, 'Cache-Control': 'no-store' });
  }
  if (p === '/kollegen/loeschen') {
    await db.prepare('DELETE FROM kollegen WHERE id = ?').bind(id).run();
    return h.json({ ok: true }, 200, cors);
  }
  return h.json({ error: 'Nicht gefunden' }, 404, cors);
}
