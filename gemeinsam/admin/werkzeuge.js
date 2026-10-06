// ═══════════════════════════════════════════════════════
//  Lernwelt-Admin – Banner, Link-Check, Vokabeln
//  Teil von admin.html (Infrastruktur Etappe 6: Admin in Module zerlegt).
//  Alle Module teilen sich die globalen Variablen aus kern.js (CONFIG, ghSha …)
//  und werden in admin.html in fester Reihenfolge geladen.
// ═══════════════════════════════════════════════════════
'use strict';

// ── Announcement ──────────────────────────────────────
function buildColorChips() {
  const wrap = document.getElementById('color-chips');
  wrap.innerHTML = '';
  ANN_COLORS.forEach((c, i) => {
    const chip = document.createElement('div');
    chip.className = 'color-chip' + (i === selectedAnnColor ? ' selected' : '');
    chip.style.background = c.bg;
    chip.style.border = `2px solid ${c.text}`;
    chip.title = c.label;
    chip.addEventListener('click', () => {
      selectedAnnColor = i;
      document.querySelectorAll('.color-chip').forEach((ch, j) => ch.classList.toggle('selected', j === i));
      updateAnnPreview();
    });
    wrap.appendChild(chip);
  });
}

function loadAnnForm() {
  buildColorChips();
  const ann = CONFIG.announcement || {};
  document.getElementById('ann-text').value  = ann.text  || '';
  document.getElementById('ann-emoji').value = ann.emoji || '📢';
  selectedAnnColor = ann.color || 0;
  buildColorChips();
  updateAnnPreview();
  document.getElementById('ann-status').textContent = ann.active ? '✅ Banner ist aktiv' : '⚪ Banner ist ausgeblendet';
}

function updateAnnPreview() {
  const text  = document.getElementById('ann-text').value  || 'Hier steht deine Ankündigung …';
  const emoji = document.getElementById('ann-emoji').value || '📢';
  const col   = ANN_COLORS[selectedAnnColor] || ANN_COLORS[0];
  const prev  = document.getElementById('ann-preview');
  prev.style.background = col.bg;
  prev.style.color      = col.text;
  prev.style.border     = `1px solid ${col.text}44`;
  document.getElementById('ann-preview-emoji').textContent = emoji;
  document.getElementById('ann-preview-text').textContent  = text;
}

function saveAnnouncement() {
  const text = document.getElementById('ann-text').value.trim();
  if (!text) { showToast('⚠ Bitte Text eingeben', true); return; }
  if (text.length > 300) { showToast('⚠ Maximal 300 Zeichen', true); return; }
  CONFIG.announcement = {
    active:    true,
    text,
    emoji:     document.getElementById('ann-emoji').value || '📢',
    color:     selectedAnnColor,
  };
  logChange(`📢 Banner aktiviert: "${text.substring(0, 30)}…"`);
  saveConfig();
  document.getElementById('ann-status').textContent = '✅ Banner ist aktiv';
  buildDashboard();
  showToast('✓ Banner gespeichert & aktiv');
}

function hideAnnouncement() {
  if (!CONFIG.announcement) CONFIG.announcement = {};
  CONFIG.announcement.active = false;
  logChange('🚫 Banner ausgeblendet');
  saveConfig();
  document.getElementById('ann-status').textContent = '⚪ Banner ist ausgeblendet';
  buildDashboard();
  showToast('Banner ausgeblendet');
}

// ── Link Checker ──────────────────────────────────────
const GH_RAW = lwBaseUrl();

