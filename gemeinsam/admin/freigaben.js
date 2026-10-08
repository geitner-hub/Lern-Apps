// ═══════════════════════════════════════════════════════
//  Lernwelt-Admin – Freigaben und Fokus (Infrastruktur Etappe 7)
//  Seit Etappe 8 auch der Schalter für „Heute für dich“ (config.heute = false schaltet ab)
//  und die Gruppen-Auswertung (nur lesen, Daten beim Sync-Worker). Tab heißt „🎯 Unterricht“.
//  Teil von admin.html. Alle Module teilen sich die globalen Variablen aus kern.js (CONFIG, ghSha …)
//  und werden in admin.html in fester Reihenfolge geladen.
//
//  Schreibt zwei Felder in config.json (Format und Auswertung: gemeinsam/freigabe.js):
//    freigaben – { themaId: { wer: 'zu' | 'offen' | 'JJJJ-MM-TT' } }   wer = alle | k5 | g:<Sync-Gruppe>
//    spielsperre – { schwelle, runden: { wer: [Mo, Di, Mi, Do, Fr, Sa, So] } }  Spiele erst nach guten Lern-Runden
//    fokus[]   – { id, fuer, apps[], ab?, bis }
//  Der Worker prüft beide Felder (cloudflare/worker.js) – er muss VOR dem ersten Speichern aktualisiert sein.
//
//  Reihen = Inhalte, deren App die Freigabe schon auswertet (Übungs-Rahmen): Stufen aus
//  daten/kopfrechnen.json und die Units/Listen des Vokabeltrainers aus dem Katalog.
//  Inhalte des Aufgabentyp-Baukastens (Etappe 9) erscheinen automatisch; andere Apps mit Stufen in FR_KATALOG_REIHEN.
// ═══════════════════════════════════════════════════════
'use strict';

