// ═══════════════════════════════════════════════════════
//  Lernwelt – config-api.js
//  Laden und Speichern der App-Konfiguration.
//
//  Abhängigkeiten: shared.js muss vorher geladen sein.
//
//  Startseite (öffentlich, schnell, ohne Worker):
//    const { config, fromCache } = await ConfigAPI.loadPublic();
//
//  Admin (über den Worker, mit sha für konfliktfreies Speichern):
//    const res = await ConfigAPI.login(passwort);      // { ok, status, error }
//    const { config, sha } = await ConfigAPI.loadAdmin();
//    const r = await ConfigAPI.save(config, sha, 'Nachricht'); // { ok, newSha, status, error }
//
//  Das Passwort wird NUR im sessionStorage dieses Tabs gehalten
//  (weg beim Schließen des Tabs) und NIE im Code gespeichert.
// ═══════════════════════════════════════════════════════

'use strict';

const ConfigAPI = (() => {

  const WORKER_URL     = 'https://lern-apps-config.bennigeitner.workers.dev';
  const STATIC_URL     = 'config.json';
  const CACHE_KEY      = 'lernwelt-config-cache';
  const CACHE_TS_KEY   = 'lernwelt-config-cache-ts';
  const PW_KEY         = 'lernwelt-admin-pw';
  const CONFIG_VERSION = 1;

  // Standard-Config – verhindert undefined-Fehler bei fehlenden Feldern
  const DEFAULTS = () => ({
    version:      CONFIG_VERSION,
    apps:         [],
    customTags:   [],
    hiddenCats:   [],
    announcement: { active: false, text: '', emoji: '📢', color: 0 },
  });

  // ── Base64 <-> UTF-8 (Umlaute & Emojis sicher) ─────────
  function b64ToUtf8(b64) {
    const bin = atob(String(b64).replace(/\s/g, ''));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  function utf8ToB64(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }

  // ── Normalisieren (alte Formate, fehlende Felder) ───────
  function migrate(raw) {
    const d = DEFAULTS();
    const cfg = { ...d, ...(raw && typeof raw === 'object' ? raw : {}) };
    if (!Array.isArray(cfg.apps))       cfg.apps = [];
    if (!Array.isArray(cfg.customTags)) cfg.customTags = [];
    if (!Array.isArray(cfg.hiddenCats)) cfg.hiddenCats = [];
    cfg.customTags = cfg.customTags.map(t => typeof t === 'string' ? { name: t, color: 0 } : t);
    cfg.announcement = { ...d.announcement, ...(cfg.announcement || {}) };
    cfg.apps = cfg.apps.filter(a => a && typeof a === 'object').map(a => ({
      name: '', datei: '', fach: '', emoji: '📱', beschreibung: '',
      hidden: false, klassen: [], customTags: [], aod: false,
      ...a,
      klassen:    Array.isArray(a.klassen) ? a.klassen : [],
      customTags: (Array.isArray(a.customTags) ? a.customTags : []).map(t => typeof t === 'string' ? { name: t, color: 0 } : t),
    }));
    cfg.version = CONFIG_VERSION;
    return cfg;
  }

  function writeCache(cfg) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cfg));
      localStorage.setItem(CACHE_TS_KEY, Date.now().toString());
    } catch (e) { /* localStorage voll/gesperrt */ }
  }
  function readCache() {
    try { const r = localStorage.getItem(CACHE_KEY); return r ? JSON.parse(r) : null; }
    catch (e) { return null; }
  }

  // ── Passwort (nur für diesen Tab) ──────────────────────
  function getPw()   { try { return sessionStorage.getItem(PW_KEY) || ''; } catch (e) { return ''; } }
  function setPw(pw) { try { sessionStorage.setItem(PW_KEY, pw); } catch (e) {} }
  function logout()  { try { sessionStorage.removeItem(PW_KEY); } catch (e) {} }
  function hasSession() { return !!getPw(); }

  async function readError(r) {
    try { const j = await r.json(); return j.error || ('HTTP ' + r.status); }
    catch (e) { return 'HTTP ' + r.status; }
  }

  // ── Öffentlich: config.json direkt von GitHub Pages ────
  async function loadPublic() {
    try {
      const r = await fetch(STATIC_URL + '?t=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const cfg = migrate(await r.json());
      writeCache(cfg);
      return { config: cfg, fromCache: false };
    } catch (e) {
      console.warn('[ConfigAPI] config.json nicht erreichbar, nutze Cache:', e.message);
      const cached = readCache();
      return { config: migrate(cached || {}), fromCache: true, empty: !cached };
    }
  }

  // ── Admin: Login prüfen (serverseitig im Worker) ───────
  async function login(pw) {
    try {
      const r = await fetch(WORKER_URL + '/login', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + pw },
      });
      if (r.ok) { setPw(pw); return { ok: true, status: r.status }; }
      return { ok: false, status: r.status, error: await readError(r) };
    } catch (e) {
      return { ok: false, status: 0, error: await diagnose() };
    }
  }

  /**
   * Genauere Fehlermeldung, wenn der Browser die Antwort blockiert:
   * Antwortet der Worker überhaupt (dann fehlt die CORS-Freigabe → alter Code,
   * Absturz oder falsche Seite) oder ist er gar nicht erreichbar?
   */
  async function diagnose() {
    if (location.protocol === 'file:') {
      return 'Admin bitte über https://geitner-hub.github.io/Lern-Apps/admin.html öffnen, nicht als lokale Datei';
    }
    try {
      await fetch(WORKER_URL + '/?probe=' + Date.now(), { mode: 'no-cors', cache: 'no-store' });
      return 'Worker antwortet, blockiert aber die Anfrage – alter Worker-Code aktiv, Worker abgestürzt oder Seite nicht unter ' +
             'https://geitner-hub.github.io geöffnet (Details: F12 → Konsole)';
    } catch (e) {
      return 'Worker nicht erreichbar – Adresse falsch, Worker gelöscht oder keine Internetverbindung';
    }
  }

  // ── Admin: aktuelle Version inkl. sha über den Worker ──
  async function loadAdmin() {
    const r = await fetch(WORKER_URL + '?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) throw new Error(await readError(r));
    const d = await r.json();
    const cfg = migrate(JSON.parse(b64ToUtf8(d.content)));
    writeCache(cfg);
    return { config: cfg, sha: d.sha };
  }

  // ── Admin: speichern ───────────────────────────────────
  async function save(config, sha, message) {
    const pw = getPw();
    if (!pw) return { ok: false, status: 401, error: 'Nicht angemeldet' };
    const toSave = { ...config };
    delete toSave.specialLists; delete toSave.units; delete toSave.meta; // Vokabeln gehören nicht hierher
    try {
      const body = {
        content: utf8ToB64(JSON.stringify(toSave, null, 2) + '\n'),
        sha:     sha || undefined,
        message: String(message || 'Einstellungen aktualisiert').slice(0, 100),
      };
      const r = await fetch(WORKER_URL, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + pw },
        body:    JSON.stringify(body),
      });
      if (!r.ok) {
        if (r.status === 401) logout();
        return { ok: false, status: r.status, error: r.status === 409 ? 'CONFLICT' : await readError(r) };
      }
      const d = await r.json();
      writeCache(toSave);
      return { ok: true, newSha: d.sha ?? d.content?.sha ?? sha };
    } catch (e) {
      return { ok: false, status: 0, error: await diagnose() };
    }
  }

  function getCacheAge() {
    try {
      const ts = parseInt(localStorage.getItem(CACHE_TS_KEY), 10);
      return ts ? Math.round((Date.now() - ts) / 1000) : null;
    } catch (e) { return null; }
  }

  return {
    loadPublic, loadAdmin, login, logout, hasSession, getPw, save, getCacheAge, migrate,
    load: loadPublic,           // Abwärtskompatibel
    WORKER_URL,
    _b64: { b64ToUtf8, utf8ToB64 },   // für Tests
  };
})();
