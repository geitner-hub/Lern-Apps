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
//    { "typ": "zuordnen" | "sortieren" | "lueckentext" | "eingabe" | "beschriften" | "bildwort" | "markieren" | "fall"
//             | "gemischt" (dann trägt jede Stufe ihren eigenen "typ"),
//      "thema": "de.5.wortarten", "titel": "Wortarten", "untertitel": "…", "klasse": 5,
//      "sprache": "en-GB"   (optional: Vorlesen in dieser Sprache),
//      "runde": 8           (optional, Aufgaben je Runde),
//      "hilfe": [{ "titel", "text", "beispiele": [["en","de"]], "tabelle": [[…]] }]  (optional: Kachel „So geht's“),
//      "stufen": [ { "id": "de.5.wortarten.nomen", "titel": "…", "kurz": "…", … je Typ … } ] }
//  Was „je Typ“ in einer Stufe steht, beschreibt der Kopf der Typ-Datei.
//
//  Typ je Stufe und je Aufgabe (Neue Lern-Apps Etappe 6) – so mischt eine Grammatik-App Lückentext,
//  Satzbau und Eingabe:
//    Stufe:   { "id": …, "typ": "sortieren", … }               überschreibt "typ" der Datei
//    Aufgabe: { "typ": "eingabe", "frage": …, "antwort": … }  (nur bei Typen mit "aufgaben")
//  Quelle je Aufgabe (Quellen-Detektiv Etappe 1) – bei zuordnen, sortieren, lueckentext, markieren, eingabe (Text):
//    Aufgabe: { …, "bild": "q-faustkeil.svg"  (Datei neben der Inhaltsdatei; antippen = groß),
//               "quelltext": "…"              (Schriftquelle als Zitat, statt oder zusätzlich zum Bild),
//               "herkunft": "Brief, 1958"      (optional, steht unter dem Zitat),
//               "alt": "…"                     (optional, Bildbeschreibung für Vorlesehilfen),
//               "nachweis": "Foto: Name, CC BY 4.0, Wikimedia Commons"  (Pflicht bei Fotos, ⓘ zeigt ihn),
//               "quellenart": "sach" | "bild" | "schrift"  (optional; Karte 2 passt ihre Leitfrage daran an) }
//    Lückentext mit optionen wird dafür zur eigenen Bedienung (Knöpfe unter der Quelle).
//  „So geht's“ als Methodenkarte: { "titel": "Beschreiben", "text": "Was sehe ich?", "karte": { "nr": 1, "farbe": "#5dbb63" } }
//  Mix-Stufe: { "id": "en.5.to-be.mix", "titel": "Mix", "mix": true,
//               "aus": ["en.5.to-be.formen", "en.5.simple-present"]   (optional; Stufen-IDs dieser oder anderer
//                       Inhaltsdateien oder ganze Inhaltsdateien; ohne "aus": alle anderen Stufen dieser Datei),
//               "nurGeuebt": true   (optional: nur Stufen, die das Kind schon geübt hat – „Meine Themen“) }
//
//  Ganzer Fall (Quellen-Detektiv Etappe 2): Typ „fall“ – eine Runde = ein Fall, Ergebnis = abgehakte Checkliste
//    (Selbstkontrolle, zählt nicht für die Spielsperre). Format: Kopf von gemeinsam/typen/fall.js. Mix-Stufen
//    ohne "aus" nehmen Fall-Stufen nicht auf.
//
//  Ein Typ meldet sich so an:
//    LernTypen.typ('name', {
//      anzahl(stufe)         → wie viele verschiedene Aufgaben die Stufe hat
//      aufgabe(stufe, nr, D) → Aufgabe für ueben.js (meist art 'eigen'); nr = Index in der Stufe
//      pruefe(aufgabe, eingabe) → true/false
//      einzeln: true         (optional) eine Runde = genau eine Aufgabe (ueben.js: Stufe einzeln)
//    });
//  Hilfen für Typen: LernTypen.mischen(liste), .gleich(a, b) (Text ohne Groß/klein, Leerzeichen, Satzzeichen
//  am Ende), .textOhneSatzzeichen(wort), .esc(text), .knopf(text, attr), .knoepfe(box, optionen, fertig), .textfeld(box, fertig),
//  .bildHTML(bild, D) – und das gemeinsame Aussehen (.lt-…).
// ═══════════════════════════════════════════════════════

