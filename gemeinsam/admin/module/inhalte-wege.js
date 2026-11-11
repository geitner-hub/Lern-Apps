// ═══════════════════════════════════════════════════════
//  Admin-Modul Inhalte → Lernwege  (Aktionsplan „Lernwelt – Tempo“, Etappe 6b: Lernweg-Editor)
//  2D-Lernwege (apps/typen/weg.html) ohne JSON anlegen und pflegen: Weg anlegen, Abschnitte und Schritte per Formular
//  hinzufügen, verschieben, auf Pflicht/Wahl/Stern stellen. Hefteinträge in einem Textfeld (*grün*, **fett**) – wie im
//  Journey-Editor – und eigene Aufgaben werden als Baustein gespeichert.
//  Dateien: daten/wege/liste.json, daten/wege/<Weg-ID>.json, daten/wege/bausteine-<Weg-ID>.json – gespeichert direkt ins Repo
//  über den Worker (/dateien/speichern, cloudflare/dateien.js prüft dieselben Regeln wie pruefen.py Regel 24), ein Commit.
//  IDs vergibt der Editor selbst und ändert sie nie mehr (Lernstand jw:<ID>, Freigaben). Löschen gibt es nicht:
//  „Ausblenden“ setzt "aus": true – die Kinder sehen den Schritt nicht mehr, kein Lernstand verwaist.
//  „Fürs neue Schuljahr kopieren“ legt den Weg unter neuer ID an (alle IDs neu → frischer Lernstand).
//  Entwurf nur im Arbeitsspeicher dieser Seite: vor dem Verlassen speichern. Freigabe: Gruppen → 📒 Laufzettel.
// ═══════════════════════════════════════════════════════
'use strict';

