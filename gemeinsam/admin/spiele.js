// ═══════════════════════════════════════════════════════
//  Lernwelt-Admin – Spiele: „Meine Themen“
//  Teil von admin.html (Infrastruktur Etappe 6: Admin in Module zerlegt).
//  Läuft über gemeinsam/admin/bruecke.js (CONFIG, saveConfig, buildAll …), eingebunden in admin.html.
// ═══════════════════════════════════════════════════════
'use strict';

// ── Spiele (Runner & Burg): „Meine Themen“ → CONFIG.spiele ──
const SPIELE_AUSWAHL = {
  'auto+frei': 'Meine Themen + selbst wählen',
  'auto':      'Nur Meine Themen',
  'frei':      'Nur selbst wählen (wie bisher)',
};
const STARTER_KLASSEN = [5, 6];
function spieleCfg() {
  LernPass.setSpiele(CONFIG.spiele);                 // gleiche Standardwerte wie in pass.js
  return JSON.parse(JSON.stringify(LernPass.settings.spiele));
}
/** Auswahllisten „Wort des Tages“ mit den Units aus den Vokabeldateien füllen */
async function fuelleWortUnits() {
  if (!window.LernAufgaben || !window.LernPass) return;
  const sp = spieleCfg();
  for (const k of [5, 6]) {
    const sel = document.querySelector(`#pass-settings [data-spiele-set="wort${k}"]`);
    if (!sel) continue;
    const units = await LernAufgaben.einheiten('vok' + k).catch(() => []);
    if (!units.length) continue;
    const cur = sp.wortBis[k] || '';
    sel.innerHTML = units.map(u => `<option value="${escHtml(u.id)}" ${u.id === cur ? 'selected' : ''}>Kl. ${k}: bis ${escHtml(u.id === 'intro' ? 'Einführung' : u.label)}</option>`).join('')
      + `<option value="" ${cur === '' ? 'selected' : ''}>Kl. ${k}: alle Units</option>`;
  }
}
function spieleAdminHTML() {
  if (!window.LernPass || !LernPass.setSpiele) return '';
  const sp = spieleCfg();
  const opt = (v, txt, cur) => `<option value="${escHtml(String(v))}" ${String(v) === String(cur) ? 'selected' : ''}>${escHtml(txt)}</option>`;
  const starter = window.LernAufgaben ? STARTER_KLASSEN.map(k => {
    const pools = LernAufgaben.pools({ klasse: k });
    const an = sp.starter[k] || [];
    return `<div class="sw-sub">Klasse ${k}</div><div class="st-chips">${pools.map(p =>
      `<label class="st-chip"><input type="checkbox" data-starter="${k}" value="${escHtml(p.id)}" ${an.includes(p.id) ? 'checked' : ''}> ${escHtml(p.titel)}</label>`).join('')}</div>`;
  }).join('') : '<div class="sw-sub">aufgaben.js nicht geladen – Starter-Paket hier nicht einstellbar.</div>';
  return `
    <div class="sw-row">
      <span class="sw-ic">🎮</span>
      <div class="sw-txt"><div class="sw-name">Spiele: Themenauswahl</div>
        <div class="sw-desc">RUN!, Tower Defense und Tauziehen-Duell. „⭐ Meine Themen“ = alles, was das Kind in den Lern-Apps (Vokabeltrainer 5/6: Quiz, Fill in, Scramble · Kopfrechnen Kl. 4–6 · Einmaleins-Tafel) erfolgreich geübt hat, plus Starter-Paket. Nie Stoff über der Klasse aus dem Pass. Lehrer-Links mit <code>?pool=…</code> haben immer Vorrang.</div></div>
      <select class="sw-sel" data-spiele-set="auswahl" aria-label="Themenauswahl in den Spielen">
        ${Object.entries(SPIELE_AUSWAHL).map(([v, t]) => opt(v, t, sp.auswahl)).join('')}
      </select>
    </div>
    <div class="sw-row">
      <span class="sw-ic">🔓</span>
      <div class="sw-txt"><div class="sw-name">Freischalten ab</div>
        <div class="sw-desc">Ein Thema kommt in „Meine Themen“, sobald es so oft mit mindestens diesem Ergebnis geübt wurde (Runden mit mind. 5 Aufgaben, nicht durchgeklickt). Einmal freigeschaltet bleibt freigeschaltet. Eine niedrigere Einstellung wirkt sofort, auch für schon gespielte Runden.</div></div>
      <select class="sw-sel" data-spiele-set="schwelle" aria-label="Mindestergebnis in Prozent">
        ${[50, 60, 70, 80, 90, 100].map(v => opt(v, v + ' %', sp.schwelle)).join('')}
      </select>
      <select class="sw-sel" data-spiele-set="runden" aria-label="Anzahl Runden">
        ${[1, 2, 3].map(v => opt(v, v === 1 ? '1 Runde' : v + ' Runden', sp.runden)).join('')}
      </select>
    </div>
    <div class="sw-row">
      <span class="sw-ic">🔤</span>
      <div class="sw-txt"><div class="sw-name">Wort des Tages</div>
        <div class="sw-desc">Alle Kinder einer Klasse bekommen am selben Tag dasselbe englische Wort – aus den Vokabeln bis zu dieser Unit. Klasse 6 bekommt zusätzlich alle Wörter aus Band 5, Klasse 7–9 alles aus Band 5 und 6.</div></div>
      <select class="sw-sel" data-spiele-set="wort5" aria-label="Wort des Tages Klasse 5">${opt(sp.wortBis[5], 'Kl. 5: bis ' + (sp.wortBis[5] || 'alle'), sp.wortBis[5])}</select>
      <select class="sw-sel" data-spiele-set="wort6" aria-label="Wort des Tages Klasse 6">${opt(sp.wortBis[6], 'Kl. 6: bis ' + (sp.wortBis[6] || 'alle'), sp.wortBis[6])}</select>
    </div>
    <div class="sw-row" style="align-items:flex-start">
      <span class="sw-ic">🎒</span>
      <div class="sw-txt"><div class="sw-name">Starter-Paket</div>
        <div class="sw-desc">Ist bei „Meine Themen“ immer dabei – so kann jedes Kind auch ohne Vorübung spielen. Klasse 7–9 nutzt das Paket von Klasse 6.</div>
        ${starter}
      </div>
    </div>`;
}

