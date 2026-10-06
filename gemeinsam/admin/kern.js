// ═══════════════════════════════════════════════════════
//  Lernwelt-Admin – Kern: Anmeldung, Laden, Entwurf & Veröffentlichen, Tabs
//  Teil von admin.html (Infrastruktur Etappe 6: Admin in Module zerlegt).
//  Alle Module teilen sich die globalen Variablen aus kern.js (CONFIG, ghSha …)
//  und werden in admin.html in fester Reihenfolge geladen.
// ═══════════════════════════════════════════════════════
'use strict';

// Passwort & Secret stehen NICHT mehr hier – sie liegen nur als Secret im Cloudflare Worker.
// KLASSEN, FAECHER, ANN_COLORS, TAG_COLORS kommen aus shared.js.

// Fach-Auswahlen aus shared.js füllen – neues Fach nur dort in CAT_STYLES eintragen
(function fillFachSelects() {
  ['f-fach', 'fach-filter'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    FAECHER.forEach(f => { const o = document.createElement('option'); o.textContent = f; o.value = f; sel.appendChild(o); });
  });
  ['klasse-filter', 'vorschau-klasse'].forEach(id => {                  // Klassen aus shared.js
    const sel = document.getElementById(id);
    if (sel) KLASSEN.forEach(k => { const o = document.createElement('option'); o.value = k; o.textContent = 'Klasse ' + k; sel.appendChild(o); });
  });
})();

let CONFIG   = { apps: [], customTags: [], hiddenCats: [], announcement: { active: false, text: '', emoji: '📢', color: 0 } };
let ghSha    = '';
let saveTimer = null, isSaving = false, pendingSave = false;
let modalAppName = '';
let dragSrc  = null;
let changelog = [];
let selectedAnnColor    = 0;
let selectedNewTagColor = 0;

// ── Login (Prüfung serverseitig im Worker) ─────────────
document.getElementById('pw').addEventListener('keydown', e => { if (e.key === 'Enter') checkLogin(); });

async function checkLogin() {
  const inp = document.getElementById('pw');
  const err = document.getElementById('pw-err');
  const btn = document.getElementById('btn-login');
  const pw  = inp.value;
  if (!pw) { err.textContent = 'Bitte Passwort eingeben'; return; }
  btn.disabled = true; btn.textContent = 'Prüfe …'; err.textContent = '';
  const res = await ConfigAPI.login(pw);
  btn.disabled = false; btn.textContent = 'Anmelden';
  if (res.ok) {
    inp.value = '';
    showAdmin();
  } else {
    err.textContent = res.status === 401 ? '❌ Falsches Passwort'
                    : res.status === 429 ? '⏳ ' + res.error
                    : '⚠ ' + (res.error || 'Fehler');
    inp.value = '';
    inp.focus();
  }
}

function showAdmin() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  const exp = ConfigAPI.sessionExpiry();
  document.getElementById('session-info').textContent = exp
    ? 'Angemeldet bis ' + exp.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' }) : '';
  loadConfig();
}

function showLogin(msg) {
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('pw-err').textContent = msg || '';
  document.getElementById('pw').focus();
}

function logout() {
  ConfigAPI.logout();
  showLogin('Abgemeldet.');
}

async function logoutAllDevices() {
  if (!confirm('Alle Geräte abmelden?\n\nDanach ist der Admin auf JEDEM Gerät gesperrt – auch auf diesem – bis dort wieder das Passwort eingegeben wird.\n\nWirkt innerhalb von ca. 1 Minute überall.')) return;
  const res = await ConfigAPI.logoutAll();
  if (res.ok) showLogin('✓ Alle Geräte wurden abgemeldet.');
  else if (res.status === 401) showLogin('Sitzung abgelaufen – bitte neu anmelden.');
  else showToast('⚠ ' + (res.error || 'Abmelden nicht möglich'), true);
}

// (Sitzung prüfen: siehe gemeinsam/admin/start.js – läuft erst, wenn alle Module geladen sind)

// ── Sync ─────────────────────────────────────────────
function setSync(s, m) {
  const el = document.getElementById('sync-status');
  el.className = s;
  el.textContent = m;
}

