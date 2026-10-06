// ═══════════════════════════════════════════════════════
//  Lernwelt-Admin – Freigaben und Fokus (Infrastruktur Etappe 7)
//  Teil von admin.html. Alle Module teilen sich die globalen Variablen aus kern.js (CONFIG, ghSha …)
//  und werden in admin.html in fester Reihenfolge geladen.
//
//  Schreibt zwei Felder in config.json (Format und Auswertung: gemeinsam/freigabe.js):
//    freigaben – { themaId: { wer: 'zu' | 'offen' | 'JJJJ-MM-TT' } }   wer = alle | k5 | g:<Sync-Gruppe>
//    fokus[]   – { id, fuer, apps[], ab?, bis }
//  Der Worker prüft beide Felder (cloudflare/worker.js) – er muss VOR dem ersten Speichern aktualisiert sein.
//
//  Reihen = Inhalte, deren App die Freigabe schon auswertet (Übungs-Rahmen): Stufen aus
//  daten/kopfrechnen.json und die Units/Listen des Vokabeltrainers aus dem Katalog.
//  Neue Engine-Apps (Etappe 9) kommen in FR_KATALOG_REIHEN dazu.
// ═══════════════════════════════════════════════════════
'use strict';

const FR_KATALOG_REIHEN = ['en.5.vok', 'en.5.wortlisten', 'en.6.vok'];
const FR_APP_NAMEN = { kopfrechnen: '🧮', trainer: '📐' };
const FR = { wer: 'alle', offen: '', reihen: null, gruppen: null, gruppenFehler: '' };

const frEsc = s => escHtml(String(s == null ? '' : s));
function frHeute() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
const frDatum = iso => { const [j, m, t] = String(iso).split('-'); return `${Number(t)}.${Number(m)}.${j.slice(2)}`; };
const frUhr = ms => new Date(ms).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

function frCfg() {
  if (!CONFIG.freigaben || typeof CONFIG.freigaben !== 'object' || Array.isArray(CONFIG.freigaben)) CONFIG.freigaben = {};
  return CONFIG.freigaben;
}
function frAufraeumen() {
  const F = frCfg();
  Object.keys(F).forEach(t => { if (!F[t] || !Object.keys(F[t]).length) delete F[t]; });
  if (!Object.keys(F).length) delete CONFIG.freigaben;
  if (Array.isArray(CONFIG.fokus)) {
    CONFIG.fokus = CONFIG.fokus.filter(f => f && Number(f.bis) > Date.now());
    if (!CONFIG.fokus.length) delete CONFIG.fokus;
  }
}

// ── Für wen? ───────────────────────────────────────────
function frKlassen() {
  const k = new Set();
  CONFIG.apps.forEach(a => (a.klassen || []).forEach(x => k.add(x)));
  return (k.size ? [...k] : KLASSEN.slice(0, 2)).sort((a, b) => a - b);
}
function frWerName(w) {
  if (w === 'alle') return 'Alle';
  if (/^k\d+$/.test(w)) return 'Klasse ' + w.slice(1);
  const g = (FR.gruppen || []).find(x => 'g:' + x.id === w);
  return g ? 'Gruppe „' + g.name + '“' : 'Gruppe ' + w.slice(2, 8) + '…';
}
function frWerListe() {
  const liste = ['alle', ...frKlassen().map(k => 'k' + k)];
  (FR.gruppen || []).forEach(g => liste.push('g:' + g.id));
  // Gruppen, die in der Config stehen, aber (noch) nicht geladen sind
  Object.values(CONFIG.freigaben || {}).forEach(e => Object.keys(e || {}).forEach(w => { if (!liste.includes(w)) liste.push(w); }));
  (CONFIG.fokus || []).forEach(f => { if (f && f.fuer && !liste.includes(f.fuer)) liste.push(f.fuer); });
  return liste;
}

// Sync-Gruppen (Sicherungskarten) beim Worker holen – Namen stehen NICHT in config.json
async function frGruppenLaden() {
  FR.gruppenFehler = '';
  try {
    const t = JSON.parse(localStorage.getItem('lernwelt-admin-schluessel') || 'null');
    const r = await fetch(ConfigAPI.WORKER_URL + '/sync/admin/gruppen', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (t && t.token || '') }, body: '{}',
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || ('Fehler ' + r.status));
    FR.gruppen = (d.gruppen || []).filter(g => /^[0-9a-f]{32}$/.test(g.id)).map(g => ({ id: g.id, name: String(g.name || 'ohne Namen') }));
  } catch (e) {
    FR.gruppen = FR.gruppen || [];
    FR.gruppenFehler = e.message || 'nicht erreichbar';
  }
}