const FR_KATALOG_REIHEN = ['en.5.vok', 'en.5.wortlisten', 'en.6.vok', 'gpg.6.laender', 'gpg.5.erde', 'gpg.5.bayern'];
const FR_BAUKASTEN = 'apps/typen/uebung.html';          // Etappe 9: jeder Inhalt des Baukastens ist automatisch eine Reihe
const FR_APP_NAMEN = { kopfrechnen: '🧮', trainer: '📐', laengen: '📏' };
const FR = { wer: 'alle', offen: '', reihen: null, gruppen: null, gruppenFehler: '', spWer: null };

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
  Object.keys((CONFIG.spielsperre || {}).runden || {}).forEach(w => { if (!liste.includes(w)) liste.push(w); });
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
    FR.gruppen = (d.gruppen || []).filter(g => /^[0-9a-f]{32}$/.test(g.id))
      .map(g => ({ id: g.id, name: String(g.name || 'ohne Namen'), karten: Array.isArray(g.codes) ? g.codes.length : 0 }));
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
      const baukasten = K.themen({ nurOben: true }).filter(t => t.quelle && t.quelle.app === FR_BAUKASTEN).map(t => t.id);
      FR_KATALOG_REIHEN.concat(baukasten).forEach(id => {
        const t = K.thema(id);
        const ic = { en: '🇬🇧', gpg: '🌍', de: '📝', nut: '🌱', ma: '📏' }[id.split('.')[0]] || '📘';
        if (t) reihen.push({ id, titel: ic + ' ' + t.titel, klasse: t.klasse, stufen: K.stufen(id).map(s => ({ id: s.id, titel: String(s.titel).replace(t.titel + ' – ', ''), kurz: '' })) });
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
  buildSpielsperre();
  buildHeuteSchalter();
  buildAuswertung();
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

// ── Spielsperre: Spiele erst nach guten Lern-Runden (je Wochentag, je Gruppe/Klasse) ──
const SP_TAGE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
function spCfg() {
  const s = CONFIG.spielsperre && typeof CONFIG.spielsperre === 'object' ? CONFIG.spielsperre : {};
  return { schwelle: Number.isFinite(s.schwelle) ? s.schwelle : 60, runden: s.runden && typeof s.runden === 'object' ? s.runden : {} };
}
/** Was gilt für „wer“? Eigene Liste, sonst die von „Alle“, sonst nichts */
function spStand(wer) {
  const R = spCfg().runden;
  if (Array.isArray(R[wer])) return { l: R[wer], eigen: true };
  if (wer !== 'alle' && Array.isArray(R.alle)) return { l: R.alle, eigen: false };
  return { l: [0, 0, 0, 0, 0, 0, 0], eigen: wer === 'alle' };
}
function spSpeichern(sp, msg) {
  Object.keys(sp.runden).forEach(w => { if (!Array.isArray(sp.runden[w]) || (w === 'alle' && sp.runden[w].every(n => !n))) delete sp.runden[w]; });
  if (Object.keys(sp.runden).length) CONFIG.spielsperre = sp; else delete CONFIG.spielsperre;
  logChange(msg);
  saveConfig();
  buildSpielsperre();
}
function buildSpielsperre() {
  const box = document.getElementById('spielsperre-inhalt');
  if (!box) return;
  const werListe = frWerListe();
  if (!FR.spWer || !werListe.includes(FR.spWer)) FR.spWer = werListe.includes(FR.wer) ? FR.wer : 'alle';
  const wer = FR.spWer, sp = spCfg(), st = spStand(wer);
  const heute = (new Date().getDay() + 6) % 7;
  const tage = SP_TAGE.map((t, i) => `<label style="display:grid;gap:.25rem;text-align:center;font-size:.78rem;font-weight:800;color:${i === heute ? 'var(--accent)' : 'var(--text2)'}">${t}${i === heute ? ' (heute)' : ''}
      <select data-sp-tag="${i}" aria-label="${t}: gute Runden vor den Spielen" style="width:auto;${st.eigen ? '' : 'border-style:dashed;'}">${Array.from({ length: 11 }, (_, n) =>
        `<option value="${n}"${n === Number(st.l[i] || 0) ? ' selected' : ''}>${n === 0 ? '–' : n}</option>`).join('')}</select></label>`).join('');
  const aktiv = Object.entries(sp.runden).map(([w, l]) => `${frEsc(frWerName(w))}: ${l.map((n, i) => n ? SP_TAGE[i] + ' ' + n : '').filter(Boolean).join(', ') || 'keine Sperre'}`);
  box.innerHTML = `<div style="display:flex;gap:.6rem;flex-wrap:wrap;align-items:center;margin-bottom:.8rem">
      <select id="sp-wer" style="width:auto" aria-label="Für wen?">${werListe.map(w => `<option value="${frEsc(w)}"${w === wer ? ' selected' : ''}>${frEsc(frWerName(w))}</option>`).join('')}</select>
      <label style="font-size:.85rem;color:var(--text2)">gute Runde ab
        <select id="sp-schwelle" style="width:auto" aria-label="Gute Runde ab Prozent">${[50, 60, 70, 80, 90].map(v => `<option value="${v}"${v === sp.schwelle ? ' selected' : ''}>${v} %</option>`).join('')}</select></label>
      ${wer !== 'alle' && st.eigen ? '<button class="btn sm" id="sp-erben">↺ wie „Alle“</button>' : ''}
    </div>
    <div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:.4rem;max-width:520px">${tage}</div>
    <p style="font-size:.75rem;color:var(--muted);margin:.8rem 0 0;line-height:1.5">${st.eigen ? '' : 'Gestrichelt = übernommen von „Alle“. Eine Änderung legt eigene Werte für ' + frEsc(frWerName(wer)) + ' an. '}
      Gezählt werden Runden in Lern-Apps (nicht in Spielen) ab der Prozent-Schwelle, ohne Durchklicken – ab Mitternacht neu. Die Schwelle gilt für alle.
      ${aktiv.length ? '<br>Eingestellt: ' + aktiv.join(' · ') : '<br>Zurzeit ist keine Sperre eingestellt.'}</p>`;
  document.getElementById('sp-wer').onchange = e => { FR.spWer = e.target.value; buildSpielsperre(); };
  document.getElementById('sp-schwelle').onchange = e => {
    const s = spCfg(); s.schwelle = Number(e.target.value);
    spSpeichern(s, `🎮 Spielsperre: gute Runde ab ${s.schwelle} %`);
  };
  box.querySelectorAll('[data-sp-tag]').forEach(sel => sel.onchange = () => {
    const s = spCfg(), l = spStand(wer).l.slice();
    l[Number(sel.dataset.spTag)] = Number(sel.value);
    s.runden[wer] = l.map(n => Number(n) || 0);
    spSpeichern(s, `🎮 Spielsperre ${frWerName(wer)}: ${SP_TAGE[Number(sel.dataset.spTag)]} ${sel.value === '0' ? 'ohne Sperre' : sel.value + (sel.value === '1' ? ' Runde' : ' Runden')}`);
  });
  const erb = document.getElementById('sp-erben');
  if (erb) erb.onclick = () => { const s = spCfg(); delete s.runden[wer]; spSpeichern(s, `🎮 Spielsperre ${frWerName(wer)}: wie „Alle“`); };
}

// ── „Heute für dich“ auf der Startseite (Etappe 8) ─────
function buildHeuteSchalter() {
  const box = document.getElementById('heute-inhalt');
  if (!box) return;
  box.innerHTML = `<div class="sw-row"><span class="sw-ic">🗓</span>
    <div class="sw-txt"><div class="sw-name">„Heute für dich“</div>
      <div class="sw-desc">Oben auf der Startseite höchstens drei Karten: der Lehrer-Zettel von heute, eine fällige Wiederholung
        (gemeisterte Themen nach 7, 21 und 60 Tagen) und das nächste Ziel im Pass. Nur für Kinder mit Pass.</div></div>
    <label class="switch"><input type="checkbox" id="heute-an" ${CONFIG.heute === false ? '' : 'checked'} aria-label="Heute für dich anzeigen"><span></span></label></div>`;
  document.getElementById('heute-an').onchange = e => {
    if (e.target.checked) delete CONFIG.heute; else CONFIG.heute = false;
    logChange(`🗓 „Heute für dich“ ${e.target.checked ? 'an' : 'aus'}`);
    saveConfig();
  };
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

// ── Gruppen-Auswertung (Etappe 8) ──────────────────────
//  Liest beim Worker nur Summen je Gruppe, Thema und Woche (cloudflare/sync.js → sync_statistik).
const AW = { gruppe: '', wochen: 4, zeilen: null, fehler: '', laedt: false };
const AW_WENIG = 3;                                      // darunter: zu wenig Runden für eine Aussage
function awTitel(was) {
  const K = window.LernKatalog, t = K && K.geladen && K.geladen() ? K.thema(was) : null;
  if (t) return t.titel;
  const a = CONFIG.apps.find(x => resultKey(x.datei) === was);
  return a ? (a.emoji || '📱') + ' ' + a.name : was;
}
function buildAuswertung() {
  const box = document.getElementById('auswertung-inhalt');
  if (!box) return;
  const G = FR.gruppen || [];
  if (!G.length) {
    box.innerHTML = `<p style="font-size:.85rem;color:var(--text2);margin:0">${FR.gruppenFehler ? '⚠ Sync-Gruppen nicht geladen (' + frEsc(FR.gruppenFehler) + ').' : 'Noch keine Sync-Gruppen angelegt – die Auswertung braucht Sicherungskarten in einer Gruppe.'}</p>`;
    return;
  }
  if (!G.some(g => g.id === AW.gruppe)) AW.gruppe = G[0].id;
  const g = G.find(x => x.id === AW.gruppe);
  let tabelle = '';
  if (AW.laedt) tabelle = '<div class="empty-msg">Lade …</div>';
  else if (AW.fehler) tabelle = `<p style="color:var(--red);font-size:.85rem">⚠ ${frEsc(AW.fehler)}</p>`;
  else if (AW.zeilen) {
    const sum = {};
    AW.zeilen.forEach(z => { const x = sum[z.was] || (sum[z.was] = { was: z.was, runden: 0, aufgaben: 0, richtig: 0 }); x.runden += z.runden; x.aufgaben += z.aufgaben; x.richtig += z.richtig; });
    const liste = Object.values(sum).map(x => ({ ...x, pct: x.aufgaben ? Math.round(x.richtig / x.aufgaben * 100) : 0 }))
      .sort((a, b) => (a.runden < AW_WENIG) - (b.runden < AW_WENIG) || a.pct - b.pct);
    const farbe = p => p >= 80 ? 'var(--green)' : p >= 60 ? 'var(--accent)' : 'var(--red)';
    tabelle = liste.length ? `<table class="aw-tab"><thead><tr><th>Thema</th><th>Runden</th><th>Aufgaben</th><th colspan="2">richtig</th></tr></thead><tbody>
      ${liste.map(x => `<tr class="${x.runden < AW_WENIG ? 'aw-wenig' : ''}"><td>${frEsc(awTitel(x.was))}</td><td class="z">${x.runden}</td><td class="z">${x.aufgaben}</td>
        <td class="z"><b>${x.pct} %</b></td><td style="width:30%"><div class="aw-balken"><i style="width:${x.pct}%;background:${farbe(x.pct)}"></i></div></td></tr>`).join('')}
      </tbody></table><p style="font-size:.72rem;color:var(--muted);margin:.6rem 0 0">Blass = weniger als ${AW_WENIG} Runden, noch keine Aussage.</p>`
      : '<p style="font-size:.85rem;color:var(--text2);margin:.8rem 0 0">Für diesen Zeitraum hat die Gruppe noch nichts gemeldet.</p>';
  }
  box.innerHTML = `<div style="display:flex;gap:.6rem;flex-wrap:wrap;align-items:center">
      <select id="aw-gruppe" style="width:auto" aria-label="Gruppe">${G.map(x => `<option value="${frEsc(x.id)}"${x.id === AW.gruppe ? ' selected' : ''}>${frEsc(x.name)}</option>`).join('')}</select>
      <select id="aw-wochen" style="width:auto" aria-label="Zeitraum">${[[1, 'diese Woche'], [4, 'letzte 4 Wochen'], [8, 'letzte 8 Wochen'], [26, 'ganzes Halbjahr']].map(([w, t]) => `<option value="${w}"${w === AW.wochen ? ' selected' : ''}>${t}</option>`).join('')}</select>
      <button class="btn accent" id="aw-laden">📊 Auswertung laden</button></div>
    ${g && g.karten && g.karten < 5 ? `<p style="font-size:.75rem;color:var(--accent);margin:.6rem 0 0">Diese Gruppe hat nur ${g.karten} Karte${g.karten === 1 ? '' : 'n'} – die Zahlen lassen dann Rückschlüsse auf einzelne Kinder zu.</p>` : ''}
    ${tabelle}`;
  document.getElementById('aw-gruppe').onchange = e => { AW.gruppe = e.target.value; AW.zeilen = null; buildAuswertung(); };
  document.getElementById('aw-wochen').onchange = e => { AW.wochen = Number(e.target.value); AW.zeilen = null; buildAuswertung(); };
  document.getElementById('aw-laden').onclick = awLaden;
}
async function awLaden() {
  AW.laedt = true; AW.fehler = ''; buildAuswertung();
  try {
    const t = JSON.parse(localStorage.getItem('lernwelt-admin-schluessel') || 'null');
    const r = await fetch(ConfigAPI.WORKER_URL + '/sync/admin/statistik', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (t && t.token || '') },
      body: JSON.stringify({ gruppeId: AW.gruppe, wochen: AW.wochen }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(r.status === 404 ? 'Der Worker kennt die Auswertung noch nicht – bitte cloudflare/sync.js bei Cloudflare ersetzen' : (d.error || 'Fehler ' + r.status));
    AW.zeilen = Array.isArray(d.zeilen) ? d.zeilen : [];
  } catch (e) { AW.fehler = e.message || 'Worker nicht erreichbar'; AW.zeilen = null; }
  AW.laedt = false;
  buildAuswertung();
}

// ── Bedienung ──────────────────────────────────────────
document.addEventListener('click', e => {
  const t = e.target.closest('[data-fr-wer], [data-fr-stufe], [data-fr-akt]');
  if (!t || !t.closest('#panel-freigaben')) return;
  if (t.dataset.frWer) { FR.wer = t.dataset.frWer; FR.offen = ''; return buildFreigaben(); }
  if (t.dataset.frStufe) { FR.offen = FR.offen === t.dataset.frStufe ? '' : t.dataset.frStufe; return buildFreigaben(); }
  if (t.dataset.frAkt) frAktion(t.dataset.frAkt);
});
