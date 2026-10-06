// ═══════════════════════════════════════════════════════
//  Lernwelt-Admin – App-Liste, Bearbeiten, Hinzufügen
//  Teil von admin.html (Infrastruktur Etappe 6: Admin in Module zerlegt).
//  Alle Module teilen sich die globalen Variablen aus kern.js (CONFIG, ghSha …)
//  und werden in admin.html in fester Reihenfolge geladen.
// ═══════════════════════════════════════════════════════
'use strict';

// ── App List ──────────────────────────────────────────
function buildAppList() {
  const list = document.getElementById('app-list');
  list.innerHTML = '';
  document.getElementById('app-count').textContent = CONFIG.apps.length + ' Apps';

  CONFIG.apps.forEach((app, i) => {
    const row = document.createElement('div');
    row.className = 'app-row' + (app.hidden ? ' is-hidden' : '');
    row.draggable = true;
    row.dataset.i = i;
    row.dataset.kl = (app.klassen || []).join(',');

    const klTags = (app.klassen || []).map(k => `<span class="rtag">Kl.${k}</span>`).join('');
    const ctTags = (app.customTags || []).map(t => {
      const col = tagColor(t);
      return `<span class="rtag ct" style="background:${col.bg};border-color:${col.border};color:${col.text};">${escHtml(tagName(t))}</span>`;
    }).join('');

    row.innerHTML = `
      <span class="drag-handle">⠿</span>
      <span class="row-emoji">${escHtml(app.emoji || '📱')}</span>
      <div class="row-info" style="flex:1;min-width:0;">
        <div class="row-name">${escHtml(app.name)}${app.aod ? '<span class="aod-indicator">⭐ Heute</span>' : ''}</div>
        <div class="row-meta">${escHtml(app.fach || '–')} · ${escHtml(app.datei || '–')}</div>
        <div class="row-tags">${klTags}${ctTags}${!klTags && !ctTags ? '<span style="font-size:.68rem;color:var(--muted)">Keine Tags</span>' : ''}</div>
        <div class="inline-edit" id="edit-${i}">
          <div class="form-group"><label>Name</label><input type="text" id="ei-name-${i}" value="${escHtml(app.name)}"/></div>
          <div class="form-group"><label>Datei</label><input type="text" id="ei-datei-${i}" value="${escHtml(app.datei || '')}"/></div>
          <div class="form-group"><label>Emoji</label><input type="text" id="ei-emoji-${i}" value="${escHtml(app.emoji || '📱')}" maxlength="8"/></div>
          <div class="form-group"><label>Fach</label>
            <select id="ei-fach-${i}">
              ${(FAECHER.includes(app.fach) || !app.fach ? FAECHER : [...FAECHER, app.fach]).map(f => `<option${app.fach === f ? ' selected' : ''}>${escHtml(f)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group full"><label>Beschreibung</label><input type="text" id="ei-desc-${i}" value="${escHtml(app.beschreibung || '')}"/></div>
          <div class="inline-edit-actions">
            <button class="btn sm" onclick="cancelEdit(${i})">Abbrechen</button>
            <button class="btn accent sm" onclick="saveEdit(${i})">💾 Speichern</button>
          </div>
        </div>
      </div>
      <div class="row-actions">
        <button class="icon-btn" onclick="toggleEdit(${i})" title="Bearbeiten">✏️</button>
        <button class="icon-btn ${app.aod ? 'on-gold' : ''}" data-name="${escHtml(app.name)}" onclick="toggleAod(this.dataset.name)" title="${app.aod ? 'App des Tages deaktivieren' : 'Als App des Tages setzen'}">⭐</button>
        <button class="icon-btn ${app.hidden ? 'on-red' : 'on-green'}" data-name="${escHtml(app.name)}" onclick="toggleHidden(this.dataset.name)" title="Ein/Ausblenden">${app.hidden ? '🚫' : '✅'}</button>
        <button class="icon-btn" data-name="${escHtml(app.name)}" onclick="openModal(this.dataset.name)" title="Tags">🏷</button>
        <button class="icon-btn" data-i="${i}" onclick="showQRIdx(this.dataset.i)" title="QR">📲</button>
        <button class="icon-btn on-red" data-name="${escHtml(app.name)}" onclick="deleteApp(this.dataset.name)" title="Löschen">🗑</button>
      </div>`;

    // Drag & Drop
    row.addEventListener('dragstart', e => { dragSrc = row; row.classList.add('is-dragging'); e.dataTransfer.effectAllowed = 'move'; });
    row.addEventListener('dragend',   () => { row.classList.remove('is-dragging'); document.querySelectorAll('.app-row').forEach(r => r.classList.remove('drag-over')); });
    row.addEventListener('dragover',  e => { e.preventDefault(); row.classList.add('drag-over'); });
    row.addEventListener('dragleave', () => row.classList.remove('drag-over'));
    row.addEventListener('drop', e => {
      e.preventDefault();
      if (!dragSrc || dragSrc === row) return;
      const from = parseInt(dragSrc.dataset.i), to = parseInt(row.dataset.i);
      const moved = CONFIG.apps.splice(from, 1)[0];
      CONFIG.apps.splice(to, 0, moved);
      logChange(`🔀 "${moved.name}" verschoben`);
      saveConfig(); buildAll();
    });

    list.appendChild(row);
  });
  filterAppList();
}

function toggleEdit(i) {
  const editEl = document.getElementById('edit-' + i);
  const row    = editEl.closest('.app-row');
  const isOpen = editEl.classList.contains('open');
  document.querySelectorAll('.inline-edit.open').forEach(el => { el.classList.remove('open'); el.closest('.app-row')?.classList.remove('editing'); });
  if (!isOpen) { editEl.classList.add('open'); row.classList.add('editing'); }
}

function cancelEdit(i) {
  document.getElementById('edit-' + i).classList.remove('open');
  document.getElementById('edit-' + i).closest('.app-row').classList.remove('editing');
}

function saveEdit(i) {
  const app = CONFIG.apps[i];
  if (!app) return;
  const newName  = document.getElementById(`ei-name-${i}`).value.trim();
  const newDatei = document.getElementById(`ei-datei-${i}`).value.trim();
  if (!newName || !newDatei) { showToast('⚠ Name und Datei sind Pflichtfelder', true); return; }
  if (!isSafeLink(newDatei)) { showToast('⚠ Ungültiger Link – erlaubt: ordner/name.html (optional ?parameter) oder https://…', true); return; }
  if (CONFIG.apps.some((a, j) => j !== i && a.name === newName)) { showToast('⚠ Name bereits vergeben', true); return; }
  const oldName = app.name;
  app.name        = newName;
  app.datei       = newDatei;
  app.emoji       = document.getElementById(`ei-emoji-${i}`).value.trim() || '📱';
  app.fach        = document.getElementById(`ei-fach-${i}`).value;
  app.beschreibung = document.getElementById(`ei-desc-${i}`).value.trim();
  logChange(`✏️ "${oldName}" bearbeitet`);
  saveConfig(); buildAll();
  showToast('✓ App aktualisiert');
}

function filterAppList() {
  const q      = (document.getElementById('app-search').value || '').toLowerCase();
  const fach   = document.getElementById('fach-filter').value;
  const status = document.getElementById('status-filter').value;
  const klasse = (document.getElementById('klasse-filter') || {}).value || '';
  let shown    = 0;
  document.querySelectorAll('#app-list .app-row').forEach(row => {
    const name     = (row.querySelector('.row-name')?.textContent || '').toLowerCase();
    const meta     = (row.querySelector('.row-meta')?.textContent || '').toLowerCase();
    const isHidden = row.classList.contains('is-hidden');
    const matchQ   = !q      || name.includes(q) || meta.includes(q);
    const matchF   = !fach   || meta.includes(fach.toLowerCase());
    const matchS   = !status || (status === 'hidden' && isHidden) || (status === 'visible' && !isHidden);
    const kls      = row.dataset.kl ? row.dataset.kl.split(',') : [];
    const matchK   = !klasse || !kls.length || kls.includes(klasse);   // ohne Klassen = für alle
    const show     = matchQ && matchF && matchS && matchK;
    row.style.display = show ? '' : 'none';
    if (show) shown++;
  });
  document.getElementById('app-count').textContent = shown + ' / ' + CONFIG.apps.length + ' Apps';
}

function toggleHidden(name) {
  const app = CONFIG.apps.find(a => a.name === name);
  if (!app) return;
  app.hidden = !app.hidden;
  logChange(`${app.hidden ? '🚫' : '✅'} "${name}" ${app.hidden ? 'versteckt' : 'eingeblendet'}`);
  saveConfig(); buildAll();
}

function toggleAod(name) {
  const app = CONFIG.apps.find(a => a.name === name);
  if (!app) return;
  if (app.aod) {                       // erneuter Klick = deaktivieren
    app.aod = false;
    logChange(`⭐ App des Tages deaktiviert ("${name}")`);
  } else {
    CONFIG.apps.forEach(a => a.aod = false);
    app.aod = true;
    logChange(`⭐ "${name}" als App des Tages gesetzt`);
    if (app.hidden) showToast('Hinweis: Diese App ist versteckt – sie erscheint erst, wenn sie sichtbar ist.', true);
  }
  saveConfig(); buildAll();
}

function clearAod() {
  if (!CONFIG.apps.some(a => a.aod)) return;
  CONFIG.apps.forEach(a => a.aod = false);
  logChange('⭐ App des Tages deaktiviert');
  saveConfig(); buildAll();
  showToast('App des Tages deaktiviert');
}

function addApp() {
  const name  = document.getElementById('f-name').value.trim();
  const datei = document.getElementById('f-datei').value.trim();
  const fach  = document.getElementById('f-fach').value;
  const emoji = document.getElementById('f-emoji').value.trim() || '📱';
  const desc  = document.getElementById('f-desc').value.trim();
  if (!name || !datei || !fach) { showToast('⚠ Name, Datei und Fach ausfüllen', true); return; }
  if (!isSafeLink(datei)) { showToast('⚠ Ungültiger Link – erlaubt: ordner/name.html (optional ?parameter) oder https://…', true); return; }
  if (CONFIG.apps.find(a => a.name === name)) { showToast('⚠ Name bereits vergeben', true); return; }
  CONFIG.apps.push({ name, datei, fach, emoji, beschreibung: desc, hidden: false, klassen: [], customTags: [], aod: false });
  ['f-name','f-datei','f-desc','f-emoji'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('f-fach').value = '';
  document.getElementById('emoji-preview').textContent = '📱';
  logChange(`➕ "${name}" hinzugefügt`);
  saveConfig(); buildAll();
}

let undoTimer = null, undoApp = null, undoIdx = null;

function deleteApp(name) {
  const idx = CONFIG.apps.findIndex(a => a.name === name);
  if (idx === -1) return;
  undoApp = CONFIG.apps[idx]; undoIdx = idx;
  CONFIG.apps.splice(idx, 1);
  logChange(`🗑 "${name}" gelöscht`);
  buildAll(); showUndo(name);
  clearTimeout(undoTimer);
  undoTimer = setTimeout(() => { undoApp = null; undoIdx = null; saveConfig(); hideUndo(); }, 8000);
}

function undoDelete() {
  if (!undoApp) return;
  clearTimeout(undoTimer);
  CONFIG.apps.splice(undoIdx, 0, undoApp);
  logChange(`↩ "${undoApp.name}" wiederhergestellt`);
  undoApp = null; undoIdx = null;
  hideUndo(); saveConfig(); buildAll();
}

function showUndo(name) {
  const bar = document.getElementById('undo-bar');
  bar.innerHTML = `<span>🗑 <strong>${escHtml(name)}</strong> gelöscht</span>
    <button onclick="undoDelete()" style="background:var(--red);border:none;color:#fff;padding:.3rem .9rem;border-radius:8px;cursor:pointer;font-family:inherit;font-weight:800;font-size:.8rem;">↩ Rückgängig</button>
    <span id="undo-cd" style="color:var(--muted);font-size:.75rem;">8s</span>`;
  bar.style.display = 'flex';
  let sec = 8;
  clearInterval(bar._iv);
  bar._iv = setInterval(() => { sec--; const cd = document.getElementById('undo-cd'); if (cd) cd.textContent = sec + 's'; if (sec <= 0) clearInterval(bar._iv); }, 1000);
}

function hideUndo() {
  const b = document.getElementById('undo-bar');
  if (b) { clearInterval(b._iv); b.style.display = 'none'; }
}
