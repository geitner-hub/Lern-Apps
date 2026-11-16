// ═══════════════════════════════════════════════════════
//  Lernwelt – pass-ansicht.js  (Aktionsplan „Lernwelt – Tempo“, Etappe 8: Startseite verschlanken, v133)
//
//  Das Pass-Fenster der Startseite (Profil, Garderobe, Truhen, Erfolge, Sicherung) und der QR-Scanner – bis v132
//  standen sie direkt in index.html. Jetzt lädt die Startseite diese Datei erst beim ersten Antippen von Pass oder
//  Scanner (index.html: passAnsicht()). Kein eigenes Modul-Objekt nötig: Die Datei ist ein normales Skript und
//  nutzt die Namen der Startseite (CONFIG, LernPass, buildPage, buildPassCard, buildKopf, ladeSync, fKl, KLASSEN,
//  ALTE_KARTE, lwBaseUrl, appUrl …). Nach außen: window.LernPassAnsicht = { openPass, closePass, renderPass,
//  openScanner, nachSync }.
//  Nur auf der Startseite laden. Liegt in sw.js START, damit der Pass auch offline aufgeht.
// ═══════════════════════════════════════════════════════
'use strict';

// ── Modal ──────────────────────────────────────────────
let passDraft = null, passLastFocus = null;

function openPass(mode) {
  passLastFocus = document.activeElement;
  const pr = LernPass.profile() || {};
  passDraft = { name: pr.name || '', klasse: pr.klasse || (/^\d+$/.test(fKl) ? Number(fKl) : null) };
  if (mode === 'klasse') passDraft.klasse = LernPass.suggestedClass();
  ward.tryOn = {};
  document.getElementById('pass-modal').classList.add('open');
  renderPass(mode);
  const box = document.querySelector('#pass-modal .lw-box');
  if (box) box.scrollTop = 0;
  document.body.classList.add('qr-open');
}
function closePass() {
  passModus = null;
  document.getElementById('pass-modal').classList.remove('open');
  wardStop();
  chestStop();
  ward.tryOn = {};
  document.body.classList.remove('qr-open');
  if (passLastFocus && passLastFocus.focus) passLastFocus.focus();
}

function profileForm() {
  return `
    <label class="lw-label" for="pf-name">Spitzname <span style="color:var(--muted);font-weight:700">(max. 16 Zeichen – bitte keinen Nachnamen)</span></label>
    <input class="lw-input" id="pf-name" maxlength="16" autocomplete="off" value="${escHtml(passDraft.name)}" placeholder="z. B. Lea oder Rechenblitz">
    <span class="lw-label">Deine Klasse</span>
    <div class="kl-row">${KLASSEN.map(k => `<button type="button" data-kl="${k}" class="${k === passDraft.klasse ? 'sel' : ''}">${k}</button>`).join('')}</div>`;
}

