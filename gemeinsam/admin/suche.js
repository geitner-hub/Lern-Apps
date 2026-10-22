// ═══════════════════════════════════════════════════════
//  Lernwelt-Admin – Globale Suche  (Admin-Umbau Etappe 4)
//  Lupe in der Kopfleiste oder Strg+K / ⌘K. Sucht in Modulen (Titel und Suchbegriffe = Einstellungen),
//  Apps, Gruppen (Sicherungskarten) und Medien. Pfeiltasten wählen, Enter öffnet, Esc schließt.
//  Ein Treffer öffnet das passende Modul; bei Apps und Medien steht der Name dort gleich im Suchfeld.
// ═══════════════════════════════════════════════════════
'use strict';

window.LWAdmin = window.LWAdmin || {};

(() => {
  let el = null, treffer = [], wahl = 0, gruppen = [], medien = [];
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss');

  /** Im Zielmodul ein Suchfeld füllen (nachdem es gezeichnet ist) */
  function feldFuellen(id, wert) {
    const f = document.getElementById(id);
    if (!f) return;
    f.value = wert;
    f.dispatchEvent(new Event('input', { bubbles: true }));
    if (id === 'app-search' && typeof filterAppList === 'function') filterAppList();
  }

  function eintraege() {
    const L = [];
    const bereich = id => LWAdmin.BEREICHE.find(b => b.id === id) || { titel: id, symbol: '' };
    LWAdmin.module().forEach(m => {
      const b = bereich(m.bereich);
      L.push({ art: 'Bereich', sym: m.symbol, titel: m.titel, unter: b.symbol + ' ' + b.titel, such: [m.titel, b.titel, ...m.suchbegriffe],
        los: () => LWAdmin.gehe(m.bereich, m.id) });
    });
    ((LWAdmin.store.daten() || {}).apps || []).forEach(a => L.push({
      art: 'App', sym: a.emoji || '📱', titel: a.name, unter: (a.fach || '') + ' · ' + (a.datei || '') + (a.hidden ? ' · versteckt' : ''),
      such: [a.name, a.fach, a.datei, a.beschreibung], los: () => LWAdmin.gehe('inhalte', 'apps', () => feldFuellen('app-search', a.name)),
    }));
    gruppen.forEach(g => L.push({ art: 'Gruppe', sym: '🗂', titel: g.name, unter: g.codes.length + ' Karten', such: [g.name, 'Gruppe'],
      los: () => LWAdmin.gehe('gruppen', 'karten') }));
    medien.forEach(m => L.push({ art: 'Medium', sym: '📁', titel: m.titel || m.code, unter: [m.ordner, m.code].filter(Boolean).join(' · '),
      such: [m.titel, m.untertitel, m.ordner, m.code, m.dateiname], los: () => LWAdmin.gehe('medien', 'dateien', () => feldFuellen('md-suche', m.titel || m.code)) }));
    return L;
  }

  function suchen(q) {
    const worte = norm(q).split(/\s+/).filter(Boolean);
    if (!worte.length) return [];
    return eintraege().map(e => {
      const t = norm(e.titel), alles = norm(e.such.join(' ')) + ' ' + t;
      if (!worte.every(w => alles.includes(w))) return null;
      const rang = t.startsWith(worte[0]) ? 0 : t.includes(worte[0]) ? 1 : 2;
      return { e, rang };
    }).filter(Boolean).sort((a, b) => a.rang - b.rang || a.e.titel.localeCompare(b.e.titel, 'de')).slice(0, 40).map(x => x.e);
  }

  function liste() {
    const box = el.querySelector('.lw-suche-liste'), q = el.querySelector('input').value;
    treffer = suchen(q);
    if (wahl >= treffer.length) wahl = 0;
    box.innerHTML = !q.trim() ? '<p class="lw-klein">Module, Einstellungen, Apps, Gruppen, Medien …</p>'
      : !treffer.length ? '<p class="lw-klein">Nichts gefunden.</p>'
      : treffer.map((t, i) => `<button type="button" class="lw-suche-treffer${i === wahl ? ' gewaehlt' : ''}" data-i="${i}" role="option" aria-selected="${i === wahl}">
          <span class="lw-zeile-sym">${escHtml(t.sym)}</span><span class="lw-suche-text"><b>${escHtml(t.titel)}</b><span class="lw-klein">${escHtml(t.unter)}</span></span>
          <span class="lw-marke">${t.art}</span></button>`).join('');
    const g = box.querySelector('.gewaehlt');
    if (g) g.scrollIntoView({ block: 'nearest' });
  }

  function oeffnen(t) { zu(); if (t) t.los(); }

  function anlegen() {
    el = document.createElement('div');
    el.id = 'lw-suche';
    el.hidden = true;
    el.innerHTML = `<div class="lw-suche-box" role="dialog" aria-modal="true" aria-label="Suche">
      <input type="search" placeholder="Suchen … (z. B. Spielsperre, Vokabeln, 5a)" autocomplete="off" aria-label="Suchbegriff" role="combobox" aria-expanded="true">
      <div class="lw-suche-liste" role="listbox"></div></div>`;
    document.body.appendChild(el);
    const inp = el.querySelector('input');
    inp.addEventListener('input', () => { wahl = 0; liste(); });
    inp.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { wahl = Math.min(wahl + 1, treffer.length - 1); liste(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { wahl = Math.max(wahl - 1, 0); liste(); e.preventDefault(); }
      else if (e.key === 'Enter') { oeffnen(treffer[wahl]); e.preventDefault(); }
      else if (e.key === 'Escape') zu();
    });
    el.addEventListener('click', e => {
      if (e.target === el) return zu();
      const b = e.target.closest('[data-i]');
      if (b) oeffnen(treffer[Number(b.dataset.i)]);
    });
  }

  function auf() {
    if (!document.getElementById('admin') || document.getElementById('admin').style.display === 'none') return;
    if (!el) anlegen();
    el.hidden = false;
    const inp = el.querySelector('input');
    inp.value = ''; wahl = 0; liste(); inp.focus();
    // Gruppen und Medien nachladen (einmal je Sitzung), Trefferliste dann neu
    LWAdmin.quellen.gruppen().then(g => { gruppen = g; if (!el.hidden) liste(); }).catch(() => {});
    LWAdmin.quellen.medien().then(m => { medien = m.eintraege; if (!el.hidden) liste(); }).catch(() => {});
  }
  function zu() { if (el) el.hidden = true; }

  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k') { e.preventDefault(); auf(); }
  });
  LWAdmin.suche = { auf, zu, suchen };
})();
