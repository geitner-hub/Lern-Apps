// ═══════════════════════════════════════════════════════
//  Lernwelt-Admin – Pass-Übersicht und Dashboard
//  Teil von admin.html (Infrastruktur Etappe 6: Admin in Module zerlegt).
//  Alle Module teilen sich die globalen Variablen aus kern.js (CONFIG, ghSha …)
//  und werden in admin.html in fester Reihenfolge geladen.
// ═══════════════════════════════════════════════════════
'use strict';

function rarBadge(key) {
  const r = LernPass.RARITY[key] || { name: key, farbe: '#94a3b8' };
  return `<span class="rar" style="color:${r.farbe};border-color:${r.farbe}66">${escHtml(r.name)}</span>`;
}

function buildPassOverview() {
  const P = LernPass, R = P.RULES;
  const truhe = P.ITEMS.filter(i => i.quelle === 'truhe');
  const rars = ['gewoehnlich', 'selten', 'episch'];
  const wSum = rars.filter(k => truhe.some(i => i.selten === k)).reduce((s, k) => s + (P.RARITY[k].gewicht || 0), 0);
  const maxLvl = P.LEVEL_TITLES.length + 5;

  const lvlRows = Array.from({ length: maxLvl }, (_, i) => {
    const n = i + 1, info = P.levelInfo(P.xpForLevel(n));
    return `<tr><td>${n}</td><td>${P.xpForLevel(n).toLocaleString('de-DE')}</td><td>${n > 1 ? '+' + (P.xpForLevel(n) - P.xpForLevel(n - 1)) : '–'}</td><td><b>${escHtml(info.title)}</b></td></tr>`;
  }).join('');

  const rules = [
    ['Abschluss einer Runde', `${R.baseXp} XP (unter ${R.lowPct} % richtig: ${R.baseXpLow} XP)`],
    ['Leistung', `bis ${R.perfXpMax} XP, linear ab ${R.perfFromPct} %; volle Punkte ab ${R.fullSizeItems} Aufgaben pro Runde`],
    ['Neuer Rekord in einer App', `+${R.recordXp} XP (ab ${R.recordMinPct} %)`],
    ['Erste gute Runde des Tages', `+${R.firstOfDayXp} XP (ab ${R.goodPct} %)`],
    ['Durchklick-Schutz', `unter ${R.minSeconds} s → 0 XP; unter ${R.rushSeconds} s und unter ${R.goodPct} % → 0 XP`],
    ['Runden pro App und Tag', `${R.fullRoundsPerApp} voll, bis ${R.halfRoundsPerApp} halb, danach 0 XP`],
    ['Tages-Obergrenze', `ab ${R.dailySoftCap} XP pro Tag nur noch halbe XP`],
    ['Apps jüngerer Klassen', `× ${R.lowerClassFactor}`],
    ['Wochenziel', `${R.weekGoalDays} Tage mit mind. ${R.goodPct} %; Wochen ohne Übung pausieren die Serie`],
    ['Sterne', `🥉 ${R.starPct[0]} % · 🥈 ${R.starPct[1]} % · 🥇 ${R.starPct[2]} % – jeweils an ${R.starDays} verschiedenen Tagen`],
    ['Truhen', `alle ${R.chestEveryXp} XP eine Truhe; bei aktivem Event ${Math.round(R.eventChestShare * 100)} % Event-Teile; ${R.eventGiftChests} Geschenk-Truhe je Event und Schuljahr`],
    ['Level-Truhen', 'bei jedem Level-Aufstieg eine Truhe (im Saison-Modus jedes Schuljahr neu); zieht nur aus dem normalen Truhen-Pool, ohne Event-Teile; wird vor den anderen Truhen geöffnet'],
  ].map(([a, b]) => `<tr><td><b>${escHtml(a)}</b></td><td>${escHtml(b)}</td></tr>`).join('');

  const chanceRows = rars.map(k => {
    const n = truhe.filter(i => i.selten === k).length;
    const pct = wSum ? Math.round(((P.RARITY[k].gewicht || 0) / wSum) * 100) : 0;
    return `<tr><td>${rarBadge(k)}</td><td>${pct} %</td><td>${n} Teile</td><td>${n ? (pct / n).toFixed(1).replace('.', ',') + ' % je Teil' : '–'}</td></tr>`;
  }).join('');

  const badgeRows = P.BADGES.map(b => {
    const reward = P.ITEMS.filter(i => i.quelle === 'set' && i.set === b.id);
    return `<tr><td style="font-size:1.3rem">${escHtml(b.icon)}</td><td><b>${escHtml(b.name)}</b></td><td>${escHtml(b.text)}</td>
      <td>${reward.length ? reward.map(i => `${P.itemPreviewHTML(i)} ${escHtml(i.name)}`).join('<br>') : '–'}</td></tr>`;
  }).join('');

  const itemRows = slot => P.ITEMS.filter(i => i.slot === slot).map(i =>
    `<tr><td>${P.itemPreviewHTML(i)}</td><td><b>${escHtml(i.name)}</b><div style="font-size:.66rem;color:var(--muted)">${escHtml(i.id)}</div></td><td>${rarBadge(i.selten)}</td><td>${escHtml(P.itemSourceText(i))}</td></tr>`).join('');

  const eventBlocks = P.EVENTS.map(ev => {
    const items = P.ITEMS.filter(i => i.event === ev.id);
    const set = P.ITEMS.filter(i => i.quelle === 'set' && i.set === 'event-' + ev.id);
    const on = passCfg().events[ev.id] === true;
    return `<tr><td style="font-size:1.4rem">${escHtml(ev.icon)}</td><td><b>${escHtml(ev.name)}</b><br><span style="color:${on ? 'var(--green)' : 'var(--muted)'};font-size:.72rem;font-weight:800">${on ? '● aktiv' : '○ aus'}</span></td>
      <td>${items.map(i => `${P.itemPreviewHTML(i)}`).join(' ')}</td><td>${set.map(i => `${P.itemPreviewHTML(i)} ${escHtml(i.name)}`).join('<br>') || '–'}</td></tr>`;
  }).join('');

  const counts = { truhe: truhe.length, set: P.ITEMS.filter(i => i.quelle === 'set').length, event: P.ITEMS.filter(i => i.quelle === 'event').length, start: P.ITEMS.filter(i => i.quelle === 'start').length };

  document.getElementById('pass-overview').innerHTML = `
    <details open><summary>🏷 Level & Titel (${P.LEVEL_TITLES.length} Titel)</summary><div class="ov-body">
      <p class="note">Jedes Level braucht 50 XP mehr als das vorherige. Nach Level ${P.LEVEL_TITLES.length} geht es mit „${escHtml(P.LEVEL_TITLES[P.LEVEL_TITLES.length - 1])} ★ … ★★★★★“ weiter. Richtwerte für ein Schuljahr: nur Aufwärmen im Unterricht ≈ Level 11, mit Übung daheim ≈ Level 15, sehr fleißig ≈ Level 20.</p>
      <table><thead><tr><th>Level</th><th>ab XP</th><th>Schritt</th><th>Titel</th></tr></thead><tbody>${lvlRows}</tbody></table></div></details>
    <details><summary>⭐ XP-Regeln & Schutz vor Tricks</summary><div class="ov-body">
      <table><tbody>${rules}</tbody></table></div></details>
    <details><summary>🎁 Truhen-Chancen</summary><div class="ov-body">
      <p class="note">Eine Truhe wählt zuerst die Seltenheit (nur unter Stufen, in denen dem Kind noch Teile fehlen) und dann ein fehlendes Teil. Es gibt keine doppelten Teile. Hat ein Kind alles, gibt es ✨ Sternenstaub.</p>
      <table><thead><tr><th>Seltenheit</th><th>Chance</th><th>Pool</th><th>je Teil</th></tr></thead><tbody>${chanceRows}</tbody></table></div></details>
    <details><summary>🏅 Abzeichen (${P.BADGES.length})</summary><div class="ov-body">
      <table><thead><tr><th></th><th>Name</th><th>Bedingung</th><th>Belohnung</th></tr></thead><tbody>${badgeRows}</tbody></table></div></details>
    <details><summary>👕 Avatar-Teile (${P.ITEMS.length}: ${counts.start} Start · ${counts.truhe} Truhe · ${counts.set} Abzeichen · ${counts.event} Event)</summary><div class="ov-body">
      ${Object.entries(P.SLOTS).map(([slot, info]) => `<h4 style="margin:.8rem 0 .3rem;color:var(--accent);font-size:.85rem">${info.icon} ${escHtml(info.name)}</h4>
        <table><thead><tr><th>Vorschau</th><th>Name</th><th>Seltenheit</th><th>Quelle</th></tr></thead><tbody>${itemRows(slot)}</tbody></table>`).join('')}
    </div></details>
    <details><summary>🎉 Events (${P.EVENTS.length})</summary><div class="ov-body">
      <table><thead><tr><th></th><th>Event</th><th>Teile in Truhen</th><th>Abzeichen-Belohnung</th></tr></thead><tbody>${eventBlocks}</tbody></table></div></details>`;
}