async function runChecker() {
  const apps = CONFIG.apps.filter(a => a.datei);
  if (!apps.length) { document.getElementById('checker-info').textContent = 'Keine Apps mit Dateiangabe.'; return; }
  const btn      = document.getElementById('check-btn');
  const resultDiv = document.getElementById('checker-result');
  const summary  = document.getElementById('checker-summary');
  const progress = document.getElementById('checker-progress');
  const fill     = document.getElementById('checker-fill');
  btn.disabled   = true; btn.textContent = '⏳ Prüfe …';
  resultDiv.innerHTML = ''; summary.className = 'checker-summary'; progress.className = 'checker-progress visible';
  let ok = 0, fail = 0;

  apps.forEach(app => {
    const isExternal = app.datei.startsWith('http');
    const item = document.createElement('div');
    item.className = 'check-item checking';
    item.id = 'ci-' + app.datei.replace(/[^a-z0-9]/gi, '_');
    item.innerHTML = `
      <span class="check-status">⏳</span>
      <div style="flex:1;min-width:0;">
        <div class="check-name">${escHtml(app.emoji || '📱')} ${escHtml(app.name)}</div>
        <div class="check-url">${isExternal ? escHtml(app.datei) : GH_RAW + escHtml(app.datei)}</div>
      </div>
      <span class="check-badge skip">${isExternal ? 'Extern' : 'Prüft …'}</span>`;
    resultDiv.appendChild(item);
  });

  for (let i = 0; i < apps.length; i++) {
    const app        = apps[i];
    const id         = 'ci-' + app.datei.replace(/[^a-z0-9]/gi, '_');
    const item       = document.getElementById(id);
    const isExternal = app.datei.startsWith('http');
    if (isExternal) {
      item.className = 'check-item';
      item.querySelector('.check-status').textContent = '🔗';
      item.querySelector('.check-badge').textContent  = 'Extern';
      item.querySelector('.check-badge').className    = 'check-badge skip';
    } else {
      try {
        const r    = await fetch(GH_RAW + app.datei, { method: 'HEAD', cache: 'no-store' });
        const isOk = r.ok;
        item.className = 'check-item ' + (isOk ? 'ok' : 'fail');
        item.classList.remove('checking');
        item.querySelector('.check-status').textContent = isOk ? '✅' : '❌';
        item.querySelector('.check-badge').textContent  = isOk ? '200 OK' : r.status + ' Fehler';
        item.querySelector('.check-badge').className    = 'check-badge ' + (isOk ? 'ok' : 'fail');
        if (isOk) ok++; else fail++;
      } catch (e) {
        item.className = 'check-item fail';
        item.classList.remove('checking');
        item.querySelector('.check-status').textContent = '❌';
        item.querySelector('.check-badge').textContent  = 'Nicht erreichbar';
        item.querySelector('.check-badge').className    = 'check-badge fail';
        fail++;
      }
    }
    fill.style.width = Math.round(((i + 1) / apps.length) * 100) + '%';
    document.getElementById('checker-info').textContent = `${i + 1} / ${apps.length}`;
  }

  btn.disabled = false; btn.textContent = '🔍 Alle Links prüfen';
  progress.className = 'checker-progress';
  summary.className  = 'checker-summary visible';
  summary.style.color      = fail > 0 ? 'var(--red)' : 'var(--green)';
  summary.style.borderLeft = `3px solid ${fail > 0 ? 'var(--red)' : 'var(--green)'}`;
  summary.textContent = fail === 0
    ? `✅ Alle ${ok} Links erreichbar!`
    : `⚠ ${fail} Link${fail > 1 ? 's' : ''} nicht erreichbar · ${ok} OK`;
  logChange(`🔗 Link-Check: ${ok} OK, ${fail} fehlerhaft`);
}

// ── Vokabeln (lazy load aus vokabeln5.json) ────────────
let VOK_CONFIG = null;
let vokIndex   = [];

async function loadVokabeln() {
  if (VOK_CONFIG) return;
  try {
    const r = await fetch('daten/vokabeln5.json');
    if (!r.ok) throw new Error('HTTP ' + r.status);
    VOK_CONFIG = await r.json();
    buildVokIndex();
    buildVokStats();
    buildVokSpecial();
    buildVokUnits();
  } catch (e) {
    document.getElementById('vok-units').innerHTML = '<div class="empty-msg">⚠ vokabeln5.json konnte nicht geladen werden.</div>';
  }
}

function buildVokIndex() {
  vokIndex = [];
  Object.entries(VOK_CONFIG.specialLists || {}).forEach(([, sl]) =>
    sl.words.forEach(w => vokIndex.push({ en: w.en, de: w.de, loc: sl.label })));
  Object.entries(VOK_CONFIG.units || {}).forEach(([, unit]) =>
    Object.entries(unit.themes).forEach(([, theme]) =>
      theme.words.forEach(w => vokIndex.push({ en: w.en, de: w.de, loc: `${unit.label} – ${theme.label}` }))));
}

function buildVokStats() {
  const total   = vokIndex.length;
  const units   = Object.keys(VOK_CONFIG.units || {}).length;
  const special = Object.keys(VOK_CONFIG.specialLists || {}).length;
  let themes    = 0;
  Object.values(VOK_CONFIG.units || {}).forEach(u => themes += Object.keys(u.themes).length);
  document.getElementById('vok-stats').innerHTML = `
    <div class="dash-card accent-card"><div class="dash-card-label">Vokabeln gesamt</div><div class="dash-card-value">${total}</div></div>
    <div class="dash-card"><div class="dash-card-label">Units</div><div class="dash-card-value">${units}</div></div>
    <div class="dash-card"><div class="dash-card-label">Themen</div><div class="dash-card-value">${themes}</div></div>
    <div class="dash-card green-card"><div class="dash-card-label">Sonderlisten</div><div class="dash-card-value">${special}</div></div>`;
}

