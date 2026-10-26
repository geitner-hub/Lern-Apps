// ═══════════════════════════════════════════════════════
//  Lernwelt – live-fragen.js   (Fragetypen der Live-Abfrage, Aktionsplan „Live-Abfrage im Unterricht“)
//
//  Genutzt von: apps/typen/live.html (Kinder), admin.html (Beamer im Unterrichtsmodus, Quiz-Editor).
//  Braucht shared.js (escHtml). Die Zifferntastatur (ziffernblock.js) lädt die Kinder-Seite selbst.
//
//  Fragetypen (Format wie in cloudflare/live.js, der Worker prüft jede Antwort noch einmal):
//    auswahl     { text, optionen: [2–4], richtig: Index }      Kind tippt eine Antwort an
//    wahrfalsch  { text, wahr: true|false }
//    zahl        { text, wert }                                  Zahl über die Zifferntastatur
//    wort        { text }                                        ein Wort (max. 20 Zeichen) → Wortwolke
//    schaetzen   { text, min, max, wert, einheit?, toleranz? }   Wert auf dem Zahlenstrahl
//    ampel       { text }                                        🟢 verstanden · 🟡 teilweise · 🔴 noch nicht
//  Für jede Frage: zeit (0|20|30|60 s), zweite (zweite Runde nach Partnergespräch), emoji oder bild
//  (daten/inhalte/<fach>/<datei>), erklaerung (ein Satz nach dem Aufdecken).
//
//  API (window.LernLive):
//    TYPEN                                    [{ id, name, symbol, kurz }]
//    zahl(text) → Zahl oder null              zahlText(n) → „3,5“
//    bewertbar(f)                             hat die Frage eine Lösung?
//    antwortText(f, a)                        gespeicherte Antwort lesbar („B: London“, „wahr“, „🟢“ …)
//    loesungText(f)                           „B: London“, „wahr“, „56“, „50 m (± 5)“
//    frageHtml(f, { beamer })                 Frage mit Emoji/Bild (und beim Beamer die Antworten)
//    antwortUi(host, f, { senden(a), meine }) Eingabe für Kinder; senden bekommt die Antwort wie der Worker sie will
//    verteilungHtml(f, stand, { loesung })    Ergebnis für den Beamer (Balken, Wortwolke, Zahlenstrahl, vorher/nachher)
//    fortschrittHtml(stand, { ergebnis })     Modus „Selbst“: Fortschritt je Frage
//    ausVokabeln(woerter, { anzahl, richtung })        → Fragen (Auswahl EN → DE bzw. DE → EN)
//    ausBaukasten(stufe, { anzahl, basis })            → Fragen aus einer Baukasten-Stufe (daten/inhalte/…)
//    ausKopfrechnen(stufe, { anzahl }, LernGeneratoren) → Fragen aus einer Kopfrechen-Stufe
// ═══════════════════════════════════════════════════════