document.getElementById('pass-settings').addEventListener('change', e => {
  const el = e.target.closest('[data-spiele-set],[data-starter]');
  if (!el || !window.LernPass || !LernPass.setSpiele) return;
  const sp = spieleCfg();
  const key = el.dataset.spieleSet;
  if (key === 'auswahl') {
    sp.auswahl = el.value;
    logChange(`🎮 Spiele: ${SPIELE_AUSWAHL[sp.auswahl] || sp.auswahl}`);
  } else if (key === 'schwelle') {
    sp.schwelle = Number(el.value);
    logChange(`🔓 Spiele: freischalten ab ${sp.schwelle} %`);
  } else if (key === 'runden') {
    sp.runden = Number(el.value);
    logChange(`🔓 Spiele: freischalten nach ${sp.runden} Runde${sp.runden > 1 ? 'n' : ''}`);
  } else if (key === 'wort5' || key === 'wort6') {
    const k = key === 'wort5' ? 5 : 6;
    sp.wortBis[k] = el.value;
    logChange(`🔤 Wort des Tages Kl. ${k}: ${el.value ? 'bis ' + (el.selectedOptions[0] ? el.selectedOptions[0].textContent.replace(/^Kl\. \d: /, '') : el.value) : 'alle Units'}`);
  } else if (el.dataset.starter) {
    const k = Number(el.dataset.starter);
    sp.starter[k] = [...document.querySelectorAll(`#pass-settings [data-starter="${k}"]:checked`)].map(i => i.value);
    logChange(`🎒 Starter-Paket Kl. ${k}: ${sp.starter[k].length} Themen`);
  } else return;
  CONFIG.spiele = { auswahl: sp.auswahl, schwelle: sp.schwelle, runden: sp.runden,
    starter: Object.fromEntries(STARTER_KLASSEN.map(k => [String(k), sp.starter[k] || []])),
    wortBis: { '5': sp.wortBis[5] || '', '6': sp.wortBis[6] || '' } };
  LernPass.setSpiele(CONFIG.spiele);
  saveConfig();
});