// ── Reihen (was sich freischalten lässt) ───────────────
async function frReihenLaden() {
  const reihen = [];
  try {
    const D = await fetch('daten/kopfrechnen.json', { cache: 'no-cache' }).then(r => r.json());
    Object.entries(D.apps || {}).forEach(([app, A]) => Object.entries(A.klassen || {}).forEach(([kl, K]) => {
      const stufen = (K.stufen || []).filter(id => D.stufen[id]).map(id => ({ id, titel: D.stufen[id].titel || id, kurz: D.stufen[id].kurz || '' }));
      if (stufen.length) reihen.push({ id: app + '.' + kl, titel: (FR_APP_NAMEN[app] || '🧮') + ' ' + (K.titel || app + ' ' + kl), klasse: Number(kl), stufen });
    }));
  } catch (e) { console.warn('[Freigaben] kopfrechnen.json', e); }
  try {
    const K = window.LernKatalog;
    if (K) {
      await Promise.race([K.bereit, new Promise(r => setTimeout(r, 4000))]);
      FR_KATALOG_REIHEN.forEach(id => {
        const t = K.thema(id);
        if (t) reihen.push({ id, titel: '🇬🇧 ' + t.titel, klasse: t.klasse, stufen: K.stufen(id).map(s => ({ id: s.id, titel: String(s.titel).replace(t.titel + ' – ', ''), kurz: '' })) });
      });
    }
  } catch (e) { console.warn('[Freigaben] Katalog', e); }
  return reihen;
}

// Was gilt für „wer“ bei dieser Stufe? Eigener Eintrag, sonst Thema darüber, sonst „alle“.
function frStand(sid, wer) {
  const F = CONFIG.freigaben || {};
  const teile = sid.split('.'), kette = [];
  for (let n = teile.length; n >= 2; n--) kette.push(teile.slice(0, n).join('.'));
  const werKette = wer === 'alle' ? ['alle'] : [wer, 'alle'];
  for (const t of kette) for (const w of werKette) {
    const v = F[t] && F[t][w];
    if (v !== undefined) return { v, eigen: t === sid && w === wer, von: w };
  }
  return { v: 'frei', eigen: false, von: '' };
}
function frGesperrt(v) { return v === 'zu' || (/^\d{4}-\d{2}-\d{2}$/.test(v) && v > frHeute()); }

// ── Aufbau ─────────────────────────────────────────────
async function buildFreigaben() {
  const box = document.getElementById('freigaben-inhalt');
  if (!box) return;
  if (!FR.reihen) {
    box.innerHTML = '<div class="empty-msg">Lade Inhalte …</div>';
    [FR.reihen] = await Promise.all([frReihenLaden(), FR.gruppen ? null : frGruppenLaden()]);
  }
  const werListe = frWerListe();
  if (!werListe.includes(FR.wer)) FR.wer = 'alle';
  const wer = FR.wer;

  const kopf = `<div class="st-chips" role="radiogroup" aria-label="Für wen?" style="margin-bottom:.4rem">${werListe.map(w =>
    `<button type="button" class="st-chip fr-wer${w === wer ? ' an' : ''}" data-fr-wer="${frEsc(w)}" role="radio" aria-checked="${w === wer}">${frEsc(frWerName(w))}</button>`).join('')}</div>
    <p class="fr-hinweis">${wer === 'alle' ? 'Gilt für alle iPads.' : wer.startsWith('k') ? 'Gilt für iPads, deren Pass diese Klasse hat. Eine Gruppen-Einstellung geht vor.' : 'Gilt für iPads mit einer Sicherungskarte aus dieser Gruppe – vor Klasse und „Alle“.'}
      Gestrichelt = übernommen von „Alle“. ${FR.gruppenFehler ? `<br>⚠ Sync-Gruppen nicht geladen (${frEsc(FR.gruppenFehler)}).` : !(FR.gruppen || []).length ? '<br>Noch keine Sync-Gruppen angelegt (Sicherungskarten).' : ''}</p>`;

  const reihen = FR.reihen.map(r => {
    const chips = r.stufen.map((s, i) => {
      const st = frStand(s.id, wer), zu = frGesperrt(st.v), datum = /^\d{4}/.test(st.v);
      const ic = !zu ? '✅' : datum ? '📅' : '🔒';
      const zusatz = datum ? (zu ? ' ab ' + frDatum(st.v) : '') : '';
      return `<button type="button" class="fr-chip${zu ? ' zu' : ''}${st.eigen ? '' : ' geerbt'}${FR.offen === s.id ? ' offen' : ''}" data-fr-stufe="${frEsc(s.id)}" data-fr-reihe="${frEsc(r.id)}"
        title="${frEsc(s.kurz || s.titel)}">${ic} ${i + 1}. ${frEsc(s.titel)}${frEsc(zusatz)}</button>`;
    }).join('');
    const aktiv = r.stufen.some(s => frStand(s.id, wer).eigen);
    const offen = r.stufen.find(s => s.id === FR.offen);
    return `<details class="fr-reihe"${aktiv || offen ? ' open' : ''}><summary>${frEsc(r.titel)}${aktiv ? ' <span class="fr-punkt">●</span>' : ''}</summary>
      <div class="fr-chips">${chips}</div>${offen ? frAktionen(r, offen, wer) : ''}</details>`;
  }).join('');

  box.innerHTML = kopf + (reihen || '<div class="empty-msg">Keine Inhalte gefunden.</div>');
  buildFokus();
}