async function loadConfig() {
  setSync('saving', 'Lädt …');
  try {
    const { config, sha } = await ConfigAPI.loadAdmin();
    CONFIG = config;
    ghSha  = sha;
    entwurfPruefen();
    setSync('ok', '✓ Geladen');
    setTimeout(() => setSync('', '–'), 2000);
  } catch (e) {
    setSync('error', '⚠ Laden fehlgeschlagen');
    showToast('⚠ Config konnte nicht geladen werden – Speichern ist gesperrt', true);
    console.error('[Admin] Ladefehler:', e);
    ghSha = null;           // ohne aktuelle Version kein Speichern (verhindert Überschreiben)
  }
  buildAll();
  loadAnnForm();
  entwurfLeiste();
  letzteVeroeffentlichungen();
}

// ── Entwurf → Veröffentlichen (Etappe 6) ──────────────
//  Jede Änderung im Admin landet zuerst als ENTWURF auf diesem Gerät (localStorage).
//  „🚀 Veröffentlichen“ schreibt alles mit EINEM Commit (schont das Build-Limit von GitHub Pages).
//  Der Entwurf überlebt Neuladen und Abmelden; er gehört zu der config.json-Version (sha),
//  auf der er beruht.
const ENTWURF_KEY = 'lernwelt-admin-entwurf';
let entwurf = null;              // { basis: sha, aenderungen: [text], zeit } – CONFIG ist dann der Entwurf

