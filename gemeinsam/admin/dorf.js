// ═══════════════════════════════════════════════════════
//  Lernwelt-Admin – Mein Dorf
//  Teil von admin.html (Infrastruktur Etappe 6: Admin in Module zerlegt).
//  Alle Module teilen sich die globalen Variablen aus kern.js (CONFIG, ghSha …)
//  und werden in admin.html in fester Reihenfolge geladen.
// ═══════════════════════════════════════════════════════
'use strict';

// ── Mein Dorf → CONFIG.dorf ──────────────────────────────
//  { plaetze, rerollsProTag, rerollsMax, kostenfaktor, wochen: [{ id, start, art, ziel, name, app, runden, klassen }] }
//  Ausschluss einzelner Apps: "dorf": false im App-Eintrag. Logik bei den Kindern: gemeinsam/dorf-kern.js
let DORF_INHALT = null, DORF_THEMEN = null;
const THEMA_APP = { vok5: 'vokabeltrainer.html?klasse=5', vok6: 'vokabeltrainer.html?klasse=6', kopf4: 'kopfrechnen.html?klasse=4',
                    kopf5: 'kopfrechnen.html', kopf6: 'kopfrechnen.html?klasse=6', '1x1': 'einmaleins_tafel.html' };   // Etappe 4b: neue Adressen