function frAktionen(r, s, wer) {
  const st = frStand(s.id, wer), morgen = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
  return `<div class="fr-akt"><b>${frEsc(s.titel)}</b> für ${frEsc(frWerName(wer))}:
    <div class="fr-knoepfe">
      <button class="btn sm" data-fr-akt="frei">✅ frei</button>
      <button class="btn sm" data-fr-akt="zu">🔒 sperren</button>
      <button class="btn sm" data-fr-akt="grenze" title="Diese und alle Stufen davor frei, alle danach gesperrt">⇥ bis hier frei, Rest sperren</button>
      ${wer !== 'alle' && st.eigen ? '<button class="btn sm" data-fr-akt="erben">↺ wie „Alle“</button>' : ''}
      <span class="fr-ab"><input type="date" id="fr-datum" min="${frHeute()}" value="${/^\d{4}/.test(st.v) && st.v > frHeute() ? st.v : morgen}" aria-label="Frei ab Datum">
        <button class="btn sm" data-fr-akt="datum">📅 frei ab Datum</button></span>
      <button class="btn sm" data-fr-akt="schliessen" aria-label="Schließen">✕</button>
    </div></div>`;
}

// Eine Stufe für „wer“ setzen. v: 'frei' | 'zu' | 'JJJJ-MM-TT' | 'erben'
function frSetzen(sid, wer, v) {
  const F = frCfg();
  const e = F[sid] || (F[sid] = {});
  delete e[wer];
  if (v === 'erben') return;
  if (v === 'frei') {
    // Nur dann ausdrücklich „offen“, wenn sonst eine Sperre von „Alle“ (oder dem Thema darüber) greifen würde
    if (frGesperrt(frStand(sid, wer).v)) e[wer] = 'offen';
    return;
  }
  e[wer] = v;
}

function frAktion(akt) {
  const r = FR.reihen.find(x => x.stufen.some(s => s.id === FR.offen));
  if (!r) return;
  const s = r.stufen.find(x => x.id === FR.offen), wer = FR.wer, wn = frWerName(wer);
  if (akt === 'schliessen') { FR.offen = ''; return buildFreigaben(); }
  let msg = '';
  if (akt === 'frei' || akt === 'zu' || akt === 'erben') {
    frSetzen(s.id, wer, akt);
    msg = `${akt === 'zu' ? '🔒' : '✅'} ${wn}: ${r.titel} – ${s.titel} ${akt === 'zu' ? 'gesperrt' : akt === 'erben' ? 'wie „Alle“' : 'frei'}`;
  } else if (akt === 'datum') {
    const d = (document.getElementById('fr-datum') || {}).value || '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || d <= frHeute()) { showToast('⚠ Bitte ein Datum ab morgen wählen', true); return; }
    frSetzen(s.id, wer, d);
    msg = `📅 ${wn}: ${r.titel} – ${s.titel} frei ab ${frDatum(d)}`;
  } else if (akt === 'grenze') {
    const i = r.stufen.indexOf(s);
    r.stufen.forEach((x, j) => frSetzen(x.id, wer, j <= i ? 'frei' : 'zu'));
    msg = `⇥ ${wn}: ${r.titel} frei bis ${s.titel}`;
  }
  frAufraeumen();
  logChange(msg);
  saveConfig();
  buildFreigaben();
}

