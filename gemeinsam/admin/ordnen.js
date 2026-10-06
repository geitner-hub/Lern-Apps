// ═══════════════════════════════════════════════════════
//  Lernwelt-Admin – Ordnen: Fächer, Regale (Gruppen) und Apps per Ziehen   (Etappe 6)
//  Teil von admin.html. Ziehen mit SortableJS (vendor/Sortable.min.js, MIT-Lizenz),
//  funktioniert mit Finger und Maus.
//
//  Datenmodell in config.json:
//    gruppen: [{ id, fach, name }]   Regale; Reihenfolge = Reihenfolge im Array
//    apps[].gruppe                   id des Regals (fehlt = „ohne Regal“)
//    Reihenfolge der Apps            = Reihenfolge in apps[] (wie bisher)
//    catOrder / hiddenCats           Reihenfolge und Ausblenden der Fächer (wie bisher)
//  Die Startseite zeigt Apps ohne Regal wie bisher, darunter jedes Regal als eine Zeile.
// ═══════════════════════════════════════════════════════
'use strict';

const VORSCHAU_KEY = 'lernwelt-admin-vorschau';
let ordnenSortables = [];

function gruppenListe() {
  if (!Array.isArray(CONFIG.gruppen)) CONFIG.gruppen = [];
  return CONFIG.gruppen;
}
/** Fächer in Startseiten-Reihenfolge: alle mit Apps oder Regalen */
function ordnenFaecher() {
  const da = new Set([...CONFIG.apps.map(a => a.fach), ...gruppenListe().map(g => g.fach)].filter(Boolean));
  return sortFaecher([...da], CONFIG.catOrder);
}

function ordnenChip(app) {
  const i = CONFIG.apps.indexOf(app);
  return `<div class="o-app${app.hidden ? ' versteckt' : ''}" data-i="${i}" title="${escHtml(app.datei || '')}">
      <span>${escHtml(app.emoji || '📱')}</span><span>${escHtml(app.name)}</span>
      <button type="button" data-name="${escHtml(app.name)}" onclick="event.stopPropagation();toggleHidden(this.dataset.name)"
        aria-label="${escHtml(app.name)} ${app.hidden ? 'einblenden' : 'ausblenden'}">${app.hidden ? '🚫' : '👁'}</button></div>`;
}

function buildOrdnen() {
  const host = document.getElementById('ordnen');
  if (!host) return;
  ordnenSortables.forEach(s => { try { s.destroy(); } catch (e) {} });
  ordnenSortables = [];
  const gr = gruppenListe();
  host.innerHTML = ordnenFaecher().map(fach => {
    const apps = CONFIG.apps.filter(a => a.fach === fach);
    const regale = gr.filter(g => g.fach === fach);
    const ids = new Set(regale.map(g => g.id));
    const aus = (CONFIG.hiddenCats || []).includes(fach);
    return `<div class="o-fach${aus ? ' aus' : ''}" data-fach="${escHtml(fach)}">
      <div class="o-fkopf">
        <span class="o-griff" title="Fach verschieben">⠿</span>
        <span>${escHtml((CAT_ICONS && CAT_ICONS[fach]) || '📚')}</span>
        <span class="o-fname">${escHtml(fach)} <small style="color:var(--muted);font-weight:700">(${apps.length})</small></span>
        <button class="btn sm" data-fach="${escHtml(fach)}" onclick="regalNeu(this.dataset.fach)">+ Regal</button>
        <button class="vis-toggle ${aus ? 'off' : 'on'}" data-fach="${escHtml(fach)}" onclick="toggleCat(this.dataset.fach)">${aus ? 'Ausgeblendet' : 'Sichtbar'}</button>
      </div>
      <div class="o-regal"><div class="o-rkopf"><span class="o-rname">Ohne Regal</span></div>
        <div class="o-apps" data-gruppe="">${apps.filter(a => !a.gruppe || !ids.has(a.gruppe)).map(ordnenChip).join('')}</div></div>
      <div class="o-regale">${regale.map(g => `
        <div class="o-regal" data-gruppe="${escHtml(g.id)}">
          <div class="o-rkopf"><span class="o-griff" title="Regal verschieben">⠿</span><span class="o-rname">📂 ${escHtml(g.name)}</span>
            <button class="icon-btn" data-id="${escHtml(g.id)}" onclick="regalUmbenennen(this.dataset.id)" title="Umbenennen">✏️</button>
            <button class="icon-btn on-red" data-id="${escHtml(g.id)}" onclick="regalLoeschen(this.dataset.id)" title="Regal auflösen">🗑</button></div>
          <div class="o-apps" data-gruppe="${escHtml(g.id)}">${apps.filter(a => a.gruppe === g.id).map(ordnenChip).join('')}</div>
        </div>`).join('')}</div>
    </div>`;
  }).join('') || '<div class="empty-msg">Noch keine Apps vorhanden.</div>';

  if (!window.Sortable) {
    host.insertAdjacentHTML('afterbegin', '<p class="empty-msg">⚠ Ziehen nicht verfügbar (vendor/Sortable.min.js fehlt).</p>');
    return;
  }
  const opt = { animation: 150, delay: 150, delayOnTouchOnly: true, ghostClass: 'sortable-ghost', chosenClass: 'sortable-chosen' };
  ordnenSortables.push(Sortable.create(host, { ...opt, handle: '.o-fkopf .o-griff', draggable: '.o-fach',
    onEnd: e => { if (e.oldIndex !== e.newIndex) ordnungUebernehmen(`↕ Fach „${e.item.dataset.fach}“ verschoben`); } }));
  host.querySelectorAll('.o-regale').forEach(el => ordnenSortables.push(Sortable.create(el, { ...opt, handle: '.o-griff', draggable: '.o-regal',
    onEnd: e => { if (e.oldIndex !== e.newIndex) ordnungUebernehmen('↕ Regal verschoben'); } })));
  host.querySelectorAll('.o-apps').forEach(el => ordnenSortables.push(Sortable.create(el, { ...opt, group: 'lw-apps', draggable: '.o-app', filter: 'button', preventOnFilter: false,
    onEnd: e => {
      if (e.from === e.to && e.oldIndex === e.newIndex) return;
      const app = CONFIG.apps[+e.item.dataset.i];
      const ziel = e.to.dataset.gruppe ? (gruppenListe().find(g => g.id === e.to.dataset.gruppe) || {}).name : 'ohne Regal';
      const fach = e.to.closest('.o-fach').dataset.fach;
      ordnungUebernehmen(e.from === e.to ? `🔀 „${app ? app.name : 'App'}“ verschoben` : `📂 „${app ? app.name : 'App'}“ → ${fach}${ziel ? ' · ' + ziel : ''}`);
    } })));
}

