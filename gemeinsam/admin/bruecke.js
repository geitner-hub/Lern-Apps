// ═══════════════════════════════════════════════════════
//  Lernwelt-Admin (neu) – Brücke zu den bisherigen Admin-Funktionen  (Admin-Umbau Etappe 2)
//
//  Der neue Admin nutzt die bewährten Dateien des bisherigen Admins (apps.js, ordnen.js, tags.js,
//  werkzeuge.js, pass.js, spiele.js, dorf.js, uebersicht.js, freigaben.js, medien.js) unverändert.
//  Diese Datei ersetzt für sie kern.js: Sie stellt dieselben globalen Namen bereit (CONFIG, saveConfig,
//  logChange-Verlauf, buildAll, showToast, showLogin …), schreibt aber über LWAdmin.store.
//
//  Die Reiter des bisherigen Admins stehen in admin-neu.html einmal im versteckten Bereich #lw-park
//  (gleiche ids wie in admin.html, weil die alten Dateien beim Laden Ereignisse daran hängen).
//  Ein Modul aus LWAdmin.altModul({ …, teil: 'id' }) hängt beim Zeigen nur seinen Teil in den
//  Inhaltsbereich und legt ihn beim Verlassen zurück.
//
//  Lädt nach store.js und module.js, vor den alten Dateien. Wird beim Umstieg (Ende Etappe 2) mit
//  den alten Dateien zusammen in die Module überführt.
// ═══════════════════════════════════════════════════════
'use strict';

// Gleiche globale Variablen wie in kern.js – die alten Dateien greifen direkt darauf zu
let CONFIG   = ConfigAPI.migrate({});
let ghSha    = '';
let modalAppName = '';
let dragSrc  = null;
let changelog = [];
let selectedAnnColor    = 0;
let selectedNewTagColor = 0;

(() => {
  const store = LWAdmin.store;
  const klon = o => JSON.parse(JSON.stringify(o));
  let eigene = false;            // Änderung kommt gerade von saveConfig() → CONFIG nicht ersetzen
  let aktuell = null;            // id des gezeigten alten Moduls
  let ctx = { toast: (t) => console.log(t) };

  // ── Speichern: CONFIG (von den alten Dateien geändert) → Entwurf in der Datenschicht ──
  window.saveConfig = function saveConfig() {
    if (store.gesperrt()) { showToast('⚠ Speichern gesperrt – bitte Seite neu laden', true); return; }
    const letzte = changelog.length ? changelog[changelog.length - 1].msg : 'Einstellungen geändert';
    eigene = true;
    try { store.aendern(letzte, () => klon(CONFIG)); }
    catch (e) { showToast('⚠ ' + e.message, true); }
    finally { eigene = false; }
  };

  // Laden, Verwerfen oder ein anderes Modul hat geändert → CONFIG neu übernehmen und neu zeichnen
  store.abonnieren(() => {
    if (eigene || !store.geladen()) return;
    const d = store.daten();
    ghSha = store.gesperrt() ? null : 'store';
    if (JSON.stringify(d) === JSON.stringify(CONFIG)) return;
    CONFIG = klon(d);
    buildAll();
    if (typeof loadAnnForm === 'function') loadAnnForm();
  });

  window.showToast = (text, fehler = false) => ctx.toast(text, fehler);
  window.showLogin = text => LWAdmin.anmeldungZeigen(text);
  window.setSync = () => {};                       // Anzeige übernimmt die Kopfleiste

  // ── buildAll wie in kern.js: Listen neu, nachladende Reiter nur, wenn sie gerade zu sehen sind ──
  const SICHTBAR = {
    dorf:        ['dorf'],
    freigaben:   ['freigaben', 'fokus', 'spielsperre', 'auswertung'],
    lernwege:    ['lernwege'],
  };
  const zuSehen = gruppe => SICHTBAR[gruppe].includes(aktuell);
  window.buildAll = function buildAll() {
    buildPassAdmin();
    if (zuSehen('dorf')) buildDorfAdmin();
    if (zuSehen('freigaben')) buildFreigaben();
    if (zuSehen('lernwege')) buildLernwegeTab();
    buildDashboard();
    buildAppList();
    buildOrdnen();
    buildTagManager();
    buildTagAssignList();
  };

  // Fach- und Klassen-Auswahlen aus shared.js füllen (wie in kern.js)
  ['f-fach', 'fach-filter'].forEach(id => {
    const sel = document.getElementById(id);
    if (sel) FAECHER.forEach(f => { const o = document.createElement('option'); o.textContent = f; o.value = f; sel.appendChild(o); });
  });
  ['klasse-filter', 'vorschau-klasse'].forEach(id => {
    const sel = document.getElementById(id);
    if (sel) KLASSEN.forEach(k => { const o = document.createElement('option'); o.value = k; o.textContent = 'Klasse ' + k; sel.appendChild(o); });
  });

  /** Nach dem ersten Laden einmal: alles aufbauen (wie loadConfig in kern.js) */
  let erstmals = true;
  LWAdmin.bruecke = {
    start(c) {
      ctx = c;
      if (!erstmals) return;
      erstmals = false;
      CONFIG = klon(store.daten());
      ghSha = store.gesperrt() ? null : 'store';
      buildAll();
      if (typeof loadAnnForm === 'function') loadAnnForm();
    },
  };

  /**
   * Modul aus einem Teil des bisherigen Admins.
   *   teil:   id des Elements im Bereich #lw-park
   *   oeffnen: optional, beim Zeigen aufrufen (Reiter, die erst dann laden – Dorf, Unterricht, Lernwege, Medien)
   */
  LWAdmin.altModul = def => LWAdmin.modul({
    ...def,
    zeigen(host) {
      const el = document.getElementById(def.teil);
      if (!el) throw new Error('Teil ' + def.teil + ' fehlt in admin-neu.html');
      host.appendChild(el);
      el.hidden = false;
      aktuell = def.id;
      if (def.oeffnen) def.oeffnen();
      return () => {
        el.hidden = true;
        document.getElementById('lw-park').appendChild(el);
        if (aktuell === def.id) aktuell = null;
      };
    },
  });
})();
