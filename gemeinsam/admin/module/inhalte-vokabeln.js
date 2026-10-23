// ═══════════════════════════════════════════════════════
//  Admin-Modul Inhalte → Vokabeln  (Admin-Umbau Etappe 8: Editoren I)
//  Units, Abschnitte und Wörter von daten/vokabeln<klasse>.json bearbeiten – ohne JSON:
//  anlegen, ändern, verschieben; Import per Copy-Paste aus einer Tabelle (Englisch | Deutsch | Unit).
//  Eine neue Unit bekommt ihre Themen-ID (en.<k>.vok.u<n>) und eine Stufe im Katalog (inhalt vok<k>:<unit>) –
//  beides wird zusammen gespeichert (ein Commit über den Worker, cloudflare/dateien.js).
//  Bestehende Units und Abschnitte lassen sich nicht löschen (ihre IDs stehen im Lernstand der Kinder),
//  Wörter schon. Daten: LWAdmin.dateien (gemeinsam/admin/dateien.js).
// ═══════════════════════════════════════════════════════
'use strict';

LWAdmin.modul({
  id: 'vokabeln', bereich: 'inhalte', titel: 'Vokabeln', symbol: '📖', reihenfolge: 7,
  suchbegriffe: ['Vokabeln', 'Wörter', 'Unit', 'Wortliste', 'Englisch', 'Import', 'Vokabeltrainer', 'Abschnitt'],
  zeigen(host, { toast }) {
    const D = LWAdmin.dateien, KATALOG = 'daten/katalog.json', KLASSEN = [5, 6];
    let aktiv = true, klasse = 6, fehler = '', still = false, pruefung = null, importVorschau = null, offen = new Set();
    const pfad = () => `daten/vokabeln${klasse}.json`;
    const e = s => escHtml(String(s == null ? '' : s));
    const slug = s => String(s).toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '').slice(0, 30);
    const zaehle = u => Object.values(u.themes || {}).reduce((n, t) => n + (t.words || []).length, 0);
    const vok = () => D.daten(pfad());
    const server = () => (D.info(pfad()) || {}).server || {};

    function laden() {
      fehler = '';
      Promise.all([D.laden(pfad()), D.laden(KATALOG)]).catch(x => { fehler = x.status === 401 ? 'Anmeldung abgelaufen – bitte neu anmelden' : (x.message || String(x)); }).then(zeichnen);
    }

    // ── Prüfung: doppelte Wörter, leere Felder, fehlende Unit ──
    function pruefen() {
      const v = vok(), k = D.daten(KATALOG), fehlerL = [], warn = [];
      const ids = new Set();
      ((k && k.faecher) || []).forEach(f => (f.bereiche || []).forEach(b => (b.themen || []).forEach(t => { ids.add(t.id); (t.stufen || []).forEach(s => ids.add(s.id)); })));
      const woerter = (liste, wo) => (liste || []).forEach((w, i) => {
        if (!String(w.en || '').trim() || !String(w.de || '').trim()) fehlerL.push(`${wo}: Wort ${i + 1} hat ein leeres Feld`);
        if (/[<>]/.test(w.en + w.de)) fehlerL.push(`${wo}: „${w.en}“ enthält < oder >`);
        if (String(w.en).length > 200 || String(w.de).length > 200) fehlerL.push(`${wo}: „${String(w.en).slice(0, 30)}…“ ist länger als 200 Zeichen`);
      });
      Object.entries(v.units || {}).forEach(([uk, u]) => {
        const name = u.label || uk;
        if (!String(u.label || '').trim()) fehlerL.push(`Unit ${uk} hat keinen Namen`);
        if (!u.thema || !ids.has(u.thema)) fehlerL.push(`${name}: Themen-ID ${u.thema || '–'} fehlt im Katalog`);
        if (!Object.keys(u.themes || {}).length) fehlerL.push(`${name}: hat keinen Abschnitt`);
        const gesehen = new Map();
        Object.entries(u.themes || {}).forEach(([tk, t]) => {
          if (!String(t.label || '').trim()) fehlerL.push(`${name}: ein Abschnitt hat keinen Namen`);
          if (!(t.words || []).length) warn.push(`${name} › ${t.label || tk}: keine Wörter`);
          woerter(t.words, `${name} › ${t.label || tk}`);
          (t.words || []).forEach(w => {
            const key = String(w.en || '').trim().toLowerCase();
            if (!key) return;
            if (gesehen.has(key)) warn.push(`${name}: „${w.en}“ doppelt (${gesehen.get(key)} und ${t.label || tk})`);
            else gesehen.set(key, t.label || tk);
          });
        });
      });
      Object.entries(v.specialLists || {}).forEach(([lk, l]) => woerter(l.words, l.label || lk));
      return { fehler: fehlerL, warnungen: warn };
    }

    // ── Ändern (still = ohne Neuzeichnen, damit der Fokus im nächsten Feld bleibt) ──
    function aendern(text, fn, leise) {
      still = !!leise;
      try { D.aendern(pfad(), `Vokabeln Kl. ${klasse}: ${text}`, fn); } finally { still = false; }
      pruefung = null;
      if (leise) kopf();
    }
    function liste(v, ort) {                       // ort: 'u:<unit>/<abschnitt>' oder 'l:<liste>'
      const [art, rest] = [ort[0], ort.slice(2)];
      if (art === 'l') return v.specialLists[rest];
      const [uk, tk] = rest.split('/');
      return v.units[uk].themes[tk];
    }
    const ortName = ort => {
      const v = vok(); if (ort[0] === 'l') return v.specialLists[ort.slice(2)].label;
      const [uk, tk] = ort.slice(2).split('/'); return v.units[uk].label + ' › ' + v.units[uk].themes[tk].label;
    };
    const verschiebe = (o, key, um) => {           // Schlüssel in einem Objekt nach vorn/hinten
      const k = Object.keys(o), i = k.indexOf(key), j = i + um;
      if (i < 0 || j < 0 || j >= k.length) return o;
      [k[i], k[j]] = [k[j], k[i]];
      return Object.fromEntries(k.map(x => [x, o[x]]));
    };

    // ── Neue Unit: Schlüssel unit<n>, Themen-ID en.<k>.vok.u<n>, Stufe im Katalog ──
    function neueUnit(label) {
      label = String(label || '').trim();
      if (!label) { toast('⚠ Bitte einen Namen für die Unit eingeben', true); return; }
      const v = vok(), k = D.daten(KATALOG);
      const thema = (k.faecher || []).flatMap(f => f.bereiche || []).flatMap(b => b.themen || []).find(t => t.id === `en.${klasse}.vok`);
      if (!thema) { toast(`⚠ Im Katalog fehlt das Thema en.${klasse}.vok`, true); return; }
      const ids = new Set((thema.stufen || []).map(s => s.id));
      let n = 1 + Math.max(0, ...Object.keys(v.units).map(x => (/^unit(\d+)$/.exec(x) || [0, 0])[1]).map(Number));
      while (v.units['unit' + n] || ids.has(`en.${klasse}.vok.u${n}`)) n++;
      const uk = 'unit' + n, id = `en.${klasse}.vok.u${n}`;
      D.aendern(KATALOG, `Katalog: Stufe ${id} „${label}“`, kat => {
        kat.faecher.flatMap(f => f.bereiche).flatMap(b => b.themen).find(t => t.id === thema.id).stufen.push({ id, titel: label, inhalt: `vok${klasse}:${uk}` });
        kat.stand = new Date().toISOString().slice(0, 10);
      });
      offen.add(uk);
      aendern(`neue Unit „${label}“`, d => { d.units[uk] = { label, thema: id, themes: { woerter: { label: 'Wörter', words: [] } } }; });
    }
    /** Unit-Name auch als Titel der Katalog-Stufe übernehmen (gleiche Unit, gleiche Themen-ID) */
    function katalogTitel(u, label) {
      const k = D.daten(KATALOG);
      const st = k && (k.faecher || []).flatMap(f => f.bereiche || []).flatMap(b => b.themen || []).flatMap(t => t.stufen || []).find(s => s.id === u.thema);
      if (st && st.titel !== label) D.aendern(KATALOG, `Katalog: Titel ${u.thema} → „${label}“`, kat => {
        kat.faecher.flatMap(f => f.bereiche).flatMap(b => b.themen).flatMap(t => t.stufen || []).find(s => s.id === u.thema).titel = label;
      });
    }

    // ── Import aus einer Tabelle ──
    function unitFinden(text) {
      const v = vok(), t = String(text || '').trim().toLowerCase();
      if (!t) return null;
      const keys = Object.keys(v.units);
      if (keys.includes(t)) return t;
      const m = /^(?:unit\s*)?(\d+)\b/.exec(t);
      if (m && keys.includes('unit' + m[1])) return 'unit' + m[1];
      if (/^(intro|einführung|einfuehrung|welcome)/.test(t) && keys.includes('intro')) return 'intro';
      return keys.find(k => String(v.units[k].label).toLowerCase() === t) || keys.find(k => String(v.units[k].label).toLowerCase().startsWith(t)) || null;
    }
    function importLesen(text, ziel, abschnitt) {
      const v = vok(), zeilen = [];
      String(text || '').split(/\r?\n/).forEach((z, i) => {
        if (!z.trim()) return;
        const teile = (z.includes('\t') ? z.split('\t') : z.includes('|') ? z.split('|') : z.includes(';') ? z.split(';') : z.split(/\s+[=–-]\s+/)).map(s => s.trim());
        if (i === 0 && /^(englisch|english|en)$/i.test(teile[0])) return;          // Kopfzeile
        const [en = '', de = '', unitText = ''] = teile;
        const uk = unitText ? unitFinden(unitText) : ziel;
        const r = { en, de, unitText, uk, status: 'neu' };
        if (!en || !de) r.status = 'leer';
        else if (/[<>]/.test(en + de)) r.status = 'zeichen';
        else if (!uk || !v.units[uk]) r.status = 'unit';
        else if (Object.values(v.units[uk].themes).some(t => (t.words || []).some(w => w.en.trim().toLowerCase() === en.toLowerCase() && w.de.trim() === de))
          || zeilen.some(x => x.status === 'neu' && x.uk === uk && x.en.toLowerCase() === en.toLowerCase())) r.status = 'da';
        zeilen.push(r);
      });
      return { zeilen, abschnitt: String(abschnitt || '').trim() || 'Import' };
    }
    function importUebernehmen() {
      const iv = importVorschau, neu = iv.zeilen.filter(z => z.status === 'neu');
      if (!neu.length) return;
      aendern(`${neu.length} Wörter importiert (Abschnitt „${iv.abschnitt}“)`, d => {
        neu.forEach(z => {
          const u = d.units[z.uk];
          let tk = Object.keys(u.themes).find(k => u.themes[k].label === iv.abschnitt);
          if (!tk) {
            const basis = slug(iv.abschnitt) || 'import';
            tk = basis; for (let n = 2; u.themes[tk]; n++) tk = basis + n;
            u.themes[tk] = { label: iv.abschnitt, words: [] };
          }
          u.themes[tk].words.push({ en: z.en, de: z.de });
          offen.add(z.uk);
        });
        // leere, noch ungespeicherte Abschnitte (z. B. „Wörter“ einer neuen Unit) fallen weg
        new Set(neu.map(z => z.uk)).forEach(uk => {
          const u = d.units[uk], alt = ((server().units || {})[uk] || {}).themes || {};
          Object.keys(u.themes).forEach(tk => { if (!alt[tk] && !(u.themes[tk].words || []).length && Object.keys(u.themes).length > 1) delete u.themes[tk]; });
        });
      });
      importVorschau = null;
      zeichnen();
      toast(`📋 ${neu.length} Wörter übernommen – noch nicht gespeichert`);
    }

    // ── Speichern ──
    async function speichern() {
      const p = pruefen();
      pruefung = p;
      if (p.fehler.length) { zeichnen(); await LWAdmin.dialog({ titel: 'Speichern gestoppt', text: 'Bitte zuerst beheben.', fehler: p.fehler.slice(0, 30), warnungen: p.warnungen.slice(0, 20) }); return; }
      if (p.warnungen.length && !await LWAdmin.dialog({ titel: 'Trotzdem speichern?', warnungen: p.warnungen.slice(0, 30), ja: '💾 Trotzdem speichern' })) return;
      const n = D.anzahl(pfad()) + D.anzahl(KATALOG);
      const knopf = host.querySelector('[data-vok="speichern"]');
      if (knopf) { knopf.disabled = true; knopf.textContent = 'Speichert …'; }
      const r = await D.speichern([pfad(), KATALOG], `Inhalte: Vokabeln Kl. ${klasse} (${n} Änderung${n === 1 ? '' : 'en'})`);
      if (r.ok) { pruefung = null; toast('💾 Gespeichert – im Vokabeltrainer und in den Spielen in 1–2 Minuten'); zeichnen(); return; }
      zeichnen();
      if (r.status === 401) { LWAdmin.anmeldungZeigen('Sitzung abgelaufen – bitte neu anmelden. Deine Vokabel-Änderungen bleiben erhalten.'); return; }
      toast(r.fehler === 'CONFLICT' ? '⚠ Die Datei wurde inzwischen woanders geändert – Seite neu laden (dein Entwurf wird dann angeboten)' : '⚠ ' + r.fehler, true);
    }

    // ── Zeichnen ──
    function kopf() {
      const el = host.querySelector('.lw-vok-kopf');
      if (!el) return;
      const n = D.anzahl(pfad()) + D.anzahl(KATALOG), info = D.info(pfad()) || {};
      el.querySelector('.lw-vok-zahl').textContent = n ? (n === 1 ? '1 ungespeicherte Änderung' : n + ' ungespeicherte Änderungen') : 'alles gespeichert';
      el.querySelector('[data-vok="speichern"]').disabled = !n || info.nurLesen || info.veraltet;
      el.querySelector('[data-vok="verwerfen"]').hidden = !n;
      const l = el.querySelector('.lw-vok-aenderungen');
      if (l) l.innerHTML = D.aenderungen(pfad()).concat(D.aenderungen(KATALOG)).slice(-40).reverse().map(t => `<li>${e(t)}</li>`).join('');
      const v = vok();
      if (v) el.querySelector('.lw-vok-stat').textContent = `${Object.keys(v.units).length} Units · ${Object.values(v.units).reduce((s, u) => s + zaehle(u), 0)} Wörter`;
    }
    function wortZeilen(ort, words, neuAb) {
      return `<div class="lw-vok-woerter" data-ort="${e(ort)}">${(words || []).map((w, i) => `<div class="lw-vok-wort">
          <input value="${e(w.en)}" data-feld="en" data-i="${i}" aria-label="Englisch" placeholder="Englisch"${!w.en ? ' class="leer"' : ''}>
          <input value="${e(w.de)}" data-feld="de" data-i="${i}" aria-label="Deutsch" placeholder="Deutsch"${!w.de ? ' class="leer"' : ''}>
          <span class="lw-vok-k"><button type="button" class="lw-btn klein" data-wort="hoch" data-i="${i}" aria-label="nach oben"${i ? '' : ' disabled'}>▲</button><button type="button" class="lw-btn klein" data-wort="runter" data-i="${i}" aria-label="nach unten"${i < words.length - 1 ? '' : ' disabled'}>▼</button><button type="button" class="lw-btn klein" data-wort="weg" data-i="${i}" aria-label="Wort löschen">✕</button></span>
        </div>`).join('')}
        <button type="button" class="lw-btn klein" data-wort="neu">＋ Wort</button></div>`;
    }
    function unitInhalt(uk, u) {
      const alt = (server().units || {})[uk];
      const tks = Object.keys(u.themes);
      return `<div class="lw-vok-zeile"><label>Name der Unit <input value="${e(u.label)}" data-unit-label="${e(uk)}" maxlength="120"></label>
          <span class="lw-klein">Themen-ID <code>${e(u.thema)}</code> · Schlüssel <code>${e(uk)}</code></span></div>` +
        tks.map((tk, i) => {
          const t = u.themes[tk], neuT = !alt || !alt.themes || !alt.themes[tk];
          return `<div class="lw-vok-abschnitt"><div class="lw-vok-zeile">
              <label>Abschnitt <input value="${e(t.label)}" data-abschnitt-label="${e(uk + '/' + tk)}" maxlength="120"></label>
              <span class="lw-klein">${(t.words || []).length} Wörter</span>
              <span class="lw-vok-k"><button type="button" class="lw-btn klein" data-abschnitt="hoch" data-ort="${e(uk + '/' + tk)}" aria-label="Abschnitt nach oben"${i ? '' : ' disabled'}>▲</button><button type="button" class="lw-btn klein" data-abschnitt="runter" data-ort="${e(uk + '/' + tk)}" aria-label="Abschnitt nach unten"${i < tks.length - 1 ? '' : ' disabled'}>▼</button>${neuT && tks.length > 1 ? `<button type="button" class="lw-btn klein" data-abschnitt="weg" data-ort="${e(uk + '/' + tk)}" aria-label="Abschnitt löschen">✕</button>` : ''}</span>
            </div>${wortZeilen('u:' + uk + '/' + tk, t.words)}</div>`;
        }).join('') +
        `<div class="lw-knoepfe"><input placeholder="Name des neuen Abschnitts" data-neu-abschnitt="${e(uk)}" maxlength="120" aria-label="Name des neuen Abschnitts"><button type="button" class="lw-btn klein" data-abschnitt="neu" data-ort="${e(uk)}">＋ Abschnitt</button></div>`;
    }
    function importKarte() {
      const v = vok(), units = Object.entries(v.units);
      const iv = importVorschau;
      const stat = iv ? ['neu', 'da', 'unit', 'leer', 'zeichen'].map(s => [s, iv.zeilen.filter(z => z.status === s).length]) : [];
      const TEXT = { neu: '✅ neu', da: '↷ schon da', unit: '⚠ Unit fehlt', leer: '⚠ leeres Feld', zeichen: '⚠ < oder >' };
      return `<details class="lw-karte"${iv ? ' open' : ''} data-vok-import><summary><b>📋 Import aus einer Tabelle</b> <span class="lw-klein">Englisch | Deutsch | Unit</span></summary>
        <p class="lw-klein" style="margin:.5rem 0">Zeilen aus Excel, Numbers oder einer Word-Tabelle kopieren und hier einfügen. Spalten: Englisch, Deutsch und – freiwillig – Unit
          (z. B. „Unit 3“ oder „3“). Getrennt durch Tabulator, „|“ oder „;“. Ohne Unit-Spalte landen die Wörter in der gewählten Unit.</p>
        <textarea rows="6" data-vok-import-text placeholder="house | Haus | Unit 2&#10;garden | Garten | Unit 2" style="width:100%">${e(iv ? iv.text : '')}</textarea>
        <div class="lw-knoepfe">
          <label class="lw-klein">Unit (wenn keine Spalte) <select data-vok-import-ziel>${units.map(([k, u]) => `<option value="${e(k)}"${iv ? (iv.ziel === k ? ' selected' : '') : (k === units[units.length - 1][0] ? ' selected' : '')}>${e(u.label)}</option>`).join('')}</select></label>
          <label class="lw-klein">Abschnitt <input data-vok-import-abschnitt value="${e(iv ? iv.abschnitt : 'Import')}" maxlength="120"></label>
          <button type="button" class="lw-btn klein" data-vok="vorschau">👀 Vorschau</button>
        </div>
        ${iv ? `<p class="lw-klein" style="margin-top:.6rem">${stat.filter(s => s[1]).map(([s, n]) => `${TEXT[s]}: ${n}`).join(' · ') || 'keine Zeilen'}</p>
          <div class="lw-vok-vorschau"><table><thead><tr><th>Englisch</th><th>Deutsch</th><th>Unit</th><th></th></tr></thead><tbody>${iv.zeilen.slice(0, 300).map(z =>
            `<tr class="${z.status === 'neu' ? '' : 'nein'}"><td>${e(z.en)}</td><td>${e(z.de)}</td><td>${e(z.uk ? v.units[z.uk].label : z.unitText || '–')}</td><td>${TEXT[z.status]}</td></tr>`).join('')}</tbody></table></div>
          <div class="lw-knoepfe"><button type="button" class="lw-btn gold" data-vok="uebernehmen"${stat[0][1] ? '' : ' disabled'}>Übernehmen (${stat[0][1]} Wörter)</button><button type="button" class="lw-btn" data-vok="import-weg">Abbrechen</button></div>` : ''}
      </details>`;
    }
    function zeichnen() {
      if (!aktiv || still) return;
      const info = D.info(pfad()), kinfo = D.info(KATALOG), v = vok();
      const chips = `<div class="lw-u-chips" role="radiogroup" aria-label="Klasse">${KLASSEN.map(k =>
        `<button type="button" class="lw-u-chip${k === klasse ? ' an' : ''}" data-vok-klasse="${k}" role="radio" aria-checked="${k === klasse}">Klasse ${k}</button>`).join('')}</div>`;
      if (!v || !D.daten(KATALOG)) { host.innerHTML = `<div class="lw-karte">${chips}<p style="margin-top:.6rem">${fehler ? '⚠ ' + e(fehler) : 'lädt …'}</p></div>`; return; }
      const veraltet = (info && info.veraltet) || (kinfo && kinfo.veraltet);
      const p = pruefung;
      host.innerHTML = `
        <div class="lw-karte lw-vok-kopf">
          ${chips}
          <p class="lw-klein" style="margin-top:.5rem">${e((v.meta && v.meta.buch) || '')} · <span class="lw-vok-stat"></span> · <code>${e(pfad())}</code></p>
          ${info.nurLesen ? `<p class="lw-rot" style="margin-top:.5rem">⚠ Nur lesen: ${info.grund === 'offline' ? 'Worker nicht erreichbar.' : 'Bei Cloudflare läuft noch der alte Worker – bitte <code>cloudflare/worker.js</code> ersetzen und <code>cloudflare/dateien.js</code> anlegen (cloudflare/ANLEITUNG.md).'}</p>` : ''}
          ${veraltet ? `<p class="lw-rot" style="margin-top:.5rem">⚠ Dein Entwurf beruht auf einem älteren Stand der Datei (inzwischen anderswo gespeichert).</p>
            <div class="lw-knoepfe"><button type="button" class="lw-btn" data-vok="alt-weg">Entwurf verwerfen</button><button type="button" class="lw-btn" data-vok="alt-behalten">Entwurf behalten (ersetzt den neueren Stand)</button></div>` : ''}
          <div class="lw-knoepfe"><span class="lw-vok-zahl lw-klein" style="align-self:center"></span>
            <button type="button" class="lw-btn" data-vok="pruefen">🔍 Prüfen</button>
            <button type="button" class="lw-btn gold" data-vok="speichern">💾 Speichern</button>
            <button type="button" class="lw-btn" data-vok="verwerfen">Verwerfen</button></div>
          <details style="margin-top:.5rem"><summary class="lw-klein">Änderungen</summary><ul class="lw-liste lw-klein lw-vok-aenderungen"></ul></details>
          <p class="lw-klein" style="margin-top:.5rem">Gespeichert wird direkt ins Repo (unabhängig von „Veröffentlichen“). Danach in 1–2 Minuten im Vokabeltrainer und in den Spielen.</p>
        </div>
        ${p ? `<div class="lw-karte"><h2>🔍 Prüfung</h2>${!p.fehler.length && !p.warnungen.length ? '<p>✅ Alles in Ordnung.</p>' : ''}
          ${p.fehler.length ? `<h3>⛔ Fehler (${p.fehler.length})</h3><ul class="lw-liste lw-rot">${p.fehler.slice(0, 40).map(x => `<li>${e(x)}</li>`).join('')}</ul>` : ''}
          ${p.warnungen.length ? `<h3>⚠️ Warnungen (${p.warnungen.length})</h3><ul class="lw-liste">${p.warnungen.slice(0, 40).map(x => `<li>${e(x)}</li>`).join('')}</ul>` : ''}</div>` : ''}
        <div class="lw-karte"><h2>➕ Neue Unit</h2>
          <div class="lw-knoepfe" style="margin-top:0"><input data-vok-neu-unit placeholder="z. B. Unit 6: Back to school" maxlength="120" style="flex:1;min-width:14rem" aria-label="Name der neuen Unit">
            <button type="button" class="lw-btn" data-vok="neue-unit">Unit anlegen</button></div>
          <p class="lw-klein" style="margin-top:.4rem">Bekommt eine eigene Themen-ID und einen Eintrag im Katalog – so kann sie freigegeben werden und zählt für „Meine Themen“.</p></div>
        ${importKarte()}
        ${Object.entries(v.units).map(([uk, u], i, all) => `<details class="lw-karte lw-vok-unit" data-unit="${e(uk)}"${offen.has(uk) ? ' open' : ''}>
          <summary><span class="lw-vok-titel">${e(u.label)}</span> <span class="lw-klein">${zaehle(u)} Wörter${(server().units || {})[uk] ? '' : ' · neu'}</span>
            <span class="lw-vok-k"><button type="button" class="lw-btn klein" data-unit-zug="-1" data-unit-k="${e(uk)}" aria-label="Unit nach oben"${i ? '' : ' disabled'}>▲</button><button type="button" class="lw-btn klein" data-unit-zug="1" data-unit-k="${e(uk)}" aria-label="Unit nach unten"${i < all.length - 1 ? '' : ' disabled'}>▼</button></span></summary>
          <div class="lw-vok-inhalt">${offen.has(uk) ? unitInhalt(uk, u) : ''}</div></details>`).join('')}
        ${v.specialLists && Object.keys(v.specialLists).length ? `<details class="lw-karte lw-vok-unit" data-unit="#listen"${offen.has('#listen') ? ' open' : ''}><summary><span class="lw-vok-titel">Wortlisten</span> <span class="lw-klein">${Object.keys(v.specialLists).length} Listen (Zahlen, Farben …)</span></summary>
          <div class="lw-vok-inhalt">${offen.has('#listen') ? Object.entries(v.specialLists).map(([lk, l]) => `<div class="lw-vok-abschnitt"><div class="lw-vok-zeile">
            <label>Liste <input value="${e(l.label)}" data-liste-label="${e(lk)}" maxlength="120"></label><span class="lw-klein">${(l.words || []).length} Wörter${l.type === 'random_numbers' ? ' · Zahlen-Übung' : ''}</span></div>${wortZeilen('l:' + lk, l.words)}</div>`).join('') : ''}</div></details>` : ''}`;
      kopf();
    }

    // ── Ereignisse ──
    const klick = async ev => {
      const b = ev.target.closest('button');
      if (!b || !host.contains(b)) return;
      if (b.closest('summary')) ev.preventDefault();
      const v = vok();
      if (b.dataset.vokKlasse) { klasse = Number(b.dataset.vokKlasse); pruefung = null; importVorschau = null; offen = new Set(); zeichnen(); laden(); return; }
      const a = b.dataset.vok;
      if (a === 'pruefen') { pruefung = pruefen(); zeichnen(); return; }
      if (a === 'speichern') return speichern();
      if (a === 'verwerfen') {
        if (confirm('Alle ungespeicherten Änderungen an den Vokabeln (und am Katalog) verwerfen?')) { D.verwerfen(pfad()); D.verwerfen(KATALOG); pruefung = null; zeichnen(); }
        return;
      }
      if (a === 'alt-weg') { D.verwerfen(pfad()); D.verwerfen(KATALOG); zeichnen(); return; }
      if (a === 'alt-behalten') { D.entwurfBehalten(pfad()); D.entwurfBehalten(KATALOG); zeichnen(); return; }
      if (a === 'neue-unit') return neueUnit((host.querySelector('[data-vok-neu-unit]') || {}).value);
      if (a === 'vorschau') {
        const text = host.querySelector('[data-vok-import-text]').value, ziel = host.querySelector('[data-vok-import-ziel]').value;
        importVorschau = { ...importLesen(text, ziel, host.querySelector('[data-vok-import-abschnitt]').value), text, ziel };
        zeichnen(); return;
      }
      if (a === 'uebernehmen') return importUebernehmen();
      if (a === 'import-weg') { importVorschau = null; zeichnen(); return; }
      if (b.dataset.unitZug) {
        const uk = b.dataset.unitK;
        aendern(`„${v.units[uk].label}“ ${b.dataset.unitZug === '1' ? 'nach unten' : 'nach oben'}`, d => { d.units = verschiebe(d.units, uk, Number(b.dataset.unitZug)); });
        return;
      }
      if (b.dataset.abschnitt) {
        const ort = b.dataset.ort;
        if (b.dataset.abschnitt === 'neu') {
          const inp = host.querySelector(`[data-neu-abschnitt="${CSS.escape(ort)}"]`), label = String(inp && inp.value || '').trim();
          if (!label) { toast('⚠ Bitte einen Namen für den Abschnitt eingeben', true); return; }
          const basis = slug(label) || 'abschnitt'; let tk = basis;
          for (let n = 2; v.units[ort].themes[tk]; n++) tk = basis + n;
          aendern(`${v.units[ort].label}: Abschnitt „${label}“`, d => { d.units[ort].themes[tk] = { label, words: [] }; });
          return;
        }
        const [uk, tk] = ort.split('/');
        if (b.dataset.abschnitt === 'weg') {
          if (!confirm(`Abschnitt „${v.units[uk].themes[tk].label}“ mit ${(v.units[uk].themes[tk].words || []).length} Wörtern löschen?`)) return;
          aendern(`${v.units[uk].label}: Abschnitt „${v.units[uk].themes[tk].label}“ gelöscht`, d => { delete d.units[uk].themes[tk]; });
          return;
        }
        aendern(`${v.units[uk].label}: Abschnitt „${v.units[uk].themes[tk].label}“ verschoben`, d => { d.units[uk].themes = verschiebe(d.units[uk].themes, tk, b.dataset.abschnitt === 'hoch' ? -1 : 1); });
        return;
      }
      if (b.dataset.wort) {
        const ort = b.closest('[data-ort]').dataset.ort, i = Number(b.dataset.i), l = liste(v, ort);
        if (b.dataset.wort === 'neu') { aendern(`${ortName(ort)}: neues Wort`, d => { liste(d, ort).words.push({ en: '', de: '' }); }); setTimeout(() => {
          const f = host.querySelectorAll(`[data-ort="${CSS.escape(ort)}"] input[data-feld="en"]`); if (f.length) f[f.length - 1].focus(); }, 0); return; }
        const w = l.words[i];
        if (b.dataset.wort === 'weg') { aendern(`${ortName(ort)}: „${w.en || '(leer)'}“ gelöscht`, d => { liste(d, ort).words.splice(i, 1); }); return; }
        const j = b.dataset.wort === 'hoch' ? i - 1 : i + 1;
        aendern(`${ortName(ort)}: „${w.en}“ verschoben`, d => { const ws = liste(d, ort).words; [ws[i], ws[j]] = [ws[j], ws[i]]; });
      }
    };
    const aenderung = ev => {
      const t = ev.target, v = vok();
      if (t.dataset.feld) {
        const ort = t.closest('[data-ort]').dataset.ort, i = Number(t.dataset.i), wert = t.value.trim(), alt = liste(v, ort).words[i];
        if (!alt || alt[t.dataset.feld] === wert) return;
        t.classList.toggle('leer', !wert);
        aendern(`${ortName(ort)}: „${alt[t.dataset.feld] || '(leer)'}“ → „${wert}“`, d => { liste(d, ort).words[i][t.dataset.feld] = wert; }, true);
      } else if (t.dataset.unitLabel) {
        const uk = t.dataset.unitLabel, wert = t.value.trim();
        if (!wert || wert === v.units[uk].label) return;
        aendern(`Unit „${v.units[uk].label}“ heißt jetzt „${wert}“`, d => { d.units[uk].label = wert; }, true);
        still = true;
        try { katalogTitel(v.units[uk], wert); } finally { still = false; }
        const s = host.querySelector(`[data-unit="${CSS.escape(uk)}"] .lw-vok-titel`); if (s) s.textContent = wert;
        kopf();
      } else if (t.dataset.abschnittLabel) {
        const [uk, tk] = t.dataset.abschnittLabel.split('/'), wert = t.value.trim();
        if (!wert || wert === v.units[uk].themes[tk].label) return;
        aendern(`${v.units[uk].label}: Abschnitt „${v.units[uk].themes[tk].label}“ heißt jetzt „${wert}“`, d => { d.units[uk].themes[tk].label = wert; }, true);
      } else if (t.dataset.listeLabel) {
        const lk = t.dataset.listeLabel, wert = t.value.trim();
        if (!wert || wert === v.specialLists[lk].label) return;
        aendern(`Liste „${v.specialLists[lk].label}“ heißt jetzt „${wert}“`, d => { d.specialLists[lk].label = wert; }, true);
      }
    };
    const umschalten = ev => {                     // Unit auf-/zuklappen: Inhalt erst beim Öffnen bauen
      const d = ev.target;
      if (!d.matches || !d.matches('details.lw-vok-unit')) return;
      const uk = d.dataset.unit, v = vok();
      if (d.open) {
        offen.add(uk);
        const box = d.querySelector('.lw-vok-inhalt');
        if (box && !box.innerHTML) {
          if (uk === '#listen') zeichnen();
          else box.innerHTML = unitInhalt(uk, v.units[uk]);
        }
      } else offen.delete(uk);
    };
    host.addEventListener('click', klick);
    host.addEventListener('change', aenderung);
    host.addEventListener('toggle', umschalten, true);
    const ab = D.abonnieren(zeichnen);
    zeichnen();
    laden();
    return () => { aktiv = false; ab(); host.removeEventListener('click', klick); host.removeEventListener('change', aenderung); host.removeEventListener('toggle', umschalten, true); };
  },
});
