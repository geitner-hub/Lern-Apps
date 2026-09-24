// ═══════════════════════════════════════════════════════
//  Lernwelt – Cloudflare Worker  (lern-apps-config)
//
//  Aufgabe: config.json im GitHub-Repo lesen und – nur mit
//  gültigem Passwort – schreiben. Das Passwort und der
//  GitHub-Token liegen AUSSCHLIESSLICH als Cloudflare-Secrets
//  vor, niemals im Repo.
//
//  Benötigte Secrets (Worker → Settings → Variables and Secrets):
//    ADMIN_PASSWORD  – dein Admin-Passwort (Typ: Secret)
//    GITHUB_TOKEN    – Fine-grained Token, nur Repo „Lern-Apps“,
//                      Berechtigung „Contents: Read and write“ (Typ: Secret)
//  Optional:
//    LOGIN_KV        – KV-Namespace-Binding für dauerhafte
//                      Sperre nach Fehlversuchen (siehe Anleitung)
//
//  Endpunkte:
//    GET  /          → { content (base64), sha }       (öffentlich, nur lesen)
//    POST /login     → 200 bei richtigem Passwort       (Header: Authorization: Bearer <pw>)
//    PUT  /          → config.json speichern            (Header: Authorization: Bearer <pw>)
//                      Body: { content (base64), sha, message }
// ═══════════════════════════════════════════════════════

// ── Einstellungen ──────────────────────────────────────
const REPO_OWNER = 'geitner-hub';
const REPO_NAME  = 'Lern-Apps';
const FILE_PATH  = 'config.json';   // der Worker kann NUR diese Datei schreiben
const BRANCH     = 'main';
const ALLOWED_ORIGINS = [
  'https://geitner-hub.github.io',
  // 'http://localhost:8000',       // zum lokalen Testen einkommentieren
];

const MAX_BODY_BYTES = 300_000;     // Schutz vor Riesen-Uploads
const MAX_FAILS      = 5;           // Fehlversuche …
const LOCK_SECONDS   = 15 * 60;     // … dann 15 Minuten Sperre

// Gleiche Regel wie isSafeLink() in shared.js
const SAFE_LINK = /^(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_.-]+\.html(?:\?[A-Za-z0-9_.~%=&+-]*)?(?:#[A-Za-z0-9_-]*)?$|^https:\/\/[^\s"'<>`]+$/;

// ── Einstieg ───────────────────────────────────────────
export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors   = corsHeaders(origin);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    // Browser-Anfragen von fremden Webseiten ablehnen
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      return json({ error: 'Origin nicht erlaubt' }, 403, cors);
    }

    if (!env.GITHUB_TOKEN || !env.ADMIN_PASSWORD) {
      return json({ error: 'Worker nicht konfiguriert (Secrets fehlen)' }, 500, cors);
    }

    const url = new URL(request.url);
    try {
      if (request.method === 'GET' && url.pathname === '/')       return await handleGet(env, cors);
      if (request.method === 'POST' && url.pathname === '/login') return await handleLogin(request, env, cors);
      if (request.method === 'PUT' && url.pathname === '/')       return await handlePut(request, env, cors);
      return json({ error: 'Nicht gefunden' }, 404, cors);
    } catch (e) {
      console.error(e);
      return json({ error: 'Interner Fehler' }, 500, cors);
    }
  },
};

// ── GET: config.json lesen ─────────────────────────────
async function handleGet(env, cors) {
  const r = await gh(env, `contents/${FILE_PATH}?ref=${BRANCH}`);
  if (!r.ok) return json({ error: 'GitHub: ' + r.status }, 502, cors);
  const d = await r.json();
  return json({ content: d.content, sha: d.sha }, 200, { ...cors, 'Cache-Control': 'no-store' });
}

// ── POST /login: nur Passwort prüfen ───────────────────
async function handleLogin(request, env, cors) {
  const auth = await checkAuth(request, env);
  if (!auth.ok) return json({ error: auth.error }, auth.status, cors);
  return json({ ok: true }, 200, cors);
}

