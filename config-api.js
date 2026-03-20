// ═══════════════════════════════════════════════════════
//  Lernwelt – config-api.js
//  Laden und Speichern der App-Konfiguration.
//
//  Abhängigkeiten: shared.js muss vorher geladen sein.
//
//  Verwendung:
//    const config = await ConfigAPI.load();
//    await ConfigAPI.save(config);
// ═══════════════════════════════════════════════════════

'use strict';

const ConfigAPI = (() => {

  const WORKER_URL   = 'https://lern-apps-config.bennigeitner.workers.dev';
  const CACHE_KEY    = 'lernwelt-config-cache';
  const CACHE_TS_KEY = 'lernwelt-config-cache-ts';
  const CONFIG_VERSION = 1;

  // Standard-Config – verhindert undefined-Fehler bei fehlenden Feldern
  const DEFAULTS = {
    version:      CONFIG_VERSION,
    apps:         [],
    customTags:   [],
    hiddenCats:   [],
    announcement: { active: false, text: '', emoji: '📢', color: 0 },
  };

  // ── Interne Hilfsfunktionen ────────────────────────────

  function decode(raw) {
    return JSON.parse(
      decodeURIComponent(
        atob(raw.replace(/\n/g, ''))
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      )
    );
  }

  function encode(obj) {
    return btoa(unescape(encodeURIComponent(JSON.stringify(obj, null, 2))));
  }

  function migrate(cfg) {
    // Tags: alte String-Tags → Objekte
    if (Array.isArray(cfg.customTags)) {
      cfg.customTags = cfg.customTags.map(t =>
        typeof t === 'string' ? { name: t, color: 0 } : t
      );
    }
    // Version setzen
    cfg.version = CONFIG_VERSION;
    return cfg;
  }

  function writeCache(cfg) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cfg));
      localStorage.setItem(CACHE_TS_KEY, Date.now().toString());
    } catch (e) { /* localStorage voll oder nicht verfügbar */ }
  }

  function readCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function cacheAge() {
    const ts = localStorage.getItem(CACHE_TS_KEY);
    return ts ? Date.now() - parseInt(ts) : Infinity;
  }

  // ── Öffentliche API ────────────────────────────────────

  /**
   * Konfiguration laden.
   * Bei Erfolg → Worker-Daten, bei Fehler → localStorage-Cache.
   * Gibt { config, sha, fromCache } zurück.
   */
  async function load() {
    try {
      const r = await fetch(WORKER_URL);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      const parsed = migrate({ ...DEFAULTS, ...decode(d.content) });
      writeCache(parsed);
      return { config: parsed, sha: d.sha, fromCache: false };
    } catch (e) {
      console.warn('[ConfigAPI] Worker nicht erreichbar, nutze Cache:', e.message);
      const cached = readCache();
      if (cached) {
        return { config: migrate({ ...DEFAULTS, ...cached }), sha: '', fromCache: true };
      }
      // Kein Cache → leere Standard-Config
      return { config: { ...DEFAULTS }, sha: '', fromCache: true };
    }
  }

  /**
   * Konfiguration speichern.
   * Gibt { ok, newSha, error } zurück.
   */
  async function save(config, sha) {
    // Vokabeln gehören nicht in die App-Config
    const toSave = { ...config };
    delete toSave.specialLists;
    delete toSave.units;
    delete toSave.meta;

    try {
      const body = { message: 'Admin: Einstellungen aktualisiert', content: encode(toSave), branch: 'main' };
      if (sha) body.sha = sha;

      const r = await fetch(WORKER_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const txt = await r.text().catch(() => r.status);
        if (r.status === 409) throw new Error('CONFLICT');
        throw new Error(`HTTP ${r.status}: ${txt}`);
      }
      const d = await r.json();
      writeCache(toSave);
      return { ok: true, newSha: d.content?.sha ?? sha };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  /**
   * Gibt das Alter des Caches in Sekunden zurück.
   * Nützlich für ein „zuletzt aktualisiert"-Label.
   */
  function getCacheAge() {
    const ms = cacheAge();
    return ms === Infinity ? null : Math.round(ms / 1000);
  }

  return { load, save, getCacheAge, WORKER_URL };

})();
