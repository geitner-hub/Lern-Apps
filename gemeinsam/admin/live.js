// ═══════════════════════════════════════════════════════
//  Lernwelt-Admin – Live-Abfrage: Beamer-Ansicht und Worker-Zugriff  (Aktionsplan „Live-Abfrage im Unterricht“)
//
//    await LWAdmin.live.quizze()              // gespeicherte Quizze (Kollegen: nur nicht archivierte)
//    await LWAdmin.live.raeume()              // eigene offene Abfragen
//    await LWAdmin.live.starten({ quizId })   // bzw. { quiz: { titel, fragen } } für spontane Fragen → Beamer öffnet sich
//    LWAdmin.live.oeffnen(code)               // laufende Abfrage wieder auf den Beamer
//    LWAdmin.live.spontan(typ, text)          // Frage ohne Vorbereitung (ampel | auswahl | wahrfalsch | wort) als Frage-Objekt
//    LWAdmin.live.fehlerText(e)               // verständliche Meldung (alter Worker, fehlende Datenbank …)
//
//  Die Beamer-Ansicht (#lw-live, heller Grund wie die QR-Großansicht) fragt alle 2 Sekunden den Stand ab
//  (GET /live/raum/CODE/stand) und schaltet die Phasen: warten → sammeln → aufdecken (→ zweite Runde) → nächste Frage.
//  Darstellung der Fragetypen: gemeinsam/live-fragen.js (LernLive). Worker: cloudflare/live.js.
//  Genutzt vom Unterrichtsmodus (module/unterricht-stunde.js), Haupt- und Kollegen-Zugang.
// ═══════════════════════════════════════════════════════
'use strict';

window.LWAdmin = window.LWAdmin || {};