// ── PUT: config.json schreiben ─────────────────────────
async function handlePut(request, env, cors) {
  const auth = await checkAuth(request, env);
  if (!auth.ok) return json({ error: auth.error }, auth.status, cors);

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return json({ error: 'Zu groß' }, 413, cors);

  let body;
  try { body = JSON.parse(raw); } catch { return json({ error: 'Ungültiges JSON' }, 400, cors); }
  if (!body || typeof body.content !== 'string') return json({ error: 'content fehlt' }, 400, cors);

  // Inhalt dekodieren und prüfen
  let cfg;
  try { cfg = JSON.parse(b64ToUtf8(body.content)); }
  catch { return json({ error: 'content ist kein gültiges Base64-JSON' }, 400, cors); }

  const problems = validateConfig(cfg);
  if (problems.length) return json({ error: 'Ungültige Config: ' + problems.slice(0, 5).join('; ') }, 422, cors);

  // Sauber neu serialisieren (keine versteckten Zeichen/Formatierungstricks)
  const clean = utf8ToB64(JSON.stringify(cfg, null, 2) + '\n');

  const message = 'Admin: ' + String(body.message || 'Einstellungen aktualisiert')
    .replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, 100);

  const payload = { message, content: clean, branch: BRANCH };
  if (typeof body.sha === 'string' && /^[0-9a-f]{40}$/.test(body.sha)) payload.sha = body.sha;

  const r = await gh(env, `contents/${FILE_PATH}`, { method: 'PUT', body: JSON.stringify(payload) });
  if (r.status === 409 || r.status === 422) {
    return json({ error: 'CONFLICT' }, 409, cors);   // Datei hat sich inzwischen geändert
  }
  if (!r.ok) return json({ error: 'GitHub: ' + r.status }, 502, cors);
  const d = await r.json();
  return json({ ok: true, sha: d.content?.sha, content: { sha: d.content?.sha } }, 200, cors);
}

// ── Validierung ────────────────────────────────────────
function validateConfig(cfg) {
  const p = [];
  const isStr  = (v, max) => typeof v === 'string' && v.length <= max;
  const isBool = v => v === undefined || typeof v === 'boolean';
  const isTag  = t => t && typeof t === 'object' && isStr(t.name, 40) && Number.isInteger(t.color) && t.color >= 0 && t.color < 16;

  if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) return ['Config ist kein Objekt'];
  if (!Array.isArray(cfg.apps) || cfg.apps.length > 500) p.push('apps fehlt/zu lang');
  if (cfg.customTags !== undefined && (!Array.isArray(cfg.customTags) || !cfg.customTags.every(isTag))) p.push('customTags ungültig');
  if (cfg.hiddenCats !== undefined && (!Array.isArray(cfg.hiddenCats) || !cfg.hiddenCats.every(c => isStr(c, 40)))) p.push('hiddenCats ungültig');

  const a = cfg.announcement;
  if (a !== undefined && (typeof a !== 'object' || a === null || !isBool(a.active) || !isStr(a.text ?? '', 300)
      || !isStr(a.emoji ?? '', 16) || (a.color !== undefined && !(Number.isInteger(a.color) && a.color >= 0 && a.color < 16)))) {
    p.push('announcement ungültig');
  }

  let aodCount = 0;
  (Array.isArray(cfg.apps) ? cfg.apps : []).forEach((app, i) => {
    const w = `App ${i + 1}`;
    if (!app || typeof app !== 'object') { p.push(w + ': kein Objekt'); return; }
    if (!isStr(app.name, 80) || !app.name.trim())          p.push(w + ': name');
    if (!isStr(app.datei, 300) || !SAFE_LINK.test(app.datei) || app.datei.includes('..')) p.push(w + ': datei unsicher');
    if (!isStr(app.fach, 40))                               p.push(w + ': fach');
    if (app.emoji !== undefined && !isStr(app.emoji, 16))   p.push(w + ': emoji');
    if (app.beschreibung !== undefined && !isStr(app.beschreibung, 300)) p.push(w + ': beschreibung');
    if (!isBool(app.hidden) || !isBool(app.aod))            p.push(w + ': hidden/aod');
    if (app.klassen !== undefined && (!Array.isArray(app.klassen) || !app.klassen.every(k => Number.isInteger(k) && k >= 1 && k <= 13))) p.push(w + ': klassen');
    if (app.customTags !== undefined && (!Array.isArray(app.customTags) || !app.customTags.every(isTag))) p.push(w + ': customTags');
    if (app.aod) aodCount++;
  });
  if (aodCount > 1) p.push('mehr als eine App des Tages');
  return p;
}

