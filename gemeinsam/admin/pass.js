// ═══════════════════════════════════════════════════════
//  Lernwelt-Admin – Lernwelt-Pass: Einstellungen
//  Teil von admin.html (Infrastruktur Etappe 6: Admin in Module zerlegt).
//  Läuft über gemeinsam/admin/bruecke.js (CONFIG, saveConfig, buildAll …), eingebunden in admin.html.
// ═══════════════════════════════════════════════════════
'use strict';

// ── Lernwelt-Pass: Einstellungen & Übersicht ───────────
function passCfg() {
  const p = CONFIG.pass && typeof CONFIG.pass === 'object' ? CONFIG.pass : {};
  return { seasons: p.seasons === true, avatar: p.avatar !== false, events: p.events && typeof p.events === 'object' ? { ...p.events } : {} };
}

// ── Events mit Zeitplan (Admin-Umbau Etappe 6): Aus | An | Zeitraum (einmalig) | jedes Jahr ──
//  Gespeichert in pass.events[id]: false | true | { ab, bis } (JJJJ-MM-TT bzw. MM-TT ohne Jahr = jedes Jahr).
//  Ausgewertet auf jedem Gerät mit LW.zeitplanAktiv (gemeinsam/umgebung.js).
const EVENT_VORLAGEN = { halloween: ['10-20', '11-02'], weihnachten: ['12-01', '12-26'], ostern: ['03-20', '04-20'] };  // Vorschlag für „jedes Jahr“
function evArt(v) { return v === true ? 'an' : v && typeof v === 'object' ? (/^\d{2}-\d{2}$/.test(v.ab || v.bis || '') ? 'jaehrlich' : 'zeitraum') : 'aus'; }
function evIso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
/** Datum fürs Eingabefeld: MM-TT im laufenden Jahr ergänzen */
function evFeld(x) { return !x ? '' : /^\d{2}-\d{2}$/.test(x) ? new Date().getFullYear() + '-' + x : x; }
function evStand(v) {
  if (v === true) return '🟢 läuft (dauerhaft an)';
  if (!v || typeof v !== 'object') return '⚪ aus';
  if (window.LW && LW.zeitplanAktiv(v)) return '🟢 läuft gerade';
  const h = evIso(new Date()), j = /^\d{2}-\d{2}$/.test(v.ab || v.bis || '');
  const fmt = x => x.length === 5 ? x.slice(3) + '.' + x.slice(0, 2) + '.' : x.slice(8) + '.' + x.slice(5, 7) + '.' + x.slice(2, 4);
  if (j) return `🗓 jedes Jahr ${v.ab ? fmt(v.ab) : '…'} – ${v.bis ? fmt(v.bis) : '…'}`;
  return v.ab && v.ab > h ? `🗓 beginnt am ${fmt(v.ab)}` : '⏹ vorbei';
}
function evZeile(ev, v) {
  const art = evArt(v), z = v && typeof v === 'object' ? v : {};
  return `<div class="sw-row" style="flex-wrap:wrap">
    <span class="sw-ic">${escHtml(ev.icon)}</span>
    <div class="sw-txt"><div class="sw-name">${escHtml(ev.titel || ev.name + '-Event')} <span style="font-size:.75rem;font-weight:700;color:var(--muted)">${escHtml(evStand(v))}</span></div>
      <div class="sw-desc">${ev._text}</div></div>
    <select class="sw-sel" data-pass-set="event:${escHtml(ev.id)}" aria-label="${escHtml(ev.name)}-Event: wann?">
      ${[['aus', 'Aus'], ['an', 'An'], ['zeitraum', 'Zeitraum'], ['jaehrlich', 'Jedes Jahr']].map(([w, t]) => `<option value="${w}"${w === art ? ' selected' : ''}>${t}</option>`).join('')}
    </select>
    ${art === 'zeitraum' || art === 'jaehrlich' ? `<div style="flex-basis:100%;display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;margin:.3rem 0 0 3.2rem;font-size:.8rem;color:var(--text2)">
      von <input type="date" data-ev-ab="${escHtml(ev.id)}" value="${escHtml(evFeld(z.ab))}" style="width:auto">
      bis <input type="date" data-ev-bis="${escHtml(ev.id)}" value="${escHtml(evFeld(z.bis))}" style="width:auto">
      ${art === 'jaehrlich' ? '<span>(das Jahr zählt nicht – gilt jedes Jahr)</span>' : ''}</div>` : ''}
  </div>`;
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
      const text = `${n} Event-Teile in den Truhen · Geschenk-Truhe nach der ersten guten Runde · Abzeichen nach ${escHtml(String((P.BADGES.find(b => b.id === 'event-' + ev.id) || {}).n || 3))} guten Tagen${set.length ? ' → ' + set.map(i => escHtml(i.name)).join(', ') : ''}`;
      return evZeile({ ...ev, _text: text }, cfg.events[ev.id]);
    }).join('')}
    <p class="note" style="margin:.2rem 0 .8rem">Mit Zeitraum schaltet sich ein Event von selbst ein und aus (jedes iPad prüft das Datum). „Jedes Jahr“ wiederholt sich ohne Jahreszahl. Braucht den aktuellen Worker (<code>cloudflare/worker.js</code>).</p>
    ${(() => {                                   // Mein Dorf: nur ein Event gleichzeitig
      const an = P.EVENTS.filter(ev => window.LW && LW.zeitplanAktiv(cfg.events[ev.id]));
      return an.length > 1 ? `<p class="note" style="margin:.4rem 0 .8rem;color:var(--gold,#e6a817)">⚠️ ${an.length} Events sind an. Im Dorf („Mein Dorf“) läuft immer nur eins: <b>${escHtml(an[0].titel || an[0].name)}</b> (das erste in der Liste). Truhen und Abzeichen im Pass gelten für alle.</p>` : '';
    })()}
    ${spieleAdminHTML()}`;
  fuelleWortUnits();
  buildPassOverview();
}