(function () {
  'use strict';
  if (window.LernLive) return;

  const TYPEN = [
    { id: 'auswahl',    name: 'Auswahl',          symbol: '🔤', kurz: 'eine von 2–4 Antworten' },
    { id: 'wahrfalsch', name: 'Wahr/Falsch',      symbol: '⚖️', kurz: 'wahr oder falsch' },
    { id: 'zahl',       name: 'Zahl',             symbol: '🔢', kurz: 'Zahl tippen' },
    { id: 'wort',       name: 'Ein-Wort-Antwort', symbol: '☁️', kurz: 'ein Wort → Wortwolke' },
    { id: 'schaetzen',  name: 'Schätzfrage',      symbol: '📏', kurz: 'Wert auf dem Zahlenstrahl' },
    { id: 'ampel',      name: 'Ampel',            symbol: '🚦', kurz: 'Wie sicher fühlst du dich?' },
  ];
  const BUCHST = ['A', 'B', 'C', 'D'];
  const FORM = ['▲', '◆', '●', '■'];                       // Form zusätzlich zur Farbe (Farbsehschwäche)
  const AMPEL = [['g', '🟢', 'verstanden'], ['y', '🟡', 'teilweise'], ['r', '🔴', 'noch nicht']];
  const e = s => (typeof escHtml === 'function' ? escHtml(s) : String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const ROOT = () => (window.LW && LW.ROOT) || '';
  const BILD = /^daten\/inhalte\/[a-z]+\/[a-z0-9.-]{1,80}\.(svg|png|jpg|jpeg|webp)$/;

  const CSS = `
  .ll-frage{text-align:center}
  .ll-frage .ll-sym{font-size:3rem;line-height:1.1}
  .ll-frage img{max-width:min(320px,80%);max-height:28vh;border-radius:12px;background:#fff;margin:.3rem auto;display:block}
  .ll-frage .ll-text{font-family:'Fredoka One','Nunito',sans-serif;font-size:1.6rem;line-height:1.25;margin:.3rem 0 .8rem;overflow-wrap:anywhere}
  .ll-frage .ll-leer{color:inherit;opacity:.65;font-size:1.15rem}
  .ll-opts{display:grid;grid-template-columns:1fr 1fr;gap:.7rem}
  .ll-opt{display:flex;align-items:center;gap:.6rem;min-height:5.2rem;padding:.7rem 1rem;border-radius:18px;border:3px solid transparent;color:#fff;
    font:900 1.2rem 'Nunito',system-ui,sans-serif;text-align:left;cursor:pointer;touch-action:manipulation;overflow-wrap:anywhere}
  .ll-opt .ll-b{font-size:1.5rem;width:1.8rem;text-align:center;flex-shrink:0}
  .ll-o0{background:#6366f1}.ll-o1{background:#c98a06}.ll-o2{background:#0e9f6e}.ll-o3{background:#db2777}
  .ll-opt.ll-an{border-color:#fff;box-shadow:0 0 0 4px rgba(255,255,255,.35)}
  .ll-opt:disabled{cursor:default}.ll-opts.ll-zu .ll-opt:not(.ll-an){opacity:.35}
  .ll-opt:active{transform:scale(.97)}
  .ll-ampel{display:grid;grid-template-columns:repeat(3,1fr);gap:.7rem}
  .ll-ampel .ll-opt{flex-direction:column;justify-content:center;text-align:center;background:#252238;font-size:1.05rem}
  .ll-ampel .ll-opt span{font-size:3rem;line-height:1}
  .ll-wf .ll-opt{justify-content:center;font-size:1.5rem}
  .ll-feld{font:900 2.4rem 'Nunito',system-ui,sans-serif;text-align:center;background:#252238;border-radius:16px;min-height:4.2rem;padding:.5rem;margin:0 auto;max-width:420px;letter-spacing:.04em}
  .ll-feld.zb-leer::after{content:'?';opacity:.35}
  .ll-wort{display:flex;gap:.6rem;max-width:520px;margin:0 auto}
  .ll-wort input{flex:1;min-width:0;font:800 1.5rem 'Nunito',system-ui,sans-serif;padding:.7rem 1rem;border-radius:16px;border:2px solid rgba(255,255,255,.15);background:#252238;color:#f1f0fb}
  .ll-senden{min-height:3.6rem;padding:.6rem 1.4rem;border-radius:16px;border:0;background:#e6a817;color:#231a02;font:900 1.2rem 'Nunito',system-ui,sans-serif;cursor:pointer}
  .ll-senden:disabled{opacity:.4;cursor:default}
  .ll-schaetz{max-width:640px;margin:0 auto;text-align:center}
  .ll-schaetz .ll-wert{font:900 2.6rem 'Nunito',system-ui,sans-serif;color:#e6a817}
  .ll-schaetz input[type=range]{width:100%;height:3rem;accent-color:#e6a817}
  .ll-schaetz .ll-skala{display:flex;justify-content:space-between;font-weight:800;opacity:.7}
  .ll-schaetz .ll-feinsteuer{display:flex;justify-content:center;gap:.5rem;margin:.4rem 0 .8rem}
  .ll-schaetz .ll-feinsteuer button{min-width:3.6rem;min-height:3.2rem;border-radius:14px;border:1px solid rgba(255,255,255,.15);background:#252238;color:#f1f0fb;font:900 1.3rem 'Nunito',sans-serif;cursor:pointer}
  /* Beamer (heller Grund) */
  .ll-beamer{color:#0f0e1a}
  .ll-beamer .ll-frage .ll-text{font-size:min(5.2vh,4.4vw)}
  .ll-beamer .ll-opts{max-width:1400px;margin:0 auto}
  .ll-beamer .ll-opt{min-height:9vh;font-size:min(3.4vh,2.6vw);cursor:default}
  .ll-balken{display:grid;gap:1.1vh;max-width:1300px;margin:0 auto;width:100%}
  .ll-bz{display:grid;grid-template-columns:minmax(8rem,30%) 1fr auto;align-items:center;gap:1rem;font:800 min(3vh,2.3vw) 'Nunito',sans-serif}
  .ll-bz .ll-bl{overflow-wrap:anywhere;display:flex;align-items:center;gap:.5rem}
  .ll-bz .ll-bb{height:min(6vh,4.5vw);background:#ece9f7;border-radius:12px;overflow:hidden}
  .ll-bz .ll-bb i{display:block;height:100%;border-radius:12px;min-width:6px;transition:width .4s}
  .ll-bz .ll-bn{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap;min-width:6.5rem}
  .ll-bz.ll-richtig .ll-bl::after{content:'✓';color:#0e9f6e;font-size:1.3em;margin-left:.2rem}
  .ll-bz.ll-matt{opacity:.45}
  .ll-zwei{display:grid;grid-template-columns:1fr 1fr;gap:3vw;width:100%}
  .ll-zwei h3{font:900 min(2.8vh,2vw) 'Nunito',sans-serif;color:#6b6880;margin:0 0 1vh;text-align:center}
  .ll-zwei .ll-bz{grid-template-columns:minmax(5rem,32%) 1fr auto;font-size:min(2.6vh,1.8vw)}
  .ll-gross{font:900 min(12vh,9vw) 'Fredoka One','Nunito',sans-serif;text-align:center;line-height:1}
  .ll-gross small{display:block;font:800 min(2.8vh,2.2vw) 'Nunito',sans-serif;color:#6b6880;margin-top:.6vh}
  .ll-wolke{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:.4em 1.1em;max-width:1400px;margin:0 auto;padding:1vh 0;line-height:1.1}
  .ll-wolke span{font-family:'Fredoka One','Nunito',sans-serif;font-weight:400}
  .ll-strahl{width:100%;max-width:1400px;height:auto;display:block;margin:0 auto}
  .ll-hinweis{text-align:center;color:#6b6880;font-weight:800;font-size:min(2.4vh,1.8vw);margin-top:1vh}
  .ll-fort{display:grid;grid-template-columns:repeat(auto-fit,minmax(9rem,1fr));gap:1vh 1vw;max-width:1400px;margin:0 auto;width:100%}
  .ll-fort div{background:#f3f1fb;border-radius:14px;padding:1vh .8rem;text-align:center;font:800 min(2.4vh,1.8vw) 'Nunito',sans-serif}
  .ll-fort b{display:block;font:900 min(4.6vh,3.4vw) 'Nunito',sans-serif}
  @media (max-width:560px){.ll-opts{grid-template-columns:1fr}.ll-ampel .ll-opt span{font-size:2.3rem}}
  @media (prefers-reduced-motion:reduce){.ll-opt:active{transform:none}.ll-bz .ll-bb i{transition:none}}`;
  function stil() {
    if (document.getElementById('ll-css')) return;
    const s = document.createElement('style'); s.id = 'll-css'; s.textContent = CSS; document.head.appendChild(s);
  }

  // ── Zahlen ───────────────────────────────────────────
  /** „3,5“, „−12“, „1 000“ → Zahl oder null (gleiche Regel wie liveZahl im Worker) */
  function zahl(v) {
    if (typeof v === 'number') return Number.isFinite(v) && Math.abs(v) < 1e9 ? v : null;
    const s = String(v ?? '').replace(/[\s  ]/g, '').replace('−', '-').replace(',', '.');
    return /^-?\d{1,9}(\.\d{1,6})?$/.test(s) ? Number(s) : null;
  }
  const zahlText = n => {
    if (typeof n !== 'number' || !Number.isFinite(n)) return String(n ?? '');
    const r = Math.round(n * 1e6) / 1e6, neg = r < 0;
    let [g, k] = String(Math.abs(r)).split('.');
    if (g.length > 4) g = g.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return (neg ? '−' : '') + g + (k ? ',' + k : '');
  };
  const toleranz = f => typeof f.toleranz === 'number' ? f.toleranz : (f.max - f.min) / 10;
  const bewertbar = f => !!f && ((f.typ === 'auswahl' && Number.isInteger(f.richtig)) || (f.typ === 'wahrfalsch' && typeof f.wahr === 'boolean')
    || f.typ === 'zahl' || f.typ === 'schaetzen');

  function antwortText(f, a) {
    if (!f) return String(a ?? '');
    if (f.typ === 'auswahl') { const i = Number(a); return (BUCHST[i] || '?') + (f.optionen && f.optionen[i] && f.optionen[i] !== BUCHST[i] ? ': ' + f.optionen[i] : ''); }
    if (f.typ === 'wahrfalsch') return a === 'w' ? 'wahr' : a === 'f' ? 'falsch' : String(a);
    if (f.typ === 'ampel') { const x = AMPEL.find(z => z[0] === a); return x ? x[1] + ' ' + x[2] : String(a); }
    if (f.typ === 'zahl' || f.typ === 'schaetzen') return zahlText(zahl(a)) + (f.einheit ? ' ' + f.einheit : '');
    return String(a ?? '');
  }
  function loesungText(f, l) {
    l = l || f;
    if (f.typ === 'auswahl') return Number.isInteger(l.richtig) ? antwortText(f, l.richtig) : '';
    if (f.typ === 'wahrfalsch') return typeof l.wahr === 'boolean' ? (l.wahr ? 'wahr' : 'falsch') : '';
    if (f.typ === 'zahl') return zahlText(l.wert);
    if (f.typ === 'schaetzen') return zahlText(l.wert) + (f.einheit ? ' ' + f.einheit : '') + ` (± ${zahlText(typeof l.toleranz === 'number' ? l.toleranz : toleranz(f))})`;
    return '';
  }

  // ── Frage anzeigen ───────────────────────────────────
  function frageHtml(f, o = {}) {
    stil();
    const bild = f.bild && BILD.test(f.bild) ? `<img src="${e(ROOT() + f.bild)}" alt="">` : '';
    const sym = !bild && f.emoji ? `<div class="ll-sym" aria-hidden="true">${e(f.emoji)}</div>` : '';
    const text = f.text ? `<div class="ll-text">${e(f.text)}</div>`
      : `<div class="ll-text ll-leer">${f.typ === 'ampel' ? 'Wie sicher fühlst du dich?' : o.beamer ? 'Frage der Lehrkraft' : 'Hör auf die Frage deiner Lehrkraft.'}</div>`;
    let unten = '';
    if (o.beamer && f.typ === 'auswahl') unten = `<div class="ll-opts">${f.optionen.map((x, i) => `<div class="ll-opt ll-o${i}"><span class="ll-b">${FORM[i]}</span>${x === BUCHST[i] ? BUCHST[i] : e(BUCHST[i] + '  ' + x)}</div>`).join('')}</div>`;
    if (o.beamer && f.typ === 'schaetzen') unten = `<div class="ll-hinweis">Schätze zwischen ${e(zahlText(f.min))} und ${e(zahlText(f.max))}${f.einheit ? ' ' + e(f.einheit) : ''}</div>`;
    return `<div class="ll-frage">${bild}${sym}${text}</div>${unten}`;
  }

  // ── Eingabe für Kinder ───────────────────────────────
  /** Baut die Antwort-Eingabe in host. o.senden(a) bekommt die Antwort, o.meine ist die schon gesendete (gesperrt). */
  function antwortUi(host, f, o = {}) {
    stil();
    const gesendet = o.meine !== undefined && o.meine !== null;
    const knopf = (cls, wert, inhalt, an) => `<button type="button" class="ll-opt ${cls}${an ? ' ll-an' : ''}" data-a="${e(wert)}"${gesendet ? ' disabled' : ''}>${inhalt}</button>`;
    if (f.typ === 'auswahl' || f.typ === 'wahrfalsch' || f.typ === 'ampel') {
      const l = f.typ === 'auswahl' ? f.optionen.map((x, i) => knopf('ll-o' + i, i, `<span class="ll-b">${FORM[i]}</span>${x === BUCHST[i] ? BUCHST[i] : e(x)}`, String(o.meine) === String(i)))
        : f.typ === 'wahrfalsch' ? [knopf('ll-o2', 'w', '👍 wahr', o.meine === 'w'), knopf('ll-o3', 'f', '👎 falsch', o.meine === 'f')]
        : AMPEL.map(([w, s, t]) => knopf('', w, `<span>${s}</span>${t}`, o.meine === w));
      host.innerHTML = `<div class="${f.typ === 'ampel' ? 'll-ampel' : f.typ === 'wahrfalsch' ? 'll-opts ll-wf' : 'll-opts'}${gesendet ? ' ll-zu' : ''}" role="group" aria-label="Antworten">${l.join('')}</div>`;
      host.onclick = ev => {
        const b = ev.target.closest('[data-a]');
        if (!b || b.disabled) return;
        host.querySelectorAll('[data-a]').forEach(x => { x.disabled = true; x.classList.toggle('ll-an', x === b); });
        host.firstElementChild.classList.add('ll-zu');
        o.senden(f.typ === 'auswahl' ? Number(b.dataset.a) : b.dataset.a);
      };
      return;
    }
    if (f.typ === 'zahl') {
      host.innerHTML = `<div class="ll-feld" aria-live="polite">${gesendet ? e(antwortText(f, o.meine)) : ''}</div><div class="ll-zb"></div>`;
      if (gesendet) return;
      const feld = host.querySelector('.ll-feld');
      const los = () => {
        if (!window.LernZiffernblock) { setTimeout(los, 200); return; }
        const zb = LernZiffernblock.erstelle({ box: host.querySelector('.ll-zb'), felder: [feld], einstellig: false, max: 10, zeichen: ',-',
          fertig(w) {
            const n = zahl(w[0]);
            if (n === null) { feld.animate && feld.animate([{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'none' }], 200); return; }
            zb.weg();
            o.senden(w[0]);
          } });
      };
      los();
      return;
    }
    if (f.typ === 'wort') {
      host.innerHTML = `<form class="ll-wort"><input type="text" maxlength="20" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="send"
        aria-label="Dein Wort" placeholder="ein Wort" ${gesendet ? `value="${e(o.meine)}" disabled` : ''}><button class="ll-senden"${gesendet ? ' disabled' : ''}>Senden</button></form>`;
      if (gesendet) return;
      const form = host.querySelector('form'), inp = form.querySelector('input');
      form.onsubmit = ev => {
        ev.preventDefault();
        const w = inp.value.replace(/\s+/g, ' ').trim();
        if (!w || !/^[\p{L}\p{N}' -]{1,20}$/u.test(w)) { inp.focus(); return; }
        inp.disabled = true; form.querySelector('button').disabled = true;
        inp.blur();
        o.senden(w);
      };
      return;
    }
    if (f.typ === 'schaetzen') {
      const span = f.max - f.min;
      const schritt = span <= 20 ? (Number.isInteger(f.min) && Number.isInteger(f.max) ? 1 : 0.1) : Math.pow(10, Math.floor(Math.log10(span)) - 2);
      const st = Math.max(schritt, span / 1000);
      const rund = x => Math.round(Math.min(f.max, Math.max(f.min, x)) / st) * st;
      let wert = gesendet ? zahl(o.meine) : rund(f.min + span / 2);
      const einh = f.einheit ? ' ' + e(f.einheit) : '';
      host.innerHTML = `<div class="ll-schaetz"><div class="ll-wert" aria-live="polite">${e(zahlText(wert))}${einh}</div>
        <input type="range" min="${f.min}" max="${f.max}" step="${st}" value="${wert}" aria-label="Dein Schätzwert"${gesendet ? ' disabled' : ''}>
        <div class="ll-skala"><span>${e(zahlText(f.min))}</span><span>${e(zahlText(f.max))}</span></div>
        ${gesendet ? '' : `<div class="ll-feinsteuer"><button type="button" data-d="-10">−−</button><button type="button" data-d="-1">−</button><button type="button" data-d="1">+</button><button type="button" data-d="10">++</button></div>
        <button type="button" class="ll-senden" data-los>Schätzung senden</button>`}</div>`;
      if (gesendet) return;
      const r = host.querySelector('input'), anz = host.querySelector('.ll-wert');
      const zeig = () => { anz.innerHTML = e(zahlText(Math.round(wert * 1e6) / 1e6)) + einh; r.value = wert; };
      r.oninput = () => { wert = rund(Number(r.value)); zeig(); };
      host.onclick = ev => {
        const b = ev.target.closest('button');
        if (!b) return;
        const d = Number(b.dataset.d);
        if (d) { wert = rund(wert + Math.sign(d) * (Math.abs(d) === 10 ? Math.max(st, span / 20) : st)); zeig(); }
        if (b.hasAttribute('data-los')) { host.querySelectorAll('button,input').forEach(x => { x.disabled = true; }); o.senden(String(Math.round(wert * 1e6) / 1e6)); }
      };
    }
  }

  // ── Ergebnis für den Beamer ──────────────────────────
  const FARBEN = ['#6366f1', '#c98a06', '#0e9f6e', '#db2777'];
  function balken(zeilen, gesamt) {
    return `<div class="ll-balken">${zeilen.map(z => {
      const p = gesamt ? Math.round(100 * z.n / gesamt) : 0;
      return `<div class="ll-bz${z.richtig ? ' ll-richtig' : ''}${z.matt ? ' ll-matt' : ''}"><span class="ll-bl">${z.label}</span>
        <span class="ll-bb"><i style="width:${p}%;background:${z.farbe || '#818cf8'}"></i></span><span class="ll-bn">${z.n} · ${p} %</span></div>`;
    }).join('')}</div>`;
  }
  /** Zeilen einer Runde: [{ a, n, r, aus }] → Balken-Daten je Fragetyp */
  function zeilenFuer(f, liste, loesung) {
    const n = a => (liste.find(x => x.a === a) || { n: 0 }).n;
    if (f.typ === 'auswahl') return f.optionen.map((x, i) => ({ label: `${FORM[i]} ${x === BUCHST[i] ? BUCHST[i] : e(BUCHST[i] + ': ' + x)}`, n: n(String(i)), farbe: FARBEN[i],
      richtig: loesung && f.richtig === i, matt: loesung && Number.isInteger(f.richtig) && f.richtig !== i }));
    if (f.typ === 'wahrfalsch') return [['w', '👍 wahr', 2], ['f', '👎 falsch', 3]].map(([a, t, c]) => ({ label: t, n: n(a), farbe: FARBEN[c],
      richtig: loesung && typeof f.wahr === 'boolean' && f.wahr === (a === 'w'), matt: loesung && typeof f.wahr === 'boolean' && f.wahr !== (a === 'w') }));
    if (f.typ === 'ampel') return AMPEL.map(([a, s, t], i) => ({ label: `${s} ${t}`, n: n(a), farbe: ['#22c55e', '#eab308', '#ef4444'][i] }));
    if (f.typ === 'zahl') {
      const l = liste.slice().sort((x, y) => y.n - x.n || (y.r || 0) - (x.r || 0));
      const oben = l.slice(0, 5);
      if (loesung && !oben.some(x => x.r === 1)) { const r = l.find(x => x.r === 1); if (r) oben.splice(4, 1, r); }
      return oben.map(x => ({ label: e(zahlText(zahl(x.a))), n: x.n, farbe: loesung ? (x.r === 1 ? '#0e9f6e' : '#c7c3d9') : '#818cf8', richtig: loesung && x.r === 1 }));
    }
    return [];
  }
  const summe = l => l.reduce((s, x) => s + x.n, 0);

  function wolke(liste) {
    const l = liste.filter(x => !x.aus).sort((a, b) => b.n - a.n).slice(0, 60);
    if (!l.length) return '<div class="ll-hinweis">Noch keine Wörter.</div>';
    const max = l[0].n;
    // gemischte Reihenfolge, aber jedes Mal gleich (nach Wort sortiert, große Wörter in die Mitte)
    const mitte = [], aussen = [];
    l.forEach((x, i) => (i % 2 ? aussen : mitte).push(x));
    const reihe = aussen.reverse().concat(mitte);
    return `<div class="ll-wolke">${reihe.map((x, i) => `<span style="font-size:min(${(2.2 + 6 * (x.n / max)).toFixed(1)}vh,${(1.8 + 4.6 * (x.n / max)).toFixed(1)}vw);color:${FARBEN[i % 4]}">${e(x.a)}</span>`).join('')}</div>`;
  }

  function strahl(f, liste, loesung, liste2) {
    const W = 1000, H = 260, x0 = 40, x1 = W - 40, y = 190;
    const px = v => x0 + (x1 - x0) * (v - f.min) / (f.max - f.min);
    const BINS = 40, hoch = {};
    // Punkte je Fach stapeln (erste Runde grau unten, aktuelle darüber)
    const punkte = (l, farbe) => l.flatMap(z => Array.from({ length: z.n }, () => zahl(z.a))).filter(v => v !== null).map(v => {
      const b = Math.min(BINS - 1, Math.floor(BINS * (v - f.min) / (f.max - f.min)));
      hoch[b] = (hoch[b] || 0) + 1;
      const cx = x0 + (x1 - x0) * (b + .5) / BINS;
      return `<circle cx="${cx.toFixed(1)}" cy="${Math.max(10, y - 12 - (hoch[b] - 1) * 16).toFixed(1)}" r="7" fill="${farbe}"/>`;
    }).join('');
    const werte = liste.flatMap(z => Array.from({ length: z.n }, () => zahl(z.a))).filter(v => v !== null).sort((a, b) => a - b);
    const median = werte.length ? werte[Math.floor(werte.length / 2)] : null;
    const ticks = [0, .25, .5, .75, 1].map(t => f.min + t * (f.max - f.min));
    const tol = toleranz(f);
    return `<svg class="ll-strahl" viewBox="0 0 ${W} ${H}" role="img" aria-label="Verteilung der Schätzungen">
      ${loesung ? `<rect x="${px(Math.max(f.min, f.wert - tol)).toFixed(1)}" y="20" width="${(px(Math.min(f.max, f.wert + tol)) - px(Math.max(f.min, f.wert - tol))).toFixed(1)}" height="${y - 20}" fill="rgba(14,159,110,.12)"/>` : ''}
      ${liste2 ? punkte(liste2, '#c7c3d9') : ''}${punkte(liste, '#6366f1')}
      <line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="#0f0e1a" stroke-width="4"/>
      ${ticks.map(t => `<line x1="${px(t)}" y1="${y - 8}" x2="${px(t)}" y2="${y + 8}" stroke="#0f0e1a" stroke-width="3"/><text x="${px(t)}" y="${y + 36}" text-anchor="middle" font-size="24" font-weight="800" fill="#0f0e1a">${e(zahlText(Math.round(t * 100) / 100))}</text>`).join('')}
      ${median !== null ? `<path d="M${px(median) - 10},${y + 50} L${px(median) + 10},${y + 50} L${px(median)},${y + 40} Z" fill="#6366f1"/><text x="${px(median)}" y="${y + 70}" text-anchor="middle" font-size="18" font-weight="800" fill="#6366f1">Mitte ${e(zahlText(median))}</text>` : ''}
      ${loesung ? `<line x1="${px(f.wert)}" y1="14" x2="${px(f.wert)}" y2="${y}" stroke="#c98a06" stroke-width="6"/><text x="${px(f.wert)}" y="12" text-anchor="middle" font-size="24" font-weight="900" fill="#c98a06" dominant-baseline="hanging" dy="-2" paint-order="stroke" stroke="#fff" stroke-width="8">${e(zahlText(f.wert))}${f.einheit ? ' ' + e(f.einheit) : ''}</text>` : ''}
    </svg>`;
  }

  /** Ergebnis einer Frage. stand = Antwort von /live/raum/CODE/stand, o.loesung = Lösung zeigen */
  function verteilungHtml(f, stand, o = {}) {
    stil();
    const r1 = (stand.antworten && stand.antworten[1]) || [], r2 = (stand.antworten && stand.antworten[2]) || [];
    const loesung = !!o.loesung;
    const vergleich = f.zweite && stand.runde === 2;
    let html;
    if (f.typ === 'wort') {
      html = wolke(r1);
    } else if (f.typ === 'schaetzen') {
      const akt = vergleich ? r2 : r1;
      const richtig = summe(akt.filter(x => x.r === 1));
      html = (loesung && summe(akt) ? `<div class="ll-gross" style="font-size:min(7vh,5vw)">${Math.round(100 * richtig / summe(akt))} %<small>nah genug dran (± ${e(zahlText(toleranz(f)))})</small></div>` : '')
        + strahl(f, akt, loesung, vergleich ? r1 : null)
        + (vergleich ? '<div class="ll-hinweis">● nach dem Partnergespräch · ○ grau: erste Runde</div>' : '');
    } else if (vergleich) {
      html = `<div class="ll-zwei"><div><h3>1. Runde</h3>${balken(zeilenFuer(f, r1, loesung), summe(r1))}</div>
        <div><h3>Nach dem Partnergespräch</h3>${balken(zeilenFuer(f, r2, loesung), summe(r2))}</div></div>`;
      if (loesung && bewertbar(f)) {
        const p = l => summe(l) ? Math.round(100 * summe(l.filter(x => x.r === 1)) / summe(l)) : 0;
        html += `<div class="ll-hinweis">richtig: ${p(r1)} % → ${p(r2)} %</div>`;
      }
    } else {
      html = '';
      if (f.typ === 'zahl' && loesung) {
        const richtig = summe(r1.filter(x => x.r === 1));
        html += `<div class="ll-gross">${summe(r1) ? Math.round(100 * richtig / summe(r1)) : 0} %<small>richtig – Lösung: ${e(zahlText(f.wert))}</small></div>`;
      }
      html += balken(zeilenFuer(f, r1, loesung), summe(r1));
      if (f.typ === 'zahl') html += `<div class="ll-hinweis">${loesung ? 'häufigste Antworten' : 'häufigste Antworten (noch ohne Lösung)'}</div>`;
    }
    if (loesung && f.erklaerung) html += `<div class="ll-hinweis" style="color:#0f0e1a;font-size:min(3vh,2.2vw)">💡 ${e(f.erklaerung)}</div>`;
    return html;
  }

  /** Modus „Selbst“: Fortschritt je Frage (o.ergebnis: auch % richtig) */
  function fortschrittHtml(stand, o = {}) {
    stil();
    return `<div class="ll-fort">${stand.fragen.map((f, i) => {
      const z = (stand.fortschritt || [])[i] || { n: 0, richtig: 0 };
      const p = z.n && bewertbar(f) ? Math.round(100 * z.richtig / z.n) + ' % richtig' : z.n ? 'beantwortet' : '–';
      return `<div>Frage ${i + 1}<b>${z.n}</b>${o.ergebnis ? e(p) : 'Antworten'}</div>`;
    }).join('')}</div>`;
  }

  // ── Fragen aus dem Pool ──────────────────────────────
  function mische(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const kurz = (s, n) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
  /** Auswahl-Frage aus richtiger Antwort und Ablenkern (höchstens 4 Antworten) */
  function auswahl(text, richtig, ablenker, extra) {
    const r = kurz(richtig, 80);
    const falsch = [...new Set(ablenker.map(x => kurz(x, 80)).filter(x => x && x !== r))];
    const opt = mische([r, ...mische(falsch).slice(0, 3)]);
    if (opt.length < 2) return null;
    return Object.assign({ typ: 'auswahl', text: kurz(text, 200), optionen: opt, richtig: opt.indexOf(r) }, extra || {});
  }
  /** woerter: [{ en, de }] (aus daten/vokabeln5|6.json), richtung 'en-de' | 'de-en' */
  function ausVokabeln(woerter, o = {}) {
    const l = (woerter || []).filter(w => w && w.en && w.de), n = Math.max(1, Math.min(15, o.anzahl || 5));
    const hin = o.richtung !== 'de-en';
    return mische(l).slice(0, n).map(w => auswahl(hin ? `Was heißt „${w.en}“?` : `Wie heißt „${w.de}“ auf Englisch?`,
      hin ? w.de : w.en, l.filter(x => x !== w).map(x => hin ? x.de : x.en))).filter(Boolean);
  }
  /** Baukasten-Stufe (daten/inhalte/<fach>/<id>.json → stufen[i]); basis = 'daten/inhalte/<fach>/' für Bilder */
  function ausBaukasten(stufe, o = {}) {
    const n = Math.max(1, Math.min(15, o.anzahl || 5)), typ = stufe && stufe.typ, aus = [];
    const antw = x => Array.isArray(x.antwort) ? x.antwort[0] : x.antwort;
    const auf = Array.isArray(stufe && stufe.aufgaben) ? stufe.aufgaben : [];
    const alleAntworten = auf.map(antw).filter(a => a !== undefined && a !== null).map(String);
    // Quelle je Aufgabe (Quellen-Detektiv): Bild und Erklärung kommen mit ins Quiz
    const extra = x => {
      const bild = x.bild ? (o.basis || '') + x.bild : '', erk = kurz(x.erklaerung, 200), f = {};
      if (BILD.test(bild)) f.bild = bild;
      if (erk) f.erklaerung = erk;
      return f;
    };
    auf.forEach(x => {
      const t = x.typ || typ;
      if (t === 'lueckentext' && x.text && antw(x) !== undefined) {
        let text = String(x.text).replace(/_{2,}/g, '…');
        if (x.bild && stufe.anweisung && text.length < 25) text = stufe.anweisung;   // „Das ist eine ….“ → Frage der Stufe
        if (Array.isArray(x.optionen) && x.optionen.length >= 2) aus.push(auswahl(text, antw(x), x.optionen, extra(x)));
        else if (zahl(antw(x)) !== null) aus.push({ typ: 'zahl', text: kurz(text, 200), wert: zahl(antw(x)) });
        else if (alleAntworten.length >= 3) aus.push(auswahl(text, antw(x), alleAntworten));
      } else if (t === 'eingabe' && x.frage && antw(x) !== undefined) {
        if (zahl(antw(x)) !== null) aus.push({ typ: 'zahl', text: kurz(x.frage, 200), wert: zahl(antw(x)) });
        else if (alleAntworten.length >= 3) aus.push(auswahl(x.frage, antw(x), alleAntworten));
      }
    });
    const paare = typ === 'zuordnen' ? (Array.isArray(stufe.paare) ? stufe.paare : auf.flatMap(x => x.paare || [])) : [];
    const rechts = paare.map(p => p[1]);
    paare.forEach(p => aus.push(auswahl(`„${p[0]}“ – was passt?`, p[1], rechts)));
    if (typ === 'bildwort' && Array.isArray(stufe.woerter)) {
      const w = stufe.woerter.map(x => x.wort);
      stufe.woerter.forEach(x => {
        const bild = (o.basis || '') + x.bild;
        aus.push(auswahl('Was ist das?', x.wort, w, BILD.test(bild) ? { bild } : null));
      });
    }
    return mische(aus.filter(Boolean)).slice(0, n);
  }
  /** Kopfrechen-Stufe (daten/kopfrechnen.json → stufen[id]) mit window.LernGeneratoren */
  function ausKopfrechnen(stufe, o = {}, G) {
    const n = Math.max(1, Math.min(15, o.anzahl || 5)), aus = [], schon = new Set();
    for (let v = 0; v < n * 15 && aus.length < n; v++) {
      const a = G && G.ausStufe(stufe);
      if (!a || schon.has(a.frage)) continue;
      if (a.art === 'zahl' && typeof a.wert === 'number' && zahl(a.wert) !== null) { schon.add(a.frage); aus.push({ typ: 'zahl', text: kurz(a.frage + ' = ?', 200), wert: a.wert }); }
      else if (a.art === 'wahl' && Array.isArray(a.optionen)) { const q = auswahl(a.frage, a.text, a.optionen); if (q) { schon.add(a.frage); aus.push(q); } }
    }
    return aus;
  }

  window.LernLive = { TYPEN, zahl, zahlText, bewertbar, antwortText, loesungText, frageHtml, antwortUi, verteilungHtml, fortschrittHtml,
    ausVokabeln, ausBaukasten, ausKopfrechnen, AMPEL };
})();
