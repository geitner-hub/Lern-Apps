// ═══════════════════════════════════════════════════════
//  Lernwelt-Admin – Lernwelt-Pass: Einstellungen
//  Teil von admin.html (Infrastruktur Etappe 6: Admin in Module zerlegt).
//  Alle Module teilen sich die globalen Variablen aus kern.js (CONFIG, ghSha …)
//  und werden in admin.html in fester Reihenfolge geladen.
// ═══════════════════════════════════════════════════════
'use strict';

// ── Lernwelt-Pass: Einstellungen & Übersicht ───────────
function passCfg() {
  const p = CONFIG.pass && typeof CONFIG.pass === 'object' ? CONFIG.pass : {};
  return { seasons: p.seasons === true, avatar: p.avatar !== false, events: p.events && typeof p.events === 'object' ? { ...p.events } : {} };
}

function buildPassAdmin() {
  if (!window.LernPass) return;
  const P = LernPass, cfg = passCfg();
  const sid = P.seasonId();
  document.getElementById('pass-settings').innerHTML = `
    <div class="sw-row">
      <span class="sw-ic">📅</span>
      <div class="sw-txt"><div class="sw-name">Saison-Modus (Schuljahr)</div>
        <div class="sw-desc">Level und Titel zählen pro Schuljahr und beginnen am 1. August neu. Gesamt-XP, Sterne, Abzeichen, Truhen und Cosmetics bleiben erhalten; vergangene Schuljahre erscheinen im Pass mit dem erreichten Titel. Aktuelles Schuljahr: <b>${escHtml(sid)}</b>.</div></div>
      <label class="switch"><input type="checkbox" data-pass-set="seasons" ${cfg.seasons ? 'checked' : ''} aria-label="Saison-Modus"><span></span></label>
    </div>
    <div class="sw-row">
      <span class="sw-ic">🧍</span>
      <div class="sw-txt"><div class="sw-name">Avatar & Effekte nach Runden</div>
        <div class="sw-desc">Die eigene Figur erscheint nach jeder Runde für ein paar Sekunden unten rechts, jubelt oder muntert auf (nie traurig) und feiert Level, Sterne, Abzeichen und Truhen mit. Dazu Feuerwerk bei Level und Abzeichen, Konfetti bei perfekten Runden, Gold-Sternen und Truhen. Auf der Startseite begrüßt sie einmal am Tag. Ausschalten z. B. bei sehr langsamen Geräten oder Prüfungen.</div></div>
      <label class="switch"><input type="checkbox" data-pass-set="avatar" ${cfg.avatar ? 'checked' : ''} aria-label="Avatar nach Runden anzeigen"><span></span></label>
    </div>
    ${P.EVENTS.map(ev => {
      const n = P.ITEMS.filter(i => i.event === ev.id).length;
      const set = P.ITEMS.filter(i => i.quelle === 'set' && i.set === 'event-' + ev.id);
      return `<div class="sw-row">
        <span class="sw-ic">${escHtml(ev.icon)}</span>
        <div class="sw-txt"><div class="sw-name">${escHtml(ev.titel || ev.name + '-Event')}</div>
          <div class="sw-desc">${n} Event-Teile in den Truhen · Geschenk-Truhe nach der ersten guten Runde · Abzeichen nach ${escHtml(String((P.BADGES.find(b => b.id === 'event-' + ev.id) || {}).n || 3))} guten Tagen${set.length ? ' → ' + set.map(i => escHtml(i.name)).join(', ') : ''}</div></div>
        <label class="switch"><input type="checkbox" data-pass-set="event:${escHtml(ev.id)}" ${cfg.events[ev.id] === true ? 'checked' : ''} aria-label="${escHtml(ev.name)}-Event"><span></span></label>
      </div>`;
    }).join('')}
    ${(() => {                                   // Mein Dorf: nur ein Event gleichzeitig
      const an = P.EVENTS.filter(ev => cfg.events[ev.id] === true);
      return an.length > 1 ? `<p class="note" style="margin:.4rem 0 .8rem;color:var(--gold,#e6a817)">⚠️ ${an.length} Events sind an. Im Dorf („Mein Dorf“) läuft immer nur eins: <b>${escHtml(an[0].titel || an[0].name)}</b> (das erste in der Liste). Truhen und Abzeichen im Pass gelten für alle.</p>` : '';
    })()}
    ${spieleAdminHTML()}`;
  fuelleWortUnits();
  buildPassOverview();
}