// ── Fokus-Modus ────────────────────────────────────────
function buildFokus() {
  const box = document.getElementById('fokus-inhalt');
  if (!box) return;
  const jetzt = Date.now();
  const liste = (CONFIG.fokus || []).filter(f => f && Number(f.bis) > jetzt);
  const appName = d => { const a = CONFIG.apps.find(x => x.datei === d); return a ? (a.emoji || '📱') + ' ' + a.name : d; };
  const laufend = liste.map(f => `<div class="sw-row"><span class="sw-ic">🎯</span>
    <div class="sw-txt"><div class="sw-name">${frEsc(frWerName(f.fuer))}: ${f.apps.map(d => frEsc(appName(d))).join(', ')}</div>
      <div class="sw-desc">${f.ab && f.ab > jetzt ? 'ab ' + frUhr(f.ab) + ' ' : ''}bis ${frUhr(f.bis)} Uhr${new Date(f.bis).toDateString() !== new Date().toDateString() ? ' (' + new Date(f.bis).toLocaleDateString('de-DE') + ')' : ''}</div></div>
    <button class="btn sm danger" data-fokus-weg="${frEsc(f.id)}">Beenden</button></div>`).join('');

  const apps = CONFIG.apps.filter(a => !a.hidden && !CONFIG.hiddenCats.includes(a.fach));
  const heute = new Date(); const um = (h, m) => { const d = new Date(heute); d.setHours(h, m, 0, 0); return d.getTime(); };
  const dauern = [[45 * 60e3, '45 Minuten'], [90 * 60e3, '90 Minuten'], ['13', 'bis 13:00 Uhr'], ['tag', 'bis heute Abend']]
    .filter(([v]) => v !== '13' || um(13, 0) > jetzt + 10 * 60e3);
  box.innerHTML = `${laufend || '<p style="font-size:.85rem;color:var(--text2);margin:.2rem 0 1rem">Gerade ist kein Fokus aktiv.</p>'}
    <div style="border-top:1px solid var(--border);margin-top:.6rem;padding-top:1rem;display:grid;gap:.7rem;">
      <div style="display:flex;gap:.6rem;flex-wrap:wrap;">
        <select id="fk-wer" style="width:auto" aria-label="Für wen?">${frWerListe().map(w => `<option value="${frEsc(w)}"${w === FR.wer ? ' selected' : ''}>${frEsc(frWerName(w))}</option>`).join('')}</select>
        <select id="fk-dauer" style="width:auto" aria-label="Wie lange?">${dauern.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select>
      </div>
      <div class="st-chips" id="fk-apps">${apps.map(a => `<label class="st-chip"><input type="checkbox" value="${frEsc(a.datei)}"> ${frEsc(a.emoji || '📱')} ${frEsc(a.name)}</label>`).join('')}</div>
      <div><button class="btn accent" id="fk-start">🎯 Fokus starten</button></div>
      <p style="font-size:.75rem;color:var(--muted);margin:0;line-height:1.5">Die Startseite zeigt dann nur diese Apps (höchstens 12). Nach dem Veröffentlichen dauert es etwa 1–2 Minuten.
        Der Fokus endet von selbst. Gibt es mehrere, gilt der genaueste (Gruppe vor Klasse vor Alle).</p>
    </div>`;
  document.getElementById('fk-start').onclick = () => {
    const fuer = document.getElementById('fk-wer').value, dv = document.getElementById('fk-dauer').value;
    const gewaehlt = [...document.querySelectorAll('#fk-apps input:checked')].map(i => i.value);
    if (!gewaehlt.length) { showToast('⚠ Bitte mindestens eine App wählen', true); return; }
    if (gewaehlt.length > 12) { showToast('⚠ Höchstens 12 Apps', true); return; }
    const bis = dv === 'tag' ? um(23, 59) : dv === '13' ? um(13, 0) : Date.now() + Number(dv);
    CONFIG.fokus = (CONFIG.fokus || []).filter(f => f && Number(f.bis) > Date.now() && f.fuer !== fuer);
    CONFIG.fokus.push({ id: 'fk-' + Date.now().toString(36), fuer, apps: gewaehlt, bis });
    logChange(`🎯 Fokus für ${frWerName(fuer)} bis ${frUhr(bis)}: ${gewaehlt.length} App${gewaehlt.length === 1 ? '' : 's'}`);
    saveConfig();
    showToast('🎯 Fokus angelegt – jetzt veröffentlichen');
    buildFokus();
  };
  box.querySelectorAll('[data-fokus-weg]').forEach(b => b.onclick = () => {
    const f = (CONFIG.fokus || []).find(x => x.id === b.dataset.fokusWeg);
    CONFIG.fokus = (CONFIG.fokus || []).filter(x => x.id !== b.dataset.fokusWeg);
    frAufraeumen();
    logChange(`🎯 Fokus beendet${f ? ' (' + frWerName(f.fuer) + ')' : ''}`);
    saveConfig();
    buildFokus();
  });
}

// ── Bedienung ──────────────────────────────────────────
document.addEventListener('click', e => {
  const t = e.target.closest('[data-fr-wer], [data-fr-stufe], [data-fr-akt]');
  if (!t || !t.closest('#panel-freigaben')) return;
  if (t.dataset.frWer) { FR.wer = t.dataset.frWer; FR.offen = ''; return buildFreigaben(); }
  if (t.dataset.frStufe) { FR.offen = FR.offen === t.dataset.frStufe ? '' : t.dataset.frStufe; return buildFreigaben(); }
  if (t.dataset.frAkt) frAktion(t.dataset.frAkt);
});
