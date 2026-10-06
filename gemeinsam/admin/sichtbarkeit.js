// ═══════════════════════════════════════════════════════
//  Lernwelt-Admin – Sichtbarkeit (alt, wird von ordnen.js ersetzt)
//  Teil von admin.html (Infrastruktur Etappe 6: Admin in Module zerlegt).
//  Alle Module teilen sich die globalen Variablen aus kern.js (CONFIG, ghSha …)
//  und werden in admin.html in fester Reihenfolge geladen.
// ═══════════════════════════════════════════════════════
'use strict';

// ── Visibility ────────────────────────────────────────
function buildVisibility() {
  const list = document.getElementById('vis-list');
  list.innerHTML = '';
  const faecher = currentCatOrder();
  if (!faecher.length) { list.innerHTML = '<div class="empty-msg">Noch keine Apps vorhanden.</div>'; return; }
  faecher.forEach((fach, i) => {
    const catHidden = CONFIG.hiddenCats.includes(fach);
    const apps = CONFIG.apps.filter(a => a.fach === fach);
    const block = document.createElement('div');
    block.className = 'vis-cat-block';
    block.innerHTML = `
      <div class="vis-cat-header">
        <span style="font-size:1.2rem;">${escHtml(CAT_ICONS[fach] || '📚')}</span>
        <span class="vis-cat-name">${escHtml(fach)} (${apps.length})</span>
        <div class="vis-order">
          <button class="vis-move" data-fach="${escHtml(fach)}" onclick="moveCat(this.dataset.fach, -1)" ${i === 0 ? 'disabled' : ''} title="Nach oben" aria-label="${escHtml(fach)} nach oben">▲</button>
          <button class="vis-move" data-fach="${escHtml(fach)}" onclick="moveCat(this.dataset.fach, 1)" ${i === faecher.length - 1 ? 'disabled' : ''} title="Nach unten" aria-label="${escHtml(fach)} nach unten">▼</button>
        </div>
        <button class="vis-toggle ${catHidden ? 'off' : 'on'}" data-fach="${escHtml(fach)}" onclick="toggleCat(this.dataset.fach)">${catHidden ? 'Ausgeblendet' : 'Sichtbar'}</button>
      </div>
      <div class="vis-app-list">
        ${apps.map(app => `
          <div class="vis-app-row">
            <span style="font-size:1.1rem;">${escHtml(app.emoji || '📱')}</span>
            <span class="vis-app-name" style="${app.hidden ? 'opacity:.38' : ''}">${escHtml(app.name)}</span>
            <button class="vis-toggle ${app.hidden ? 'off' : 'on'}" data-name="${escHtml(app.name)}" onclick="toggleHidden(this.dataset.name)">${app.hidden ? 'Ausgeblendet' : 'Sichtbar'}</button>
          </div>`).join('')}
      </div>`;
    list.appendChild(block);
  });
}

function toggleCat(fach) {
  const idx = CONFIG.hiddenCats.indexOf(fach);
  if (idx === -1) CONFIG.hiddenCats.push(fach); else CONFIG.hiddenCats.splice(idx, 1);
  logChange(`${CONFIG.hiddenCats.includes(fach) ? '🚫' : '✅'} Kategorie "${fach}" umgeschaltet`);
  saveConfig(); buildAll();
}

// Aktuelle Reihenfolge aller Fächer, die Apps haben (wie auf der Startseite)
function currentCatOrder() {
  return sortFaecher([...new Set(CONFIG.apps.map(a => a.fach).filter(Boolean))], CONFIG.catOrder);
}

function moveCat(fach, dir) {
  const order = currentCatOrder();
  const i = order.indexOf(fach), j = i + dir;
  if (i === -1 || j < 0 || j >= order.length) return;
  [order[i], order[j]] = [order[j], order[i]];
  CONFIG.catOrder = order;
  logChange(`↕ Kategorie "${fach}" ${dir < 0 ? 'nach oben' : 'nach unten'} verschoben`);
  saveConfig(); buildAll();
}