// Etappe 2: Garderobe, Truhen und Sicherung brauchen Module, die erst jetzt laden
let passModus = null;
function passModulFehlt(mode) {
  const P = LernPass;
  let tab = mode;
  if (P.hasProfile() && !['setup', 'edit', 'klasse'].includes(mode)) {
    const alias = { view: 'wardrobe', badges: 'erfolge' };
    tab = PASS_TABS.includes(alias[mode] || mode) ? (alias[mode] || mode) : 'wardrobe';
  }
  if (tab === 'wardrobe' && !window.LernAvatar) return LW.laden('gemeinsam/avatar3d.js');
  if (tab === 'chests' && (!window.LernAvatar || !window.LernChest))
    return LW.laden('gemeinsam/avatar3d.js').then(() => LW.laden('gemeinsam/chest3d.js'));
  if ((tab === 'sicherung' || tab === 'setup') && !window.LernSync) return ladeSync();
  return null;
}
function renderPass(mode) {
  const body = document.getElementById('pass-modal-body');
  const P = LernPass;
  passModus = mode;
  const fehlt = passModulFehlt(mode);
  if (fehlt) {
    wardStop(); chestStop();
    body.innerHTML = '<p class="lw-p" style="text-align:center;padding:2.5rem 0">⏳ Einen Moment …</p>';
    const weiter = () => { if (passModus === mode && document.getElementById('pass-modal').classList.contains('open')) renderPassJetzt(mode); };
    fehlt.then(weiter, weiter);          // offline ohne Modul: trotzdem anzeigen (ohne 3D)
    return;
  }
  renderPassJetzt(mode);
}
function renderPassJetzt(mode) {
  const body = document.getElementById('pass-modal-body');
  const P = LernPass;
  const isTabs = P.hasProfile() && !['setup', 'edit', 'klasse'].includes(mode);
  wardStop();
  chestStop();
  document.querySelector('#pass-modal .lw-box').classList.toggle('wide', isTabs);

  if (mode === 'klasse' && P.hasProfile()) {
    const alt = P.profile().klasse, neu = P.suggestedClass();
    body.innerHTML = `
      <div class="lw-h" id="pass-modal-title">🎒 Neues Schuljahr!</div>
      <p class="lw-p">Letztes Jahr warst du in Klasse ${alt}. ${neu !== alt ? `Bist du jetzt in Klasse ${neu}?` : `Bist du immer noch in Klasse ${alt}?`}
        Deine XP, Truhen und deine Figur bleiben natürlich erhalten.</p>
      <div class="lw-btns"><button type="button" class="lw-btn primary" id="kl-yes" data-kl-neu="${neu}">Ja, Klasse ${neu} 🚀</button></div>
      <div class="lw-sec">
        <span class="lw-label">Nein, ich bin in Klasse …</span>
        <div class="kl-row">${KLASSEN.map(k => `<button type="button" data-kl="${k}" class="${k === passDraft.klasse ? 'sel' : ''}">${k}</button>`).join('')}</div>
        <div class="lw-btns"><button type="button" class="lw-btn" id="kl-save">Speichern</button></div>
        <div class="lw-msg" id="kl-msg"></div>
      </div>`;
    return;
  }

  if (mode === 'setup' || mode === 'edit') {
    body.innerHTML = `
      <div class="lw-h" id="pass-modal-title">${mode === 'setup' ? '🧭 Dein Lernwelt-Pass' : '✏️ Pass bearbeiten'}</div>
      ${mode === 'setup' ? `<p class="lw-p">Mit jeder Übung sammelst du XP, steigst Level auf und verdienst Sterne und Truhen mit Teilen für deine Figur. Dein Aussehen gestaltest du gleich danach. Alles bleibt nur auf diesem Gerät gespeichert.</p>` : ''}
      ${profileForm()}
      <div class="lw-btns">
        <button type="button" class="lw-btn primary" id="pf-save">${mode === 'setup' ? 'Pass starten 🚀' : 'Speichern'}</button>
        ${mode === 'edit' ? '<button type="button" class="lw-btn" data-mode="wardrobe">Abbrechen</button>' : ''}
      </div>
      <div class="lw-msg" id="pf-msg"></div>
      ${mode === 'setup' ? syncSetupHTML() : ''}`;
    return;
  }

  const pr = P.profile(), lv = P.levelInfo();
  const ch = P.chestInfo(), syncWarn = karteUngueltig();
  // Reihenfolge: Garderobe · Truhen · Erfolge · Sicherung (alte Namen werden umgeleitet)
  const alias = { view: 'wardrobe', badges: 'erfolge' };
  const tab = PASS_TABS.includes(alias[mode] || mode) ? (alias[mode] || mode) : 'wardrobe';
  const head = `
    <div class="lw-hero">
      ${P.avatarHTML({ level: lv.level })}
      <div style="flex:1;min-width:0">
        <div class="name-row"><div class="lw-h" id="pass-modal-title">${escHtml(pr.name)}</div>
          <button type="button" class="lw-edit" data-mode="edit" title="Name und Klasse ändern" aria-label="Name und Klasse ändern">✏️</button></div>
        <div class="pass-title">Level ${lv.level} · ${escHtml(lv.title)}${pr.klasse ? ' · Klasse ' + pr.klasse : ''}</div>
        <div class="pass-bar"><div class="pass-fill" style="width:${lv.pct}%"></div></div>
        <div class="pass-sub">${lv.into} / ${lv.need} XP · noch ${lv.need - lv.into} XP bis „${escHtml(P.levelInfo(lv.to).title)}“</div>
      </div>
    </div>
    <div class="lese-zeile">${(l => `<button type="button" data-lese="g" aria-pressed="${l.g}" class="${l.g ? 'an' : ''}">🔎 Besser lesbar</button>
      <button type="button" data-lese="h" aria-pressed="${l.h}" class="${l.h ? 'an' : ''}">☀️ Helles Schema</button>`)(LW.lesehilfe())}</div>
    <div class="lw-tabs" role="tablist">
      <button type="button" role="tab" data-mode="wardrobe" class="${tab === 'wardrobe' ? 'on' : ''}"><i>👕</i><span>Garderobe</span></button>
      <button type="button" role="tab" data-mode="chests" class="${tab === 'chests' ? 'on' : ''}">${chestTabInner(ch.available)}</button>
      <button type="button" role="tab" data-mode="erfolge" class="${tab === 'erfolge' ? 'on' : ''}"><i>🏆</i><span>Erfolge</span></button>
      <button type="button" role="tab" data-mode="sicherung" class="${tab === 'sicherung' ? 'on' : ''}"><i>💾</i><span>Sicherung</span>${syncWarn ? '<span class="dot warn">!</span>' : ''}</button>
    </div>`;
  body.innerHTML = head + ({ wardrobe: passViewWardrobe, chests: passViewChests, erfolge: passViewErfolge, sicherung: passViewSicherung })[tab]();
  if (tab === 'wardrobe') wardStart();
  if (tab === 'chests') chestStart();
}
const PASS_TABS = ['wardrobe', 'chests', 'erfolge', 'sicherung'];
function chestTabInner(n) { return `<i>🎁</i><span>Truhen</span>${n ? `<span class="dot">${n}</span>` : ''}`; }

// ── Erfolge ────────────────────────────────────────────
function passViewErfolge() {
  const P = LernPass, wk = P.weekInfo(), ss = P.starsSummary();
  const past = P.seasonsOn() ? P.pastSeasons() : [];
  const list = P.BADGES.map(b => {
    const pr = P.badgeProgress(b);
    return { b, pr, has: P.state.badges.includes(b.id), pct: pr.n ? Math.min(100, Math.round((pr.cur / pr.n) * 100)) : 0 };
  });
  const offen = list.filter(x => !x.has).sort((a, b) => b.pct - a.pct);
  const fast = offen.filter(x => x.pct >= 50 && x.pct < 100).slice(0, 4);
  const rest = offen.filter(x => !fast.includes(x));
  const got = list.filter(x => x.has);
  const grid = (arr, near) => `<div class="badge-grid">${arr.map(x => badgeTileHTML(x, near)).join('')}</div>`;
  return `
    <p style="text-align:center;margin:.5rem 0 0"><a href="apps/typen/kann-liste.html" style="color:#e6a817;font-weight:900;text-decoration:none">🎯 Das kann ich – meine Kann-Liste ›</a></p>
    <div class="lw-sec" style="border-top:none;padding-top:.6rem;margin-top:.4rem">
      <div class="lw-grid">
        <div class="lw-tile"><div class="v">${wk.goodDays}/${wk.goal}</div><div class="l">Tage diese Woche</div></div>
        <div class="lw-tile"><div class="v">🔥 ${wk.streak}</div><div class="l">Wochen-Serie</div></div>
        <div class="lw-tile"><div class="v">${ss[3]}·${ss[2]}·${ss[1]}</div><div class="l">🥇 🥈 🥉</div></div>
        <div class="lw-tile"><div class="v">${P.state.xp}</div><div class="l">XP gesamt</div></div>
      </div>
    </div>
    ${past.length ? `<div class="lw-sec"><h3>🏛 Vergangene Schuljahre</h3><div class="season-list">${past.map(p =>
        `<div class="season-row">📜 <span>Schuljahr ${escHtml(p.id)}</span><span style="margin-left:auto">Level ${p.level} · <b>${escHtml(p.title)}</b></span></div>`).join('')}</div></div>` : ''}
    <div class="lw-sec" style="padding-top:.2rem">
      ${fast.length ? `<div class="erf-h"><h3>🎯 Fast geschafft</h3></div>${grid(fast, true)}` : ''}
      ${rest.length ? `<div class="erf-h"><h3>🔒 Noch offen</h3><span>${rest.length}</span></div>${grid(rest, false)}` : ''}
      ${got.length ? `<div class="erf-h"><h3>✅ Geschafft</h3><span>${got.length} von ${list.length}</span></div>${grid(got, false)}` : ''}
    </div>`;
}
function badgeTileHTML({ b, pr, has, pct }, near) {
  const P = LernPass;
  const reward = P.ITEMS.filter(i => i.quelle === 'set' && i.set === b.id);
  return `<div class="badge-tile${has ? ' got' : ''}${near ? ' near' : ''}"><span class="bi">${escHtml(b.icon)}</span><div style="min-width:0;flex:1">
    <div class="bn">${escHtml(b.name)}</div><div class="bt">${escHtml(b.text)}</div>
    ${has ? '' : `<div class="bp"><i style="width:${pct}%"></i></div><div class="bp-txt">${pr.cur} / ${pr.n}</div>`}
    ${reward.length ? `<div class="rw">${reward.slice(0, 2).map(r => P.itemPreviewHTML(r)).join('')}<span>🎁 ${reward.map(r => escHtml(r.name)).join(', ')}</span></div>` : ''}
  </div></div>`;
}

