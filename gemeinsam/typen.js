// ═══════════════════════════════════════════════════════
//  Lernwelt – typen.js   (Aufgabentyp-Baukasten, Infrastruktur Etappe 9)
//
//  Eine neue App = eine Inhaltsdatei + ein Admin-Eintrag. Die Seite
//  apps/typen/uebung.html?inhalt=<Themen-ID> lädt
//      daten/inhalte/<fach>/<Themen-ID>.json        (fach = erster Teil der ID, z. B. 'de')
//  und darin steht, welcher Typ den Inhalt zeigt. Jeder Typ ist eine Datei in gemeinsam/typen/
//  und läuft auf dem Übungs-Rahmen (ueben.js) – Freigabe, Wiederholung, Fehler-Training,
//  Meisterschaft, Ergebnis mit Themen-ID, Infokarte und Dorf-Aufträge gibt es dadurch automatisch.
//
//  Inhaltsdatei (gleicher Kopf für alle Typen; pruefen.py prüft das Format):
//    { "typ": "zuordnen" | "sortieren" | "lueckentext" | "eingabe" | "beschriften" | "bildwort",
//      "thema": "de.5.wortarten", "titel": "Wortarten", "untertitel": "…", "klasse": 5,
//      "sprache": "en-GB"   (optional: Vorlesen in dieser Sprache),
//      "runde": 8           (optional, Aufgaben je Runde),
//      "stufen": [ { "id": "de.5.wortarten.nomen", "titel": "…", "kurz": "…", … je Typ … } ] }
//  Was „je Typ“ in einer Stufe steht, beschreibt der Kopf der Typ-Datei.
//
//  Ein Typ meldet sich so an:
//    LernTypen.typ('name', {
//      anzahl(stufe)         → wie viele verschiedene Aufgaben die Stufe hat
//      aufgabe(stufe, nr, D) → Aufgabe für ueben.js (meist art 'eigen'); nr = Index in der Stufe
//      pruefe(aufgabe, eingabe) → true/false
//    });
//  Hilfen für Typen: LernTypen.mischen(liste), .gleich(a, b) (Text ohne Groß/klein, Leerzeichen, Satzzeichen
//  am Ende), .esc(text), .knopf(text, attr), .knoepfe(box, optionen, fertig), .textfeld(box, fertig),
//  .bildHTML(bild, D) – und das gemeinsame Aussehen (.lt-…).
// ═══════════════════════════════════════════════════════

