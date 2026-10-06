// ═══════════════════════════════════════════════════════
//  Lernwelt-Admin – Banner (Link-Check und Vokabel-Ansicht im Okt. 2026 entfernt)
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