// ── Sicherung ──────────────────────────────────────────
//  Mit Sicherungskarte (LernSync, gemeinsam/sync.js) sichert der Pass automatisch.
//  Der alte Sicherungs-QR / Code (LW1–LW3) wurde entfernt.
function syncInfo() { return window.LernSync ? LernSync.status() : null; }
/** Speicher fast voll? Dann warnt die Sicherung (Etappe 2; Messung aus der täglichen Speicher-Wartung) */
function speicherWarnungHTML() {
  let w = null;
  try { w = JSON.parse(localStorage.getItem('lernwelt-wartung') || 'null'); } catch (e) {}
  const knapp = (w && w.knapp) || (window.LW && LW.speicher && LW.speicher.voll());
  if (!knapp) return '';
  return `<div class="backup-state warn" style="margin-bottom:.8rem"><span class="ic">⚠️</span><div><b>Der Speicher auf diesem iPad ist fast voll</b>
    <span>Dein Pass kann vielleicht nicht mehr gespeichert werden. Sag bitte deiner Lehrkraft Bescheid.</span></div></div>`;
}
function karteUngueltig() { const s = syncInfo(); return !!(s && s.verbunden && s.ungueltig); }
function syncWann(ts) {
  if (!ts) return '';
  const min = Math.round((Date.now() - ts) / 60000);
  if (min < 1) return 'gerade eben';
  if (min < 60) return `vor ${min} Min.`;
  const d = new Date(ts);
  const tage = Math.round((new Date(new Date().toDateString()) - new Date(d.toDateString())) / 864e5);
  const uhr = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  return tage === 0 ? `heute, ${uhr} Uhr` : tage === 1 ? `gestern, ${uhr} Uhr` : `vor ${tage} Tagen`;
}
function backupStateHTML() {
  const s = syncInfo();
  if (s && s.verbunden) {
    let cls = 'ok', ic = '✅', txt = 'Automatisch gesichert', sub = s.letzteSicherung ? syncWann(s.letzteSicherung) + ' · mit deiner Sicherungskarte' : 'mit deiner Sicherungskarte';
    if (s.ungueltig) { cls = 'warn'; ic = '⚠️'; txt = 'Deine Sicherungskarte gilt nicht mehr'; sub = 'Frag deine Lehrkraft nach einer neuen Karte und scanne sie.'; }
    else if (s.ausstehend) {
      cls = s.offline ? 'warn' : ''; ic = '⏳';
      txt = s.offline ? 'Wird gesichert, sobald Internet da ist' : 'Wird gleich gesichert …';
      sub = s.letzteSicherung ? 'Letzte Sicherung: ' + syncWann(s.letzteSicherung) : 'Die erste Sicherung folgt gleich.';
    }
    if (s.fehler && !s.ungueltig) sub += ' · ' + s.fehler;
    return `<div class="backup-state ${cls}" id="backup-state"><span class="ic">${ic}</span><div><b>${escHtml(txt)}</b><span>${escHtml(sub)}</span></div></div>`;
  }
  return '';
}

// Karte scannen oder Code eintippen (Sicherung und Einrichten)
function syncVerbindenHTML() {
  return `
    <div class="lw-btns">
      <button type="button" class="lw-btn primary" id="sync-scan">📷 Karte scannen</button>
    </div>
    <details class="lw-details" style="margin-top:.5rem"><summary>Code von der Karte eintippen</summary>
      <input class="lw-input" id="sync-eingabe" maxlength="20" autocomplete="off" autocapitalize="characters" spellcheck="false"
             placeholder="z. B. K7QM-3HXP-9RT4" style="margin-top:.6rem;font-family:ui-monospace,Menlo,monospace;letter-spacing:.08em;text-transform:uppercase">
      <div class="lw-btns"><button type="button" class="lw-btn" id="sync-ok">Verbinden</button></div>
      <div class="lw-msg" id="sync-eingabe-msg"></div>
    </details>`;
}

