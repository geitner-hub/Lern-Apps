// ═══════════════════════════════════════════════════════
//  Admin-Modul Gruppen → Laufzettel  (Aktionsplan „Lernweg im English Journey“, Etappe 3)
//  Freigabe „bis Abschnitt“ je Gruppe, Klasse oder für alle – der Laufzettel im English Journey zeigt den Kindern die
//  Abschnitte bis einschließlich diesem (Hefteinträge danach bleiben unsichtbar). Beim Freigeben bekommen die neu sichtbaren
//  Hefteinträge ihre HE-Nummer, fortlaufend durchs Schuljahr in Weg-Reihenfolge; vergebene Nummern bleiben fest.
//  Mindestniveau je Gruppe/Klasse: die Kinder wählen ★/★★/★★★ selbst, aber nicht unter diesem (Abschnitte mit Niveaus).
//  Stand: config.journey = { schuljahr, wege: { journey6: { bis: { wer: Abschnitt-ID }, he: { Hefteintrag-ID: Nr }, niveau: { wer: 1–3 } } } }
//  (Worker validateConfig, pruefen.py Regel 23). Löst den Reiter „🗺️ Lernwege“ ab. Unit-Übersicht, Editoren, Klassenstand
//  und Schuljahreswechsel kommen mit dem Modul „🧭 English Journey“ (Etappe 6).
// ═══════════════════════════════════════════════════════
'use strict';

/** Freigabe „bis Abschnitt“ für wer (aid = '' → Eintrag weg, samt Mindestniveau) und HE-Nummern für die neu sichtbaren
 *  Hefteinträge (fortlaufend in Weg-Reihenfolge, vergebene bleiben). Auch für Inhalte → 🧭 English Journey („frei bis hier“). */
LWAdmin.laufzettelFreigeben = function (store, J, wer, aid, text) {
  const WEG = 'journey6';
  const liste = J.units.flatMap(u => u.abschnitte || []);
  const schuljahr = () => { const d = new Date(), y = d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1; return `${y}/${String((y + 1) % 100).padStart(2, '0')}`; };
  store.aendern(text, c => {
    const jy = c.journey && typeof c.journey === 'object' ? c.journey : (c.journey = {});
    if (!jy.schuljahr) jy.schuljahr = schuljahr();
    const wege = jy.wege && typeof jy.wege === 'object' ? jy.wege : (jy.wege = {});
    const w = wege[WEG] && typeof wege[WEG] === 'object' ? wege[WEG] : (wege[WEG] = {});
    const bis = w.bis && typeof w.bis === 'object' ? w.bis : (w.bis = {});
    if (aid) bis[wer] = aid;
    else { delete bis[wer]; ['niveau', 'reihenfolge'].forEach(k => { if (w[k]) { delete w[k][wer]; if (!Object.keys(w[k]).length) delete w[k]; } }); }
    const ids = liste.map(a => a.id), max = Math.max(-1, ...Object.values(bis).map(x => ids.indexOf(x)));
    const he = w.he && typeof w.he === 'object' ? w.he : (w.he = {});
    let nr = Math.max(0, ...Object.values(he).map(Number).filter(Number.isFinite));
    const gesehen = new Set();
    liste.slice(0, max + 1).forEach(a => a.schritte.forEach(s => {
      if (s.art !== 'hefteintrag' || gesehen.has(s.baustein)) return;
      gesehen.add(s.baustein);
      if (!he[s.baustein]) he[s.baustein] = ++nr;
    }));
    if (!Object.keys(bis).length) delete w.bis;
    if (!Object.keys(he).length) delete w.he;
  });
};