function dorfCfg() {
  const d = CONFIG.dorf && typeof CONFIG.dorf === 'object' ? CONFIG.dorf : {};
  return JSON.parse(JSON.stringify({ ...d, wochen: Array.isArray(d.wochen) ? d.wochen : [], challenges: Array.isArray(d.challenges) ? d.challenges : [],
    lehrerZettel: Array.isArray(d.lehrerZettel) ? d.lehrerZettel : [] }));
}
// Challenge-Hilfen (gleiche Rechnung wie gemeinsam/dorf-kern.js)
function isoPlus(iso, n) { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
function heuteIso() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function challengeRotation(C, abIso) {
  const W = C.CHALLENGE_WERTE || {}, L = C.CHALLENGES || [], tage = W.tage || 14, start = W.start || '2026-09-14';
  if (!L.length || abIso < start) return null;
  const nr = Math.floor((new Date(abIso + 'T12:00:00') - new Date(start + 'T12:00:00')) / 864e5 / tage), s = isoPlus(start, nr * tage);
  return { def: L[nr % L.length], start: s, ende: isoPlus(s, tage - 1) };
}
function dorfSpeichern(cfg, msg) {
  const heute = montagIso(0);
  cfg.wochen = (cfg.wochen || []).filter(w => w.start >= heute).slice(0, 12);    // Vergangenes aufräumen
  const tage = ((DORF_INHALT || {}).CHALLENGE_WERTE || {}).tage || 14;
  cfg.challenges = (cfg.challenges || []).filter(c => isoPlus(c.start, tage) > heuteIso()).slice(0, 10);
  if (!cfg.challenges.length) delete cfg.challenges;
  cfg.lehrerZettel = (cfg.lehrerZettel || []).filter(z => (z.bis || z.start) >= heuteIso()).slice(-12);   // Abgelaufenes aufräumen
  if (!cfg.lehrerZettel.length) delete cfg.lehrerZettel;
  CONFIG.dorf = cfg;
  logChange(msg);
  saveConfig();
  buildDorfAdmin();
}
function montagIso(wochenDazu) {
  const d = new Date(); d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - (d.getDay() + 6) % 7 + 7 * wochenDazu);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
const datumKurz = iso => iso.slice(8, 10) + '.' + iso.slice(5, 7) + '.';
const appDateiKey = a => String(a.datei || '').split('/').pop();
function lernAppsFuerDorf() {
  return CONFIG.apps.filter(a => a.datei && !/^https?:/i.test(a.datei) && !a.datei.startsWith('spiele/') && a.fach !== 'Allgemein');
}

async function dorfDatenLaden() {
  if (!DORF_INHALT) {
    try { DORF_INHALT = await (await fetch('daten/dorf-inhalte.json', { cache: 'no-cache' })).json(); } catch (e) { DORF_INHALT = {}; }
  }
  if (!DORF_THEMEN) {
    const liste = [];
    for (const [k, datei, kl] of [['vok5', 'daten/vokabeln5.json', 5], ['vok6', 'daten/vokabeln6.json', 6]]) {
      try {
        const v = await (await fetch(datei, { cache: 'no-cache' })).json();
        Object.entries(v.units || {}).forEach(([u, def]) => liste.push({ id: k + ':' + u, name: `Vokabeln Kl. ${kl}: ${def.label || u}`, app: THEMA_APP[k], klasse: kl }));
      } catch (e) {}
    }
    if (window.LernAufgaben) LernAufgaben.pools({ klasse: 9 }).forEach(p => {
      const pre = Object.keys(THEMA_APP).find(k => p.id.startsWith(k + '-'));
      if (pre && !pre.startsWith('vok')) liste.push({ id: p.id, name: p.titel, app: THEMA_APP[pre], klasse: p.klasse });
    });
    DORF_THEMEN = liste;
  }
}

async function buildDorfAdmin() {
  if (!document.getElementById('dorf-woche')) return;
  await dorfDatenLaden();
  const C = DORF_INHALT || {}, A = C.AUFTRAEGE || {}, cfg = dorfCfg();
  const std = { plaetze: (A.plaetze || []).filter(p => !p.gebaeude && !p.extra).length || 3, rerollsProTag: (A.rerolls || {}).proTag ?? 1, rerollsMax: (A.rerolls || {}).max ?? 3,
                kostenfaktor: (C.BAU || {}).kostenfaktor ?? 1, runden: (A.woche || {}).runden ?? 3 };
  const opt = (v, txt, cur) => `<option value="${escHtml(String(v))}" ${String(v) === String(cur) ? 'selected' : ''}>${escHtml(txt)}</option>`;
  const klassenAlle = [...new Set(lernAppsFuerDorf().flatMap(a => a.klassen || []))].sort((a, b) => a - b);

  // Wochenauftrag: bestehende + Formular
  const wochen = cfg.wochen.slice().sort((a, b) => a.start.localeCompare(b.start));
  const diese = montagIso(0), naechste = montagIso(1);
  const liste = wochen.length ? wochen.map(w => `
      <div class="sw-row">
        <span class="sw-ic">${w.art === 'app' ? '📱' : '📚'}</span>
        <div class="sw-txt"><div class="sw-name">${escHtml(w.name || w.ziel)}</div>
          <div class="sw-desc">Woche ab ${datumKurz(w.start)}${w.start === diese ? ' (diese Woche)' : w.start === naechste ? ' (nächste Woche)' : ''} · ${w.runden} Runden mit mind. ${escHtml(String((A.tag || {}).schwelle ?? 70))} % · ${Array.isArray(w.klassen) && w.klassen.length ? 'Klasse ' + w.klassen.join(', ') : 'alle Klassen'}</div></div>
        <button class="btn sm danger" data-woche-weg="${escHtml(w.id)}">Entfernen</button>
      </div>`).join('') : '<p style="font-size:.85rem;color:var(--text2);margin:.2rem 0 1rem">Noch kein eigener Wochenauftrag – die Kinder haben den automatischen.</p>';
  const apps = lernAppsFuerDorf().filter(a => !a.hidden && a.dorf !== false)
    .sort((a, b) => (a.fach + a.name).localeCompare(b.fach + b.name));
  document.getElementById('dorf-woche').innerHTML = `
    ${liste}
    <div style="border-top:1px solid var(--border);margin-top:.6rem;padding-top:1rem;display:grid;gap:.7rem;">
      <div style="display:flex;gap:.6rem;flex-wrap:wrap;">
        <select id="dw-start" style="width:auto">${opt(diese, 'Diese Woche (ab ' + datumKurz(diese) + ')', diese)}${opt(naechste, 'Nächste Woche (ab ' + datumKurz(naechste) + ')', diese)}</select>
        <select id="dw-art" style="width:auto">${opt('app', 'Eine App', 'app')}${opt('thema', 'Ein Thema', 'app')}</select>
        <select id="dw-runden" style="width:auto">${[1, 2, 3, 4, 5, 6, 8, 10].map(n => opt(n, n + (n === 1 ? ' Runde' : ' Runden'), std.runden)).join('')}</select>
      </div>
      <select id="dw-app">${apps.map(a => opt(appDateiKey(a), `${a.emoji || '📱'} ${a.name} (${a.fach}${(a.klassen || []).length ? ', Kl. ' + a.klassen.join('/') : ''})`, '')).join('')}</select>
      <select id="dw-thema" style="display:none">${DORF_THEMEN.map(t => opt(t.id, t.name, '')).join('')}</select>
      <div class="st-chips" id="dw-klassen">${klassenAlle.map(k => `<label class="st-chip"><input type="checkbox" value="${k}"> Klasse ${k}</label>`).join('')}
        <span style="font-size:.75rem;color:var(--muted);align-self:center">keine Auswahl = alle Klassen</span></div>
      <div><button class="btn accent" id="dw-setzen">📅 Wochenauftrag setzen</button></div>
      <p style="font-size:.75rem;color:var(--muted);margin:0;line-height:1.5">Thema = Runden in den Apps, die dieses Thema melden (Vokabeltrainer: Quiz, Fill in, Scramble; Kopfrechnen; Einmaleins). Pro Woche und Klasse zählt der zuerst eingetragene Auftrag. Ist die gewählte App für ein Kind nicht freigeschaltet, bekommt es den automatischen.</p>
    </div>`;
  const art = document.getElementById('dw-art');
  art.onchange = () => { const t = art.value === 'thema'; document.getElementById('dw-app').style.display = t ? 'none' : ''; document.getElementById('dw-thema').style.display = t ? '' : 'none'; };
  document.getElementById('dw-setzen').onclick = () => {
    const c = dorfCfg(), a = art.value;
    const ziel = document.getElementById(a === 'app' ? 'dw-app' : 'dw-thema').value;
    if (!ziel) { showToast('⚠ Bitte eine App oder ein Thema wählen', true); return; }
    const th = a === 'thema' ? DORF_THEMEN.find(t => t.id === ziel) : null;
    const app = a === 'app' ? CONFIG.apps.find(x => appDateiKey(x) === ziel) : null;
    const eintrag = { id: 'lk-' + Date.now().toString(36), start: document.getElementById('dw-start').value, art: a, ziel,
      name: th ? th.name : (app ? app.name : ziel), runden: Number(document.getElementById('dw-runden').value),
      klassen: [...document.querySelectorAll('#dw-klassen input:checked')].map(i => Number(i.value)) };
    if (th && th.app) eintrag.app = th.app;
    // gleiche Woche + gleiche Klassen → ersetzen
    const k = JSON.stringify(eintrag.klassen);
    c.wochen = c.wochen.filter(w => !(w.start === eintrag.start && JSON.stringify(w.klassen || []) === k));
    c.wochen.push(eintrag);
    dorfSpeichern(c, `📅 Wochenauftrag ab ${datumKurz(eintrag.start)}: ${eintrag.name}`);
  };
  document.querySelectorAll('[data-woche-weg]').forEach(b => b.onclick = () => {
    const c = dorfCfg(), w = c.wochen.find(x => x.id === b.dataset.wocheWeg);
    c.wochen = c.wochen.filter(x => x.id !== b.dataset.wocheWeg);
    dorfSpeichern(c, `📅 Wochenauftrag entfernt: ${w ? w.name : ''}`);
  });

  // Lehrer-Zettel
  {
    const h = heuteIso(), plus = n => isoPlus(h, n);
    const zettel = cfg.lehrerZettel.slice().sort((a, b) => a.start.localeCompare(b.start)).map(z => {
      const app = CONFIG.apps.find(x => appDateiKey(x) === z.app) || { name: z.app, emoji: '📱' };
      const zeit = z.start === z.bis ? datumKurz(z.start) : datumKurz(z.start) + ' bis ' + datumKurz(z.bis);
      return `<div class="sw-row"><span class="sw-ic">${escHtml(app.emoji || '📱')}</span>
        <div class="sw-txt"><div class="sw-name">${escHtml(app.name)}${z.text ? ' – ' + escHtml(z.text) : ''}</div>
          <div class="sw-desc">${zeit}${z.start <= h && h <= z.bis ? ' (hängt gerade)' : ''} · ${z.runden || (A.tag || {}).runden || 2} Runden · ${(z.klassen || []).length ? 'Klasse ' + z.klassen.join(', ') : 'alle Klassen'}</div></div>
        <button class="btn sm danger" data-lz-weg="${escHtml(z.id)}">Entfernen</button></div>`;
    }).join('');
    document.getElementById('dorf-lehrer').innerHTML = `
      ${zettel || '<p style="font-size:.85rem;color:var(--text2);margin:.2rem 0 1rem">Gerade hängt kein Lehrer-Zettel.</p>'}
      <div style="border-top:1px solid var(--border);margin-top:.6rem;padding-top:1rem;display:grid;gap:.7rem;">
        <select id="dl-app">${apps.map(a => opt(appDateiKey(a), `${a.emoji || '📱'} ${a.name} (${a.fach}${(a.klassen || []).length ? ', Kl. ' + a.klassen.join('/') : ''})`, '')).join('')}</select>
        <input id="dl-text" maxlength="80" placeholder="Was sollen die Kinder tun? z. B. Hausaufgabe bis Donnerstag (freiwillig)">
        <div style="display:flex;gap:.6rem;flex-wrap:wrap;">
          <select id="dl-start" style="width:auto">${opt(h, 'ab heute', h)}${opt(plus(1), 'ab morgen (' + datumKurz(plus(1)) + ')', h)}</select>
          <select id="dl-dauer" style="width:auto">${[[0, 'nur 1 Tag'], [1, '2 Tage'], [2, '3 Tage'], [4, '5 Tage'], [6, '1 Woche'], [13, '2 Wochen']].map(([n, t]) => opt(n, t, 2)).join('')}</select>
          <select id="dl-runden" style="width:auto">${[1, 2, 3, 4, 5].map(n => opt(n, n + (n === 1 ? ' Runde' : ' Runden'), (A.tag || {}).runden || 2)).join('')}</select>
        </div>
        <div class="st-chips" id="dl-klassen">${klassenAlle.map(k => `<label class="st-chip"><input type="checkbox" value="${k}"> Klasse ${k}</label>`).join('')}
          <span style="font-size:.75rem;color:var(--muted);align-self:center">keine Auswahl = alle Klassen</span></div>
        <div><button class="btn accent" id="dl-setzen">📣 Zettel aufhängen</button></div>
        <p style="font-size:.75rem;color:var(--muted);margin:0;line-height:1.5">Hängt schon ein Zettel, ersetzt der neuere ihn. Ist die App für ein Kind nicht freigeschaltet, sieht es den Zettel nicht.</p>
      </div>`;
    document.getElementById('dl-setzen').onclick = () => {
      const c = dorfCfg(), start = document.getElementById('dl-start').value, app = document.getElementById('dl-app').value;
      if (!app) { showToast('⚠ Bitte eine App wählen', true); return; }
      const e = { id: 'lz-' + Date.now().toString(36), start, bis: isoPlus(start, Number(document.getElementById('dl-dauer').value)), app,
        text: document.getElementById('dl-text').value.trim().slice(0, 80), runden: Number(document.getElementById('dl-runden').value),
        klassen: [...document.querySelectorAll('#dl-klassen input:checked')].map(i => Number(i.value)) };
      if (!e.text) delete e.text;
      if (!e.klassen.length) delete e.klassen;
      c.lehrerZettel.push(e);
      const a = CONFIG.apps.find(x => appDateiKey(x) === app) || {};
      dorfSpeichern(c, `📣 Lehrer-Zettel ab ${datumKurz(start)}: ${a.name || app}`);
    };
    document.querySelectorAll('[data-lz-weg]').forEach(b => b.onclick = () => {
      const c = dorfCfg();
      c.lehrerZettel = c.lehrerZettel.filter(x => x.id !== b.dataset.lzWeg);
      dorfSpeichern(c, '📣 Lehrer-Zettel entfernt');
    });
  }

  // Challenges
  {
    const CH = C.CHALLENGES || [], tage = (C.CHALLENGE_WERTE || {}).tage || 14, h = heuteIso();
    const jetzt = challengeRotation(C, h), dann = jetzt ? challengeRotation(C, isoPlus(jetzt.ende, 1)) : null;
    const rotAn = cfg.challengeRotation !== false;
    const geplant = cfg.challenges.slice().sort((a, b) => a.start.localeCompare(b.start)).map(c => {
      const d = CH.find(x => x.id === c.id) || { name: c.id, icon: '🏆' };
      return `<div class="sw-row"><span class="sw-ic">${escHtml(d.icon)}</span>
        <div class="sw-txt"><div class="sw-name">${escHtml(d.name)}</div><div class="sw-desc">${datumKurz(c.start)} bis ${datumKurz(isoPlus(c.start, tage - 1))} · ${(c.klassen || []).length ? 'Klasse ' + c.klassen.join(', ') : 'alle Klassen'}</div></div>
        <button class="btn sm danger" data-ch-weg="${escHtml(c.id + '|' + c.start)}">Entfernen</button></div>`;
    }).join('');
    document.getElementById('dorf-challenge').innerHTML = `
      <div class="sw-row"><span class="sw-ic">🔄</span>
        <div class="sw-txt"><div class="sw-name">Automatisch wechseln</div><div class="sw-desc">${rotAn && jetzt ? `Gerade: ${escHtml(jetzt.def.icon)} <b>${escHtml(jetzt.def.name)}</b> (bis ${datumKurz(jetzt.ende)})${dann ? ` · danach ${escHtml(dann.def.icon)} ${escHtml(dann.def.name)}` : ''}` : rotAn ? 'Startet am ' + escHtml(datumKurz((C.CHALLENGE_WERTE || {}).start || '')) : 'Aus – es laufen nur Challenges, die du startest.'}</div></div>
        <label class="switch"><input type="checkbox" data-dorf-rot ${rotAn ? 'checked' : ''} aria-label="Challenges automatisch wechseln"><span></span></label></div>
      ${geplant || '<p style="font-size:.85rem;color:var(--text2);margin:.4rem 0 .6rem">Keine eigene Challenge geplant.</p>'}
      <div style="border-top:1px solid var(--border);margin-top:.6rem;padding-top:1rem;display:grid;gap:.7rem;">
        <div style="display:flex;gap:.6rem;flex-wrap:wrap;">
          <select id="dc-id" style="width:auto">${CH.map(c => opt(c.id, `${c.icon} ${c.name} – ${c.text}`, '')).join('')}</select>
          <select id="dc-start" style="width:auto">${opt(h, 'ab heute', h)}${opt(montagIso(1), 'ab nächstem Montag (' + datumKurz(montagIso(1)) + ')', h)}</select>
        </div>
        <div class="st-chips" id="dc-klassen">${klassenAlle.map(k => `<label class="st-chip"><input type="checkbox" value="${k}"> Klasse ${k}</label>`).join('')}
          <span style="font-size:.75rem;color:var(--muted);align-self:center">keine Auswahl = alle Klassen</span></div>
        <div><button class="btn accent" id="dc-setzen">🏆 Challenge starten</button></div>
      </div>`;
    document.getElementById('dc-setzen').onclick = () => {
      const c = dorfCfg(), e = { id: document.getElementById('dc-id').value, start: document.getElementById('dc-start').value,
        klassen: [...document.querySelectorAll('#dc-klassen input:checked')].map(i => Number(i.value)) };
      if (!e.klassen.length) delete e.klassen;
      c.challenges = c.challenges.filter(x => !(x.start === e.start && JSON.stringify(x.klassen || []) === JSON.stringify(e.klassen || [])));
      c.challenges.push(e);
      const d = CH.find(x => x.id === e.id) || {};
      dorfSpeichern(c, `🏆 Challenge ab ${datumKurz(e.start)}: ${d.name || e.id}`);
    };
    document.querySelectorAll('[data-ch-weg]').forEach(b => b.onclick = () => {
      const c = dorfCfg(), [id, start] = b.dataset.chWeg.split('|');
      c.challenges = c.challenges.filter(x => !(x.id === id && x.start === start));
      dorfSpeichern(c, `🏆 Challenge entfernt: ${id}`);
    });
  }

  // Einstellungen
  const cur = k => cfg[k] ?? std[k];
  document.getElementById('dorf-settings').innerHTML = `
    <div class="sw-row"><span class="sw-ic">📌</span>
      <div class="sw-txt"><div class="sw-name">Auftragsplätze</div><div class="sw-desc">Platz 1 Mathematik, Platz 2 Englisch/GPG, Platz 3 freie Wahl. Weniger Plätze = weniger Rohstoffe pro Tag. Wer eine Bibliothek baut, bekommt einen Platz dazu.</div></div>
      <select class="sw-sel" data-dorf-set="plaetze">${[1, 2, 3].map(n => opt(n, n + (n === 1 ? ' Platz' : ' Plätze') + (n === std.plaetze ? ' (Standard)' : ''), cur('plaetze'))).join('')}</select></div>
    <div class="sw-row"><span class="sw-ic">🎲</span>
      <div class="sw-txt"><div class="sw-name">Tauschen</div><div class="sw-desc">So viele Tausche bekommt ein Kind pro Tag dazu – und so viele kann es höchstens ansparen.</div></div>
      <select class="sw-sel" data-dorf-set="rerollsProTag">${[0, 1, 2].map(n => opt(n, n + ' pro Tag' + (n === std.rerollsProTag ? ' (Standard)' : ''), cur('rerollsProTag'))).join('')}</select>
      <select class="sw-sel" data-dorf-set="rerollsMax">${[0, 1, 2, 3, 4, 5].map(n => opt(n, 'bis ' + n + (n === std.rerollsMax ? ' (Standard)' : ''), cur('rerollsMax'))).join('')}</select></div>
    <div class="sw-row"><span class="sw-ic">🧱</span>
      <div class="sw-txt"><div class="sw-name">Baukosten</div><div class="sw-desc">Gilt für alle Gebäude und Stufen. Wenn die Klasse zu schnell oder zu langsam vorankommt: hier nachjustieren. Wirkt sofort, bereits Gebautes bleibt.</div></div>
      <select class="sw-sel" data-dorf-set="kostenfaktor">${[0.5, 0.75, 1, 1.25, 1.5, 2].map(n => opt(n, Math.round(n * 100) + ' %' + (n === std.kostenfaktor ? ' (Standard)' : ''), cur('kostenfaktor'))).join('')}</select></div>`;

  // Apps
  const alle = lernAppsFuerDorf().sort((a, b) => (a.fach + a.name).localeCompare(b.fach + b.name));
  document.getElementById('dorf-apps').innerHTML = alle.map(a => {
    const i = CONFIG.apps.indexOf(a);
    const grund = a.hidden ? 'versteckt' : !(a.klassen || []).length ? 'keiner Klasse zugeordnet' : '';
    return `<div class="sw-row"><span class="sw-ic">${escHtml(a.emoji || '📱')}</span>
      <div class="sw-txt"><div class="sw-name">${escHtml(a.name)}</div><div class="sw-desc">${escHtml(a.fach)}${(a.klassen || []).length ? ' · Klasse ' + a.klassen.join(', ') : ''}${grund ? ' · <b>bekommt keine Aufträge (' + grund + ')</b>' : ''}</div></div>
      <select class="sw-sel" data-dorf-runden="${i}" ${a.dorf === false || grund ? 'disabled' : ''} aria-label="Runden pro Auftrag für ${escHtml(a.name)}">${opt('', 'Standard (' + ((A.tag || {}).runden ?? 2) + ' Runden)', a.dorfRunden ?? '')}${[1, 2, 3, 4].map(n => opt(n, n + (n === 1 ? ' Runde' : ' Runden'), a.dorfRunden ?? '')).join('')}</select>
      <label class="switch"><input type="checkbox" data-dorf-app="${i}" ${a.dorf !== false && !grund ? 'checked' : ''} ${grund ? 'disabled' : ''} aria-label="${escHtml(a.name)} bekommt Aufträge"><span></span></label></div>`;
  }).join('');

  // Übersicht
  const f = Number(cur('kostenfaktor')) || 1;
  const R = Object.fromEntries((C.ROHSTOFFE || []).map(r => [r.id, r]));
  const kostenTxt = k => Object.entries(k).filter(([r]) => r !== 'stufe').map(([r, n]) => `${(R[r] || {}).icon || r} ${Math.round(n * f)}`).join(' ');
  const stufen = (C.BAU || {}).stufenKosten || [];
  const gebRows = (C.GEBAEUDE || []).map(g => `<tr><td style="font-size:1.3rem">${escHtml(g.icon || '')}</td><td><b>${escHtml(g.name)}</b><div style="font-size:.66rem;color:var(--muted)">${escHtml(g.id)}</div></td>
      <td>${escHtml(g.text || '')}</td><td>${g.maxStufe || '–'}</td><td>${g.mehrfach === true ? 'beliebig' : Number.isInteger(g.mehrfach) ? 'bis ' + g.mehrfach : '1'}</td>
      <td>${g.bonus ? Object.entries(g.bonus).map(([r, l]) => `${r === 'rabatt' ? '🧱 günstiger' : r === 'woche' ? '📅 Wochenauftrag' : (R[r] || {}).icon || r} ${l.map(x => (r === 'rabatt' ? '−' : '+') + Math.round(x * 100) + ' %').join(' / ')}`).join('<br>') : '–'}</td>
      <td>${(g.ansehen || []).join(' / ') || '–'}${Array.isArray(g.ansehenNoetig) ? `<br><span style="color:var(--muted)">nötig: ${g.ansehenNoetig.join(' / ')}</span>` : ''}</td>
      <td>${g.zusatz ? Object.entries(g.zusatz).map(([r, l]) => `${(R[r] || {}).icon || r} ${l.join(' / ')}`).join('<br>') : '–'}</td></tr>`).join('');
  const platzRows = [...new Set((C.BAUPLAETZE || []).map(p => p.rathaus))].sort((a, b) => a - b).map(st => {
    const n = (C.BAUPLAETZE || []).filter(p => p.rathaus === st).length;
    return `<tr><td>${st === 0 ? 'von Anfang an' : 'Rathaus Stufe ' + st}</td><td>${n} ${n === 1 ? 'Platz' : 'Plätze'}</td></tr>`;
  }).join('');
  const t = A.tag || {}, w = A.woche || {};
  document.getElementById('dorf-overview').innerHTML = `
    <details open><summary>🏠 Gebäude</summary><div class="ov-body"><table>
      <tr><th></th><th>Gebäude</th><th>Beschreibung</th><th>Stufen</th><th>Anzahl</th><th>Bonus je Stufe</th><th>Ansehen je Stufe</th><th>Zusatzkosten</th></tr>${gebRows}</table>
      <p class="note">Stufe 4 („Prachtstufe“) kostet zusätzlich Gold. Wohnhäuser bringen je Stufe einen Bewohner. Das Rathaus steigt nur mit genug Ansehen auf (Ansehen gibt es für Gebäude und Bewohner-Aufträge).</p></div></details>
    <details><summary>👥 Bewohner und Sammelstücke (${(C.BEWOHNER || []).length} Bewohner)</summary><div class="ov-body"><table>
      <tr><th></th><th>Bewohner</th><th>Geschichten → Sammelstück</th></tr>
      ${(C.BEWOHNER || []).map(b => `<tr><td style="font-size:1.3rem">${escHtml(b.icon)}</td><td><b>${escHtml(b.name)}</b><div style="font-size:.7rem;color:var(--muted)">${escHtml(b.text)}</div></td>
        <td>${(b.geschichten || []).map(g => `„${escHtml(g.text)}“ → ${escHtml(g.stueck.icon)} ${escHtml(g.stueck.name)}`).join('<br>')}</td></tr>`).join('')}</table>
      <p class="note">Einzug in dieser Reihenfolge. Bewohner-Auftrag: ${(A.bewohner || {}).runden ?? 2} Runden in einer Lern-App → +${(A.bewohner || {}).ansehen ?? 10} Ansehen und das Sammelstück; einer auf einmal, der nächste am Tag danach.</p></div></details>
    <details><summary>🏅 Meilensteine</summary><div class="ov-body"><table>
      ${(C.MEILENSTEINE || []).map(m => `<tr><td style="font-size:1.3rem">${escHtml(m.icon)}</td><td><b>${escHtml(m.name)}</b></td><td>${escHtml(m.text)}</td></tr>`).join('')}</table></div></details>
    <details><summary>🧱 Baukosten je Stufe (mit Faktor ${Math.round(f * 100)} %)</summary><div class="ov-body"><table>
      <tr><th>Stufe</th><th>Kosten</th></tr>${stufen.map(z => `<tr><td>${z.stufe}</td><td>${kostenTxt(z)}</td></tr>`).join('')}</table>
      <p class="note">Der allererste Bau ist sofort fertig, alle weiteren Bauten und Ausbauten ab dem nächsten Tag.</p></div></details>
    ${Array.isArray(C.EVENTS) && C.EVENTS.length ? `<details><summary>🎉 Feste im Dorf (${C.EVENTS.length})</summary><div class="ov-body"><table>
      <tr><th></th><th>Fest</th><th>Währung</th><th>Festgebäude (Kosten je Stufe)</th><th>Deko</th><th>Gast → Sammelstücke</th><th>Besonderes</th></tr>
      ${C.EVENTS.map(e => {
        const fg = e.festgebaeude || {}, m = e.mechanik || {}, g = e.gast || {}, an = passCfg().events[e.id] === true;
        return `<tr><td style="font-size:1.3rem">${escHtml(e.icon)}</td><td><b>${escHtml(e.name)}</b><div style="font-size:.7rem;color:${an ? 'var(--green)' : 'var(--muted)'}">${an ? 'läuft gerade' : 'aus'}</div></td>
          <td>${escHtml(e.waehrung.icon)} ${escHtml(e.waehrung.name)}</td>
          <td>${escHtml(fg.icon || '')} ${escHtml(fg.name || '–')}<br><span style="color:var(--muted)">${(fg.kosten || []).map(k => Math.round(k * f)).join(' / ')} ${escHtml(e.waehrung.icon)}</span></td>
          <td>${(e.deko || []).map(d => `${escHtml(d.icon)} ${escHtml(d.name)} (${Math.round(d.kosten * f)})`).join('<br>')}</td>
          <td>${escHtml(g.icon || '')} <b>${escHtml(g.name || '–')}</b><br>${(g.geschichten || []).map(x => escHtml(x.stueck.icon) + ' ' + escHtml(x.stueck.name)).join(', ')}</td>
          <td>${m.art === 'kalender' ? `${escHtml(m.icon || '🗓️')} ${escHtml(m.name)}: ${m.tueren || 24} Türen, eine je Übungstag${m.stueck ? ', letzte → ' + escHtml(m.stueck.icon) + ' ' + escHtml(m.stueck.name) : ''}` : m.art === 'suche' ? `${escHtml(m.icon || '🔍')} ${escHtml(m.name)}: täglich nach dem ersten erfüllten Auftrag` : '–'}<br>🏅 ${escHtml((e.meilenstein || {}).name || '')}</td></tr>`;
      }).join('')}</table>
      <p class="note">Ein- und ausgeschaltet werden die Feste im Reiter „🧭 Pass“ bei den Events – dort, wo auch die Event-Truhen an- und ausgehen. Währung pro Fest: Startgeschenk ${(C.EVENT_WERTE || {}).startgeschenk ?? 5}, +${(C.EVENT_WERTE || {}).proAuftrag ?? 3} je erfülltem Tagesauftrag, +${(C.EVENT_WERTE || {}).mechanik ?? 3} je Kalendertür bzw. Fund, Gast-Auftrag +${((C.EVENT_WERTE || {}).gast || {}).lohn ?? 8}. Deko bleibt nach dem Fest im Dorf, das Festgebäude kommt in die Festkiste und steht beim nächsten Fest wieder da. Nichts verfällt.</p></div></details>` : ''}
    ${(() => { const bedTxt = ab => { if (!ab || !Object.keys(ab).length) return 'von Anfang an'; const t = []; if (ab.rathaus) t.push('Rathaus ' + ab.rathaus); if (ab.gebaeude) t.push(((C.GEBAEUDE || []).find(g => g.id === ab.gebaeude) || {}).name + ' Stufe ' + (ab.stufe || 1)); if (ab.ansehen) t.push(ab.ansehen + ' Ansehen'); if (ab.bewohner) t.push(ab.bewohner + ' Bewohner'); if (ab.meilensteine) t.push(ab.meilensteine + ' Meilensteine'); return t.join(' + '); };
      const L = Array.isArray(C.LANDSCHAFT) ? C.LANDSCHAFT : [], K = Array.isArray(C.DEKO) ? C.DEKO : [];
      return L.length ? `<details><summary>🌳 Landschaft und Dorf-Deko (${L.length} + ${K.length})</summary><div class="ov-body"><table>
        <tr><th></th><th>Landschaft</th><th>Kommt mit</th></tr>
        ${L.map(l => `<tr><td style="font-size:1.3rem">${escHtml(l.icon || '')}</td><td><b>${escHtml(l.name)}</b><div style="font-size:.7rem;color:var(--muted)">${escHtml(l.text || '')}</div></td><td>${escHtml(bedTxt(l.ab))}</td></tr>`).join('')}
        <tr><th></th><th>Dorf-Deko</th><th>Kommt mit</th></tr>
        ${K.map(d => `<tr><td style="font-size:1.3rem">${escHtml(d.icon || '')}</td><td><b>${escHtml(d.name)}</b></td><td>${escHtml(bedTxt(d.ab))}</td></tr>`).join('')}</table>
        <p class="note">Landschaft und Dorf-Deko kosten nichts: Sie wachsen mit Rathaus, Ansehen, Bewohnern und Gebäuden. Die Kinder sehen neue Teile als Neuigkeit im Dorf. Die Bewohner laufen durchs Dorf und ins Umland – nur solange das Dorf sichtbar ist, höchstens 30 Bilder pro Sekunde, mit Pause nach 60 Sekunden ohne Antippen.</p></div></details>` : ''; })()}
    ${Array.isArray(C.CHALLENGES) && C.CHALLENGES.length ? `<details><summary>🏆 Challenges (${C.CHALLENGES.length})</summary><div class="ov-body"><table>
      ${C.CHALLENGES.map(c => `<tr><td style="font-size:1.3rem">${escHtml(c.icon)}</td><td><b>${escHtml(c.name)}</b></td><td>${escHtml(c.text)}</td></tr>`).join('')}</table>
      <p class="note">Je ${(C.CHALLENGE_WERTE || {}).tage || 14} Tage, Belohnung +${(C.CHALLENGE_WERTE || {}).ansehen ?? 15} Ansehen, +${(C.CHALLENGE_WERTE || {}).gold ?? 1} Gold und eine Trophäe (🥉 🥈 🥇 beim 1., 2., 3. Mal). Trophäen schalten Bonus-Gebäude frei: ${(C.GEBAEUDE || []).filter(g => g.trophaeen).map(g => escHtml(g.icon + ' ' + g.name) + ' ab ' + g.trophaeen).join(', ')}. Am Marktplatz können die Kinder Holz und Stein tauschen (10 → ${Math.floor(10 * (((C.MARKT || {}).tausch || [.6])[0]))} bis ${Math.floor(10 * (((C.MARKT || {}).tausch || [.6, .7, .75, .8])[3] || .8))}, je nach Stufe).</p></div></details>` : ''}
    <details><summary>📍 Bauplätze</summary><div class="ov-body"><table><tr><th>Frei ab</th><th>Anzahl</th></tr>${platzRows}</table></div></details>
    <details><summary>📋 Aufträge</summary><div class="ov-body"><table>
      <tr><td><b>Tagesauftrag</b></td><td>${t.runden ?? 2} Runden mit mind. ${t.schwelle ?? 70} % in einer App → ${(t.belohnung || [15, 25]).join('–')} Holz oder Stein</td></tr>
      <tr><td><b>Lange nicht gespielt</b></td><td>+${Math.round(((A.langeNichtGespielt || {}).bonus ?? .5) * 100)} % ab ${(A.langeNichtGespielt || {}).tage ?? 14} Tagen ohne die App (nur Apps, die das Kind schon kennt)</td></tr>
      <tr><td><b>Wochenauftrag</b></td><td>automatisch ${w.auftraege ?? 4} erledigte Aufträge, sonst deiner → ${w.rohstoffe ?? 60} Rohstoffe (halb Holz, halb Stein) + ${w.gold ?? 2} Gold</td></tr>
      <tr><td><b>Werkstatt-Bonus</b></td><td>+${Math.round(((A.werkstatt || {}).bonus ?? 0) * 100)} % für schon geübte Apps mit höchstens ${(A.werkstatt || {}).sterneBis ?? 1} Meisterschafts-Stern</td></tr>
      <tr><td><b>Fleißzettel</b></td><td>einmal am Tag, wenn alle Tageszettel erledigt sind: ein Extra-Auftrag mit ${Math.round(((A.fleiss || {}).anteil ?? .5) * 100)} % der Belohnung</td></tr>
      <tr><td><b>Rohstoff-Lenkung</b></td><td>${Math.round((t.rohstoffLenkung ?? 0) * 100)} % der Aufträge bringen den Rohstoff, der dem Kind fürs Ziel (bzw. im Vorrat) fehlt</td></tr>
      <tr><td><b>Briefe auf Englisch</b></td><td>${Math.round(((A.bewohner || {}).englischAnteil ?? 0) * 100)} % der Bewohner-Aufträge liegen in einer Englisch-App – dann schreibt der Bewohner einen kurzen Brief auf Englisch</td></tr>
      <tr><td><b>Nichts verfällt</b></td><td>Offene Tagesaufträge bleiben, bis sie erledigt sind; freie Plätze füllen sich einmal am Tag. Der Wochenauftrag wechselt montags.</td></tr></table></div></details>`;
}

document.getElementById('panel-dorf').addEventListener('change', e => {
  const set = e.target.closest('[data-dorf-set]'), app = e.target.closest('[data-dorf-app]'), rd = e.target.closest('[data-dorf-runden]');
  if (rd) {
    const a = CONFIG.apps[Number(rd.dataset.dorfRunden)];
    if (!a) return;
    if (rd.value) a.dorfRunden = Number(rd.value); else delete a.dorfRunden;
    logChange(`🏘️ „${a.name}“: ${rd.value ? rd.value + ' Runden' : 'Standard-Runden'} pro Dorf-Auftrag`);
    saveConfig();
    buildDorfAdmin();
    return;
  }
  if (e.target.closest('[data-dorf-rot]')) {
    const c = dorfCfg();
    if (e.target.checked) delete c.challengeRotation; else c.challengeRotation = false;
    dorfSpeichern(c, `🏆 Challenges automatisch ${e.target.checked ? 'an' : 'aus'}`);
    return;
  }
  if (set) {
    const c = dorfCfg(), k = set.dataset.dorfSet;
    c[k] = Number(set.value);
    const namen = { plaetze: 'Auftragsplätze', rerollsProTag: 'Tausche pro Tag', rerollsMax: 'Tausche höchstens', kostenfaktor: 'Baukosten' };
    dorfSpeichern(c, `🏘️ ${namen[k]}: ${k === 'kostenfaktor' ? Math.round(c[k] * 100) + ' %' : c[k]}`);
  } else if (app) {
    const a = CONFIG.apps[Number(app.dataset.dorfApp)];
    if (!a) return;
    if (app.checked) delete a.dorf; else a.dorf = false;
    logChange(`🏘️ „${a.name}“ ${app.checked ? 'bekommt wieder' : 'bekommt keine'} Dorf-Aufträge`);
    saveConfig();
    buildDorfAdmin();
  }
});
