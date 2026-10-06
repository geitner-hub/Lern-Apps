// ═══════════════════════════════════════════════════════
//  Lernwelt-Admin – Tags, Tag-Fenster, QR-Codes
//  Teil von admin.html (Infrastruktur Etappe 6: Admin in Module zerlegt).
//  Alle Module teilen sich die globalen Variablen aus kern.js (CONFIG, ghSha …)
//  und werden in admin.html in fester Reihenfolge geladen.
// ═══════════════════════════════════════════════════════
'use strict';

// ── Tags ──────────────────────────────────────────────
function buildTagManager() {
  const pills = document.getElementById('tag-pills');
  pills.innerHTML = '';
  if (!CONFIG.customTags.length) {
    pills.innerHTML = '<span style="font-size:.78rem;color:var(--muted);">Noch keine Tags erstellt.</span>';
  } else {
    CONFIG.customTags.forEach((tag, ti) => {
      const t = tagObj(tag), col = tagColor(tag);
      const p = document.createElement('div');
      p.className = 'tag-pill';
      p.style.cssText = `background:${col.bg};border:1px solid ${col.border};color:${col.text};`;
      p.innerHTML = `${escHtml(t.name)}<button class="del" title="Löschen">×</button><button class="del" title="Farbe" style="opacity:.55;font-size:.7rem;margin-left:1px;">🎨</button>`;
      const [delBtn, colorBtn] = p.querySelectorAll('.del');
      delBtn.addEventListener('click', () => {
        if (!confirm(`Tag "${t.name}" löschen?`)) return;
        const nm = t.name;
        CONFIG.customTags.splice(ti, 1);
        CONFIG.apps.forEach(a => { if (a.customTags) a.customTags = a.customTags.filter(x => tagName(x) !== nm); });
        logChange(`🏷 Tag "${nm}" gelöscht`);
        saveConfig(); buildAll();
      });
      colorBtn.addEventListener('click', () => openTagColorPicker(ti));
      pills.appendChild(p);
    });
  }
  buildNewTagColorDots();
}

document.getElementById('new-tag').addEventListener('keydown', e => { if (e.key === 'Enter') addTag(); });

function addTag() {
  const inp = document.getElementById('new-tag');
  const v   = inp.value.trim();
  if (!v || CONFIG.customTags.find(t => tagName(t) === v)) { inp.value = ''; return; }
  CONFIG.customTags.push({ name: v, color: selectedNewTagColor });
  inp.value = '';
  logChange(`🏷 Tag "${v}" erstellt`);
  saveConfig(); buildAll();
}

function buildNewTagColorDots() {
  const wrap = document.getElementById('new-tag-colors');
  if (!wrap) return;
  wrap.innerHTML = '';
  TAG_COLORS.forEach((col, i) => {
    const d = document.createElement('div');
    d.className = 'tag-color-dot' + (i === selectedNewTagColor ? ' sel' : '');
    d.style.background = col.dot;
    d.title = col.label;
    d.addEventListener('click', () => {
      selectedNewTagColor = i;
      wrap.querySelectorAll('.tag-color-dot').forEach((el, j) => el.classList.toggle('sel', j === i));
    });
    wrap.appendChild(d);
  });
}