// ── Passwortprüfung mit Sperre nach Fehlversuchen ──────
const memFails = new Map();   // Fallback ohne KV (gilt nur pro Worker-Instanz)

async function checkAuth(request, env) {
  const ip  = request.headers.get('CF-Connecting-IP') || 'unknown';
  const key = 'fails:' + ip;

  const state = await getFails(env, key);
  if (state.lockedUntil && state.lockedUntil > Date.now()) {
    const min = Math.ceil((state.lockedUntil - Date.now()) / 60000);
    return { ok: false, status: 429, error: `Zu viele Fehlversuche – bitte in ${min} Min. erneut versuchen` };
  }

  const header = request.headers.get('Authorization') || '';
  const given  = header.startsWith('Bearer ') ? header.slice(7) : '';

  if (given && await safeEqual(given, env.ADMIN_PASSWORD)) {
    if (state.count) await setFails(env, key, null);
    return { ok: true };
  }

  const count = (state.count || 0) + 1;
  const next  = { count, lockedUntil: count >= MAX_FAILS ? Date.now() + LOCK_SECONDS * 1000 : 0 };
  await setFails(env, key, next);
  await new Promise(r => setTimeout(r, 800));   // bremst automatisches Durchprobieren
  return { ok: false, status: 401, error: 'Falsches Passwort' };
}

async function getFails(env, key) {
  if (env.LOGIN_KV) {
    const v = await env.LOGIN_KV.get(key, 'json');
    return v || {};
  }
  return memFails.get(key) || {};
}
async function setFails(env, key, value) {
  if (env.LOGIN_KV) {
    if (value) await env.LOGIN_KV.put(key, JSON.stringify(value), { expirationTtl: LOCK_SECONDS + 60 });
    else await env.LOGIN_KV.delete(key);
    return;
  }
  if (value) memFails.set(key, value); else memFails.delete(key);
}

// Zeitkonstanter Vergleich (verrät nicht, wie viele Zeichen stimmen)
async function safeEqual(a, b) {
  const enc = new TextEncoder();
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(String(a))),
    crypto.subtle.digest('SHA-256', enc.encode(String(b))),
  ]);
  const x = new Uint8Array(ha), y = new Uint8Array(hb);
  if (crypto.subtle.timingSafeEqual) return crypto.subtle.timingSafeEqual(x, y);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

// ── Hilfsfunktionen ────────────────────────────────────
function gh(env, path, init = {}) {
  return fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/${path}`, {
    ...init,
    headers: {
      'Authorization':        'Bearer ' + env.GITHUB_TOKEN,
      'Accept':               'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent':           'lernwelt-config-worker',
      'Content-Type':         'application/json',
    },
  });
}

function corsHeaders(origin) {
  const h = {
    'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age':       '86400',
    'Vary':                         'Origin',
  };
  if (ALLOWED_ORIGINS.includes(origin)) h['Access-Control-Allow-Origin'] = origin;
  return h;
}

function json(obj, status, headers) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function b64ToUtf8(b64) {
  const bin = atob(String(b64).replace(/\s/g, ''));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}
function utf8ToB64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