// Aufgaben-Pools aus daten/aufgaben-pools.json kommen nach dem Laden dazu (Starter-Paket neu zeichnen)
if (window.LernAufgaben && LernAufgaben.bereit) LernAufgaben.bereit.then(() => {
  const admin = document.getElementById('admin');
  if (typeof CONFIG !== 'undefined' && CONFIG && admin && admin.style.display === 'block' && document.getElementById('pass-settings').isConnected) buildPassAdmin();
});

// pass.js meldet sich, sobald seine Inhalte geladen sind
window.addEventListener('lernpass:ready', () => {
  const admin = document.getElementById('admin');
  if (CONFIG && admin && admin.style.display === 'block') { buildPassAdmin(); buildDashboard(); }
});

document.getElementById('pass-settings').addEventListener('change', e => {
  const inp = e.target.closest('[data-pass-set]');
  if (!inp) return;
  const cfg = passCfg();
  const key = inp.dataset.passSet;
  if (key === 'seasons') {
    cfg.seasons = inp.checked;
    logChange(`📅 Saison-Modus ${inp.checked ? 'aktiviert' : 'deaktiviert'}`);
  } else if (key === 'avatar') {
    cfg.avatar = inp.checked;
    logChange(`🧍 Avatar nach Runden ${inp.checked ? 'aktiviert' : 'deaktiviert'}`);
  } else if (key.startsWith('event:')) {
    // Etappe 6: Aus | An | Zeitraum (einmalig) | Jedes Jahr – Vorschlag: zwei Wochen ab heute bzw. die Vorlage
    const id = key.slice(6);
    const ev = LernPass.EVENTS.find(x => x.id === id);
    if (!ev) return;
    const art = inp.value, alt = cfg.events[id], h = new Date();
    if (art === 'aus') cfg.events[id] = false;
    else if (art === 'an') cfg.events[id] = true;
    else if (art === 'zeitraum') cfg.events[id] = alt && typeof alt === 'object' && evArt(alt) === 'zeitraum' ? alt
      : { ab: evIso(h), bis: evIso(new Date(h.getTime() + 14 * 864e5)) };
    else cfg.events[id] = alt && typeof alt === 'object' && evArt(alt) === 'jaehrlich' ? alt
      : (v => ({ ab: v[0], bis: v[1] }))(EVENT_VORLAGEN[id] || [evIso(h).slice(5), evIso(new Date(h.getTime() + 14 * 864e5)).slice(5)]);
    logChange(`${ev.icon} ${ev.titel || ev.name + '-Event'}: ${{ aus: 'aus', an: 'an', zeitraum: 'mit Zeitraum', jaehrlich: 'jedes Jahr' }[art]}`);
  }
  CONFIG.pass = { ...cfg, events: evNurBekannte(cfg.events) };
  saveConfig();
  buildPassAdmin();
  buildDashboard();
});
// Datum eines Event-Zeitraums geändert
document.getElementById('pass-settings').addEventListener('change', e => {
  const inp = e.target.closest('[data-ev-ab],[data-ev-bis]');
  if (!inp) return;
  const id = inp.dataset.evAb || inp.dataset.evBis, feld = inp.dataset.evAb ? 'ab' : 'bis';
  const cfg = passCfg(), z = cfg.events[id];
  const ev = LernPass.EVENTS.find(x => x.id === id);
  if (!ev || !z || typeof z !== 'object' || !/^\d{4}-\d{2}-\d{2}$/.test(inp.value)) return;
  const neu = { ...z, [feld]: evArt(z) === 'jaehrlich' ? inp.value.slice(5) : inp.value };
  if (evArt(z) === 'zeitraum' && neu.ab && neu.bis && neu.ab > neu.bis) { showToast('⚠ „bis“ liegt vor „von“', true); buildPassAdmin(); return; }
  cfg.events[id] = neu;
  logChange(`${ev.icon} ${ev.titel || ev.name + '-Event'}: ${feld === 'ab' ? 'von' : 'bis'} ${inp.value.split('-').reverse().join('.')}`);
  CONFIG.pass = { ...cfg, events: evNurBekannte(cfg.events) };
  saveConfig();
  buildPassAdmin();
});
/** nur bekannte Events speichern (true/false oder Zeitplan) */
function evNurBekannte(e) {
  return Object.fromEntries(LernPass.EVENTS.map(ev => [ev.id, e[ev.id] === true || (e[ev.id] && typeof e[ev.id] === 'object') ? e[ev.id] : false]));
}
