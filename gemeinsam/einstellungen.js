// ═══════════════════════════════════════════════════════
//  Lernwelt – einstellungen.js   (Admin-Umbau Etappe 7: App-Manifest und Einstellungs-Schema)
//
//  Jede App bzw. jedes Spiel kann in daten/apps/<id>.json beschreiben, was die Lehrkraft einstellen darf
//  (Typ, Titel, Standard, Grenzen). Der Admin baut daraus das Formular (Inhalte → App-Einstellungen),
//  die Werte stehen in config.json → appEinstellungen[<id>][<schluessel>] (oder unter einem bestehenden
//  config-Pfad, z. B. dorf.plaetze). In der App:
//
//    await LernEinstellungen.anwenden('burg-verteidigung', CFG);   // schreibt Werte in CFG (Feld „ziel“)
//    const w = await LernEinstellungen.werte('runner');             // { schluessel: wert } ohne CFG
//
//  Ohne Eintrag gilt der Standard – genau wie vor Etappe 7. Ungültige Werte (Typ, Grenzen, Auswahl)
//  fallen auf den Standard zurück. Offline ohne Manifest: CFG bleibt, wie es ist.
//  Typen: schalter, zahl (min, max, schritt), auswahl (optionen [{ wert, titel }]), text (max),
//         inhaltsliste (Liste von Inhalts-IDs, max) – Vorentlastung für die Editoren in Etappe 8/9.
// ═══════════════════════════════════════════════════════
'use strict';

window.LernEinstellungen = (() => {
  const ROOT = new URL('../', document.currentScript ? document.currentScript.src : location.href).href;  // Hauptordner
  const manifeste = {};

  function manifest(id) {
    if (!/^[a-z0-9-]{1,40}$/.test(id)) return Promise.resolve(null);
    if (!manifeste[id]) manifeste[id] = fetch(ROOT + 'daten/apps/' + id + '.json').then(r => r.ok ? r.json() : null).catch(() => null);
    return manifeste[id];
  }

  const holen = (o, pfad) => String(pfad).split('.').reduce((x, k) => (x && typeof x === 'object' ? x[k] : undefined), o);
  function setzen(o, pfad, wert) {
    const teile = String(pfad).split('.'), letzter = teile.pop();
    const ziel = teile.reduce((x, k) => (x[k] && typeof x[k] === 'object' ? x[k] : (x[k] = {})), o);
    ziel[letzter] = wert;
  }

  /** Wert gegen die Beschreibung prüfen → gültiger Wert oder undefined */
  function pruefe(e, v) {
    if (v === undefined || v === null) return undefined;
    switch (e.typ) {
      case 'schalter': return typeof v === 'boolean' ? v : undefined;
      case 'zahl': {
        if (typeof v !== 'number' || !Number.isFinite(v)) return undefined;
        const n = Math.min(e.max ?? Infinity, Math.max(e.min ?? -Infinity, v));
        return e.schritt ? Math.round(n / e.schritt) * e.schritt : n;
      }
      case 'auswahl': return (e.optionen || []).some(o => o.wert === v) ? v : undefined;
      case 'text': return typeof v === 'string' ? v.slice(0, e.max || 200) : undefined;
      case 'inhaltsliste': return Array.isArray(v) ? v.filter(x => typeof x === 'string' && /^[a-z0-9][a-z0-9:/_.+-]{0,79}$/i.test(x)).slice(0, e.max || 50) : undefined;
      default: return undefined;
    }
  }

  /** Wo der Wert in config.json steht */
  const pfadIn = (id, e) => e.config || 'appEinstellungen.' + id + '.' + e.schluessel;

  function configLesen() {
    try { return JSON.parse(localStorage.getItem('lernwelt-config-cache') || 'null') || {}; } catch (e) { return {}; }
  }

  /** Werte aus einer config (Standard: Zwischenspeicher der Startseite) → { schluessel: wert } */
  function werteAus(m, config) {
    const out = {};
    (m && m.einstellungen || []).forEach(e => {
      const v = pruefe(e, holen(config || {}, pfadIn(m.id, e)));
      out[e.schluessel] = v === undefined ? e.standard : v;
    });
    return out;
  }

  async function werte(id, config) {
    const m = await manifest(id);
    return m ? werteAus(m, config || configLesen()) : {};
  }

  /** Werte in das CFG-Objekt der App schreiben (Feld „ziel“ des Manifests) → { schluessel: wert } */
  async function anwenden(id, CFG, config) {
    const m = await manifest(id);
    if (!m) return {};
    const w = werteAus(m, config || configLesen());
    if (CFG) m.einstellungen.forEach(e => { if (e.ziel) setzen(CFG, e.ziel, w[e.schluessel]); });
    return w;
  }

  return { anwenden, werte, manifest, pruefe, pfadIn, holen, setzen, werteAus };
})();
