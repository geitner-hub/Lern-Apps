// ═══════════════════════════════════════════════════════
//  Lernwelt-Admin – Brücke zu den Funktionsdateien  (Admin-Umbau Etappe 2)
//
//  Die Funktionsdateien gemeinsam/admin/*.js (apps, ordnen, sichtbarkeit, tags, werkzeuge, pass, spiele,
//  dorf, uebersicht, freigaben, medien) stammen aus dem Admin vor dem Umbau und arbeiten mit globalen
//  Namen: CONFIG ändern, logChange(text), saveConfig(), buildAll(), showToast(). Diese Datei stellt
//  diese Namen bereit (früher kern.js) und schreibt über LWAdmin.store.
//
//  Ihr HTML steht in admin.html einmal im versteckten Bereich #lw-park (feste ids – einige Dateien hängen
//  beim Laden Ereignisse daran). Ein Modul aus LWAdmin.altModul({ …, teil: 'id' }) hängt beim Zeigen
//  nur seinen Teil in den Inhaltsbereich und legt ihn beim Verlassen zurück.
//
//  Lädt nach store.js und module.js, vor den Funktionsdateien.
// ═══════════════════════════════════════════════════════
'use strict';

// Globale Variablen (früher kern.js) – die Funktionsdateien greifen direkt darauf zu
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
  let aktuell = null;            // id des gezeigten altModul-Moduls
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

  // Laden, Verwerfen oder ein natives Modul hat geändert → CONFIG neu übernehmen und neu zeichnen
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

  // ── buildAll: Listen neu, nachladende Reiter nur, wenn sie gerade zu sehen sind ──
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

  // Fach- und Klassen-Auswahlen aus shared.js füllen 
  ['f-fach', 'fach-filter'].forEach(id => {
    const sel = document.getElementById(id);
    if (sel) FAECHER.forEach(f => { const o = document.createElement('option'); o.textContent = f; o.value = f; sel.appendChild(o); });
  });
  ['klasse-filter', 'vorschau-klasse'].forEach(id => {
    const sel = document.getElementById(id);
    if (sel) KLASSEN.forEach(k => { const o = document.createElement('option'); o.value = k; o.textContent = 'Klasse ' + k; sel.appendChild(o); });
  });

  /** Nach dem ersten Laden einmal: alles aufbauen  */
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
   * Modul aus einem Teil der Funktionsdateien (HTML in #lw-park).
   *   teil:   id des Elements im Bereich #lw-park
   *   oeffnen: optional, beim Zeigen aufrufen (Reiter, die erst dann laden – Dorf, Unterricht, Lernwege, Medien)
   */
  LWAdmin.altModul = def => LWAdmin.modul({
    ...def,
    zeigen(host) {
      const el = document.getElementById(def.teil);
      if (!el) throw new Error('Teil ' + def.teil + ' fehlt in admin.html');
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