LWAdmin.live = (() => {
  const TAKT_MS = 2000;
  const L = () => window.LernLive;
  const e = s => escHtml(String(s == null ? '' : s));
  let toastUhr = null;
  /** Meldung: im Vollbild der Abfrage dort (sonst unsichtbar), sonst wie im übrigen Admin */
  function toast(t, f) {
    const box = el && !el.hidden && el.querySelector('.lw-live-toast');
    if (box) { box.textContent = t; box.className = 'lw-live-toast an' + (f ? ' fehler' : ''); clearTimeout(toastUhr); toastUhr = setTimeout(() => { box.className = 'lw-live-toast'; }, f ? 4500 : 2600); return; }
    if (LWAdmin.toast) LWAdmin.toast(t, f); else if (f) alert(t);
  }

  function fehlerText(x) {
    if (!x) return 'Fehler';
    if (x.status === 404 && /Nicht gefunden/.test(x.message)) return 'Die Live-Abfrage braucht den neuen Worker: cloudflare/live.js bei Cloudflare anlegen und worker.js ersetzen (cloudflare/ANLEITUNG.md).';
    if (x.status === 401) return 'Anmeldung abgelaufen – bitte neu anmelden.';
    if (x.status === 423) return 'In der Testumgebung geht das nicht.';
    if (x.status === 501) return x.message;
    return x.message || String(x);
  }

  const quizze = () => LWAdmin.store.worker('/live/quizze', {}).then(d => d.quizze || []);
  const raeume = () => LWAdmin.store.worker('/live/raeume', {}).then(d => d.raeume || []);

  /** Frage ohne Vorbereitung (Unterrichtsmodus): Lösung offen, bei A–D nur Buchstaben */
  function spontan(typ, text) {
    const f = { typ, text: String(text || '').trim().slice(0, 200) };
    if (typ === 'auswahl') { f.optionen = ['A', 'B', 'C', 'D']; f.richtig = null; }
    if (typ === 'wahrfalsch') f.wahr = null;
    return f;
  }

  async function starten(was) {
    const d = await LWAdmin.store.worker('/live/raum', was);
    oeffnen(d.code);
    return d.code;
  }

  // ── Beamer-Ansicht ───────────────────────────────────
  let el = null, code = '', stand = null, timer = null, uhr = null, ende = 0, pruefenOffen = false, spontanOffen = false, beschaeftigt = false, zuletzt = '';

  function anlegen() {
    el = document.createElement('div');
    el.id = 'lw-live';
    el.hidden = true;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Live-Abfrage');
    el.innerHTML = `<div class="lw-live-kopf"><span class="lw-live-titel"></span><span class="lw-live-zaehler"></span><span class="lw-live-zeit"></span>
        <span class="lw-live-mini"><canvas></canvas><b class="lw-live-code"></b></span></div>
      <div class="lw-live-buehne"></div><div class="lw-live-steuer"></div><div class="lw-live-toast" role="status"></div>`;
    el.addEventListener('click', klick);
    document.body.appendChild(el);
    document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && !el.hidden) verkleinern(); });
  }

  const linkFuer = c => appUrl('apps/typen/live.html?raum=' + c);
  const kurzLink = () => String(lwBaseUrl()).replace(/^https?:\/\//, '') + 'apps/typen/live.html';

  function oeffnen(c) {
    if (!el) anlegen();
    code = c; stand = null; zuletzt = ''; pruefenOffen = false; spontanOffen = false;
    el.hidden = false;
    document.body.classList.add('lw-live-offen');
    el.querySelector('.lw-live-buehne').innerHTML = '<div class="lw-live-mitte">lädt …</div>';
    el.querySelector('.lw-live-steuer').innerHTML = '';
    const qr = el.querySelector('.lw-live-mini canvas');
    renderQR(qr, linkFuer(c), 300);
    el.querySelector('.lw-live-code').textContent = c;
    try { const v = (el.requestFullscreen || el.webkitRequestFullscreen || (() => {})).call(el); if (v && v.catch) v.catch(() => {}); } catch (x) {}
    holen();
  }
  function schliessen() {
    clearTimeout(timer); clearInterval(uhr);
    if (el) el.hidden = true;
    document.body.classList.remove('lw-live-offen');
    try { if (document.fullscreenElement) document.exitFullscreen(); else if (document.webkitFullscreenElement) document.webkitExitFullscreen(); } catch (x) {}
    window.dispatchEvent(new CustomEvent('lwlive:zu'));
  }
  const verkleinern = () => { schliessen(); toast('Die Abfrage läuft weiter – unter Unterricht → 📊 Live-Abfrage wieder öffnen.'); };

  async function holen() {
    clearTimeout(timer);
    if (!el || el.hidden) return;
    try {
      stand = await LWAdmin.store.workerGet('/live/raum/' + code + '/stand');
      zeichnen();
    } catch (x) {
      if (x.status === 404 && x.daten && x.daten.ende) { toast('Diese Abfrage ist beendet.'); schliessen(); return; }
      if (x.status === 401) { schliessen(); LWAdmin.anmeldungZeigen && LWAdmin.anmeldungZeigen('Sitzung abgelaufen – bitte neu anmelden.'); return; }
      el.querySelector('.lw-live-zaehler').textContent = '📡 Verbindung weg …';
    }
    timer = setTimeout(holen, TAKT_MS);
  }

  async function aktion(a, extra) {
    if (beschaeftigt) return;
    beschaeftigt = true;
    try {
      stand = await LWAdmin.store.worker('/live/raum/' + code + '/phase', { aktion: a, ...(extra || {}) });
      zuletzt = '';
      zeichnen();
    } catch (x) { toast('⚠ ' + fehlerText(x), true); }
    beschaeftigt = false;
  }

  async function beenden() {
    const s = stand;
    const text = s && s.optionen && s.optionen.rueckblick ? 'Abfrage beenden? Die anonyme Zusammenfassung wird als Rückblick gespeichert, alle Antworten werden gelöscht.'
      : 'Abfrage beenden? Alle Antworten werden gelöscht.';
    if (!confirm(text)) return;
    try {
      const d = await LWAdmin.store.worker('/live/raum/' + code + '/ende', {});
      toast(d.rueckblick ? '📊 Beendet – Rückblick gespeichert' : '📊 Abfrage beendet');
    } catch (x) { toast('⚠ ' + fehlerText(x), true); return; }
    schliessen();
  }

  function zeitZeigen() {
    clearInterval(uhr);
    const z = el.querySelector('.lw-live-zeit');
    if (!ende) { z.textContent = ''; return; }
    const tick = () => {
      const s = Math.max(0, Math.ceil((ende - Date.now()) / 1000));
      z.textContent = '⏱ ' + s + ' s';
      z.classList.toggle('knapp', s <= 5);
      if (!s) clearInterval(uhr);
    };
    tick();
    uhr = setInterval(tick, 250);
  }

  const knopf = (aktion, text, gold, extra) => `<button class="lw-live-knopf${gold ? ' gold' : ''}" data-live="${aktion}"${extra || ''}>${text}</button>`;

  function zeichnen() {
    const s = stand;
    if (!s || !el || el.hidden) return;
    if (spontanOffen && el.querySelector('.lw-live-spontan')) return;   // Eingabe der spontanen Frage nicht überschreiben
    const f = s.fragen[s.nr];
    // nur neu zeichnen, wenn sich etwas Sichtbares geändert hat
    const sig = JSON.stringify([s.rev, s.teilnehmer, s.beantwortet, s.fertig, s.antworten, s.fortschritt, pruefenOffen, spontanOffen]);
    if (sig === zuletzt) return;
    zuletzt = sig;
    el.querySelector('.lw-live-titel').textContent = '📊 ' + (s.titel || 'Live-Abfrage');
    const zaehler = el.querySelector('.lw-live-zaehler');
    const buehne = el.querySelector('.lw-live-buehne'), steuer = el.querySelector('.lw-live-steuer');
    el.classList.toggle('warten', s.phase === 'warten');
    ende = 0;
    let html = '', knoepfe = '';
    const zu = knopf('verkleinern', '↙ Verkleinern') + knopf('beenden', '✕ Beenden');

    if (s.phase === 'warten') {
      zaehler.textContent = `👥 ${s.teilnehmer} dabei`;
      html = `<div class="lw-live-start"><canvas class="lw-live-qr"></canvas><div class="lw-live-start-text">
          <div class="lw-live-klein">QR scannen (📷 QR scannen in der Lernwelt) oder auf</div><div class="lw-live-link">${e(kurzLink())}</div>
          <div class="lw-live-klein">den Code eingeben:</div><div class="lw-live-riesig">${e(s.code)}</div>
          <div class="lw-live-dabei">👥 ${s.teilnehmer} ${s.teilnehmer === 1 ? 'Kind ist' : 'Kinder sind'} dabei</div>
          <div class="lw-live-klein">${s.modus === 'selbst' ? '🧑‍🎓 Modus „Selbst“: Jedes Kind arbeitet im eigenen Tempo.' : `${s.anzahl} Frage${s.anzahl === 1 ? '' : 'n'}`}</div></div></div>`;
      knoepfe = knopf('start', '▶ Los geht\'s', true) + (s.modus === 'fuehren' ? knopf('spontan', '⚡ Spontane Frage') : '') + zu;
    } else if (s.modus === 'selbst') {
      zaehler.textContent = `👥 ${s.teilnehmer} dabei · ✅ ${s.fertig} fertig`;
      html = `<div class="lw-live-gross-zahl">${s.fertig} <small>von ${s.teilnehmer} fertig</small></div>${L().fortschrittHtml(s, { ergebnis: s.phase === 'ergebnis' })}`;
      knoepfe = knopf('ergebnis', s.phase === 'ergebnis' ? '◀ Fortschritt zeigen' : '📊 Ergebnis zeigen', true) + zu;
    } else if (f && s.phase === 'sammeln') {
      zaehler.textContent = `Frage ${s.nr + 1}/${s.anzahl}${s.runde === 2 ? ' · 2. Runde' : ''} · ✅ ${s.beantwortet} von ${s.teilnehmer}`;
      if (typeof s.rest === 'number') ende = Date.now() + s.rest;
      html = `${s.runde === 2 ? '<div class="lw-live-hinweis">🗣 Nach dem Partnergespräch: Antwortet noch einmal!</div>' : ''}${L().frageHtml(f, { beamer: true })}
        <div class="lw-live-gross-zahl">${s.beantwortet} <small>von ${s.teilnehmer} haben geantwortet</small></div>`;
      if (f.typ === 'wort' && pruefenOffen) html += pruefenHtml(s);
      knoepfe = knopf('aufdecken', '👁 Aufdecken', true) + (f.typ === 'wort' ? knopf('pruefen', pruefenOffen ? '🔍 Prüfen zu' : `🔍 Wörter prüfen (${(s.antworten[1] || []).length})`) : '') + zu;
    } else if (f && s.phase === 'aufdecken') {
      zaehler.textContent = `Frage ${s.nr + 1}/${s.anzahl} · ${s.beantwortet} Antworten`;
      const offen = !s.loesung && L().bewertbar(f) && f.zweite;
      html = `<div class="lw-live-frage-klein">${e(f.text || (f.typ === 'ampel' ? 'Wie sicher fühlst du dich?' : 'Frage ' + (s.nr + 1)))}</div>
        ${L().verteilungHtml(f, s, { loesung: s.loesung })}${s.gefiltert ? `<div class="lw-live-hinweis">${s.gefiltert} Wort${s.gefiltert === 1 ? '' : 'e'} vom Filter ausgeblendet</div>` : ''}`;
      if (offen && s.runde === 1) knoepfe += knopf('zweite', '🗣 Nochmal nach Partnergespräch', true) + knopf('loesung', '✓ Lösung zeigen');
      else if (offen) knoepfe += knopf('loesung', '✓ Lösung zeigen', true);
      if (f.typ === 'auswahl' && !Number.isInteger(f.richtig)) knoepfe += `<span class="lw-live-klein">Richtig war:</span>` + f.optionen.map((o, i) => knopf('markieren', ['A', 'B', 'C', 'D'][i], false, ` data-richtig="${i}"`)).join('');
      if (f.typ === 'wahrfalsch' && typeof f.wahr !== 'boolean') knoepfe += `<span class="lw-live-klein">Richtig war:</span>` + knopf('markieren', '👍 wahr', false, ' data-wahr="1"') + knopf('markieren', '👎 falsch', false, ' data-wahr="0"');
      if (!offen) knoepfe += (s.nr + 1 < s.anzahl ? knopf('weiter', '▶ Nächste Frage', true) : '') + knopf('spontan', '⚡ Spontane Frage');
      knoepfe += zu;
    }
    if (spontanOffen) html = spontanHtml();
    buehne.innerHTML = html;
    steuer.innerHTML = spontanOffen ? knopf('spontan-zu', '✕ Abbrechen') : knoepfe;
    const gross = buehne.querySelector('.lw-live-qr');
    if (gross) renderQR(gross, linkFuer(s.code), 900);
    zeitZeigen();
  }

  function pruefenHtml(s) {
    const l = (s.antworten[1] || []).slice().sort((a, b) => b.n - a.n);
    return `<div class="lw-live-pruefen"><b>Vor dem Aufdecken: Wörter antippen, die nicht an den Beamer sollen</b>
      <div>${l.map(x => `<button class="lw-live-wort${x.aus ? ' aus' : ''}" data-live="wort" data-wort="${e(x.a)}">${e(x.a)} <small>${x.n}</small></button>`).join('') || '<i>noch keine Wörter</i>'}</div>
      ${s.gefiltert ? `<small>${s.gefiltert} Wort${s.gefiltert === 1 ? '' : 'e'} hat der Wortfilter schon entfernt.</small>` : ''}</div>`;
  }
  function spontanHtml() {
    return `<div class="lw-live-spontan"><h2>⚡ Spontane Frage</h2><p>Stell die Frage mündlich – oder schreib sie kurz hin:</p>
      <input class="lw-live-eingabe" maxlength="200" placeholder="Frage (optional)">
      <div class="lw-live-typen">${[['ampel', '🚦', 'Ampel'], ['auswahl', '🔤', 'A – D'], ['wahrfalsch', '⚖️', 'Wahr/Falsch'], ['wort', '☁️', 'Ein Wort']]
        .map(([t, s, n]) => `<button class="lw-live-typ" data-live="spontan-los" data-typ="${t}"><span>${s}</span>${n}</button>`).join('')}</div></div>`;
  }

  async function klick(ev) {
    const b = ev.target.closest('[data-live]');
    if (!b) return;
    const a = b.dataset.live;
    if (a === 'verkleinern') return verkleinern();
    if (a === 'beenden') return beenden();
    if (a === 'pruefen') { pruefenOffen = !pruefenOffen; zuletzt = ''; return zeichnen(); }
    if (a === 'spontan') { spontanOffen = true; zuletzt = ''; zeichnen(); const i = el.querySelector('.lw-live-eingabe'); if (i) i.focus(); return; }
    if (a === 'spontan-zu') { spontanOffen = false; zuletzt = ''; return zeichnen(); }
    if (a === 'spontan-los') {
      const text = (el.querySelector('.lw-live-eingabe') || {}).value || '';
      spontanOffen = false;
      return aktion('anhaengen', { frage: spontan(b.dataset.typ, text) });
    }
    if (a === 'wort') { const aus = b.classList.contains('aus'); return aktion('ausblenden', { wort: b.dataset.wort, an: !aus }); }
    if (a === 'markieren') return aktion('markieren', b.dataset.richtig !== undefined ? { richtig: Number(b.dataset.richtig) } : { wahr: b.dataset.wahr === '1' });
    if (a === 'aufdecken') pruefenOffen = false;
    return aktion(a);
  }

  return { quizze, raeume, starten, oeffnen, spontan, fehlerText, offen: () => !!el && !el.hidden };
})();
