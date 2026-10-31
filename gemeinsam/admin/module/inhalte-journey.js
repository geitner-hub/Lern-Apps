// ═══════════════════════════════════════════════════════
//  Admin-Modul Inhalte → 🧭 English Journey  (Aktionsplan „Lernweg im English Journey“, Etappe 6)
//
//  Der Laufzettel des English Journey ohne JSON:
//    📋 Übersicht   – je Unit eine Zeile je Abschnitt (Buchseiten, Hefteintrag, Übungen, Apps, frei für, Klasse) mit
//                     Lückenprüfung; „frei bis hier“ je Gruppe/Klasse (LWAdmin.laufzettelFreigeben, HE-Nummern dabei);
//                     Vorschau als Kind
//    ✏️ Bearbeiten  – Abschnitte anlegen, ordnen, ändern; Schritte (Hefteintrag mit Grün/Fett und Vorschau, Buchaufgabe,
//                     eigene Übung mit Lösung, App-Station, Zusatz-App, Lesen, Vokabelheft …); Kann-Sätze fürs Finale
//    👥 Klasse      – je Gruppe und Abschnitt: wie viele iPads Hefteintrag, Übungen und Abschnitt erledigt haben (mit
//                     Niveau), „HE 5 sitzt bei 7 Kindern nicht“ – anonym aus der Gruppenauswertung (jw:…, gemeinsam/sync.js)
//    📅 Schuljahr   – neues Schuljahr: Freigaben, HE-Nummern und Mindestniveau zurück, Inhalte bleiben
//    🖨️ Drucken     – Lösungsheft, Laufzettel und Hefteinträge je Unit (gemeinsam/journey-druck.js)
//  Daten: daten/journey6.json und daten/journey/bausteine-en6.json über LWAdmin.dateien (Worker cloudflare/dateien.js prüft
//  beide, ein Commit); Freigaben, HE-Nummern, Schuljahr in config.journey über den Store (Veröffentlichen).
//  IDs bleiben: Abschnitte und Bausteine lassen sich nicht löschen (Lernstand jw:<ID> der Kinder), Schritte schon.
// ═══════════════════════════════════════════════════════
'use strict';

