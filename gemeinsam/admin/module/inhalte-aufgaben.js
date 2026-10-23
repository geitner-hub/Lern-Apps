// ═══════════════════════════════════════════════════════
//  Admin-Modul Inhalte → Aufgaben-Pools  (Admin-Umbau Etappe 9: Editoren II)
//  Frage-Antwort-Pools der Spiele (RUN!, Tower Defense, Tauziehen) in daten/aufgaben-pools.json:
//  Pool anlegen (Titel, Fach, Klasse, Thema), Aufgaben mit Frage, richtiger Antwort und Ablenkern,
//  Import per Copy-Paste (Frage | Antwort | Ablenker …), Prüfung wie pruefen.py Regel 20.
//  Pool-IDs bleiben für immer (Starter-Paket, Lehrer-Links ?pool=…). Speichern über LWAdmin.dateien.
// ═══════════════════════════════════════════════════════
'use strict';

LWAdmin.modul({
  id: 'aufgaben', bereich: 'inhalte', titel: 'Aufgaben-Pools', symbol: '🎯', reihenfolge: 8,
  suchbegriffe: ['Aufgaben', 'Pool', 'Quiz', 'Fragen', 'Ablenker', 'Spiele', 'GPG', 'RUN', 'Tower Defense', 'Tauziehen'],
  zeigen(host, { toast }) {
    const D = LWAdmin.dateien, PFAD = 'daten/aufgaben-pools.json', MAX_ANTWORT = 22;
    let aktiv = true, fehler = '', still = false, offen = new Set(), pruefung = null, titel = new Map();
    const e = s => escHtml(String(s == null ? '' : s));
    const daten = () => D.daten(PFAD);
    const serverIds = () => new Set(((D.info(PFAD) || {}).server || { pools: [] }).pools.map(p => p.id));
    const fest = () => new Set(((window.LernAufgaben && LernAufgaben._POOLS) || []).filter(p => p.typ !== 'liste').map(p => p.id));
    const faecher = () => Object.keys(typeof CAT_STYLES !== 'undefined' ? CAT_STYLES : {}).filter(f => f !== 'Allgemein');
    const slug = s => String(s).toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 34);

    function aendern(text, fn, leise) {
      still = !!leise;
      try { D.aendern(PFAD, 'Aufgaben-Pools: ' + text, fn); } finally { still = false; }
      pruefung = null;
      if (leise) kopf();
    }
    const pool = (d, id) => d.pools.find(p => p.id === id);

    function pruefen() {
      const f = [], w = [];
      daten().pools.forEach(p => {
        const n = p.titel || p.id, antworten = new Set(p.aufgaben.map(a => String(a.antwort).trim().toLowerCase()));
        if (!String(p.titel || '').trim()) f.push(`Pool ${p.id} hat keinen Titel`);
        if (p.aufgaben.length < 2) f.push(`${n}: mindestens 2 Aufgaben`);
        if (p.thema && !titel.has(p.thema)) f.push(`${n}: Thema ${p.thema} steht nicht im Katalog`);
        const fragen = new Set();
        p.aufgaben.forEach((a, i) => {
          const fr = String(a.frage).trim(), an = String(a.antwort).trim();
          if (!fr || !an) { f.push(`${n}: Aufgabe ${i + 1} ohne Frage oder Antwort`); return; }
          if (/[<>]/.test(fr + an + a.falsch.join(''))) f.push(`${n}: „${fr.slice(0, 30)}“ enthält < oder >`);
          const ab = new Set(a.falsch.map(x => String(x).trim().toLowerCase()).filter(Boolean));
          if (ab.has(an.toLowerCase())) w.push(`${n}: „${fr.slice(0, 30)}“ – ein Ablenker ist die richtige Antwort`);
          ab.delete(an.toLowerCase());
          const andere = new Set([...antworten].filter(x => x !== an.toLowerCase()));
          if (new Set([...ab, ...andere]).size < 2) f.push(`${n}: „${fr.slice(0, 30)}“ hat zu wenige Ablenker`);
          else if (ab.size < 2) w.push(`${n}: „${fr.slice(0, 30)}“ hat ${ab.size ? 'nur einen' : 'keinen'} eigenen Ablenker – der Rest kommt aus anderen Antworten des Pools`);
          if (an.length > MAX_ANTWORT) w.push(`${n}: Antwort „${an}“ ist länger als ${MAX_ANTWORT} Zeichen (passt nicht aufs Tor)`);
          if (fragen.has(fr.toLowerCase())) w.push(`${n}: Frage „${fr.slice(0, 30)}“ doppelt`);
          fragen.add(fr.toLowerCase());
        });
      });
      return { fehler: f, warnungen: w };
    }
    async function speichern() {
      const p = pruefen(); pruefung = p;
      if (p.fehler.length) { zeichnen(); await LWAdmin.dialog({ titel: 'Speichern gestoppt', text: 'Bitte zuerst beheben.', fehler: p.fehler.slice(0, 30), warnungen: p.warnungen.slice(0, 20) }); return; }
      if (p.warnungen.length && !await LWAdmin.dialog({ titel: 'Trotzdem speichern?', warnungen: p.warnungen.slice(0, 30), ja: '💾 Trotzdem speichern' })) return;
      const n = D.anzahl(PFAD);
      const r = await D.speichern([PFAD], `Inhalte: Aufgaben-Pools (${n} Änderung${n === 1 ? '' : 'en'})`);
      zeichnen();
      if (r.ok) { pruefung = null; toast('💾 Gespeichert – in 1–2 Minuten in den Spielen'); zeichnen(); return; }
      if (r.status === 401) { LWAdmin.anmeldungZeigen('Sitzung abgelaufen – bitte neu anmelden. Deine Änderungen bleiben erhalten.'); return; }
      toast(r.fehler === 'CONFLICT' ? '⚠ Die Datei wurde inzwischen woanders geändert – Seite neu laden' : '⚠ ' + r.fehler, true);
    }

    /** Zeilen „Frage | Antwort | Ablenker …“ (Tabulator, | oder ;) → [{ frage, antwort, falsch }] */
    function importLesen(text) {
      return String(text || '').split(/\r?\n/).map(z => z.trim()).filter(Boolean).map(z => {
        const t = (z.includes('\t') ? z.split('\t') : z.includes('|') ? z.split('|') : z.split(';')).map(s => s.trim());
        return { frage: t[0] || '', antwort: t[1] || '', falsch: t.slice(2).filter(Boolean).slice(0, 5) };
      }).filter((a, i) => !(i === 0 && /^frage$/i.test(a.frage)));
    }

    function kopf() {
      const el = host.querySelector('.lw-ap-kopf'); if (!el) return;
      const n = D.anzahl(PFAD), info = D.info(PFAD) || {};
      el.querySelector('.lw-ap-zahl').textContent = n ? (n === 1 ? '1 ungespeicherte Änderung' : n + ' ungespeicherte Änderungen') : 'alles gespeichert';
      el.querySelector('[data-ap="speichern"]').disabled = !n || info.nurLesen || info.veraltet;
      el.querySelector('[data-ap="verwerfen"]').hidden = !n;
      el.querySelector('.lw-ap-aenderungen').innerHTML = D.aenderungen(PFAD).slice(-40).reverse().map(t => `<li>${e(t)}</li>`).join('');
    }
    function themaAuswahl(p) {
      const liste = [...titel.entries()].filter(([id]) => id.split('.')[0] === { GPG: 'gpg', Englisch: 'en', Mathematik: 'ma', Deutsch: 'de', 'Natur und Technik': 'nut', DaZ: 'daz' }[p.fach]);
      return `<select data-ap-feld="thema" data-ap-pool="${e(p.id)}"><option value="">– ohne –</option>${liste.map(([id, t]) =>
        `<option value="${e(id)}"${id === p.thema ? ' selected' : ''}>${e(t)}</option>`).join('')}${p.thema && !liste.some(([id]) => id === p.thema) ? `<option selected value="${e(p.thema)}">${e(p.thema)}</option>` : ''}</select>`;
    }
    function poolInhalt(p) {
      return `<div class="lw-ap-felder">
          <label>Titel <input data-ap-feld="titel" data-ap-pool="${e(p.id)}" value="${e(p.titel)}" maxlength="80"></label>
          <label>Fach <select data-ap-feld="fach" data-ap-pool="${e(p.id)}">${faecher().map(f => `<option${f === p.fach ? ' selected' : ''}>${e(f)}</option>`).join('')}</select></label>
          <label>Gruppe <input data-ap-feld="gruppe" data-ap-pool="${e(p.id)}" value="${e(p.gruppe || '')}" maxlength="40" placeholder="z. B. Erdkunde"></label>
          <label>ab Klasse <select data-ap-feld="klasse" data-ap-pool="${e(p.id)}">${[5, 6, 7, 8, 9, 10].map(k => `<option${k === p.klasse ? ' selected' : ''}>${k}</option>`).join('')}</select></label>
          <label>Thema (Freigabe) ${themaAuswahl(p)}</label></div>
        <p class="lw-klein" style="margin:.4rem 0">Pool-ID <code>${e(p.id)}</code> · Im Spiel testen: <a href="spiele/runner.html?pool=${e(p.id)}" target="_blank" rel="noopener">RUN!</a> · <a href="spiele/burg-verteidigung.html?pool=${e(p.id)}" target="_blank" rel="noopener">Tower Defense</a> (erst nach dem Speichern)</p>
        <div class="lw-ap-tabelle" data-ap-liste="${e(p.id)}"><div class="lw-ap-zeile lw-ap-kopfzeile"><span>Frage</span><span>Richtige Antwort</span><span>Ablenker</span><span>Ablenker</span><span>Ablenker</span><span></span></div>
          ${p.aufgaben.map((a, i) => `<div class="lw-ap-zeile">
            <input data-ap-a="frage" data-i="${i}" value="${e(a.frage)}" aria-label="Frage" maxlength="200">
            <input data-ap-a="antwort" data-i="${i}" value="${e(a.antwort)}" aria-label="Richtige Antwort" maxlength="60"${String(a.antwort).length > MAX_ANTWORT ? ' class="lang"' : ''}>
            ${[0, 1, 2].map(j => `<input data-ap-a="falsch" data-j="${j}" data-i="${i}" value="${e(a.falsch[j] || '')}" aria-label="Ablenker ${j + 1}" maxlength="60">`).join('')}
            <span class="lw-vok-k"><button type="button" class="lw-btn klein" data-ap-zug="-1" data-i="${i}" aria-label="nach oben"${i ? '' : ' disabled'}>▲</button><button type="button" class="lw-btn klein" data-ap-zug="1" data-i="${i}" aria-label="nach unten"${i < p.aufgaben.length - 1 ? '' : ' disabled'}>▼</button><button type="button" class="lw-btn klein" data-ap-weg="${i}" aria-label="Aufgabe löschen">✕</button></span></div>`).join('')}</div>
        <div class="lw-knoepfe"><button type="button" class="lw-btn klein" data-ap="aufgabe" data-ap-pool="${e(p.id)}">＋ Aufgabe</button></div>
        <details style="margin-top:.7rem"><summary class="lw-klein">📋 Aufgaben aus einer Tabelle einfügen (Frage | Antwort | Ablenker …)</summary>
          <textarea rows="4" data-ap-import="${e(p.id)}" style="width:100%;margin-top:.4rem" placeholder="Hauptstadt von Frankreich? | Paris | Lyon | Nizza"></textarea>
          <div class="lw-knoepfe"><button type="button" class="lw-btn klein" data-ap="import" data-ap-pool="${e(p.id)}">Übernehmen</button></div></details>`;
    }
    function zeichnen() {
      if (!aktiv || still) return;
      const d = daten(), info = D.info(PFAD), p = pruefung;
      if (!d) { host.innerHTML = `<div class="lw-karte">${fehler ? '⚠ ' + e(fehler) : 'lädt …'}</div>`; return; }
      const alt = serverIds(), eingebaut = ((window.LernAufgaben && LernAufgaben._POOLS) || []).filter(x => x.typ !== 'liste' && x.typ !== 'vokabeln' && !/^ma\./.test(x.id));
      host.innerHTML = `
        <div class="lw-karte lw-ap-kopf">
          <div class="lw-knoepfe" style="margin-top:0"><span class="lw-ap-zahl lw-klein" style="align-self:center"></span>
            <button type="button" class="lw-btn" data-ap="pruefen">🔍 Prüfen</button><button type="button" class="lw-btn gold" data-ap="speichern">💾 Speichern</button><button type="button" class="lw-btn" data-ap="verwerfen">Verwerfen</button></div>
          ${info.nurLesen ? `<p class="lw-rot" style="margin-top:.5rem">⚠ Nur lesen: ${info.grund === 'offline' ? 'Worker nicht erreichbar.' : 'Bei Cloudflare läuft noch der alte Worker – bitte <code>cloudflare/worker.js</code> und <code>cloudflare/dateien.js</code> einfügen.'}</p>` : ''}
          ${info.veraltet ? `<p class="lw-rot" style="margin-top:.5rem">⚠ Dein Entwurf beruht auf einem älteren Stand.</p><div class="lw-knoepfe"><button type="button" class="lw-btn" data-ap="alt-weg">Entwurf verwerfen</button><button type="button" class="lw-btn" data-ap="alt-behalten">Entwurf behalten</button></div>` : ''}
          <details style="margin-top:.4rem"><summary class="lw-klein">Änderungen</summary><ul class="lw-liste lw-klein lw-ap-aenderungen"></ul></details>
          <p class="lw-klein" style="margin-top:.4rem">Fragen mit drei Antworten für RUN!, Tower Defense und Tauziehen – zum Auswählen im Spiel, im Starter-Paket und als Lehrer-Link. Fehlen Ablenker, nimmt das Spiel Antworten anderer Fragen aus dem Pool. Gespeichert wird direkt ins Repo.</p></div>
        ${p ? `<div class="lw-karte"><h2>🔍 Prüfung</h2>${!p.fehler.length && !p.warnungen.length ? '<p>✅ Alles in Ordnung.</p>' : ''}
          ${p.fehler.length ? `<h3>⛔ Fehler</h3><ul class="lw-liste lw-rot">${p.fehler.slice(0, 40).map(x => `<li>${e(x)}</li>`).join('')}</ul>` : ''}
          ${p.warnungen.length ? `<h3>⚠️ Warnungen</h3><ul class="lw-liste">${p.warnungen.slice(0, 40).map(x => `<li>${e(x)}</li>`).join('')}</ul>` : ''}</div>` : ''}
        <div class="lw-karte"><h2>➕ Neuer Pool</h2><div class="lw-knoepfe" style="margin-top:0">
          <input data-ap-neu="titel" placeholder="Titel, z. B. Flüsse in Bayern" maxlength="80" style="flex:1;min-width:14rem" aria-label="Titel des neuen Pools">
          <select data-ap-neu="fach" aria-label="Fach">${faecher().map(f => `<option${f === 'GPG' ? ' selected' : ''}>${e(f)}</option>`).join('')}</select>
          <select data-ap-neu="klasse" aria-label="ab Klasse">${[5, 6, 7, 8, 9, 10].map(k => `<option>${k}</option>`).join('')}</select>
          <button type="button" class="lw-btn" data-ap="neu">Pool anlegen</button></div></div>
        ${d.pools.map(x => `<details class="lw-karte lw-vok-unit" data-ap-knoten="${e(x.id)}"${offen.has(x.id) ? ' open' : ''}>
          <summary><span class="lw-vok-titel">${e(x.titel)}</span> <span class="lw-klein">${e(x.fach)} · ab Kl. ${e(x.klasse)} · ${x.aufgaben.length} Aufgaben${alt.has(x.id) ? '' : ' · ✏️ neu'}</span></summary>
          <div class="lw-vok-inhalt">${offen.has(x.id) ? poolInhalt(x) : ''}</div></details>`).join('')}
        <div class="lw-karte"><h2>🔒 Fest eingebaut</h2><p class="lw-klein">Diese Pools erzeugen ihre Aufgaben im Code (Rechnen, Hauptstädte) bzw. kommen aus den Vokabeln und Kopfrechen-Stufen – hier nur zur Übersicht.</p>
          <ul class="lw-liste lw-klein">${eingebaut.map(x => `<li>${e(x.titel)} <code>${e(x.id)}</code> · ${e(x.fach)} · ab Kl. ${e(x.klasse)}</li>`).join('')}</ul></div>`;
      kopf();
    }

    const klick = ev => {
      const b = ev.target.closest('button'); if (!b || !host.contains(b)) return;
      const d = daten(), a = b.dataset.ap;
      if (a === 'pruefen') { pruefung = pruefen(); zeichnen(); return; }
      if (a === 'speichern') return speichern();
      if (a === 'verwerfen') { if (confirm('Alle ungespeicherten Änderungen an den Aufgaben-Pools verwerfen?')) { D.verwerfen(PFAD); pruefung = null; zeichnen(); } return; }
      if (a === 'alt-weg') { D.verwerfen(PFAD); zeichnen(); return; }
      if (a === 'alt-behalten') { D.entwurfBehalten(PFAD); zeichnen(); return; }
      if (a === 'neu') {
        const t = host.querySelector('[data-ap-neu="titel"]').value.trim(), fach = host.querySelector('[data-ap-neu="fach"]').value, klasse = Number(host.querySelector('[data-ap-neu="klasse"]').value);
        if (!t) { toast('⚠ Bitte einen Titel eingeben', true); return; }
        const vor = { GPG: 'gpg', Englisch: 'en', Mathematik: 'ma', Deutsch: 'de', 'Natur und Technik': 'nut', DaZ: 'daz' }[fach] || 'pool';
        const belegt = new Set([...fest(), ...d.pools.map(x => x.id)]);
        let id = (vor + '-' + slug(t)).slice(0, 40); for (let n = 2; belegt.has(id); n++) id = (vor + '-' + slug(t)).slice(0, 36) + '-' + n;
        offen.add(id);
        aendern(`neuer Pool „${t}“`, x => { x.pools.push({ id, fach, gruppe: fach, klasse, titel: t, aufgaben: [] }); });
        return;
      }
      const pid = b.dataset.apPool || (b.closest('[data-ap-liste]') || {}).dataset?.apListe;
      if (!pid) return;
      const p = pool(d, pid);
      if (a === 'aufgabe') { aendern(`${p.titel}: neue Aufgabe`, x => { pool(x, pid).aufgaben.push({ frage: '', antwort: '', falsch: [] }); }); return; }
      if (a === 'import') {
        const neu = importLesen(host.querySelector(`[data-ap-import="${CSS.escape(pid)}"]`).value).filter(z => z.frage && z.antwort);
        if (!neu.length) { toast('⚠ Keine Zeile mit Frage und Antwort gefunden', true); return; }
        aendern(`${p.titel}: ${neu.length} Aufgaben eingefügt`, x => { pool(x, pid).aufgaben.push(...neu); });
        toast(`📋 ${neu.length} Aufgaben übernommen – noch nicht gespeichert`);
        return;
      }
      if (b.dataset.apWeg !== undefined) { const i = Number(b.dataset.apWeg); aendern(`${p.titel}: „${p.aufgaben[i].frage || '(leer)'}“ gelöscht`, x => { pool(x, pid).aufgaben.splice(i, 1); }); return; }
      if (b.dataset.apZug) {
        const i = Number(b.dataset.i), j = i + Number(b.dataset.apZug);
        aendern(`${p.titel}: Aufgabe verschoben`, x => { const l = pool(x, pid).aufgaben; [l[i], l[j]] = [l[j], l[i]]; });
      }
    };
    const aenderung = ev => {
      const t = ev.target, d = daten();
      if (t.dataset.apFeld) {
        const pid = t.dataset.apPool, p = pool(d, pid), f = t.dataset.apFeld;
        let w = f === 'klasse' ? Number(t.value) : t.value.trim();
        if (f === 'titel' && !w) { t.value = p.titel; return; }
        aendern(`${p.titel}: ${f} → ${w || '–'}`, x => { const y = pool(x, pid); if ((f === 'thema' || f === 'gruppe') && !w) delete y[f]; else y[f] = w; }, f !== 'fach');
        return;
      }
      if (t.dataset.apA) {
        const pid = t.closest('[data-ap-liste]').dataset.apListe, p = pool(d, pid), i = Number(t.dataset.i), f = t.dataset.apA, w = t.value.trim();
        aendern(`${p.titel}: Aufgabe ${i + 1} (${f === 'falsch' ? 'Ablenker' : f}) → „${w}“`, x => {
          const a = pool(x, pid).aufgaben[i];
          if (f === 'falsch') { const l = [0, 1, 2].map(j => (a.falsch[j] || '')); l[Number(t.dataset.j)] = w; a.falsch = l.concat(a.falsch.slice(3)).filter(Boolean); }
          else a[f] = w;
        }, true);
        if (f === 'antwort') t.classList.toggle('lang', w.length > MAX_ANTWORT);
      }
    };
    const umschalten = ev => {
      const el = ev.target;
      if (!el.matches || !el.matches('details[data-ap-knoten]')) return;
      const id = el.dataset.apKnoten;
      if (el.open) { offen.add(id); const box = el.querySelector('.lw-vok-inhalt'); if (box && !box.innerHTML) box.innerHTML = poolInhalt(pool(daten(), id)); }
      else offen.delete(id);
    };
    host.addEventListener('click', klick);
    host.addEventListener('change', aenderung);
    host.addEventListener('toggle', umschalten, true);
    const ab = D.abonnieren(zeichnen);
    zeichnen();
    D.laden(PFAD).catch(x => { fehler = x.status === 401 ? 'Anmeldung abgelaufen – bitte neu anmelden' : (x.message || String(x)); }).then(zeichnen);
    LWAdmin.katalog().then(k => { titel = k.titel; }).catch(() => {}).then(zeichnen);
    if (window.LernAufgaben && LernAufgaben.bereit) LernAufgaben.bereit.then(zeichnen);
    return () => { aktiv = false; ab(); host.removeEventListener('click', klick); host.removeEventListener('change', aenderung); host.removeEventListener('toggle', umschalten, true); };
  },
});