// ── Dashboard ─────────────────────────────────────────
function buildDashboard() {
  const ps = document.getElementById('pass-status');
  if (ps && window.LernPass) {
    const c = passCfg();
    const evs = LernPass.EVENTS.filter(e => c.events[e.id] === true);
    ps.innerHTML = `Saison-Modus: <b style="color:${c.seasons ? 'var(--green)' : 'var(--muted)'}">${c.seasons ? 'an' : 'aus'}</b> · Avatar: <b style="color:${c.avatar ? 'var(--green)' : 'var(--muted)'}">${c.avatar ? 'an' : 'aus'}</b> · Events: ${evs.length ? evs.map(e => escHtml(e.icon + ' ' + e.name)).join(', ') : 'keine'}`;
  }
  const total   = CONFIG.apps.length;
  const visible = CONFIG.apps.filter(a => !a.hidden).length;
  const hidden  = CONFIG.apps.filter(a => a.hidden).length;
  const aodApp  = CONFIG.apps.find(a => a.aod);
  const faecher = [...new Set(CONFIG.apps.map(a => a.fach).filter(Boolean))].length;

  document.getElementById('dash-stats').innerHTML = `
    <div class="dash-card accent-card"><div class="dash-card-label">Gesamt Apps</div><div class="dash-card-value">${total}</div><div class="dash-card-sub">${faecher} Fächer</div></div>
    <div class="dash-card green-card"><div class="dash-card-label">Sichtbar</div><div class="dash-card-value">${visible}</div><div class="dash-card-sub">für Schüler</div></div>
    <div class="dash-card red-card"><div class="dash-card-label">Versteckt</div><div class="dash-card-value">${hidden}</div><div class="dash-card-sub">nicht sichtbar</div></div>
    <div class="dash-card"><div class="dash-card-label">Custom Tags</div><div class="dash-card-value">${CONFIG.customTags.length}</div><div class="dash-card-sub">angelegt</div></div>
    <div class="dash-card"><div class="dash-card-label">Banner</div><div class="dash-card-value" style="font-size:1.3rem;">${CONFIG.announcement?.active ? '🟢 AN' : '⚪ AUS'}</div><div class="dash-card-sub">${CONFIG.announcement?.active ? 'aktiv' : 'inaktiv'}</div></div>`;

  document.getElementById('aod-info').innerHTML = aodApp
    ? `<div class="aod-row">
         <span style="font-size:1.5rem;">${escHtml(aodApp.emoji || '📱')}</span>
         <strong style="color:#fff;">${escHtml(aodApp.name)}</strong>
         <span style="color:var(--muted);">· ${escHtml(aodApp.fach)}</span>
         ${aodApp.hidden ? '<span style="color:var(--red);font-size:.78rem;">(App ist versteckt – wird nicht angezeigt)</span>' : ''}
         <button class="btn danger sm" onclick="clearAod()">✕ Deaktivieren</button>
       </div>`
    : `<span style="color:var(--muted);font-size:.85rem;">Keine App des Tages gesetzt. Setzen über ⭐ im Reiter „Apps“.</span>`;

  const cl = document.getElementById('changelog-list');
  cl.innerHTML = changelog.length
    ? changelog.slice().reverse().map(e => `
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:9px;padding:.6rem .9rem;font-size:.83rem;display:flex;align-items:center;gap:.7rem;">
          <span style="color:var(--muted);font-size:.7rem;flex-shrink:0;">${e.time}</span>
          <span style="flex:1;">${escHtml(e.msg)}</span>
        </div>`).join('')
    : '<div class="empty-msg">Noch keine Änderungen in dieser Sitzung.</div>';
}

function logChange(msg) {
  const now = new Date();
  changelog.push({ time: now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }), msg });
  if (changelog.length > 20) changelog.shift();
}