LWAdmin.modul({
  id: 'journey', bereich: 'inhalte', titel: 'English Journey', symbol: '🧭', reihenfolge: 10,
  suchbegriffe: ['English Journey', 'Laufzettel', 'Lernweg', 'Hefteintrag', 'Abschnitt', 'Übung', 'Lösung', 'Lösungsheft', 'Buchseite',
    'Klassen-Übersicht', 'Klassenstand', 'Schuljahr', 'Drucken', 'Kann-Sätze', 'Highlight'],
  zeigen(host, { store, toast }) {
    const D = LWAdmin.dateien, WEG = 'daten/journey6.json', BS = 'daten/journey/bausteine-en6.json', CFG_WEG = 'journey6';
    const e = s => escHtml(String(s == null ? '' : s));
    const slug = s => String(s).toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30) || 'neu';
    const ARTEN = { hefteintrag: '📒 Hefteintrag', buch: '📖 Buchaufgabe', eigen: '✏️ eigene Übung', station: '🎮 App-Station', thema: '🎮 Zusatz-App',
      lesen: '📖 Lesen', vokabeln: '📘 Vokabelheft', partner: '👥 Partner', hoeren: '🎧 Hören' };
    const TYPEN = { luecken: 'Lückensätze', saetze: 'Sätze umformen', wahl: 'Auswählen', zuordnen: 'Zuordnen', sortieren: 'Sortieren (Spalten)',
      schreiben: 'Schreiben (mit Checkliste)', frei: 'Freie Aufgabe', mediation: 'Mediation' };
    const ST = { reiter: 'uebersicht', unit: null, abschnitt: null, schritt: null, fehler: '', klasse: { gruppe: '', zeilen: null, laedt: false, fehler: '' },
      gruppen: [], katalog: null, druckUnit: null };
    let aktiv = true;

    // ── Daten ──
    const J = () => D.daten(WEG), Bl = () => D.daten(BS);
    const B = () => { const m = {}; ((Bl() || {}).bausteine || []).forEach(b => { m[b.id] = b; }); return m; };
    const unit = () => (J().units.find(u => u.id === ST.unit) || J().units[0]);
    const cfgWeg = () => (((store.daten() || {}).journey || {}).wege || {})[CFG_WEG] || {};
    const heName = id => { const n = (cfgWeg().he || {})[id]; return n ? 'HE ' + n : 'HE –'; };
    const alleIds = () => new Set([...Object.keys(B()), ...J().units.flatMap(u => (u.abschnitte || []).flatMap(a => [a.id, ...a.schritte.map(s => s.id)]))]);
    const neueId = basis => { const ids = alleIds(); let id = basis, n = 2; while (ids.has(id)) id = basis + '-' + n++; return id; };
    const aendernWeg = (text, fn) => D.aendern(WEG, text, fn);
    const aendernBs = (text, fn) => D.aendern(BS, text, fn);
    const abschnittIn = (j, aid) => { for (const u of j.units) for (const a of u.abschnitte || []) if (a.id === aid) return { u, a }; return {}; };
    const seitenA = a => a.buch ? (a.buch.von === a.buch.bis ? `S. ${a.buch.von}` : `S. ${a.buch.von}–${a.buch.bis}`) : '';
    const STERNE = n => Array.isArray(n) && n.length < 3 ? ' ' + n.map(x => '★'.repeat(x)).join('/') : '';

    function laden() {
      ST.fehler = '';
      Promise.all([D.laden(WEG), D.laden(BS), LW.laden('gemeinsam/journey-lernweg.js'), LW.laden('gemeinsam/journey-druck.js'),
        LWAdmin.katalog().then(k => { ST.katalog = k; }).catch(() => {})])
        .catch(x => { ST.fehler = x.status === 401 ? 'Anmeldung abgelaufen – bitte neu anmelden' : (x.message || String(x)); }).then(zeichnen);
      LWAdmin.quellen.gruppen().then(g => { ST.gruppen = g || []; }).catch(() => {}).then(zeichnen);
    }

    // ── Wer (Gruppen, Klassen, alle) ──
    const klassen = () => { const k = new Set(); ((store.daten() || {}).apps || []).forEach(a => (a.klassen || []).forEach(x => k.add(x))); return [...k].sort((a, b) => a - b); };
    const werListe = () => ['alle', ...klassen().map(k => 'k' + k), ...ST.gruppen.map(g => 'g:' + g.id)];
    const werName = w => w === 'alle' ? 'Alle' : /^k\d+$/.test(w) ? 'Klasse ' + w.slice(1) : (ST.gruppen.find(g => 'g:' + g.id === w) || { name: 'Gruppe ' + w.slice(2, 8) + '…' }).name;

    // ── Lückenprüfung je Abschnitt ──
    function luecken(u) {
      const by = B(), out = {}, inAb = new Set();
      (u.abschnitte || []).forEach((a, i) => {
        const l = out[a.id] = [];
        if (!a.buch && !a.schluss) l.push('keine Buchseiten');
        const vor = (u.abschnitte || [])[i - 1];
        if (a.buch && vor && vor.buch && a.buch.von <= vor.buch.bis && !a.wahl && !vor.wahl) l.push(`Seiten überschneiden sich mit „${vor.titel}“ (ℹ)`);
        a.schritte.forEach(s => {
          const b = by[s.baustein];
          if (s.art === 'hefteintrag') {
            if (!b) l.push('Hefteintrag fehlt'); else if (!(b.zeilen || []).length) l.push(`${heName(b.id)} hat noch keinen Inhalt`);
            if (a.wahl) l.push('⛔ Hefteintrag in einer Wahlstation');
          }
          if (s.art === 'uebung' && s.baustein && b && !b.loesung) l.push(`Übung „${b.titel}“ ohne Lösung`);
          if (s.art === 'uebung' && !s.baustein && !s.buch) l.push('Übung ohne Buchverweis');
          if (s.station) inAb.add(s.station);
          if (s.art === 'app' && s.thema && ST.katalog && !ST.katalog.ids.has(s.thema)) l.push(`App-Thema ${s.thema} fehlt im Katalog`);
        });
      });
      const ohne = u.stationen.filter(s => !inAb.has(s.id)).map(s => s.titel);
      return { je: out, ohne };
    }

    // ── Übersicht ──
    function freiFuer(a) {
      const bis = cfgWeg().bis || {}, ids = J().units.flatMap(u => (u.abschnitte || []).map(x => x.id)), i = ids.indexOf(a.id);
      return Object.entries(bis).filter(([, x]) => ids.indexOf(x) >= i).map(([w, x]) => werName(w) + (x === a.id ? ' ⏹' : ''));
    }
    function uebersicht() {
      const u = unit(), by = B(), lk = luecken(u), kl = klasseSummen();
      if (!Array.isArray(u.abschnitte)) return `<div class="lw-karte"><p>Unit ${u.nr} hat noch keinen Laufzettel.</p>
        <div class="lw-knoepfe"><button type="button" class="lw-btn gold" data-jz="laufzettel-anlegen">📒 Laufzettel für Unit ${u.nr} anlegen</button></div></div>`;
      const zeilen = u.abschnitte.map(a => {
        const he = [...new Set(a.schritte.filter(s => s.art === 'hefteintrag').map(s => s.baustein))];
        const buchU = a.schritte.filter(s => s.art === 'uebung' && s.buch).length, eig = a.schritte.filter(s => s.art === 'uebung' && s.baustein).length;
        const st = a.schritte.filter(s => s.station).map(s => (u.stationen.find(x => x.id === s.station) || {}).titel || s.station);
        const zus = a.schritte.filter(s => s.art === 'app' && s.thema).length;
        const k = kl && kl.abschnitt[a.id], l = lk.je[a.id] || [];
        return `<tr><td><b>${e(a.ico || '')} ${e(a.titel)}</b>${a.wahl ? ' <span class="jz-tag">Wahl</span>' : ''}${a.schluss ? ' <span class="jz-tag">Schluss</span>' : ''}</td>
          <td>${e(seitenA(a)) || '–'}</td>
          <td>${he.map(id => `${e(heName(id))} · ${e((by[id] || {}).titel || '?')}`).join('<br>') || '–'}</td>
          <td>${buchU} Buch · ${eig} eigene</td>
          <td>${e(st.join(', ')) || '–'}${zus ? ` <span class="lw-klein">+${zus}</span>` : ''}</td>
          <td>${e(freiFuer(a).join(', ')) || '<span class="lw-klein">noch zu</span>'}
            <select data-jz-frei="${e(a.id)}" aria-label="frei bis hier für"><option value="">frei bis hier …</option>${werListe().map(w => `<option value="${e(w)}">${e(werName(w))}</option>`).join('')}</select></td>
          <td>${k ? `✅ ${k.fertig}` : '<span class="lw-klein">–</span>'}</td>
          <td>${l.length ? `<span class="${l.some(x => x.startsWith('⛔')) ? 'lw-rot' : ''}" title="${e(l.join(' · '))}">⚠ ${l.length}</span>` : '✓'}
            <a class="lw-btn klein" href="apps/englisch/english-journey.html#u=${e(u.id)}&w=${e(a.id)}" target="_blank" rel="noopener" title="Vorschau als Kind">👀</a>
            <button type="button" class="lw-btn klein" data-jz-bearbeiten="${e(a.id)}" title="Bearbeiten">✏️</button></td></tr>`;
      }).join('');
      const alleL = u.abschnitte.flatMap(a => (lk.je[a.id] || []).map(x => `${a.titel}: ${x}`));
      return `<div class="lw-karte"><div class="jz-tabelle"><table><thead><tr><th>Abschnitt</th><th>📖 Buch</th><th>📒 Hefteintrag</th><th>✏️ Übungen</th>
          <th>🎮 Apps</th><th>Frei für</th><th>👥 fertig</th><th></th></tr></thead><tbody>${zeilen}</tbody></table></div>
        <p class="lw-klein">„frei bis hier“ gibt den Abschnitt und alle davor frei und vergibt die HE-Nummern (wirkt nach dem Veröffentlichen oben).
          ⏹ = hier endet die Freigabe. „👥 fertig“ = iPads der gewählten Gruppe (Reiter Klasse).</p></div>
        <div class="lw-karte"><h2>🔍 Lücken</h2>${alleL.length || lk.ohne.length ? `<ul class="lw-liste">${alleL.map(x => `<li class="${x.includes('⛔') ? 'lw-rot' : ''}">${e(x)}</li>`).join('')}
          ${lk.ohne.length ? `<li>Stationen ohne Abschnitt: ${e(lk.ohne.join(', '))}</li>` : ''}</ul>` : '<p>✅ Keine Lücken.</p>'}</div>`;
    }

    // ── Bearbeiten ──
    const ZEILE_TEXT = z => z.map(([t, s]) => s === 'g' ? `*${t}*` : s === 'b' ? `**${t}**` : t).join('');
    function zeileAus(text) {   // *grün* und **fett** → [[text, stil], …]
      const out = [], re = /\*\*([^*]+)\*\*|\*([^*]+)\*/g;
      let i = 0, m;
      while ((m = re.exec(text))) { if (m.index > i) out.push([text.slice(i, m.index), '']); out.push(m[1] !== undefined ? [m[1], 'b'] : [m[2], 'g']); i = re.lastIndex; }
      if (i < text.length) out.push([text.slice(i), '']);
      return out.length ? out : [['', '']];
    }
    const zeilen = t => String(t || '').split('\n').map(x => x.trim()).filter(Boolean);
    function niveauWahl(s, attr) {
      const n = Array.isArray(s.niveau) ? s.niveau : [1, 2, 3];
      return `<span class="jz-niveau">Niveau: ${[1, 2, 3].map(x => `<label><input type="checkbox" ${attr} value="${x}"${n.includes(x) ? ' checked' : ''}> ${'★'.repeat(x)}</label>`).join(' ')}</span>`;
    }
    function heEditor(b) {
      const vorschau = window.LernJourneyWeg ? LernJourneyWeg.papierHTML(b, (cfgWeg().he || {})[b.id]) : '';
      return `<div class="jz-zwei"><div>
          <label>Titel <input data-bs="titel" data-bs-id="${e(b.id)}" value="${e(b.titel)}" maxlength="80"></label>
          <label>Zeilen – eine je Heftzeile · Wörter markieren und „grün“ oder „fett“ tippen
            <textarea rows="${Math.max(6, (b.zeilen || []).length + 1)}" data-bs="zeilen" data-bs-id="${e(b.id)}">${e((b.zeilen || []).map(ZEILE_TEXT).join('\n'))}</textarea></label>
          <div class="lw-knoepfe"><button type="button" class="lw-btn klein" data-jz-markup="*" data-ziel="${e(b.id)}">🟩 grün</button><button type="button" class="lw-btn klein" data-jz-markup="**" data-ziel="${e(b.id)}"><b>F</b> fett</button></div>
          <label>Merksatz (rot) <input data-bs="merke" data-bs-id="${e(b.id)}" value="${e(b.merke || '')}" maxlength="200"></label>
          <p class="lw-klein"><code>${e(b.id)}</code> · ${e(heName(b.id))}</p></div>
        <div class="jz-vorschau">${vorschau}</div></div>`;
    }
    function uebungEditor(b) {
      const t = b.typ, feld = (k, titel, wert, zeilenzahl) => zeilenzahl
        ? `<label>${titel}<textarea rows="${zeilenzahl}" data-bs="${k}" data-bs-id="${e(b.id)}">${e(wert)}</textarea></label>`
        : `<label>${titel}<input data-bs="${k}" data-bs-id="${e(b.id)}" value="${e(wert)}"></label>`;
      const liste = l => (l || []).join('\n');
      let inhalt = '';
      if (t === 'luecken' || t === 'saetze') inhalt = feld('items', 'Sätze – einer je Zeile, Lücke mit ___', liste(b.items), 6) + feld('kasten', 'Wörterkasten (mit Komma getrennt)', (b.kasten || []).join(', '))
        + feld('beispiel', 'Beispiel', b.beispiel || '');
      else if (t === 'wahl') inhalt = feld('wahl', 'Je Zeile: Satz | Auswahl 1 / Auswahl 2', (b.items || []).map(x => `${x.t} | ${(x.o || []).join(' / ')}`).join('\n'), 6);
      else if (t === 'zuordnen') inhalt = `<div class="jz-zwei">${feld('links', 'Links (je Zeile)', liste(b.links), 6)}${feld('rechts', 'Rechts – gemischt (je Zeile)', liste(b.rechts), 6)}</div>`;
      else if (t === 'sortieren') inhalt = feld('spalten', 'Spalten (mit Komma getrennt)', (b.spalten || []).join(', ')) + feld('kasten', 'Wörter (mit Komma getrennt)', (b.kasten || []).join(', '));
      else if (t === 'schreiben') inhalt = feld('text', 'Auftrag', b.text || '') + feld('regel', 'Regel (z. B. Mindestens 5 Sätze)', b.regel || '') + feld('anfang', 'Satzanfang', b.anfang || '')
        + feld('hilfe', 'Hilfe – Satzanfänge (je Zeile)', liste(b.hilfe), 3) + feld('checkliste', 'Checkliste (je Zeile)', liste(b.checkliste), 3);
      else if (t === 'frei') inhalt = feld('text', 'Auftrag', b.text || '') + feld('beispiel', 'Beispiel', b.beispiel || '') + feld('hilfe', 'Hilfe (je Zeile)', liste(b.hilfe), 3);
      else if (t === 'mediation') inhalt = feld('text', 'Auftrag', b.text || '') + feld('tipp', 'Tipp', b.tipp || '') + feld('plakat', 'Plakat – je Zeile, „|h“ = Überschrift, „|b“ = fett', (b.plakat || []).map(([x, s]) => s ? `${x}|${s}` : x).join('\n'), 5)
        + feld('items', 'Fragen (je Zeile)', liste(b.items), 4);
      const muster = typeof b.loesung === 'string';
      return `<label>Art <select data-bs="typ" data-bs-id="${e(b.id)}">${Object.entries(TYPEN).map(([k, v]) => `<option value="${k}"${k === t ? ' selected' : ''}>${v}</option>`).join('')}</select></label>
        ${feld('titel', 'Titel / Arbeitsauftrag', b.titel || '')}${feld('heft', 'Hinweis fürs Heft (z. B. Schreibe die ganzen Sätze ins Heft.)', b.heft || '')}${inhalt}
        <label>Lösung – ${muster ? 'Mustertext' : 'eine Zeile je Aufgabe'} <textarea rows="5" data-bs="loesung" data-bs-id="${e(b.id)}">${e(muster ? b.loesung : liste(b.loesung))}</textarea></label>
        <label class="lw-klein"><input type="checkbox" data-bs="muster" data-bs-id="${e(b.id)}"${muster ? ' checked' : ''}> Lösung als Mustertext (Schreibaufgaben)</label>
        <p class="lw-klein"><code>${e(b.id)}</code></p>`;
    }
    function schrittEditor(u, a, s) {
      const by = B(), at = `data-s="${e(s.id)}"`;
      const buch = s.buch || {};
      const buchFelder = `<span class="jz-buch">📖 S. <input type="number" min="1" max="400" data-sf="seite" ${at} value="${e(buch.seite || '')}">
        bis <input type="number" min="1" max="400" data-sf="bis" ${at} value="${e(buch.bis || '')}"> Ü <input data-sf="uebung" ${at} value="${e(buch.uebung || '')}" maxlength="40"></span>`;
      if (s.art === 'hefteintrag') {
        const b = by[s.baustein] || {};
        return `<label>Hefteintrag <select data-sf="baustein" ${at}>${Object.values(by).filter(x => x.art === 'hefteintrag').map(x => `<option value="${e(x.id)}"${x.id === s.baustein ? ' selected' : ''}>${e(heName(x.id))} · ${e(x.titel)}</option>`).join('')}</select></label>
          <label class="lw-klein"><input type="checkbox" data-sf="wiederholen" ${at}${s.wiederholen ? ' checked' : ''}> nur noch einmal lesen (steht schon im Heft)</label>${b.id ? heEditor(b) : ''}`;
      }
      const heHaken = a.schritte.some(x => x.art === 'hefteintrag') && (s.art === 'uebung' || s.art === 'app')
        ? `<label class="lw-klein"><input type="checkbox" data-sf="he" ${at}${s.he === false ? '' : ' checked'}> 📒 gehört zum Hefteintrag des Abschnitts (zeigt „Nutze HE …“ bzw. „HE … zuerst“)</label>` : '';
      return heHaken + schrittFelder(u, a, s, by, at, buchFelder);
    }
    function schrittFelder(u, a, s, by, at, buchFelder) {
      if (s.art === 'uebung' && s.baustein) return niveauWahl(s, `data-sf="niveau" ${at}`) + `<label>Zusatz zum Auftrag (optional) <input data-sf="text" ${at} value="${e(s.text || '')}"></label>` + (by[s.baustein] ? uebungEditor(by[s.baustein]) : '');
      if (s.art === 'uebung') return buchFelder + niveauWahl(s, `data-sf="niveau" ${at}`) + `<label>Arbeitsauftrag <input data-sf="text" ${at} value="${e(s.text || '')}" maxlength="600"></label>`;
      if (s.art === 'app' && s.station !== undefined) {
        const belegt = new Set(J().units.flatMap(x => (x.abschnitte || []).flatMap(y => y.schritte.map(z => z.station).filter(Boolean))));
        return `<label>Station <select data-sf="station" ${at}>${u.stationen.map(x => `<option value="${e(x.id)}"${x.id === s.station ? ' selected' : ''}${x.id !== s.station && belegt.has(x.id) ? ' disabled' : ''}>${e(x.titel)}${x.id !== s.station && belegt.has(x.id) ? ' (schon in einem Abschnitt)' : ''}</option>`).join('')}</select></label>
          <p class="lw-klein">Die Station selbst (Thema, Reihenfolge, Platz im 3D-Ort) steht in journey6.json → stationen und bleibt hier unverändert.</p>`;
      }
      if (s.art === 'app') {
        const z = s.ziel || {}, liste = ST.katalog ? [...ST.katalog.ids].filter(x => /^en\./.test(x)).sort() : [];
        return `<label>Thema aus dem Katalog <input list="jz-themen" data-sf="thema" ${at} value="${e(s.thema || '')}"></label><datalist id="jz-themen">${liste.map(x => `<option value="${e(x)}">${e(ST.katalog.titel.get(x) || '')}</option>`).join('')}</datalist>
          <span class="jz-buch">Ziel: <input type="number" min="1" max="10" data-sf="runden" ${at} value="${e(z.runden || 1)}"> Runden mit mindestens <input type="number" min="50" max="100" data-sf="prozent" ${at} value="${e(z.prozent || 70)}"> %</span>
          <label>Text <input data-sf="text" ${at} value="${e(s.text || '')}"></label>${niveauWahl(s, `data-sf="niveau" ${at}`)}`;
      }
      return (['lesen', 'partner', 'hoeren'].includes(s.art) ? buchFelder : '') + `<label>Text <textarea rows="2" data-sf="text" ${at}>${e(s.text || '')}</textarea></label>${niveauWahl(s, `data-sf="niveau" ${at}`)}`;
    }
    function schrittKurz(u, s) {
      const by = B(), b = by[s.baustein] || {};
      if (s.art === 'hefteintrag') return `📒 ${heName(s.baustein)} · ${b.titel || '?'}${s.wiederholen ? ' (noch einmal lesen)' : ''}`;
      if (s.art === 'uebung' && s.baustein) return `✏️ ${b.titel || '?'}${STERNE(s.niveau)}${b.loesung ? '' : ' ⚠ ohne Lösung'}`;
      if (s.art === 'uebung') return `📖 S. ${(s.buch || {}).seite || '?'}${(s.buch || {}).uebung ? ' Ü ' + s.buch.uebung : ''}${STERNE(s.niveau)} – ${s.text || ''}`;
      if (s.art === 'app' && s.station) return `🎮 Station: ${(u.stationen.find(x => x.id === s.station) || {}).titel || s.station}`;
      if (s.art === 'app') return `🎮 Zusatz-App: ${(ST.katalog && ST.katalog.titel.get(s.thema)) || s.thema}`;
      return `${{ lesen: '📖', vokabeln: '📘', partner: '👥', hoeren: '🎧', extra: '⭐' }[s.art] || '•'} ${(s.text || '').slice(0, 90)}`;
    }
    function abschnittEditor(u, a, i) {
      const hatHE = a.schritte.some(s => s.art === 'hefteintrag'), n = u.abschnitte.length;
      return `<details class="lw-karte jz-abschnitt"${ST.abschnitt === a.id ? ' open' : ''} data-jz-ab="${e(a.id)}">
        <summary><b>${e(a.ico || '')} ${e(a.titel)}</b> <span class="lw-klein">${e(seitenA(a))} · ${a.schritte.length} Schritte${a.wahl ? ' · Wahl' : ''}</span>
          <span class="jz-k"><button type="button" class="lw-btn klein" data-jz-ab-zug="-1" data-ab="${e(a.id)}"${i ? '' : ' disabled'} aria-label="nach oben">▲</button><button type="button" class="lw-btn klein" data-jz-ab-zug="1" data-ab="${e(a.id)}"${i < n - 1 ? '' : ' disabled'} aria-label="nach unten">▼</button></span></summary>
        ${ST.abschnitt === a.id ? `<div class="jz-felder">
          <label>Titel <input data-af="titel" value="${e(a.titel)}" maxlength="120"></label>
          <label>Symbol <input data-af="ico" value="${e(a.ico || '')}" maxlength="4" style="width:4rem"></label>
          <label>Kurz <input data-af="kurz" value="${e(a.kurz || '')}" maxlength="120"></label>
          <span class="jz-buch">📖 Buch S. <input type="number" min="1" max="400" data-af="von" value="${e((a.buch || {}).von || '')}"> bis <input type="number" min="1" max="400" data-af="bis" value="${e((a.buch || {}).bis || '')}"></span>
          <label>Platz im 3D-Ort <select data-af="platz"><option value="">automatisch (eigene Station bzw. die davor)</option>${u.stationen.map(x => `<option value="${e(x.id)}"${x.id === a.platz ? ' selected' : ''}>${e(x.titel)}</option>`).join('')}</select></label>
          <span class="jz-checks"><label><input type="checkbox" data-af="niveaus"${a.niveaus ? ' checked' : ''}> Niveaus ★/★★/★★★</label>
            <label title="${hatHE ? 'Hefteinträge nur in Pflicht-Abschnitten' : ''}"><input type="checkbox" data-af="wahl"${a.wahl ? ' checked' : ''}${hatHE && !a.wahl ? ' disabled' : ''}> Wahl / Extra${hatHE ? ' (geht nicht: hat einen Hefteintrag)' : ''}</label>
            <label><input type="checkbox" data-af="schluss"${a.schluss ? ' checked' : ''}> Zum Schluss (Finale, Fit für die Probe)</label></span>
          <label>Merkzeilen (je Zeile, optional) <textarea rows="2" data-af="merk">${e((a.merk || []).join('\n'))}</textarea></label>
          <p class="lw-klein"><code>${e(a.id)}</code> · <a href="apps/englisch/english-journey.html#u=${e(u.id)}&w=${e(a.id)}" target="_blank" rel="noopener">👀 Vorschau als Kind</a> (zeigt den gespeicherten Stand)</p></div>
          <ol class="jz-schritte">${a.schritte.map((s, k) => `<li class="${ST.schritt === s.id ? 'offen' : ''}"><div class="jz-zeile"><span>${e(schrittKurz(u, s))}</span>
            <span class="jz-k"><button type="button" class="lw-btn klein" data-jz-s="auf" data-sid="${e(s.id)}">${ST.schritt === s.id ? 'Zu' : '✏️'}</button><button type="button" class="lw-btn klein" data-jz-s="hoch" data-sid="${e(s.id)}"${k ? '' : ' disabled'}>▲</button><button type="button" class="lw-btn klein" data-jz-s="runter" data-sid="${e(s.id)}"${k < a.schritte.length - 1 ? '' : ' disabled'}>▼</button><button type="button" class="lw-btn klein" data-jz-s="weg" data-sid="${e(s.id)}" aria-label="Schritt löschen">✕</button></span></div>
            ${ST.schritt === s.id ? `<div class="jz-felder">${schrittEditor(u, a, s)}</div>` : ''}</li>`).join('')}</ol>
          <div class="lw-knoepfe"><select data-jz-neu-art aria-label="Art des neuen Schritts">${Object.entries(ARTEN).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>
            <button type="button" class="lw-btn klein" data-jz="schritt-neu" data-ab="${e(a.id)}">＋ Schritt</button></div>` : '<p class="lw-klein" style="margin:.4rem 0 0">Aufklappen zum Bearbeiten.</p>'}
      </details>`;
    }
    function kannEditor(u) {
      const by = B();
      return `<div class="lw-karte"><h2>🎯 Kann-Sätze fürs Finale („Fit für die Probe?“)</h2>
        ${(u.kann || []).map((k, i) => { const b = by[k.baustein] || {}; return `<div class="jz-kann">
          <input data-kf="teil" data-kb="${e(k.baustein)}" value="${e(b.teil || '')}" placeholder="Teil" maxlength="40" style="width:8rem">
          <span>Ich kann</span><input data-kf="text" data-kb="${e(k.baustein)}" value="${e(b.text || '')}" maxlength="200" style="flex:1;min-width:12rem">
          <select data-kf="abschnitt" data-ki="${i}"><option value="">– kein Abschnitt –</option>${u.abschnitte.map(a => `<option value="${e(a.id)}"${a.id === k.abschnitt ? ' selected' : ''}>${e(a.titel)}</option>`).join('')}</select>
          <label class="lw-klein"><input type="checkbox" data-kf="unterricht" data-ki="${i}"${k.imUnterricht ? ' checked' : ''}> im Unterricht</label>
          <button type="button" class="lw-btn klein" data-jz="kann-weg" data-ki="${i}" aria-label="Kann-Satz entfernen">✕</button></div>`; }).join('')}
        <div class="lw-knoepfe"><button type="button" class="lw-btn klein" data-jz="kann-neu">＋ Kann-Satz</button></div></div>`;
    }
    function bearbeiten() {
      const u = unit();
      if (!Array.isArray(u.abschnitte)) return uebersicht();
      return `${u.abschnitte.map((a, i) => abschnittEditor(u, a, i)).join('')}
        <div class="lw-karte"><h2>➕ Neuer Abschnitt</h2><div class="lw-knoepfe" style="margin-top:0">
          <input data-jz-neu-ab placeholder="z. B. Theme 1: At the sports club" maxlength="120" style="flex:1;min-width:14rem" aria-label="Titel des neuen Abschnitts">
          <button type="button" class="lw-btn" data-jz="abschnitt-neu">Anlegen</button></div>
          <p class="lw-klein">Kommt ans Ende der Unit – mit ▲ an die richtige Stelle schieben. Abschnitte lassen sich nicht löschen (Erledigtes steht im Pass der Kinder).</p></div>
        ${kannEditor(u)}`;
    }

    // ── Klasse ──
    function klasseSummen() {
      const z = ST.klasse.zeilen; if (!z) return null;
      const s = { item: {}, abschnitt: {}, rueck: {} };
      z.forEach(r => {
        const m = /^jw:([a-z0-9-]+)(?::(f[0-3]|r))?$/.exec(String(r.was)); if (!m) return;
        const n = Number(r.runden) || 0;
        if (!m[2]) s.item[m[1]] = (s.item[m[1]] || 0) + n;
        else if (m[2] === 'r') s.rueck[m[1]] = (s.rueck[m[1]] || 0) + n;
        else { const x = s.abschnitt[m[1]] || (s.abschnitt[m[1]] = { fertig: 0, nv: [0, 0, 0, 0] }); x.fertig += n; x.nv[Number(m[2][1])] += n; }
      });
      return s;
    }
    async function klasseLaden() {
      ST.klasse.laedt = true; ST.klasse.fehler = ''; zeichnen();
      try { const d = await store.worker('/sync/admin/statistik', { gruppeId: ST.klasse.gruppe || undefined, wochen: 30 }); ST.klasse.zeilen = Array.isArray(d.zeilen) ? d.zeilen : []; }
      catch (x) { ST.klasse.fehler = x.status === 404 ? 'Der Worker kennt die Auswertung noch nicht – bitte cloudflare/sync.js ersetzen' : (x.message || 'Worker nicht erreichbar'); ST.klasse.zeilen = null; }
      ST.klasse.laedt = false; zeichnen();
    }
    function klasse() {
      const u = unit(), s = klasseSummen(), by = B();
      const auswahl = `<div class="lw-knoepfe" style="margin-top:0"><select data-jz-gruppe aria-label="Gruppe"><option value="">Alle Gruppen</option>${ST.gruppen.map(g => `<option value="${e(g.id)}"${g.id === ST.klasse.gruppe ? ' selected' : ''}>${e(g.name)}</option>`).join('')}</select>
        <button type="button" class="lw-btn" data-jz="klasse-laden">${ST.klasse.zeilen ? '🔄 Neu laden' : '📊 Laden'}</button></div>
        <p class="lw-klein">Jedes iPad mit Sicherungskarte meldet einmal: Hefteintrag abgehakt, Übung erledigt, Abschnitt fertig (mit Niveau) und „unter 70 % – zurück zum Hefteintrag“. Nur Summen, keine Namen; iPads ohne Karte fehlen. Letzte 30 Wochen.</p>`;
      if (ST.klasse.laedt) return `<div class="lw-karte">${auswahl}<p>lädt …</p></div>`;
      if (ST.klasse.fehler) return `<div class="lw-karte">${auswahl}<p class="lw-rot">⚠ ${e(ST.klasse.fehler)}</p></div>`;
      if (!s) return `<div class="lw-karte">${auswahl}</div>`;
      if (!Array.isArray(u.abschnitte)) return `<div class="lw-karte">${auswahl}<p>Diese Unit hat noch keinen Laufzettel.</p></div>`;
      const rueck = Object.entries(s.rueck).filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1]);
      return `<div class="lw-karte">${auswahl}</div>
        ${rueck.length ? `<div class="lw-karte"><h2>💡 Hier hakt es</h2><ul class="lw-liste">${rueck.map(([id, n]) => `<li>📒 ${e(heName(id))} · ${e((by[id] || {}).titel || id)} sitzt bei <b>${n}</b> Kindern nicht (unter 70 % in der App)</li>`).join('')}</ul></div>` : ''}
        <div class="lw-karte"><div class="jz-tabelle"><table><thead><tr><th>Abschnitt</th><th>📒 Hefteintrag</th><th>✏️ Übungen (Haken)</th><th>✅ fertig</th><th>★ / ★★ / ★★★</th></tr></thead><tbody>
          ${u.abschnitte.map(a => { const he = [...new Set(a.schritte.filter(x => x.art === 'hefteintrag').map(x => x.baustein))], ue = a.schritte.filter(x => x.art === 'uebung');
            const f = s.abschnitt[a.id] || { fertig: 0, nv: [0, 0, 0, 0] };
            return `<tr><td>${e(a.ico || '')} ${e(a.titel)}</td><td>${he.map(h => `${e(heName(h))}: ${s.item[h] || 0}`).join('<br>') || '–'}</td>
              <td>${ue.length ? `${ue.reduce((n, x) => n + (s.item[x.id] || 0), 0)} <span class="lw-klein">(${ue.length} Übungen)</span>` : '–'}</td>
              <td><b>${f.fertig}</b></td><td>${a.niveaus ? `${f.nv[1]} / ${f.nv[2]} / ${f.nv[3]}` : '–'}</td></tr>`; }).join('')}</tbody></table></div></div>`;
    }

    // ── Schuljahr ──
    const naechstesJahr = sj => { const m = /^(\d{4})\/\d{2}$/.exec(sj || ''); const y = m ? Number(m[1]) + 1 : (new Date().getMonth() >= 7 ? new Date().getFullYear() : new Date().getFullYear() - 1); return `${y}/${String((y + 1) % 100).padStart(2, '0')}`; };
    function schuljahr() {
      const jy = (store.daten() || {}).journey || {}, w = cfgWeg(), neu = naechstesJahr(jy.schuljahr);
      return `<div class="lw-karte"><h2>📅 Schuljahr ${e(jy.schuljahr || '–')}</h2>
        <p>Ein neues Schuljahr setzt nur die Einstellungen für die Klasse zurück – alle Inhalte (Abschnitte, Hefteinträge, Übungen, Lösungen) bleiben.</p>
        <ul class="lw-liste"><li>Freigaben „bis Abschnitt“: <b>${Object.keys(w.bis || {}).length}</b> → werden gelöscht</li>
          <li>HE-Nummern: <b>${Object.keys(w.he || {}).length}</b> → werden gelöscht und beim Freigeben neu vergeben</li>
          <li>Mindestniveau und Reihenfolge: <b>${Object.keys(w.niveau || {}).length + Object.keys(w.reihenfolge || {}).length}</b> → werden gelöscht (Standard: Schritt für Schritt)</li>
          <li>Haken der Kinder bleiben in ihrem Pass (Vorjahr) – ein neues Kind beginnt leer</li></ul>
        <div class="lw-knoepfe"><button type="button" class="lw-btn gold" data-jz="schuljahr-neu">Neues Schuljahr ${e(neu)} beginnen</button></div>
        <p class="lw-klein">Wirkt nach dem Veröffentlichen (oben). Rückgängig über System → Verlauf.</p></div>`;
    }

    // ── Drucken ──
    function drucken() {
      return `<div class="lw-karte"><h2>🖨️ Drucken – Unit ${e(unit().nr)}: ${e(unit().titel)}</h2>
        <p>Öffnet eine Druckseite (auch als PDF speichern). Gedruckt wird der aktuelle Stand hier im Editor.</p>
        <div class="lw-knoepfe"><button type="button" class="lw-btn gold" data-jz-druck="loesungsheft">📗 Lösungsheft</button>
          <button type="button" class="lw-btn" data-jz-druck="laufzettel">📋 Laufzettel (Papier)</button>
          <button type="button" class="lw-btn" data-jz-druck="hefteintraege">📒 Hefteinträge</button></div>
        <p class="lw-klein">Lösungsheft: je Abschnitt Station und Buchseiten, eigene Übungen mit Lösung, Buchaufgaben mit Platz für die Lösung aus dem Lehrerband – liegt im Klassenzimmer aus.</p></div>`;
    }
    function druckOeffnen(art) {
      if (!window.LernJourneyDruck) { toast('⚠ Druckansicht lädt noch', true); return; }
      const html = LernJourneyDruck[art](J(), B(), unit().id, cfgWeg());
      const w = window.open('', '_blank');
      if (!w) { toast('⚠ Bitte Pop-ups für den Admin erlauben', true); return; }
      w.document.open(); w.document.write(html); w.document.close();
    }

    // ── Speichern ──
    // Vorab dieselben harten Regeln wie der Worker (cloudflare/dateien.js) und pruefen.py – sonst lehnt der Worker ab
    function vorpruefen() {
      const f = [], by = B();
      J().units.forEach(u => (u.abschnitte || []).forEach(a => {
        if (!String(a.titel || '').trim()) f.push(`Unit ${u.nr}: ein Abschnitt hat keinen Titel`);
        if (!a.schritte.length) f.push(`„${a.titel}“ hat noch keine Schritte`);
        a.schritte.forEach(s => {
          if (s.art === 'hefteintrag' && a.wahl) f.push(`„${a.titel}“: Hefteinträge nur in Pflicht-Abschnitten`);
          if (s.art === 'uebung' && !s.baustein && !(s.buch && s.buch.seite)) f.push(`„${a.titel}“: eine Buchaufgabe hat keine Seite`);
          if ((s.art === 'hefteintrag' || (s.art === 'uebung' && s.baustein)) && !by[s.baustein]) f.push(`„${a.titel}“: Baustein ${s.baustein} fehlt`);
          if (s.art === 'app' && s.thema && ST.katalog && !ST.katalog.ids.has(s.thema)) f.push(`„${a.titel}“: Thema ${s.thema} fehlt im Katalog`);
          if (!['hefteintrag', 'uebung', 'app'].includes(s.art) && !String(s.text || '').trim()) f.push(`„${a.titel}“: ein Schritt hat keinen Text`);
          if (/[<>]/.test(JSON.stringify(s))) f.push(`„${a.titel}“: < oder > ist nicht erlaubt`);
        });
      }));
      ((Bl() || {}).bausteine || []).forEach(b => {
        if (/[<>]/.test(JSON.stringify(b))) f.push(`${b.titel || b.id}: < oder > ist nicht erlaubt`);
        if (b.art === 'uebung' && Array.isArray(b.loesung) && ['wahl', 'luecken', 'saetze', 'zuordnen', 'mediation'].includes(b.typ)) {
          const soll = (b.typ === 'zuordnen' ? b.links : b.items || []).length;
          if (soll && b.loesung.length !== soll) f.push(`Übung „${b.titel}“: Lösung hat ${b.loesung.length} Zeilen, die Aufgabe ${soll}`);
        }
      });
      return f;
    }
    async function speichern() {
      const f = vorpruefen();
      if (f.length) { await LWAdmin.dialog({ titel: 'Speichern gestoppt', text: 'Bitte zuerst beheben.', fehler: f.slice(0, 30) }); return; }
      const n = D.anzahl(WEG) + D.anzahl(BS);
      const r = await D.speichern([WEG, BS], `English Journey: ${n} Änderung${n === 1 ? '' : 'en'}`);
      if (r.ok) { toast('💾 Gespeichert – bei den Kindern in 1–2 Minuten'); zeichnen(); return; }
      zeichnen();
      if (r.status === 401) { LWAdmin.anmeldungZeigen('Sitzung abgelaufen – bitte neu anmelden. Deine Änderungen bleiben erhalten.'); return; }
      toast(r.fehler === 'CONFLICT' ? '⚠ Die Datei wurde inzwischen woanders geändert – Seite neu laden (dein Entwurf wird dann angeboten)' : '⚠ ' + r.fehler, true);
    }

    // ── Zeichnen ──
    function stile() {
      if (document.getElementById('jz-stil')) return;
      const st = document.createElement('style'); st.id = 'jz-stil';
      st.textContent = `.jz-tabelle{overflow-x:auto}.jz-tabelle table{width:100%;border-collapse:collapse;font-size:.88rem}.jz-tabelle th,.jz-tabelle td{text-align:left;padding:.45rem .5rem;border-bottom:1px solid var(--line,rgba(255,255,255,.1));vertical-align:top}
        .jz-tabelle select{max-width:9rem;margin-top:.2rem}.jz-tag{font-size:.72rem;border:1px solid currentColor;border-radius:6px;padding:0 .3rem;opacity:.8}
        .jz-k{float:right;display:inline-flex;gap:.25rem}.jz-felder{display:grid;gap:.5rem;margin:.6rem 0}.jz-felder label{display:grid;gap:.2rem;font-size:.85rem}
        .jz-felder input,.jz-felder textarea,.jz-felder select{width:100%}.jz-buch input{width:4.5rem!important}.jz-buch,.jz-checks,.jz-niveau{display:flex;flex-wrap:wrap;gap:.6rem;align-items:center;font-size:.85rem}
        .jz-checks label,.jz-niveau label{display:inline-flex!important;gap:.3rem;align-items:center}.jz-checks input,.jz-niveau input{width:auto!important}
        .jz-schritte{margin:.6rem 0 0 1.2rem;display:grid;gap:.35rem}.jz-schritte li.offen{background:rgba(99,102,241,.08);border-radius:10px;padding:.3rem .5rem}
        .jz-zeile{display:flex;justify-content:space-between;gap:.5rem;align-items:center}.jz-zwei{display:grid;grid-template-columns:1fr 1fr;gap:.8rem}
        @media(max-width:900px){.jz-zwei{grid-template-columns:1fr}}.jz-vorschau .jw-papier{transform-origin:top left}
        .jz-kann{display:flex;flex-wrap:wrap;gap:.4rem;align-items:center;margin:.35rem 0}
        .jz-vorschau .jw-papier p,.jz-vorschau .jw-papier span{color:#111;font-size:.95rem;margin:0}.jz-vorschau .jw-papier .g,.jz-vorschau .jw-papier .ti{color:#3d9b3d}
        .jz-vorschau .jw-papier .merke{color:#ff5050}.jz-felder label.lw-klein{display:inline-flex;gap:.4rem;align-items:center;text-transform:none}
        .jz-felder label.lw-klein input{width:auto}`;
      document.head.appendChild(st);
    }
    function zeichnen() {
      if (!aktiv) return;
      stile();
      if (!J() || !Bl()) { host.innerHTML = `<div class="lw-karte">${ST.fehler ? '⚠ ' + e(ST.fehler) : 'lädt …'}</div>`; return; }
      if (!ST.unit) ST.unit = J().units[0].id;
      const info = D.info(WEG) || {}, binfo = D.info(BS) || {}, n = D.anzahl(WEG) + D.anzahl(BS);
      const veraltet = info.veraltet || binfo.veraltet;
      const reiter = [['uebersicht', '📋 Übersicht'], ['bearbeiten', '✏️ Bearbeiten'], ['klasse', '👥 Klasse'], ['schuljahr', '📅 Schuljahr'], ['drucken', '🖨️ Drucken']];
      const offen = document.activeElement && host.contains(document.activeElement) ? document.activeElement : null;
      const merkeFokus = offen && offen.matches('[data-bs],[data-sf],[data-af],[data-kf]') ? { sel: ['bs', 'sf', 'af', 'kf'].map(k => offen.dataset[k] ? `[data-${k}="${offen.dataset[k]}"]` : '').join('') + (offen.dataset.bsId ? `[data-bs-id="${offen.dataset.bsId}"]` : '') + (offen.dataset.s ? `[data-s="${offen.dataset.s}"]` : ''), pos: offen.selectionStart } : null;
      host.innerHTML = `<div class="lw-karte">
          <div class="lw-u-chips" role="tablist">${reiter.map(([k, t]) => `<button type="button" class="lw-u-chip${ST.reiter === k ? ' an' : ''}" data-jz-reiter="${k}">${t}</button>`).join('')}</div>
          <div class="lw-u-chips" style="margin-top:.5rem">${J().units.map(u => `<button type="button" class="lw-u-chip${u.id === ST.unit ? ' an' : ''}" data-jz-unit="${e(u.id)}">Unit ${e(u.nr)}${Array.isArray(u.abschnitte) ? '' : ' ·'}</button>`).join('')}</div>
          ${info.nurLesen ? `<p class="lw-rot" style="margin-top:.5rem">⚠ Nur lesen: ${info.grund === 'offline' ? 'Worker nicht erreichbar.' : 'Bei Cloudflare läuft noch ein Worker ohne den Journey-Editor – bitte <code>cloudflare/dateien.js</code> (und worker.js) ersetzen.'}</p>` : ''}
          ${veraltet ? `<p class="lw-rot" style="margin-top:.5rem">⚠ Dein Entwurf beruht auf einem älteren Stand.</p><div class="lw-knoepfe"><button type="button" class="lw-btn" data-jz="alt-weg">Entwurf verwerfen</button><button type="button" class="lw-btn" data-jz="alt-behalten">Entwurf behalten</button></div>` : ''}
          <div class="lw-knoepfe"><span class="lw-klein" style="align-self:center">${n ? n + ' ungespeicherte Änderung' + (n === 1 ? '' : 'en') : 'Inhalte gespeichert'}</span>
            <button type="button" class="lw-btn gold" data-jz="speichern"${!n || info.nurLesen || veraltet ? ' disabled' : ''}>💾 Inhalte speichern</button>
            ${n ? '<button type="button" class="lw-btn" data-jz="verwerfen">Verwerfen</button>' : ''}</div>
          <p class="lw-klein">Inhalte (Abschnitte, Hefteinträge, Übungen) gehen mit „Inhalte speichern“ direkt ins Repo. Freigaben, HE-Nummern und Schuljahr
            stehen in der Config – dafür oben „Veröffentlichen“.</p></div>
        ${{ uebersicht, bearbeiten, klasse, schuljahr, drucken }[ST.reiter]()}`;
      if (merkeFokus && merkeFokus.sel) { const el = host.querySelector(merkeFokus.sel); if (el) { el.focus(); try { if (merkeFokus.pos != null) el.setSelectionRange(merkeFokus.pos, merkeFokus.pos); } catch (x) {} } }
    }

    // ── Änderungen ──
    function feldAb(a, k, wert) {
      if (k === 'von' || k === 'bis') {
        const von = k === 'von' ? Number(wert) : (a.buch || {}).von, bis = k === 'bis' ? Number(wert) : (a.buch || {}).bis;
        if (von && bis && bis >= von) a.buch = { von, bis }; else if (von && !bis) a.buch = { von, bis: von }; else if (!von && !bis) delete a.buch;
        return;
      }
      if (['niveaus', 'wahl', 'schluss'].includes(k)) { if (wert) a[k] = true; else delete a[k]; return; }
      if (k === 'merk') { const l = zeilen(wert); if (l.length) a.merk = l; else delete a.merk; return; }
      if (k === 'platz') { if (wert) a.platz = wert; else delete a.platz; return; }
      if (wert === '' && k !== 'titel') delete a[k]; else a[k] = wert;
    }
    function feldSchritt(s, k, wert, el) {
      if (k === 'niveau') {
        const n = [...host.querySelectorAll(`[data-sf="niveau"][data-s="${s.id}"]:checked`)].map(x => Number(x.value));
        if (n.length && n.length < 3) s.niveau = n; else delete s.niveau; return;
      }
      if (['seite', 'bis', 'uebung'].includes(k)) {
        const b = Object.assign({}, s.buch || {});
        if (k === 'uebung') { if (wert) b.uebung = wert; else delete b.uebung; } else if (wert) b[k] = Number(wert); else delete b[k];
        if (b.bis && b.seite && b.bis < b.seite) delete b.bis;
        if (b.seite) s.buch = b; else delete s.buch; return;
      }
      if (k === 'runden' || k === 'prozent') { s.ziel = Object.assign({ runden: 1, prozent: 70 }, s.ziel || {}, { [k]: Number(wert) }); return; }
      if (k === 'wiederholen') { if (el.checked) s.wiederholen = true; else delete s.wiederholen; return; }
      if (k === 'he') { if (el.checked) delete s.he; else s.he = false; return; }
      if (wert === '' && k === 'text') delete s.text; else s[k] = wert;
    }
    function feldBaustein(b, k, wert, el) {
      const liste = t => zeilen(t), komma = t => String(t).split(',').map(x => x.trim()).filter(Boolean);
      if (k === 'zeilen') { b.zeilen = String(wert).split('\n').filter((z, i, l) => z.trim() || i < l.length - 1).map(zeileAus); while (b.zeilen.length && !b.zeilen[b.zeilen.length - 1].some(t => t[0].trim())) b.zeilen.pop(); return; }
      if (k === 'items' || k === 'links' || k === 'rechts' || k === 'hilfe' || k === 'checkliste') { const l = liste(wert); if (l.length) b[k] = l; else delete b[k]; return; }
      if (k === 'kasten' || k === 'spalten') { const l = komma(wert); if (l.length) b[k] = l; else delete b[k]; return; }
      if (k === 'wahl') { b.items = liste(wert).map(z => { const [t, o] = z.split('|'); return { t: (t || '').trim(), o: String(o || '').split('/').map(x => x.trim()).filter(Boolean) }; }); return; }
      if (k === 'plakat') { b.plakat = liste(wert).map(z => { const m = /^(.*)\|([hb])$/.exec(z); return m ? [m[1].trim(), m[2]] : [z, '']; }); return; }
      if (k === 'loesung') { const muster = !!host.querySelector(`[data-bs="muster"][data-bs-id="${b.id}"]:checked`); const t = String(wert).trim(); if (!t) delete b.loesung; else b.loesung = muster ? t : liste(t); return; }
      if (k === 'muster') { const l = b.loesung; if (el.checked && Array.isArray(l)) b.loesung = l.join('\n'); if (!el.checked && typeof l === 'string') b.loesung = liste(l); return; }
      if (wert === '' && !['titel', 'typ'].includes(k)) delete b[k]; else b[k] = wert;
    }
    const aenderung = ev => {
      const t = ev.target, u = unit();
      if (t.matches('[data-jz-frei]')) {
        const wer = t.value, aid = t.dataset.jzFrei; if (!wer) return;
        LWAdmin.laufzettelFreigeben(store, J(), wer, aid, `📒 Laufzettel ${werName(wer)}: frei bis „${abschnittIn(J(), aid).a.titel}“`);
        toast(`📒 ${werName(wer)}: frei bis „${abschnittIn(J(), aid).a.titel}“ – jetzt oben veröffentlichen`); return zeichnen();
      }
      if (t.matches('[data-jz-gruppe]')) { ST.klasse.gruppe = t.value; return klasseLaden(); }
      if (t.matches('[data-af]')) {
        const k = t.dataset.af, wert = t.type === 'checkbox' ? t.checked : t.value.trim();
        if (k === 'titel' && !wert) { toast('⚠ Der Abschnitt braucht einen Titel', true); return zeichnen(); }
        aendernWeg(`Abschnitt „${abschnittIn(J(), ST.abschnitt).a.titel}“: ${k}`, j => { const { a } = abschnittIn(j, ST.abschnitt); if (a) feldAb(a, k, wert); });
        return zeichnen();
      }
      if (t.matches('[data-sf]')) {
        const k = t.dataset.sf, sid = t.dataset.s, wert = t.type === 'checkbox' ? t.checked : t.value.trim();
        aendernWeg(`Schritt ${sid}: ${k}`, j => { const { a } = abschnittIn(j, ST.abschnitt); const s = a && a.schritte.find(x => x.id === sid); if (s) feldSchritt(s, k, wert, t); });
        return zeichnen();
      }
      if (t.matches('[data-bs]')) {
        const k = t.dataset.bs, id = t.dataset.bsId, wert = t.type === 'checkbox' ? t.checked : t.value;
        if (k === 'titel' && !String(wert).trim()) { toast('⚠ Titel darf nicht leer sein', true); return zeichnen(); }
        aendernBs(`Baustein ${id}: ${k}`, d => { const b = d.bausteine.find(x => x.id === id); if (b) feldBaustein(b, k, k === 'zeilen' || k === 'loesung' ? wert : (typeof wert === 'string' ? wert.trim() : wert), t); });
        return zeichnen();
      }
      if (t.matches('[data-kf]')) {
        const k = t.dataset.kf;
        if (k === 'teil' || k === 'text') { const id = t.dataset.kb, w = t.value.trim(); if (!w) return zeichnen(); aendernBs(`Kann-Satz ${id}: ${k}`, d => { const b = d.bausteine.find(x => x.id === id); if (b) b[k] = w; }); return zeichnen(); }
        const i = Number(t.dataset.ki);
        aendernWeg(`Kann-Satz ${i + 1}: ${k}`, j => { const x = j.units.find(y => y.id === u.id).kann[i];
          if (k === 'abschnitt') { x.abschnitt = t.value || null; } else if (t.checked) x.imUnterricht = true; else delete x.imUnterricht; });
        return zeichnen();
      }
    };
    const klick = ev => {
      const b = ev.target.closest('button'); if (!b || !host.contains(b)) return;
      if (b.closest('summary')) ev.preventDefault();
      const d = b.dataset, u = unit();
      if (d.jzReiter) { ST.reiter = d.jzReiter; if (ST.reiter === 'klasse' && !ST.klasse.zeilen && !ST.klasse.laedt) klasseLaden(); return zeichnen(); }
      if (d.jzUnit) { ST.unit = d.jzUnit; ST.abschnitt = ST.schritt = null; return zeichnen(); }
      if (d.jzBearbeiten) { ST.reiter = 'bearbeiten'; ST.abschnitt = d.jzBearbeiten; ST.schritt = null; return zeichnen(); }
      if (d.jzDruck) return druckOeffnen(d.jzDruck);
      if (d.jzMarkup) {
        const ta = host.querySelector(`[data-bs="zeilen"][data-bs-id="${d.ziel}"]`); if (!ta) return;
        const a = ta.selectionStart, z = ta.selectionEnd; if (a === z) { toast('Erst Wörter markieren', true); return; }
        ta.value = ta.value.slice(0, a) + d.jzMarkup + ta.value.slice(a, z) + d.jzMarkup + ta.value.slice(z);
        ta.dispatchEvent(new Event('change', { bubbles: true })); return;
      }
      if (d.jzAbZug) {
        const i = u.abschnitte.findIndex(a => a.id === d.ab), k = i + Number(d.jzAbZug);
        aendernWeg(`Abschnitt verschoben`, j => { const l = j.units.find(y => y.id === u.id).abschnitte; [l[i], l[k]] = [l[k], l[i]]; });
        return zeichnen();
      }
      if (d.jzS) {
        const sid = d.sid;
        if (d.jzS === 'auf') { ST.schritt = ST.schritt === sid ? null : sid; return zeichnen(); }
        aendernWeg(`Schritt ${sid}: ${d.jzS === 'weg' ? 'gelöscht' : 'verschoben'}`, j => {
          const { a } = abschnittIn(j, ST.abschnitt), i = a.schritte.findIndex(x => x.id === sid);
          if (d.jzS === 'weg') a.schritte.splice(i, 1); else { const k = i + (d.jzS === 'hoch' ? -1 : 1); [a.schritte[i], a.schritte[k]] = [a.schritte[k], a.schritte[i]]; }
        });
        return zeichnen();
      }
      const akt = d.jz;
      if (akt === 'speichern') return speichern();
      if (akt === 'verwerfen') { if (confirm('Alle ungespeicherten Änderungen am Journey verwerfen?')) { D.verwerfen(WEG); D.verwerfen(BS); zeichnen(); } return; }
      if (akt === 'alt-weg') { D.verwerfen(WEG); D.verwerfen(BS); return zeichnen(); }
      if (akt === 'alt-behalten') { D.entwurfBehalten(WEG); D.entwurfBehalten(BS); return zeichnen(); }
      if (akt === 'klasse-laden') return klasseLaden();
      if (akt === 'laufzettel-anlegen') { aendernWeg(`Unit ${u.nr}: Laufzettel angelegt`, j => { const x = j.units.find(y => y.id === u.id); x.abschnitte = []; x.kann = x.kann || []; }); ST.reiter = 'bearbeiten'; return zeichnen(); }
      if (akt === 'abschnitt-neu') {
        const titel = (host.querySelector('[data-jz-neu-ab]') || {}).value.trim(); if (!titel) { toast('⚠ Titel eingeben', true); return; }
        const id = neueId(`${u.id}-a-${slug(titel)}`);
        aendernWeg(`Abschnitt „${titel}“ angelegt`, j => { j.units.find(y => y.id === u.id).abschnitte.push({ id, titel, schritte: [] }); });
        ST.abschnitt = id; return zeichnen();
      }
      if (akt === 'schritt-neu') {
        const art = (host.querySelector('[data-jz-neu-art]') || {}).value, aid = d.ab, nr = abschnittIn(J(), aid).a.schritte.length + 1;
        const sid = neueId(`${aid}-${{ hefteintrag: 'he', buch: 'buch', eigen: 'ue', station: 'app', thema: 'app', lesen: 'lesen', vokabeln: 'vok', partner: 'partner', hoeren: 'hoeren' }[art]}`);
        let s;
        if (art === 'hefteintrag') {
          const bid = neueId(`he-${u.id}-${slug(abschnittIn(J(), aid).a.titel)}`);
          aendernBs('Neuer Hefteintrag', dd => { dd.bausteine.push({ id: bid, art: 'hefteintrag', titel: 'Neuer Hefteintrag', zeilen: [] }); });
          s = { id: sid, art: 'hefteintrag', baustein: bid };
        } else if (art === 'eigen') {
          const bid = neueId(`ue-${u.id}-${slug(abschnittIn(J(), aid).a.titel)}-${nr}`);
          aendernBs('Neue Übung', dd => { dd.bausteine.push({ id: bid, art: 'uebung', typ: 'luecken', titel: 'Neue Übung', heft: 'Schreibe die ganzen Sätze ins Heft.' }); });
          s = { id: sid, art: 'uebung', baustein: bid };
        } else if (art === 'buch') s = { id: sid, art: 'uebung', buch: { seite: (abschnittIn(J(), aid).a.buch || {}).von || 1 }, text: 'Schreibe die ganzen Sätze ins Heft.' };
        else if (art === 'station') {
          const belegt = new Set(J().units.flatMap(x => (x.abschnitte || []).flatMap(y => y.schritte.map(z => z.station).filter(Boolean))));
          const frei = u.stationen.find(x => !belegt.has(x.id)); if (!frei) { toast('⚠ Alle Stationen dieser Unit stehen schon in Abschnitten', true); return; }
          s = { id: sid, art: 'app', station: frei.id };
        } else if (art === 'thema') s = { id: sid, art: 'app', thema: 'en.6.vok.' + u.id, ziel: { runden: 1, prozent: 70 }, text: 'Übe in der Lernwelt.' };
        else s = { id: sid, art, text: { lesen: 'Lies den Text.', vokabeln: 'Schreibe diese Wörter mit der deutschen Bedeutung in dein Vokabelheft: …', partner: 'Mit einem Partner: …', hoeren: 'Hör zu: …' }[art] };
        aendernWeg(`Schritt ${ARTEN[art]} in „${abschnittIn(J(), aid).a.titel}“`, j => { abschnittIn(j, aid).a.schritte.push(s); });
        ST.schritt = sid; return zeichnen();
      }
      if (akt === 'kann-neu') {
        const bid = neueId(`kann-${u.id}-${(u.kann || []).length + 1}`);
        const kann = { id: bid, art: 'kann', text: '…' }; kann.teil = 'Grammatik';      // so geschrieben, weil pruefen.py das Muster für Admin-Teile sucht
        aendernBs('Neuer Kann-Satz', dd => { dd.bausteine.push(kann); });
        aendernWeg('Kann-Satz angehängt', j => { const x = j.units.find(y => y.id === u.id); (x.kann || (x.kann = [])).push({ baustein: bid, abschnitt: null }); });
        return zeichnen();
      }
      if (akt === 'kann-weg') { const i = Number(d.ki); aendernWeg('Kann-Satz entfernt', j => { j.units.find(y => y.id === u.id).kann.splice(i, 1); }); return zeichnen(); }
      if (akt === 'schuljahr-neu') {
        const jy = (store.daten() || {}).journey || {}, neu = naechstesJahr(jy.schuljahr);
        LWAdmin.dialog({ titel: `Neues Schuljahr ${neu} beginnen?`, text: 'Freigaben, HE-Nummern, Mindestniveau und Reihenfolge werden zurückgesetzt. Inhalte bleiben.', ja: 'Ja, beginnen' }).then(ok => {
          if (!ok) return;
          store.aendern(`📅 English Journey: neues Schuljahr ${neu}`, c => {
            const j = c.journey && typeof c.journey === 'object' ? c.journey : (c.journey = {});
            j.schuljahr = neu;
            Object.values(j.wege || {}).forEach(w => { delete w.bis; delete w.he; delete w.niveau; delete w.reihenfolge; });
          });
          toast(`📅 Schuljahr ${neu} – jetzt oben veröffentlichen`); zeichnen();
        });
        return;
      }
    };
    const aufklappen = ev => {
      const s = ev.target.closest('summary'); if (!s || !host.contains(s) || ev.target.closest('button')) return;
      const det = s.closest('[data-jz-ab]'); if (!det) return;
      ev.preventDefault(); ST.abschnitt = ST.abschnitt === det.dataset.jzAb ? null : det.dataset.jzAb; ST.schritt = null; zeichnen();
    };
    host.addEventListener('change', aenderung);
    host.addEventListener('click', aufklappen);
    host.addEventListener('click', klick);
    const ab1 = D.abonnieren(zeichnen), ab2 = store.abonnieren(() => { if (ST.reiter !== 'bearbeiten') zeichnen(); });
    zeichnen();
    laden();
    return () => { aktiv = false; ab1(); ab2(); host.removeEventListener('change', aenderung); host.removeEventListener('click', aufklappen); host.removeEventListener('click', klick); };
  },
});
