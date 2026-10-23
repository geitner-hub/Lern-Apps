// ═══════════════════════════════════════════════════════
//  Lernwelt-Admin – Formular-Generator für App-Einstellungen  (Admin-Umbau Etappe 7)
//
//    await LWAdmin.formular.manifeste()          // alle Manifeste aus daten/apps/liste.json
//    await LWAdmin.formular.einhaengen(host, id) // Formular einer App in host zeichnen (aktueller Entwurf)
//
//  Aus dem Schema (gemeinsam/einstellungen.js) entstehen Schalter, Zahlenfelder, Auswahllisten, Textfelder
//  und Inhaltslisten. Jede Änderung landet im Entwurf (store.aendern), „↺“ setzt auf den Standard zurück.
//  Neue Einstellung = Eintrag im Manifest, kein Admin-Code.
// ═══════════════════════════════════════════════════════
'use strict';

window.LWAdmin = window.LWAdmin || {};

LWAdmin.formular = (() => {
  const ROOT = new URL('../../', document.currentScript.src).href;
  const E = () => window.LernEinstellungen;
  let liste = null;

  function manifeste() {
    if (!liste) liste = fetch(ROOT + 'daten/apps/liste.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : { apps: [] })
      .then(l => Promise.all((l.apps || []).map(id => E().manifest(id)))).then(ms => ms.filter(Boolean))
      .catch(e => { liste = null; throw e; });
    return liste;
  }

  const anzeige = (e, v) => e.typ === 'schalter' ? (v ? 'an' : 'aus')
    : e.typ === 'auswahl' ? ((e.optionen || []).find(o => o.wert === v) || { titel: String(v) }).titel
    : e.typ === 'inhaltsliste' ? (v.length ? v.length + ' Einträge' : 'leer')
    : e.typ === 'zahl' ? v + (e.einheit ? ' ' + e.einheit : '') : '„' + v + '“';

  function feld(m, e, v, eigen) {
    const name = `data-fe="${escHtml(e.schluessel)}"`, aria = `aria-label="${escHtml(e.titel)}"`;
    let steuer;
    if (e.typ === 'schalter') steuer = `<label class="switch"><input type="checkbox" ${name} ${v ? 'checked' : ''} ${aria}><span></span></label>`;
    else if (e.typ === 'zahl') steuer = `<span class="lw-fe-zahl"><input type="number" ${name} value="${escHtml(String(v))}" min="${e.min ?? ''}" max="${e.max ?? ''}" step="${e.schritt || 'any'}" ${aria}>${e.einheit ? ' ' + escHtml(e.einheit) : ''}</span>`;
    else if (e.typ === 'auswahl') steuer = `<select class="sw-sel" ${name} ${aria}>${(e.optionen || []).map(o =>
      `<option value="${escHtml(JSON.stringify(o.wert))}"${o.wert === v ? ' selected' : ''}>${escHtml(o.titel)}${o.wert === e.standard ? ' (Standard)' : ''}</option>`).join('')}</select>`;
    else if (e.typ === 'text') steuer = `<input type="text" ${name} value="${escHtml(v)}" maxlength="${e.max || 200}" ${aria} style="max-width:16rem">`;
    else if (e.typ === 'inhaltsliste') steuer = `<textarea ${name} rows="3" ${aria} placeholder="eine ID pro Zeile" style="max-width:18rem">${escHtml((v || []).join('\n'))}</textarea>`;
    else steuer = '<span class="lw-klein">unbekannter Typ</span>';
    const std = JSON.stringify(v) === JSON.stringify(e.standard);
    return `<div class="sw-row" style="flex-wrap:wrap"><div class="sw-txt"><div class="sw-name">${escHtml(e.titel)}
        <span class="lw-klein">${std ? '(Standard)' : 'Standard: ' + escHtml(anzeige(e, e.standard))}</span></div>
        ${e.text ? `<div class="sw-desc">${escHtml(e.text)}</div>` : ''}</div>
      ${steuer}${eigen && !std ? `<button type="button" class="lw-btn klein" data-fe-std="${escHtml(e.schluessel)}" title="Auf Standard zurück">↺</button>` : ''}</div>`;
  }

  /** Formular einer App zeichnen; Änderungen gehen in den Entwurf. Neu zeichnen macht der Aufrufer (oder buildAll). */
  async function einhaengen(host, id) {
    if (!host) return;
    const L = E();
    const m = L ? await L.manifest(id) : null;
    if (!m) { host.innerHTML = '<p class="lw-klein">Einstellungen nicht geladen (offline?).</p>'; return; }
    const c = LWAdmin.store.daten() || {}, w = L.werteAus(m, c);
    host.innerHTML = m.einstellungen.map(e => feld(m, e, w[e.schluessel], L.holen(c, L.pfadIn(m.id, e)) !== undefined)).join('');
    const finde = k => m.einstellungen.find(e => e.schluessel === k);
    function speichern(e, v, text) {
      const pfad = L.pfadIn(m.id, e);
      LWAdmin.store.aendern(`⚙️ ${m.titel}: ${e.titel} ${text}`, cfg => {
        if (v === undefined) {                       // Standard: Wert entfernen, leere Hüllen aufräumen
          const teile = pfad.split('.'), letzter = teile.pop(), eltern = L.holen(cfg, teile.join('.'));
          if (eltern) delete eltern[letzter];
          if (pfad.startsWith('appEinstellungen.')) {
            if (cfg.appEinstellungen && cfg.appEinstellungen[m.id] && !Object.keys(cfg.appEinstellungen[m.id]).length) delete cfg.appEinstellungen[m.id];
            if (cfg.appEinstellungen && !Object.keys(cfg.appEinstellungen).length) delete cfg.appEinstellungen;
          }
        } else L.setzen(cfg, pfad, v);
      });
    }
    host.onchange = ev => {
      const el = ev.target.closest('[data-fe]'); if (!el) return;
      const e = finde(el.dataset.fe); if (!e) return;
      let roh;
      if (e.typ === 'schalter') roh = el.checked;
      else if (e.typ === 'zahl') roh = el.value === '' ? undefined : Number(el.value);
      else if (e.typ === 'auswahl') { try { roh = JSON.parse(el.value); } catch (x) { roh = undefined; } }
      else if (e.typ === 'inhaltsliste') roh = el.value.split(/[\s,;]+/).filter(Boolean);
      else roh = el.value;
      const v = L.pruefe(e, roh);
      if (v === undefined) { LWAdmin.store.daten() && einhaengen(host, id); return; }
      if (e.typ === 'zahl' && v !== roh) el.value = v;  // auf Grenzen/Schritt gerundet
      speichern(e, v, '→ ' + anzeige(e, v));
    };
    host.onclick = ev => {
      const b = ev.target.closest('[data-fe-std]'); if (!b) return;
      const e = finde(b.dataset.feStd); if (e) speichern(e, undefined, '→ Standard (' + anzeige(e, e.standard) + ')');
    };
  }

  return { manifeste, einhaengen };
})();