// Versionsanzeige (Infrastruktur Etappe 0): welcher Stand läuft auf diesem iPad?
function versionZeile() {
  const v = (window.LW && LW.versionText) ? LW.versionText() : '';
  return v ? `<p class="lw-p" id="lw-version" style="margin-top:.8rem;color:var(--muted);font-size:.7rem;text-align:center;user-select:none">Lernwelt ${escHtml(v)}</p><div id="lw-diagnose"></div>` : '';
}
// Versteckte Diagnose (Etappe 2): fünfmal schnell auf die Versionszeile tippen
let diagTaps = [];
document.addEventListener('click', e => {
  if (!e.target.closest || !e.target.closest('#lw-version')) return;
  const jetzt = Date.now();
  diagTaps = diagTaps.filter(t => jetzt - t < 3000).concat(jetzt);
  if (diagTaps.length < 5) return;
  diagTaps = [];
  LernPass.extras().then(E => E.diagnose(document.getElementById('lw-diagnose'))).catch(() => {});
});

function passViewSicherung() {
  const s = syncInfo();
  if (s && s.verbunden && !s.ungueltig) {
    return `
    <div class="backup-wrap">
      ${speicherWarnungHTML()}
      ${backupStateHTML()}
      <p class="lw-p" style="margin-top:.9rem">Dein Pass ist mit deiner Sicherungskarte verbunden. Alles, was du übst, wird automatisch gesichert – auch dein Dorf. Auf einem anderen iPad scannst du einfach deine Karte, dann ist alles wieder da.</p>
      <div class="lw-btns">
        <button type="button" class="lw-btn primary" id="sync-jetzt">🔄 Jetzt sichern</button>
        <a class="lw-btn" href="sync-karte.html" style="text-decoration:none">🖨 Meine Karte drucken</a>
      </div>
      <div class="lw-msg" id="sync-msg"></div>
      ${versionZeile()}
    </div>`;
  }
  return `
    <div class="backup-wrap">
      ${speicherWarnungHTML()}
      ${s && s.ungueltig ? backupStateHTML() : ''}
      <div class="lw-sec" style="border-top:none;padding-top:.2rem">
        <h3>💳 Hast du eine Sicherungskarte?</h3>
        <p class="lw-p">Verbinde deinen Pass mit deiner Karte. Danach wird alles automatisch gesichert – du musst nichts mehr tun.</p>
        ${syncVerbindenHTML()}
        <p class="lw-p" style="margin-top:.6rem;color:var(--muted);font-size:.78rem">Noch keine Karte? Frag deine Lehrkraft.</p>
      </div>
      <p class="lw-p" style="margin-top:.4rem;color:var(--muted);font-size:.74rem">Tipp: Öffne die Lernwelt über das Symbol auf dem Home-Bildschirm – dort ist dein Pass am besten aufgehoben.</p>
      ${versionZeile()}
    </div>`;
}

// Einrichten: „Ich habe eine Sicherungskarte“
function syncSetupHTML() {
  const s = syncInfo();
  if (!s) return '';
  if (s.verbunden && !s.ungueltig) {
    return `<div class="backup-state ok" style="margin-top:1rem"><span class="ic">💳</span><div><b>Sicherungskarte verbunden</b><span>Richte jetzt deinen Pass ein – ab dann wird er automatisch gesichert.</span></div></div>`;
  }
  return `<div class="lw-sec"><details class="lw-details"><summary>Ich habe eine Sicherungskarte</summary>
    <p class="lw-p" style="margin-top:.6rem">Scanne deine Karte. Ist darauf schon ein Pass gesichert, wird er geladen.</p>${syncVerbindenHTML()}</details></div>`;
}

document.addEventListener('click', e => {
  const t = e.target.closest('#sync-scan, #sync-ok, #sync-jetzt');
  if (!t || !window.LernSync) return;
  if (t.id === 'sync-scan') { closePass(); openScanner(); return; }
  if (t.id === 'sync-ok') {
    const v = document.getElementById('sync-eingabe').value;
    if (!LernSyncCode.ausText(v)) {
      const m = document.getElementById('sync-eingabe-msg');
      m.className = 'lw-msg err'; m.textContent = 'Dieser Code stimmt nicht. Prüfe jedes Zeichen (0 und O sind gleich).';
      return;
    }
    closePass(); LernSync.verbinden(v); return;
  }
  if (t.id === 'sync-jetzt') {
    const m = document.getElementById('sync-msg');
    m.className = 'lw-msg'; m.textContent = 'Sichere …';
    LernSync.jetztSichern().then(() => {
      const s = LernSync.status();
      m.className = 'lw-msg' + (s.ausstehend ? '' : ' ok');
      m.textContent = !s.ausstehend ? '✓ Gesichert' : s.offline ? 'Kein Internet – wird später gesichert.' : 'Wird gleich gesichert …';
    });
  }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target && e.target.id === 'sync-eingabe') document.getElementById('sync-ok').click();
});
window.addEventListener('lernsync:status', e => {
  const el = document.getElementById('backup-state');
  if (el && el.closest('.backup-wrap')) el.outerHTML = backupStateHTML();
  // „!“ am Reiter Sicherung nur, solange die Karte ungültig ist
  const tab = document.querySelector('.lw-tabs [data-mode="sicherung"]');
  if (tab) {
    const d = tab.querySelector('.dot'), warn = karteUngueltig();
    if (warn && !d) tab.insertAdjacentHTML('beforeend', '<span class="dot warn">!</span>');
    if (!warn && d) d.remove();
  }
});

// ── Truhen ─────────────────────────────────────────────
//  Die Truhe wird dreimal angeklopft (Glühen wird stärker, verrät aber nichts),
//  beim dritten Mal wird das Teil sofort gezogen und gespeichert – erst dann
//  läuft die Animation. Antippen während der Animation überspringt sie.
const chest = { ctrl: null, taps: 0, opening: false, revealed: false, kind: null, variante: 'normal' };