(function () {
  'use strict';
  if (window.LernTypen) return;

  const HIER = (document.currentScript && document.currentScript.src) || location.href;
  const ROOT = new URL('../', HIER).href;
  const TYPEN = {};
  const NAMEN = ['zuordnen', 'sortieren', 'lueckentext', 'eingabe', 'beschriften', 'bildwort'];

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function mischen(l) { const a = l.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const norm = s => String(s == null ? '' : s).trim().toLowerCase().replace(/[’`´]/g, "'").replace(/\s+/g, ' ').replace(/[.!?]+$/, '');
  const gleich = (a, b) => norm(a) === norm(b);

  // Gemeinsames Aussehen der Typen (Bausteine, Ziele, Felder) – passt zu ueben.js
  const CSS = `
  .lt-anw{color:var(--mut);font-weight:800;text-align:center;margin:0 0 .7rem;font-size:.95rem}
  .lt-chips{display:flex;flex-wrap:wrap;gap:.5rem;justify-content:center;margin:.4rem 0 .8rem}
  .lt-chip{background:var(--card2);border:2px solid var(--line);border-radius:14px;color:var(--txt);font:800 1.05rem 'Nunito',sans-serif;
      padding:.6rem .9rem;min-height:3rem;cursor:pointer;touch-action:manipulation}
  .lt-chip.an{border-color:var(--gold);box-shadow:0 0 0 3px rgba(230,168,23,.25)}
  .lt-chip.fertig{border-color:var(--ind2)}
  .lt-chip small{display:block;color:var(--gold);font-size:.75rem;font-weight:900}
  .lt-chip:disabled{opacity:.35;cursor:default}
  .lt-ziele{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:.5rem;margin:.4rem 0 .8rem}
  .lt-ziel{background:linear-gradient(135deg,rgba(99,102,241,.25),rgba(129,140,248,.18));border:2px solid rgba(129,140,248,.5);border-radius:14px;
      color:var(--txt);font:800 1rem 'Nunito',sans-serif;min-height:3.2rem;padding:.5rem;cursor:pointer;touch-action:manipulation}
  .lt-ziel:active,.lt-chip:active{transform:scale(.96)}
  .lt-satz{background:#0b0a14;border:3px dashed rgba(129,140,248,.5);border-radius:16px;min-height:3.6rem;padding:.6rem;display:flex;flex-wrap:wrap;gap:.4rem;
      align-items:center;justify-content:center;margin:.3rem 0 .8rem}
  .lt-satz:empty::after{content:'Tippe die Teile in der richtigen Reihenfolge an';color:rgba(255,255,255,.3);font-weight:800;font-size:.9rem}
  .lt-feld{width:100%;max-width:420px;display:block;margin:.3rem auto .8rem;background:#0b0a14;border:3px solid var(--ind);border-radius:16px;color:var(--txt);
      font:800 1.5rem 'Nunito',sans-serif;text-align:center;padding:.6rem .8rem;-webkit-user-select:text;user-select:text}
  .lt-feld:focus{outline:none;border-color:var(--gold)}
  .lt-zeile{display:flex;gap:.6rem;justify-content:center;flex-wrap:wrap}
  .lt-bild{position:relative;width:-webkit-fit-content;width:fit-content;max-width:100%;margin:0 auto .8rem;background:#fff;border-radius:16px;overflow:hidden}
  .lt-bild img{display:block;height:min(46vh,520px);width:auto;max-width:92vw}
  .lt-marke{position:absolute;width:2.2rem;height:2.2rem;margin:-1.1rem 0 0 -1.1rem;border-radius:50%;background:var(--gold);color:#1b1300;
      display:grid;place-items:center;font:900 1rem 'Nunito',sans-serif;box-shadow:0 0 0 4px rgba(230,168,23,.35)}
  .lt-marke.leise{background:rgba(99,102,241,.55);color:#fff;box-shadow:none;width:1.2rem;height:1.2rem;margin:-.6rem 0 0 -.6rem;font-size:0}
  .lt-gross{font-size:clamp(4rem,16vw,6.5rem);line-height:1.1;text-align:center;margin:.2rem 0 .6rem}
  @media (prefers-reduced-motion:reduce){.lt-chip:active,.lt-ziel:active{transform:none}}`;
  function stil() {
    if (document.getElementById('lt-css')) return;
    const st = document.createElement('style'); st.id = 'lt-css'; st.textContent = CSS; document.head.appendChild(st);
  }

  function knopf(text, attr, klasse) { return `<button type="button" class="${klasse || 'lt-chip'}" ${attr || ''}>${esc(text)}</button>`; }

  /** Antwort-Knöpfe: optionen = [{ wert, text, gross? }] → fertig(wert) beim Antippen */
  function knoepfe(box, optionen, fertig, gross) {
    box.insertAdjacentHTML('beforeend', `<div class="lt-chips">${optionen.map((o, i) =>
      `<button type="button" class="lt-chip" data-i="${i}"${gross ? ' style="font-size:2.4rem;min-width:5rem"' : ''}>${esc(o.text)}</button>`).join('')}</div>`);
    box.lastElementChild.addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) fertig(optionen[Number(b.dataset.i)].wert); });
  }
  /** Textfeld mit „Prüfen“ (iPad-Tastatur) → fertig(text) */
  function textfeld(box, fertig, platzhalter) {
    box.insertAdjacentHTML('beforeend', `<input class="lt-feld" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"
        enterkeyhint="done" placeholder="${esc(platzhalter || 'Antwort')}" aria-label="Antwort">
      <div class="lt-zeile"><button type="button" class="btn p" data-pruefen>✓ Prüfen</button></div>`);
    const feld = box.querySelector('.lt-feld');
    const los = () => { if (feld.value.trim()) fertig(feld.value.trim()); };
    feld.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); los(); } });
    box.querySelector('[data-pruefen]').addEventListener('click', los);
    setTimeout(() => { try { feld.focus(); } catch (e) {} }, 50);
  }
  /** Bild aus der Inhaltsdatei: Emoji/Text bleibt Text, Dateiname → <img> neben der Inhaltsdatei */
  function bildHTML(bild, D, alt) {
    const b = String(bild || '');
    if (/^[a-z0-9_-]+\.(svg|png|jpg|webp)$/i.test(b)) return `<img src="${esc(new URL(b, D.basis).href)}" alt="${esc(alt || '')}">`;
    return esc(b);
  }

  function typ(name, t) { TYPEN[name] = t; }

  function fehler(host, text) {
    host.innerHTML = `<p style="color:rgba(241,240,251,.7);font:800 1rem Nunito,system-ui,sans-serif;text-align:center;padding:4rem 1rem">⚠️ ${esc(text)}</p>`;
  }

  /** Seite starten: liest ?inhalt=<Themen-ID>, lädt Inhalt und Typ, startet den Übungs-Rahmen */
  async function start(host) {
    stil();
    const id = new URLSearchParams(location.search).get('inhalt') || '';
    if (!/^[a-z]+(\.[a-z0-9-]+){1,5}$/.test(id)) return fehler(host, 'Diese Übung gibt es nicht.');
    let D;
    try {
      const r = await fetch(new URL('daten/inhalte/' + id.split('.')[0] + '/' + id + '.json', ROOT).href, { cache: 'no-cache' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      D = await r.json();
    } catch (e) { return fehler(host, 'Die Aufgaben konnten nicht geladen werden. Bitte mit Internet neu öffnen.'); }
    if (!D || !NAMEN.includes(D.typ) || !Array.isArray(D.stufen)) return fehler(host, 'Diese Übung ist fehlerhaft.');
    D.basis = new URL('daten/inhalte/' + id.split('.')[0] + '/', ROOT).href;     // für Bilder neben der Inhaltsdatei
    const typDatei = 'gemeinsam/typen/' + D.typ + '.js';             // NAMEN oben = Dateien in gemeinsam/typen/ (pruefen.py)
    try { await (window.LW && LW.laden ? LW.laden(typDatei) : Promise.reject(new Error('LW'))); }
    catch (e) { return fehler(host, 'Der Aufgabentyp konnte nicht geladen werden.'); }
    const T = TYPEN[D.typ];
    if (!T) return fehler(host, 'Unbekannter Aufgabentyp.');

    // Jede Stufe zieht ihre Aufgaben aus einem gemischten Stapel – keine Wiederholung, bis alle dran waren
    const stapel = {};
    function ziehe(st) {
      const n = T.anzahl(st);
      if (!n) return null;
      if (!stapel[st.id] || !stapel[st.id].length) stapel[st.id] = mischen([...Array(n).keys()]);
      return stapel[st.id].pop();
    }
    function aufgabe(st, nr) {
      const a = T.aufgabe(st, nr, D);
      if (!a) return null;
      a.typ = 'a' + nr;                                  // Fehler-Training holt genau diese Aufgabe wieder
      a.schluessel = st.id + '#' + nr;
      if (D.sprache && !a.sprache) a.sprache = D.sprache;
      return a;
    }
    const stufen = D.stufen.filter(st => st && st.id && T.anzahl(st) > 0)
      .map(st => Object.assign({}, st, { runde: st.runde || Math.min(Number(D.runde) || 8, T.anzahl(st)) }));
    document.title = (D.titel || 'Übung') + ' – Lernwelt';
    host.innerHTML = '';
    return LernUeben.start({
      host, titel: (D.emoji ? D.emoji + ' ' : '') + (D.titel || 'Übung'), untertitel: D.untertitel || 'Wähle eine Stufe',
      stufen, runde: Number(D.runde) || 8, meisterschaft: D.meisterschaft,
      erzeuge: st => { const nr = ziehe(st); return nr == null ? null : aufgabe(st, nr); },
      erzeugeTyp: (st, typ) => { const nr = Number(String(typ || '').slice(1)); return /^a\d+$/.test(typ) && nr < T.anzahl(st) ? aufgabe(st, nr) : null; },
      pruefe: (a, e) => T.pruefe(a, e),
    });
  }

  window.LernTypen = { start, typ, mischen, gleich, norm, esc, knopf, knoepfe, textfeld, bildHTML, NAMEN };
})();