function saveConfig() {
  if (ghSha === null) { showToast('⚠ Speichern gesperrt – bitte Seite neu laden', true); return; }
  if (!entwurf) entwurf = { basis: ghSha, aenderungen: [], zeit: Date.now() };
  const letzte = changelog.length ? changelog[changelog.length - 1].msg : 'Einstellungen geändert';
  if (entwurf.aenderungen[entwurf.aenderungen.length - 1] !== letzte) entwurf.aenderungen.push(letzte);
  entwurf.zeit = Date.now();
  entwurfSpeichern();
  entwurfLeiste();
}
function entwurfSpeichern() {
  try { localStorage.setItem(ENTWURF_KEY, JSON.stringify({ ...entwurf, config: CONFIG })); }
  catch (e) { showToast('⚠ Entwurf konnte auf diesem Gerät nicht gemerkt werden – bitte gleich veröffentlichen', true); }
}
function entwurfLesen() {
  try { const e = JSON.parse(localStorage.getItem(ENTWURF_KEY) || 'null'); return e && e.config && Array.isArray(e.config.apps) ? e : null; } catch (e) { return null; }
}
/** Nach dem Laden: gespeicherten Entwurf wieder aufnehmen */
function entwurfPruefen() {
  const e = entwurfLesen();
  if (!e) { entwurf = null; return; }
  const n = (e.aenderungen || []).length;
  if (e.basis !== ghSha) {
    const ok = confirm(`Auf diesem Gerät liegt ein Entwurf mit ${n} Änderung${n === 1 ? '' : 'en'}.\n\n` +
      'Inzwischen wurde die Lernwelt aber woanders geändert.\n\nOK = Entwurf trotzdem übernehmen (ersetzt die neueren Änderungen beim Veröffentlichen)\n' +
      'Abbrechen = Entwurf verwerfen');
    if (!ok) { try { localStorage.removeItem(ENTWURF_KEY); } catch (err) {} entwurf = null; return; }
  }
  CONFIG = ConfigAPI.migrate(e.config);
  entwurf = { basis: ghSha, aenderungen: e.aenderungen || [], zeit: e.zeit || Date.now() };
  showToast(`✏️ Entwurf mit ${n} Änderung${n === 1 ? '' : 'en'} wiederhergestellt`);
}
function entwurfLeiste() {
  const bar = document.getElementById('entwurf-bar');
  if (!bar) return;
  const n = entwurf ? entwurf.aenderungen.length : 0;
  bar.classList.toggle('offen', n > 0);
  document.getElementById('entwurf-zahl').textContent = n === 1 ? '1 Änderung' : n + ' Änderungen';
  document.getElementById('entwurf-liste').innerHTML = n
    ? entwurf.aenderungen.slice().reverse().map(t => `<li>${escHtml(t)}</li>`).join('') : '';
}
async function veroeffentlichen() {
  if (!entwurf || !entwurf.aenderungen.length) return;
  const a = entwurf.aenderungen;
  const msg = a.length === 1 ? a[0] : `${a.length} Änderungen: ` + a.slice(-3).reverse().join(' · ');
  const ok = await _doSave(msg);
  if (ok) {
    entwurf = null;
    try { localStorage.removeItem(ENTWURF_KEY); } catch (e) {}
    entwurfLeiste();
    letzteVeroeffentlichungen();
  }
}
function verwerfen() {
  if (!entwurf) return;
  if (!confirm(`Alle ${entwurf.aenderungen.length} unveröffentlichten Änderungen verwerfen?`)) return;
  entwurf = null;
  try { localStorage.removeItem(ENTWURF_KEY); } catch (e) {}
  entwurfLeiste();
  loadConfig();
}
/** Die letzten Veröffentlichungen (Commits an config.json) – öffentliche GitHub-Schnittstelle */
async function letzteVeroeffentlichungen() {
  const box = document.getElementById('entwurf-historie');
  if (!box) return;
  try {
    const owner = location.hostname.split('.')[0], repo = location.pathname.split('/').filter(Boolean)[0] || '';
    const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?path=config.json&per_page=5`, { cache: 'no-store' });
    if (!r.ok) throw new Error(r.status);
    const l = await r.json();
    box.innerHTML = l.map(c => {
      const d = new Date(c.commit.committer.date);
      return `<li><span>${d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} ${d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span> ${escHtml(String(c.commit.message).split('\n')[0].replace(/^Admin: /, ''))}</li>`;
    }).join('') || '<li>–</li>';
  } catch (e) { box.innerHTML = '<li>nicht abrufbar (offline oder zu viele Abfragen)</li>'; }
}

/** Schreibt CONFIG mit einem Commit. → true bei Erfolg */
async function _doSave(msg) {
  if (ghSha === null) { showToast('⚠ Speichern gesperrt – bitte Seite neu laden', true); return false; }
  if (isSaving) return false;
  isSaving = true;
  const knopf = document.getElementById('btn-veroeffentlichen');
  if (knopf) knopf.disabled = true;
  setSync('saving', 'Veröffentlicht …');
  const { ok, newSha, status, error } = await ConfigAPI.save(CONFIG, ghSha, msg || 'Einstellungen aktualisiert');
  isSaving = false;
  if (knopf) knopf.disabled = false;
  if (ok) {
    ghSha = newSha;
    setSync('ok', '✓ Veröffentlicht');
    showToast('🚀 Veröffentlicht – auf der Startseite in ca. 1 Min. sichtbar');
    setTimeout(() => setSync('', '–'), 3000);
    return true;
  }
  setSync('error', '⚠ Fehler');
  if (status === 401) { showLogin('Sitzung abgelaufen – bitte neu anmelden. Dein Entwurf bleibt erhalten.'); return false; }
  const txt = error === 'CONFLICT'
    ? '⚠ Konflikt: Die Lernwelt wurde woanders geändert. Seite neu laden – der Entwurf wird dir dann angeboten.'
    : '⚠ Fehler beim Veröffentlichen: ' + (error || '');
  showToast(txt, true);
  console.error('[Admin] Speicherfehler:', status, error);
  return false;
}

function showToast(msg, err = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = err ? 'show toast-error' : 'show';
  setTimeout(() => t.className = '', 2200);
}

// ── Tabs ──────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  tab.classList.add('active');
  document.getElementById('panel-' + tab.dataset.t).classList.add('active');
  if (tab.dataset.t === 'vokabeln') loadVokabeln();
  if (tab.dataset.t === 'dorf') buildDorfAdmin();
  if (tab.dataset.t === 'freigaben') buildFreigaben();
}));

// ── Build All ─────────────────────────────────────────
function buildAll() {
  buildPassAdmin();
  if (document.querySelector('.tab[data-t="dorf"].active')) buildDorfAdmin();
  if (document.querySelector('.tab[data-t="freigaben"].active')) buildFreigaben();
  buildDashboard();
  buildAppList();
  buildOrdnen();
  buildTagManager();
  buildTagAssignList();
}