/** Liest die Reihenfolge aus der Ansicht und schreibt sie in CONFIG (Entwurf) */
function ordnungUebernehmen(msg) {
  const host = document.getElementById('ordnen');
  const vorher = JSON.stringify([CONFIG.apps, CONFIG.gruppen, CONFIG.catOrder]);
  const apps = [], gr = [], faecher = [];
  host.querySelectorAll(':scope > .o-fach').forEach(fb => {
    const fach = fb.dataset.fach;
    faecher.push(fach);
    fb.querySelectorAll('.o-regale > .o-regal').forEach(r => {
      const g = gruppenListe().find(x => x.id === r.dataset.gruppe);
      if (g && !gr.includes(g)) { g.fach = fach; gr.push(g); }
    });
    fb.querySelectorAll('.o-apps').forEach(box => box.querySelectorAll('.o-app').forEach(ch => {
      const app = CONFIG.apps[+ch.dataset.i];
      if (!app || apps.includes(app)) return;
      app.fach = fach;
      if (box.dataset.gruppe) app.gruppe = box.dataset.gruppe; else delete app.gruppe;
      apps.push(app);
    }));
  });
  CONFIG.apps.forEach(a => { if (!apps.includes(a)) apps.push(a); });         // Apps ohne Fach o. Ä. bleiben erhalten
  gruppenListe().forEach(g => { if (!gr.includes(g)) gr.push(g); });
  CONFIG.apps = apps;
  CONFIG.gruppen = gr;
  CONFIG.catOrder = [...faecher, ...(CONFIG.catOrder || []).filter(f => !faecher.includes(f))];
  if (JSON.stringify([CONFIG.apps, CONFIG.gruppen, CONFIG.catOrder]) === vorher) return;
  logChange(msg || '🔀 Reihenfolge geändert');
  saveConfig(); buildAll();
}

function regalNeu(fach) {
  const name = (prompt(`Name des neuen Regals in „${fach}“ (z. B. Kopfrechnen, Geometrie):`) || '').trim().slice(0, 40);
  if (!name) return;
  const basis = 'g-' + name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24);
  let id = basis || 'g-regal', n = 2;
  while (gruppenListe().some(g => g.id === id)) id = basis + '-' + n++;
  gruppenListe().push({ id, fach, name });
  logChange(`📂 Regal „${name}“ in ${fach} angelegt`);
  saveConfig(); buildAll();
}
function regalUmbenennen(id) {
  const g = gruppenListe().find(x => x.id === id);
  if (!g) return;
  const name = (prompt('Neuer Name des Regals:', g.name) || '').trim().slice(0, 40);
  if (!name || name === g.name) return;
  logChange(`✏️ Regal „${g.name}“ → „${name}“`);
  g.name = name;
  saveConfig(); buildAll();
}
function regalLoeschen(id) {
  const g = gruppenListe().find(x => x.id === id);
  if (!g) return;
  const n = CONFIG.apps.filter(a => a.gruppe === id).length;
  if (!confirm(`Regal „${g.name}“ auflösen?${n ? `\n\nDie ${n} App${n === 1 ? '' : 's'} darin bleiben im Fach (ohne Regal).` : ''}`)) return;
  CONFIG.apps.forEach(a => { if (a.gruppe === id) delete a.gruppe; });
  CONFIG.gruppen = gruppenListe().filter(x => x !== g);
  logChange(`🗑 Regal „${g.name}“ aufgelöst`);
  saveConfig(); buildAll();
}

/** Schülervorschau: Startseite mit dem aktuellen Stand (auch unveröffentlicht) für eine Klasse */
function vorschauOeffnen() {
  const kl = (document.getElementById('vorschau-klasse') || {}).value || 'all';
  try { localStorage.setItem(VORSCHAU_KEY, JSON.stringify(CONFIG)); }
  catch (e) { showToast('⚠ Vorschau nicht möglich (Speicher voll)', true); return; }
  window.open('index.html?vorschau=' + encodeURIComponent(kl), '_blank');
}