function openTagColorPicker(ti) {
  const tag = tagObj(CONFIG.customTags[ti]);
  const existing = document.getElementById('tag-cp-overlay');
  if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.id = 'tag-cp-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.6);backdrop-filter:blur(3px);';
  overlay.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border2);border-radius:16px;padding:1.4rem 1.6rem;min-width:280px;box-shadow:0 20px 60px rgba(0,0,0,.5);">
      <div style="font-family:'Fredoka One',cursive;font-size:1.1rem;color:var(--accent);margin-bottom:.9rem;">🎨 Farbe für „${escHtml(tag.name)}"</div>
      <div style="display:flex;flex-wrap:wrap;gap:.5rem;margin-bottom:1.1rem;" id="tag-cp-dots"></div>
      <div style="display:flex;justify-content:flex-end;gap:.5rem;">
        <button class="btn" onclick="document.getElementById('tag-cp-overlay').remove()">Abbrechen</button>
        <button class="btn accent" id="tag-cp-save">Speichern</button>
      </div>
    </div>`;
  let picked = tag.color || 0;
  document.body.appendChild(overlay);
  const dotsWrap = document.getElementById('tag-cp-dots');
  TAG_COLORS.forEach((col, i) => {
    const d = document.createElement('div');
    d.style.cssText = `width:32px;height:32px;border-radius:50%;background:${col.dot};cursor:pointer;border:3px solid ${i === picked ? '#fff' : 'transparent'};transition:all .14s;`;
    d.title = col.label;
    d.addEventListener('click', () => { picked = i; dotsWrap.querySelectorAll('div').forEach((el, j) => el.style.borderColor = j === i ? '#fff' : 'transparent'); });
    dotsWrap.appendChild(d);
  });
  document.getElementById('tag-cp-save').addEventListener('click', () => {
    CONFIG.customTags[ti] = { ...tag, color: picked };
    logChange(`🎨 Tag-Farbe für "${tag.name}" geändert`);
    saveConfig(); buildAll();
    overlay.remove();
  });
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

function buildTagAssignList() {
  const list = document.getElementById('tag-assign-list');
  list.innerHTML = '';
  CONFIG.apps.forEach(app => {
    const kl = app.klassen || [], ct = app.customTags || [];
    const row = document.createElement('div');
    row.className = 'app-row';
    row.style.cursor = 'default';
    row.innerHTML = `
      <span class="row-emoji">${escHtml(app.emoji || '📱')}</span>
      <div class="row-info">
        <div class="row-name">${escHtml(app.name)}</div>
        <div class="row-tags">
          ${kl.map(k => `<span class="rtag">Kl.${k}</span>`).join('')}
          ${ct.map(t => { const col = tagColor(t); return `<span class="rtag ct" style="background:${col.bg};border-color:${col.border};color:${col.text};">${escHtml(tagName(t))}</span>`; }).join('')}
          ${!kl.length && !ct.length ? '<span style="font-size:.7rem;color:var(--muted)">Keine Tags</span>' : ''}
        </div>
      </div>
      <div class="row-actions"><button class="icon-btn" data-name="${escHtml(app.name)}" onclick="openModal(this.dataset.name)">🏷 Bearbeiten</button></div>`;
    list.appendChild(row);
  });
}

// ── Tag Modal ─────────────────────────────────────────
function openModal(name) {
  modalAppName = name;
  const app = CONFIG.apps.find(a => a.name === name);
  if (!app) return;
  document.getElementById('modal-title').textContent = '🏷 ' + name;
  const kWrap = document.getElementById('modal-klassen');
  kWrap.innerHTML = '';
  KLASSEN.forEach(k => {
    const c = document.createElement('span');
    c.className = 'm-chip' + (app.klassen?.includes(k) ? ' sel-k' : '');
    c.textContent = 'Klasse ' + k;
    c.addEventListener('click', () => {
      if (!app.klassen) app.klassen = [];
      const idx = app.klassen.indexOf(k);
      if (idx === -1) app.klassen.push(k); else app.klassen.splice(idx, 1);
      c.classList.toggle('sel-k');
      saveConfig(); buildAll();
    });
    kWrap.appendChild(c);
  });
  const tWrap = document.getElementById('modal-tags');
  tWrap.innerHTML = '';
  if (!CONFIG.customTags.length) {
    tWrap.innerHTML = '<span style="font-size:.78rem;color:var(--muted)">Erst Tags im Reiter "Tags" erstellen.</span>';
  } else {
    CONFIG.customTags.forEach(tag => {
      const nm = tagName(tag), col = tagColor(tag);
      const c  = document.createElement('span');
      const isSelected = app.customTags?.find(x => tagName(x) === nm);
      c.className = 'm-chip' + (isSelected ? ' sel-c' : '');
      if (isSelected) c.style.cssText = `background:${col.bg};border-color:${col.border};color:${col.text};`;
      c.textContent = nm;
      c.addEventListener('click', () => {
        if (!app.customTags) app.customTags = [];
        const idx = app.customTags.findIndex(x => tagName(x) === nm);
        if (idx === -1) {
          app.customTags.push(tag);
          c.classList.add('sel-c');
          c.style.cssText = `background:${col.bg};border-color:${col.border};color:${col.text};`;
        } else {
          app.customTags.splice(idx, 1);
          c.classList.remove('sel-c');
          c.style.cssText = '';
        }
        saveConfig(); buildAll();
      });
      tWrap.appendChild(c);
    });
  }
  document.getElementById('tag-modal').classList.add('open');
}

function closeModal() { document.getElementById('tag-modal').classList.remove('open'); modalAppName = ''; }
document.getElementById('tag-modal').addEventListener('click', e => { if (e.target === document.getElementById('tag-modal')) closeModal(); });

// ── QR (lokal erzeugt, kein externer Dienst) ─────────────
function showQRIdx(i) {
  const app = CONFIG.apps[parseInt(i, 10)];
  if (app) showQR(app.name, app.datei);
}

function showQR(name, datei) {
  const url = appUrl(datei);
  if (!url) { showToast('⚠ Kein gültiger Link für QR-Code', true); return; }
  document.getElementById('qr-app-name').textContent = name;
  document.getElementById('qr-url').textContent = url;
  const wrap = document.getElementById('qr-canvas-wrap');
  wrap.innerHTML = '';
  const canvas = document.createElement('canvas');
  if (!renderQR(canvas, url, 600)) { showToast('⚠ QR-Code konnte nicht erzeugt werden', true); return; }
  wrap.appendChild(canvas);
  document.getElementById('qr-modal-wrap').classList.add('open');
}

function downloadQR() {
  const name   = document.getElementById('qr-app-name').textContent;
  const canvas = document.querySelector('#qr-canvas-wrap canvas');
  if (canvas) downloadCanvas(canvas, 'QR-' + name);
}

function closeQR() { document.getElementById('qr-modal-wrap').classList.remove('open'); }
document.getElementById('qr-modal-wrap').addEventListener('click', e => { if (e.target === document.getElementById('qr-modal-wrap')) closeQR(); });