function chestVariante(kind) {
  if (kind === 'level') return 'level';
  const ev = window.LernChest ? LernPass.activeEvents().find(e => LernChest.SKINS[e.id]) : null;
  return ev ? ev.id : 'normal';
}
function chestLabel(kind, variante) {
  if (kind === 'level') return '⭐ Level-Truhe';
  const ev = LernPass.EVENTS.find(e => e.id === variante);
  return ev ? `${ev.icon} ${ev.name}-Truhe` : '🎁 Truhe';
}
function passViewChests() {
  const P = LernPass, ch = P.chestInfo(), lv = P.levelInfo();
  const kind = ch.next, variante = chestVariante(kind);
  chest.kind = kind; chest.variante = variante;
  const ev = P.activeEvents();
  return `
    <div class="chest-wrap">
      <div class="chest-stage3d${kind ? '' : ' leer'}" id="chest-stage" tabindex="0" role="button"
           aria-label="${kind ? 'Truhe: dreimal antippen zum Öffnen' : 'Keine Truhe bereit'}">
        <div class="chest-canvas" id="chest-canvas"></div>
        <div class="chest-top">
          <span class="chest-kind${kind === 'level' ? ' level' : ''}">${kind ? escHtml(chestLabel(kind, variante)) : '📦 Keine Truhe bereit'}</span>
          ${ch.available > 1 ? `<span class="chest-num" id="chest-num">×${ch.available}</span>` : ''}
        </div>
        <div class="chest-hint" id="chest-hint">${kind
          ? `<span class="knock-dots" id="knock-dots"><i></i><i></i><i></i></span><span>Tippe 3× auf die Truhe!</span>`
          : `<span>Nächste Truhe bei ${ch.nextAt} XP</span>`}</div>
      </div>
      <div class="chest-reveal" id="chest-reveal" hidden></div>
    </div>
    ${ev.length ? `<div style="margin-top:.6rem">${eventStripHTML()}</div>` : ''}
    <div class="lw-sec chest-info">
      <div class="row"><div class="pass-sub">🎁 Nächste Truhe bei ${ch.nextAt} XP</div><div class="pass-sub">noch ${ch.nextAt - P.state.xp} XP</div></div>
      <div class="pass-bar"><div class="pass-fill" style="width:${ch.progress}%"></div></div>
      <div class="row" style="margin-top:.6rem"><div class="pass-sub">⭐ Level-Truhe bei Level ${lv.level + 1}</div><div class="pass-sub">noch ${lv.need - lv.into} XP</div></div>
      <div class="pass-bar"><div class="pass-fill" style="width:${lv.pct}%;background:linear-gradient(90deg,#6366f1,#a78bfa)"></div></div>
      <div class="pass-sub" style="margin-top:.6rem">Geöffnet: ${ch.opened} · Teile gesammelt: ${P.ownedCount()} / ${P.ITEMS.length}${P.state.dust ? ` · ✨ Sternenstaub: ${P.state.dust}` : ''}</div>
    </div>`;
}
function chestStart() {
  const host = document.getElementById('chest-canvas');
  if (!host || !window.LernChest) return;
  chest.taps = 0; chest.opening = false; chest.revealed = false;
  chest.ctrl = LernChest.mount(host, {
    variante: chest.variante, leer: !chest.kind, onTap: chestTap,
    onBurst: st => { if (st >= 3) LernPass.celebrate('feuerwerk'); else if (st >= 2) LernPass.celebrate('konfetti'); },
  });
}
function chestStop() {
  if (chest.ctrl) { chest.ctrl.destroy(); chest.ctrl = null; }
  chest.taps = 0; chest.opening = false; chest.revealed = false;
}
function chestTap() {
  if (!chest.ctrl) return;
  if (chest.opening) { chest.ctrl.skip(); return; }
  if (chest.revealed) return;
  if (!chest.kind || LernPass.chestInfo().available <= 0) { chest.ctrl.knock(0); return; }
  chest.taps = Math.min(3, chest.taps + 1);
  chest.ctrl.knock(chest.taps);
  document.querySelectorAll('#knock-dots i').forEach((d, i) => d.classList.toggle('on', i < chest.taps));
  if (chest.taps >= 3) chestOpen();
}
function chestOpen() {
  const P = LernPass;
  const res = P.openChest(chest.kind);
  if (!res || !res.ok) { renderPass('chests'); return; }
  chest.opening = true;
  buildPassCard();
  chestUpdateDot();
  const hint = document.getElementById('chest-hint');
  if (hint) { hint.innerHTML = '<span>Tippen zum Überspringen</span>'; setTimeout(() => hint.classList.add('off'), 900); }
  const it = res.item;
  const rar = it ? (P.RARITY[it.selten] || { farbe: '#94a3b8' }) : { farbe: '#a5b4fc' };
  const stufe = it ? ({ gewoehnlich: 0, selten: 1, episch: 2, legendaer: 3, event: 3 }[it.selten] || 0) : 1;
  chest.ctrl.open({
    farbe: rar.farbe, stufe, staub: !it,
    itemId: it && it.slot !== 'hintergrund' ? it.id : null,
    bgCss: it && it.slot === 'hintergrund' ? (it.css || '') : undefined,
  }).then(() => {
    if (!chest.ctrl) return;
    chest.opening = false; chest.revealed = true;
    chestShowReveal(res);
  });
}
function chestUpdateDot() {
  const ch = LernPass.chestInfo();
  const btn = document.querySelector('.lw-tabs [data-mode="chests"]');
  if (btn) btn.innerHTML = chestTabInner(ch.available);
  const num = document.getElementById('chest-num');
  if (num) num.hidden = true;
}
function chestShowReveal(res) {
  const P = LernPass, el = document.getElementById('chest-reveal');
  if (!el) return;
  const left = P.chestInfo().available;
  const next = left ? `<button type="button" class="lw-btn${res.item ? '' : ' primary'}" id="chest-next">🎁 Nächste Truhe (noch ${left})</button>` : '';
  if (res.item) {
    const rar = P.RARITY[res.item.selten] || { name: '', farbe: '#94a3b8' };
    el.style.borderColor = rar.farbe; el.style.background = rar.farbe + '14';
    el.innerHTML = `
      <div class="rv-rar" style="color:${rar.farbe}">${escHtml(rar.name)}${res.event ? ' · ' + escHtml(res.event.icon + ' ' + res.event.name) : ''}${res.kind === 'level' ? ' · ⭐ Level-Truhe' : ''}</div>
      <div class="rv-name">${escHtml(res.item.name)}</div>
      <div class="pass-sub">${escHtml((P.SLOTS[res.item.slot] || {}).name || '')}</div>
      <div class="lw-btns"><button type="button" class="lw-btn primary" data-equip="${escHtml(res.item.id)}">👕 Gleich anziehen</button>${next}</div>`;
  } else {
    el.style.borderColor = '#a5b4fc'; el.style.background = '#a5b4fc14';
    el.innerHTML = `<div class="rv-name">✨ Sternenstaub</div>
      <div class="lw-p">Du hast schon alle Teile aus den Truhen! Dafür gibt es Sternenstaub.</div>
      ${next ? `<div class="lw-btns">${next}</div>` : ''}`;
  }
  el.hidden = false;
  if (el.scrollIntoView && window.innerHeight < 800) el.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'nearest' });
}
function reduceMotion() { return !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); }