LWAdmin.modul({
  id: 'laufzettel', bereich: 'gruppen', titel: 'Laufzettel', symbol: '📒', reihenfolge: 3,
  suchbegriffe: ['Laufzettel', 'Lernweg', 'English Journey', 'Hefteintrag', 'HE-Nummer', 'Abschnitt', 'freigeben', 'Stationen'],
  zeigen(host, { store }) {
    const e = s => escHtml(String(s == null ? '' : s));
    const ROOT = new URL('./', location.href).href, WEG = 'journey6';
    let aktiv = true, J = null, fehler = '', gruppen = [], neuWer = '';

    // Alle Abschnitte in Weg-Reihenfolge
    const abschnitte = () => (J ? J.units.flatMap(u => (u.abschnitte || []).map(a => ({ a, u }))) : []);
    const weg = c => ((c.journey || {}).wege || {})[WEG] || {};
    const klassen = c => { const k = new Set(); (c.apps || []).forEach(a => (a.klassen || []).forEach(x => k.add(x))); return [...k].sort((a, b) => a - b); };
    const werName = w => w === 'alle' ? '👥 Alle' : /^k\d+$/.test(w) ? '🎒 Klasse ' + w.slice(1)
      : '🪪 ' + (gruppen.find(g => 'g:' + g.id === w) || { name: 'Gruppe ' + w.slice(2, 8) + '…' }).name;

    /** bis setzen (aid = '' → Eintrag weg) und neu sichtbare Hefteinträge nummerieren */
    function setzen(wer, aid) {
      const titel = aid ? (abschnitte().find(x => x.a.id === aid) || { a: { titel: aid } }).a.titel : '';
      LWAdmin.laufzettelFreigeben(store, J, wer, aid, `📒 Laufzettel ${werName(wer).replace(/^\S+ /, '')}: ${aid ? 'frei bis „' + titel + '“' : 'nichts frei'}`);
    }

    /** Mindestniveau setzen (1 = keine Vorgabe) */
    /** Reihenfolge setzen ('schritt' = Standard, kein Eintrag) */
    function reihenfolgeSetzen(wer, r) {
      store.aendern(`📒 Laufzettel ${werName(wer).replace(/^\S+ /, '')}: Reihenfolge ${{ frei: 'frei', schritt: 'Schritt für Schritt', streng: 'streng' }[r]}`, c => {
        const w = c.journey && c.journey.wege && c.journey.wege[WEG];
        if (!w) return;
        const m = w.reihenfolge && typeof w.reihenfolge === 'object' ? w.reihenfolge : (w.reihenfolge = {});
        if (r !== 'schritt') m[wer] = r; else delete m[wer];
        if (!Object.keys(m).length) delete w.reihenfolge;
      });
    }
    const reihenfolgeAuswahl = (wer, r) => `<select data-lz-reihe="${e(wer)}" aria-label="Reihenfolge für ${e(werName(wer))}" title="In welcher Reihenfolge öffnen sich die Abschnitte?">
      ${[['schritt', 'Schritt für Schritt'], ['streng', 'streng (auch Apps)'], ['frei', 'frei (alles offen)']].map(([v, t]) => `<option value="${v}"${(r || 'schritt') === v ? ' selected' : ''}>${t}</option>`).join('')}</select>`;

    function niveauSetzen(wer, n) {
      store.aendern(`📒 Laufzettel ${werName(wer).replace(/^\S+ /, '')}: Mindestniveau ${['', '★ (frei)', '★★', '★★★'][n]}`, c => {
        const w = c.journey && c.journey.wege && c.journey.wege[WEG];
        if (!w) return;
        const m = w.niveau && typeof w.niveau === 'object' ? w.niveau : (w.niveau = {});
        if (n > 1) m[wer] = n; else delete m[wer];
        if (!Object.keys(m).length) delete w.niveau;
      });
    }
    const niveauAuswahl = (wer, n) => `<select data-lz-niveau="${e(wer)}" aria-label="Mindestniveau für ${e(werName(wer))}" title="Mindestniveau – die Kinder wählen selbst, aber nicht darunter">
      ${[[1, 'Niveau frei wählbar'], [2, 'mindestens ★★'], [3, 'mindestens ★★★']].map(([v, t]) => `<option value="${v}"${(n || 1) === v ? ' selected' : ''}>${t}</option>`).join('')}</select>`;

    function auswahl(wer, aktuell) {
      const gruppenweise = J.units.map(u => `<optgroup label="Unit ${u.nr}: ${e(u.titel)}">${(u.abschnitte || []).map(a =>
        `<option value="${e(a.id)}"${a.id === aktuell ? ' selected' : ''}>${e(a.titel)}${a.buch ? ` (S. ${a.buch.von}${a.buch.bis !== a.buch.von ? '–' + a.buch.bis : ''})` : ''}</option>`).join('')}</optgroup>`).join('');
      return `<select data-lz-wer="${e(wer)}" aria-label="Frei bis Abschnitt für ${e(werName(wer))}"><option value="">— nichts frei —</option>${gruppenweise}</select>`;
    }

    function zeichnen() {
      if (!aktiv) return;
      if (!J) { host.innerHTML = `<div class="lw-karte">${fehler ? '⚠ ' + e(fehler) : 'lädt …'}</div>`; return; }
      const c = store.daten() || {}, w = weg(c), bis = w.bis || {}, he = w.he || {}, nv = w.niveau || {};
      const optionen = ['alle', ...klassen(c).map(k => 'k' + k), ...gruppen.map(g => 'g:' + g.id)];
      const zeilen = Object.keys(bis).map(wer => `<div class="lw-knoepfe" style="align-items:center;margin:.35rem 0">
          <b style="min-width:11rem">${e(werName(wer))}</b>${auswahl(wer, bis[wer])}${niveauAuswahl(wer, nv[wer])}${reihenfolgeAuswahl(wer, (w.reihenfolge || {})[wer])}
          <a class="lw-btn klein" href="apps/englisch/english-journey.html#u=${e((J.units.find(u => (u.abschnitte || []).some(a => a.id === bis[wer])) || J.units[0]).id)}&w=" target="_blank" rel="noopener">👀 Vorschau</a></div>`).join('');
      const frei = optionen.filter(x => !(x in bis));
      const nummern = Object.entries(he).sort((a, b) => a[1] - b[1]);
      const titel = id => { for (const { a } of abschnitte()) if (a.schritte.some(s => s.baustein === id)) return a.titel; return id; };
      host.innerHTML = `<div class="lw-karte"><h2>📒 Laufzettel im English Journey</h2>
          <p>Die Kinder sehen im Laufzettel alle Abschnitte bis einschließlich dem gewählten – mit Buchseiten, Hefteinträgen, Übungen und Apps.
          Was danach kommt, bleibt unsichtbar. Das Niveau (★ Basis · ★★ Standard · ★★★ Profi) wählen die Kinder selbst – mit einem Mindestniveau
          nicht darunter. Reihenfolge: <b>Schritt für Schritt</b> (Standard) öffnet den nächsten Abschnitt, wenn Hefteintrag und Übungen des vorigen abgehakt
          sind; <b>streng</b> verlangt auch die App; <b>frei</b> lässt alles offen (z. B. Wiederholung vor der Probe).
          Gilt der Reihe nach: Gruppe vor Klasse vor „Alle“. Wirkt nach dem Veröffentlichen (oben).</p>
          ${zeilen || '<p class="lw-klein">Noch nichts freigegeben – die Kinder sehen den Laufzettel-Knopf erst, wenn hier etwas eingestellt ist.</p>'}
          ${frei.length ? `<div class="lw-knoepfe" style="margin-top:.8rem"><select data-lz-neu aria-label="Für wen?"><option value="">+ Freigabe für …</option>
            ${frei.map(x => `<option value="${e(x)}"${x === neuWer ? ' selected' : ''}>${e(werName(x))}</option>`).join('')}</select>
            ${neuWer ? auswahl(neuWer, '') : ''}</div>` : ''}</div>
        <div class="lw-karte"><h2>Hefteintrag-Nummern${c.journey && c.journey.schuljahr ? ' · Schuljahr ' + e(c.journey.schuljahr) : ''}</h2>
          <p class="lw-klein">Werden beim Freigeben vergeben, fortlaufend in der Reihenfolge des Wegs, und bleiben danach fest – so wie im echten Heft.</p>
          ${nummern.length ? `<ol style="margin:.4rem 0 0 1.2rem;line-height:1.7">${nummern.map(([id, n]) => `<li value="${Number(n)}"><b>HE ${Number(n)}</b> · ${e(titel(id))} <code>${e(id)}</code></li>`).join('')}</ol>`
            : '<p class="lw-klein">Noch keine.</p>'}</div>`;
    }

    const aenderung = ev => {
      const t = ev.target;
      if (t.matches('[data-lz-neu]')) { neuWer = t.value; zeichnen(); return; }
      if (t.matches('[data-lz-niveau]')) { niveauSetzen(t.dataset.lzNiveau, Number(t.value)); return; }
      if (t.matches('[data-lz-reihe]')) { reihenfolgeSetzen(t.dataset.lzReihe, t.value); return; }
      if (t.matches('[data-lz-wer]')) { const wer = t.dataset.lzWer; if (wer === neuWer) neuWer = ''; setzen(wer, t.value); }
    };
    host.addEventListener('change', aenderung);
    const ab = store.abonnieren(zeichnen);
    zeichnen();
    fetch(ROOT + 'daten/journey6.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status)))
      .then(d => { J = d; }).catch(x => { fehler = 'daten/journey6.json nicht geladen: ' + (x.message || x); }).then(zeichnen);
    LWAdmin.quellen.gruppen().then(g => { gruppen = g; }).catch(() => {}).then(zeichnen);
    return () => { aktiv = false; ab(); host.removeEventListener('change', aenderung); };
  },
});