function buildVokSpecial() {
  const wrap = document.getElementById('vok-special');
  wrap.innerHTML = '';
  Object.entries(VOK_CONFIG.specialLists || {}).forEach(([key, sl]) => {
    const block = document.createElement('div');
    block.className = 'vis-cat-block';
    block.style.marginBottom = '.5rem';
    block.innerHTML = `
      <div class="vis-cat-header" style="cursor:pointer" onclick="vokToggle('vst-${key}',this)">
        <span class="vis-cat-name" style="color:var(--accent)">⭐ ${escHtml(sl.label)}</span>
        <span style="font-size:.72rem;color:var(--muted);margin-right:.5rem">${sl.words.length} Wörter</span>
        <span style="color:var(--muted)">›</span>
      </div>
      <table id="vst-${key}" style="display:none;width:100%;border-collapse:collapse">
        <tr style="background:var(--surface2)">
          <th style="padding:.45rem 1rem;text-align:left;font-size:.7rem;font-weight:800;color:var(--muted);text-transform:uppercase">Englisch</th>
          <th style="padding:.45rem 1rem;text-align:left;font-size:.7rem;font-weight:800;color:var(--muted);text-transform:uppercase">Deutsch</th>
        </tr>
        ${sl.words.map((w, i) => `<tr style="border-top:1px solid var(--border);background:${i % 2 ? 'var(--surface2)' : 'transparent'}">
          <td style="padding:.4rem 1rem;font-size:.83rem;font-weight:700">${escHtml(w.en)}</td>
          <td style="padding:.4rem 1rem;font-size:.83rem;color:var(--text2)">${escHtml(w.de)}</td>
        </tr>`).join('')}
      </table>`;
    wrap.appendChild(block);
  });
}

function buildVokUnits() {
  const wrap = document.getElementById('vok-units');
  wrap.innerHTML = '';
  Object.entries(VOK_CONFIG.units || {}).forEach(([uk, unit]) => {
    const total = Object.values(unit.themes).reduce((s, t) => s + t.words.length, 0);
    const block = document.createElement('div');
    block.className = 'vis-cat-block';
    block.style.marginBottom = '.7rem';
    const themesHTML = Object.entries(unit.themes).map(([tk, theme]) => `
      <div style="border-top:1px solid var(--border)">
        <div class="vis-cat-header" style="cursor:pointer;background:transparent;padding:.6rem 1rem .6rem 1.5rem" onclick="vokToggle('vut-${uk}-${tk}',this)">
          <span class="vis-cat-name" style="font-size:.83rem">${escHtml(theme.label)}</span>
          <span style="font-size:.7rem;color:var(--muted);margin-right:.5rem">${theme.words.length} Wörter</span>
          <span style="color:var(--muted)">›</span>
        </div>
        <table id="vut-${uk}-${tk}" style="display:none;width:100%;border-collapse:collapse">
          <tr style="background:var(--surface2)">
            <th style="padding:.4rem 1rem .4rem 1.5rem;text-align:left;font-size:.68rem;font-weight:800;color:var(--muted);text-transform:uppercase">Englisch</th>
            <th style="padding:.4rem 1rem;text-align:left;font-size:.68rem;font-weight:800;color:var(--muted);text-transform:uppercase">Deutsch</th>
          </tr>
          ${theme.words.map((w, i) => `<tr style="border-top:1px solid var(--border);background:${i % 2 ? 'var(--surface2)' : 'transparent'}">
            <td style="padding:.38rem 1rem .38rem 1.5rem;font-size:.82rem;font-weight:700">${escHtml(w.en)}</td>
            <td style="padding:.38rem 1rem;font-size:.82rem;color:var(--text2)">${escHtml(w.de)}</td>
          </tr>`).join('')}
        </table>
      </div>`).join('');
    block.innerHTML = `
      <div class="vis-cat-header" style="cursor:pointer" onclick="vokToggleUnit('vub-${uk}',this)">
        <span class="vis-cat-name">${escHtml(unit.label)}</span>
        <span style="font-size:.72rem;color:var(--muted);margin-right:.5rem">${total} Wörter</span>
        <span style="color:var(--muted)">›</span>
      </div>
      <div id="vub-${uk}" style="display:none">${themesHTML}</div>`;
    wrap.appendChild(block);
  });
}

function vokToggle(id, hdr) {
  const el = document.getElementById(id);
  const arrow = hdr.querySelector('span:last-child');
  const open  = el.style.display !== 'none';
  el.style.display = open ? 'none' : 'table';
  if (arrow) arrow.textContent = open ? '›' : '↓';
}

function vokToggleUnit(id, hdr) {
  const el = document.getElementById(id);
  const arrow = hdr.querySelector('span:last-child');
  const open  = el.style.display !== 'none';
  el.style.display = open ? 'none' : 'block';
  if (arrow) arrow.textContent = open ? '›' : '↓';
}

function vokSearch(q) {
  const box = document.getElementById('vok-search-results');
  q = q.trim().toLowerCase();
  if (q.length < 2) { box.style.display = 'none'; return; }
  const results = vokIndex.filter(w => w.en.toLowerCase().includes(q) || w.de.toLowerCase().includes(q)).slice(0, 25);
  box.innerHTML = results.length
    ? `<div style="font-size:.72rem;color:var(--muted);margin-bottom:.5rem;padding:.3rem .5rem">${results.length} Treffer</div>` +
      results.map(r => `<div style="display:flex;gap:1rem;padding:.38rem .5rem;border-bottom:1px solid var(--border);font-size:.83rem">
        <span style="font-weight:700;min-width:160px">${escHtml(r.en)}</span>
        <span style="color:var(--text2);flex:1">${escHtml(r.de)}</span>
        <span style="font-size:.68rem;color:var(--purple)">${escHtml(r.loc)}</span>
      </div>`).join('')
    : '<div class="empty-msg" style="padding:1rem">Keine Ergebnisse.</div>';
  box.style.display = 'block';
}