// ── Garderobe ──────────────────────────────────────────
const ward = { cat: 'oberteil', tryOn: {}, ctrl: null, cheerOnReady: false };
const WARD_CATS = ['figur', 'kopf', 'gesicht', 'oberteil', 'hose', 'schuhe', 'ruecken', 'hand', 'begleiter', 'hintergrund'];

function wardLook() { return LernPass.look(ward.tryOn); }
function wardBg() {
  const P = LernPass, id = ward.tryOn.hintergrund || P.state.equipped.hintergrund || (P.AVATAR.START || {}).hintergrund;
  return P.ITEM_BY_ID[id] || null;
}
function passViewWardrobe() {
  const bg = wardBg();
  return `
    <div class="ward">
      <div class="ward-stage" id="ward-stage" style="background:${escHtml(bg ? bg.css : '#1b1929')}">
        <div class="ward-deko" id="ward-deko">${bg && bg.deko ? bg.deko : ''}</div>
        <div class="ward-canvas" id="ward-canvas"></div>
        <div class="ward-try" id="ward-try" hidden></div>
        <div class="ward-hint" id="ward-hint">↔ Zum Drehen wischen</div>
        <button type="button" class="lw-btn primary ward-cheer" id="ward-cheer">🎉 Jubeln</button>
      </div>
      <div id="ward-side">${wardSideHTML()}</div>
    </div>`;
}
function wardSideHTML() {
  const P = LernPass, lk = wardLook();
  const tile = c => {
    if (c === 'figur') return `<button type="button" class="cat-tile${ward.cat === c ? ' on' : ''}" data-cat="figur">
      <span class="it-prev it-3d" data-avatar-figur="frisur:${escHtml(lk.frisur || '')}"></span><span class="cn">Figur</span><span class="cc">frei</span></button>`;
    const all = P.ITEMS.filter(i => i.slot === c), own = all.filter(i => P.owns(i.id)).length;
    const cur = P.ITEM_BY_ID[lk.eq[c]];
    const info = P.SLOTS[c] || { name: c, icon: '❔' };
    return `<button type="button" class="cat-tile${ward.cat === c ? ' on' : ''}" data-cat="${c}">
      ${cur ? P.itemPreviewHTML(cur) : `<span class="ci">${escHtml(info.icon)}</span>`}
      <span class="cn">${escHtml(info.name)}</span><span class="cc">${own}/${all.length}</span></button>`;
  };
  return `<div class="ward-cats">${WARD_CATS.map(tile).join('')}</div><div class="ward-list">${ward.cat === 'figur' ? wardFigurHTML(lk) : wardItemsHTML(ward.cat)}</div>`;
}
function wardFigurHTML(lk) {
  const A = LernPass.AVATAR;
  const sw = (key, list) => `<div class="sw-row">${list.map((c, i) =>
    `<button type="button" class="${lk[key] === i ? 'on' : ''}" data-look="${key}:${i}" style="background:${escHtml(c)}" aria-label="Farbe ${i + 1}"></button>`).join('')}</div>`;
  const opts = (key, list) => `<div class="item-grid">${list.map(o =>
    `<button type="button" class="item-tile${lk[key] === o.id ? ' on' : ''}" data-look="${key}:${escHtml(o.id)}">
      <span class="it-prev it-3d" data-avatar-figur="${key}:${escHtml(o.id)}"></span><span class="nm">${escHtml(o.name)}</span></button>`).join('')}</div>`;
  return `<p class="lw-p">Deine Figur kannst du jederzeit frei ändern.</p>
    <div class="slot-title">Hautton</div>${sw('haut', A.HAUT || [])}
    <div class="slot-title">Frisur</div>${opts('frisur', A.FRISUREN || [])}
    <div class="slot-title">Haarfarbe</div>${sw('haarfarbe', A.HAARFARBEN || [])}
    <div class="slot-title">Augen</div>${opts('augen', A.AUGEN || [])}
    <div class="slot-title">Mund</div>${opts('mund', A.MUENDER || [])}`;
}
function wardItemsHTML(slot) {
  const P = LernPass, lk = wardLook();
  const order = { start: 0, truhe: 1, set: 2, event: 3 };
  const items = P.ITEMS.filter(i => i.slot === slot)
    .sort((a, b) => (P.owns(b.id) - P.owns(a.id)) || (order[a.quelle] - order[b.quelle]));
  const own = items.filter(i => P.owns(i.id)).length;
  return `<p class="lw-p">${own} von ${items.length} gesammelt. Tippe ein Teil an, um es anzuziehen, nochmal tippen legt es ab. Teile mit 🔒 kannst du anprobieren.</p>
    <div class="item-grid">${items.map(it => {
      const owns = P.owns(it.id), on = owns && P.state.equipped[slot] === it.id, trying = !owns && lk.eq[slot] === it.id;
      const rar = P.RARITY[it.selten] || {};
      return `<button type="button" class="item-tile${owns ? '' : ' locked'}${on ? ' on' : ''}${trying ? ' trying' : ''}" ${owns ? 'data-equip' : 'data-try'}="${escHtml(it.id)}" title="${escHtml(it.name)}">
        ${P.itemPreviewHTML(it)}<span class="nm">${owns ? '' : '🔒 '}${escHtml(it.name)}</span>
        <span class="src" style="color:${owns ? escHtml(rar.farbe || '') : ''}">${on ? '✓ angezogen' : trying ? 'Anprobe' : owns ? escHtml(rar.name || '') : escHtml(P.itemSourceText(it))}</span></button>`;
    }).join('')}</div>`;
}
function wardStart() {
  const host = document.getElementById('ward-canvas');
  if (!host || !window.LernAvatar) return;
  const bg = wardBg();
  ward.ctrl = LernAvatar.mount(host, {
    look: wardLook(), boden: bg && bg.boden,
    onReady: () => { if (ward.cheerOnReady) { ward.cheerOnReady = false; setTimeout(() => ward.ctrl && ward.ctrl.cheer(), 300); } },
  });
  wardTryBanner();
}
function wardStop() { if (ward.ctrl) { ward.ctrl.destroy(); ward.ctrl = null; } }
function wardTryBanner() {
  const el = document.getElementById('ward-try'); if (!el) return;
  const names = Object.values(ward.tryOn).filter(Boolean).map(id => LernPass.ITEM_BY_ID[id]).filter(Boolean).map(i => i.name);
  el.hidden = !names.length;
  el.innerHTML = names.length ? `<span>👀 Anprobe: ${escHtml(names.length === 1 ? names[0] : names.length + ' Teile')} noch gesperrt</span><button type="button" id="ward-try-off">Ausziehen</button>` : '';
}
function wardUpdate() {
  if (ward.ctrl) ward.ctrl.setLook(wardLook());
  const bg = wardBg(), st = document.getElementById('ward-stage');
  if (st && bg) { st.style.background = bg.css; document.getElementById('ward-deko').innerHTML = bg.deko || ''; if (ward.ctrl) ward.ctrl.setBoden(bg.boden); }
  wardTryBanner();
  const side = document.getElementById('ward-side');
  if (side) { const y = side.scrollTop; side.innerHTML = wardSideHTML(); side.scrollTop = y; }
}

