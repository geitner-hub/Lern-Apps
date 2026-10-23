// ═══════════════════════════════════════════════════════
//  Admin-Modul Motivation → Avatar-Teile  (Admin-Umbau Etappe 9: Editoren II, Loot-Pool)
//  Loot-Pool aus daten/lernwelt-inhalte.json (ITEMS) ohne JSON pflegen:
//    · neues Teil = Farbvariante eines vorhandenen Teils (basis + tausch, wie in pass.js), mit Seltenheit,
//      Herkunft (Truhe, Event oder Belohnung eines Abzeichens) und Live-Vorschau am 3D-Avatar
//    · bestehende Teile: Name, Seltenheit, Herkunft (Varianten auch Farben) – IDs und Plätze bleiben
//    · Level-Titel (TITEL) ändern und ergänzen · die bisherige „Übersicht aller Inhalte“ (uebersicht.js)
//  Gespeichert wird direkt ins Repo (LWAdmin.dateien → Worker cloudflare/dateien.js, ein Commit).
// ═══════════════════════════════════════════════════════
'use strict';

LWAdmin.modul({
  id: 'teile', bereich: 'motivation', titel: 'Avatar-Teile', symbol: '🎁', reihenfolge: 2,
  suchbegriffe: ['Avatar-Teile', 'Loot', 'Truhe', 'Cosmetic', 'Seltenheit', 'Titel', 'Level', 'Abzeichen', 'Übersicht'],
  zeigen(host, { toast }) {
    const D = LWAdmin.dateien, PFAD = 'daten/lernwelt-inhalte.json';
    const SELTEN = ['gewoehnlich', 'selten', 'episch', 'legendaer', 'event'];
    let aktiv = true, fehler = '', reiter = 'teile', platz = 'kopf', offen = '', still = false, buehne = null, zaehler = 0;
    let neu = { platz: 'kopf', vorlage: '', name: '', selten: 'selten', herkunft: 'truhe', farben: {} };
    const e = s => escHtml(String(s == null ? '' : s));
    const P = () => window.LernPass;
    const daten = () => D.daten(PFAD);
    const server = () => (D.info(PFAD) || {}).server || {};
    const slug = s => String(s).toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);

    // ── Varianten wie in gemeinsam/pass.js (Modell der Basis, Farben getauscht) ──
    const roh = id => (daten().ITEMS || []).find(i => i.id === id);
    function aufgeloest(i) {
      const b = i.basis && roh(i.basis);
      if (!b) return i;
      let json = JSON.stringify({ modell: b.modell, kleidung: b.kleidung, muster: b.muster, versteckt: b.versteckt });
      Object.entries(i.tausch || {}).forEach(([a, n]) => { json = json.split(a).join(n).split(a.toUpperCase()).join(n); });
      return Object.assign(JSON.parse(json), i);
    }
    /** Farben eines Teils (der Basis) in der Reihenfolge des Auftretens, höchstens 16 */
    function farbenVon(i) {
      const b = i.basis ? roh(i.basis) : i, gesehen = new Set(), l = [];
      (JSON.stringify({ m: b.modell, k: b.kleidung, u: b.muster }).match(/#[0-9a-fA-F]{6}\b/g) || []).forEach(f => {
        if (!gesehen.has(f.toLowerCase()) && l.length < 16) { gesehen.add(f.toLowerCase()); l.push(f); }
      });
      return l;
    }
    /** Teil für die Vorschau bei pass.js anmelden (unter einem frischen Schlüssel – Vorschaubilder werden gemerkt) */
    const gemerkt = new Map();                       // gleicher Stand → gleicher Schlüssel (für die Raster-Bilder)
    function anmelden(i) {
      if (!P()) return null;
      const merk = JSON.stringify([i, i.basis && (daten().ITEMS || []).find(x => x.id === i.basis)]);
      if (gemerkt.has(merk)) return gemerkt.get(merk);
      const key = i.id + '~' + (++zaehler);
      gemerkt.set(merk, key);
      P().ITEM_BY_ID[key] = Object.assign(aufgeloest(i), { id: key });
      return key;
    }
    function figur(slot, key) {
      const A = (P() && P().AVATAR) || {}, eq = Object.assign({}, A.START || {});
      delete eq.hintergrund;
      if (key) eq[slot] = key;
      return { haut: 1, frisur: ((A.FRISUREN || [])[0] || {}).id || '', haarfarbe: 1, augen: ((A.AUGEN || [])[0] || {}).id || '', mund: ((A.MUENDER || [])[0] || {}).id || '', eq };
    }
    function buehneZeigen(el, slot, i) {
      if (!el || !window.LernAvatar) return;
      const look = figur(slot, i ? anmelden(i) : null);
      if (buehne && buehne.host === el) { buehne.ctrl.setLook(look); return; }
      if (buehne) buehne.ctrl.destroy();
      buehne = { host: el, ctrl: LernAvatar.mount(el, { look, drehbar: true }) };
    }
    const vorlagen = slot => (daten().ITEMS || []).filter(i => i.slot === slot && !i.basis && slot !== 'hintergrund' && (i.modell || i.kleidung || i.muster));
    const herkunftText = i => i.quelle === 'event' ? 'event:' + i.event : i.quelle === 'set' ? 'set:' + i.set : i.quelle;
    function herkunftSetzen(o, wert) {
      delete o.event; delete o.set;
      if (wert.startsWith('event:')) { o.quelle = 'event'; o.event = wert.slice(6); }
      else if (wert.startsWith('set:')) { o.quelle = 'set'; o.set = wert.slice(4); }
      else o.quelle = 'truhe';
    }
    function herkunftOptionen(cur, sperre) {
      const d = daten();
      if (sperre) return `<option>${e(cur === 'start' ? 'Startausstattung' : cur)}</option>`;
      return `<option value="truhe"${cur === 'truhe' ? ' selected' : ''}>🎁 Aus Truhen</option>` +
        (d.EVENTS || []).map(v => `<option value="event:${e(v.id)}"${cur === 'event:' + v.id ? ' selected' : ''}>${e(v.icon)} Nur im ${e(v.titel || v.name)}</option>`).join('') +
        (d.ABZEICHEN || []).map(a => `<option value="set:${e(a.id)}"${cur === 'set:' + a.id ? ' selected' : ''}>${e(a.icon)} Belohnung „${e(a.name)}“</option>`).join('');
    }
    const seltenOptionen = (cur, sperre) => sperre ? `<option>${e(((daten().SELTENHEIT || {})[cur] || {}).name || cur)}</option>`
      : SELTEN.map(k => `<option value="${k}"${k === cur ? ' selected' : ''}>${e(((daten().SELTENHEIT || {})[k] || {}).name || k)}</option>`).join('');

    // ── Ändern ──
    function aendern(text, fn, leise) {
      still = !!leise;
      try { D.aendern(PFAD, text, fn); } finally { still = false; }
      if (leise) kopf();
    }
    function pruefen() {
      const d = daten(), f = [], w = [], namen = new Map();
      (d.ITEMS || []).forEach(i => {
        if (!String(i.name || '').trim()) f.push(`Teil ${i.id} hat keinen Namen`);
        if (i.quelle === 'event' && !(d.EVENTS || []).some(v => v.id === i.event)) f.push(`${i.name}: Event fehlt`);
        if (i.quelle === 'set' && !(d.ABZEICHEN || []).some(a => a.id === i.set)) f.push(`${i.name}: Abzeichen fehlt`);
        if (i.basis && !Object.entries(i.tausch || {}).some(([a, b]) => a.toLowerCase() !== b.toLowerCase())) w.push(`${i.name}: sieht genauso aus wie die Vorlage`);
        const k = String(i.name).trim().toLowerCase();
        if (namen.has(k)) w.push(`Name „${i.name}“ doppelt (${namen.get(k)} und ${i.id})`); else namen.set(k, i.id);
      });
      (d.TITEL || []).forEach((t, n) => { if (!String(t).trim()) f.push(`Titel für Level ${n + 1} ist leer`); });
      return { fehler: f, warnungen: w };
    }
    async function speichern() {
      const p = pruefen();
      if (p.fehler.length) { await LWAdmin.dialog({ titel: 'Speichern gestoppt', text: 'Bitte zuerst beheben.', fehler: p.fehler, warnungen: p.warnungen }); return; }
      if (p.warnungen.length && !await LWAdmin.dialog({ titel: 'Trotzdem speichern?', warnungen: p.warnungen, ja: '💾 Trotzdem speichern' })) return;
      const n = D.anzahl(PFAD), knopf = host.querySelector('[data-tl="speichern"]');
      if (knopf) { knopf.disabled = true; knopf.textContent = 'Speichert …'; }
      const r = await D.speichern([PFAD], `Motivation: Avatar-Teile (${n} Änderung${n === 1 ? '' : 'en'})`);
      zeichnen();
      if (r.ok) { toast('💾 Gespeichert – neue Teile sind in 1–2 Minuten in den Truhen'); return; }
      if (r.status === 401) { LWAdmin.anmeldungZeigen('Sitzung abgelaufen – bitte neu anmelden. Deine Änderungen bleiben erhalten.'); return; }
      toast(r.fehler === 'CONFLICT' ? '⚠ Die Datei wurde inzwischen woanders geändert – Seite neu laden' : '⚠ ' + r.fehler, true);
    }

    // ── Zeichnen ──
    function kopf() {
      const el = host.querySelector('.lw-tl-kopf'); if (!el) return;
      const n = D.anzahl(PFAD), info = D.info(PFAD) || {};
      el.querySelector('.lw-tl-zahl').textContent = n ? (n === 1 ? '1 ungespeicherte Änderung' : n + ' ungespeicherte Änderungen') : 'alles gespeichert';
      el.querySelector('[data-tl="speichern"]').disabled = !n || info.nurLesen || info.veraltet;
      el.querySelector('[data-tl="verwerfen"]').hidden = !n;
      el.querySelector('.lw-tl-aenderungen').innerHTML = D.aenderungen(PFAD).slice(-40).reverse().map(t => `<li>${e(t)}</li>`).join('');
    }
    function karte(i) {
      const s = server(), alt = (s.ITEMS || []).find(x => x.id === i.id), r = (daten().SELTENHEIT || {})[i.selten] || {};
      const vor = i.slot === 'hintergrund' ? `<span class="it-prev it-bg" style="background:${e(i.css || '')}"></span>`
        : `<span class="it-prev it-3d" data-avatar-thumb="${e(alt && JSON.stringify(alt) === JSON.stringify(i) ? i.id : anmelden(i) || i.id)}"></span>`;
      return `<button type="button" class="lw-tl-karte${offen === i.id ? ' an' : ''}" data-tl-teil="${e(i.id)}">${vor}
        <span class="lw-tl-name">${e(i.name)}</span><span class="lw-klein" style="color:${e(r.farbe || '')}">${e(r.name || i.selten)}${alt ? '' : ' · ✏️ neu'}</span></button>`;
    }
    function bearbeiten(i) {
      const alt = (server().ITEMS || []).find(x => x.id === i.id), sperre = i.quelle === 'start' || i.selten === 'basis';
      const farben = i.basis ? farbenVon(i) : [];
      return `<div class="lw-karte lw-tl-bearbeiten"><div class="lw-tl-zwei"><div class="lw-tl-buehne" data-tl-buehne></div><div>
        <h2>${e(i.name)}</h2><p class="lw-klein"><code>${e(i.id)}</code>${i.basis ? ' · Variante von ' + e((roh(i.basis) || {}).name || i.basis) : ''}${alt ? '' : ' · noch nicht gespeichert'}</p>
        <label class="lw-tl-feld">Name <input data-tl-feld="name" value="${e(i.name)}" maxlength="40"></label>
        <label class="lw-tl-feld">Seltenheit <select data-tl-feld="selten"${sperre ? ' disabled' : ''}>${seltenOptionen(i.selten, sperre)}</select></label>
        <label class="lw-tl-feld">Herkunft <select data-tl-feld="herkunft"${sperre ? ' disabled' : ''}>${herkunftOptionen(herkunftText(i), sperre)}</select></label>
        ${farben.length ? `<div class="lw-tl-farben">${farben.map(f => `<label title="Vorlage: ${e(f)}"><span style="background:${e(f)}"></span>→<input type="color" data-tl-farbe="${e(f)}" value="${e(((i.tausch || {})[f] || f).toLowerCase())}"></label>`).join('')}</div>` : ''}
        <div class="lw-knoepfe">${alt ? '' : '<button type="button" class="lw-btn" data-tl="loeschen">🗑 Teil löschen</button>'}<button type="button" class="lw-btn" data-tl="zu">Schließen</button></div>
        ${alt ? '<p class="lw-klein">Ein bestehendes Teil lässt sich nicht löschen – Kinder haben es vielleicht schon.</p>' : ''}
      </div></div></div>`;
    }
    function neuKarte() {
      const d = daten(), slots = Object.entries(d.SLOTS || {}).filter(([k]) => k !== 'hintergrund');
      const vl = vorlagen(neu.platz);
      if (!vl.some(i => i.id === neu.vorlage)) { neu.vorlage = vl.length ? vl[0].id : ''; neu.farben = {}; }
      const v = roh(neu.vorlage), farben = v ? farbenVon(v) : [];
      return `<div class="lw-karte"><h2>➕ Neues Teil</h2>
        <p>Ein neues Teil ist eine Farbvariante eines vorhandenen Teils: gleiche Form, eigene Farben, eigener Name. Es landet nach dem Speichern im Truhen-Pool (oder beim gewählten Event/Abzeichen).</p>
        <div class="lw-tl-zwei"><div class="lw-tl-buehne" data-tl-buehne></div><div>
          <label class="lw-tl-feld">Platz <select data-tl-neu="platz">${slots.map(([k, s]) => `<option value="${e(k)}"${k === neu.platz ? ' selected' : ''}>${e(s.icon)} ${e(s.name)}</option>`).join('')}</select></label>
          <label class="lw-tl-feld">Vorlage <select data-tl-neu="vorlage">${vl.map(i => `<option value="${e(i.id)}"${i.id === neu.vorlage ? ' selected' : ''}>${e(i.name)}</option>`).join('')}</select></label>
          <label class="lw-tl-feld">Name <input data-tl-neu="name" value="${e(neu.name)}" maxlength="40" placeholder="z. B. Basecap Grün"></label>
          <label class="lw-tl-feld">Seltenheit <select data-tl-neu="selten">${seltenOptionen(neu.selten)}</select></label>
          <label class="lw-tl-feld">Herkunft <select data-tl-neu="herkunft">${herkunftOptionen(neu.herkunft)}</select></label>
          <div class="lw-tl-farben">${farben.map(f => `<label title="Vorlage: ${e(f)}"><span style="background:${e(f)}"></span>→<input type="color" data-tl-neu-farbe="${e(f)}" value="${e((neu.farben[f] || f).toLowerCase())}"></label>`).join('')}</div>
          <div class="lw-knoepfe"><button type="button" class="lw-btn gold" data-tl="anlegen">＋ Teil anlegen</button></div>
        </div></div></div>`;
    }
    const neuTeil = () => {
      const t = {}; Object.entries(neu.farben).forEach(([a, b]) => { if (a.toLowerCase() !== b.toLowerCase()) t[a] = b; });
      const o = { id: 'neu', slot: neu.platz, name: neu.name || 'Neues Teil', selten: neu.selten, quelle: 'truhe', basis: neu.vorlage, tausch: t };
      herkunftSetzen(o, neu.herkunft);
      return o;
    };

    function zeichnen() {
      if (!aktiv || still) return;
      const d = daten(), info = D.info(PFAD);
      if (buehne) { buehne.ctrl.destroy(); buehne = null; }
      if (!d) { host.innerHTML = `<div class="lw-karte">${fehler ? '⚠ ' + e(fehler) : 'lädt …'}</div>`; return; }
      const REITER = [['teile', '👕 Teile'], ['neu', '➕ Neues Teil'], ['titel', '🏷 Titel'], ['uebersicht', '📖 Übersicht']];
      let inhalt = '';
      if (reiter === 'teile') {
        const items = (d.ITEMS || []).filter(i => i.slot === platz), aus = items.find(i => i.id === offen);
        inhalt = `<div class="lw-u-chips">${Object.entries(d.SLOTS || {}).map(([k, s]) =>
            `<button type="button" class="lw-u-chip${k === platz ? ' an' : ''}" data-tl-platz="${e(k)}">${e(s.icon)} ${e(s.name)} <span class="lw-klein">${(d.ITEMS || []).filter(i => i.slot === k).length}</span></button>`).join('')}</div>
          ${aus ? bearbeiten(aus) : ''}<div class="lw-tl-raster">${items.map(karte).join('')}</div>`;
      } else if (reiter === 'neu') inhalt = neuKarte();
      else if (reiter === 'titel') {
        const alt = (server().TITEL || []).length;
        inhalt = `<div class="lw-karte"><h2>🏷 Level-Titel</h2><p>Jedes Level hat einen Titel. Nach dem letzten geht es mit „★“ weiter. Titel lassen sich ändern und hinten ergänzen.</p>
          ${(d.TITEL || []).map((t, n) => `<label class="lw-tl-feld">Level ${n + 1} <input data-tl-titel="${n}" value="${e(t)}" maxlength="40">${n >= alt ? ' <button type="button" class="lw-btn klein" data-tl-titel-weg="' + n + '">✕</button>' : ''}</label>`).join('')}
          <div class="lw-knoepfe"><button type="button" class="lw-btn" data-tl="titel-neu">＋ Titel</button></div></div>`;
      } else inhalt = `<p class="lw-klein" style="margin-bottom:.6rem">Stand der Lernwelt (veröffentlicht) – Regeln aus <code>pass.js</code>, Inhalte aus <code>lernwelt-inhalte.json</code>.</p><div class="ov" id="pass-overview"></div>`;
      host.innerHTML = `
        <div class="lw-karte lw-tl-kopf">
          <div class="lw-knoepfe" style="margin-top:0"><span class="lw-tl-zahl lw-klein" style="align-self:center"></span>
            <button type="button" class="lw-btn gold" data-tl="speichern">💾 Speichern</button><button type="button" class="lw-btn" data-tl="verwerfen">Verwerfen</button></div>
          ${info.nurLesen ? `<p class="lw-rot" style="margin-top:.5rem">⚠ Nur lesen: ${info.grund === 'offline' ? 'Worker nicht erreichbar.' : 'Bei Cloudflare läuft noch der alte Worker – bitte <code>cloudflare/worker.js</code> und <code>cloudflare/dateien.js</code> einfügen.'}</p>` : ''}
          ${info.veraltet ? `<p class="lw-rot" style="margin-top:.5rem">⚠ Dein Entwurf beruht auf einem älteren Stand.</p><div class="lw-knoepfe"><button type="button" class="lw-btn" data-tl="alt-weg">Entwurf verwerfen</button><button type="button" class="lw-btn" data-tl="alt-behalten">Entwurf behalten</button></div>` : ''}
          <details style="margin-top:.4rem"><summary class="lw-klein">Änderungen</summary><ul class="lw-liste lw-klein lw-tl-aenderungen"></ul></details>
          <p class="lw-klein" style="margin-top:.4rem">Gespeichert wird direkt ins Repo (unabhängig von „Veröffentlichen“). Bestehende Teile behalten ID und Platz – Kinder verlieren nichts.</p></div>
        <div class="lw-reiter" role="tablist">${REITER.map(([k, t]) => `<a href="#" class="lw-reiter-punkt${k === reiter ? ' aktiv' : ''}" data-tl-reiter="${k}">${t}</a>`).join('')}</div>
        ${inhalt}`;
      kopf();
      if (reiter === 'uebersicht' && window.LernPass && typeof buildPassOverview === 'function') buildPassOverview();
      const b = host.querySelector('[data-tl-buehne]');
      if (b && reiter === 'neu' && neu.vorlage) buehneZeigen(b, neu.platz, neuTeil());
      if (b && reiter === 'teile') { const i = (d.ITEMS || []).find(x => x.id === offen); if (i) buehneZeigen(b, i.slot, i); }
    }

    // ── Ereignisse ──
    const klick = ev => {
      const t = ev.target.closest('[data-tl],[data-tl-reiter],[data-tl-platz],[data-tl-teil],[data-tl-titel-weg]');
      if (!t || !host.contains(t)) return;
      ev.preventDefault();
      const d = daten();
      if (t.dataset.tlReiter) { reiter = t.dataset.tlReiter; zeichnen(); return; }
      if (t.dataset.tlPlatz) { platz = t.dataset.tlPlatz; offen = ''; zeichnen(); return; }
      if (t.dataset.tlTeil) { offen = offen === t.dataset.tlTeil ? '' : t.dataset.tlTeil; zeichnen(); return; }
      if (t.dataset.tlTitelWeg) { const n = Number(t.dataset.tlTitelWeg); aendern(`Titel „${d.TITEL[n]}“ entfernt`, x => { x.TITEL.splice(n, 1); }); return; }
      const a = t.dataset.tl;
      if (a === 'speichern') return speichern();
      if (a === 'verwerfen') { if (confirm('Alle ungespeicherten Änderungen an den Avatar-Teilen verwerfen?')) { D.verwerfen(PFAD); zeichnen(); } return; }
      if (a === 'alt-weg') { D.verwerfen(PFAD); zeichnen(); return; }
      if (a === 'alt-behalten') { D.entwurfBehalten(PFAD); zeichnen(); return; }
      if (a === 'zu') { offen = ''; zeichnen(); return; }
      if (a === 'loeschen') { const i = d.ITEMS.find(x => x.id === offen); if (i && confirm(`„${i.name}“ löschen?`)) { offen = ''; aendern(`Teil „${i.name}“ gelöscht`, x => { x.ITEMS = x.ITEMS.filter(y => y.id !== i.id); }); } return; }
      if (a === 'titel-neu') { aendern('neuer Titel', x => { x.TITEL.push('Neuer Titel'); }); return; }
      if (a === 'anlegen') {
        const o = neuTeil();
        if (!String(neu.name).trim()) { toast('⚠ Bitte einen Namen eingeben', true); return; }
        if (!Object.keys(o.tausch).length) { toast('⚠ Bitte mindestens eine Farbe ändern', true); return; }
        const basis = slug(neu.name) || 'teil', vor = (o.basis.split('-')[0] || o.slot[0]) + '-';
        let id = vor + basis; for (let n = 2; d.ITEMS.some(x => x.id === id); n++) id = vor + basis + '-' + n;
        o.id = id; o.name = String(neu.name).trim();
        aendern(`Neues Teil „${o.name}“ (${(d.SLOTS[o.slot] || {}).name || o.slot})`, x => { x.ITEMS.push(o); });
        neu = { ...neu, name: '', farben: {} }; reiter = 'teile'; platz = o.slot; offen = id;
        toast(`✨ „${o.name}“ angelegt – noch nicht gespeichert`);
        zeichnen();
      }
    };
    const eingabe = ev => {                          // Farben live in der Vorschau (ohne zu speichern)
      const t = ev.target;
      if (t.dataset.tlNeuFarbe) { neu.farben[t.dataset.tlNeuFarbe] = t.value; buehneZeigen(host.querySelector('[data-tl-buehne]'), neu.platz, neuTeil()); }
      else if (t.dataset.tlNeu === 'name') neu.name = t.value;
      else if (t.dataset.tlFarbe) {
        const i = daten().ITEMS.find(x => x.id === offen);
        if (i) buehneZeigen(host.querySelector('[data-tl-buehne]'), i.slot, { ...i, tausch: { ...(i.tausch || {}), [t.dataset.tlFarbe]: t.value } });
      }
    };
    const aenderung = ev => {
      const t = ev.target, d = daten();
      if (t.dataset.tlNeu) {
        const k = t.dataset.tlNeu;
        if (k === 'name') return;
        neu[k] = t.value;
        if (k === 'platz' || k === 'vorlage') { neu.farben = {}; if (k === 'platz') neu.vorlage = ''; }
        if (k === 'herkunft' && t.value.startsWith('event:')) neu.selten = 'event';
        if (k === 'herkunft' && t.value.startsWith('set:')) neu.selten = 'legendaer';
        zeichnen(); return;
      }
      if (t.dataset.tlTitel !== undefined) {
        const n = Number(t.dataset.tlTitel), wert = t.value.trim();
        if (wert && wert !== d.TITEL[n]) aendern(`Titel Level ${n + 1}: „${d.TITEL[n]}“ → „${wert}“`, x => { x.TITEL[n] = wert; }, true);
        return;
      }
      const i = d.ITEMS.find(x => x.id === offen);
      if (!i) return;
      if (t.dataset.tlFeld === 'name') { const w = t.value.trim(); if (w && w !== i.name) aendern(`Teil „${i.name}“ heißt jetzt „${w}“`, x => { x.ITEMS.find(y => y.id === i.id).name = w; }); }
      else if (t.dataset.tlFeld === 'selten') aendern(`„${i.name}“: Seltenheit ${t.value}`, x => { x.ITEMS.find(y => y.id === i.id).selten = t.value; });
      else if (t.dataset.tlFeld === 'herkunft') aendern(`„${i.name}“: Herkunft ${t.selectedOptions[0].textContent}`, x => { herkunftSetzen(x.ITEMS.find(y => y.id === i.id), t.value); });
      else if (t.dataset.tlFarbe) aendern(`„${i.name}“: Farbe ${t.dataset.tlFarbe} → ${t.value}`, x => {
        const y = x.ITEMS.find(z => z.id === i.id), tausch = { ...(y.tausch || {}), [t.dataset.tlFarbe]: t.value };
        Object.keys(tausch).forEach(f => { if (f.toLowerCase() === String(tausch[f]).toLowerCase()) delete tausch[f]; });
        y.tausch = tausch;
      });
    };
    host.addEventListener('click', klick);
    host.addEventListener('input', eingabe);
    host.addEventListener('change', aenderung);
    const ab = D.abonnieren(zeichnen);
    const bereit = () => zeichnen();
    window.addEventListener('lernpass:ready', bereit);
    zeichnen();
    D.laden(PFAD).catch(x => { fehler = x.status === 401 ? 'Anmeldung abgelaufen – bitte neu anmelden' : (x.message || String(x)); }).then(zeichnen);
    return () => {
      aktiv = false; ab(); window.removeEventListener('lernpass:ready', bereit);
      if (buehne) buehne.ctrl.destroy();
      host.removeEventListener('click', klick); host.removeEventListener('input', eingabe); host.removeEventListener('change', aenderung);
    };
  },
});