(function () {
  'use strict';
  if (window.LernTypen) return;

  const HIER = (document.currentScript && document.currentScript.src) || location.href;
  const ROOT = new URL('../', HIER).href;
  const TYPEN = {};
  const NAMEN = ['zuordnen', 'sortieren', 'lueckentext', 'eingabe', 'beschriften', 'bildwort', 'markieren', 'fall'];

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function mischen(l) { const a = l.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const norm = s => String(s == null ? '' : s).trim().toLowerCase().replace(/[’`´]/g, "'").replace(/\s+/g, ' ').replace(/[.!?]+$/, '');
  const gleich = (a, b) => norm(a) === norm(b);
  const textOhneSatzzeichen = t => String(t == null ? '' : t).replace(/^[„"'(¿¡]+|[.,!?;:"“”')]+$/g, '');

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
  .lt-quelle{margin:0 auto .8rem;max-width:640px;text-align:center}
  .lt-q-bild{display:block;margin:0 auto;padding:0;border:0;background:#fff;border-radius:16px;overflow:hidden;cursor:zoom-in;max-width:100%}
  .lt-q-bild img{display:block;height:min(34vh,360px);width:auto;max-width:100%}
  .lt-q-text{margin:0 auto;max-width:560px;background:#f6ecd2;color:#2b2116;border-radius:14px;padding:.9rem 1.1rem;text-align:left;
      font:700 1.15rem/1.5 'Nunito',sans-serif;box-shadow:inset 0 0 0 2px rgba(0,0,0,.08)}
  .lt-q-text cite{display:block;margin-top:.4rem;font-style:normal;font-size:.85rem;color:#6b5a44}
  .lt-q-info{margin-top:.3rem;font-size:.8rem;color:var(--mut)}
  .lt-q-info button{background:none;border:0;color:var(--ind2);font:900 .95rem 'Nunito',sans-serif;cursor:pointer;padding:.2rem .4rem}
  .lt-zoom{position:fixed;inset:0;z-index:9999;background:rgba(5,5,12,.94);display:flex;align-items:center;justify-content:center;padding:1rem;cursor:zoom-out}
  .lt-zoom img{max-width:100%;max-height:100%;background:#fff;border-radius:12px}
  .lt-zoom .lt-q-text{font-size:1.5rem;max-width:760px}
  .lu .hilfe-text section.lt-karte{color:#fff;border:0;display:flex;gap:1rem;align-items:center;padding:1rem 1.1rem}
  .lu .hilfe-text section.lt-karte h2{color:#fff;font-size:1.5rem;margin:0}
  .lu .hilfe-text section.lt-karte p{margin:.15rem 0 0;font-size:1.05rem}
  .lt-karte-nr{flex:0 0 3.2rem;height:3.2rem;border-radius:50%;background:#fff;display:grid;place-items:center;font:400 1.7rem 'Fredoka One','Nunito',sans-serif}
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

  // ── Quelle je Aufgabe (Quellen-Detektiv): Bild oder Zitat über der Bedienung ──
  const QUELLE_TYPEN = ['zuordnen', 'sortieren', 'lueckentext', 'markieren', 'eingabe'];
  function quelleHTML(x, D) {
    const nw = x.nachweis ? `<div class="lt-q-info"><button type="button" data-lt-info aria-label="Bildnachweis zeigen">ⓘ</button><span hidden>${esc(x.nachweis)}</span></div>` : '';
    const bild = x.bild ? `<button type="button" class="lt-q-bild" data-lt-zoom aria-label="Quelle groß zeigen">${bildHTML(x.bild, D, x.alt || 'Quelle')}</button>` : '';
    const text = x.quelltext ? `<blockquote class="lt-q-text" data-lt-zoom>${esc(x.quelltext)}${x.herkunft ? `<cite>${esc(x.herkunft)}</cite>` : ''}</blockquote>` : '';
    return `<figure class="lt-quelle">${bild}${text}${nw}</figure>`;
  }
  /** Hängt die Quelle einer Aufgabe vor die Bedienung. Zahl-Aufgaben (Zifferntastatur) bleiben ohne – pruefen.py meldet das. */
  function mitQuelle(a, x, D) {
    if (!a || !x || !(x.bild || x.quelltext)) return a;
    const kopf = quelleHTML(x, D);
    if (a.art === 'wahl') {
      const optionen = a.optionen;
      a.art = 'eigen';
      a.eingabeText = e => String(e);
      a.zeige = (box, fertig) => { box.innerHTML = kopf; knoepfe(box, optionen.map(o => ({ wert: o, text: o })), fertig); };
    } else if (a.art === 'eigen') {
      const innen = a.zeige;
      a.zeige = (box, fertig) => { box.innerHTML = kopf + '<div class="lt-innen"></div>'; innen(box.querySelector('.lt-innen'), fertig); };
    }
    a.quelle = { bild: x.bild || '', quellenart: x.quellenart || '' };
    return a;
  }
  // Groß zeigen und Bildnachweis – ein Zuhörer für alle Aufgaben
  document.addEventListener('click', e => {
    const info = e.target.closest('[data-lt-info]');
    if (info) { const sp = info.nextElementSibling; if (sp) sp.hidden = !sp.hidden; return; }
    const z = e.target.closest('.lt-zoom');
    if (z) { z.remove(); return; }
    const q = e.target.closest('[data-lt-zoom]');
    if (!q) return;
    const ov = document.createElement('div');
    ov.className = 'lt-zoom'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Quelle groß – antippen schließt');
    ov.innerHTML = q.tagName === 'BLOCKQUOTE' ? q.outerHTML.replace(' data-lt-zoom', '') : q.innerHTML;
    document.body.appendChild(ov);
  });

  // Methodenkarten „Quellen-Detektiv“ (Karten von Bene, Karte 2 passt sich der Quellenart an)
  const KARTEN = {
    1: { titel: 'Beschreiben', frage: () => 'Was sehe ich?', farbe: '#5dbb63' },
    2: { titel: 'Erklären', frage: art => art === 'bild' || art === 'schrift' ? 'Wofür wurde es gemacht?' : 'Wofür wurde es benutzt?', farbe: '#3c7dc4' },
    3: { titel: 'Deuten', frage: () => 'Was verrät es über das Leben der Menschen?', farbe: '#f29b38' },
    4: { titel: 'Quellenkritik', frage: () => 'Kann ich der Quelle trauen?', farbe: '#8e62c4' },
  };

  function typ(name, t) { TYPEN[name] = t; }

  /** „So geht's“ aus der Inhaltsdatei: "hilfe": [{ titel, text?, beispiele?: [[en, de]], tabelle?: [[Kopf…], [Zeile…]] }] */
  function hilfeHTML(liste) {
    if (!Array.isArray(liste) || !liste.length) return '';
    return liste.map(h => {
      const k = h.karte, farbe = k && /^#[0-9a-f]{6}$/i.test(k.farbe || '') ? k.farbe : '';
      if (k && farbe) return `<section class="lt-karte" style="background:${farbe}"><span class="lt-karte-nr" style="color:${farbe}">${esc(k.nr)}</span>
        <div>${h.titel ? `<h2>${esc(h.titel)}</h2>` : ''}${(Array.isArray(h.text) ? h.text : h.text ? [h.text] : []).map(t => `<p>${esc(t)}</p>`).join('')}</div></section>`;
      return `<section>${h.titel ? `<h2>${esc(h.titel)}</h2>` : ''}
      ${(Array.isArray(h.text) ? h.text : h.text ? [h.text] : []).map(t => `<p>${esc(t)}</p>`).join('')}
      ${Array.isArray(h.beispiele) && h.beispiele.length ? `<div class="bsp">${h.beispiele.map(b => `<b>${esc(b[0])}</b><span>${esc(b[1] || '')}</span>`).join('')}</div>` : ''}
      ${Array.isArray(h.tabelle) && h.tabelle.length ? `<table><tr>${h.tabelle[0].map(k => `<th>${esc(k)}</th>`).join('')}</tr>
        ${h.tabelle.slice(1).map(z => `<tr>${z.map(k => `<td>${esc(k)}</td>`).join('')}</tr>`).join('')}</table>` : ''}</section>`;
    }).join('');
  }

  // Umzug alter Einzel-Apps (Neue Lern-Apps Etappe 7): Ergebnisse, Sterne und Dorf-Aufträge übernehmen.
  // Läuft sofort beim Laden – vor navbar.js, das den Pass liest (uebung.html bindet typen.js davor ein).
  const UMZUG = { 'en.5.simple-present': 'practice_simple_present.html', 'en.5.simple-past': 'simple-past.html' };
  try {
    const inh = new URLSearchParams(location.search).get('inhalt');
    if (UMZUG[inh] && window.LernUeben) LernUeben.uebernehme(UMZUG[inh], (location.pathname.split('/').pop() || '') + location.search);
  } catch (e) {}

  function fehler(host, text) {
    host.innerHTML = `<p style="color:rgba(241,240,251,.7);font:800 1rem Nunito,system-ui,sans-serif;text-align:center;padding:4rem 1rem">⚠️ ${esc(text)}</p>`;
  }

  /** Inhaltsdatei laden (einmal je ID) */
  const dateien = {};
  function ladeInhalt(id) {
    if (!dateien[id]) {
      const fach = id.split('.')[0];
      dateien[id] = fetch(new URL('daten/inhalte/' + fach + '/' + id + '.json', ROOT).href, { cache: 'no-cache' })
        .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(D => {
          if (!D || !Array.isArray(D.stufen) || !(NAMEN.includes(D.typ) || D.typ === 'gemischt')) throw new Error('fehlerhaft');
          D.basis = new URL('daten/inhalte/' + fach + '/', ROOT).href;    // für Bilder neben der Inhaltsdatei
          return D;
        })
        .catch(e => { delete dateien[id]; throw e; });
    }
    return dateien[id];
  }
  const typVon = (D, st, x) => (x && NAMEN.includes(x.typ) && x.typ) || st.typ || D.typ;
  /** alle Typen einer Datei (Datei, Stufen, einzelne Aufgaben) */
  function typenIn(D) {
    const t = new Set();
    D.stufen.forEach(st => {
      if (!st || st.mix) return;
      t.add(typVon(D, st));
      (Array.isArray(st.aufgaben) ? st.aufgaben : []).forEach(x => { if (x && NAMEN.includes(x.typ)) t.add(x.typ); });
    });
    return [...t].filter(n => NAMEN.includes(n));
  }
  /** Eine echte Stufe als Quelle: anzahl, aufgabe(nr) */
  function quelle(D, st) {
    const T = TYPEN[typVon(D, st)];
    if (!T) return null;
    return {
      D, st, n: T.anzahl(st) || 0,
      aufgabe(nr) {
        const x = Array.isArray(st.aufgaben) ? st.aufgaben[nr] : null;
        const name = typVon(D, st, x), T2 = TYPEN[name];
        if (!T2) return null;
        const eigen = x && x.typ && x.typ !== typVon(D, st);
        const a = eigen ? T2.aufgabe(Object.assign({}, st, { aufgaben: [x] }), 0, D) : T2.aufgabe(st, nr, D);
        if (!a) return null;
        a._typ = name;
        if (D.sprache && !a.sprache) a.sprache = D.sprache;
        return QUELLE_TYPEN.includes(name) ? mitQuelle(a, x, D) : a;
      },
    };
  }

  /** Seite starten: liest ?inhalt=<Themen-ID>, lädt Inhalt und Typen, startet den Übungs-Rahmen */
  async function start(host) {
    stil();
    const id = new URLSearchParams(location.search).get('inhalt') || '';
    if (!/^[a-z]+(\.[a-z0-9-]+){1,5}$/.test(id)) return fehler(host, 'Diese Übung gibt es nicht.');
    let D;
    try { D = await ladeInhalt(id); }
    catch (e) { return fehler(host, e.message === 'fehlerhaft' ? 'Diese Übung ist fehlerhaft.' : 'Die Aufgaben konnten nicht geladen werden. Bitte mit Internet neu öffnen.'); }

    // Mix-Stufen: Quellen sammeln (auch aus anderen Inhaltsdateien)
    const fremd = new Set();
    D.stufen.forEach(st => { if (st && st.mix) (st.aus || []).forEach(a => { const datei = String(a).split('.').slice(0, 3).join('.'); if (datei !== id) fremd.add(datei); }); });
    const andere = {};
    await Promise.all([...fremd].map(f => ladeInhalt(f).then(x => { andere[f] = x; }).catch(() => {})));
    const typen = new Set(typenIn(D));
    Object.values(andere).forEach(x => typenIn(x).forEach(t => typen.add(t)));
    const typDatei = t => 'gemeinsam/typen/' + t + '.js';
    try { await Promise.all([...typen].map(t => window.LW && LW.laden ? LW.laden(typDatei(t)) : Promise.reject(new Error('LW')))); }
    catch (e) { return fehler(host, 'Der Aufgabentyp konnte nicht geladen werden.'); }
    // (NAMEN oben = Dateien in gemeinsam/typen/, pruefen.py prüft das)

    const einzeln = (Dx, st) => !st.mix && !!(TYPEN[typVon(Dx, st)] || {}).einzeln;   // z. B. ganzer Fall
    const quellen = {};                                   // Stufen-ID → Quelle
    const sammle = (Dx) => Dx.stufen.forEach(st => { if (st && st.id && !st.mix) { const q = quelle(Dx, st); if (q && q.n) quellen[st.id] = q; } });
    sammle(D); Object.values(andere).forEach(sammle);
    function mixQuellen(st) {
      const aus = Array.isArray(st.aus) && st.aus.length ? st.aus : D.stufen.filter(x => x && !x.mix).map(x => x.id);
      const ids = [];
      aus.forEach(a => {
        if (quellen[a]) ids.push(a);
        else Object.keys(quellen).forEach(k => { if (k.startsWith(a + '.')) ids.push(k); });   // ganze Datei
      });
      return [...new Set(ids)].map(k => quellen[k]).filter(q => !einzeln(q.D, q.st));   // ganze Fälle nie im Mix
    }
    const mixe = {};                                      // Stufen-ID → [Quelle …]
    D.stufen.forEach(st => { if (st && st.id && st.mix) mixe[st.id] = mixQuellen(st); });
    const anzahl = st => st.mix ? (mixe[st.id] || []).reduce((n, q) => n + q.n, 0) : quellen[st.id] ? quellen[st.id].n : 0;

    /** Aufgabe nr einer Stufe (bei Mix: fortlaufend über alle Quellen) */
    function aufgabe(st, nr) {
      let q = quellen[st.id], i = nr;
      if (st.mix) { q = null; for (const x of mixe[st.id] || []) { if (i < x.n) { q = x; break; } i -= x.n; } }
      if (!q) return null;
      const a = q.aufgabe(i);
      if (!a) return null;
      a.typ = 'a' + nr;                                  // Fehler-Training holt genau diese Aufgabe wieder
      a.schluessel = st.id + '#' + nr;
      return a;
    }
    /** „Meine Themen“: nur schon geübte Stufen (ohne Lernstand: alle) */
    function geuebt(q) {
      const P = window.LernPass, ls = P && P.state && P.state.lernstand;
      return !!(ls && ls[q.st.id]);
    }
    // Jede Stufe zieht ihre Aufgaben aus einem gemischten Stapel – keine Wiederholung, bis alle dran waren
    const stapel = {};
    function ziehe(st) {
      if (st.mix) {
        const alle = mixe[st.id] || [];
        let erlaubt = alle;
        if (st.nurGeuebt) { const g = alle.filter(geuebt); if (g.length) erlaubt = g; }
        const nummern = [];
        let basis = 0;
        alle.forEach(q => { if (erlaubt.includes(q)) for (let k = 0; k < q.n; k++) nummern.push(basis + k); basis += q.n; });
        if (!nummern.length) return null;
        if (!stapel[st.id] || !stapel[st.id].length) stapel[st.id] = mischen(nummern);
        return stapel[st.id].pop();
      }
      const n = anzahl(st);
      if (!n) return null;
      if (!stapel[st.id] || !stapel[st.id].length) stapel[st.id] = mischen([...Array(n).keys()]);
      return stapel[st.id].pop();
    }
    const stufen = D.stufen.filter(st => st && st.id && anzahl(st) > 0)
      .map(st => Object.assign({}, st, einzeln(D, st) ? { runde: 1, einzeln: true } : { runde: st.runde || Math.min(Number(D.runde) || 8, anzahl(st)) }));
    document.title = (D.titel || 'Übung') + ' – Lernwelt';
    host.innerHTML = '';
    return LernUeben.start({
      host, titel: (D.emoji ? D.emoji + ' ' : '') + (D.titel || 'Übung'), untertitel: D.untertitel || 'Wähle eine Stufe',
      stufen, runde: Number(D.runde) || 8, meisterschaft: D.meisterschaft, vorlesen: !!D.vorlesen,
      hilfe: D.hilfe ? { html: hilfeHTML(D.hilfe) } : null,
      erzeuge: st => { const nr = ziehe(st); return nr == null ? null : aufgabe(st, nr); },
      erzeugeTyp: (st, typ) => { const nr = Number(String(typ || '').slice(1)); return /^a\d+$/.test(typ) && nr < anzahl(st) ? aufgabe(st, nr) : null; },
      pruefe: (a, e) => { const T = TYPEN[a._typ]; return !!T && T.pruefe(a, e); },
    });
  }

  window.LernTypen = { start, typ, mischen, gleich, norm, esc, textOhneSatzzeichen, knopf, knoepfe, textfeld, bildHTML, quelleHTML, KARTEN, NAMEN };
})();