// Ereignisse im Modal
document.getElementById('pass-modal').addEventListener('click', async e => {
  const t = e.target;
  if (t.id === 'pass-modal' || t.closest('[data-close-pass]')) { closePass(); return; }
  const cat = t.closest('[data-cat]');
  if (cat && !t.closest('[data-mode]')) { ward.cat = cat.dataset.cat; wardUpdate(); return; }
  const lookBtn = t.closest('[data-look]');
  if (lookBtn) {
    const [k, v] = lookBtn.dataset.look.split(':');
    LernPass.setLook({ [k]: (k === 'haut' || k === 'haarfarbe') ? Number(v) : v });
    wardUpdate(); buildPassCard(); return;
  }
  const tr = t.closest('[data-try]');
  if (tr) {
    const it = LernPass.ITEM_BY_ID[tr.dataset.try];
    if (it) { if (ward.tryOn[it.slot] === it.id) delete ward.tryOn[it.slot]; else ward.tryOn[it.slot] = it.id; wardUpdate(); }
    return;
  }
  if (t.id === 'ward-try-off') { ward.tryOn = {}; wardUpdate(); return; }
  if (t.id === 'ward-cheer') { if (ward.ctrl) ward.ctrl.cheer(); return; }
  const kl = t.closest('[data-kl]');
  if (kl) {
    passDraft.klasse = Number(kl.dataset.kl);
    document.querySelectorAll('.kl-row button').forEach(b => b.classList.toggle('sel', b === kl));
    return;
  }
  const md = t.closest('[data-mode]');
  if (md) { if (md.dataset.cat) ward.cat = md.dataset.cat; if (md.dataset.mode === 'wardrobe') ward.tryOn = {}; renderPass(md.dataset.mode); return; }
  const eq = t.closest('[data-equip]');
  if (eq) {
    const it = LernPass.ITEM_BY_ID[eq.dataset.equip];
    if (!it) return;
    delete ward.tryOn[it.slot];
    if (document.getElementById('ward-stage')) { LernPass.equip(it.slot, it.id); buildPassCard(); wardUpdate(); if (LernPass.state.equipped[it.slot] === it.id && ward.ctrl) ward.ctrl.cheer(); }
    else { if (LernPass.state.equipped[it.slot] !== it.id) LernPass.equip(it.slot, it.id); buildPassCard(); ward.cat = it.slot; ward.cheerOnReady = true; renderPass('wardrobe'); }
    return;
  }
  if (t.id === 'chest-next') { renderPass('chests'); return; }
  if (t.id === 'kl-yes' || t.id === 'kl-save') {
    const k = t.id === 'kl-yes' ? Number(t.dataset.klNeu) : passDraft.klasse;
    if (!k) { const m = document.getElementById('kl-msg'); m.className = 'lw-msg err'; m.textContent = 'Bitte wähle deine Klasse.'; return; }
    LernPass.confirmClass(k);
    buildPage();
    renderPass('wardrobe');
    LernPass.showAvatar({ text: `Auf geht's in Klasse ${k}! 🎒`, big: true, aktion: 'jubeln' });
    return;
  }
  if (t.id === 'pf-save') {
    const name = document.getElementById('pf-name').value.trim();
    const msg = document.getElementById('pf-msg');
    if (!name) { msg.className = 'lw-msg err'; msg.textContent = 'Bitte gib einen Spitznamen ein.'; return; }
    if (!passDraft.klasse) { msg.className = 'lw-msg err'; msg.textContent = 'Bitte wähle deine Klasse.'; return; }
    const isNew = !LernPass.hasProfile();
    LernPass.setProfile({ name, klasse: passDraft.klasse });
    LernPass.markLevelSeen();
    buildPage();
    if (isNew) ward.cat = 'figur';
    renderPass('wardrobe');
    return;
  }
});
document.addEventListener('avatar:gedreht', () => { const h = document.getElementById('ward-hint'); if (h) h.hidden = true; });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && document.getElementById('pass-modal').classList.contains('open')) closePass();
  if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.id === 'chest-stage') { e.preventDefault(); chestTap(); }
});