LWAdmin.modul({
  id: 'lernwege', bereich: 'inhalte', titel: 'Lernwege', symbol: '🗺️', reihenfolge: 8,
  suchbegriffe: ['Lernweg', 'Weg anlegen', 'Editor', 'Abschnitt', 'Schritt', 'Hefteintrag', 'Pflicht', 'Wahl', 'Stern', 'neues Schuljahr', 'kopieren', '2D'],
  zeigen(host, { store }) {
    const e = s => escHtml(String(s == null ? '' : s));
    const ROOT = new URL('./', location.href).href, LISTE = 'daten/wege/liste.json';
    const pfadW = id => `daten/wege/${id}.json`, pfadB = id => `daten/wege/bausteine-${id}.json`;
    const ARTEN = { hefteintrag: '📒 Hefteintrag', uebung: '✏️ Übung im Heft', app: '🎮 Lern-App', medium: '🖼️ Medium', check: '🎯 Check' };
    const klon = o => JSON.parse(JSON.stringify(o));
    let aktiv = true, liste = null, listeSha = '', listeAlt = '', nurLesen = '', fehler = '', meldung = '', themen = [], speichert = false;
    const wege = {};            // id → { W, B, shaW, shaB, alt (JSON der geladenen Fassung), neu }
    let aktuell = '', neuForm = null;

    // ── Laden ──
    const lesen = pfade => store.worker('/dateien/lesen', { pfade }).then(d => d.dateien || {});
    async function ladeListe() {
      try { const d = await lesen([LISTE]); liste = d[LISTE].daten; listeSha = d[LISTE].sha; }
      catch (x) {
        // alter Worker oder Testumgebung: nur ansehen
        nurLesen = x.status === 423 ? 'Testumgebung: Speichern ist hier abgeschaltet.' : 'Der Worker kennt den Lernweg-Editor noch nicht – bitte den neuen Worker (v125) bei Cloudflare einfügen. Bis dahin nur ansehen.';
        liste = await fetch(ROOT + LISTE, { cache: 'no-store' }).then(r => r.json());
      }
      listeAlt = JSON.stringify(liste);
    }
    async function ladeWeg(id) {
      if (wege[id]) return;
      let W, B = { version: 1, weg: pfadW(id), bausteine: [] }, shaW = '', shaB = '';
      if (nurLesen) {
        W = await fetch(ROOT + pfadW(id), { cache: 'no-store' }).then(r => r.json());
        B = await fetch(ROOT + pfadB(id), { cache: 'no-store' }).then(r => r.ok ? r.json() : B).catch(() => B);
      } else {
        const d = await lesen([pfadW(id)]); W = d[pfadW(id)].daten; shaW = d[pfadW(id)].sha;
        try { const b = await lesen([pfadB(id)]); B = b[pfadB(id)].daten; shaB = b[pfadB(id)].sha; } catch (x) { if (x.status !== 404) throw x; }
      }
      wege[id] = { W, B, shaW, shaB, alt: JSON.stringify([W, B]), neu: false };
    }
    const X = () => wege[aktuell];
    const geaendert = id => { const x = wege[id]; return !!x && (x.neu || x.alt !== JSON.stringify([x.W, x.B])); };
    const eintrag = id => (liste.wege || []).find(w => w.id === id);

    // ── IDs: fortlaufend, nie wiederverwendet (Ausgeblendetes bleibt in der Datei) ──
    function neueId(basis, vorhandene) {
      let n = 1;
      const re = new RegExp('^' + basis.replace(/[-]/g, '\\-') + '(\\d+)$');
      vorhandene.forEach(i => { const m = re.exec(i); if (m) n = Math.max(n, Number(m[1]) + 1); });
      return basis + n;
    }
    const alleIds = x => x.W.abschnitte.flatMap(a => [a.id, ...a.schritte.map(s => s.id)]).concat((x.W.kann || []).map(k => k.id), x.B.bausteine.map(b => b.id));
    const slug = t => String(t).toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    // ── Hefteintrag-Text (wie im Journey-Editor): *grün* und **fett** ──
    const ZEILE_TEXT = z => z.map(([t, s]) => s === 'g' ? `*${t}*` : s === 'b' ? `**${t}**` : t).join('');
    function zeileAus(text) {
      const out = [], re = /\*\*([^*]+)\*\*|\*([^*]+)\*/g;
      let i = 0, m;
      while ((m = re.exec(text))) {
        if (m.index > i) out.push([text.slice(i, m.index), '']);
        out.push(m[1] !== undefined ? [m[1], 'b'] : [m[2], 'g']);
        i = re.lastIndex;
      }
      if (i < text.length || !out.length) out.push([text.slice(i), '']);
      return out;
    }
    const zeilenListe = t => String(t || '').split('\n').map(z => z.trim()).filter(Boolean);
    const baustein = id => X().B.bausteine.find(b => b.id === id);

    // ── Zeichnen ──
    function schrittHTML(a, s, i) {
      const b = s.baustein ? baustein(s.baustein) : null, sid = e(s.id);
      const feld = (k, titel, wert, mehr) => `<label class="lw-klein" style="display:block;margin:.3rem 0">${titel}<input type="text" data-sf="${k}" data-s="${sid}" value="${e(wert)}" ${mehr || ''} style="width:100%"></label>`;
      let innen = '';
      if (s.art === 'hefteintrag') innen = `<label class="lw-klein" style="display:block;margin:.3rem 0">Überschrift<input type="text" data-bf="titel" data-s="${sid}" value="${e(b ? b.titel : '')}" style="width:100%"></label>
          <label class="lw-klein" style="display:block;margin:.3rem 0">Eintrag – so wie er im Heft stehen soll (*grün*, **fett**)
            <textarea rows="${Math.max(5, ((b && b.zeilen) || []).length + 1)}" data-bf="zeilen" data-s="${sid}" style="width:100%;font-family:inherit">${e(((b && b.zeilen) || []).map(ZEILE_TEXT).join('\n'))}</textarea></label>
          <label class="lw-klein" style="display:block;margin:.3rem 0">Merksatz (optional)<input type="text" data-bf="merke" data-s="${sid}" value="${e((b && b.merke) || '')}" style="width:100%"></label>`;
      else if (s.art === 'uebung') innen = feld('text', 'Arbeitsauftrag', s.text || (b && b.titel) || '')
          + `<div class="lw-knoepfe"><label class="lw-klein">Buch Seite <input type="number" min="1" max="999" data-sf="seite" data-s="${sid}" value="${e(s.buch ? s.buch.seite : '')}" style="width:5rem"></label>
            <label class="lw-klein">Nr. <input type="text" data-sf="buchuebung" data-s="${sid}" value="${e(s.buch && s.buch.uebung || '')}" style="width:6rem"></label></div>
          <label class="lw-klein" style="display:block;margin:.3rem 0">Eigene Aufgaben (optional, je Zeile eine)<textarea rows="3" data-bf="items" data-s="${sid}" style="width:100%;font-family:inherit">${e(((b && b.items) || []).join('\n'))}</textarea></label>
          <label class="lw-klein" style="display:block;margin:.3rem 0">Lösungen dazu (je Zeile eine – die Kinder vergleichen selbst)<textarea rows="3" data-bf="loesung" data-s="${sid}" style="width:100%;font-family:inherit">${e(((b && b.loesung) || []).join('\n'))}</textarea></label>`;
      else if (s.art === 'app') innen = feld('thema', 'Thema (ID aus dem Katalog – erledigt mit einer Runde ab 70 %)', s.thema || '', 'list="lwg-themen"') + feld('text', 'Hinweis (optional)', s.text || '');
      else if (s.art === 'medium') innen = feld('titel', 'Titel', s.titel || '') + feld('link', 'Datei im Repo (Pfad ab Hauptordner, z. B. daten/inhalte/gpg/bilder/limes.webp)', s.link || '') + feld('text', 'Auftrag (optional)', s.text || '');
      else innen = feld('text', 'Text', s.text || '') + feld('thema', 'Check-Thema (optional, ID mit „.probe-check.“)', s.thema || '', 'list="lwg-themen"');
      return `<div class="lw-karte" style="margin:.5rem 0;padding:.7rem .8rem;${s.aus ? 'opacity:.5' : ''}">
        <div class="lw-knoepfe" style="align-items:center"><b>${ARTEN[s.art]}</b>
          <select data-sf="stufe" data-s="${sid}" aria-label="Stufe">${[['pflicht', 'Pflicht'], ['wahl', 'Wahl'], ['stern', '⭐ Stern']].map(([v, t]) => `<option value="${v}"${(s.stufe || 'pflicht') === v ? ' selected' : ''}>${t}</option>`).join('')}</select>
          <span style="flex:1"></span>
          <button type="button" class="lw-btn klein" data-akt="s-hoch" data-s="${sid}" ${i ? '' : 'disabled'} aria-label="nach oben">▲</button>
          <button type="button" class="lw-btn klein" data-akt="s-runter" data-s="${sid}" ${i < a.schritte.length - 1 ? '' : 'disabled'} aria-label="nach unten">▼</button>
          <button type="button" class="lw-btn klein" data-akt="s-aus" data-s="${sid}">${s.aus ? '👁 Einblenden' : '🚫 Ausblenden'}</button></div>
        ${s.aus ? '<p class="lw-klein">Ausgeblendet – die Kinder sehen diesen Schritt nicht.</p>' : innen}
        <code class="lw-klein">${sid}</code></div>`;
    }
    function wegHTML() {
      const x = X(), W = x.W;
      const wahlN = a => a.schritte.filter(s => !s.aus && s.stufe === 'wahl').length;
      return `<datalist id="lwg-themen">${themen.map(t => `<option value="${e(t.id)}">${e(t.titel)}</option>`).join('')}</datalist>
        <div class="lw-karte"><h2>${e((W.ico ? W.ico + ' ' : '') + W.titel)} <code class="lw-klein">${e(W.id)}</code></h2>
          <div class="lw-knoepfe" style="align-items:end">
            <label class="lw-klein">Titel<br><input type="text" data-wf="titel" value="${e(W.titel)}" style="width:16rem"></label>
            <label class="lw-klein">Symbol<br><input type="text" data-wf="ico" value="${e(W.ico || '')}" style="width:4rem"></label>
            <label class="lw-klein">Fach<br><select data-wf="fach">${FAECHER.map(f => `<option${f === W.fach ? ' selected' : ''}>${e(f)}</option>`).join('')}</select></label>
            <label class="lw-klein">Klasse<br><input type="number" min="1" max="10" data-wf="klasse" value="${e(W.klasse)}" style="width:4.5rem"></label></div>
          <div class="lw-knoepfe" style="margin-top:.7rem">
            <button type="button" class="lw-btn gold" data-akt="speichern" ${nurLesen || speichert || !geaendert(aktuell) ? 'disabled' : ''}>${speichert ? 'speichert …' : '💾 Speichern'}</button>
            <a class="lw-btn" href="apps/typen/weg.html?weg=${e(W.id)}" target="_blank" rel="noopener">👀 Vorschau (gespeicherter Stand)</a>
            <button type="button" class="lw-btn" data-akt="kopieren" ${x.neu ? 'disabled' : ''}>📋 Fürs neue Schuljahr kopieren</button>
            ${geaendert(aktuell) ? `<button type="button" class="lw-btn" data-akt="verwerfen">Änderungen verwerfen</button><span class="lw-klein" style="color:#f6c94a;font-weight:800">● ungespeichert</span>` : ''}</div>
          ${x.neu ? '<p class="lw-klein">Neuer Weg – erst nach dem Speichern gibt es ihn im Repo. Danach unter Gruppen → 📒 Laufzettel freigeben.</p>' : ''}</div>
        ${W.abschnitte.map((a, i) => `<div class="lw-karte" style="${a.aus ? 'opacity:.55' : ''}">
          <div class="lw-knoepfe" style="align-items:end">
            <label class="lw-klein">Abschnitt ${i + 1}<br><input type="text" data-af="titel" data-a="${e(a.id)}" value="${e(a.titel)}" style="width:16rem"></label>
            <label class="lw-klein">Symbol<br><input type="text" data-af="ico" data-a="${e(a.id)}" value="${e(a.ico || '')}" style="width:4rem"></label>
            ${wahlN(a) > 1 ? `<label class="lw-klein">Wahl: so viele sind Pflicht<br><input type="number" min="1" max="${wahlN(a)}" data-af="wahlMin" data-a="${e(a.id)}" value="${e(a.wahlMin || 1)}" style="width:4.5rem"></label>` : ''}
            <span style="flex:1"></span>
            <button type="button" class="lw-btn klein" data-akt="a-hoch" data-a="${e(a.id)}" ${i ? '' : 'disabled'} aria-label="Abschnitt nach oben">▲</button>
            <button type="button" class="lw-btn klein" data-akt="a-runter" data-a="${e(a.id)}" ${i < W.abschnitte.length - 1 ? '' : 'disabled'} aria-label="Abschnitt nach unten">▼</button>
            <button type="button" class="lw-btn klein" data-akt="a-aus" data-a="${e(a.id)}">${a.aus ? '👁 Einblenden' : '🚫 Ausblenden'}</button></div>
          ${a.aus ? '<p class="lw-klein">Ausgeblendet – die Kinder sehen diesen Abschnitt nicht.</p>' : a.schritte.map((s, k) => schrittHTML(a, s, k)).join('')
            + `<div class="lw-knoepfe" style="margin-top:.5rem"><select data-neu-art="${e(a.id)}" aria-label="Art des neuen Schritts">${Object.entries(ARTEN).map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select>
              <button type="button" class="lw-btn klein" data-akt="s-neu" data-a="${e(a.id)}">＋ Schritt</button></div>`}
          <code class="lw-klein">${e(a.id)}</code></div>`).join('')}
        <div class="lw-knoepfe"><button type="button" class="lw-btn" data-akt="a-neu">＋ Abschnitt</button></div>
        <div class="lw-karte"><h2>🎯 Das kann ich am Ende</h2>
          <p class="lw-klein">„Ich kann …“-Sätze für die Kann-Liste. Themen (Katalog-IDs, mit Komma) füllen den Satz aus dem Lernstand.</p>
          ${(W.kann || []).map(k => `<div class="lw-knoepfe" style="margin:.3rem 0">Ich kann <input type="text" data-kf="text" data-k="${e(k.id)}" value="${e(k.text)}" style="flex:2;min-width:14rem">
            <input type="text" data-kf="themen" data-k="${e(k.id)}" value="${e((k.themen || []).join(', '))}" placeholder="Themen-IDs" style="flex:1;min-width:10rem"></div>`).join('')}
          <div class="lw-knoepfe"><button type="button" class="lw-btn klein" data-akt="k-neu">＋ Satz</button></div></div>`;
    }
    function zeichnen() {
      if (!aktiv) return;
      if (!liste) { host.innerHTML = `<div class="lw-karte">${fehler ? '⚠ ' + e(fehler) : 'lädt …'}</div>`; return; }
      const oben = window.scrollY;
      host.innerHTML = `<div class="lw-karte"><h2>🗺️ Lernwege</h2>
          <p>Lernwege ohne 3D für jedes Fach: ein Pfad mit Abschnitten, je Abschnitt Schritte in Pflicht, Wahl und ⭐ Stern. Gespeichert wird direkt ins Repo
          (nach 1–2 Minuten live). Die Freigabe für eine Gruppe stellst du unter Gruppen → 📒 Laufzettel ein. Es wird nie etwas gelöscht, nur ausgeblendet –
          so geht kein Lernstand verloren.</p>
          ${nurLesen ? `<p style="color:#f6c94a;font-weight:800">${e(nurLesen)}</p>` : ''}
          ${fehler ? `<p style="color:#f87171;font-weight:800">⚠ ${e(fehler)}</p>` : ''}${meldung ? `<p style="color:#4ade80;font-weight:800">${e(meldung)}</p>` : ''}
          <div class="lw-knoepfe">${(liste.wege || []).map(w => `<button type="button" class="lw-btn${w.id === aktuell ? ' gold' : ''}" data-weg="${e(w.id)}">${e((w.ico ? w.ico + ' ' : '') + w.titel)}${w.test ? ' (Test)' : ''}${geaendert(w.id) ? ' ●' : ''}</button>`).join('')}
            <button type="button" class="lw-btn" data-akt="weg-neu" ${nurLesen ? 'disabled' : ''}>＋ Neuer Weg</button></div>
          ${neuForm ? `<div class="lw-knoepfe" style="align-items:end;margin-top:.7rem">
            <label class="lw-klein">Titel<br><input type="text" data-nf="titel" value="${e(neuForm.titel)}" style="width:15rem" placeholder="z. B. Brüche verstehen"></label>
            <label class="lw-klein">Symbol<br><input type="text" data-nf="ico" value="${e(neuForm.ico)}" style="width:4rem"></label>
            <label class="lw-klein">Fach<br><select data-nf="fach">${FAECHER.map(f => `<option${f === neuForm.fach ? ' selected' : ''}>${e(f)}</option>`).join('')}</select></label>
            <label class="lw-klein">Klasse<br><input type="number" min="1" max="10" data-nf="klasse" value="${e(neuForm.klasse)}" style="width:4.5rem"></label>
            <label class="lw-klein">Kennung (bleibt für immer)<br><input type="text" data-nf="id" value="${e(neuForm.id)}" style="width:11rem" placeholder="wird vorgeschlagen"></label>
            <button type="button" class="lw-btn gold" data-akt="weg-anlegen">Anlegen</button><button type="button" class="lw-btn" data-akt="weg-abbrechen">Abbrechen</button></div>` : ''}</div>
        ${aktuell && X() ? wegHTML() : ''}`;
      window.scrollTo(0, oben);
    }

    // ── Ändern ──
    const findeA = id => X().W.abschnitte.find(a => a.id === id);
    function findeS(id) { for (const a of X().W.abschnitte) { const i = a.schritte.findIndex(s => s.id === id); if (i >= 0) return { a, s: a.schritte[i], i }; } return null; }
    function bausteinFuer(s, art) {
      const x = X();
      let b = s.baustein ? baustein(s.baustein) : null;
      if (!b) { b = { id: neueId(x.W.id + '-b', alleIds(x)), art, titel: art === 'hefteintrag' ? 'Hefteintrag' : 'Aufgaben' }; if (art === 'hefteintrag') b.zeilen = []; x.B.bausteine.push(b); s.baustein = b.id; }
      return b;
    }
    function feldAendern(t) {
      const x = X(), v = t.value;
      if (t.dataset.nf) { neuForm[t.dataset.nf] = v; if (t.dataset.nf !== 'id' && !neuForm.idSelbst) neuForm.id = vorschlagId(); if (t.dataset.nf === 'id') neuForm.idSelbst = true; return t.dataset.nf === 'id' ? null : zeichnen(); }
      if (!x) return;
      if (t.dataset.wf) {
        const k = t.dataset.wf;
        x.W[k] = k === 'klasse' ? Math.max(1, Math.min(10, parseInt(v, 10) || 5)) : v.trim();
        if (k === 'ico' && !x.W.ico) delete x.W.ico;
        return zeichnen();
      }
      if (t.dataset.af) {
        const a = findeA(t.dataset.a), k = t.dataset.af;
        if (k === 'wahlMin') { const n = parseInt(v, 10) || 1; if (n > 1) a.wahlMin = n; else delete a.wahlMin; }
        else if (k === 'ico') { if (v.trim()) a.ico = v.trim(); else delete a.ico; }
        else a.titel = v.trim();
        return;
      }
      if (t.dataset.kf) {
        const k = (x.W.kann || []).find(q => q.id === t.dataset.k);
        if (t.dataset.kf === 'text') k.text = v.trim(); else { const l = v.split(',').map(q => q.trim()).filter(Boolean); if (l.length) k.themen = l; else delete k.themen; }
        return;
      }
      const f = findeS(t.dataset.s);
      if (!f) return;
      const s = f.s;
      if (t.dataset.sf) {
        const k = t.dataset.sf;
        if (k === 'stufe') { if (v === 'pflicht') delete s.stufe; else s.stufe = v; return zeichnen(); }
        if (k === 'seite') { const n = parseInt(v, 10); if (n > 0) s.buch = Object.assign({}, s.buch, { seite: n }); else delete s.buch; return; }
        if (k === 'buchuebung') { if (s.buch) { if (v.trim()) s.buch.uebung = v.trim(); else delete s.buch.uebung; } return; }
        if (v.trim()) s[k] = v.trim(); else delete s[k];
        return;
      }
      if (t.dataset.bf) {
        const k = t.dataset.bf, b = bausteinFuer(s, s.art);
        if (k === 'zeilen') { b.zeilen = v.split('\n').map(zeileAus); while (b.zeilen.length && !b.zeilen[b.zeilen.length - 1].some(q => q[0].trim())) b.zeilen.pop(); }
        else if (k === 'items' || k === 'loesung') { const l = zeilenListe(v); if (l.length) b[k] = l; else delete b[k]; if (s.art === 'uebung') b.titel = (s.text || 'Aufgaben').slice(0, 120); }
        else if (k === 'merke') { if (v.trim()) b.merke = v.trim(); else delete b.merke; }
        else b.titel = v.trim() || 'Hefteintrag';
      }
    }
    const vorschlagId = () => { const f = { Mathematik: 'ma', Englisch: 'en', Deutsch: 'de', GPG: 'gpg' }[neuForm.fach] || slug(neuForm.fach).slice(0, 3); return (f + (parseInt(neuForm.klasse, 10) || '') + '-' + slug(neuForm.titel)).slice(0, 30).replace(/-+$/, ''); };
    const idOk = id => /^[a-z][a-z0-9-]{1,29}$/.test(id) && !id.startsWith('journey') && !/^(u\d+|he|ue|kann)$/.test(id) && !eintrag(id);
    function tausche(l, i, j) { const t = l[i]; l[i] = l[j]; l[j] = t; }

    function aktion(t) {
      const akt = t.dataset.akt, x = X();
      fehler = ''; meldung = '';
      if (akt === 'weg-neu') { neuForm = { titel: '', ico: '🗺️', fach: FAECHER[0], klasse: 5, id: '' }; return zeichnen(); }
      if (akt === 'weg-abbrechen') { neuForm = null; return zeichnen(); }
      if (akt === 'weg-anlegen') {
        const id = (neuForm.id || vorschlagId()).trim(), titel = neuForm.titel.trim();
        if (!titel) { fehler = 'Der Weg braucht einen Titel.'; return zeichnen(); }
        if (!idOk(id)) { fehler = 'Die Kennung ist ungültig oder schon vergeben (klein, Ziffern, „-“, 2–30 Zeichen).'; return zeichnen(); }
        const kopf = { id, titel, fach: neuForm.fach, klasse: Math.max(1, Math.min(10, parseInt(neuForm.klasse, 10) || 5)), ico: neuForm.ico.trim() || '🗺️' };
        liste.wege.push(klon(kopf));
        wege[id] = { W: Object.assign({ version: 1 }, kopf, { abschnitte: [{ id: id + '-a1', titel: 'Erster Abschnitt', ico: '🚀', schritte: [{ id: id + '-a1-s1', art: 'uebung', text: 'Erste Aufgabe' }] }] }),
          B: { version: 1, weg: pfadW(id), bausteine: [] }, shaW: '', shaB: '', alt: '', neu: true };
        aktuell = id; neuForm = null; return zeichnen();
      }
      if (!x) return;
      if (akt === 'a-neu') { const id = neueId(x.W.id + '-a', alleIds(x)); x.W.abschnitte.push({ id, titel: 'Neuer Abschnitt', ico: '📍', schritte: [{ id: id + '-s1', art: 'uebung', text: 'Aufgabe' }] }); return zeichnen(); }
      if (akt === 'k-neu') { (x.W.kann = x.W.kann || []).push({ id: neueId(x.W.id + '-k', alleIds(x)), text: '…' }); return zeichnen(); }
      if (akt === 'a-hoch' || akt === 'a-runter') { const l = x.W.abschnitte, i = l.findIndex(a => a.id === t.dataset.a); tausche(l, i, i + (akt === 'a-hoch' ? -1 : 1)); return zeichnen(); }
      if (akt === 'a-aus') { const a = findeA(t.dataset.a); if (a.aus) delete a.aus; else a.aus = true; return zeichnen(); }
      if (akt === 's-neu') {
        const a = findeA(t.dataset.a), art = host.querySelector(`[data-neu-art="${CSS.escape(a.id)}"]`).value;
        const s = { id: neueId(a.id + '-s', alleIds(x)), art };
        if (art === 'hefteintrag') bausteinFuer(s, 'hefteintrag'); else if (art === 'medium') { s.titel = 'Ansehen'; s.link = ''; } else if (art !== 'app') s.text = art === 'check' ? 'Selbsttest: Kannst du es?' : 'Aufgabe';
        a.schritte.push(s); return zeichnen();
      }
      const f = t.dataset.s ? findeS(t.dataset.s) : null;
      if (f && (akt === 's-hoch' || akt === 's-runter')) { tausche(f.a.schritte, f.i, f.i + (akt === 's-hoch' ? -1 : 1)); return zeichnen(); }
      if (f && akt === 's-aus') { if (f.s.aus) delete f.s.aus; else f.s.aus = true; return zeichnen(); }
      if (akt === 'verwerfen') {
        if (!confirm('Alle ungespeicherten Änderungen an diesem Weg verwerfen?')) return;
        if (x.neu) { liste.wege = liste.wege.filter(w => w.id !== aktuell); delete wege[aktuell]; aktuell = ''; }
        else { const [W, B] = JSON.parse(x.alt); x.W = W; x.B = B; const k = eintrag(aktuell); ['titel', 'fach', 'klasse', 'ico'].forEach(q => { if (W[q] === undefined) delete k[q]; else k[q] = W[q]; }); }
        return zeichnen();
      }
      if (akt === 'kopieren') return kopieren();
      if (akt === 'speichern') return speichern();
    }

    /** Neues Schuljahr: Weg unter neuer Kennung, alle IDs neu (frischer Lernstand), Ausgeblendetes bleibt weg */
    function kopieren() {
      const x = X(), d = new Date(), y = (d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1) % 100;
      const id = (prompt('Kennung des neuen Wegs (bleibt für immer):', (x.W.id.replace(/-\d{4}$/, '') + '-' + y + (y + 1)).slice(0, 30)) || '').trim();
      if (!id) return;
      if (!idOk(id)) { fehler = 'Die Kennung ist ungültig oder schon vergeben.'; return zeichnen(); }
      const um = i => id + String(i).slice(x.W.id.length);
      const W = klon(x.W), B = klon(x.B);
      W.id = id;
      W.abschnitte = W.abschnitte.filter(a => !a.aus).map(a => Object.assign(a, { id: um(a.id), schritte: a.schritte.filter(s => !s.aus).map(s => Object.assign(s, { id: um(s.id) }, s.baustein ? { baustein: um(s.baustein) } : {})) }));
      (W.kann || []).forEach(k => { k.id = um(k.id); });
      const genutzt = new Set(W.abschnitte.flatMap(a => a.schritte.map(s => s.baustein).filter(Boolean)));
      B.weg = pfadW(id); B.bausteine = B.bausteine.map(b => Object.assign(b, { id: um(b.id) })).filter(b => genutzt.has(b.id));
      liste.wege.push({ id, titel: W.titel, fach: W.fach, klasse: W.klasse, ico: W.ico });
      wege[id] = { W, B, shaW: '', shaB: '', alt: '', neu: true };
      aktuell = id; meldung = 'Kopie angelegt – prüfen, dann speichern. Der alte Weg bleibt, wie er ist.';
      zeichnen();
    }

    function pruefe(x) {
      const p = [], W = x.W;
      if (!W.titel) p.push('Der Weg braucht einen Titel.');
      if (!W.abschnitte.some(a => !a.aus)) p.push('Mindestens ein Abschnitt muss sichtbar sein.');
      W.abschnitte.filter(a => !a.aus).forEach(a => {
        if (!a.titel) p.push(`Ein Abschnitt hat keinen Titel (${a.id}).`);
        if (!a.schritte.some(s => !s.aus && s.stufe !== 'stern')) p.push(`„${a.titel}“ braucht mindestens einen Pflicht- oder Wahl-Schritt.`);
        a.schritte.filter(s => !s.aus).forEach(s => {
          const b = s.baustein ? baustein(s.baustein) : null;
          if (s.art === 'app' && !themen.some(t => t.id === s.thema)) p.push(`„${a.titel}“: Lern-App ohne gültiges Thema.`);
          if (s.art === 'check' && s.thema && !themen.some(t => t.id === s.thema)) p.push(`„${a.titel}“: Check-Thema steht nicht im Katalog.`);
          if (s.art === 'medium' && (!s.titel || !/^[A-Za-z0-9][A-Za-z0-9_\-./]*$/.test(s.link || '') || (s.link || '').includes('..'))) p.push(`„${a.titel}“: Medium braucht Titel und Dateipfad.`);
          if (s.art === 'uebung' && !s.text && !(b && (b.items || []).length)) p.push(`„${a.titel}“: Übung ohne Auftrag.`);
          if (s.art === 'hefteintrag' && !(b && (b.zeilen || []).length)) p.push(`„${a.titel}“: Hefteintrag ist noch leer.`);
        });
      });
      (W.kann || []).forEach(k => { if (!k.text || k.text === '…') p.push('Ein Kann-Satz ist leer.'); });
      return p;
    }
    async function speichern() {
      const x = X(), id = aktuell, probleme = pruefe(x);
      if (probleme.length) { fehler = probleme.slice(0, 4).join(' '); return zeichnen(); }
      // Kopfdaten ins Verzeichnis; unbenutzte Bausteine NEUER Dateien weglassen, bestehende bleiben (IDs nie löschen)
      const k = eintrag(id);
      ['titel', 'fach', 'klasse'].forEach(q => { k[q] = x.W[q]; });
      if (x.W.ico) k.ico = x.W.ico; else delete k.ico;
      x.W.abschnitte.forEach(a => a.schritte.forEach(s => { if (s.art === 'uebung' && s.baustein) { const b = baustein(s.baustein); if (b && !(b.items || []).length && !x.shaB) { delete s.baustein; x.B.bausteine = x.B.bausteine.filter(q => q !== b); } else if (b) b.titel = (s.text || b.titel || 'Aufgaben').slice(0, 120); } }));
      const dateien = [{ pfad: pfadW(id), daten: x.W, sha: x.shaW }];
      if (x.B.bausteine.length || x.shaB) dateien.push({ pfad: pfadB(id), daten: x.B, sha: x.shaB });
      if (JSON.stringify(liste) !== listeAlt) dateien.push({ pfad: LISTE, daten: liste, sha: listeSha });
      speichert = true; fehler = ''; zeichnen();
      try {
        const d = await store.worker('/dateien/speichern', { dateien, text: `Inhalte: 🗺️ Lernweg „${x.W.titel}“ ${x.neu ? 'angelegt' : 'geändert'}` });
        const shas = d.shas || {};
        x.shaW = shas[pfadW(id)] || x.shaW; if (shas[pfadB(id)]) x.shaB = shas[pfadB(id)];
        if (shas[LISTE]) { listeSha = shas[LISTE]; listeAlt = JSON.stringify(liste); }
        x.neu = false; x.alt = JSON.stringify([x.W, x.B]);
        meldung = '✓ Gespeichert – in 1–2 Minuten live. Freigeben unter Gruppen → 📒 Laufzettel.';
      } catch (err) {
        fehler = err.message === 'CONFLICT' ? 'Die Datei wurde inzwischen woanders geändert – Seite neu laden (deine Änderungen hier gehen dabei verloren).'
          : 'Nicht gespeichert: ' + (err.message || err);
      }
      speichert = false; zeichnen();
    }

    const klick = ev => {
      const t = ev.target.closest('[data-akt],[data-weg]');
      if (!t || t.disabled) return;
      if (t.dataset.weg) {
        aktuell = t.dataset.weg; fehler = ''; meldung = '';
        ladeWeg(aktuell).catch(x => { fehler = 'Weg nicht geladen: ' + (x.message || x); aktuell = ''; }).then(zeichnen);
        return zeichnen();
      }
      aktion(t);
    };
    const aenderung = ev => { const t = ev.target; if (t.matches('[data-wf],[data-af],[data-sf],[data-bf],[data-kf],[data-nf]')) { feldAendern(t); const k = host.querySelector('[data-akt="speichern"]'); if (k && X() && !nurLesen) k.disabled = !geaendert(aktuell); } };
    const warnung = ev => { if (Object.keys(wege).some(geaendert)) { ev.preventDefault(); ev.returnValue = ''; } };
    host.addEventListener('click', klick);
    host.addEventListener('change', aenderung);
    window.addEventListener('beforeunload', warnung);
    zeichnen();
    ladeListe().catch(x => { fehler = 'Lernwege nicht geladen: ' + (x.message || x); }).then(zeichnen);
    fetch(ROOT + 'daten/katalog.json', { cache: 'no-store' }).then(r => r.json()).then(K => {
      (K.faecher || []).forEach(f => (f.bereiche || []).forEach(b => (b.themen || []).forEach(t => { themen.push({ id: t.id, titel: `${f.name} · ${t.titel}` }); (t.stufen || []).forEach(s => themen.push({ id: s.id, titel: `${f.name} · ${t.titel} – ${s.titel}` })); })));
    }).catch(() => {}).then(zeichnen);
    return () => { aktiv = false; host.removeEventListener('click', klick); host.removeEventListener('change', aenderung); window.removeEventListener('beforeunload', warnung); };
  },
});