// ── QR-Scanner (öffnet Apps innerhalb der Lernwelt-App) ─
const scan = { stream: null, timer: 0, lib: null, busy: false };
function loadJsQR() {
  if (window.jsQR) return Promise.resolve(window.jsQR);
  if (scan.lib) return scan.lib;
  scan.lib = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'vendor/jsQR.min.js';
    s.onload = () => (window.jsQR ? res(window.jsQR) : rej(new Error('jsQR')));
    s.onerror = () => { scan.lib = null; rej(new Error('jsQR')); };
    document.head.appendChild(s);
  });
  return scan.lib;
}
function scanMsg(text, cls) { const m = document.getElementById('scan-msg'); m.className = 'lw-msg' + (cls ? ' ' + cls : ''); m.textContent = text; }
function scanButtons(html) { document.getElementById('scan-btns').innerHTML = html || ''; }
async function openScanner() {
  document.getElementById('scan-modal').classList.add('open');
  document.body.classList.add('qr-open');
  document.getElementById('scan-view').classList.remove('hit');
  scanButtons('');
  scanMsg('Kamera wird gestartet …');
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { scanMsg('Dieses Gerät erlaubt hier keinen Kamerazugriff.', 'err'); return; }
  try {
    const [stream] = await Promise.all([
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }),
      loadJsQR(),
    ]);
    if (!document.getElementById('scan-modal').classList.contains('open')) { stream.getTracks().forEach(t => t.stop()); return; }
    scan.stream = stream;
    const v = document.getElementById('scan-video');
    v.srcObject = stream;
    await v.play().catch(() => {});
    scanMsg('Halte den QR-Code in den Rahmen.');
    scanLoop();
  } catch (e) {
    const denied = e && (e.name === 'NotAllowedError' || e.name === 'SecurityError');
    scanMsg(denied ? 'Die Kamera ist nicht erlaubt. Frag deine Lehrkraft oder erlaube die Kamera in den Einstellungen.'
                   : e && e.message === 'jsQR' ? 'Der Scanner konnte nicht geladen werden. Bitte mit Internet erneut versuchen.'
                   : 'Keine Kamera gefunden.', 'err');
  }
}
function scanLoop() {
  const v = document.getElementById('scan-video');
  const c = scanLoop.c || (scanLoop.c = document.createElement('canvas'));
  const ctx = c.getContext('2d', { willReadFrequently: true });
  clearInterval(scan.timer);
  scan.timer = setInterval(() => {
    if (!v.videoWidth || scan.busy) return;
    const k = Math.min(1, 640 / Math.max(v.videoWidth, v.videoHeight));
    c.width = Math.round(v.videoWidth * k); c.height = Math.round(v.videoHeight * k);
    ctx.drawImage(v, 0, 0, c.width, c.height);
    const img = ctx.getImageData(0, 0, c.width, c.height);
    const hit = window.jsQR(img.data, c.width, c.height, { inversionAttempts: 'attemptBoth' });
    if (hit && hit.data) { scan.busy = true; document.getElementById('scan-view').classList.add('hit'); stopCamera(); handleScan(hit.data.trim()); }
  }, 180);
}
function stopCamera() {
  clearInterval(scan.timer);
  if (scan.stream) { scan.stream.getTracks().forEach(t => t.stop()); scan.stream = null; }
  const v = document.getElementById('scan-video'); if (v) v.srcObject = null;
}
function closeScanner() {
  stopCamera(); scan.busy = false;
  document.getElementById('scan-modal').classList.remove('open');
  document.body.classList.remove('qr-open');
}
/** Was steckt im Code? Nur Lernwelt-Inhalte werden geöffnet. */
function handleScan(text) {
  const again = '<button type="button" class="lw-btn" id="scan-again">Nochmal scannen</button>';
  if (/^LW\d\./.test(text)) { scanMsg(ALTE_KARTE.replace('\n\n', ' '), 'err'); scanButtons(again); return; }
  let url = null;
  try { url = new URL(text); } catch (e) {}
  if (url) {
    const m = url.hash.match(/^#pass=(.+)$/);
    if (m && url.href.startsWith(lwBaseUrl())) { scanMsg(ALTE_KARTE.replace('\n\n', ' '), 'err'); scanButtons(again); return; }
    if (url.href.startsWith(lwBaseUrl()) && /(\/|\.html)$/.test(url.pathname)) {
      const name = (CONFIG && CONFIG.apps || []).find(a => appUrl(a.datei) && url.href.startsWith(appUrl(a.datei).split('#')[0]));
      scanMsg('✓ ' + (name ? name.name : 'Lernwelt') + ' wird geöffnet …', 'ok');
      setTimeout(() => { location.href = url.href; }, 350);
      return;
    }
    const ext = (CONFIG && CONFIG.apps || []).find(a => /^https:\/\//.test(a.datei) && a.datei === url.href);
    if (ext) {
      scanMsg(`„${ext.name}“ ist eine Seite außerhalb der Lernwelt.`);
      scanButtons(`<a class="lw-btn primary" href="${escHtml(ext.datei)}" target="_blank" rel="noopener" style="text-decoration:none">Öffnen</a>` + again);
      return;
    }
  }
  scanMsg('Dieser QR-Code gehört nicht zur Lernwelt.', 'err');
  scanButtons(again);
}
document.getElementById('scan-close').addEventListener('click', closeScanner);
document.getElementById('scan-modal').addEventListener('click', e => {
  if (e.target.id === 'scan-modal') closeScanner();
  if (e.target.id === 'scan-again') { scan.busy = false; openScanner(); }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.getElementById('scan-modal').classList.contains('open')) closeScanner(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && scan.stream) closeScanner(); });

/** Nach dem Laden der Sicherung: offene Ansicht „Sicherung“ bzw. „Einrichten“ neu zeichnen */
function nachSync() { if (passModus === 'sicherung' || passModus === 'setup') renderPass(passModus); }

window.LernPassAnsicht = { openPass, closePass, renderPass, openScanner, nachSync };
